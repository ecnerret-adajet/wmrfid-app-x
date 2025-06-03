<script setup>
import { default as AddingModal } from '@/components/AddingModal.vue';
import DateTimePicker from '@/components/DateTimePicker.vue';
import FilteringModal from '@/components/FilteringModal.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import { exportExcel } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import JwtService from '@/services/JwtService';
import { useAuthStore } from '@/stores/auth';
import '@vuepic/vue-datepicker/dist/main.css';
import axios from 'axios';
import { debounce } from 'lodash';
import Moment from 'moment';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import productionRunDetails from './productionRunDetails.vue';

const router = useRouter();
const dialogVisible = ref(false)
const searchValue = ref('');
const isLoading = ref(false);
const errorMessage = ref(null)
const productionLinesOption = ref([])
const materialsOption = ref([]);
const tagTypesOption = ref([]);
const filterModalVisible = ref(false);
const storageLocations = ref([]);
const plantsOption = ref([]);
const statisticsData = ref(null);
const pageLoading = ref(false);
const authStore = useAuthStore();
const triggerEndDialog = ref(false);
const selectedProductionRun = ref(null);
const triggerEndLoading = ref(false);
const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref(null); // Default sort

onMounted(() => {
    fetchDropdownData();
})

const filterModalOpen = () => {
    if (!filterModalVisible.value) {
        filterModalVisible.value = true;
    }
};

const fetchDropdownData = async () => {
    pageLoading.value = true;
    try {
        const token = JwtService.getToken();
        const response = await axios.get(`/production-runs/get-data-dropdown`, {
            params: {
                filters: filters
            },
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const { materials, production_lines, tag_types, storage_locations, statistics, plants } = response.data

        statisticsData.value = statistics

        productionLinesOption.value = production_lines.map(item => ({
            value: item.id,
            title: item.name
        }));
        tagTypesOption.value = tag_types.map(item => ({
            value: item.id,
            title: item.name
        }));
        materialsOption.value = materials.map(item => ({
            value: item.id,
            title: `${item.code} - ${item.description}`
        }));

        storageLocations.value = storage_locations.map(item => ({
            value: item.id,
            title: item.name,
            name: item.name
        }));

        plantsOption.value = plants.map(item => ({
            value: item.plant_code,
            title: item.name,
            name: item.name
        }));

    } catch (error) {
        console.log(error);
    } finally {
        pageLoading.value = false;
    }
};

const handleSearch = debounce((search) => {
    searchValue.value = search;
}, 500);


const openDialog = () => {
    if (!dialogVisible.value) {
        dialogVisible.value = true;
    }
};

const form = ref({
    'material_id': null,
    'production_line_id': null,
    'start_date_time': null,
    'end_date_time': null,
});

const submit = async () => {
    isLoading.value = true;
    toast.value.show = false;
    try {
        const response = await ApiService.post('production-runs/store', form.value)

        loadItems({ page: page.value, itemsPerPage: itemsPerPage.value, sortBy: [{ key: 'start_date_time', 'order': 'desc' }], search: searchValue.value });

        isLoading.value = false;
        dialogVisible.value = false
        toast.value.message = 'New production run successfully created!'
        toast.value.show = true;
        form.value.material_id = null;
        form.value.production_line_id = null;
        form.value.start_date_time = null;
        form.value.end_date_time = null;
        errorMessage.value = null;
    } catch (error) {
        errorMessage.value = error.response?.data?.message || 'An unexpected error occurred.';
        console.error('Error submitting:', error);
        isLoading.value = false;
    }
}

const filters = reactive({
    start_date_time: null,
    tag_type_id: null,
    storage_location_id: null,
    plant_code: null
});

const isFiltersEmpty = computed(() => {
    return !filters.start_date_time &&
        !filters.tag_type_id
});

const applyFilter = () => {
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{
            key: sortQuery.value.replace('-', ''),
            order: sortQuery.value.startsWith('-') ? 'desc' : 'asc'
        }]
    });
    filterModalVisible.value = false;
}

const resetFilter = () => {
    clearFilters();
    loadItems({ page: page.value, itemsPerPage: itemsPerPage.value, sortBy: [{ key: 'start_date_time', 'order': 'desc' }], search: searchValue.value });
    filterModalVisible.value = false;
}

const clearFilters = () => {
    filters.start_date_time = null;
    filters.tag_type_id = null;
    filters.storage_location_id = null;
    filters.plant_code = null;
};

const headers = [
    // {
    //     title: '',
    //     key: 'action',
    //     align: 'center',
    //     sortable: false,
    // },
    {
        title: 'PLANT',
        key: 'plant_id',
        sortable: false,
    },
    {
        title: 'MATERIAL',
        key: 'material_id',
        sortable: false,
    },
    {
        title: 'BATCH',
        key: 'batch',
        sortable: false,
    },
    {
        title: 'MFG DATE',
        key: 'mfg_date',
        sortable: false,
    },
    {
        title: 'QUANTITY',
        key: 'total_quantity',
        align: 'center',
        sortable: false,
    },
    {
        title: 'RFID COUNT',
        key: 'inventory_log_count',
        align: 'center',
        sortable: false,
    },
    {
        title: 'TYPE',
        key: 'rfid_type',
        align: 'center',
        sortable: false,
    },
    {
        title: 'LINE',
        key: 'line',
        align: 'center',
        sortable: false,
    },
    {
        title: 'START DATE',
        key: 'start_date_time',
        sortable: false,
    },
    {
        title: 'END DATE',
        key: 'end_date_time',
        align: 'center',
        sortable: false,
    },
]

const loadItems = ({ page, itemsPerPage, sortBy, search }) => {
    loading.value = true
    if (sortBy && sortBy.length > 0) {
        const sort = sortBy[0];  // Assuming single sort field
        sortQuery.value = `${sort.key}`;  // Default ascending order
        if (sort.order === 'desc') {
            sortQuery.value = `-${sort.key}`;  // Prefix with minus for descending order
        }
    } else {
        sortQuery.value = '-start_date_time';
    }

    ApiService.query('datatable/production-runs', {
        params: {
            page,
            itemsPerPage,
            sort: sortQuery.value,
            search: searchValue.value,
            filters: filters
        }
    })
        .then((response) => {
            totalItems.value = response.data.total;
            serverItems.value = response.data.data
            loading.value = false

        })
        .catch((error) => {
            loading.value = false
            console.log(error);
        });
}

watch(() => filters.plant_code, () => {
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{
            key: sortQuery.value.replace('-', ''),
            order: sortQuery.value.startsWith('-') ? 'desc' : 'asc'
        }]
    });

    fetchDropdownData()
});

const toast = ref({
    message: 'Production run trigger end successfully!',
    color: 'success',
    show: false
});

const handleEndProductionRun = async () => {
    triggerEndLoading.value = true
    try {
        const response = await axios.put(`production-runs/${selectedProductionRun.value.id}/trigger-end`);
        loadItems({
            page: page.value,
            itemsPerPage: itemsPerPage.value,
            sortBy: [{
                key: sortQuery.value.replace('-', ''),
                order: sortQuery.value.startsWith('-') ? 'desc' : 'asc'
            }]
        });
        fetchDropdownData() // Should reset the statistics data
        toast.value.message = 'Production run end trigger successfully!'
        toast.value.color = 'success';
        toast.value.show = true;
    } catch (error) {
        errorMessage.value = error.response?.data?.message || 'An unexpected error occurred.';
        console.error('Error updating:', error);
    } finally {
        triggerEndLoading.value = null;
        triggerEndDialog.value = false
    }
}

const triggerEnd = (item) => {
    selectedProductionRun.value = item;
    triggerEndDialog.value = true;
}

const actionList = [
    { title: 'View Details', key: 'view_details' },
]

const showProductionRunDetails = ref(false);
const handleAction = (productionRun, action) => {
    selectedProductionRun.value = productionRun;
    if (action.key == 'view_details') {
        showProductionRunDetails.value = true;
    }
}

const exportLoading = ref(false);
const exportData = async () => {
    try {
        exportLoading.value = true;
        await exportExcel({
            url: '/export/production-runs/',
            params: {
                plant_code: filters.plant_code,
                search: searchValue.value,
            },
            filename: 'production-runs-report.xlsx',
        });
    } catch (error) {
        console.error('Export error:', error);
    } finally {
        exportLoading.value = false;
    }
}

const showRecentProducedModal = ref(false);
const showRecentProduced = () => {
    fetchRecentProduced()
    showRecentProducedModal.value = true
}

const recentProducedLoading = ref(false);
const recentProduced = ref([]);
const fetchRecentProduced = async () => {
    recentProducedLoading.value = true;
    try {
        const token = JwtService.getToken();
        const response = await axios.get(`/production-runs/get-recent-produced`, {
            params: {
                plant_code: filters.plant_code,
                search: searchValue.value,
            },
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        if (response.status === 200) {
            recentProduced.value = response.data
        } else {
            console.error('Fail to fetch recently produced batches')
        }

    } catch (error) {
        console.log(error);
    } finally {
        recentProducedLoading.value = false;
    }
};

</script>

<template>
    <div class="d-flex flex-wrap gap-4 align-center justify-center">
        <SearchInput class="flex-grow-1" @update:search="handleSearch" />

        <v-btn class="d-flex align-center" prepend-icon="ri-equalizer-line" @click="filterModalOpen">
            <template #prepend>
                <v-icon color="white"></v-icon>
            </template>
            Filter
        </v-btn>

        <v-select style="max-width: 300px;" class="flex-grow-1 align-center mt-1" label="Filter by Plant"
            density="compact"
            :items="plantsOption.length > 1 ? [{ title: 'All', value: null }, ...plantsOption] : plantsOption"
            v-model="filters.plant_code"
            :rules="[value => value !== undefined || 'Please select an item from the list']">
        </v-select>

        <!-- <v-btn v-if="authStore.user.is_super_admin || authStore.user.is_warehouse_admin"
            class="d-flex justify-center align-center" @click="openDialog">
            Add New Production Run
        </v-btn> -->
        <v-btn :loading="exportLoading" class="d-flex align-center" prepend-icon="ri-download-line" @click="exportData">
            <template #prepend>
                <v-icon color="white"></v-icon>
            </template>
            Export
        </v-btn>

        <v-btn variant="outlined" color="primary-light" class="d-flex align-center" prepend-icon="ri-play-circle-line"
            @click="showRecentProduced">
            <template #prepend>
                <v-icon color="primary-light"></v-icon>
            </template>
            Show Recent Produced
        </v-btn>
    </div>

    <v-row class="match-height mb-2">
        <v-col cols="3">
            <v-skeleton-loader v-if="pageLoading" type="article"></v-skeleton-loader>
            <v-card v-else class="pa-4 bg-grey-50" elevation="2" style="border-radius: 4px;">
                <div class="d-flex align-center justify-space-between">
                    <div class="d-flex align-center">
                        <div class="d-flex align-center justify-center mr-4" style="
                                width: 48px;
                                height: 48px;
                                background-color: #e8f5e9;
                                border-radius: 12px;
                            ">
                            <v-icon icon="ri-play-circle-line" color="success" size="24"></v-icon>
                        </div>
                        <div>
                            <span class="text-subtitle-1 font-weight-bold text-grey-700">
                                Active Runs
                            </span>
                            <div class="text-h4 font-weight-bold text-primary mt-1">
                                {{ statisticsData?.active_runs_data?.total_active_runs || 0 }}
                            </div>
                            <div>
                                <span class="text-subtitle-2 font-weight-thin text-grey-600">
                                    Out of {{ statisticsData?.active_runs_data?.total_runs || 0 }} production
                                    {{ statisticsData?.active_runs_data?.total_runs > 1 ? 'runs' : 'run' }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Call to Action Button -->
                    <!-- <v-btn
                        color="primary"
                        variant="outlined"
                    >
                        View Items
                    </v-btn> -->
                </div>
            </v-card>
        </v-col>
        <v-col cols="3">
            <v-skeleton-loader v-if="pageLoading" type="article"></v-skeleton-loader>
            <v-card v-else class="pa-4 bg-grey-50" elevation="2" style="border-radius: 4px;">
                <div class="d-flex align-center justify-space-between">
                    <div class="d-flex align-center">
                        <div class="d-flex align-center justify-center mr-4" style="
                                width: 48px;
                                height: 48px;
                                background-color: #e8f5e9;
                                border-radius: 12px;
                            ">
                            <v-icon icon="ri-time-line" color="success" size="24"></v-icon>
                        </div>
                        <div>
                            <span class="text-subtitle-1 font-weight-bold text-grey-700">
                                Average Run Time
                            </span>
                            <div class="text-h4 font-weight-bold text-primary mt-1">
                                {{ statisticsData?.average_run_time_data?.formatted || 0 }}
                            </div>
                            <div>
                                <span class="text-subtitle-2 font-weight-thin text-grey-600">
                                    Based on {{ statisticsData?.average_run_time_data?.runs_considered.length || 0 }}
                                    production
                                    {{ statisticsData?.average_run_time_data?.runs_considered.length > 1 ? 'runs' :
                                        'run' }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Call to Action Button -->
                    <!-- <v-btn
                        color="primary"
                        variant="outlined"
                    >
                        View Items
                    </v-btn> -->
                </div>
            </v-card>
        </v-col>
        <v-col cols="3">
            <v-skeleton-loader v-if="pageLoading" type="article"></v-skeleton-loader>
            <v-card v-else class="pa-4 bg-grey-50" elevation="2" style="border-radius: 4px;">
                <div class="d-flex align-center justify-space-between">
                    <div class="d-flex align-center">
                        <div class="d-flex align-center justify-center mr-4" style="
                                width: 48px;
                                height: 48px;
                                background-color: #e8f5e9;
                                border-radius: 12px;
                            ">
                            <v-icon icon="ri-box-3-line" color="success" size="24"></v-icon>
                        </div>
                        <div>
                            <span class="text-subtitle-1 font-weight-bold text-grey-700">
                                Today's Ouput
                            </span>
                            <div class="text-h4 font-weight-bold text-primary mt-1">
                                {{ statisticsData?.todays_output?.total_items_produced_today }}
                            </div>
                            <div>
                                <span class="text-subtitle-2 font-weight-thin text-grey-600">
                                    Across {{ statisticsData?.todays_output?.runs_considered.length || 0 }} production
                                    {{ statisticsData?.todays_output?.runs_considered.length > 1 ? 'runs' : 'run' }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Call to Action Button -->
                    <!-- <v-btn
                        color="primary"
                        variant="outlined"
                    >
                        View Items
                    </v-btn> -->
                </div>
            </v-card>
        </v-col>
        <v-col cols="3">
            <v-skeleton-loader v-if="pageLoading" type="article"></v-skeleton-loader>
            <v-card v-else class="pa-4 bg-grey-50" elevation="2" style="border-radius: 4px;">
                <div class="d-flex align-center justify-space-between">
                    <div class="d-flex align-center">
                        <div class="d-flex align-center justify-center mr-4" style="
                                width: 48px;
                                height: 48px;
                                background-color: #e8f5e9;
                                border-radius: 12px;
                            ">
                            <v-icon icon="ri-bar-chart-grouped-line" color="success" size="24"></v-icon>
                        </div>
                        <div>
                            <span class="text-subtitle-1 font-weight-bold text-grey-700">
                                Today's Most Produced
                            </span>
                            <div class="text-h4 font-weight-bold text-primary mt-1">
                                {{ statisticsData?.todays_most_produced?.total_count || 0 }}
                            </div>
                            <div>
                                <span
                                    v-if="statisticsData?.todays_most_produced?.material_description || statisticsData?.todays_most_produced?.bu_material"
                                    class="text-subtitle-2 font-weight-thin text-grey-600">
                                    {{ statisticsData?.todays_most_produced?.material_description }} - {{
                                        statisticsData?.todays_most_produced?.bu_material }}
                                </span>
                                <span v-else class="text-subtitle-2 font-weight-thin text-grey-600">
                                    No material found
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Call to Action Button -->
                    <!-- <v-btn
                        color="primary"
                        variant="outlined"
                    >
                        View Items
                    </v-btn> -->
                </div>
            </v-card>
        </v-col>
    </v-row>

    <VCard>
        <VDataTableServer v-model:items-per-page="itemsPerPage" :headers="headers" :items="serverItems"
            :items-length="totalItems" :loading="loading" item-value="id" :search="searchValue"
            @update:options="loadItems" class="text-no-wrap">
            <!-- <template #item.action="{ item }">
                <div class="d-flex justify-center gap-1">
                    <v-menu location="end">
                        <template v-slot:activator="{ props }">
                            <v-btn icon="ri-more-2-line" variant="text" v-bind="props" color="grey"></v-btn>
                        </template>
                        <v-list>
                            <v-list-item @click="handleAction(item, action)" v-for="(action, i) in actionList" :key="i"
                                :value="i">
                                <v-list-item-title>{{ action.title }}</v-list-item-title>
                            </v-list-item>
                        </v-list>
                    </v-menu>
                </div>
            </template> -->

            <template #item.plant_id="{ item }">
                {{ item.plant?.name }}
            </template>

            <template #item.batch="{ item }">
                {{ item.COMMODITY }}
            </template>

            <template #item.line="{ item }">
                {{ item.SILO.trim() }}
            </template>

            <template #item.material_id="{ item }">
                {{ item.material?.description }}
            </template>

            <template #item.mfg_date="{ item }">
                <span>{{ item.manufacturing_date ?
                    Moment(item.manufacturing_date).format('MMMM D,YYYY') : '' }}</span>
            </template>

            <template #item.rfid_type="{ item }">
                <!-- <span>{{ item.tag_type_name }}</span> -->
                <!-- Default pallet, TODO update condition -->
                Pallet
            </template>

            <template #item.total_quantity="{ item }">
                {{ item.total_quantity }}
            </template>

            <template #item.start_date_time="{ item }">
                {{ item.START_T ? Moment(item.START_T).format('MMMM D, YYYY h:mm A') : '' }}
            </template>

            <template #item.end_date_time="{ item }">
                <div>
                    <div v-if="item.STOP_T && Moment(item.STOP_T).year() >= 1930">
                        {{ Moment(item.STOP_T).format('MMMM D, YYYY h:mm A') }}
                    </div>
                    <div v-else>
                        <v-badge color="success" content="Ongoing.." class="text-uppercase" inline></v-badge>
                    </div>
                </div>
            </template>

        </VDataTableServer>
    </VCard>

    <AddingModal @close="dialogVisible = false" :show="dialogVisible" :dialogTitle="'Add New Production Run'">
        <template #default>
            <v-form @submit.prevent="submit">
                <div>
                    <v-select label="Select Material" density="compact" :items="materialsOption"
                        v-model="form.material_id"
                        :rules="[value => !!value || 'Please select an item from the list']"></v-select>
                    <v-select class="mt-4" label="Select Production Line" density="compact"
                        :items="productionLinesOption" v-model="form.production_line_id"
                        :rules="[value => !!value || 'Please select an item from the list']"></v-select>
                    <div class="mt-4">
                        <DateTimePicker v-model="form.start_date_time" placeholder="Start Datetime" />
                    </div>
                    <VAlert v-if="errorMessage" class="mt-4" color="error" variant="tonal">
                        {{ errorMessage }}
                    </VAlert>
                    <div class="d-flex justify-end align-center mt-8">
                        <v-btn color="secondary" variant="outlined" @click="dialogVisible = false"
                            class="px-12 mr-3">Cancel</v-btn>
                        <PrimaryButton class="px-12" type="submit" :loading="isLoading">
                            Create
                        </PrimaryButton>
                    </div>
                </div>
            </v-form>
        </template>
    </AddingModal>

    <FilteringModal @close="filterModalVisible = false" :show="filterModalVisible"
        :dialogTitle="'Filter Production Runs'">
        <template #default>
            <v-form>
                <v-select label="Filter by Type" density="compact" :items="tagTypesOption"
                    v-model="filters.tag_type_id">
                </v-select>
                <div class="mt-4">
                    <label class="font-weight-bold">Date Started</label>
                    <DateRangePicker class="mt-1" v-model="filters.start_date_time" placeholder="Select Date Created" />
                </div>

                <div class="d-flex justify-end align-center mt-8">
                    <v-btn color="secondary" variant="outlined" :disabled="isFiltersEmpty" @click="resetFilter"
                        class="px-12 mr-3">Reset Filter</v-btn>
                    <PrimaryButton class="px-12" type="button" :disabled="isFiltersEmpty" @click="applyFilter"
                        :loading="isLoading">
                        Apply Filter
                    </PrimaryButton>
                </div>
            </v-form>
        </template>
    </FilteringModal>

    <v-dialog v-model="triggerEndDialog" max-width="600px" persistent>

        <v-sheet class="px-4 pt-8 pb-4 text-center mx-auto" elevation="12" max-width="600" rounded="lg" width="100%">
            <v-icon class="mb-5" color="primary" icon="ri-information-line" size="112"></v-icon>

            <h2 class="text-h4 mb-6">Do you want to end this production run?</h2>

            <div class="text-end">
                <v-btn color="secondary" variant="outlined" @click="triggerEndDialog = false"
                    class="px-12 mr-3">Cancel</v-btn>
                <PrimaryButton @click="handleEndProductionRun" color="primary" class="px-12"
                    :loading="triggerEndLoading">
                    Update
                </PrimaryButton>
            </div>
        </v-sheet>
    </v-dialog>

    <!-- Batch Details Modal -->
    <v-dialog v-if="selectedProductionRun" v-model="showProductionRunDetails" max-width="1500px">
        <v-card elevation="2">
            <v-card-title class="d-flex justify-space-between align-center mx-4 px-4 mt-6">
                <div class="text-h4 font-semibold ps-2 text-primary d-flex align-center">
                    <i class="ri-computer-line text-primary text-h4 mr-2" style="margin-top: -1px;"></i>
                    Production Run Details
                </div>
                <v-btn icon="ri-close-line" variant="text" @click="showProductionRunDetails = false"></v-btn>
            </v-card-title>
            <v-card-text>
                <productionRunDetails :production-run="selectedProductionRun" />
            </v-card-text>
        </v-card>
    </v-dialog>

    <!-- Recent Produced Modal -->
    <v-dialog v-model="showRecentProducedModal" max-width="1200px">
        <v-card elevation="2">
            <v-card-title class="d-flex justify-space-between align-center mx-4 px-4 mt-6">
                <div class="text-h4 font-semibold ps-2 text-primary d-flex align-center">
                    <i class="ri-computer-line text-primary text-h4 mr-2" style="margin-top: -1px;"></i>
                    Recent Produced Batches
                </div>
                <v-btn icon="ri-close-line" variant="text" @click="showRecentProducedModal = false"></v-btn>
            </v-card-title>
            <v-card-text>
                <v-table density="comfortable" class="mt-4">
                    <thead>
                        <tr>
                            <th class="text-left">Plant</th>
                            <th class="text-left">Storage Location</th>
                            <th class="text-left">RFID Code</th>
                            <th class="text-left">Material</th>
                            <th class="text-left">Batch</th>
                            <th class="text-left">MFG Date</th>
                        </tr>
                    </thead>
                    <tbody v-if="recentProducedLoading">
                        <tr v-for="n in 5" :key="n">
                            <td colspan="6">
                                <v-skeleton-loader type="text" class="w-100" />
                            </td>
                        </tr>
                    </tbody>
                    <tbody v-else-if="recentProduced.length === 0">
                        <tr style="height: 100px;">
                            <td colspan="6" class="text-center align-middle">
                                No results found --
                            </td>
                        </tr>
                    </tbody>
                    <tbody v-else>
                        <tr v-for="(item, index) in recentProduced" :key="index">
                            <td>{{ item.material?.plant?.name }}</td>
                            <td>{{ item.production_run?.production_line?.reader?.default_storage_location?.name }}</td>
                            <td>{{ item.rfid_code }}</td>
                            <td>{{ item.material?.description }}</td>
                            <td>{{ item.batch }}</td>
                            <td>
                                {{ Moment(`${item.mfg_date.split(' ')[0]} ${item.mfg_time}`,
                                    'YYYY-MM-DDHH: mm:ss').format('MMMM D, YYYY h: mm A') }}
                            </td>
                        </tr>
                    </tbody>
                </v-table>
            </v-card-text>
        </v-card>
    </v-dialog>

    <Toast :show="toast.show" :color="toast.color" :message="toast.message" @update:show="toast.show = $event" />
</template>
