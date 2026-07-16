<script setup>
import DateRangePicker from '@/components/DateRangePicker.vue';

import PrimaryButton from '@/components/PrimaryButton.vue';
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import { useAuthStore } from '@/stores/auth';
import { useGoodsIssueStore } from '@/stores/goodsIssueStore';
import { debounce } from 'lodash';
import { storeToRefs } from 'pinia'; // If needed, but we can access directly
import { computed, onMounted, ref, watch } from 'vue';
import datatable from './datatable.vue';

const goodsIssueStore = useGoodsIssueStore();
const authStore = useAuthStore();
const { filters } = storeToRefs(goodsIssueStore);

const searchValue = ref('');
const datatableRef = ref(null);
const tablePerPage = ref(10);
const tablePage = ref(1);
const tableSort = ref('-created_at')
const datatableFilters = ref({});
const isLoading = ref(false);
const toast = ref({
    message: 'Success message',
    color: 'success',
    show: false
});


const plantsOption = ref([]);
const storageLocationsOption = ref([]);

const palletStatusOption = ref([
    { name: 'Not Assigned', value: "not-assigned" },
    { name: 'Pallet Assigned', value: "assigned" }
]);

const syncDatatableFilters = () => {
    datatableFilters.value = {
        posting_date: filters.value.posting_date,
        plant_id: filters.value.plant?.id,
        storage_location_id: filters.value.storageLocation?.id,
        pallet_status: filters.value.pallet_status,
    };
};

onMounted(() => {
    fetchDataDropdown();
});

const fetchDataDropdown = async () => {
    try {
        const response = await ApiService.get('/users/get-data-dropdown');
        const { plants } = response.data;
        plantsOption.value = plants;

        const assignedPlantId = authStore.user?.assigned_plant?.id;
        const defaultStorageLocationId = authStore.user?.assigned_plant?.default_storage_location?.id;

        if (assignedPlantId) {
            const assignedPlant = plantsOption.value.find(p => p.id === assignedPlantId) || null;
            filters.value.plant = assignedPlant;
            storageLocationsOption.value = assignedPlant ? assignedPlant.storage_locations : [];

            if (defaultStorageLocationId && assignedPlant?.storage_locations?.length) {
                filters.value.storageLocation = assignedPlant.storage_locations.find(
                    storageLocation => storageLocation.id === defaultStorageLocationId
                ) || null;
            } else {
                filters.value.storageLocation = null;
            }

            syncDatatableFilters();

            return;
        }
        
        // Restore storage locations if plant is already selected (from persistence)
        if (filters.value.plant) {
             const selectedPlant = plantsOption.value.find(p => p.id === filters.value.plant.id);
             storageLocationsOption.value = selectedPlant ? selectedPlant.storage_locations : [];
        }

        syncDatatableFilters();

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
           !filters.value.storageLocation && 
           !filters.value.pallet_status
});

const applyFilter = () => {
    syncDatatableFilters();
}

const resetFilter = () => {
    goodsIssueStore.clearFilters();
    syncDatatableFilters();
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
        <VCol md="2" cols="12">
            <v-select
                label="Pallet Status"
                density="compact"
                :items="palletStatusOption"
                item-title="name"
                item-value="value"
                v-model="filters.pallet_status"
                clearable
                variant="outlined"
                hide-details
            ></v-select>
        </VCol>
        <VCol md="2" cols="12">
            <DateRangePicker v-model="filters.posting_date" placeholder="Select Posting Date"/>
        </VCol>

        <VCol md="1" cols="12" class="d-flex align-center">
            <PrimaryButton class="mr-2" type="button" :disabled="isFiltersEmpty" @click="applyFilter" :loading="isLoading">
                Apply Filter
            </PrimaryButton>
        </VCol>
        <VCol md="1" cols="12" class="d-flex align-center">
            <v-btn  color="secondary" variant="outlined" :disabled="isFiltersEmpty" @click="resetFilter">Reset Filter</v-btn>
        </VCol>
    </VRow>

    <VCard>
        <datatable ref="datatableRef" @pagination-changed="onPaginationChanged" 
            :search="searchValue"
            :filters="datatableFilters"
        />
    </VCard>



    <Toast :show="toast.show" :message="toast.message"/>
</template>
