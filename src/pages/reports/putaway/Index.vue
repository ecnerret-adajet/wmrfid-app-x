<script setup>
import DatePicker from '@/components/DatePicker.vue';
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import { exportExcel, exportSummaryExcel } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import moment from 'moment';
import { ref } from 'vue';
import PutawayChart from './PutawayChart.vue';

import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

const searchValue = ref('');
const datatableRef = ref(null);
const isLoading = ref(false);
const plantsOption = ref([])
const today = moment().format('MMMM D, YYYY');

const toast = ref({
    message: 'Success!',
    color: 'success',
    show: false
});

const filters = reactive({
    created_at: null,
    updated_at: null,
    plant_code: authStore.user?.assigned_plant?.plant_code || null,
    date_filter: null,
    shift_id: null,
    status_type: null,
    transaction_status: null,
    date_from: today,
    date_to: today,
    wrapping_type: 'All',
    weak_pallet_type: 'All',
    qr_tracking: null
});

const activeView = ref('table')

const clearFilters = () => {
    filters.created_at = null;
    filters.updated_at = null;
    filters.plant_code = null;
    filters.date_filter = null;
    filters.shift_id = null;
    filters.status_type = null;
    filters.date_from = today;
    filters.date_to = today;
    filters.wrapping_type = 'rfid'
};

onMounted(() => {
    fetchDropdownData();
})

const shifts = ref([]);
const fetchDropdownData = async () => {
    isLoading.value = true;
    try {
        let endpoint = 'reports/putaway-data-dropdown';

        // Check if filters.plant_code is a valid, non-null value
        if (filters.plant_code) {
            endpoint += `/${filters.plant_code}`;
        }

        const preReqData = await ApiService.get(endpoint);
        const { plants, shifts_dropdown } = preReqData.data;

        plantsOption.value = plants.map(item => ({
            value: item.plant_code,
            title: `${item.plant_code} - ${item.name}`,
            name: item.name
        }));
        shifts.value = shifts_dropdown;
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

        if (activeView.value === 'summary') {
            await exportSummaryExcel({
                data: summaryChart.value,
                filename: 'putaway-summary.xlsx',
            })

            return
        }

        await exportExcel({
            url: `/reports/putaway/export`,
            params: {
                filters: filters
            },
            filename: 'putaway-report.xlsx',
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
        sortBy: [{ key: 'created_at', order: 'desc' }],
        filters: filters,
        search: searchValue.value
    });
};


const baseHeaders = [
    { title: 'PLANT', key: 'plant_id', fixed: true, align: 'start', width: 65, sortable: false },
    { title: 'PHYSICAL ID', key: 'physical_id', fixed: true, width: 90, sortable: false },
    { title: 'BATCH', key: 'batch', fixed: true, width: 120, sortable: false },
    { title: 'TR NO.', key: 'tr_no', fixed: true, width: 120, sortable: false },
    { title: 'TO NO.', key: 'to_no', fixed: true, width: 120, sortable: false },
    { title: 'Status', key: 'status', fixed: true, width: 100, sortable: false },
    // { title: 'Loose Qty', key: 'loose_qty', fixed: true, width: 100, sortable: false },
    { title: 'TR Creation', key: 'tr_creation_date', width: 120, sortable: false },
    { title: 'TO Creation', key: 'to_creation_date', width: 120, sortable: false },
    { title: 'TR Creation-TO Creation', key: 'tr_to_creation', sortable: false },
    { title: 'RFID Wrapping', key: 'rfid_wrapping', width: 120, sortable: false },
    { title: 'TO Creation-RFID Wrapping', key: 'to_creation_rfid_wrapping', sortable: false },
    { title: 'QR Wrapping Date', key: 'wrapping_completion_date', width: 120, sortable: false },
    { title: 'RFID Wrapping-QR Wrapping', key: 'rfid_wrapping_wrapping_completion_date', sortable: false },
    { title: 'QR Putaway Date', key: 'putaway_date', width: 120, sortable: false },
    { title: 'QR Wrapping-Putaway', key: 'qr_wrapping_putaway', sortable: false },
    { title: 'TR Creation-Putaway', key: 'tr_creation_putaway', sortable: false },
    { title: 'Type', key: 'type', fixed: true, width: 100, sortable: false },
    { title: 'With QR', key: 'with_qr', fixed: true, width: 100, sortable: false },
    { title: 'Operator', key: 'operator', sortable: false },
]

// 2. Create the computed headers layer to track totalItems state changes
const headers = computed(() => {
    if (totalItems.value === 0) {
        // Map over headers and safely strip away the fixed constraint parameter mapping
        return baseHeaders.map(({ fixed, ...rest }) => rest)
    }
    return baseHeaders
})

const loading = ref(true);
const serverItems = ref([]);
const totalItems = ref(0);
const itemsPerPage = ref(50);
const page = ref(1);
const sortQuery = ref('-created_at'); // Default sort
const kpi = ref({
    tr_to_creation: { max: null, min: null, avg: null, count: null },
    to_creation_rfid_wrapping: { max: null, min: null, avg: null, count: null },
    rfid_wrapping_putaway: { max: null, min: null, avg: null, count: null },
    tr_creation_putaway: { max: null, min: null, avg: null, count: null },
    rfid_wrapping_wrapping_completion_date: { max: null, min: null, avg: null, count: null },
    qr_wrapping_putaway: { max: null, min: null, avg: null, count: null },
});

const summaryChart = ref(null)

const loadItems = ({ page, itemsPerPage, sortBy }) => {
    loading.value = true
    if (sortBy && sortBy.length > 0) {
        const sort = sortBy[0];  // Assuming single sort field
        sortQuery.value = `${sort.key}`;  // Default ascending order
        if (sort.order === 'desc') {
            sortQuery.value = `-${sort.key}`;  // Prefix with minus for descending order
        }
    } else {
        sortQuery.value = '-created_at';
    }

    ApiService.query('reports/datatable/putaway-report', {
        params: {
            page,
            itemsPerPage,
            sort: sortQuery.value,
            search: searchValue.value,
            filters: filters
        }
    })
        .then((response) => {
            // Extracting structural values wrapped by ResponseHelper::dataAsJsonOnly
            const payload = response.data;
            // 1. Map the global KPIs to your reactive object
            if (payload.kpi && payload.kpi.stages) {
                kpi.value = payload.kpi.stages;
            }

            // 2. Extract standard properties from the paginated Laravel table block
            if (payload.table) {
                serverItems.value = payload.table.data;   // Current page raw line records array
                totalItems.value = payload.table.total;   // Total absolute matched lines for footer
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
    <section class="putaway-filters">
        <div class="d-flex flex-wrap gap-4 align-center justify-center">
            <SearchInput class="flex-grow-1" @update:search="(val) => { searchValue = val; handleSearch(); }" />

        <!-- Plant Filter -->
        <v-select style="max-width: 350px;" class="flex-grow-1 align-center mt-1" label="Filter by Plant"
            density="compact"
            :items="plantsOption.length > 1 ? [{ title: 'All', value: null }, ...plantsOption] : plantsOption"
            v-model="filters.plant_code"
            :rules="[value => value !== undefined || 'Please select an item from the list']">
        </v-select>

        <!-- Wrapping Filter -->
        <v-select style="max-width: 270px;" class="flex-grow-1 align-center mt-1" label="Filter by Wrapping"
            density="compact" :items="[
                { title: 'All', value: null },
                { title: 'RFID', value: 1 },
                { title: 'Manual Wrapping', value: 2 }
            ]" v-model="filters.wrapping_type">
        </v-select>

        <!-- Wrapping Filter -->
        <v-select 
            style="max-width: 270px;" 
            class="flex-grow-1 align-center mt-1" 
            label="Filter by Pallet Condition"
            density="compact" 
            :items="[
                { title: 'All', value: null },
                { title: 'Weak Pallet', value: 1 },
                { title: 'Active Pallet', value: 2 } 
            ]" 
            v-model="filters.weak_pallet_type">
        </v-select>

        <!-- Shifts Filter -->
        <v-select style="max-width: 270px;" class="flex-grow-1 align-center mt-1" label="Filter by Shift"
            density="compact" :items="[{ title: 'All', value: null }, ...shifts]" v-model="filters.shift_id">
        </v-select>

        <!-- Type Filter -->
        <v-select style="max-width: 200px;" class="flex-grow-1 align-center mt-1" label="Filter by Type"
            density="compact" :items="[
                { title: 'All', value: null },
                { title: 'Good', value: 1 },
                { title: 'Empty', value: 2 },
                { title: 'Inline Reject', value: 3 },
                { title: 'Loose', value: 4 },
                // { title: 'No QR', value: 5 },
                // { title: 'With QR', value: 6 }

            ]" v-model="filters.status_type">
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
            <!-- Status Filter -->
            <v-select style="max-width: 200px;" class="flex-grow-1 align-center mt-5" label="Filter by Status"
                density="compact" :items="[
                    { title: 'All', value: null },
                    { title: 'Pending', value: 1 },
                    { title: 'Completed', value: 2 },
                    { title: 'Invalid', value: 3 },
                ]" v-model="filters.transaction_status">
            </v-select>

            <!-- QR Tracking Filter -->
            <v-select style="max-width: 200px;" class="flex-grow-1 align-center mt-5" label="Filter by QR Tracking"
                density="compact" :items="[
                    { title: 'All', value: null },
                    { title: 'With QR', value: 1 },
                    { title: 'Without QR', value: 2 },
                ]" v-model="filters.qr_tracking">
            </v-select>

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
    </section>

    
    
    <v-window v-model="activeView">
        <v-window-item value="table">
            <VCard>
                <VDataTableServer v-model:items-per-page="itemsPerPage" :headers="headers" :items="serverItems"
                    :items-length="totalItems" :loading="loading" :items-per-page-options="[25, 50, 100]" item-value="id" @update:options="loadItems"
                    class="text-no-wrap fixed-column-table">
                    <template #header.physical_id="{ column }">
                        <span>PHYSICAL</span><br />
                        <span>ID</span>
                    </template>
                    <template #header.tr_to_creation="{ column }">
                        <div class="d-flex flex-column py-2" style="line-height: 1.2;">
                            <span class="mb-1">{{ column.title }}</span>
                            <span class="text-caption text-medium-emphasis">Max: {{ kpi?.tr_to_creation?.max }}</span>
                            <span class="text-caption text-medium-emphasis">Min: {{ kpi?.tr_to_creation?.min }}</span>
                            <span class="text-caption text-medium-emphasis">Ave: {{ kpi?.tr_to_creation?.avg }}</span>
                            <span class="text-caption text-medium-emphasis">No. of Pallets: {{
                                kpi?.tr_to_creation?.count }}</span>
                        </div>
                    </template>

                    <template #header.to_creation_rfid_wrapping="{ column }">
                        <div class="d-flex flex-column py-2" style="line-height: 1.2;">
                            <span class="mb-1">{{ column.title }}</span>
                            <span class="text-caption text-medium-emphasis">Max: {{ kpi?.to_creation_rfid_wrapping?.max
                            }}</span>
                            <span class="text-caption text-medium-emphasis">Min: {{ kpi?.to_creation_rfid_wrapping?.min
                            }}</span>
                            <span class="text-caption text-medium-emphasis">Ave: {{ kpi?.to_creation_rfid_wrapping?.avg
                            }}</span>
                            <span class="text-caption text-medium-emphasis">No. of Pallets: {{
                                kpi?.to_creation_rfid_wrapping?.count }}</span>
                        </div>
                    </template>

                    <template #header.rfid_wrapping_wrapping_completion_date="{ column }">
                        <div class="d-flex flex-column py-2" style="line-height: 1.2;">
                            <span class="mb-1">{{ column.title }}</span>
                            <span class="text-caption text-medium-emphasis">Max: {{
                                kpi?.rfid_wrapping_wrapping_completion_date?.max }}</span>
                            <span class="text-caption text-medium-emphasis">Min: {{
                                kpi?.rfid_wrapping_wrapping_completion_date?.min }}</span>
                            <span class="text-caption text-medium-emphasis">Ave: {{
                                kpi?.rfid_wrapping_wrapping_completion_date?.avg }}</span>
                            <span class="text-caption text-medium-emphasis">No. of Pallets: {{
                                kpi?.rfid_wrapping_wrapping_completion_date?.count }}</span>
                        </div>
                    </template>

                    <template #header.tr_creation_putaway="{ column }">
                        <div class="d-flex flex-column py-2" style="line-height: 1.2;">
                            <span class="mb-1">{{ column.title }}</span>
                            <span class="text-caption text-medium-emphasis">Max: {{ kpi?.tr_creation_putaway?.max
                            }}</span>
                            <span class="text-caption text-medium-emphasis">Min: {{ kpi?.tr_creation_putaway?.min
                            }}</span>
                            <span class="text-caption text-medium-emphasis">Ave: {{ kpi?.tr_creation_putaway?.avg
                            }}</span>
                            <span class="text-caption text-medium-emphasis">No. of Pallets: {{
                                kpi?.tr_creation_putaway?.count }}</span>
                        </div>
                    </template>

                    <template #header.qr_wrapping_putaway="{ column }">
                        <div class="d-flex flex-column py-2" style="line-height: 1.2;">
                            <span class="mb-1">{{ column.title }}</span>
                            <span class="text-caption text-medium-emphasis">Max: {{ kpi?.qr_wrapping_putaway?.max
                            }}</span>
                            <span class="text-caption text-medium-emphasis">Min: {{ kpi?.qr_wrapping_putaway?.min
                            }}</span>
                            <span class="text-caption text-medium-emphasis">Ave: {{ kpi?.qr_wrapping_putaway?.avg
                            }}</span>
                            <span class="text-caption text-medium-emphasis">No. of Pallets: {{
                                kpi?.qr_wrapping_putaway?.count }}</span>
                        </div>
                    </template>

                    <template #item.tr_to_creation="{ item }">
                        <v-chip v-if="item.status == 7 || item.status == 5 || item.tr_to_creation === 'Invalid'"
                            size="small" color="error" text-color="white">Invalid</v-chip>
                        <span v-else class="text-caption text-medium-emphasis">{{ item.tr_to_creation }}</span>
                    </template>

                    <template #item.to_creation_rfid_wrapping="{ item }">
                        <v-chip
                            v-if="item.status == 7 || item.status == 5 || item.to_creation_rfid_wrapping === 'Invalid'"
                            size="small" color="error" text-color="white">Invalid</v-chip>
                        <span v-else class="text-caption text-medium-emphasis">{{ item.to_creation_rfid_wrapping
                        }}</span>
                    </template>

                    <template #item.rfid_wrapping_putaway="{ item }">
                        <v-chip v-if="item.status == 7 || item.status == 5 || item.rfid_wrapping_putaway === 'Invalid'"
                            size="small" color="error" text-color="white">Invalid</v-chip>
                        <span v-else class="text-caption text-medium-emphasis">{{ item.rfid_wrapping_putaway }}</span>
                    </template>

                    <template #item.wrapping_completion_date="{ item }">
                        <v-chip
                            v-if="item.status == 7 || item.status == 5 || item.wrapping_completion_date === 'Invalid'"
                            size="small" color="error" text-color="white">Invalid</v-chip>
                        <span v-else class="text-caption text-medium-emphasis">{{ item.wrapping_completion_date
                        }}</span>
                    </template>

                    <template #item.tr_creation_putaway="{ item }">
                        <v-chip v-if="item.status == 7 || item.status == 5 || item.tr_creation_putaway === 'Invalid'"
                            size="small" color="error" text-color="white">Invalid</v-chip>
                        <span v-else class="text-caption text-medium-emphasis">{{ item.tr_creation_putaway }}</span>
                    </template>

                    <template #item.rfid_wrapping_wrapping_completion_date="{ item }">
                        <v-chip
                            v-if="item.status == 7 || item.status == 5 || item.rfid_wrapping_wrapping_completion_date === 'Invalid'"
                            size="small" color="error" text-color="white">Invalid</v-chip>
                        <span v-else class="text-caption text-medium-emphasis">{{
                            item.rfid_wrapping_wrapping_completion_date }}</span>
                    </template>

                    <template #item.rfid_wrapping="{ item }">
                        <v-chip v-if="item.rfid_wrapping === 'Invalid'" size="small" color="error"
                            text-color="white">Invalid</v-chip>
                        <!-- Valid Status State -->
                        <template v-else>
                            <!-- If manually wrapped, wrap inside a tooltip -->
                            <v-tooltip v-if="item.wrapping_scan?.is_manual_wrap" location="top">
                                <template #activator="{ props }">
                                    <span v-bind="props"
                                        class="text-caption text-error font-weight-bold cursor-pointer">
                                        {{ item.rfid_wrapping }}
                                    </span>
                                </template>
                                <span v-if="item.wrapping_scan?.user">Manual Tagged by {{ item.wrapping_scan?.user?.name
                                    }}</span>
                            </v-tooltip>

                            <!-- Standard rendering if NOT manually wrapped -->
                            <span v-else class="text-caption text-medium-emphasis">
                                {{ item.rfid_wrapping }}
                            </span>
                        </template>
                    </template>

                    <template #item.with_qr="{ item }">
                        <div class="d-flex justify-center align-center">
                            <i v-if="item.with_qr" style="font-size: 30px; background-color: green;"
                                class="ri-checkbox-circle-line"></i>
                            <i v-else style="font-size: 30px; background-color: #FF4C51;" class="ri-close-circle-line"></i>
                        </div>
                    </template>

                    <template #item.type="{ item }">
                        <span v-if="item.type === 'Good'" class="text-primary font-weight-bold">
                            Good
                        </span>
                        
                        <!-- Split into 2 lines -->
                        <span v-else-if="item.type === 'Inline Reject'" class="text-error font-weight-bold d-block line-height-tight">
                            Inline<br>Reject
                        </span>
                        
                        <span v-else-if="item.type === 'Empty'" class="text-secondary font-weight-bold">
                            Empty
                        </span>
                        <span v-else-if="item.type === 'Loose'" class="text-warning font-weight-bold">
                            Loose
                        </span>
                    </template>

                    <template #item.putaway_date="{ item }">
                        <v-chip v-if="item.putaway_date === 'Invalid'" size="small" color="error"
                            text-color="white">Invalid</v-chip>
                        <span v-else class="text-caption text-medium-emphasis">{{ item.putaway_date }}</span>
                    </template>

                    <template #item.qr_wrapping_putaway="{ item }">
                        <v-chip v-if="item.status == 7 || item.status == 5 || item.qr_wrapping_putaway === 'Invalid'"
                            size="small" color="error" text-color="white">Invalid</v-chip>
                        <span v-else class="text-caption text-medium-emphasis">{{ item.qr_wrapping_putaway }}</span>
                    </template>

                    <template #item.physical_id="{ item }">
                        <template v-if="item.weak_pallet_log">
                            <!-- If manually wrapped, wrap inside a tooltip -->
                            <v-tooltip v-if="item.weak_pallet_log" location="top">
                                <template #activator="{ props }">
                                    <span v-bind="props"
                                        class="text-caption text-error font-weight-bold cursor-pointer">
                                        {{ item.physical_id }}
                                    </span>
                                </template>
                                <span v-if="item.weak_pallet_log?.user">Weak Pallet Tagged by {{ item.weak_pallet_log?.user?.name
                                    }}</span>
                            </v-tooltip>

                            <!-- Standard rendering if NOT manually wrapped -->
                            <span v-else class="text-caption text-medium-emphasis">
                                {{ item.rfid_wrapping }}
                            </span>
                        </template>
                        <span v-else>{{ item.physical_id }}</span>

                    </template>

                    <template #item.plant_id="{ item }">
                        {{ item.plant_code }}
                    </template>

                    <template #item.batch="{ item }">
                        {{ item.batch }}
                    </template>

                    <template #item.created_at="{ item }">
                        {{ item.created_at ? Moment(item.created_at).format('MMMM D, YYYY') : '' }}
                    </template>

                    <template #item.updated_at="{ item }">
                        {{ item.updated_at ? Moment(item.updated_at).format('MMMM D, YYYY') : '' }}
                    </template>

                    <template #item.status="{ item }">
                        <v-chip v-if="item.status == 1" size="small" color="warning"
                            style="width: 100px; justify-content: center;" text-color="white">Pending</v-chip>
                        <v-chip v-else-if="item.status == 2" size="small" color="info"
                            style="width: 100px; justify-content: center;" text-color="white">For Wrapping</v-chip>
                        <v-chip v-else-if="item.status == 3" size="small" color="success"
                            style="width: 100px; justify-content: center;" text-color="white">For Putaway</v-chip>
                        <v-chip v-else-if="item.status == 4" size="small" color="primary"
                            style="width: 100px; justify-content: center;" text-color="white">Completed</v-chip>
                        <v-chip v-else-if="item.status == 7 || item.status == 5" size="small" color="error"
                            style="width: 100px; justify-content: center;" text-color="white">Invalid</v-chip>
                    </template>

                    <template #item.operator="{ item }">
                        <span>{{ item.operator }}</span>
                    </template>

                </VDataTableServer>
            </VCard>
        </v-window-item>
        <v-window-item value="summary">
            <VCard>
                <VCardTitle>
                </VCardTitle>

                <VCardText>
                    <PutawayChart :data="summaryChart" />
                </VCardText>
            </VCard>
        </v-window-item>
    </v-window>

    <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event" />
</template>
<style scoped>
.putaway-filters {
    position: sticky;
    top: 0px;
    z-index: 5;
    padding-block: 16px;
    background-color: rgb(var(--v-theme-background));
}

/* 2. Keeps the background solid on pinned elements so text doesn't bleed during scroll gaps */
.fixed-column-table :deep(th.v-data-table__th--fixed),
.fixed-column-table :deep(td.v-data-table__td--fixed) {
    background-color: #f6f7fb !important;
    /* Matches your light header card styling background */
}

.fixed-column-table :deep(thead.v-data-table__thead) {
    background-color: #f6f7fb !important;
}
</style>
