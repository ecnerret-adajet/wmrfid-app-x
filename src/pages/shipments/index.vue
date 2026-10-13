<script setup>
import DateRangePicker from '@/components/DateRangePicker.vue';
import FilteringModal from '@/components/FilteringModal.vue';
import Loader from '@/components/Loader.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import { useAuthStore } from '@/stores/auth';
import Moment from 'moment';
import { onMounted, ref } from 'vue';
import datatable from './datatable.vue';

const authStore = useAuthStore();
const todayStr = Moment().format('YYYY-MM-DD');
const searchValue = ref('');
const datatableRef = ref(null);
const tablePerPage = ref(50);
const tablePage = ref(1);
const tableSort = ref('-load_start_date')
const isLoading = ref(false);
const pageLoading = ref(false);
const toast = ref({
    message: 'Success message',
    color: 'success',
    show: false
});
const filterModalVisible = ref(false);

const defaultFilters = () => ({
    plant: null, // Stores the full plant object or at least { id, title/code }
    storageLocation: null, // Stores the full sloc object
    dateFrom: todayStr,
    dateTo: todayStr,
    pallet_status: null
});

const filters = ref(defaultFilters());

const filterModalOpen = () => {
    if (!filterModalVisible.value) {
        filterModalVisible.value = true;
    }
};

const handleSearch = (search) => {
    searchValue.value = search;
}

const plantsOption = ref([]);
const fetchDropdownData = async () => {
    pageLoading.value = true;
    try {
        const response = await ApiService.get('/users/get-data-dropdown');
        const { plants } = response.data;
        plantsOption.value = plants;

        // Default to the user's assigned plant, falling back to the first plant in the list
        const assignedPlantId = authStore.user?.assigned_plant?.id;
        const defaultPlant = (assignedPlantId ? plantsOption.value.find(p => p.id === assignedPlantId) : null) ?? plantsOption.value[0] ?? null;
        const defaultStorageLocation = defaultPlant?.default_storage_location || null;

        if (defaultPlant) {
            filters.value.plant = defaultPlant;
            // storageLocationsOption.value = defaultPlant.storage_locations;
            // if (defaultStorageLocation) {
            //     filters.value.storageLocation = defaultStorageLocation;
            // }

            // Re-fetch since the datatable's initial load already ran before the default plant/storage location resolved
            applyFilter();
        }

    } catch (error) {
        console.error('Error fetching dropdown data:', error);
    } finally {
        pageLoading.value = false;
    }
};

const applyFilter = () => {
    searchValue.value = searchValue.value;
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
    clearFilters();
    if(datatableRef.value) {
        datatableRef.value.applyFilters([]);
    }
    filterModalVisible.value = false;
}

const clearFilters = () => {
    filters.value.dateFrom = null;
    filters.value.dateTo = null;
    filters.value.plant = null;
    filters.value.storageLocation = null;
    filters.value.pallet_status = null;
};

const onPaginationChanged = ({ page, itemsPerPage, sortBy, search }) => {
    tableSort.value = sortBy
    tablePage.value = page
    tablePerPage.value = itemsPerPage
    searchValue.value = search
}

onMounted(() => {
    fetchDropdownData();
});

</script>

<template>
    <VRow align="center">
        <VCol cols="12" sm="6" md="3">
            <SearchInput @update:search="handleSearch"/>
        </VCol>
        <VCol cols="12" sm="6" md="3">
			<v-select class=" align-center mt-1" label="Filter by Plant"
				density="compact"
				item-title="title"
				item-value="id"
				:items="plantsOption"
				v-model="filters.plant"
				return-object
				clearable
            >
			</v-select>
		</VCol>
        <VCol cols="12" sm="6" md="2">
			<v-text-field v-model="filters.dateFrom" label="Load Start From" type="date" density="compact" hide-details />
		</VCol>
		<VCol cols="12" sm="6" md="2">
			<v-text-field v-model="filters.dateTo" label="Load Start To" type="date" density="compact" hide-details />
		</VCol>
        <VCol cols="12" md="2" class="d-flex align-center">
			<v-btn block prepend-icon="ri-search-eye-line" @click="applyFilter">
				Search
			</v-btn>
		</VCol>
    </VRow>

    <VCard>
        <datatable ref="datatableRef" @pagination-changed="onPaginationChanged" 
            :search="searchValue" :initial-filters="{
                dateFrom: filters.dateFrom,
                dateTo: filters.dateTo,
                plant_id: filters.plant?.id,
                storage_location_id: filters.storageLocation?.id,
                pallet_status: filters.pallet_status
            }"
        />
    </VCard>

    <FilteringModal @close="filterModalVisible = false" :show="filterModalVisible" :dialogTitle="'Filter Shipments'">
        <template #default>
            <v-form>
                <div class="mt-4">
                    <label class="font-weight-bold">Date Created</label>
                    <DateRangePicker class="mt-1" v-model="filters.created_at" placeholder="Select Date Created"/>
                </div>
                 
                <div class="mt-4">
                    <label class="font-weight-bold">Date Updated</label>
                    <DateRangePicker class="mt-1" v-model="filters.updated_at" placeholder="Select Date Updated"/>
                </div>

                <div class="d-flex justify-end align-center mt-8">
                    <v-btn color="secondary" variant="outlined" :disabled="isFiltersEmpty" @click="resetFilter" class="px-12 mr-3">Reset Filter</v-btn>
                    <PrimaryButton class="px-12" type="button" :disabled="isFiltersEmpty" @click="applyFilter" :loading="isLoading">
                        Apply Filter
                    </PrimaryButton>
                </div>
            </v-form>
        </template>
    </FilteringModal>

    <Toast :show="toast.show" :message="toast.message"/>
    <Loader :show="pageLoading" />

</template>
