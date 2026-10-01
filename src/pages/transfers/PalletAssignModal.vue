<script setup>
import Toast from '@/components/Toast.vue'; // Import Toast
import { numberWithCommaAndTwoDecimals } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import { useGoodsReceiptStore } from '@/stores/goodsReceiptStore';
import { debounce } from 'lodash';
import { storeToRefs } from 'pinia';
import { computed, onMounted, ref, watch } from 'vue';

const goodsReceiptStore = useGoodsReceiptStore();
const { filters } = storeToRefs(goodsReceiptStore);

const props = defineProps({
    show: {
        type: Boolean,
        default: false
    },
    item: {
        type: Object,
        default: null
    },
    loading: {
        type: Boolean,
        default: false
    },
    stockTransfer: {
        type: Object,
        default: null
    }
});

const emit = defineEmits(['close', 'save', 'updated']);

const dialogVisible = ref(props.show);
const selectedPallet = ref(null);
const addedPallets = ref([]);
const availablePallets = ref([]);
const isLoading = ref(false);
const search = ref('');

const toast = ref({
    message: '',
    color: 'success',
    show: false
});

const headers = [
    { title: 'Physical ID', key: 'physical_id', sortable: false },
    { title: 'Current', key: 'current_batch', sortable: false },
    { title: 'Quantity', key: 'quantity', sortable: false },
    { title: 'Actions', key: 'actions', sortable: false }
];

const maxPallets = ref(0);
const totalAssignedPallets = ref(0);
const materialConversionLoading = ref(false);

const palletCount = computed(() => totalAssignedPallets.value + addedPallets.value.filter(pallet => !pallet.is_assigned).length);

const selectedTransport = computed(() => {
    const rawTransport = props.item?.transport || props.item;
    return {
        ...rawTransport,
        transport_number: rawTransport?.transport_number || props.item?.transport_number || props.item?.transport?.transport_number,
        driver_name: rawTransport?.driver_name || rawTransport?.driver?.full_name || props.item?.driver_name || props.item?.transport?.driver?.full_name,
        plate_number: rawTransport?.plate_number || rawTransport?.vehicle?.plate_number || props.item?.plate_number || props.item?.transport?.vehicle?.plate_number,
        batch: rawTransport?.batch || props.item?.batch || props.item?.transport?.batch
    };
});

const getPlantCode = () => {
    return props.item?.purchase_order_item?.supplying_plant || props.item?.supplying_plant;
};

function removeLeadingZeros(value) {
    if (!value) return '';
    return String(value).replace(/^0+/, '');
}

const fetchMaterialConversion = async () => {
    if (!props.item) return;
    
    materialConversionLoading.value = true;
    
    try {
        const payload = {
            material_code: removeLeadingZeros(props.item?.purchase_order_item?.material_code || props.item?.material_code),
            quantity: props.item?.purchase_order_item?.qty || props.item?.qty,
            uom: props.item?.purchase_order_item?.uom || props.item?.uom
        };
        const response = await ApiService.post('/transfers/get-material-conversion', payload);
        if (response.data && response.data.quantity) {
             maxPallets.value = response.data.quantity;
        } else {
             maxPallets.value = 0;
        }
    } catch (error) {
        console.error('Failed to fetch material conversion:', error);
        maxPallets.value = 0;
    } finally {
        materialConversionLoading.value = false;
    }
};

const fetchPallets = async (query = '') => {
    const transportNumber = selectedTransport.value?.transport_number;
    if (!transportNumber) return;

    isLoading.value = true;
    try {
        const payload = {
            name: query, 
            page: 1,
            per_page: 20,
            plant_code: getPlantCode(),
            material_code: removeLeadingZeros(props.item?.purchase_order_item?.material_code || props.item?.material_code),
            po_number: props.item?.purchase_order_item?.po_number || props.item?.po_number,
            po_item: props.item?.purchase_order_item?.po_item || props.item?.po_item,
            transport_number: transportNumber,
        };
        const response = await ApiService.post('/transfers/pallet-list', payload);
        availablePallets.value = response.data.data;
    } catch (error) {
        console.error('Failed to fetch pallets:', error);
    } finally {
        isLoading.value = false;
    }
};

const fetchAssignedPallets = async () => {
    if (!props.item) return;

    addedPallets.value = [];

    try {
        const payload = {
            po_number: props.item?.purchase_order_item?.po_number || props.item?.po_number,
            po_item: props.item?.purchase_order_item?.po_item || props.item?.po_item,
            material_code: removeLeadingZeros(props.item?.purchase_order_item?.material_code || props.item?.material_code),
            transport_number: selectedTransport.value?.transport_number,
        };
        const response = await ApiService.post('transfers/get-assigned-pallets', payload);
        console.log('Assigned pallets response:', response.data);  
        if (response.data && Array.isArray(response.data)) {
            addedPallets.value = response.data.map(item => {
                return {
                    physical_id: item.physical_id,
                    log_id: item.id,
                    is_assigned: true,
                    quantity: item.quantity,
                    batch: item.batch,
                };
            }).filter(p => p.physical_id);
        }
    } catch (error) {
        console.error("Failed to fetch assigned pallets", error);
    }
};

const fetchTotalAssignedPallets = async () => {
    if (!props.item) return;

    try {
        const payload = {
            po_number: props.item?.purchase_order_item?.po_number || props.item?.po_number,
            po_item: props.item?.purchase_order_item?.po_item || props.item?.po_item,
            material_code: removeLeadingZeros(props.item?.purchase_order_item?.material_code || props.item?.material_code),
        };
        const response = await ApiService.post('transfers/get-total-assigned-pallets', payload);
        totalAssignedPallets.value = Array.isArray(response.data)
            ? response.data.filter(item => item?.physical_id).length
            : 0;
    } catch (error) {
        console.error('Failed to fetch total assigned pallets:', error);
        totalAssignedPallets.value = 0;
    }
};

const debouncedFetchPallets = debounce((query) => {
    fetchPallets(query);
}, 500);

const resetPalletSelection = () => {
    selectedPallet.value = null;
    addedPallets.value = [];
    totalAssignedPallets.value = 0;
    maxPallets.value = 0;
    search.value = '';
    availablePallets.value = [];
};

const loadModalData = async () => {
    resetPalletSelection();
    await Promise.all([
        fetchMaterialConversion(),
        fetchTotalAssignedPallets(),
        fetchPallets(),
        fetchAssignedPallets()
    ]);
};

onMounted(() => {
    if (props.show) {
        loadModalData();
    }
});

watch(() => props.show, (newVal) => {
    dialogVisible.value = newVal;
    if (newVal) {
        loadModalData();
    }
});

watch(() => dialogVisible.value, (newVal) => {
    if (!newVal) {
        emit('close');
    }
});

watch(search, (newVal) => {
    if (selectedTransport.value?.transport_number && newVal !== selectedPallet.value?.physical_id) {
         debouncedFetchPallets(newVal);
    }
});

const addPallet = () => {
    if (selectedPallet.value) {
        // Check limit
        if (maxPallets.value > 0 && palletCount.value >= maxPallets.value) {
            return; 
        }

        // Check if already added
        const exists = addedPallets.value.find(p => p.physical_id === selectedPallet.value.physical_id);
        if (!exists) {
            addedPallets.value.push({
                ...selectedPallet.value,
                is_assigned: false
            });
            selectedPallet.value = null; // Reset selection
            search.value = ''; // Reset search
        } else {
            toast.value = {
                message: 'Pallet already added to the list or already assigned.',
                color: 'error',
                show: true
            };
        }
    }
};

const getPlantLabel = (palletItem) => {
    const plant = palletItem?.material?.plant;

    if (!plant) {
        return 'N/A';
    }

    if (typeof plant === 'string') {
        return plant;
    }

    if (typeof plant === 'object') {
        const code = plant.plant_code || plant.code;
        const name = plant.name;

        if (code && name) {
            return `${code} - ${name}`;
        }

        return code || name || 'N/A';
    }

    return 'N/A';
};

const removePallet = async (item) => {
    if (item.is_assigned) {
        if (!confirm('Are you sure you want to remove this assigned pallet? This action cannot be undone.')) return;

        try {
            const response = await ApiService.post('transfers/remove-assigned-pallet', { 
                physical_id: item.physical_id,
                batch: item.batch || null,
                po_number: props.item?.purchase_order_item?.po_number || props.item?.po_number,
                po_item: props.item?.purchase_order_item?.po_item || props.item?.po_item,
                material_code: removeLeadingZeros(props.item?.purchase_order_item?.material_code || props.item?.material_code),
                transport_number: selectedTransport.value?.transport_number,
                plant: props.item?.purchase_order_item?.supplying_plant || props.item?.supplying_plant,
                sloc: props.item?.purchase_order_item?.issuing_sloc_sto || props.item?.issuing_sloc_sto,
            });
            
            toast.value = {
                message: response.data?.message || 'Successfully unassigned pallet',
                color: 'success',
                show: true
            };
            
            // Remove from list
            addedPallets.value = addedPallets.value.filter(p => p.physical_id !== item.physical_id);
            totalAssignedPallets.value = Math.max(0, totalAssignedPallets.value - 1);
            emit('updated');
        } catch (error) {
            console.error('Failed to remove assigned pallet:', error);
            toast.value = {
                message: error.response?.data?.message || 'Failed to remove pallet',
                color: 'error',
                show: true
            };
        }
    } else {
        addedPallets.value = addedPallets.value.filter(p => p.physical_id !== item.physical_id);
    }
};

const handleSave = () => {
    const transportNumber = selectedTransport.value?.transport_number;
    if (!transportNumber) {
        toast.value = {
            message: 'Transport number is missing.',
            color: 'error',
            show: true
        };
        return;
    }

    // 1. Filter out only the pallets that aren't assigned yet
    const newPallets = addedPallets.value.filter(p => !p.is_assigned);

    if (newPallets.length === 0) {
        toast.value = {
            message: 'No new pallets to assign.',
            color: 'error',
            show: true
        };
        return;
    }
    
    const formattedPallets = newPallets.map(p => ({
        physical_id: p.physical_id,
        batch: p.batch || 'N/A', 
        quantity: p.quantity || 0 // Default to 0 if quantity is not provided
    }));

    emit('save', {
        pallets: formattedPallets,
        transport_number: transportNumber,
    });
};

const getTransportNumber = (option) => {
    const t = option || selectedTransport.value;
    return t?.transport_number || t?.transport?.transport_number || props.item?.transport_number || 'N/A';
};

const getDriverName = (option) => {
    const t = option || selectedTransport.value;
    return t?.driver_name || t?.driver?.full_name || t?.transport?.driver?.full_name || props.item?.driver_name || 'N/A';
};

const getPlateNumber = (option) => {
    const t = option || selectedTransport.value;
    return t?.plate_number || t?.vehicle?.plate_number || t?.transport?.vehicle?.plate_number || props.item?.plate_number || 'N/A';
};

const getPickedBatch = (option) => {
    const t = option || selectedTransport.value;
    const batch = t?.batch || t?.transport?.batch || props.item?.batch;
    if (!batch) return 'N/A';
    
    if (Array.isArray(batch)) {
        return batch.map(b => typeof b === 'object' ? (b.batch || b.BATCH || JSON.stringify(b)) : b).join(', ');
    }
    
    return typeof batch === 'object' ? (batch.batch || batch.BATCH || 'N/A') : batch;
};

const getAllowedBatches = (item) => {
    if (!item) return '';

    if (item.sto_transactions) {
        const allBatches = item.sto_transactions.flatMap(tx => {
            if (!tx.batch) return [];
            
            let batchArray = tx.batch;
            
            if (typeof batchArray === 'string') {
                try {
                    batchArray = JSON.parse(batchArray);
                } catch {
                    return [batchArray];
                }
            }

            if (Array.isArray(batchArray)) {
                return batchArray.map(b => typeof b === 'object' ? b.batch : b);
            }
            
            return typeof batchArray === 'object' ? [(batchArray.batch || batchArray.BATCH)] : [batchArray];
        });

        const uniqueBatches = [...new Set(allBatches)].filter(Boolean);
        if (uniqueBatches.length > 0) return uniqueBatches.join(', ');
    }

    const directBatch = item.batch || item.transport?.batch;
    if (directBatch) {
        if (typeof directBatch === 'string') {
            try {
                const parsed = JSON.parse(directBatch);
                if (Array.isArray(parsed)) {
                    return parsed.map(b => typeof b === 'object' ? (b.batch || b.BATCH) : b).filter(Boolean).join(', ');
                }
            } catch {
                return directBatch;
            }
            return directBatch;
        }
        if (Array.isArray(directBatch)) {
            return directBatch.map(b => typeof b === 'object' ? (b.batch || b.BATCH) : b).filter(Boolean).join(', ');
        }
        return typeof directBatch === 'object' ? (directBatch.batch || directBatch.BATCH || '') : String(directBatch);
    }

    return '';
};

</script>

<template>
    <v-dialog v-model="dialogVisible" max-width="900px" scrollable>
        <v-card class="d-flex flex-column" height="600px">
            <v-card-title class="d-flex justify-space-between align-center pa-4">
                <span class="text-h5">Assign Pallets</span>
                <v-btn icon="ri-close-line" variant="text" @click="dialogVisible = false"></v-btn>
            </v-card-title>

            <v-divider></v-divider>

            <v-card-text class="flex-grow-1 overflow-y-auto">
                <v-alert
                    type="info"
                    variant="outlined"
                    prominent
                    class="mb-4"
                >
                    Picked Batch: <span class="font-weight-bold">{{ getAllowedBatches(props.item) }}</span>. 
                    
                    <span>If you need another batch, please contact Supply Chain.</span>
                </v-alert>

                <div v-if="item" class="mb-4 pa-3 bg-grey-lighten-4 rounded">
                   <div class="d-flex justify-space-between align-center">
                        <div>
                            <div><strong>Material Code:</strong> {{ removeLeadingZeros(item.purchase_order_item?.material_code || item.material_code) }}</div>
                            <div><strong>Material Desc:</strong> {{ item.purchase_order_item?.material_description || item.material_description }}</div>
                            <div><strong>Qty:</strong> {{ numberWithCommaAndTwoDecimals(item.purchase_order_item?.qty || item.qty) }} {{ item.purchase_order_item?.uom || item.uom }}</div>
                            <div><strong>Open Qty:</strong> {{ numberWithCommaAndTwoDecimals(item.purchase_order_item?.open_quantity || item.open_quantity) }} {{ item.purchase_order_item?.uom || item.uom }}</div>
                        </div>
                        <div v-if="materialConversionLoading">
                           <v-progress-circular indeterminate size="20" width="2" color="primary"></v-progress-circular> Calculating limit...
                        </div>
                        <div v-else class="text-right">
                             <div class="text-caption text-grey">Pallet Limit</div>
                                      <div class="text-h6" :class="{'text-error': palletCount >= maxPallets && maxPallets > 0, 'text-success': palletCount < maxPallets}">
                                          {{ palletCount }} / {{ maxPallets > 0 ? maxPallets : '∞' }}
                             </div>
                        </div>
                   </div>
                </div>

                <div class="d-flex align-center justify-space-between mb-3 pa-2 bg-grey-lighten-5 rounded border">
                    <div>
                        <span>Transport: </span>
                        <span class="font-weight-bold">{{ getTransportNumber(selectedTransport) }}</span>
                    </div>
                    <div v-if="getPlateNumber(selectedTransport) !== 'N/A'">
                        <span>Plate: </span>
                        <span class="font-weight-bold">{{ getPlateNumber(selectedTransport) }}</span>
                    </div>
                    <div v-if="getDriverName(selectedTransport) !== 'N/A'">
                        <span>Driver: </span>
                        <span class="font-weight-bold">{{ getDriverName(selectedTransport) }}</span>
                    </div>
                </div>

                <v-row align="center" class="mb-2">
                    <v-col cols="12" md="8">
                        <v-autocomplete
                            v-model="selectedPallet"
                            v-model:search="search"
                            :items="availablePallets"
                            :loading="isLoading"
                            item-title="physical_id"
                            item-value="physical_id"
                            label="Search Pallet"
                            return-object
                            variant="outlined"
                            density="compact"
                            hide-details
                            placeholder="Type to search..."
                            no-filter
                            :disabled="maxPallets > 0 && palletCount >= maxPallets"
                        >
                            <template #item="{ props: itemProps, item: palletOption }">
                                <v-list-item
                                    v-bind="itemProps"
                                    class="pallet-option-item"
                                    lines="three"
                                    :title="palletOption.raw.physical_id || 'N/A'"
                                >
                                    <template #subtitle>
                                        <div class="pallet-option-subtitle">
                                            <div>{{ getPlantLabel(palletOption.raw) }}</div>
                                            <div>Current Batch: {{ palletOption.raw.batch || 'N/A' }}</div>
                                        </div>
                                    </template>
                                </v-list-item>
                            </template>
                        </v-autocomplete>
                    </v-col>
                    <v-col cols="12" md="4">
                        <v-btn color="primary" block @click="addPallet" :disabled="!selectedPallet || (maxPallets > 0 && palletCount >= maxPallets)">
                            Add Pallet
                        </v-btn>
                    </v-col>
                </v-row>

                <v-data-table
                    :headers="headers"
                    :items="addedPallets"
                    class="elevation-1 border rounded"
                    density="compact"
                >
                    <template #item.current_batch="{ item: tableItem }">
                        {{ tableItem.batch || tableItem?.inventory?.batch || '-' }}
                    </template>
                    <template #item.actions="{ item: tableItem }">
                        <v-btn 
                            icon="ri-delete-bin-line" 
                            size="small" 
                            :color="tableItem.is_assigned ? 'error' : 'warning'" 
                            variant="text" 
                            :title="tableItem.is_assigned ? 'Remove assigned pallet' : 'Remove from list'"
                            @click="removePallet(tableItem)"
                        ></v-btn>
                    </template>
                    <template #no-data>
                        <div class="pa-4 text-center text-grey">
                            No pallets assigned. Search and add pallets above.
                        </div>
                    </template>
                </v-data-table>
            </v-card-text>

            <v-divider></v-divider>

            <v-card-actions class="pa-4">
                <v-spacer></v-spacer>
                <v-btn variant="outlined" @click="dialogVisible = false">Cancel</v-btn>
                <v-btn color="primary" variant="elevated" @click="handleSave" :loading="loading" :disabled="!selectedTransport?.transport_number">Save Changes</v-btn>
            </v-card-actions>
        </v-card>
        <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event" />
    </v-dialog>
</template>

<style scoped>
:deep(.pallet-option-item .v-list-item__content) {
    overflow: visible;
}

:deep(.pallet-option-item .v-list-item-title),
:deep(.pallet-option-item .v-list-item-subtitle) {
    max-width: none;
    overflow: visible;
    text-overflow: unset;
    white-space: normal;
}

:deep(.pallet-option-item .v-list-item-subtitle) {
    line-clamp: unset;
    -webkit-line-clamp: unset;
}

.pallet-option-subtitle {
    width: 100%;
}
</style>
