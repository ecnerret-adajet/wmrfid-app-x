<script setup>
import DatePicker from '@/components/DatePicker.vue';
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import { numberWithComma } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import { useAuthStore } from '@/stores/auth';
import Moment from 'moment';
import { computed, onMounted, reactive, ref } from 'vue';

const authStore = useAuthStore();

const searchValue = ref('');
const isLoading = ref(false);
const plantsOption = ref([])
const requestTypes = ref([]);

const summary_count = reactive({
    pending: 0,
    approved: 0,
    rejected: 0,
    total_requests: 0,
})

const toast = ref({
    message: 'Success!',
    color: 'success',
    show: false
});

const filters = reactive({
    created_at: null,
    updated_at: null,
    plant_code: authStore.user?.assigned_plant?.plant_code || null,
    date_from: Moment().subtract(1, 'months').format('YYYY-MM-DD'),
    date_to: Moment().format('YYYY-MM-DD'),
    status_type: 2,
    request_type: null,
});

const selectedKpiStatus = ref(filters.status_type);

onMounted(() => {
    fetchDropdownData();
})


const fetchDropdownData = async () => {
    isLoading.value = true;
    try {
        let endpoint = 'application-requests/get-data-dropdown';

        // Check if filters.plant_code is a valid, non-null value
        if (filters.plant_code) {
            endpoint += `/${filters.plant_code}`;
        }

        const preReqData = await ApiService.get(endpoint);
        const { plants, types } = preReqData.data;

        plantsOption.value = plants.map(item => ({
            value: item.plant_code,
            title: `${item.plant_code} - ${item.name}`,
            name: item.name
        }));

        requestTypes.value = types.map(item => ({
            value: item.id,
            title: item.name,
            name: item.name
        }));
    } catch (error) {
        console.error('Error fetching data:', error);
    } finally {
        isLoading.value = false;
    }
};

const selectedPlant = computed(() => {
    if (!filters.plant_code) return null;
    return plantsOption.value.find(plant => plant.value === filters.plant_code) || null;
});

const handleSearch = () => {
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{ key: 'created_at', order: 'desc' }],
        filters: filters,
        search: searchValue.value
    });
};

const processingKpis = computed(() => {
    const cards = [
        {
            label: 'Pending for Approval',
            value: summary_count.pending,
            statusType: 2,
            caption: 'Submitted requests pending for approval',
            color: 'warning',
            icon: 'ri-time-line',
        },
        {
            label: 'Approved Requests',
            value: summary_count.approved,
            statusType: 1,
            caption: 'Successfully validated and approved requests',
            color: 'primary',
            icon: 'ri-checkbox-circle-line',
        },
        {
            label: 'Rejected Requests',
            value: summary_count.rejected,
            statusType: 3,
            caption: 'Requests that have been rejected',
            color: 'error',
            icon: 'ri-close-circle-line',
        },
        {
            label: 'Total Requests',
            value: summary_count.total_requests,
            statusType: null,
            caption: 'Total number of service requests in the system',
            color: 'info',
            icon: 'ri-file-list-3-line',
        },

    ];

    return {
        cards,
        summary: {
            totalDoItems: summary_count.pending + summary_count.approved + summary_count.rejected,
        },
    };
});

const baseHeaders = [
    { title: 'TRANSACTION NO.', key: 'transaction_number', sortable: false },
    { title: 'PLANT', key: 'plant_id', align: 'start', sortable: false },
    { title: 'TYPE', key: 'type',  sortable: false, align: 'center' },
    { title: 'REQUESTED BY', key: 'requested_by', sortable: false },
    { title: 'DATE REQUESTED', key: 'created_at', sortable: false },
    { title: 'Status', key: 'status_id', sortable: false, align: 'center' },
    { title: 'Approved By', key: 'approved_by', sortable: false, align: 'center', width: '220px' },
    { title: 'Date Approved', key: 'dated_approved', sortable: false, align: 'center' },
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
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref('-created_at'); // Default sort


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

    ApiService.query('reports/service-requests', {
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
            if (payload.table?.original) {
                serverItems.value = payload.table?.original?.data;   // Current page raw line records array
                totalItems.value = payload.table?.original?.total;   // Total absolute matched lines for footer
                summary_count.pending = payload.table?.original?.status_summary?.pending || 0;
                summary_count.approved = payload.table?.original?.status_summary?.approved || 0;
                summary_count.rejected = payload.table?.original?.status_summary?.rejected || 0;
                summary_count.total_requests = payload.table?.original?.status_summary?.total || 0;
            }

            loading.value = false;
        })
        .catch((error) => {
            console.log(error);
        });
}

const handleKpiClick = (kpi) => {
    selectedKpiStatus.value = kpi.statusType;
    filters.status_type = kpi.statusType;
    page.value = 1;
};

function removeLeadingZeros(value) {
    if (!value) return '';
    return value.replace(/^0+/, '');
}

</script>

<template>
    <div class="d-flex flex-wrap gap-4 align-center justify-center">
        <SearchInput
            placeholder="Search by Transaction No., Plant, Type, Requested By"
            class="flex-grow-1"
            @update:search="searchValue = $event"
        />
        <div style="max-width: 200px; margin-top: -20px" class="flex-grow-1">
            <label>Date From</label>
            <DatePicker v-model="filters.date_from" />
        </div>

        <div style="max-width: 200px; margin-top: -20px" class="flex-grow-1 ">
            <label>Date To</label>
            <DatePicker v-model="filters.date_to" />
        </div>

        <v-select style="max-width: 250px;" class="flex-grow-1 align-center mt-1" label="Filter by Request Type"
            density="compact" :items="requestTypes.length > 1 ? [{ title: 'All', value: null }, ...requestTypes] : requestTypes"
            v-model="filters.request_type"
            :rules="[value => value !== undefined || 'Please select an item from the list']">
        </v-select>

        <v-select style="max-width: 350px;" class="flex-grow-1 align-center mt-1" label="Filter by Plant"
            density="compact"
            :items="plantsOption.length > 1 ? [{ title: 'All', value: null }, ...plantsOption] : plantsOption"
            v-model="filters.plant_code"
            :rules="[value => value !== undefined || 'Please select an item from the list']">
        </v-select>

        <v-btn class="d-flex align-center" prepend-icon="ri-search-eye-line" @click="handleSearch">
            <template #prepend>
                <v-icon color="white"></v-icon>
            </template>
            Search
        </v-btn>
    </div>

    <VRow class="processing-kpis" aria-live="polite">
        <VCol
            v-for="(kpi, kpiIndex) in processingKpis.cards"
            :key="kpi.label"
            cols="12"
            sm="6"
            lg="3"
        >
            <v-card class="processing-kpi-card h-100 cursor-pointer processing-kpi-card-hover"
                :class="[
                    `processing-kpi-card--${kpi.color}`,
                    selectedKpiStatus === kpi.statusType ? 'processing-kpi-card--selected' : '',
                ]"
                @click="handleKpiClick(kpi)"
                variant="tonal"
            >
                <div class="d-flex align-start justify-space-between ga-3">
                    <div>
                        <div class="text-body-2 text-medium-emphasis">{{ kpi.label }}</div>
                        <div class="text-h4 font-weight-bold mt-1">{{ numberWithComma(kpi.value) }}</div>
                        <div class="text-caption text-medium-emphasis mt-1">{{ kpi.caption }}</div>
                    </div>
                    <v-icon size="28" :color="kpi.color">{{ kpi.icon }}</v-icon>
                </div>
            </v-card>
        </VCol>
    </VRow>
    
    <VCard>
        <VDataTableServer v-model:items-per-page="itemsPerPage" :items-per-page-options="[10, 25, 50, 100]" :headers="headers" :items="serverItems"
            :items-length="totalItems" :loading="loading" item-value="id" @update:options="loadItems"
            class="text-no-wrap fixed-column-table">

              <template #item.plant_id="{ item }">
                <span class="font-weight-bold">{{ item.plant?.plant_code }}</span><br />
                <span v-if="item.plant" class="text-subtitle-1">{{ item.plant?.name }}</span>
            </template>

            <template #item.material="{ item }">
                <span class="font-weight-bold">{{ item.material?.bu_material }}</span><br />
                <span v-if="item.material" class="text-subtitle-1">{{ item.material?.description }}</span>
            </template>

              <template #item.type="{ item }">
                <div v-if="item.type === 'Batch Exception'" class="py-2">
                    <span class="font-weight-bold">{{ item.type }}</span><br />
                    <span class="text-subtitle-1">
                        {{ item.application_requestable?.exception_type === 'within_age_requirement' ? 'Within Age Requirement' : 'Outside Age Requirement' }}
                    </span>
                </div>
                <div v-else-if="item.type === 'Putaway Exception'" class="py-2">
                    <span class="font-weight-bold">{{ item.type }}</span><br />
                    <span class="text-subtitle-1">
                        {{ item.application_requestable?.reason }}
                    </span>
                </div>
            </template>

            <template #item.requested_by="{ item }">
                <span>{{ item.requester?.name }}</span><br />
            </template>

            <template #item.mfg_date="{ item }">
                {{ item.mfg_date ? Moment(item.mfg_date).format('MMM D, YYYY') : '' }}
            </template>
    
            <template #item.created_at="{ item }">
                {{ item.created_at ? Moment(item.created_at).format('MMMM D, YYYY') : '' }}
            </template>

            <template #item.updated_at="{ item }">
                {{ item.updated_at ? Moment(item.updated_at).format('MMMM D, YYYY') : '' }}
            </template>

            <template #item.approved_by="{ item }">
                <template v-if="item.type === 'Batch Exception' || item.type === 'Putaway Exception'">
                    <div class="approved-by-cell mx-auto">
                        <span class="font-weight-bold d-block">{{ item.approver?.name }}</span>
                        <span v-if="item.approver_remarks" class="text-subtitle-1 approved-by-remarks d-block">{{ item.approver_remarks }}</span>
                    </div>
                </template>
            </template>

            <template #item.dated_approved="{ item }">
                {{ item.approved_at ? Moment(item.approved_at).format('MM/DD/YY h:mm A') : '' }}
            </template>

            <template #item.status_id="{ item }">
                <v-chip v-if="item.status_id == 2" size="small" color="warning"
                    style="width: 100px; justify-content: center;" text-color="white">For Approval</v-chip>
                <v-chip v-else-if="item.status_id == 1" size="small" color="primary"
                    style="width: 100px; justify-content: center;" text-color="white">Approved</v-chip>
                <v-chip v-else-if="item.status_id == 3" size="small" color="error"
                    style="width: 100px; justify-content: center;" text-color="white">Rejected</v-chip>
                <v-chip v-else style="width: 100px; justify-content: center;" text-color="white" size="small" color="secondary">
                    Cancelled
                </v-chip>
            </template>
            
        </VDataTableServer>
    </VCard>

    <Toast :show="toast.show" :message="toast.message" />
</template>
<style scoped>

.processing-summary-banner {
    background-color: rgb(var(--v-theme-surface));
    border: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.processing-kpis {
    margin-top: 1px;
    margin-bottom: 2px;
}

.processing-kpi-card-hover {
    transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.processing-kpi-card-hover:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
}

.processing-kpi-card {
    padding: 18px;
    border-left: 5px solid currentColor;
}

.processing-kpi-card--primary {
    color: rgb(var(--v-theme-primary));
}

.processing-kpi-card--success {
    color: rgb(var(--v-theme-success));
}

.processing-kpi-card--warning {
    color: rgb(var(--v-theme-warning));
}

.processing-kpi-card--secondary {
    color: rgb(var(--v-theme-secondary));
}

.processing-kpi-card--error {
    color: rgb(var(--v-theme-error));
}

.processing-kpi-card--info {
    color: rgb(var(--v-theme-info));
}

.processing-kpi-card--selected {
    border: 2px solid rgb(var(--v-theme-primary));
    box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.14), 0 8px 22px rgba(0, 0, 0, 0.08);
    background-color: rgba(var(--v-theme-primary), 0.08);
    transform: translateY(-1px);
}

.processing-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: center;
    margin: 16px 0 8px;
    color: rgba(var(--v-theme-on-surface), 0.7);
    font-size: 0.875rem;
}

.processing-legend__title {
    font-weight: 600;
    color: rgba(var(--v-theme-on-surface), 0.9);
}

.processing-legend__item {
    display: inline-flex;
    align-items: center;
    gap: 5px;
}

.processing-chip {
    min-width: 120px;
    justify-content: center;
}

.reserved-quantity-chip:not(.v-chip--disabled) {
    cursor: pointer;
    transition: transform 160ms ease, box-shadow 160ms ease;
}

.reserved-quantity-chip:not(.v-chip--disabled):hover {
    transform: translateY(-2px);
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.12);
}

.fixed-column-table :deep(.processing-row--now td) {
    background-color: rgba(var(--v-theme-warning), 0.08) !important;
    border-left: 4px solid rgb(var(--v-theme-warning));
}

.fixed-column-table :deep(.processing-row--processed) {
    color: rgba(var(--v-theme-on-surface), 0.62);
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
