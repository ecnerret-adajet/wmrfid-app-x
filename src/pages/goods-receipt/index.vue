<script setup>
import Loader from '@/components/Loader.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import { useAuthStore } from '@/stores/auth';
import Moment from 'moment';
import { computed, onMounted, ref, watch } from 'vue';
import datatable from './datatable.vue';

const authStore = useAuthStore();
const todayStr = Moment().format('YYYY-MM-DD');

const defaultFilters = () => ({
    plant: null, // Stores the full plant object or at least { id, title/code }
    storageLocation: null, // Stores the full sloc object
    dateFrom: todayStr,
    dateTo: todayStr,
    pallet_status: null
});

const filters = ref(defaultFilters());

const searchInput = ref(''); // raw value from the search field, not yet applied
const searchValue = ref(''); // committed search term, only updated when Search is clicked
const datatableRef = ref(null);
const tablePerPage = ref(10);
const tablePage = ref(1);
const tableSort = ref('-created_at')
const isLoading = ref(false);
const pageLoading = ref(false)
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

onMounted(() => {
    fetchDataDropdown();
});

const fetchDataDropdown = async () => {
    pageLoading.value = true;
    try {
        const response = await ApiService.get('/users/get-data-dropdown');
        const { plants } = response.data;
        plantsOption.value = plants;

        // Default to the user's assigned plant
        const assignedPlantId = authStore.user?.assigned_plant?.id;
        const defaultPlant = assignedPlantId ? plantsOption.value.find(p => p.id === assignedPlantId) : null;
        const defaultStorageLocation = defaultPlant?.default_storage_location || null;

        if (defaultPlant) {
            filters.value.plant = defaultPlant;
            storageLocationsOption.value = defaultPlant.storage_locations;
            if (defaultStorageLocation) {
                filters.value.storageLocation = defaultStorageLocation;
            }

            // Re-fetch since the datatable's initial load already ran before the default plant/storage location resolved
            applyFilter();
        }

    } catch (error) {
        console.error('Error fetching dropdown data:', error);
    } finally {
        pageLoading.value = false;
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
    return !filters.value.dateFrom &&
           !filters.value.dateTo &&
           !filters.value.plant &&
           !filters.value.storageLocation && 
           !filters.value.pallet_status
});

const applyFilter = () => {
    searchValue.value = searchInput.value;
    if(datatableRef.value) {
        // Pass IDs to datatable as it expects
        datatableRef.value.applyFilters({
            dateFrom: filters.value.dateFrom,
            dateTo: filters.value.dateTo,
            plant_id: filters.value.plant?.id,
            storage_location_id: filters.value.storageLocation?.id,
            pallet_status: filters.value.pallet_status
        });
    }
}

const resetFilter = () => {
    filters.value = defaultFilters();
    searchInput.value = '';
    searchValue.value = '';
    if(datatableRef.value) {
        datatableRef.value.applyFilters([]);
    }
}

const handleSearch = (search) => {
    searchInput.value = search;
}

const onPaginationChanged = ({ page, itemsPerPage, sortBy, search }) => {
    tableSort.value = sortBy
    tablePage.value = page
    tablePerPage.value = itemsPerPage
    searchValue.value = search
}

</script>

<template>
    <VRow align="center" >
        <VCol md="4" cols="12">
            <SearchInput placeholder="Material Document" @update:search="handleSearch"/>
        </VCol>
        <VCol md="3" cols="12">
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
        <VCol md="3" cols="12">
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
        
    </VRow>

    <VRow align="center" class="mb-4">
        <VCol md="2" cols="12">
            <v-text-field v-model="filters.dateFrom" label="Date From" type="date" density="compact" variant="outlined" hide-details />
        </VCol>
        <VCol md="2" cols="12">
            <v-text-field v-model="filters.dateTo" label="Date To" type="date" density="compact" variant="outlined" hide-details />
        </VCol>
        <VCol md="2" cols="12" class="d-flex align-center">
            <PrimaryButton class="flex-grow-1 mr-2" type="button" @click="applyFilter" :loading="isLoading">
                Search
            </PrimaryButton>
        </VCol>
    </VRow>

    <VCard>
        <datatable ref="datatableRef" @pagination-changed="onPaginationChanged" 
            :search="searchValue"
            :initial-filters="{
                dateFrom: filters.dateFrom,
                dateTo: filters.dateTo,
                plant_id: filters.plant?.id,
                storage_location_id: filters.storageLocation?.id,
                pallet_status: filters.pallet_status
            }"
        />
    </VCard>

    <Toast :show="toast.show" :message="toast.message"/>
    <Loader :show="pageLoading" />

</template>
