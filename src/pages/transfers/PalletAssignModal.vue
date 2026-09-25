<script setup>
import Toast from '@/components/Toast.vue'; // Import Toast
import { numberWithCommaAndTwoDecimals } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import { useGoodsReceiptStore } from '@/stores/goodsReceiptStore';
import { debounce } from 'lodash';
import { storeToRefs } from 'pinia';
import { computed, ref, watch } from 'vue';

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
const step = ref(1);
const selectedPallet = ref(null);
const selectedTransport = ref(null);
const addedPallets = ref([]);
const availableBlocks = ref([]);
const selectedBlock = ref(null);
const isLoadingBlocks = ref(false);
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

const transportOptions = computed(() => {
    const transactions = Array.isArray(props.item?.sto_transactions)
        ? props.item.sto_transactions
        : [];
    const uniqueTransports = new Map();

    transactions.forEach(transaction => {
        const transport = transaction?.transport || transaction;
        const key = transaction?.transport_id || transport?.id || transaction?.transaction_item_id;

        if (key != null && !uniqueTransports.has(key)) {
            uniqueTransports.set(key, {
                ...transaction,
                transport,
                transport_id: transaction?.transport_id || transport?.id,
                transaction_item_id: transaction?.transaction_item_id || transaction?.id
            });
        }
    });

    return [...uniqueTransports.values()];
});

const getPlantCode = () => {
    return props.stockTransfer?.purchase_order?.supplying_plant;
};

function removeLeadingZeros(value) {
    if (!value) return '';
    return value.replace(/^0+/, '');
}

const fetchMaterialConversion = async () => {
    if (!props.item) return;
    
    materialConversionLoading.value = true;
    
    try {
        const payload = {
            material_code: removeLeadingZeros(props.item?.material_code),
            quantity: props.item?.qty,
            uom: props.item?.uom
        };
        const response = await ApiService.post('/transfers/get-material-conversion', payload);
        if (response.data && response.data.quantity) {
             maxPallets.value = response.data.quantity;
        } else {
             maxPallets.value = 0; // Or some default
        }
    } catch (error) {
        console.error('Failed to fetch material conversion:', error);
        maxPallets.value = 0;
    } finally {
        materialConversionLoading.value = false;
    }
};

const fetchPallets = async (query = '') => {
    if (!selectedTransport.value) return;

    isLoading.value = true;
    try {
        const payload = {
            name: query, 
            page: 1,
            per_page: 20,
            plant_code: getPlantCode(),
            material_code: removeLeadingZeros(props.item?.material_code),
            po_number: props.item?.po_number,
            po_item: props.item?.po_item,
            transport_number: selectedTransport.value?.transport_number,
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
    if (!props.item || !props.stockTransfer?.id) return;

    addedPallets.value = [];

    try {
        const payload = {
            po_number: props.item?.po_number,
            po_item: props.item?.po_item,
            material_code: removeLeadingZeros(props.item?.material_code),
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
            }).filter(p => p.physical_id); // Filter out any undefined pallets
        }
    } catch (error) {
        console.error("Failed to fetch assigned pallets", error);
    }
};

const fetchTotalAssignedPallets = async () => {
    if (!props.item || !props.stockTransfer?.id) return;

    try {
        const payload = {
            po_number: props.item?.po_number,
            po_item: props.item?.po_item,
            material_code: removeLeadingZeros(props.item?.material_code),
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
    step.value = 1;
    selectedPallet.value = null;
    selectedTransport.value = null;
    addedPallets.value = [];
    totalAssignedPallets.value = 0;
    maxPallets.value = 0;
    search.value = '';
    availablePallets.value = [];
};

const goToPalletStep = async () => {
    if (!selectedTransport.value) return;

    step.value = 2;
    selectedPallet.value = null;
    search.value = '';
    await Promise.all([
        fetchPallets(),
        fetchAssignedPallets()
    ]);
};

const goBackToTransportStep = () => {
    step.value = 1;
    selectedPallet.value = null;
    search.value = '';
    availablePallets.value = [];
};

watch(() => props.show, (newVal) => {
    dialogVisible.value = newVal;
    if (newVal) {
        resetPalletSelection();
        selectedBlock.value = null; // Reset block selection
        fetchMaterialConversion();
        fetchTotalAssignedPallets();
    }
});

watch(() => dialogVisible.value, (newVal) => {
    if (!newVal) {
        emit('close');
    }
});

watch(search, (newVal) => {
    if (step.value === 2 && selectedTransport.value && newVal !== selectedPallet.value?.physical_id) { // Avoid refetching when selecting an item
         debouncedFetchPallets(newVal);
    }
});

const addPallet = () => {
    if (selectedPallet.value) {
        // Check limit
        if (maxPallets.value > 0 && palletCount.value >= maxPallets.value) {
            // Optional: User feedback, though button should be disabled
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
                po_number: props.item?.po_number,
                po_item: props.item?.po_item,
                material_code: removeLeadingZeros(props.item?.material_code),
                transport_number: selectedTransport.value?.transport_number,
                plant: props.item?.supplying_plant,
                sloc: props.item?.issuing_sloc_sto,
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
    if (!selectedTransport.value) {
        toast.value = {
            message: 'Please select a transport before saving.',
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
        transport_number: selectedTransport.value.transport_number,
    });
};

const getTransportNumber = (option) => option?.transport_number || 'N/A';
const getDriverName = (option) => {
    return option.driver_name || 'N/A';
};
const getPlateNumber = (option) =>  option?.plate_number || 'N/A';

const getPickedBatch = (option) => {
    if (!option?.batch) return 'N/A';
    
    return Array.isArray(option.batch) 
        ? option.batch.join(', ') 
        : option.batch;
};

const getAllowedBatches = (item) => {
    if (!item?.sto_transactions) return '';

    const allBatches = item.sto_transactions?.flatMap(tx => {
        // Handle if tx.batch is an array or an array-like string
        if (Array.isArray(tx.batch)) return tx.batch;
        try {
            const parsed = JSON.parse(tx.batch);
            return Array.isArray(parsed) ? parsed : [tx.batch];
        } catch {
            return tx.batch ? [tx.batch] : [];
        }
    });

    // 2. Filter out duplicates and join them with spaces
    const uniqueBatches = [...new Set(allBatches)].filter(Boolean);

    return uniqueBatches.length > 0 ? uniqueBatches.join(', ') : '';
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
                >
                    Picked Batch: <span class="font-weight-bold">{{ getAllowedBatches(props.item) }}</span>. 
                    
                    <span>If you need another batch, please contact Supply Chain.</span>
                </v-alert>

                <div v-if="item" class="mb-4 pa-3 bg-grey-lighten-4 rounded">
                   <div class="d-flex justify-space-between align-center">
                        <div>
                            <div><strong>Material Code:</strong> {{ removeLeadingZeros(item.material_code) }}</div>
                            <div><strong>Material Desc:</strong> {{ item.material_description }}</div>
                            <div><strong>Qty:</strong> {{ numberWithCommaAndTwoDecimals(item.qty) }} {{ item.uom }}</div>
                            <div><strong>Open Qty:</strong> {{ numberWithCommaAndTwoDecimals(item.open_quantity) }} {{ item.uom }}</div>
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

                <div class="d-flex align-center flex-nowrap mb-2 mt-4">
                    <div class="d-flex align-center flex-shrink-0">
                        <v-avatar :color="step >= 1 ? 'primary' : 'grey-lighten-1'" size="28">
                            <span class="text-body-2 text-white">1</span>
                        </v-avatar>
                        <span class="ml-2 text-no-wrap" :class="{ 'font-weight-bold': step === 1 }">Select Transport</span>
                    </div>
                    <v-divider class="mx-4"></v-divider>
                    <div class="d-flex align-center flex-shrink-0">
                        <v-avatar :color="step >= 2 ? 'primary' : 'grey-lighten-1'" size="28">
                            <span class="text-body-2 text-white">2</span>
                        </v-avatar>
                        <span class="ml-2 text-no-wrap" :class="{ 'font-weight-bold': step === 2 }">Assign Pallets</span>
                    </div>
                </div>
                
                <div v-if="step === 1" class="mb-4 mt-4">
                    <v-radio-group v-model="selectedTransport" hide-details="auto">
                        <v-table density="compact" class="border rounded">
                            <thead>
                                <tr>
                                    <th class="text-center" style="width: 60px;"></th>
                                    <th>Transport Number</th>
                                    <th>Driver</th>
                                    <th>Plate Number</th>
                                    <th>Picked Batch</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="option in transportOptions" :key="option.transport_id || option.transaction_item_id">
                                    <td class="text-center">
                                        <v-radio :value="option" color="primary" density="compact"></v-radio>
                                    </td>
                                    <td>{{ getTransportNumber(option) }}</td>
                                    <td>{{ getDriverName(option) }}</td>
                                    <td>{{ getPlateNumber(option) }}</td>
                                    <td>{{ getPickedBatch(option) }}</td>
                                </tr>
                                <tr v-if="transportOptions.length === 0">
                                    <td colspan="5" class="text-center text-grey py-4">No transport options found.</td>
                                </tr>
                            </tbody>
                        </v-table>
                    </v-radio-group>
                </div>

                <template v-else>
                    <div class="d-flex align-center mb-2 mt-3">
                        <span class="ml-3 font-weight-bold">Transport: {{ getTransportNumber(selectedTransport) }}</span>
                        <v-spacer></v-spacer>
                        <span class="ml-3 font-weight-bold">Batch: {{ getPickedBatch(selectedTransport) }}</span>
                    </div>

                    <v-row align="center" class="mb-2 mt-3">
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
                                <template #item="{ props, item }">
                                    <v-list-item
                                        v-bind="props"
                                        class="pallet-option-item"
                                        lines="three"
                                        :title="item.raw.physical_id || 'N/A'"
                                    >
                                        <template #subtitle>
                                            <div class="pallet-option-subtitle">
                                                <div>{{ getPlantLabel(item.raw) }}</div>
                                                <div>Current Batch: {{ item.raw.batch || 'N/A' }}</div>
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
                        <template #item.current_batch="{ item }">
                            {{ item.batch || item?.inventory?.batch || '-' }}
                        </template>
                        <template #item.actions="{ item }">
                            <v-btn 
                                icon="ri-delete-bin-line" 
                                size="small" 
                                :color="item.is_assigned ? 'error' : 'warning'" 
                                variant="text" 
                                :title="item.is_assigned ? 'Remove assigned pallet' : 'Remove from list'"
                                @click="removePallet(item)"
                            ></v-btn>
                        </template>
                        <template #no-data>
                            <div class="pa-4 text-center text-grey">
                                No pallets assigned. Search and add pallets above.
                            </div>
                        </template>
                    </v-data-table>
                </template>
            </v-card-text>

            <v-divider></v-divider>

            <v-card-actions class="pa-4">
                <v-btn v-if="step === 2" variant="outlined" @click="goBackToTransportStep">Back</v-btn>
                <v-spacer></v-spacer>
                <v-btn variant="outlined" @click="dialogVisible = false">Cancel</v-btn>
                <v-btn v-if="step === 1" color="primary" variant="elevated" @click="goToPalletStep" :disabled="!selectedTransport">Next</v-btn>
                <v-btn v-else color="primary" variant="elevated" @click="handleSave" :loading="loading" :disabled="!selectedTransport">Save Changes</v-btn>
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
