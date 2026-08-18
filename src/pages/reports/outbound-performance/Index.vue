<script setup>
import DatePicker from '@/components/DatePicker.vue';
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import { exportExcel } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import moment from 'moment';
import { ref } from 'vue';
import OutboundPerformanceChart from './OutboundPerformanceChart.vue';

import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

const searchValue = ref('');
const datatableRef = ref(null);
const isLoading = ref(false);
const plantsOption = ref([])
const baysOption = ref([])
const today = moment().format('MMMM D, YYYY');

const toast = ref({
    message: 'Success!',
    color: 'success',
    show: false
});

const filters = reactive({
    plant_code: authStore.user?.assigned_plant?.plant_code || null,
    shift_id: null,
    bay_no: null,
    scan_status: null,
    date_from: today,
    date_to: today,
});

const activeView = ref('table')

const clearFilters = () => {
    filters.plant_code = null;
    filters.shift_id = null;
    filters.bay_no = null;
    filters.scan_status = null;
    filters.date_from = today;
    filters.date_to = today;
};

onMounted(() => {
    fetchDropdownData();
})

const shifts = ref([]);
const fetchDropdownData = async () => {
    isLoading.value = true;
    try {
        let endpoint = 'reports/outbound-performance-data-dropdown';

        if (filters.plant_code) {
            endpoint += `/${filters.plant_code}`;
        }

        const preReqData = await ApiService.get(endpoint);
        const { plants, shifts_dropdown, bays_dropdown } = preReqData.data;

        plantsOption.value = plants.map(item => ({
            value: item.plant_code,
            title: `${item.plant_code} - ${item.name}`,
            name: item.name
        }));
        shifts.value = shifts_dropdown;
        baysOption.value = bays_dropdown;
    } catch (error) {
        console.error('Error fetching data:', error);
    } finally {
        isLoading.value = false;
    }
};


const exportLoading = ref(false);
const exportData = async () => {
    if (!validateDateRange()) {
        return;
    }

    try {
        exportLoading.value = true;

        await exportExcel({
            url: `/reports/outbound-performance/export`,
            params: {
                filters: filters
            },
            filename: 'outbound-performance-report.xlsx',
        });
    } catch (error) {
        console.error('Export error:', error);
    } finally {
        exportLoading.value = false;
    }
}

const validateDateRange = () => {
    if (!filters.date_from || !filters.date_to) {
        toast.value = {
            message: 'Date From and Date To are required.',
            color: 'error',
            show: true
        };
        return false;
    }

    if (moment(filters.date_to, 'MMMM D, YYYY').isBefore(moment(filters.date_from, 'MMMM D, YYYY'), 'day')) {
        toast.value = {
            message: 'Date To must be the same as or later than Date From.',
            color: 'error',
            show: true
        };
        return false;
    }

    return true;
};

const handleSearch = () => {
    if (!validateDateRange()) {
        return;
    }

    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{ key: 'scanned_pallet_at', order: 'desc' }],
        filters: filters,
        search: searchValue.value
    });
};


const baseHeaders = [
    { title: 'PLANT', key: 'plant_id', fixed: true, align: 'start', width: 65, sortable: false },
    { title: 'PHYSICAL ID', key: 'physical_id', fixed: true, width: 100, sortable: false },
    { title: 'DELIVERY DOC.', key: 'delivery_document', fixed: true, width: 120, sortable: false },
    { title: 'BATCH', key: 'batch', fixed: true, width: 120, sortable: false },
    { title: 'HAS QR', key: 'has_qr', fixed: true, width: 90, sortable: false },
    { title: 'BAY NO.', key: 'bay_no', fixed: true, width: 90, sortable: false },
    { title: 'Status', key: 'status', fixed: true, width: 130, sortable: false },
    { title: 'Reservation Date', key: 'reservation_date', width: 130, sortable: false },
    { title: 'Pallet Scan Date', key: 'pallet_scan_date', width: 130, sortable: false },
    { title: 'Reservation-Pallet Scan', key: 'reservation_pallet_scan', sortable: false },
    { title: 'Bay Scan Date', key: 'bay_scan_date', width: 130, sortable: false },
    { title: 'Pallet Scan-Bay Scan', key: 'pallet_bay_scan', sortable: false },
    { title: 'Reservation-Bay Scan', key: 'reservation_bay_scan', sortable: false },
    { title: 'Scanned By', key: 'bay_scanned_by', sortable: false },
]

const headers = computed(() => {
    if (totalItems.value === 0) {
        return baseHeaders.map(({ fixed, ...rest }) => rest)
    }
    return baseHeaders
})

const loading = ref(true);
const serverItems = ref([]);
const totalItems = ref(0);
const itemsPerPage = ref(25);
const page = ref(1);
const sortQuery = ref('-scanned_pallet_at');
const kpi = ref({
    reservation_pallet_scan: { max: null, min: null, avg: null, count: null },
    pallet_bay_scan: { max: null, min: null, avg: null, count: null },
    reservation_bay_scan: { max: null, min: null, avg: null, count: null },
});

const summaryChart = ref(null)

const loadItems = ({ page, itemsPerPage, sortBy }) => {
    loading.value = true
    if (sortBy && sortBy.length > 0) {
        const sort = sortBy[0];
        sortQuery.value = `${sort.key}`;
        if (sort.order === 'desc') {
            sortQuery.value = `-${sort.key}`;
        }
    } else {
        sortQuery.value = '-scanned_pallet_at';
    }

    ApiService.query('reports/datatable/outbound-performance-report', {
        params: {
            page,
            itemsPerPage,
            sort: sortQuery.value,
            search: searchValue.value,
            filters: filters
        }
    })
        .then((response) => {
            const payload = response.data;

            if (payload.kpi && payload.kpi.stages) {
                kpi.value = payload.kpi.stages;
            }

            if (payload.table) {
                serverItems.value = payload.table.data;
                totalItems.value = payload.table.total;
            }

            if (payload.summary_chart) {
                summaryChart.value = payload.summary_chart;
            }

            loading.value = false;
        })
        .catch((error) => {
            console.log(error);
        });
}


</script>

<template>
    <div class="d-flex flex-wrap gap-4 align-center justify-center">
        <SearchInput class="flex-grow-1" @update:search="(val) => { searchValue = val; handleSearch(); }" />

        <!-- Plant Filter -->
        <v-select style="max-width: 350px;" class="flex-grow-1 align-center mt-1" label="Filter by Plant"
            density="compact"
            :items="plantsOption.length > 1 ? [{ title: 'All', value: null }, ...plantsOption] : plantsOption"
            v-model="filters.plant_code"
            :rules="[value => value !== undefined || 'Please select an item from the list']">
        </v-select>

        <!-- Bay Filter -->
        <v-select style="max-width: 220px;" class="flex-grow-1 align-center mt-1" label="Filter by Bay"
            density="compact" :items="[{ title: 'All', value: null }, ...baysOption]" v-model="filters.bay_no">
        </v-select>

        <!-- Shifts Filter -->
        <v-select style="max-width: 270px;" class="flex-grow-1 align-center mt-1" label="Filter by Shift"
            density="compact" :items="[{ title: 'All', value: null }, ...shifts]" v-model="filters.shift_id">
        </v-select>

        <!-- Scan Status Filter -->
        <v-select style="max-width: 220px;" class="flex-grow-1 align-center mt-1" label="Filter by Status"
            density="compact" :items="[
                { title: 'All', value: null },
                { title: 'Bay Scanned', value: 1 },
                { title: 'Pending Bay Scan', value: 2 },
                { title: 'No QR (N/A)', value: 3 },
            ]" v-model="filters.scan_status">
        </v-select>

        <!-- Action Buttons -->
        <v-btn :loading="exportLoading" class="d-flex align-center" prepend-icon="ri-download-line" @click="exportData">
            <template #prepend>
                <v-icon color="white"></v-icon>
            </template>
            Export
        </v-btn>
        <v-btn class="d-flex align-center" prepend-icon="ri-search-eye-line" @click="handleSearch">
            <template #prepend>
                <v-icon color="white"></v-icon>
            </template>
            Search
        </v-btn>
    </div>

    <div class="d-flex mb-4 gap-4">
        <div style="max-width: 200px;" class="flex-grow-1">
            <label class="text-caption">Date From</label>
            <DatePicker v-model="filters.date_from" />
        </div>

        <div style="max-width: 200px;" class="flex-grow-1 align-start">
            <label class="text-caption">Date To</label>
            <DatePicker v-model="filters.date_to" />
        </div>
    </div>
    <v-tabs v-model="activeView" color="primary">
        <v-tab value="table">
            <v-icon start>ri-table-line</v-icon>
            Table View
        </v-tab>

        <v-tab value="summary">
            <v-icon start>ri-bar-chart-line</v-icon>
            Summary View
        </v-tab>
    </v-tabs>
    <v-window v-model="activeView">
        <v-window-item value="table">
            <VCard>
                <VDataTableServer v-model:items-per-page="itemsPerPage" :headers="headers" :items="serverItems"
                    :items-length="totalItems" :loading="loading" item-value="id" @update:options="loadItems"
                    class="text-no-wrap fixed-column-table">
                    <template #header.physical_id="{ column }">
                        <span>PHYSICAL</span><br />
                        <span>ID</span>
                    </template>

                    <template #header.reservation_pallet_scan="{ column }">
                        <div class="d-flex flex-column py-2" style="line-height: 1.2;">
                            <span class="mb-1">{{ column.title }}</span>
                            <span class="text-caption text-medium-emphasis">Max: {{ kpi?.reservation_pallet_scan?.max }}</span>
                            <span class="text-caption text-medium-emphasis">Min: {{ kpi?.reservation_pallet_scan?.min }}</span>
                            <span class="text-caption text-medium-emphasis">Ave: {{ kpi?.reservation_pallet_scan?.avg }}</span>
                            <span class="text-caption text-medium-emphasis">No. of Pallets: {{
                                kpi?.reservation_pallet_scan?.count }}</span>
                        </div>
                    </template>

                    <template #header.pallet_bay_scan="{ column }">
                        <div class="d-flex flex-column py-2" style="line-height: 1.2;">
                            <span class="mb-1">{{ column.title }}</span>
                            <span class="text-caption text-medium-emphasis">Max: {{ kpi?.pallet_bay_scan?.max }}</span>
                            <span class="text-caption text-medium-emphasis">Min: {{ kpi?.pallet_bay_scan?.min }}</span>
                            <span class="text-caption text-medium-emphasis">Ave: {{ kpi?.pallet_bay_scan?.avg }}</span>
                            <span class="text-caption text-medium-emphasis">No. of Pallets: {{
                                kpi?.pallet_bay_scan?.count }}</span>
                        </div>
                    </template>

                    <template #header.reservation_bay_scan="{ column }">
                        <div class="d-flex flex-column py-2" style="line-height: 1.2;">
                            <span class="mb-1">{{ column.title }}</span>
                            <span class="text-caption text-medium-emphasis">Max: {{ kpi?.reservation_bay_scan?.max }}</span>
                            <span class="text-caption text-medium-emphasis">Min: {{ kpi?.reservation_bay_scan?.min }}</span>
                            <span class="text-caption text-medium-emphasis">Ave: {{ kpi?.reservation_bay_scan?.avg }}</span>
                            <span class="text-caption text-medium-emphasis">No. of Pallets: {{
                                kpi?.reservation_bay_scan?.count }}</span>
                        </div>
                    </template>

                    <template #item.has_qr="{ item }">
                        <v-chip v-if="item.has_qr" size="small" color="primary" text-color="white">Yes</v-chip>
                        <v-chip v-else size="small" color="secondary" text-color="white">No</v-chip>
                    </template>

                    <template #item.reservation_date="{ item }">
                        <v-chip v-if="item.reservation_date === 'Invalid'" size="small" color="error"
                            text-color="white">Invalid</v-chip>
                        <span v-else class="text-caption text-medium-emphasis">{{ item.reservation_date }}</span>
                    </template>

                    <template #item.pallet_scan_date="{ item }">
                        <v-chip v-if="item.pallet_scan_date === 'N/A'" size="small" color="secondary" variant="tonal">N/A</v-chip>
                        <v-chip v-else-if="item.pallet_scan_date === 'Pending'" size="small" color="warning"
                            text-color="white">Pending</v-chip>
                        <span v-else class="text-caption text-medium-emphasis">{{ item.pallet_scan_date }}</span>
                    </template>

                    <template #item.bay_scan_date="{ item }">
                        <v-chip v-if="item.bay_scan_date === 'N/A'" size="small" color="secondary" variant="tonal">N/A</v-chip>
                        <v-chip v-else-if="item.bay_scan_date === 'Pending'" size="small" color="warning"
                            text-color="white">Pending</v-chip>
                        <span v-else class="text-caption text-medium-emphasis">{{ item.bay_scan_date }}</span>
                    </template>

                    <template #item.reservation_pallet_scan="{ item }">
                        <v-chip v-if="item.reservation_pallet_scan === 'N/A'" size="small" color="secondary" variant="tonal">N/A</v-chip>
                        <v-chip v-else-if="item.reservation_pallet_scan === 'Pending'" size="small" color="warning"
                            text-color="white">Pending</v-chip>
                        <span v-else class="text-caption text-medium-emphasis">{{ item.reservation_pallet_scan }}</span>
                    </template>

                    <template #item.pallet_bay_scan="{ item }">
                        <v-chip v-if="item.pallet_bay_scan === 'N/A'" size="small" color="secondary" variant="tonal">N/A</v-chip>
                        <v-chip v-else-if="item.pallet_bay_scan === 'Pending'" size="small" color="warning"
                            text-color="white">Pending</v-chip>
                        <span v-else class="text-caption text-medium-emphasis">{{ item.pallet_bay_scan }}</span>
                    </template>

                    <template #item.reservation_bay_scan="{ item }">
                        <v-chip v-if="item.reservation_bay_scan === 'N/A'" size="small" color="secondary" variant="tonal">N/A</v-chip>
                        <v-chip v-else-if="item.reservation_bay_scan === 'Pending'" size="small" color="warning"
                            text-color="white">Pending</v-chip>
                        <span v-else class="text-caption text-medium-emphasis">{{ item.reservation_bay_scan }}</span>
                    </template>

                    <template #item.plant_id="{ item }">
                        {{ item.plant_code }}
                    </template>

                    <template #item.batch="{ item }">
                        {{ item.batch }}
                    </template>

                    <template #item.bay_no="{ item }">
                        {{ item.bay_no }}
                    </template>

                    <template #item.status="{ item }">
                        <v-chip v-if="item.status == 'Completed'" size="small" color="primary"
                            style="width: 140px; justify-content: center;" text-color="white">Completed</v-chip>
                        <v-chip v-else-if="item.status == 'N/A'" size="small" color="secondary" variant="tonal"
                            style="width: 140px; justify-content: center;">No QR (N/A)</v-chip>
                        <v-chip v-else-if="item.status == 'Pending Bay Scan'" size="small" color="warning"
                            style="width: 140px; justify-content: center;" text-color="white">Pending Bay Scan</v-chip>
                        <v-chip v-else size="small" color="warning" variant="tonal"
                            style="width: 140px; justify-content: center;">Pending Pallet Scan</v-chip>
                    </template>

                    <template #item.bay_scanned_by="{ item }">
                        <span>{{ item.bay_scanned_by }}</span>
                    </template>

                </VDataTableServer>
            </VCard>
        </v-window-item>
        <v-window-item value="summary">
            <VCard>
                <VCardTitle>
                </VCardTitle>

                <VCardText>
                    <OutboundPerformanceChart :data="summaryChart" />
                </VCardText>
            </VCard>
        </v-window-item>
    </v-window>

    <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event" />
</template>
<style scoped>
.fixed-column-table :deep(th.v-data-table__th--fixed),
.fixed-column-table :deep(td.v-data-table__td--fixed) {
    background-color: #f6f7fb !important;
}

.fixed-column-table :deep(thead.v-data-table__thead) {
    background-color: #f6f7fb !important;
}
</style>
