<script setup>
import ApiService from '@/services/ApiService';
import { useGoodsReceiptStore } from '@/stores/goodsReceiptStore';
import { debounce } from 'lodash';
import { storeToRefs } from 'pinia';
import { ref, watch } from 'vue';

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
    stockTransferId: {
        type: [String, Number],
        default: null
    }
});

const emit = defineEmits(['close', 'save']);

const dialogVisible = ref(props.show);
const selectedPallet = ref(null);
const addedPallets = ref([]);
const availableBlocks = ref([]);
const selectedBlock = ref(null);
const isLoadingBlocks = ref(false);
const availablePallets = ref([]);
const isLoading = ref(false);
const search = ref('');

const headers = [
    { title: 'Pallet Code', key: 'pallet_code' },
    { title: 'Physical ID', key: 'name' },
    { title: 'Actions', key: 'actions', sortable: false }
];

const maxPallets = ref(0);
const materialConversionLoading = ref(false);

const fetchMaterialConversion = async () => {
    if (!props.item) return;
    
    materialConversionLoading.value = true;
    try {
        const payload = {
            material_code: props.item.MATERIAL,
            code: props.item.BATCH,
            quantity: props.item.ENTRY_QNT
        };
        const response = await ApiService.post('/stock-transfers/get-material-conversion', payload);
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

const fetchBlocks = async () => {
    // Prioritize filter values, fallback to item props
    const sloc = filters.value.storageLocation?.code || props.item?.STGE_LOC;
    
    if (!sloc) return;
    
    isLoadingBlocks.value = true;
    try {
        const payload = {
            storage_location: sloc,
            plant_code: filters.value.plant?.plant_code || props.item?.PLANT || '2155'
        };
        const response = await ApiService.post('/stock-transfers/get-blocks', payload);
        availableBlocks.value = response.data; // Assuming response is array of objects { id, label, ... }
    } catch (error) {
        console.error('Failed to fetch blocks:', error);
    } finally {
        isLoadingBlocks.value = false;
    }
};

const fetchPallets = async (query = '') => {
    isLoading.value = true;
    try {
        const payload = {
            name: query, 
            page: 1,
            per_page: 20,
            plant_code: filters.value.plant?.plant_code || props.item?.PLANT || '2155'
        };
        const response = await ApiService.post('/stock-transfers/pallet-list', payload);
        availablePallets.value = response.data.data;
    } catch (error) {
        console.error('Failed to fetch pallets:', error);
    } finally {
        isLoading.value = false;
    }
};

const fetchAssignedPallets = async () => {
    if (!props.item || !props.stockTransferId) return;

    try {
        const payload = {
            stock_transfer_id: props.stockTransferId,
            material_document: props.item.MAT_DOC,
            line_item: props.item.MATDOC_ITM
        };
        const response = await ApiService.post('stock-transfers/get-assigned-pallets', payload);
        
        if (response.data && Array.isArray(response.data)) {
            addedPallets.value = response.data.map(log => {
                return {
                    id: log.rfid_pallet?.id,
                    pallet_code: log.rfid_pallet?.pallet_code,
                    name: log.rfid_pallet?.name,
                    // Keep original log data if needed, but for table display this is enough
                };
            }).filter(p => p.id); // Filter out any undefined pallets
        }
    } catch (error) {
        console.error("Failed to fetch assigned pallets", error);
    }
};

const debouncedFetchPallets = debounce((query) => {
    fetchPallets(query);
}, 500);

watch(() => props.show, (newVal) => {
    dialogVisible.value = newVal;
    if (newVal) {
        // Reset state when opening
        selectedPallet.value = null;
        addedPallets.value = []; 
        search.value = '';
        selectedBlock.value = null; // Reset block selection
        maxPallets.value = 0; // Reset max pallets
        fetchPallets(); // Load initial data
        fetchBlocks(); // Fetch blocks
        fetchMaterialConversion(); // Fetch conversion
        fetchAssignedPallets(); // Fetch existing assignments
    }
});

watch(() => dialogVisible.value, (newVal) => {
    if (!newVal) {
        emit('close');
    }
});

watch(search, (newVal) => {
    if (newVal !== selectedPallet.value?.pallet_code) { // Avoid refetching when selecting an item
         debouncedFetchPallets(newVal);
    }
});

const addPallet = () => {
    if (selectedPallet.value) {
        // Check limit
        if (maxPallets.value > 0 && addedPallets.value.length >= maxPallets.value) {
            // Optional: User feedback, though button should be disabled
            return; 
        }

        // Check if already added
        const exists = addedPallets.value.find(p => p.id === selectedPallet.value.id);
        if (!exists) {
            addedPallets.value.push(selectedPallet.value);
            selectedPallet.value = null; // Reset selection
            search.value = ''; // Reset search
        }
    }
};

const removePallet = (item) => {
    addedPallets.value = addedPallets.value.filter(p => p.id !== item.id);
};

const handleSave = () => {
    emit('save', {
        pallets: addedPallets.value,
        block_id: selectedBlock.value?.id,
        storage_location_id: selectedBlock.value?.storage_location_id // Optional if available in block data
    });
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
                <div v-if="item" class="mb-4 pa-3 bg-grey-lighten-4 rounded">
                   <div class="d-flex justify-space-between align-center">
                        <div>
                            <div><strong>Material:</strong> {{ item.MATERIAL }}</div>
                            <div><strong>Batch:</strong> {{ item.BATCH }}</div>
                            <div><strong>Qty:</strong> {{ item.ENTRY_QNT }} {{ item.ENTRY_UOM }}</div>
                        </div>
                        <div v-if="materialConversionLoading">
                           <v-progress-circular indeterminate size="20" width="2" color="primary"></v-progress-circular> Calculating limit...
                        </div>
                        <div v-else class="text-right">
                             <div class="text-caption text-grey">Pallet Limit</div>
                             <div class="text-h6" :class="{'text-error': addedPallets.length >= maxPallets && maxPallets > 0, 'text-success': addedPallets.length < maxPallets}">
                                {{ addedPallets.length }} / {{ maxPallets > 0 ? maxPallets : '∞' }}
                             </div>
                        </div>
                   </div>
                </div>

                <v-row>
                    <v-col cols="12">
                        <v-autocomplete
                            v-model="selectedBlock"
                            :items="availableBlocks"
                            :loading="isLoadingBlocks"
                            item-title="label"
                            item-value="id"
                            label="Target Bin / Block"
                            variant="outlined"
                            density="compact"
                            hide-details
                            placeholder="Select Target Bin / Block"
                            return-object
                        ></v-autocomplete>
                    </v-col>
                </v-row>

                <v-row align="center" class="mb-2">
                    <v-col cols="12" md="8">
                        <v-autocomplete
                            v-model="selectedPallet"
                            v-model:search="search"
                            :items="availablePallets"
                            :loading="isLoading"
                            item-title="pallet_code"
                            item-value="id"
                            label="Search Pallet"
                            return-object
                            variant="outlined"
                            density="compact"
                            hide-details
                            placeholder="Type to search..."
                            no-filter
                            :disabled="maxPallets > 0 && addedPallets.length >= maxPallets"
                        >
                            <template #item="{ props, item }">
                                <v-list-item
                                    v-bind="props"
                                    :title="item.raw.pallet_code"
                                    :subtitle="item.raw.name"
                                ></v-list-item>
                            </template>
                        </v-autocomplete>
                    </v-col>
                    <v-col cols="12" md="4">
                        <v-btn color="primary" block @click="addPallet" :disabled="!selectedPallet || (maxPallets > 0 && addedPallets.length >= maxPallets)">
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
                    <template #item.actions="{ item }">
                        <v-btn 
                            icon="ri-delete-bin-line" 
                            size="small" 
                            color="error" 
                            variant="text" 
                            @click="removePallet(item)"
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
                <v-btn color="primary" variant="elevated" @click="handleSave" :loading="loading">Save Changes</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<style scoped>
/* Custom styles if needed */
</style>
