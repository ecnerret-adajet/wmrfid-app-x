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
    pallet_assignment: 1,
    batch_pick: 1,
});

const filters = ref(defaultFilters());

const searchInput = ref(''); // raw value from the search field, not yet applied
const searchValue = ref(''); // committed search term, only updated when Search is clicked
const datatableRef = ref(null);
const tablePerPage = ref(50);
const tablePage = ref(1);
const tableSort = ref('-created_at')
const isLoading = ref(false);
const pageLoading = ref(false);
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
        pageLoading.value = true;
        const response = await ApiService.get('/users/get-data-dropdown');
        const { plants } = response.data;
        plantsOption.value = plants;

        // Default to the user's assigned plant
        const assignedPlantId = authStore.user?.assigned_plant?.id;
        const defaultPlant = assignedPlantId ? plantsOption.value.find(p => p.id === assignedPlantId) : null;
        const defaultStorageLocation = defaultPlant?.storage_locations?.[0] || null;

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
           !filters.value.storageLocation
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
            valid_material_only: true,
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
    <VRow no-gutters align="center">
        <VCol md="6" cols="12" class="pe-md-2 pb-2 pb-md-0">
            <SearchInput placeholder="PO Number" @update:search="handleSearch"/>
        </VCol>
        <VCol md="3" cols="12" class="pe-md-2 pb-2 pb-md-0">
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
        <VCol md="3" cols="12" class="pb-2 pb-md-0">
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
    </VRow>

    <VRow no-gutters align="center" class="mb-4">
        <VCol md="2" cols="12" class="pe-md-2 pb-2 pb-md-0">
            <v-text-field v-model="filters.dateFrom" label="Date From" type="date" density="compact" variant="outlined" hide-details />
        </VCol>
        <VCol md="2" cols="12" class="pe-md-2 pb-2 pb-md-0">
            <v-text-field v-model="filters.dateTo" label="Date To" type="date" density="compact" variant="outlined" hide-details />
        </VCol>
        <VCol md="2" cols="12" class="pe-md-2 pb-2 pb-md-0">
            <v-select label="Pallet Assignment"
                density="compact" :items="[
                    { title: 'All', value: null },
                    { title: 'Pending', value: 1 },
                    { title: 'Partial', value: 2 },
                    { title: 'Completed', value: 3 }
                ]" v-model="filters.pallet_assignment">
            </v-select>
        </VCol>
        <VCol md="2" cols="12" class="pe-md-2 pb-2 pb-md-0">
            <v-select label="Batch Pick"
                density="compact" :items="[
                    { title: 'All', value: null },
                    { title: 'No Batch Picked', value: 1 },
                    { title: 'Batch Picked', value: 2 }
                ]" v-model="filters.batch_pick">
            </v-select>
        </VCol>
        <VCol md="2" class="d-none d-md-flex"></VCol>
       
        <VCol md="2" cols="12" class="pb-2 pb-md-0 d-flex align-center">
            <PrimaryButton class="flex-grow-1" type="button" @click="applyFilter" :loading="isLoading">
                <i class="ri-search-eye-line mr-2"></i>
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
                valid_material_only: true,
            }"
        />
    </VCard>

    <Toast :show="toast.show" :message="toast.message"/>
    <Loader :show="pageLoading" />

</template>
