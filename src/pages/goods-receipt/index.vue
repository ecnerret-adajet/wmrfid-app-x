<script setup>
import DateRangePicker from '@/components/DateRangePicker.vue';

import PrimaryButton from '@/components/PrimaryButton.vue';
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import { useGoodsReceiptStore } from '@/stores/goodsReceiptStore';
import { debounce } from 'lodash';
import { storeToRefs } from 'pinia'; // If needed, but we can access directly
import { computed, onMounted, ref, watch } from 'vue';
import datatable from './datatable.vue';

const goodsReceiptStore = useGoodsReceiptStore();
const { filters } = storeToRefs(goodsReceiptStore);

const searchValue = ref('');
const datatableRef = ref(null);
const tablePerPage = ref(10);
const tablePage = ref(1);
const tableSort = ref('-created_at')
const isLoading = ref(false);
const toast = ref({
    message: 'Success message',
    color: 'success',
    show: false
});


const plantsOption = ref([]);
const storageLocationsOption = ref([]);



onMounted(() => {
    fetchDataDropdown();
});

const fetchDataDropdown = async () => {
    try {
        const response = await ApiService.get('/users/get-data-dropdown');
        const { plants } = response.data;
        plantsOption.value = plants;
        
        // Restore storage locations if plant is already selected (from persistence)
        if (filters.value.plant) {
             const selectedPlant = plantsOption.value.find(p => p.id === filters.value.plant.id);
             storageLocationsOption.value = selectedPlant ? selectedPlant.storage_locations : [];
        }

    } catch (error) {
        console.error('Error fetching dropdown data:', error);
    }
};

// Watch for plant changes to update storage locations list
watch(
    () => filters.value.plant,
    (newPlant) => {
        // If plant changes, clear sloc unless it matches the new plant (unlikely in dropdown)
        // Check if the ID changed to avoid unnecessary clears if object reference changes but ID is same
        // But for v-select return-object, it replaces the object.
        
        // We only want to reset sloc if the user *changed* the plant, not on initial load if persisted.
        // However, on change, we should update options.
        
        if (newPlant) {
             const selectedPlant = plantsOption.value.find(p => p.id === newPlant.id);
             storageLocationsOption.value = selectedPlant ? selectedPlant.storage_locations : [];
             
             // If the current sloc doesn't belong to the new plant, clear it
             if (filters.value.storageLocation && (!selectedPlant?.storage_locations.find(sl => sl.id === filters.value.storageLocation.id))) {
                 filters.value.storageLocation = null;
             }
        } else {
            storageLocationsOption.value = [];
            filters.value.storageLocation = null;
        }
    }
);

const isFiltersEmpty = computed(() => {
    return !filters.value.posting_date &&
           !filters.value.plant &&
           !filters.value.storageLocation
});

const applyFilter = () => {
    if(datatableRef.value) {
        // Pass IDs to datatable as it expects
        datatableRef.value.applyFilters({
            posting_date: filters.value.posting_date,
            plant_id: filters.value.plant?.id,
            storage_location_id: filters.value.storageLocation?.id
        });
    }
}

const resetFilter = () => {
    goodsReceiptStore.clearFilters();
    if(datatableRef.value) {
        datatableRef.value.applyFilters([]);
    }
}

const handleSearch = debounce((search) => {
    searchValue.value = search;
}, 500);

const onPaginationChanged = ({ page, itemsPerPage, sortBy, search }) => {
    tableSort.value = sortBy
    tablePage.value = page
    tablePerPage.value = itemsPerPage
    searchValue.value = search
}

</script>

<template>
    <VRow align="center">
        <VCol md="2" cols="12">
            <SearchInput placeholder="Material Document" @update:search="handleSearch"/>
        </VCol>
        <VCol md="2" cols="12">
            <v-select
                label="Plant"
                density="compact"
                :items="plantsOption"
                item-title="title"
                item-value="id"
                v-model="filters.plant"
                clearable
                variant="outlined"
                return-object
                hide-details
            ></v-select>
        </VCol>
        <VCol md="2" cols="12">
            <v-select
                label="Storage Location"
                density="compact"
                :items="storageLocationsOption"
                item-title="name"
                item-value="id"
                v-model="filters.storageLocation"
                clearable
                variant="outlined"
                :disabled="!filters.plant"
                return-object
                hide-details
            ></v-select>
        </VCol>
        <VCol md="3" cols="12">
            <DateRangePicker v-model="filters.posting_date" placeholder="Select Posting Date"/>
        </VCol>
        <VCol md="3" cols="12" class="d-flex align-center">
            <PrimaryButton class="flex-grow-1 mr-2" type="button" :disabled="isFiltersEmpty" @click="applyFilter" :loading="isLoading">
                Apply Filter
            </PrimaryButton>
            <v-btn class="flex-grow-1" color="secondary" variant="outlined" :disabled="isFiltersEmpty" @click="resetFilter">Reset Filter</v-btn>
        </VCol>
    </VRow>

    <VCard>
        <datatable ref="datatableRef" @pagination-changed="onPaginationChanged" 
            :search="searchValue"
        />
    </VCard>



    <Toast :show="toast.show" :message="toast.message"/>
</template>
