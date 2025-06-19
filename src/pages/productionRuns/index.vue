<script setup>
import { default as AddingModal } from '@/components/AddingModal.vue';
import DateTimePicker from '@/components/DateTimePicker.vue';
import FilteringModal from '@/components/FilteringModal.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import UnauthorizedPage from '@/components/UnauthorizedPage.vue';
import { useAuthorization } from '@/composables/useAuthorization';
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
import assignPallets from './assignPallets.vue';
import productionRunDetails from './productionRunDetails.vue';

const { authUserCan } = useAuthorization();

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
            title: `${item.plant_code} - ${item.code} - ${item.description}`
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
        toast.value.message = 'Manual production run successfully created!'
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
    plant_code: null,
    status: null
});

const isFiltersEmpty = computed(() => {
    return !filters.start_date_time &&
        !filters.tag_type_id &&
        !filters.storage_location_id &&
        !filters.plant_code &&
        !filters.status
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
    filters.status = null;
};

const headers = [
    {
        title: '',
        key: 'action',
        align: 'center',
        sortable: false,
    },
    // {
    //     title: 'PLANT',
    //     key: 'plant_id',
    //     sortable: false,
    // },
    // {
    //     title: 'MATERIAL',
    //     key: 'material_id',
    //     sortable: false,
    // },
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
        title: 'SAP COUNT',
        key: 'sap_count',
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
        title: 'RUN TYPE',
        key: 'run_type',
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
    {
        title: 'STATUS',
        key: 'status',
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

const showProductionRunDetails = ref(false);
const showConfirm = ref(false);
const showAssign = ref(false);
const handleAction = (productionRun, action) => {
    selectedProductionRun.value = productionRun;
    if (action.key == 'view_details') {
        showProductionRunDetails.value = true;
    }

    if (action.key == 'confirm_production_run') {
        confirmRemarks.value = null;
        if (selectedProductionRun.value.STOP_T == null || Moment(selectedProductionRun.value.STOP_T).year() <= 1930) {
            toast.value.color = 'error';
            toast.value.message = 'Selected production run not yet completed';
            toast.value.show = true;
            return;
        }

        if (selectedProductionRun.value.production_run_confirmation) {
            toast.value.color = 'error';
            toast.value.message = 'Selected production run already confirmed';
            toast.value.show = true;
            return;
        }
        showConfirm.value = true;
    }

    if (action.key == 'assign_pallets') {
        showAssign.value = true;
    }

    if (action.key == 'cancel_confirmation') {
        cancelRemarks.value = null;
        showCancel.value = true;
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
                status: filters.status
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

const statusOption = [
    { title: 'Completed', value: 'Completed' },
    { title: 'Ongoing', value: 'Ongoing' }
]

const confirmLoading = ref(false)
const confirmRemarks = ref(null)
const unauthorizedFlag = ref(false);

const confirmProductionRun = async () => {
    confirmLoading.value = true;
    toast.value.show = false;
    selectedProductionRun.value.remarks = confirmRemarks.value
    try {
        const response = await ApiService.post('production-runs/confirm', selectedProductionRun.value)

        loadItems({
            page: page.value,
            itemsPerPage: itemsPerPage.value,
            sortBy: [{
                key: sortQuery.value.replace('-', ''),
                order: sortQuery.value.startsWith('-') ? 'desc' : 'asc'
            }]
        });
        toast.value.color = 'success'
        toast.value.message = 'Successfully confirmed production run'
        toast.value.show = true;

    } catch (error) {
        if (error.response && error.response.status === 403) {
            unauthorizedFlag.value = true;
        } else {
            toast.value.message = 'An error occurred while loading data.';
            toast.value.color = 'error';
            toast.value.show = true;
        }
        console.error('Error submitting:', error);
    } finally {
        confirmLoading.value = false;
        showConfirm.value = false
        confirmRemarks.value = null;
    }
}

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

const cancelRemarks = ref(null)
const showCancel = ref(false);
const cancelLoading = ref(false)
const selectedReason = ref(null)
const cancelProductionRunConfirmation = async () => {
    cancelLoading.value = true
    selectedProductionRun.value.cancel_remarks = cancelRemarks.value
    selectedProductionRun.value.cancel_reason = selectedReason.value
    try {
        const response = await axios.post(`production-runs/cancel-confirmation`, selectedProductionRun.value);
        loadItems({
            page: page.value,
            itemsPerPage: itemsPerPage.value,
            sortBy: [{
                key: sortQuery.value.replace('-', ''),
                order: sortQuery.value.startsWith('-') ? 'desc' : 'asc'
            }]
        });
        toast.value.message = 'Production run end confirmation successfully cancelled!'
        toast.value.color = 'success';
        toast.value.show = true;
    } catch (error) {
        errorMessage.value = error.response?.data?.message || 'An unexpected error occurred.';
        console.error('Error updating:', error);
    } finally {
        cancelLoading.value = null;
        showCancel.value = false;
        selectedReason.value = null;
    }
}

const reasonList = [
    { title: 'INCORRECT DATA ENTRY', value: 'INCORRECT DATA ENTRY' },
    { title: 'CONFIRMED BY MISTAKE', value: 'CONFIRMED BY MISTAKE' },
    { title: 'QUALITY CONTROL ISSUES DISCOVERED AFTER CONFIRMATION', value: 'QUALITY CONTROL ISSUES DISCOVERED AFTER CONFIRMATION' },
    { title: 'PRODUCTION RUN INTERRUPTED', value: 'PRODUCTION RUN INTERRUPTED' },
    { title: 'CHANGE IN PRODUCTION SCHEDULE OR PRIORITIES', value: 'CHANGE IN PRODUCTION SCHEDULE OR PRIORITIES' },
    { title: 'MANUAL OVERRIDE DUE TO SYSTEM OR HARDWARE ERROR', value: 'MANUAL OVERRIDE DUE TO SYSTEM OR HARDWARE ERROR' },
    { title: 'OTHER REASON', value: 'OTHER REASON' }
]

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

        <v-btn v-if="authUserCan('export.production.runs')" :loading="exportLoading" class="d-flex align-center"
            prepend-icon="ri-download-line" @click="exportData">
            <template #prepend>
                <v-icon color="white"></v-icon>
            </template>
            Export
        </v-btn>

        <v-btn v-if="authUserCan('create.production.runs')" class="d-flex align-center" prepend-icon="ri-add-line"
            @click="dialogVisible = true">
            <template #prepend>
                <v-icon color="white"></v-icon>
            </template>
            Add Manual Run
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
                                    Based on {{ statisticsData?.average_run_time_data?.runs_considered?.length || 0 }}
                                    production
                                    {{ statisticsData?.average_run_time_data?.runs_considered?.length > 1 ? 'runs' :
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
            <template #item.action="{ item }">
                <div class="d-flex justify-center gap-1">
                    <v-menu location="end">
                        <template v-slot:activator="{ props }">
                            <v-btn icon="ri-more-2-line" variant="text" v-bind="props" color="grey"></v-btn>
                        </template>
                        <v-list>
                            <v-list-item v-if="!item.production_run_confirmation && item.run_type == 2"
                                @click="handleAction(item, { key: 'assign_pallets', title: 'Assign Pallets' })">
                                <v-list-item-title>Assign Pallets</v-list-item-title>
                            </v-list-item>
                            <v-list-item
                                @click="handleAction(item, { key: 'view_details', title: 'View Production Run Details' })">
                                <v-list-item-title>View Production Run Details</v-list-item-title>
                            </v-list-item>
                            <v-list-item v-if="!item.production_run_confirmation"
                                @click="handleAction(item, { key: 'confirm_production_run', title: 'Confirm Production Run' })">
                                <v-list-item-title>Confirm Production Run</v-list-item-title>
                            </v-list-item>
                            <v-list-item class="text-error"
                                v-if="item.production_run_confirmation && Moment().diff(Moment(item.production_run_confirmation?.created_at), 'hours') < 200"
                                @click="handleAction(item, { key: 'cancel_confirmation', title: 'Reverse Confirmation' })">
                                <v-list-item-title>Reverse Confirmation</v-list-item-title>
                            </v-list-item>

                        </v-list>
                    </v-menu>
                </div>
            </template>

            <template #item.plant_id="{ item }">
                {{ item.plant?.name }}
            </template>

            <template #item.batch="{ item }">
                {{ item.COMMODITY }}
            </template>

            <template #item.line="{ item }">
                {{ item.SILO.trim() }}
            </template>

            <template #item.run_type="{ item }">
                <v-badge v-if="item.run_type === 1" color="primary-light" content="PLC RUN" class="text-uppercase"
                    inline></v-badge>
                <v-badge v-else color="warning" content="MANUAL RUN" class="text-uppercase" inline></v-badge>
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

            <template #item.inventory_log_count="{ item }">
                {{ item.inventory_logs.length }}
            </template>

            <template #item.sap_count="{ item }">
                {{ (item.sap_count) }}
            </template>

            <template #item.total_quantity="{ item }">
                {{ (item.inventory_logs?.length || 0) * (item.material?.default_pallet_quantity || 0) }}
            </template>

            <template #item.start_date_time="{ item }">
                {{ item.START_T ? Moment(item.START_T).format('MMMM D, YYYY h:mm A') : '' }}
            </template>

            <template #item.end_date_time="{ item }">
                <!-- FOR PLC Production run -->
                <div v-if="item.run_type === 1">
                    <div v-if="item.STOP_T && Moment(item.STOP_T).year() >= 1930">
                        {{ Moment(item.STOP_T).format('MMMM D, YYYY h:mm A') }}
                    </div>
                    <div v-else>
                        <v-badge color="warning" content="Ongoing.." class="text-uppercase" inline></v-badge>
                    </div>
                </div>
                <!-- FOR Manual Production run -->
                <div v-else>
                    <div v-if="item.STOP_T">
                        {{ item.STOP_T ? Moment(item.STOP_T).format('MMMM D, YYYY h:mm A') : '' }}
                    </div>
                    <div v-else>
                        <v-btn class="px-2" @click="triggerEnd(item)" type="button" color="primary-light">
                            Trigger End
                        </v-btn>
                    </div>
                </div>
            </template>

            <template #item.status="{ item }">
                <v-badge v-if="item.production_run_confirmation" color="success" content="Confirmed"
                    class="text-uppercase" inline></v-badge>
                <v-badge v-else color="warning" content="Not Yet Confirmed" class="text-uppercase" inline></v-badge>
            </template>

        </VDataTableServer>
    </VCard>

    <AddingModal @close="dialogVisible = false" :show="dialogVisible" :dialogTitle="'Add Manual Production Run'">
        <template #default>
            <v-form @submit.prevent="submit">
                <div>
                    <v-select label="Select Material" density="compact" :items="materialsOption"
                        v-model="form.material_id" persistent-hint clearable
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

    <FilteringModal @close="filterModalVisible = false" :show="filterModalVisible"
        :dialogTitle="'Filter Production Runs'">
        <template #default>
            <v-form>
                <div>
                    <label class="font-weight-bold">RFID Type</label>
                    <v-select class="mt-1" label="Filter by Type" density="compact" :items="tagTypesOption"
                        v-model="filters.tag_type_id"></v-select>
                </div>
                <div class="mt-4">
                    <label class="font-weight-bold">Status</label>
                    <v-select class="mt-1" label="Filter by Status" density="compact" :items="statusOption"
                        v-model="filters.status">
                    </v-select>
                </div>
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

    <!-- Confirm Details Modal -->
    <v-dialog v-if="selectedProductionRun" v-model="showConfirm" max-width="700px">
        <v-card elevation="2">
            <v-card-title class="d-flex justify-space-between align-center mx-4 px-4 mt-6">
                <div class="text-h4 font-semibold ps-2 text-primary d-flex align-center">
                    <i class="ri-computer-line text-primary text-h4 mr-2" style="margin-top: -1px;"></i>
                    Confirm Production Run
                </div>
                <v-btn icon="ri-close-line" variant="text" @click="showConfirm = false"></v-btn>
            </v-card-title>
            <v-card-text>
                <VList lines="one" density="compact" class="mb-4">
                    <VListItem>
                        <VRow class="table-row" no-gutters>
                            <VCol md="12" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="6" class="d-inline-flex align-center">
                                        <span class="text-h6 text-uppercase font-weight-bold text-grey-700"
                                            style="margin-top: 1px;">Batch</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-grey-700">{{
                                            selectedProductionRun.COMMODITY
                                        }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                        <VRow class="table-row mt-3" no-gutters>
                            <VCol md="12" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="6" class="d-inline-flex align-center">
                                        <span class="text-h6 text-uppercase font-weight-bold text-grey-700"
                                            style="margin-top: 1px;">Material</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-grey-700">{{
                                            selectedProductionRun.material?.description }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                        <VRow class="table-row mt-3" no-gutters>
                            <VCol md="12" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="6" class="d-inline-flex align-center">
                                        <span class="text-h6 text-uppercase font-weight-bold text-grey-700"
                                            style="margin-top: 1px;">Manufacturing Date</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-grey-700">
                                            {{ selectedProductionRun.manufacturing_date ?
                                                Moment(selectedProductionRun.manufacturing_date).format('MMMM D, YYYY') : ''
                                            }}
                                        </span>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                        <VRow class="table-row mt-3" no-gutters>
                            <VCol md="12" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="6" class="d-inline-flex align-center">
                                        <span class="text-h6 text-uppercase font-weight-bold text-grey-700"
                                            style="margin-top: 1px;">Line</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-grey-700">{{
                                            selectedProductionRun.SILO.trim()
                                            }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                        <VRow class="table-row mt-3" no-gutters>
                            <VCol md="12" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="6" class="d-inline-flex align-center">
                                        <span class="text-h6 text-uppercase font-weight-bold text-grey-700"
                                            style="margin-top: 1px;">PLC Count</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-grey-700">0</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                        <VRow class="table-row mt-3" no-gutters>
                            <VCol md="12" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="6" class="d-inline-flex align-center">
                                        <span class="text-h6 text-uppercase font-weight-bold text-grey-700"
                                            style="margin-top: 1px;">SAP Count</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-grey-700">{{
                                            selectedProductionRun.sap_count
                                        }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                        <VRow class="table-row mt-3" no-gutters>
                            <VCol md="12" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="6" class="d-inline-flex align-center">
                                        <span class="text-h6 text-uppercase font-weight-bold text-grey-700"
                                            style="margin-top: 1px;">WMRFID Count</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-grey-700">{{
                                            selectedProductionRun.inventory_logs.length || 0 }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                </VList>
                <div class="mx-4">
                    <v-textarea v-model="confirmRemarks" class="mt-4" clear-icon="ri-close-line" label="Remarks"
                        lines="1" clearable></v-textarea>
                </div>
                <div class="d-flex justify-end align-center mt-8 mx-4">
                    <v-btn color="secondary" variant="outlined" @click="showConfirm = false"
                        class="px-12 mr-3">Close</v-btn>
                    <v-btn :loading="confirmLoading" class="d-flex align-center px-12" @click="confirmProductionRun">
                        Confirm
                    </v-btn>
                </div>
            </v-card-text>
        </v-card>
    </v-dialog>

    <!-- Assign Pallets Modal -->
    <v-dialog v-if="selectedProductionRun" v-model="showAssign" max-width="1500px">
        <v-card elevation="2">
            <v-card-title class="d-flex justify-space-between align-center mx-4 px-4 mt-6">
                <div class="text-h4 font-weight-black ps-2 text-primary d-flex align-center">
                    <i class="ri-computer-line text-primary text-h4 mr-2" style="margin-top: -1px;"></i>
                    Production Run - Assign Pallets
                </div>
                <v-btn icon="ri-close-line" variant="text" @click="showAssign = false"></v-btn>
            </v-card-title>
            <v-card-text>
                <assign-pallets :production-run="selectedProductionRun" />
            </v-card-text>
        </v-card>
    </v-dialog>
    <UnauthorizedPage :show="unauthorizedFlag" @close="unauthorizedFlag = false" />

    <!-- Confirm Details Modal -->
    <v-dialog v-if="selectedProductionRun" v-model="showCancel" max-width="700px">
        <v-card elevation="2">
            <v-card-title class="d-flex justify-space-between align-center mx-4 px-4 mt-6">
                <div class="text-h4 font-semibold ps-2 text-primary d-flex align-center">
                    <i class="ri-computer-line text-primary text-h4 mr-2" style="margin-top: -1px;"></i>
                    Cancel Production Run Confirmation
                </div>
                <v-btn icon="ri-close-line" variant="text" @click="showCancel = false"></v-btn>
            </v-card-title>
            <v-card-text>
                <div class="mx-4 mt-4">
                    <v-autocomplete label="Reason for Cancellation" density="compact" item-title="title"
                        item-value="value" :items="reasonList" v-model="selectedReason"
                        :rules="[value => !!value || 'Please select an item from the list']" />
                </div>
                <div class="mx-4">
                    <v-textarea v-model="cancelRemarks" class="mt-4" clear-icon="ri-close-line" label="Remarks"
                        lines="1" clearable></v-textarea>
                </div>
                <div class="d-flex justify-end align-center mt-8 mx-4">
                    <v-btn color="secondary" variant="outlined" @click="showConfirm = false"
                        class="px-12 mr-3">Close</v-btn>
                    <v-btn :loading="cancelLoading" color="error" class="d-flex align-center px-12"
                        @click="cancelProductionRunConfirmation">
                        Cancel confirmation
                    </v-btn>
                </div>
            </v-card-text>
        </v-card>
    </v-dialog>

    <Toast :show="toast.show" :color="toast.color" :message="toast.message" @update:show="toast.show = $event" />
</template>
