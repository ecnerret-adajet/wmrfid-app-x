<script setup>
import { numberWithComma } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import { useStoBatchPickingStore } from '@/stores/stoBatchPickingStore';
import { debounce } from 'lodash';
import Moment from 'moment';
import Swal from 'sweetalert2';
import { computed, ref, watch } from 'vue';

const props = defineProps({
    show: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['close', 'saved']);

const stoBatchPickingStore = useStoBatchPickingStore();

const dialogVisible = ref(props.show);
const stoSearchInput = ref('');
const selectedStoNumber = ref(null);
const stoOptions = ref([]);
const stoItems = ref([]);
const selectedPoItem = ref(null);
const isSearchingSto = ref(false);
const isLoadingStocks = ref(false);
const isSaving = ref(false);
const selectedBatchCodes = ref([]);

const form = ref({
    plate_number: '',
    driver_name: '',
    helper_name: '',
    hauler: ''
});

const stoHeaders = [
    { title: '', key: 'select', sortable: false, width: '48px' },
    { title: 'STO Number', key: 'po_number', sortable: false },
    { title: 'PO Item', key: 'po_item', sortable: false },
    { title: 'Material', key: 'material', sortable: false },
    { title: 'Qty', key: 'qty', sortable: false, align: 'end' },
    { title: 'UOM', key: 'uom', sortable: false },
];

const batchHeaders = [
    { title: '', key: 'select', sortable: false, width: '48px' },
    { title: 'Batch Code', key: 'BATCH', sortable: false },
    { title: 'Mfg. Date', key: 'MANUF_DATE', sortable: false },
    { title: 'Expiry Date', key: 'SLED_STR', sortable: false },
    { title: 'Available Qty', key: 'BAG', sortable: false, align: 'end' },
];

const getStoNumber = (item) => {
    return item?.purchase_order_item?.po_number || item?.po_number || '';
};

const getPoItem = (item) => {
    return item?.purchase_order_item?.po_item || item?.po_item || '';
};

const getMaterialDisplay = (item) => {
    const code = item?.purchase_order_item?.material_code || item?.material_code || '';
    const desc = item?.purchase_order_item?.material_description || item?.material_description || item?.material_name || '';
    const cleanCode = code ? String(code).replace(/^0+/, '') : '';
    if (cleanCode && desc) return `${cleanCode} - ${desc}`;
    return desc || cleanCode || '-';
};

const getQtyDisplay = (item) => {
    const qty = item?.purchase_order_item?.qty ?? item?.qty ?? item?.quantity ?? 0;
    return numberWithComma(qty);
};

const getUomDisplay = (item) => {
    return item?.purchase_order_item?.commercial_uom?.commercial_uom 
        || item?.purchase_order_item?.uom 
        || item?.uom 
        || item?.base_unit 
        || '-';
};

const formatDate = (date) => {
    return date ? Moment(date).format('MMMM D, YYYY') : '-';
};

const fetchStoDetails = async (query = '') => {
    if (!query || String(query).trim() === '') {
        stoOptions.value = [];
        return;
    }

    isSearchingSto.value = true;
    try {
        const trimmedQuery = String(query).trim();
        const params = {
            po_number: trimmedQuery
        };

        const response = await ApiService.query('transfers/get-sto-details', { params });
        console.log('STO details response:', response);
        const data = response?.data;
        const items = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
        const uniqueStoNumbers = [...new Set(items.map(item => getStoNumber(item)).filter(Boolean))];

        stoOptions.value = uniqueStoNumbers.map(stoNum => ({
            title: String(stoNum),
            value: String(stoNum),
            items: items.filter(item => String(getStoNumber(item)) === String(stoNum))
        }));
    } catch (error) {
        console.error('Failed to fetch STO details:', error);
    } finally {
        isSearchingSto.value = false;
    }
};

const debouncedFetchSto = debounce((val) => {
    fetchStoDetails(val);
}, 400);

const onStoSearchInput = (val) => {
    if (val && val !== selectedStoNumber.value) {
        debouncedFetchSto(val);
    }
};

const onStoSelected = async (selected) => {
    selectedPoItem.value = null;
    selectedBatchCodes.value = [];
    stoBatchPickingStore.availableStocks = [];

    if (!selected) {
        selectedStoNumber.value = null;
        stoItems.value = [];
        return;
    }

    const stoNum = typeof selected === 'object' ? selected.value || selected.title : String(selected);
    selectedStoNumber.value = stoNum;

    // Only display items that belong to the selected STO number
    const matchedOption = stoOptions.value.find(opt => String(opt.value) === String(stoNum));
    if (matchedOption && matchedOption.items && matchedOption.items.length > 0) {
        stoItems.value = matchedOption.items;
        if (stoItems.value.length === 1) {
            selectPoItem(stoItems.value[0]);
        }
    } else {
        isSearchingSto.value = true;
        try {
            const params = { po_number: stoNum };
            const response = await ApiService.query('transfers/get-sto-details', { params });
            const data = response?.data;
            const items = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
            stoItems.value = items.filter(item => String(getStoNumber(item)) === String(stoNum));
            if (stoItems.value.length === 1) {
                selectPoItem(stoItems.value[0]);
            }
        } catch (err) {
            console.error('Failed to fetch selected STO items:', err);
            stoItems.value = [];
        } finally {
            isSearchingSto.value = false;
        }
    }
};

const selectPoItem = async (item) => {
    selectedPoItem.value = item;
    selectedBatchCodes.value = [];
    stoBatchPickingStore.availableStocks = [];

    if (!item) return;

    isLoadingStocks.value = true;
    try {
        const poNumber = getStoNumber(item);
        const poItem = getPoItem(item);
        const poQty = item.purchase_order_item?.qty ?? item.qty ?? 0;
        const plantCode = item.purchase_order_item?.supplying_order_plant?.plant_code 
            || item.purchase_order_item?.supplying_plant 
            || item.supplying_plant 
            || item.plant;
        const sloc = item.purchase_order_item?.issuing_storage_location?.code 
            || item.purchase_order_item?.issuing_sloc_sto 
            || item.issuing_sloc_sto 
            || item.sloc;
        const materialCode = item.purchase_order_item?.material_code || item.material_code;

        const openQuantityParams = {
            po_number: poNumber,
            po_item: poItem,
            po_quantity: poQty,
            plant_code: plantCode,
            sloc: sloc
        };

        await stoBatchPickingStore.fetchOpenQuantity(openQuantityParams);

        const availableParams = {
            ...openQuantityParams,
            material_code: materialCode
        };

        await stoBatchPickingStore.fetchAvailableCommodities(availableParams);
    } catch (error) {
        console.error('Failed to fetch stock/batch data:', error);
    } finally {
        isLoadingStocks.value = false;
    }
};

const isItemSelected = (item) => {
    if (!selectedPoItem.value) return false;
    return getStoNumber(selectedPoItem.value) === getStoNumber(item) 
        && getPoItem(selectedPoItem.value) === getPoItem(item);
};

const toggleBatch = (batch) => {
    const index = selectedBatchCodes.value.indexOf(batch.BATCH);
    if (index === -1) {
        selectedBatchCodes.value.push(batch.BATCH);
    } else {
        selectedBatchCodes.value.splice(index, 1);
    }
};

const resetModal = () => {
    stoSearchInput.value = '';
    selectedStoNumber.value = null;
    stoOptions.value = [];
    stoItems.value = [];
    selectedPoItem.value = null;
    selectedBatchCodes.value = [];
    stoBatchPickingStore.availableStocks = [];
    form.value = {
        plate_number: '',
        driver_name: '',
        helper_name: '',
        hauler: ''
    };
};

const isFormValid = computed(() => {
    return (
        selectedPoItem.value != null &&
        // Enable if transport details are required
        // form.value.plate_number.trim() !== '' &&
        // form.value.driver_name.trim() !== '' &&
        // form.value.hauler.trim() !== '' &&
        selectedBatchCodes.value.length > 0
    );
});

const handleSave = async () => {
    if (!isFormValid.value) return;

    const poNumber = getStoNumber(selectedPoItem.value);
    const poItem = getPoItem(selectedPoItem.value);

    if (!poNumber || !poItem) {
        Swal.fire({
            icon: 'error',
            title: 'Missing STO Information',
            text: 'Please select a valid STO item.'
        });
        return;
    }

    const selectedBatches = (stoBatchPickingStore.availableStocks || []).filter(batch =>
        selectedBatchCodes.value.includes(batch.BATCH)
    );

    const plantCode = selectedPoItem.value?.purchase_order_item?.supplying_order_plant?.plant_code 
        || selectedPoItem.value?.purchase_order_item?.supplying_plant 
        || selectedPoItem.value?.supplying_plant 
        || selectedPoItem.value?.plant;

    const materialCode = selectedPoItem.value?.purchase_order_item?.material_code 
        || selectedPoItem.value?.material_code;

    const payload = {
        transport: {
            plate_number: form.value.plate_number.trim(),
            driver_name: form.value.driver_name.trim(),
            helper_name: form.value.helper_name?.trim() || null,
            hauler: form.value.hauler.trim(),
            hauler_name: form.value.hauler.trim()
        },
        batches: selectedBatches,
        is_alc_managed: false,
        material_code: materialCode,
        plant: plantCode
    };

    isSaving.value = true;
    try {
        await ApiService.post(`transfer-orders/sto-batch-pick/${poNumber}/${poItem}/save`, payload);

        Swal.fire({
            icon: 'success',
            title: 'Saved Successfully',
            text: 'New batch picking selection has been saved.',
            confirmButtonColor: '#00833c',
            confirmButtonText: '<span style="color: #ffffff;">OK</span>'
        });

        emit('saved');
        handleClose();
    } catch (error) {
        console.error('Failed to save new batch picking:', error);
        const errorMessage = error.response?.data?.message || 'Failed to save batch picking selection.';
        Swal.fire({
            icon: 'error',
            title: 'Error Saving',
            text: errorMessage,
            confirmButtonColor: '#d33',
            confirmButtonText: '<span style="color: #ffffff;">OK</span>'
        });
    } finally {
        isSaving.value = false;
    }
};

const handleClose = () => {
    dialogVisible.value = false;
};

watch(() => props.show, (newVal) => {
    dialogVisible.value = newVal;
    if (newVal) {
        resetModal();
    }
});

watch(dialogVisible, (newVal) => {
    if (!newVal) {
        emit('close');
    }
});
</script>

<template>
    <v-dialog v-model="dialogVisible" max-width="1200px" scrollable>
        <v-card class="d-flex flex-column" min-height="620px">
            <v-card-title class="d-flex justify-space-between align-center pa-4">
                <span class="text-h5">New Batch Pick - Non ALC Managed</span>
                <v-btn icon="ri-close-line" variant="text" @click="handleClose"></v-btn>
            </v-card-title>

            <v-divider></v-divider>

            <v-card-text class="flex-grow-1 overflow-y-auto pa-4">
                <!-- Section 1: STO Number Search -->
                <div class="mb-4">
                    <div class="text-subtitle-1 font-weight-bold mb-2">1. Select STO Number</div>
                    <v-autocomplete
                        v-model="selectedStoNumber"
                        v-model:search="stoSearchInput"
                        :items="stoOptions"
                        :loading="isSearchingSto"
                        item-title="title"
                        item-value="value"
                        label="STO Number"
                        placeholder="Search STO number..."
                        variant="outlined"
                        density="compact"
                        clearable
                        no-filter
                        @update:search="onStoSearchInput"
                        @update:model-value="onStoSelected"
                    >
                        <template #no-data>
                            <div class="pa-3 text-caption text-grey">
                                {{ isSearchingSto ? 'Searching STO numbers...' : 'Search STO number' }}
                            </div>
                        </template>
                    </v-autocomplete>
                </div>

                <!-- Section 2: STO Items Table -->
                <div class="text-subtitle-1 font-weight-bold mb-2">2. STO Items</div>
                <div v-if="selectedStoNumber && stoItems.length > 0" class="mb-5">
                    <v-table density="compact" class="border rounded elevation-1">
                        <thead>
                            <tr>
                                <th style="width: 48px;"></th>
                                <th>STO Number</th>
                                <th>PO Item</th>
                                <th>Material</th>
                                <th class="text-end">Qty</th>
                                <th>UOM</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="(item, idx) in stoItems"
                                :key="`${getStoNumber(item)}-${getPoItem(item)}-${idx}`"
                                :class="{ 'bg-primary-lighten-5': isItemSelected(item) }"
                                style="cursor: pointer;"
                                @click="selectPoItem(item)"
                            >
                                <td>
                                    <v-radio
                                        :model-value="isItemSelected(item)"
                                        color="primary"
                                        density="compact"
                                        hide-details
                                        @click.stop="selectPoItem(item)"
                                    ></v-radio>
                                </td>
                                <td class="font-weight-medium">{{ getStoNumber(item) }}</td>
                                <td>{{ getPoItem(item) }}</td>
                                <td>{{ getMaterialDisplay(item) }}</td>
                                <td class="text-end font-weight-medium">{{ getQtyDisplay(item) }}</td>
                                <td>{{ getUomDisplay(item) }}</td>
                            </tr>
                        </tbody>
                    </v-table>
                </div>
                <div v-else-if="!selectedStoNumber">
                    <div class="pa-4 text-center text-grey border rounded bg-grey-lighten-5">
                        Please search and select an STO Item above to load line items.
                    </div>
                </div>

                <!-- Section 3: Transport Information Inputs -->
                <!-- <div class="mb-5">
                    <div class="text-subtitle-1 font-weight-bold mb-2">Transport Information</div>
                    <v-row dense>
                        <v-col cols="12" md="3">
                            <v-text-field
                                v-model="form.plate_number"
                                label="Plate Number *"
                                placeholder="Enter plate number"
                                density="compact"
                                variant="outlined"
                                hide-details="auto"
                            ></v-text-field>
                        </v-col>
                        <v-col cols="12" md="3">
                            <v-text-field
                                v-model="form.driver_name"
                                label="Driver Name *"
                                placeholder="Enter driver name"
                                density="compact"
                                variant="outlined"
                                hide-details="auto"
                            ></v-text-field>
                        </v-col>
                        <v-col cols="12" md="3">
                            <v-text-field
                                v-model="form.helper_name"
                                label="Helper Name (Optional)"
                                placeholder="Enter helper name"
                                density="compact"
                                variant="outlined"
                                hide-details="auto"
                            ></v-text-field>
                        </v-col>
                        <v-col cols="12" md="3">
                            <v-text-field
                                v-model="form.hauler"
                                label="Hauler *"
                                placeholder="Enter hauler"
                                density="compact"
                                variant="outlined"
                                hide-details="auto"
                            ></v-text-field>
                        </v-col>
                    </v-row>
                </div> -->

                <!-- Section 4: Available Stocks & Batch Selection -->
                <div>
                    <div class="text-subtitle-1 font-weight-bold mb-2">3. Available Stocks & Batch Selection</div>

                    <div v-if="!selectedPoItem" class="pa-4 text-center text-grey border rounded bg-grey-lighten-5">
                        Please search and select an STO Item above to load available stocks.
                    </div>

                    <template v-else>
                        <v-row dense class="mb-3">
                            <v-col cols="12" md="6">
                                <v-sheet border="primary md" rounded="lg" class="pa-3 d-flex justify-space-between align-center">
                                    <span class="text-primary font-weight-medium">PO Item Qty</span>
                                    <span class="text-h6 text-primary font-weight-bold">
                                        {{ getQtyDisplay(selectedPoItem) }} {{ getUomDisplay(selectedPoItem) }}
                                    </span>
                                </v-sheet>
                            </v-col>
                            <v-col cols="12" md="6">
                                <v-skeleton-loader v-if="isLoadingStocks" type="list-item"></v-skeleton-loader>
                                <v-sheet v-else border="primary md" rounded="lg" class="pa-3 d-flex justify-space-between align-center">
                                    <span class="text-error font-weight-medium">Open Qty</span>
                                    <span class="text-h6 text-error font-weight-bold">
                                        {{ numberWithComma(stoBatchPickingStore.stoDetails?.open_quantity ?? 0) }} {{ getUomDisplay(selectedPoItem) }}
                                    </span>
                                </v-sheet>
                            </v-col>
                        </v-row>

                        <v-data-table
                            :headers="batchHeaders"
                            :items="stoBatchPickingStore.availableStocks"
                            :loading="isLoadingStocks"
                            item-value="BATCH"
                            class="elevation-1 border rounded"
                            density="compact"
                            hide-default-footer
                        >
                            <template #item.select="{ item: batchItem }">
                                <v-checkbox
                                    :model-value="selectedBatchCodes.includes(batchItem.BATCH)"
                                    @update:model-value="toggleBatch(batchItem)"
                                    hide-details
                                    density="compact"
                                ></v-checkbox>
                            </template>
                            <template #item.MANUF_DATE="{ item: batchItem }">
                                {{ formatDate(batchItem.MANUF_DATE) }}
                            </template>
                            <template #item.SLED_STR="{ item: batchItem }">
                                {{ formatDate(batchItem.SLED_STR) }}
                            </template>
                            <template #item.BAG="{ item: batchItem }">
                                {{ numberWithComma(batchItem.BAG) }} {{ batchItem.BASE_UOM }}
                            </template>
                            <template #no-data>
                                <div class="pa-4 text-center text-grey">
                                    No available stocks found for this item.
                                </div>
                            </template>
                        </v-data-table>
                    </template>
                </div>
            </v-card-text>

            <v-divider></v-divider>

            <v-card-actions class="pa-4 justify-end">
                <v-btn variant="text" @click="handleClose">Cancel</v-btn>
                <v-btn
                    color="primary"
                    variant="elevated"
                    :loading="isSaving"
                    :disabled="!isFormValid"
                    @click="handleSave"
                >
                    Confirm Selection
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<style scoped>
.bg-primary-lighten-5 {
    background-color: rgba(var(--v-theme-primary), 0.08);
}
</style>
