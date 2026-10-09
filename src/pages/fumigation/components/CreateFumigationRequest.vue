<script setup>
import DatePicker from '@/components/DatePicker.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import SearchInput from '@/components/SearchInput.vue';
import ApiService from '@/services/ApiService';
import { debounce } from 'lodash';
import Moment from 'moment';

const props = defineProps({
    show: { type: Boolean, default: false },
    plantsOption: { type: Array, default: () => [] },
    // Sensitive-DO worklist row to pre-fill a c/o Sales request
    prefillDelivery: { type: Object, default: null },
});

const emit = defineEmits(['close', 'created']);

const SOURCE_SALES = 'sales';
const SOURCE_ALC = 'alc';

const form = reactive({
    requester_type: SOURCE_SALES,
    plant_code: null,
    delivery_order_no: null,
    chamber_block_id: null,
    ticket_range: null,
    fumigation_date: null,
    aeration_date: null,
    remarks: null,
});

const errorMessage = ref(null);
const submitting = ref(false);
const selectedPallets = ref([]);
const isSales = computed(() => form.requester_type === SOURCE_SALES);

// Set when pre-filling; applied once that DO shows up in the picker
const pendingDeliveryOrderNo = ref(null);

const reset = () => {
    form.requester_type = SOURCE_SALES;
    form.delivery_order_no = null;
    form.chamber_block_id = null;
    form.ticket_range = null;
    form.fumigation_date = null;
    form.aeration_date = null;
    form.remarks = null;
    deliveryOrderSearch.value = '';
    selectedPallets.value = [];
    salesPallets.value = [];
    alcPallets.value = [];
    alcTotal.value = 0;
    alcSearch.value = '';
    alcBatch.value = '';
    errorMessage.value = null;
}

watch(() => props.show, async (visible) => {
    if (!visible) return;
    reset();
    const plant = props.prefillDelivery?.plant_code ?? props.plantsOption[0]?.value ?? null;
    pendingDeliveryOrderNo.value = props.prefillDelivery?.delivery_document ?? null;

    if (form.plant_code === plant) {
        loadPlantDependents();
    } else {
        form.plant_code = plant; // the plant watcher loads chamber bins and delivery orders
    }
    if (pendingDeliveryOrderNo.value) deliveryOrderSearch.value = pendingDeliveryOrderNo.value;
});

const close = () => emit('close');

// --- Chamber bins -------------------------------------------------------------
const chamberBins = ref([]);
const chamberLoading = ref(false);

const fetchChamberBins = async () => {
    chamberBins.value = [];
    if (!form.plant_code) return;
    chamberLoading.value = true;
    try {
        const response = await ApiService.get(`fumigations/chamber-bins/${form.plant_code}`);
        chamberBins.value = (response.data ?? []).map(bin => ({
            ...bin,
            title: `${bin.sloc} · ${bin.lot_label ?? '--'} - ${bin.label}`,
        }));
        if (chamberBins.value.length === 1) form.chamber_block_id = chamberBins.value[0].id;
    } catch {
        chamberBins.value = [];
    } finally {
        chamberLoading.value = false;
    }
};

const selectedChamber = computed(() => chamberBins.value.find(bin => bin.id === form.chamber_block_id) ?? null);

// --- Delivery orders ----------------------------------------------------------
const deliveryOrderSearch = ref('');
const deliveryOrderItems = ref([]);
const deliveryOrderLoading = ref(false);

const fetchDeliveryOrders = async (search = '') => {
    if (!form.plant_code) return;
    deliveryOrderLoading.value = true;
    try {
        const response = await ApiService.query('fumigations/open-delivery-orders', {
            params: {
                plant_code: form.plant_code,
                search,
                // c/o Sales: sensitive customers (Customer Master) that already have reserved pallets
                ...(isSales.value ? { sensitive_only: 1, with_reserved_pallets: 1 } : {}),
            },
        });
        deliveryOrderItems.value = response.data ?? [];
        if (pendingDeliveryOrderNo.value && deliveryOrderItems.value.some(d => d.delivery_document === pendingDeliveryOrderNo.value)) {
            form.delivery_order_no = pendingDeliveryOrderNo.value;
            pendingDeliveryOrderNo.value = null;
        }
    } catch {
        deliveryOrderItems.value = [];
    } finally {
        deliveryOrderLoading.value = false;
    }
};

let deliverySearchTimer = null;
watch(deliveryOrderSearch, (val) => {
    clearTimeout(deliverySearchTimer);
    deliverySearchTimer = setTimeout(() => fetchDeliveryOrders(val), 350);
});

const selectedDelivery = computed(() =>
    deliveryOrderItems.value.find(d => d.delivery_document === form.delivery_order_no) ?? null
);

const loadPlantDependents = () => {
    form.delivery_order_no = null;
    form.chamber_block_id = null;
    selectedPallets.value = [];
    deliveryOrderItems.value = [];
    fetchChamberBins();
    fetchDeliveryOrders(deliveryOrderSearch.value);
    if (!isSales.value) reloadAlcPallets();
};

watch(() => form.plant_code, () => {
    if (props.show) loadPlantDependents();
});

watch(() => form.requester_type, () => {
    if (!props.show) return;
    form.delivery_order_no = null;
    selectedPallets.value = [];
    salesPallets.value = [];
    errorMessage.value = null;
    fetchDeliveryOrders(deliveryOrderSearch.value);
    if (!isSales.value) reloadAlcPallets();
});

// --- Pallets ------------------------------------------------------------------
const palletHeaders = computed(() => [
    { title: 'PALLET ID', key: 'physical_id' },
    { title: 'BATCH', key: 'batch' },
    { title: 'MATERIAL', key: 'material', sortable: false },
    { title: 'QTY', key: 'quantity', align: 'center', sortable: false },
    { title: 'BIN LOCATION', key: 'bin_location', sortable: false },
    ...(isSales.value
        ? [
            { title: 'DO ITEM', key: 'delivery_item_number', align: 'center' },
            { title: 'RESERVED QTY', key: 'reserved_quantity', align: 'center', sortable: false },
        ]
        : []),
    { title: 'ELIGIBILITY', key: 'eligibility', sortable: false },
]);

// The chamber must be in the pallet's storage location (bin-to-bin stays within one SLOC)
const palletBlockReason = pallet => {
    if (pallet.ineligible_reason) return pallet.ineligible_reason;
    if (selectedChamber.value && pallet.sloc !== selectedChamber.value.sloc) return `Not in the chamber's SLOC (${selectedChamber.value.sloc})`;
    return null;
};
const withSelectability = pallets => pallets.map(pallet => ({ ...pallet, _selectable: !palletBlockReason(pallet) }));

// c/o Sales: every unloaded pallet reserved to the DO
const salesPallets = ref([]);
const salesLoading = ref(false);

const fetchSalesPallets = async () => {
    salesPallets.value = [];
    selectedPallets.value = [];
    if (!form.delivery_order_no) return;
    salesLoading.value = true;
    try {
        const response = await ApiService.query('fumigations/eligible-pallets', {
            params: { source: SOURCE_SALES, plant_code: form.plant_code, delivery_document: form.delivery_order_no },
        });
        salesPallets.value = response.data ?? [];
        // The whole DO goes to fumigation by default
        selectedPallets.value = withSelectability(salesPallets.value).filter(pallet => pallet._selectable);
    } catch (error) {
        errorMessage.value = error.response?.data?.error || error.response?.data?.message || 'Failed to load reserved pallets.';
    } finally {
        salesLoading.value = false;
    }
};

watch(() => form.delivery_order_no, () => {
    if (isSales.value) fetchSalesPallets();
});

// c/o ALC: unreserved GOOD stock, filtered by material/batch
const alcPallets = ref([]);
const alcTotal = ref(0);
const alcLoading = ref(false);
const alcItemsPerPage = ref(10);
const alcPage = ref(1);
const alcSearch = ref('');
const alcBatch = ref('');

const loadAlcPallets = async ({ page, itemsPerPage } = {}) => {
    if (isSales.value || !form.plant_code) return;
    alcPage.value = page ?? alcPage.value;
    alcItemsPerPage.value = itemsPerPage ?? alcItemsPerPage.value;
    alcLoading.value = true;
    try {
        const response = await ApiService.query('fumigations/eligible-pallets', {
            params: {
                source: SOURCE_ALC,
                plant_code: form.plant_code,
                sloc: selectedChamber.value?.sloc,
                search: alcSearch.value,
                batch: alcBatch.value,
                page: alcPage.value,
                itemsPerPage: alcItemsPerPage.value,
            },
        });
        alcPallets.value = response.data.data ?? [];
        alcTotal.value = response.data.total ?? 0;
    } catch {
        alcPallets.value = [];
        alcTotal.value = 0;
    } finally {
        alcLoading.value = false;
    }
};

const reloadAlcPallets = () => {
    alcPage.value = 1;
    loadAlcPallets({ page: 1 });
};

const handleAlcSearch = debounce((search) => {
    alcSearch.value = search;
    reloadAlcPallets();
}, 500);

watch(alcBatch, debounce(() => reloadAlcPallets(), 500));

// Only offer ALC pallets from the chamber's SLOC once a chamber is picked
watch(() => form.chamber_block_id, () => {
    selectedPallets.value = selectedPallets.value.filter(pallet => !palletBlockReason(pallet));
    if (!isSales.value) reloadAlcPallets();
});

const palletRows = computed(() => withSelectability(isSales.value ? salesPallets.value : alcPallets.value));

// --- Submit -------------------------------------------------------------------
const canSubmit = computed(() =>
    form.plant_code && form.chamber_block_id && form.fumigation_date && form.aeration_date
    && (!isSales.value || form.delivery_order_no) && selectedPallets.value.length > 0
);

const submit = async () => {
    errorMessage.value = null;

    if (Moment(form.fumigation_date).isAfter(Moment(form.aeration_date), 'day')) {
        errorMessage.value = 'Aeration date cannot be earlier than the fumigation date.';
        return;
    }

    submitting.value = true;
    try {
        await ApiService.post('fumigations/create', {
            ...form,
            delivery_order_no: form.delivery_order_no || null,
            fumigation_date: Moment(form.fumigation_date).format('YYYY-MM-DD'),
            aeration_date: Moment(form.aeration_date).format('YYYY-MM-DD'),
            items: selectedPallets.value.map(pallet => ({
                inventory_id: pallet.inventory_id,
                delivery_item_number: pallet.delivery_item_number ?? null,
                assigned_quantity: pallet.reserved_quantity ?? null,
                sales_unit: pallet.uom ?? null,
            })),
        });
        emit('created');
    } catch (error) {
        // 422 carries the ineligible pallet list in `error`
        errorMessage.value = error.response?.data?.error || error.response?.data?.message || 'An unexpected error occurred.';
    } finally {
        submitting.value = false;
    }
};
</script>

<template>
    <EditingModal :show="show" max-width="1500px" dialog-title="Fumigation Request" @close="close">
        <template #default>
            <v-form @submit.prevent="submit">
                <v-btn-toggle v-model="form.requester_type" mandatory color="primary" variant="outlined" divided density="comfortable">
                    <v-btn :value="SOURCE_SALES" prepend-icon="ri-truck-line">c/o Sales</v-btn>
                    <v-btn :value="SOURCE_ALC" prepend-icon="ri-search-eye-line">c/o ALC</v-btn>
                </v-btn-toggle>
                <div class="text-caption text-medium-emphasis mt-1 mb-4">
                    <template v-if="isSales">Pallets already reserved to a delivery order of a sensitive customer.</template>
                    <template v-else>Unreserved stock that ALC asked to inspect; the delivery order is an optional reference.</template>
                </div>

                <v-row>
                    <v-col cols="12" md="4">
                        <v-autocomplete
                            v-model="form.plant_code"
                            :items="plantsOption"
                            item-title="title"
                            item-value="value"
                            label="Plant"
                            density="compact"
                            hide-details
                        />
                    </v-col>
                    <v-col cols="12" md="4">
                        <v-autocomplete
                            v-model="form.chamber_block_id"
                            :items="chamberBins"
                            :loading="chamberLoading"
                            item-title="title"
                            item-value="id"
                            label="Fumigation Chamber"
                            density="compact"
                            hide-details
                            :no-data-text="form.plant_code ? 'No fumigation chamber bins in this plant' : 'Select a plant first'"
                        />
                    </v-col>
                    <v-col cols="12" md="4">
                        <v-text-field
                            v-model="form.ticket_range"
                            label="Ticket Range"
                            placeholder="e.g. T-000120 – T-000145"
                            density="compact"
                            hide-details
                        />
                    </v-col>
                    <v-col cols="12" md="6">
                        <DatePicker v-model="form.fumigation_date" placeholder="Fumigation Date" />
                    </v-col>
                    <v-col cols="12" md="6">
                        <DatePicker v-model="form.aeration_date" :min-date="form.fumigation_date" placeholder="Aeration Date" />
                    </v-col>
                </v-row>

                <VAutocomplete
                    v-model="form.delivery_order_no"
                    v-model:search="deliveryOrderSearch"
                    :items="deliveryOrderItems"
                    :loading="deliveryOrderLoading"
                    item-title="delivery_document"
                    item-value="delivery_document"
                    :label="isSales ? 'Delivery Order No.' : 'Delivery Order No. (optional, reference only)'"
                    placeholder="Type to search delivery order..."
                    variant="outlined"
                    density="compact"
                    clearable
                    clear-icon="ri-close-line"
                    no-filter
                    class="mt-4"
                >
                    <template #item="{ item, props: itemProps }">
                        <v-list-item v-bind="itemProps" :subtitle="item.raw.sold_to_name" />
                    </template>
                    <template #no-data>
                        <v-list-item>
                            <v-list-item-title class="text-medium-emphasis">
                                <template v-if="deliveryOrderLoading">Searching...</template>
                                <template v-else-if="isSales">No open delivery orders of sensitive customers with reserved pallets (see Customer Master)</template>
                                <template v-else>No open delivery orders found</template>
                            </v-list-item-title>
                        </v-list-item>
                    </template>
                </VAutocomplete>

                <v-card v-if="selectedDelivery" variant="tonal" color="primary" rounded="lg" class="mb-2 pa-3">
                    <VRow dense>
                        <VCol cols="12" md="4">
                            <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis">Ship To</div>
                            <div class="font-weight-bold">{{ selectedDelivery.ship_to_name }}</div>
                            <div class="text-caption text-medium-emphasis">{{ selectedDelivery.ship_to_customer }}</div>
                        </VCol>
                        <VCol cols="12" md="4">
                            <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis">Ship To Address</div>
                            <div class="font-weight-bold">{{ selectedDelivery.ship_to_address }}</div>
                        </VCol>
                        <VCol cols="12" md="4">
                            <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis">Sold To</div>
                            <div class="font-weight-bold">
                                {{ selectedDelivery.sold_to_name }}
                                <v-chip v-if="selectedDelivery.is_sensitive_customer" color="warning" size="x-small" variant="flat" class="ml-1">Sensitive</v-chip>
                            </div>
                            <div class="text-caption text-medium-emphasis">{{ selectedDelivery.sold_to_customer }}</div>
                        </VCol>
                    </VRow>
                </v-card>

                <v-textarea v-model="form.remarks" class="mt-4" label="Remarks" rows="2" clearable clear-icon="ri-close-line" />
            </v-form>

            <v-divider class="my-4" />

            <div class="d-flex flex-wrap align-center justify-space-between gap-2 mb-3">
                <div class="text-h6 font-weight-medium">
                    Pallets
                    <v-chip v-if="selectedPallets.length > 0" color="primary" size="small" variant="tonal" class="ml-2">
                        {{ selectedPallets.length }} selected
                    </v-chip>
                </div>
                <div v-if="!isSales" class="d-flex flex-wrap gap-2 flex-grow-1 justify-end">
                    <SearchInput style="min-width: 260px;" @update:search="handleAlcSearch" />
                    <v-text-field
                        v-model="alcBatch"
                        label="Batch"
                        density="compact"
                        hide-details
                        clearable
                        style="max-width: 220px;"
                    />
                </div>
            </div>

            <VAlert v-if="isSales && !form.delivery_order_no" color="info" variant="tonal" density="compact" class="mb-3" icon="ri-information-line">
                Select a delivery order to list the pallets reserved to it.
            </VAlert>

            <v-data-table
                v-if="isSales"
                v-model="selectedPallets"
                :headers="palletHeaders"
                :items="palletRows"
                :loading="salesLoading"
                item-value="inventory_id"
                item-selectable="_selectable"
                show-select
                return-object
                :items-per-page="-1"
                hide-default-footer
                class="text-no-wrap border rounded"
                no-data-text="No unloaded pallets reserved to this delivery order. Reserve pallets to the DO first."
            >
                <template #item.material="{ item }">
                    <span class="font-weight-bold">{{ item.material?.description }}</span><br />
                    <span class="text-caption text-medium-emphasis">{{ item.material?.bu_material }}</span>
                </template>
                <template #item.bin_location="{ item }">
                    {{ item.bin_location }} <span class="text-caption text-medium-emphasis">· L{{ item.position_in_block ?? '--' }} · {{ item.sloc }}</span>
                </template>
                <template #item.reserved_quantity="{ item }">
                    {{ item.reserved_quantity ?? '—' }} {{ item.uom }}
                </template>
                <template #item.eligibility="{ item }">
                    <v-chip v-if="palletBlockReason(item)" color="error" size="small" variant="tonal">{{ palletBlockReason(item) }}</v-chip>
                    <v-chip v-else color="success" size="small" variant="tonal">Eligible</v-chip>
                </template>
            </v-data-table>

            <VDataTableServer
                v-else
                v-model="selectedPallets"
                v-model:items-per-page="alcItemsPerPage"
                :headers="palletHeaders"
                :items="palletRows"
                :items-length="alcTotal"
                :loading="alcLoading"
                item-value="inventory_id"
                item-selectable="_selectable"
                show-select
                return-object
                class="text-no-wrap border rounded"
                no-data-text="No unreserved GOOD pallets found"
                @update:options="loadAlcPallets"
            >
                <template #item.material="{ item }">
                    <span class="font-weight-bold">{{ item.material?.description }}</span><br />
                    <span class="text-caption text-medium-emphasis">{{ item.material?.bu_material }}</span>
                </template>
                <template #item.bin_location="{ item }">
                    {{ item.bin_location }} <span class="text-caption text-medium-emphasis">· L{{ item.position_in_block ?? '--' }} · {{ item.sloc }}</span>
                </template>
                <template #item.eligibility="{ item }">
                    <v-chip v-if="palletBlockReason(item)" color="error" size="small" variant="tonal">{{ palletBlockReason(item) }}</v-chip>
                    <v-chip v-else color="success" size="small" variant="tonal">Eligible</v-chip>
                </template>
            </VDataTableServer>

            <VAlert v-if="errorMessage" class="mt-4" color="error" variant="tonal">
                {{ errorMessage }}
            </VAlert>

            <div class="d-flex justify-end align-center mt-4">
                <v-btn color="secondary" variant="outlined" class="px-12 mr-3" @click="close">Cancel</v-btn>
                <PrimaryButton color="primary" class="px-12" :disabled="!canSubmit" :loading="submitting" @click="submit">
                    Create
                </PrimaryButton>
            </div>
        </template>
    </EditingModal>
</template>
