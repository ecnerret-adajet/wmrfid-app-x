<script setup>
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import { numberWithComma } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import { useAuthStore } from '@/stores/auth';
import { computed, onMounted, reactive, ref } from 'vue';

const authStore = useAuthStore();

const searchValue = ref('');
const isLoading = ref(false);
const plantsOption = ref([])
const summary_count = reactive({
    needs_processing: 0,
    partially_processed: 0,
    pending: 0,
    total_pending: 0,
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
    date_filter: null,
    status_type: 1,
});

const selectedKpiStatus = ref(filters.status_type);

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
        const { plants } = preReqData.data;

        plantsOption.value = plants.map(item => ({
            value: item.plant_code,
            title: `${item.plant_code} - ${item.name}`,
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

const isProcessed = (item) => {
    const processedValue = item.is_processed ?? item.processed;

    return processedValue === true
        || processedValue === 1
        || processedValue === '1'
        || item.processed_at
        || String(item.processing_status || '').toLowerCase() === 'processed';
};

// Added check for partially processed items
const isPartiallyProcessed = (item) => {
    const partialValue = item.is_partially_processed ?? item.partially_processed;

    return partialValue === true
        || partialValue === 1
        || partialValue === '1'
        || String(item.processing_status || '').toLowerCase() === 'partially_processed'
        || String(item.processing_status || '').toLowerCase() === 'partial';
};

const getProcessingState = (item) => {
    if (isProcessed(item)) return 'processed';
    if (isPartiallyProcessed(item)) return 'partially_processed';
    
    // Updated 'now' to match the 'needs_processing' string key
    if (item.should_be_processed_now === true || item.should_be_processed_now === 1 || item.should_be_processed_now === '1') {
        return 'needs_processing';
    }

    return 'pending';
};

const processingState = (item) => ({
    partially_processed: {
        label: 'Partially Processed',
        color: 'warning', // Changed color to warning
        icon: 'ri-flashlight-line', // Adjust icon if you want it distinct from error
    },
    pending: {
        label: 'Pending',
        color: 'secondary',
        icon: 'ri-time-line',
    },
    needs_processing: {
        label: 'Needs Processing',
        color: 'error',
        icon: 'ri-flashlight-line',
    },
}[getProcessingState(item)]);

const processingRowProps = ({ item }) => ({
    class: `processing-row--${getProcessingState(item)}`,
});

const processingKpis = computed(() => {
    const cards = [
        {
            label: 'Needs processing',
            value: summary_count.needs_processing,
            statusType: 1,
            caption: 'Action required for batch & pallet assignment',
            color: 'error',
            icon: 'ri-flashlight-line',
        },
        {
            label: 'Partially Processed',
            value: summary_count.partially_processed,
            statusType: 2,
            caption: 'Partially assigned batch and pallet',
            color: 'warning',
            icon: 'ri-flashlight-line',
        },
        {
            label: 'Pending for processing',
            value: summary_count.pending,
            statusType: 3,
            caption: 'Pending batch and pallet assignment',
            color: 'secondary',
            icon: 'ri-time-line',
        },
        {
            label: 'Total Open DO Items',
            value: summary_count.total_pending,
            statusType: 4,
            caption: 'Total pending delivery order items for processing',
            color: 'info',
            icon: 'ri-file-list-line',
        },

    ];

    return {
        cards,
        summary: {
            totalDoItems: summary_count.needs_processing + summary_count.partially_processed + summary_count.pending,
        },
    };
});

const baseHeaders = [
    { title: 'PLANT', key: 'plant_id', align: 'start', sortable: false },
    { title: 'SLOC', key: 'storage_location', align: 'start', sortable: false },
    { title: 'Shipment', key: 'shipment_number', align: 'start', sortable: false },
    { title: 'Delivery Order', key: 'ref_no',  sortable: false },
    { title: 'Item #', key: 'item_number', sortable: false },
    { title: 'MATERIAL', key: 'material', sortable: false },
    { title: 'Qty', key: 'quantity', sortable: false },
    { title: 'Reserved Qty', key: 'reserved_quantity', sortable: false },
    { title: 'Status', key: 'status', sortable: false, align: 'center' },
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
const reservedPalletDialog = ref(false);
const selectedReservedPallets = ref([]);
const reservedPalletHeaders = [
    { title: 'ITEM #', key: 'item_number', sortable: false },
    { title: 'PHYSICAL ID', key: 'physical_id', sortable: false },
    { title: 'MATERIAL', key: 'material', sortable: false },
    { title: 'BATCH', key: 'batch', sortable: false },
    { title: 'QUANTITY', key: 'quantity', sortable: false, align: 'end' },
];

const normalizeLineItem = (value) => String(value ?? '').replace(/^0+/, '') || '0';

const reservedPallets = (item) => {
    const pallets = Array.isArray(item.delivery_reserved_pallets)
        ? item.delivery_reserved_pallets
        : [];
    const lineItem = item.item_number ?? item.delivery_item_number;
    const batch = item.commodity_batch_code ?? item.batch ?? item.batch_code;

    if (batch) {
        const batchPallets = pallets.filter(pallet =>
            String(pallet.commodity_batch_code ?? pallet.batch ?? pallet.batch_code) === String(batch),
        );
        if (batchPallets.length) return batchPallets;
    }

    if (lineItem == null) return pallets;

    return pallets.filter(pallet => normalizeLineItem(
        pallet.delivery_item_number ?? pallet.item_number,
    ) === normalizeLineItem(lineItem));
};

const reservedQuantity = (item) => reservedPallets(item).reduce(
    (total, pallet) => total + (Number(pallet.total_qty) || 0),
    0,
);

const reservationStatus = (item) => {
    const quantity = Number(item.delivery_quantity) || 0;
    const reserved = reservedQuantity(item);

    if (reserved === 0) {
        return {
            label: 'Pending',
            color: 'error',
            icon: 'ri-time-line',
        };
    }

    if (quantity > reserved) {
        return {
            label: 'Partial',
            color: 'warning',
            icon: 'ri-progress-line',
        };
    }

    return {
        label: 'Completed',
        color: 'primary',
        icon: 'ri-checkbox-circle-line',
    };
};

const showReservedPallets = (item) => {
    const pallets = reservedPallets(item);
    selectedReservedPallets.value = pallets;
    reservedPalletDialog.value = true;
};

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

    ApiService.query('reports/datatable/open-delivery-order-picklist', {
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
                summary_count.needs_processing = payload.table?.original?.status_summary?.needs_processing || 0;
                summary_count.partially_processed = payload.table?.original?.status_summary?.partial || 0;
                summary_count.pending = payload.table?.original?.status_summary?.pending || 0;
                summary_count.total_pending = payload.table?.original?.status_summary?.total || 0;
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
            placeholder="Search by DO, shipment no., or customer.."
            class="flex-grow-1"
            @update:search="searchValue = $event"
        />

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
        <VDataTableServer v-model:items-per-page="itemsPerPage" :items-per-page-options="[25, 50, 100]" :headers="headers" :items="serverItems"
            :items-length="totalItems" :loading="loading" item-value="id" @update:options="loadItems"
            :row-props="processingRowProps" class="text-no-wrap fixed-column-table">

            <template class="py-1" #item.shipment_number="{ item }">
                <span class="font-weight-bold">{{ item.delivery?.shipment_no || '-' }}</span><br />
                <v-chip class="font-weight-bold" v-if="item.delivery?.shipment" size="x-small" variant="tonal" color="info">
                    Overall Status: {{ item.delivery?.shipment?.overall_status || '-' }}
                </v-chip>
            </template>
            <template #item.plant_id="{ item }">
                <span class="font-weight-bold">{{ item.plant || '' }}</span><br />
            </template>

            <template #item.ref_no="{ item }">
                <span class="font-weight-bold">{{ item.delivery_document || '' }}</span>
                  <v-chip class="ml-1 font-weight-bold" v-if="item.delivery?.goods_issue_status" size="x-small" variant="tonal" color="info">
                    Goods Issue: {{ item.delivery?.goods_issue_status || '-' }}
                </v-chip>
                <br />
                <span class="text-subtitle-1">{{ item.delivery?.ship_to_name || '' }}</span>
            </template>
    
            <template #item.material="{ item }">
                <span class="font-weight-bold">{{ removeLeadingZeros(item?.material_number) }}</span><br />
                <span v-if="item.material_description" class="text-subtitle-1">{{ item?.material_description }}</span>
            </template>

            
            <template #item.quantity="{ item }">
              {{ numberWithComma(item.delivery_quantity) || '' }} {{ item.sales_unit || '' }}
            </template>

            <template #item.reserved_quantity="{ item }">
                <v-chip :color="reservationStatus(item).color" variant="tonal" size="small"
                        class="reserved-quantity-chip" @click="showReservedPallets(item)">
                        <v-icon start size="15">ri-inbox-line</v-icon>
                        {{ reservedQuantity(item) }} {{ item.sales_unit || '' }}
                </v-chip>
            </template>
           
            <template #item.status="{ item }">
                <v-chip :color="reservationStatus(item).color" variant="tonal" size="small"
                    class="reservation-status-chip">
                    <v-icon start size="15">{{ reservationStatus(item).icon }}</v-icon>
                    {{ reservationStatus(item).label }}
                </v-chip>
            </template>
            
        </VDataTableServer>
    </VCard>

    <v-dialog v-model="reservedPalletDialog" max-width="900">
        <v-card>
            <v-card-title class="d-flex align-center justify-space-between">
                <span>Reserved pallets - {{ selectedReservedPallets.length }} pallet(s)</span>
                <v-btn icon="ri-close-line" variant="text" aria-label="Close reserved pallets dialog"
                    @click="reservedPalletDialog = false"></v-btn>
            </v-card-title>

            <v-divider></v-divider>
          
            <v-card-text>
                <v-data-table v-if="selectedReservedPallets.length" :headers="reservedPalletHeaders"
                    :items="selectedReservedPallets" :items-per-page="10" item-value="id" density="compact"
                    class="reserved-pallet-table text-no-wrap">

                    <template #item.physical_id="{ item }">
                        <div >{{ item.pallet_physical_id || '-' }}</div>
                    </template>

                    <template #item.batch="{ item }">
                        {{ item.commodity_batch_code || '-' }}
                    </template>

                    <template #item.quantity="{ item }">
                        {{ numberWithComma(item.total_qty) || 0 }} {{ item.uom || '' }}
                    </template>

                    <template #item.item_number="{ item }">
                        {{ item.delivery_item_number || '-' }}
                    </template>

                    <template #item.material="{ item }">
                        <div class="font-weight-medium">{{ removeLeadingZeros(item.material_code) || '-' }}</div>
                        <div class="text-caption text-medium-emphasis">{{ item.material_description || '' }}</div>
                    </template>
                </v-data-table>
                <div v-else class="text-center text-medium-emphasis py-6">
                    No reserved pallets found.
                </div>
            </v-card-text>
        </v-card>
    </v-dialog>

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
