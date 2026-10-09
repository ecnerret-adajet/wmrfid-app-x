<script setup>
import DatePicker from '@/components/DatePicker.vue';
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import { exportExcel } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import { useAuthStore } from '@/stores/auth';
import { fumigationItemStatusColor } from '@/utils/fumigation';
import moment from 'moment';
import FumigationChart from './FumigationChart.vue';

const authStore = useAuthStore();

const searchValue = ref('');
const isLoading = ref(false);
const plantsOption = ref([]);
const today = moment().format('MMMM D, YYYY');
const startOfMonth = moment().startOf('month').format('MMMM D, YYYY');

const toast = ref({
    message: 'Success!',
    color: 'success',
    show: false
});

const filters = reactive({
    plant_code: authStore.user?.assigned_plant?.plant_code || null,
    requester_type: null,
    status: null,
    sensitive_only: false,
    delivery_document: null,
    date_from: startOfMonth,
    date_to: today,
});

const sourceOptions = [
    { title: 'All', value: null },
    { title: 'c/o Sales', value: 'sales' },
    { title: 'c/o ALC', value: 'alc' },
];

// Pallet stage (fumigation_items.status)
const stageOptions = [
    { title: 'All', value: null },
    { title: 'For Transfer', value: 'for_transfer' },
    { title: 'In Chamber', value: 'fumigated' },
    { title: 'Aeration', value: 'aeration' },
    { title: 'For Release', value: 'for_release' },
    { title: 'Completed', value: 'completed' },
    { title: 'Removed', value: 'removed' },
    { title: 'Cancelled', value: 'cancelled' },
];

const activeView = ref('table');

onMounted(() => {
    fetchDropdownData();
});

const fetchDropdownData = async () => {
    isLoading.value = true;
    try {
        const { data } = await ApiService.get('reports/putaway-data-dropdown');

        plantsOption.value = data.plants.map(item => ({
            value: item.plant_code,
            title: `${item.plant_code} - ${item.name}`,
        }));
    } catch (error) {
        console.error('Error fetching data:', error);
    } finally {
        isLoading.value = false;
    }
};

const validateDateRange = () => {
    if (!filters.date_from || !filters.date_to) {
        toast.value = { message: 'Date From and Date To are required.', color: 'error', show: true };
        return false;
    }

    if (moment(filters.date_to, 'MMMM D, YYYY').isBefore(moment(filters.date_from, 'MMMM D, YYYY'), 'day')) {
        toast.value = { message: 'Date To must be the same as or later than Date From.', color: 'error', show: true };
        return false;
    }

    return true;
};

const exportLoading = ref(false);
const exportData = async () => {
    if (!validateDateRange()) {
        return;
    }

    try {
        exportLoading.value = true;
        await exportExcel({
            url: '/reports/fumigation/export',
            params: { search: searchValue.value, filters },
            filename: 'fumigation-report.xlsx',
        });
    } catch (error) {
        toast.value = { message: 'Export failed.', color: 'error', show: true };
    } finally {
        exportLoading.value = false;
    }
};

const handleSearch = () => {
    if (!validateDateRange()) {
        return;
    }

    page.value = 1;
    loadItems({ page: 1, itemsPerPage: itemsPerPage.value });
};

// Duration columns carry the KPI (max/min/avg/count) in their header
const kpiKeys = ['tr_to_chamber', 'to_chamber_putaway', 'fumigation_duration', 'aeration_duration', 'total_duration'];

const baseHeaders = [
    { title: 'PLANT', key: 'plant_code', fixed: true, width: 65, sortable: false },
    { title: 'PHYSICAL ID', key: 'physical_id', fixed: true, width: 90, sortable: false },
    { title: 'BATCH', key: 'batch', fixed: true, width: 120, sortable: false },
    { title: 'Request No.', key: 'request_no', sortable: false },
    { title: 'Stage', key: 'stage', sortable: false },
    { title: 'Source', key: 'source', sortable: false },
    { title: 'DO', key: 'delivery_document', sortable: false },
    { title: 'Sold-to', key: 'sold_to', sortable: false },
    { title: 'Commodity', key: 'commodity', sortable: false },
    { title: 'Production Date', key: 'production_date', sortable: false },
    { title: 'Ticket Range', key: 'ticket_range', sortable: false },
    { title: 'Encoded', key: 'encoded_at', sortable: false },

    { title: 'Chamber TR', key: 'chamber_tr_no', sortable: false },
    { title: 'Chamber TR Created', key: 'chamber_tr_created_at', sortable: false },
    { title: 'Chamber Request Scan', key: 'chamber_request_scan_at', sortable: false },
    { title: 'Chamber TO', key: 'chamber_to_no', sortable: false },
    { title: 'Chamber TO Created', key: 'chamber_to_created_at', sortable: false },
    { title: 'TR-TO (Chamber)', key: 'tr_to_chamber', sortable: false },
    { title: 'Putaway into Chamber', key: 'chamber_putaway_at', sortable: false },
    { title: 'TO-In Chamber', key: 'to_chamber_putaway', sortable: false },
    { title: 'Chamber Bin', key: 'chamber_bin', sortable: false },

    { title: 'Fumigation Date', key: 'fumigation_date', sortable: false },
    { title: 'Aeration Date', key: 'aeration_date', sortable: false },
    { title: 'Actual Start', key: 'fumigation_started_at', sortable: false },
    { title: 'Aeration Start', key: 'aeration_started_at', sortable: false },
    { title: 'Fumigation Duration', key: 'fumigation_duration', sortable: false },
    { title: 'Early Termination', key: 'early_terminated', sortable: false },
    { title: 'Released', key: 'released_at', sortable: false },

    { title: 'FG TR', key: 'fg_tr_no', sortable: false },
    { title: 'FG TR Created', key: 'fg_tr_created_at', sortable: false },
    { title: 'FG Request Scan', key: 'fg_request_scan_at', sortable: false },
    { title: 'FG TO', key: 'fg_to_no', sortable: false },
    { title: 'FG TO Created', key: 'fg_to_created_at', sortable: false },
    { title: 'Putaway to FG', key: 'fg_putaway_at', sortable: false },
    { title: 'FG Bin', key: 'fg_bin', sortable: false },
    { title: 'Aeration Duration', key: 'aeration_duration', sortable: false },
    { title: 'Request-Back to FG', key: 'total_duration', sortable: false },
];

const headers = computed(() => (totalItems.value === 0
    ? baseHeaders.map(({ fixed, ...rest }) => rest)
    : baseHeaders));

// "time" cells that also show who did it
const actorColumns = {
    encoded_at: 'encoded_by',
    chamber_request_scan_at: 'chamber_request_scan_by',
    chamber_to_created_at: 'chamber_approved_by',
    chamber_putaway_at: 'chamber_putaway_by',
    released_at: 'released_by',
    fg_request_scan_at: 'fg_request_scan_by',
    fg_to_created_at: 'fg_approved_by',
    fg_putaway_at: 'fg_putaway_by',
};

const loading = ref(true);
const serverItems = ref([]);
const totalItems = ref(0);
const itemsPerPage = ref(50);
const page = ref(1);
const kpi = ref(Object.fromEntries(kpiKeys.map(key => [key, { max: null, min: null, avg: null, count: null }])));
const summaryChart = ref([]);

const loadItems = ({ page: requestedPage, itemsPerPage: perPage }) => {
    loading.value = true;

    ApiService.query('reports/datatable/fumigation-report', {
        params: {
            page: requestedPage,
            itemsPerPage: perPage,
            search: searchValue.value,
            filters,
        }
    })
        .then(({ data: payload }) => {
            if (payload.kpi?.stages) {
                kpi.value = payload.kpi.stages;
            }

            if (payload.table) {
                serverItems.value = payload.table.data;
                totalItems.value = payload.table.total;
            }

            summaryChart.value = payload.summary_chart ?? [];
        })
        .catch(error => {
            console.error(error);
            toast.value = { message: error.response?.data?.message ?? 'Failed to load the fumigation report.', color: 'error', show: true };
        })
        .finally(() => {
            loading.value = false;
        });
};
</script>

<template>
    <section class="fumigation-report-filters">
        <div class="d-flex flex-wrap gap-4 align-center justify-center">
            <SearchInput class="flex-grow-1" placeholder="Search physical ID, batch, request, TR/TO, DO ..."
                @update:search="(val) => { searchValue = val; handleSearch(); }" />

            <v-select style="max-width: 350px;" class="flex-grow-1 align-center mt-1" label="Filter by Plant"
                density="compact"
                :items="plantsOption.length > 1 ? [{ title: 'All', value: null }, ...plantsOption] : plantsOption"
                v-model="filters.plant_code" />

            <v-select style="max-width: 200px;" class="flex-grow-1 align-center mt-1" label="Filter by Source"
                density="compact" :items="sourceOptions" v-model="filters.requester_type" />

            <v-select style="max-width: 200px;" class="flex-grow-1 align-center mt-1" label="Filter by Stage"
                density="compact" :items="stageOptions" v-model="filters.status" />

            <v-btn :loading="exportLoading" class="d-flex align-center" prepend-icon="ri-download-line" @click="exportData">
                Export
            </v-btn>
            <v-btn class="d-flex align-center" prepend-icon="ri-search-eye-line" @click="handleSearch">
                Search
            </v-btn>
        </div>

        <div class="d-flex flex-wrap align-end mb-4 gap-4">
            <v-text-field style="max-width: 200px;" class="flex-grow-1" label="DO No." density="compact" clearable
                hide-details v-model="filters.delivery_document" @keyup.enter="handleSearch" />

            <div style="max-width: 200px;" class="flex-grow-1">
                <label class="text-caption">Encoded From</label>
                <DatePicker v-model="filters.date_from" />
            </div>

            <div style="max-width: 200px;" class="flex-grow-1">
                <label class="text-caption">Encoded To</label>
                <DatePicker v-model="filters.date_to" />
            </div>

            <v-switch v-model="filters.sensitive_only" color="primary" density="compact" hide-details
                label="Sensitive customers only" />
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
                <VDataTableServer v-model:items-per-page="itemsPerPage" v-model:page="page" :headers="headers"
                    :items="serverItems" :items-length="totalItems" :loading="loading"
                    :items-per-page-options="[25, 50, 100]" item-value="id" @update:options="loadItems"
                    class="text-no-wrap fixed-column-table">

                    <template v-for="key in kpiKeys" :key="`kpi-${key}`" #[`header.${key}`]="{ column }">
                        <div class="d-flex flex-column py-2" style="line-height: 1.2;">
                            <span class="mb-1">{{ column.title }}</span>
                            <span class="text-caption text-medium-emphasis">Max: {{ kpi?.[key]?.max }}</span>
                            <span class="text-caption text-medium-emphasis">Min: {{ kpi?.[key]?.min }}</span>
                            <span class="text-caption text-medium-emphasis">Ave: {{ kpi?.[key]?.avg }}</span>
                            <span class="text-caption text-medium-emphasis">No. of Pallets: {{ kpi?.[key]?.count }}</span>
                        </div>
                    </template>

                    <template v-for="key in kpiKeys" :key="`cell-${key}`" #[`item.${key}`]="{ item }">
                        <span class="text-caption text-medium-emphasis">{{ item[key] }}</span>
                    </template>

                    <template v-for="(actorKey, key) in actorColumns" :key="`actor-${key}`" #[`item.${key}`]="{ item }">
                        <div class="py-1" style="line-height: 1.2;">
                            <div>{{ item[key] }}</div>
                            <div v-if="item[actorKey] && item[actorKey] !== '-'" class="text-caption text-medium-emphasis">
                                {{ item[actorKey] }}
                            </div>
                        </div>
                    </template>

                    <template #header.physical_id>
                        <span>PHYSICAL</span><br />
                        <span>ID</span>
                    </template>

                    <template #item.stage="{ item }">
                        <v-chip size="small" :color="fumigationItemStatusColor(item.stage)">
                            {{ item.stage_label }}
                        </v-chip>
                    </template>

                    <template #item.source="{ item }">
                        <span :class="item.requester_type === 'sales' ? 'text-primary' : 'text-secondary'" class="font-weight-bold">
                            {{ item.source }}
                        </span>
                        <div class="text-caption text-medium-emphasis">Reserved to DO: {{ item.reserved_to_do }}</div>
                    </template>

                    <template #item.sold_to="{ item }">
                        <span>{{ item.sold_to }}</span>
                        <v-chip v-if="item.is_sensitive" size="x-small" color="error" class="ms-2">Sensitive</v-chip>
                    </template>

                    <template #item.chamber_tr_no="{ item }">
                        <div class="py-1" style="line-height: 1.2;">
                            <div>{{ item.chamber_tr_no }}</div>
                            <div v-if="item.chamber_tr_status !== '-'" class="text-caption text-medium-emphasis">{{ item.chamber_tr_status }}</div>
                        </div>
                    </template>

                    <template #item.fg_tr_no="{ item }">
                        <div class="py-1" style="line-height: 1.2;">
                            <div>{{ item.fg_tr_no }}</div>
                            <div v-if="item.fg_tr_status !== '-'" class="text-caption text-medium-emphasis">{{ item.fg_tr_status }}</div>
                        </div>
                    </template>

                    <template #item.early_terminated="{ item }">
                        <div v-if="item.early_terminated" class="py-1" style="line-height: 1.2; white-space: normal; min-width: 220px;">
                            <v-chip size="x-small" color="error" class="mb-1">Early Terminated</v-chip>
                            <div class="text-caption">{{ item.early_termination_reason }}</div>
                            <div class="text-caption text-medium-emphasis">
                                Requested by {{ item.early_termination_requested_by }} &middot;
                                Approved by {{ item.early_termination_approved_by }} ({{ item.early_termination_approved_at }})
                            </div>
                        </div>
                        <span v-else>-</span>
                    </template>
                </VDataTableServer>
            </VCard>
        </v-window-item>

        <v-window-item value="summary">
            <FumigationChart :data="summaryChart" />
        </v-window-item>
    </v-window>

    <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event" />
</template>

<style scoped>
.fumigation-report-filters {
    position: sticky;
    top: 0px;
    z-index: 5;
    padding-block: 16px;
    background-color: rgb(var(--v-theme-background));
}

.fixed-column-table :deep(th.v-data-table__th--fixed),
.fixed-column-table :deep(td.v-data-table__td--fixed) {
    background-color: #f6f7fb !important;
}

.fixed-column-table :deep(thead.v-data-table__thead) {
    background-color: #f6f7fb !important;
}
</style>
