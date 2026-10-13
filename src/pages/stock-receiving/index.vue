<script setup>
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import { useAuthStore } from '@/stores/auth';
import { useStockReceivingStore } from '@/stores/stockReceivingStore';
import Moment from 'moment';
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const authStore = useAuthStore();
const stockReceivingStore = useStockReceivingStore();
const todayStr = Moment().format('YYYY-MM-DD');
const searchValue = ref('');
const itemsPerPage = ref(50);
const page = ref(1);
const pageLoading = ref(false);

const toast = ref({
    message: '',
    color: 'success',
    show: false
});

// Plant options
const plantsOption = ref([]);
const plantsLoaded = ref(false);

// Storage location options
const storageLocationsOption = ref([]);

const filters = reactive({
    plant: null,
    plant_code: null,
    dateFrom: todayStr,
    dateTo: todayStr,
});


const form = reactive({
    loading: false,
    refresh: false,
    posting_date_from: null,
    posting_date_to: null,
});

const headers = [
    { title: 'Posting Date', key: 'posting_date', sortable: true },
    { title: 'Material Document', key: 'material_document', sortable: true },
    { title: 'Material Doc. Year', key: 'year', sortable: true },
    { title: 'Issuing', key: 'issuing', sortable: false },
    { title: 'Receiving', key: 'receiving', sortable: false },
    { title: 'Items', key: 'items_count', align: 'center', sortable: false },
    { title: 'Received', key: 'status', align: 'center', sortable: false },
    { title: 'Cancel Mat Doc', key: 'cancel_material_document', align: 'center', sortable: false },
    { title: 'Action', key: 'actions', align: 'center', sortable: false },
];

const fetchDataDropdown = async () => {
    pageLoading.value = true;
    try {
        const response = await ApiService.get('/users/get-data-dropdown');
        const { plants } = response.data;
        plantsOption.value = plants;

        // Default to the user's assigned plant
        const assignedPlantId = authStore.user?.assigned_plant?.id;
        const defaultPlant = assignedPlantId ? plantsOption.value.find(p => p.id === assignedPlantId) : null;
        const defaultStorageLocation = defaultPlant?.storage_locations?.[0] || null;

        if (defaultPlant) {
            filters.plant = defaultPlant.id;
        }

    } catch (error) {
        console.error('Error fetching dropdown data:', error);
    } finally {
        pageLoading.value = false;
        plantsLoaded.value = true;
        // Re-fetch since the datatable's initial load was skipped until the default plant resolved
        handleSearch();
    }
};

const loadItems = async ({ page: pageNum, itemsPerPage: perPage }) => {
    if (!plantsLoaded.value) {
        return;
    }
    pageLoading.value = true;
    page.value = pageNum;

    try {
        const params = {
            page: pageNum,
            itemsPerPage: perPage,
        };

        if (searchValue.value) {
            params.search = searchValue.value;
        }
        // v-select holds the plant id; the API filters by plant code (backend defaults to 2110 when omitted)
        const selectedPlant = plantsOption.value.find(p => p.id === filters.plant);
        if (selectedPlant) {
            params.plant = selectedPlant.plant_code;
        }
        if (filters.dateFrom) {
            params.start_date = filters.dateFrom;
        }
        if (filters.dateTo) {
            params.end_date = filters.dateTo;
        }

        await stockReceivingStore.fetchStockReceiving(params);
    } catch (error) {
        console.error('Error loading stock receiving:', error);
        toast.value = {
            message: 'Failed to load stock receiving data.',
            color: 'error',
            show: true
        };
    } finally {
        pageLoading.value = false;
    }
};

const handleSearch = () => {
    loadItems({
        page: 1,
        itemsPerPage: itemsPerPage.value,
    });
};

const handleSearchInput = (value) => {
    searchValue.value = value;
    handleSearch();
};

const refreshList = () => {
    // Sync date filters to form
    form.posting_date_from = filters.dateFrom || null;
    form.posting_date_to = filters.dateTo || null;

    if (!form.posting_date_from || !form.posting_date_to) {
        toast.value = {
            message: 'Please select both Posting Date From and Posting Date To.',
            color: 'error',
            show: true
        };
        return;
    }

    form.loading = true;
    form.refresh = true;
    ApiService.query('download-313?from_date=' + form.posting_date_from + '&to_date=' + form.posting_date_to)
        .then(({ data }) => {
            form.refresh = false;
            form.loading = false;
            loadItems({
                page: 1,
                itemsPerPage: itemsPerPage.value,
            });
        })
        .catch((error) => {
            console.error('Error refreshing stock receiving:', error);
            form.refresh = false;
            form.loading = false;
            toast.value = {
                message: 'Failed to refresh stock receiving data.',
                color: 'error',
                show: true
            };
        });
};

const plantDescription = (plantCode) => {
    const plant = plantsOption.value.find(p => p.value === plantCode);
    return plant ? plant.title : '';
};

const slocDescription = (slocCode, plantCode) => {
    if (!slocCode) return '';
    const plant = plantsOption.value.find(p => p.value === plantCode);
    const sloc = storageLocationsOption.value.find(s => s.value === slocCode && s.plant_id === plant?.id);
    return sloc ? sloc.title : '';
};

const viewReceiving = (item) => {
    router.push({
        name: 'apps-stock-transfer-receiving-view',
        params: { id: item.id }
    });
};

// BU 315 items reversed in one SAP cancellation share a single cancel material document
const cancelMatDoc = (item) => item?.stock_transfer?.cancelled_stock_transfer_items?.[0]?.cancel_material_document || null;

const alcTransfer = (item) => item?.stock_transfer?.alc_stock_transfer || null;

// BU 315 already reversed, but the ALC 917 reversal failed and is still active → allow a retry
const hasPendingAlcCancel = (item) => !!cancelMatDoc(item) && (alcTransfer(item)?.active_stock_transfer_items_count ?? 0) > 0;

const isCancellable = (item) => !!item.stock_transfer_id && (item.status === 'Received' || hasPendingAlcCancel(item));

const rowProps = ({ item }) => (cancelMatDoc(item) ? { class: 'row-cancelled' } : {});

const cancelDialog = ref(false);
const cancelTarget = ref(null);
const cancelDate = ref(null);
const cancelSubmitting = ref(false);
const cancelErrors = ref([]);

const openCancelDialog = (item) => {
    cancelTarget.value = item;
    cancelDate.value = item.posting_date ? Moment(item.posting_date).format('YYYY-MM-DD') : todayStr;
    cancelErrors.value = [];
    cancelDialog.value = true;
};

const closeCancelDialog = () => {
    cancelDialog.value = false;
    cancelTarget.value = null;
    cancelDate.value = null;
    cancelErrors.value = [];
};

const confirmCancelReceiving = () => {
    if (!cancelTarget.value) return;

    if (!cancelDate.value || cancelDate.value > todayStr) {
        cancelErrors.value = ['Please select a valid posting date (not later than today).'];
        return;
    }

    cancelSubmitting.value = true;
    cancelErrors.value = [];

    ApiService.post('stock-transfer-receiving-cancel', {
        id: cancelTarget.value.stock_transfer_id,
        cancel_date: cancelDate.value,
    })
        .then(({ data }) => {
            if (data.status === 'S') {
                toast.value = {
                    message: `Stock receiving ${cancelTarget.value.material_document || ''} cancelled successfully.`,
                    color: 'success',
                    show: true
                };
                closeCancelDialog();
            } else {
                const errors = [...(data.errors || []), ...(data.errors_917 || [])];
                cancelErrors.value = errors.length
                    ? errors.map(e => e.MESSAGE || e.message).filter(Boolean)
                    : ['Failed to cancel stock transfer receiving.'];
            }
        })
        .catch((error) => {
            cancelErrors.value = [error.response?.data?.message || 'Failed to cancel stock transfer receiving.'];
        })
        .finally(() => {
            cancelSubmitting.value = false;
            // Reload even on failure: a 917 error can follow a successful 315 reversal
            loadItems({ page: page.value, itemsPerPage: itemsPerPage.value });
        });
};

const actionList = (item) => {
    const actions = [{ title: 'View', key: 'view' }];
    if (isCancellable(item)) {
        actions.push({ title: 'Cancel', key: 'cancel' });
    }

    return actions;
};

const handleAction = (item, action) => {
    if (action.key == 'view') {
        viewReceiving(item);
    } else if (action.key == 'cancel') {
        openCancelDialog(item);
    }
};

onMounted(() => {
    fetchDataDropdown();
});
</script>

<template>
    <div>
        <!-- Filter Row -->
        <div class="d-flex flex-wrap gap-4 align-center justify-center">

            <SearchInput class="flex-grow-1" placeholder="Search material document.." @update:search="handleSearchInput"/>

            <!-- Plant Filter -->
            <v-select
                style="max-width: 350px;"
                class="flex-grow-1 align-center"
                label="Filter by Plant"
                density="compact"
                :items="plantsOption"
                v-model="filters.plant"
                clearable
            />

            <VCol md="2" cols="12" >
                <v-text-field v-model="filters.dateFrom" label="Posting Date From" type="date" density="compact" variant="outlined" hide-details />
            </VCol>
            <VCol md="2" cols="12" >
                <v-text-field v-model="filters.dateTo" label="Posting Date To" type="date" density="compact" variant="outlined" hide-details />
            </VCol>

            <!-- Search Button -->
            <v-btn class="d-flex align-center" prepend-icon="ri-search-eye-line" @click="handleSearch">
                <template #prepend>
                    <v-icon color="white"></v-icon>
                </template>
                Search
            </v-btn>

            <!-- Get Receiving Button -->
            <v-btn
                class="d-flex align-center"
                prepend-icon="ri-refresh-line"
                color="primary"
                :loading="form.refresh"
                :disabled="form.refresh"
                @click="refreshList"
            >
                <template #prepend>
                    <v-icon color="white"></v-icon>
                </template>
                Get Receiving
            </v-btn>
        </div>

        <!-- Data Table -->
        <VCard>
            <VDataTableServer
                v-model:items-per-page="itemsPerPage"
                :headers="headers"
                :items="stockReceivingStore.items"
                :items-length="stockReceivingStore.totalItems"
                :loading="pageLoading"
                item-value="id"
                :row-props="rowProps"
                @update:options="loadItems"
                class="text-no-wrap"
            >
                <template #item.posting_date="{ item }">
                    <span>{{ Moment(item.posting_date).format('YYYY-MM-DD') }}</span>
                </template>

                <template #item.material_document="{ item }">
                    <span class="font-weight-bold">{{ item.material_document }}</span>
                </template>

                <template #item.year="{ item }">
                    <span>{{ item.year }}</span>
                </template>

                <template #item.issuing="{ item }">
                    <span v-if="item.stock_transfer313_sap_downloads">
                        {{ item.stock_transfer313_sap_downloads[0]?.plant }}
                        {{ plantDescription(item.stock_transfer313_sap_downloads[0]?.plant) }}
                    </span>
                </template>

                <template #item.receiving="{ item }">
                    <span v-if="item.stock_transfer313_sap_downloads">
                        {{ item.stock_transfer313_sap_downloads[0]?.plant }}
                        {{ plantDescription(item.stock_transfer313_sap_downloads[0]?.plant) }}
                        <br>
                        {{ item.stock_transfer313_sap_downloads[0]?.sloc }}
                        {{ slocDescription(item.stock_transfer313_sap_downloads[0]?.sloc, item.stock_transfer313_sap_downloads[0]?.plant) }}
                    </span>
                </template>

                <template #item.items_count="{ item }">
                    <v-chip size="small" color="info">
                        {{ item.stock_transfer313_sap_downloads_count || 0 }}
                    </v-chip>
                </template>

                <template #item.status="{ item }">
                    <div v-if="item.status == 'Received'">
                        <v-chip size="small" color="success" text-color="white">
                            <v-icon start size="small">ri-checkbox-circle-line</v-icon>
                            Received
                        </v-chip>
                    </div>
                    <div v-else-if="item.status == 'Reversed'">
                        <v-chip size="small" color="error" text-color="white">
                            <v-icon start size="small">ri-error-warning-line</v-icon>
                            Reversed
                        </v-chip>
                    </div>
                    <div v-else>
                        <v-chip size="small" color="warning" text-color="white">
                            <v-icon start size="small">ri-alert-line</v-icon>
                            For Receiving
                        </v-chip>
                    </div>
                </template>

                <template #item.cancel_material_document="{ item }">
                    <span v-if="cancelMatDoc(item)" class="font-weight-bold text-error">{{ cancelMatDoc(item) }}</span>
                    <span v-else>-</span>
                </template>

                <template #item.actions="{ item }">
                    <div class="d-flex justify-center">
                        <v-menu location="start">
                            <template #activator="{ props }">
                                <v-btn icon="ri-more-2-line" variant="text" v-bind="props" color="grey"></v-btn>
                            </template>
                            <v-list>
                                <v-list-item
                                    v-for="(action, i) in actionList(item)"
                                    :key="i"
                                    :value="i"
                                    @click="handleAction(item, action)"
                                >
                                    <v-list-item-title>{{ action.title }}</v-list-item-title>
                                </v-list-item>
                            </v-list>
                        </v-menu>
                    </div>
                </template>
            </VDataTableServer>
        </VCard>

        <v-dialog v-model="cancelDialog" max-width="480" persistent>
            <v-card>
                <v-card-title class="text-h6 font-weight-bold">
                    Cancel Stock Receiving
                </v-card-title>
                <v-divider />
                <v-card-text>
                    <p class="mb-4">
                        <template v-if="cancelTarget && hasPendingAlcCancel(cancelTarget)">
                            BU 315 is already cancelled (<strong>{{ cancelMatDoc(cancelTarget) }}</strong>).
                            This will retry reversing the ALC 917 material document
                            <strong>{{ alcTransfer(cancelTarget)?.material_document || '--' }}</strong>.
                        </template>
                        <template v-else>
                            This will reverse the SAP material document of receiving
                            <strong>{{ cancelTarget?.material_document || '--' }}</strong>
                            (BU 315 and ALC 917, if posted).
                        </template>
                        This action cannot be undone.
                    </p>
                    <v-alert
                        v-if="cancelTarget && !alcTransfer(cancelTarget)"
                        type="error"
                        variant="tonal"
                        density="compact"
                        class="mb-4"
                    >
                        ALC is not yet posted. Please cancel this document and try again.
                    </v-alert>
                    <VTextField
                        v-model="cancelDate"
                        type="date"
                        label="Cancel Posting Date"
                        :max="todayStr"
                        density="compact"
                        hide-details
                    />
                    <v-alert v-if="cancelErrors.length" type="error" density="compact" class="mt-4">
                        <div v-for="(err, i) in cancelErrors" :key="i">{{ err }}</div>
                    </v-alert>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn variant="outlined" color="secondary" :disabled="cancelSubmitting" @click="closeCancelDialog">
                        Close
                    </v-btn>
                    <v-btn color="error" :loading="cancelSubmitting" :disabled="!cancelDate" @click="confirmCancelReceiving">
                        Confirm Cancel
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <Toast :show="toast.show" :color="toast.color" :message="toast.message" @update:show="toast.show = $event" />
    </div>
</template>

<style scoped>
:deep(.row-cancelled) > td {
    background-color: rgba(var(--v-theme-error), 0.08);
}
</style>
