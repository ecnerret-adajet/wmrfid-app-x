<script setup>
import Toast from '@/components/Toast.vue';
import axios from 'axios';
import { computed, onMounted, reactive, watch } from 'vue';
import { GridItem, GridLayout } from 'vue-grid-layout-v3';

const props = defineProps({
    plantCode: String,
    storageLocation: String,
    selectedBatches: Array,
    selectedPallets: {
        type: Array,
        default: () => []
    }
});

const selectedPallets = ref([...props.selectedPallets]);

const state = reactive({
    layout: [],
    draggable: true,
    resizable: true,
    colNum: 40,
    index: 0,
    inventories: null,
    inventoriesCount: 0,
    layers: [],
    lot: null,
    id: null,
    max_layer_count: 3,
    legend_only: false
});

const toast = ref({
    message: 'Pallet selected',
    color: 'success',
    show: false
});

const emit = defineEmits(['update:selectedPallets']);

const assignPallet = (inventory) => {
    toast.value.show = false
    const existingPallet = selectedPallets.value.find(p => p.physical_id === inventory.physical_id);
   
    if (existingPallet) {
        // Pallet found, so remove it and show a removal message.
        selectedPallets.value = selectedPallets.value.filter(p => p.physical_id !== inventory.physical_id);
        toast.value.message = `PHYSICAL ID ${inventory.physical_id} has been removed from the selected pallets.`;
        toast.value.color = 'warning'; // Or a different color like 'warning'
        toast.value.show = true;
    } else {
        
        const batch = props.selectedBatches.find(b => b.BATCH === inventory.batch);
        
        if (batch) {
            // Count how many pallets from this batch are already selected.
            const selectedCountForBatch = selectedPallets.value.filter(p => p.batch === inventory.batch).length;

            // Check if adding this pallet will exceed the batch's limit.
            if (selectedCountForBatch >= batch.pallet_quantity) {
                toast.value.message = `Cannot add more than ${batch.pallet_quantity} pallets for batch ${inventory.batch}.`;
                toast.value.color = 'error';
                toast.value.show = true;
                return; 
            }
        }

        selectedPallets.value = [...selectedPallets.value, inventory];
        toast.value.message = `PHYSICAL ID ${inventory.physical_id} has been added to the selected pallets.`;
        toast.value.color = 'primary';
        toast.value.show = true;
    }
    emit('update:selectedPallets', selectedPallets.value);
};

watch(
    () => props.selectedPallets,
    (newVal) => {
        selectedPallets.value = [...newVal];
    },
    { deep: true }
);


const isSelected = (inventory) => {
    return selectedPallets.value.some(p => p.physical_id === inventory.physical_id);
};

onMounted(() => {
    state.index = state.layout.length;
    fetchStorageLocationInformation()
})

const filteredLayout = computed(() => {
    // Create a Set for efficient batch lookup
    const selectedBatchesSet = new Set(props.selectedBatches.map(b => b.BATCH));
    const hasSelectedBatches = selectedBatchesSet.size > 0;

    // Create a Set of selected physical IDs for efficient pallet selection lookup
    const selectedPalletsSet = new Set(selectedPallets.value.map(p => p.physical_id));

    // If no batches are selected, return default states
    if (!hasSelectedBatches) {
        return state.layout.map(item => {
            // Even if no batch filters are on, check if this block contains manually selected pallets
            const hasSelectedPallets = item.inventories 
                ? item.inventories.some(inv => selectedPalletsSet.has(inv.physical_id))
                : false;

            return { 
                ...item, 
                dimmed: false, 
                clickable: true, 
                isFullyReserved: false,
                isAvailable: false,
                hasSelectedPallets
            };
        });
    }

    return state.layout.map(item => {
        let matchedByBatch = false;
        let isFullyReserved = false;
        let hasSelectedPallets = false;

        if (item.type === 'block' && item.inventories && item.inventories.length > 0) {

            // Check if any inventory item in this block has been clicked/selected by the user
            hasSelectedPallets = item.inventories.some(inventory => 
                selectedPalletsSet.has(inventory.physical_id)
            );

            // Get only the inventories that match the selected batches
            const matchingInventories = item.inventories.filter(inventory =>
                selectedBatchesSet.has(inventory.batch)
            );

            matchedByBatch = matchingInventories.length > 0;

            // Check reservation status ONLY if the batch matches
            if (matchedByBatch) {
                isFullyReserved = matchingInventories.every(inventory => inventory.is_reserved === 1);
            }
        }

        // NEW HIERARCHY LOGIC:
        // 1. If it has manually selected pallets, it turns BLUE (hasSelectedPallets = true).
        //    We turn off orange/green flags for this block so styles don't conflict.
        // 2. If not selected, and it's fully reserved, it turns ORANGE.
        // 3. If not selected, not reserved, and batch matches, it turns GREEN.
        const finalSelected = hasSelectedPallets;
        const finalFullyReserved = !finalSelected && isFullyReserved;
        const isAvailable = !finalSelected && matchedByBatch && !finalFullyReserved; 

        // Keep clickable rules tied to batch matching
        const clickable = matchedByBatch;

        return {
            ...item,
            dimmed: !matchedByBatch, 
            clickable,
            isFullyReserved: finalFullyReserved,
            isAvailable,
            hasSelectedPallets: finalSelected
        };
    });
});


const mapLoading = ref(false);
const fetchStorageLocationInformation = async () => {
    state.layout = [];
    mapLoading.value = true;
    try {
        const response = await axios.get(`batch-picking/get-map-information/${props.plantCode}/${props.storageLocation}`);

        state.layout = response.data?.blocks?.map((item, index) => ({
            i: String(index),
            x: item.x || 0, // Default to 0 if x is not provided
            y: item.y || 0, // Default to 0 if y is not provided
            w: item.w || 3, // Default width
            h: item.h || 2, // Default height
            label: item.label || 'Unnamed', // Use name from API
            type: item.type || 'unknown',
            isResizable: item.is_resizable || item.is_resizable == 1 ? true : false,
            inventories: item.inventories || null,
            inventoriesCount: item.inventories_count || 0,
            layers: item.layers || [],
            lot: item.lot || null,
            id: item.id || null,
            under_fumigation: item.under_fumigation,
            max_layer_count: item.max_layer_count || 3,
            legend_only: item.legend_only == 1 ? true : false,
        }));

        state.index = state.layout.length;
    } catch (error) {
        console.error('Error fetching data:', error);
    } finally {
        mapLoading.value = false;
    }
};

const selectedBlock = ref(null)
const showBlockDetails = ref(false)
const selectedLayerIndex = ref(-1)
function handleBlockClick(item) {
    selectedBlock.value = item;
    showBlockDetails.value = true;
}

const isBatchDisabled = batch => !props.selectedBatches.some(selected => selected.BATCH === batch);

</script>

<template>
    <div class="grid-scroll-wrapper">
        <v-progress-linear v-if="mapLoading" indeterminate color="primary"></v-progress-linear>
        <GridLayout class="border mt-2 grid-layout" v-model:layout="filteredLayout"
            v-else :col-num="130" :row-height="25" style="min-height: 200px;"
            :is-draggable="false" :is-resizable="false" :responsive="false" :vertical-compact="false"
            :prevent-collision="true" :use-css-transforms="true" :margin="[2, 0]">
            <GridItem v-for="item in filteredLayout" :key="item.i" :static="item.static" :x="item.x" :y="item.y"
                :w="item.w" :h="item.h" :i="item.i" :min-w="2.5" :min-h="2" :class="{
                    'cursor-pointer': item.type !== 'lot' && item.clickable,
                    'bg-legend': item.type === 'lot' && (item.legend_only === true),
                    'bg-primary-light': item.type === 'lot' && !item.legend_only,
                    'under-fumigation': item.under_fumigation,
                    'selected-blue': item.hasSelectedPallets,
                    'fully-reserved-block': item.isFullyReserved, /* Hierarchy Step 1: Orange */
                    'available-green': item.isAvailable,           /* Hierarchy Step 2: Green */
                }" @click="item.type !== 'lot' && item.clickable && handleBlockClick(item)"
                :is-resizable="false">

                <div v-if="item.type === 'lot' && (item.legend_only || item.legend_only === true)"
                    class="legend-text">
                    {{ item.label }}
                </div>

                <div v-else class="text">
                     {{ item.label }}
                </div>
            </GridItem>
        </GridLayout>
    </div>

    <v-dialog v-model="showBlockDetails" max-width="1000px" persistent>
        <v-card elevation="2">
            <v-card-title class="d-flex justify-space-between align-center mx-4 px-4 mt-6">
                <div class="text-h4 font-weight-bold ps-2 text-primary">
                    Bin Information
                </div>
                <p class="text-h3 font-weight-black text-grey-700">{{ selectedBlock.lot?.label }} - {{ selectedBlock.label }}</p>
            </v-card-title>
            <v-card-text>
                <div class="px-4 mt-4 mx-2 text-h5">
                    <VList class="py-0 mt-3" lines="two" border rounded density="compact">
                        <template v-for="(layer, index) of selectedBlock.layers" :key="layer.layer_name">
                            <VListItem
                                class="py-0 px-0"
                                :class="[
                                    selectedLayerIndex === index ? 'bg-primary-light' : 'bg-transparent',
                                    layer.assigned_inventory &&
                                    (
                                        isBatchDisabled(layer.assigned_inventory.batch) ||
                                        (
                                            layer.assigned_inventory.is_reserved &&
                                            layer.assigned_inventory.delivery_reserved_pallet?.cancelled_at === null
                                        )
                                    )
                                        ? 'v-list-item--disabled'
                                        : ''
                                ]"
                                :disabled="
                                    !!layer.assigned_inventory &&
                                    (
                                        Boolean(isBatchDisabled(layer.assigned_inventory.batch)) ||
                                        (
                                            Boolean(layer.assigned_inventory.is_reserved) &&
                                            layer.assigned_inventory.delivery_reserved_pallet?.cancelled_at === null
                                        )
                                    )
                                "
                            >
                                <template v-if="layer.assigned_inventory">
                                    <VListItem :class="[layer.layer_class,
                                    (selectedLayerIndex === index) ? 'highlighted-item' : '']">
                                        <VListItemTitle>
                                            <div class="assigned-info text-h5 text-grey-800 ">
                                                <div class="assigned-row">
                                                    <span class="label">Batch: </span>
                                                    <span class="value font-weight-bold">{{ layer.assigned_inventory?.batch }}</span>
                                                </div>
                                                <div class="assigned-row">
                                                    <span class="label">Physical ID: </span>
                                                    <span class="value font-weight-bold">{{ layer.assigned_inventory?.physical_id }}</span>
                                                </div>
                                                <div class="assigned-row">
                                                    <span class="label">Quantity: </span>
                                                    <span class="value font-weight-bold">{{ layer.assigned_inventory?.quantity }}</span>
                                                </div>
                                                <div v-if="layer.assigned_inventory.is_reserved && layer.assigned_inventory.delivery_reserved_pallet?.cancelled_at === null" class="assigned-row">
                                                    <span class="label">Reserved: </span>
                                                    <span class="value font-weight-bold">
                                                        {{ layer.assigned_inventory?.delivery_reserved_pallet?.delivery_document }} 
                                                        ({{ layer.assigned_inventory?.delivery_reserved_pallet?.sap_delivery?.ship_to_name ?? '—' }})
                                                    </span>
                                                </div>
                                            </div>
                                        </VListItemTitle>
                                        <template #append>
                                            <div class="d-flex gap-1">
                                                <v-btn
                                                    @click="assignPallet(layer.assigned_inventory)"
                                                    :color="isSelected(layer.assigned_inventory) ? 'primary-light' : 'success'"
                                                >
                                                    {{ isSelected(layer.assigned_inventory) ? 'Selected' : '&nbsp Assign &nbsp' }}
                                                </v-btn>
                                            </div>
                                        </template>
                                    </VListItem>
                                    <VDivider v-if="index !== selectedBlock.layers - 1" />
                                </template>
                                <template v-if="!layer.assigned_inventory">
                                    <VListItem>
                                        <VListItemTitle>
                                            <span :class="selectedLayerIndex === index ? 'text-grey-100' : 'text-grey-700'"
                                                class="text-h5 font-weight-bold">Empty</span>
                                        </VListItemTitle>
                                    </VListItem>
                                    <VDivider v-if="index !== selectedBlock.layers - 1" />
                                </template>
                            </VListItem>
                        </template>
                    </VList>
                </div>
                <div class="d-flex justify-end mt-8">
                    <v-btn color="secondary" @click="showBlockDetails = false" type="button">Close</v-btn>
                </div>
            </v-card-text>
        </v-card>
    </v-dialog>
    <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event"/>
</template>

<style scoped>
.grid-scroll-wrapper {
    overflow-x: auto;
    overflow-y: hidden;
    min-width: 100%;
    min-height: 250px;
}

.grid-layout {
    width: max-content;
    min-width: 2500px;
    /* ensure grid has a minimum visible width */
    min-height: 250px;
}

.dimmed-block {
    opacity: 0.9;
    pointer-events: none;
}

.bg-legend {
    background-color: white !important;
}

.vue-grid-item .legend-text {
    font-size: 16px;
    color: rgb(36, 35, 35);
    position: absolute;
    top: 0px;
    bottom: 0;
    left: 0;
    right: 0;
    height: 100%;
    width: 100%;
    display: flex;
    align-items: center;
    /* Vertically center */
    justify-content: center;
    /* Horizontally center */
    text-align: center;
}

.highlighted-block {
    pointer-events: auto;
    background-color: rgb(45, 71, 6);
    transition: opacity 0.6s ease;
}

.layer-1 {
    color: rgb(39, 39, 39);
}

.layer-2 {
    color: rgb(39, 39, 39);
}

.layer-3 {
    color: rgb(39, 39, 39);
}

.layer-4 {
    color: rgb(39, 39, 39);
}

.empty-layer {
    background-color: #f0edf2;
}

.under-fumigation {
    background-color: #f7897e;
}

.vue-grid-layout {
    margin: 0;
    padding: 5px;
}

.vue-grid-item {
    margin-left: 0 !important;
    /* Remove left margin */
    margin-right: 0 !important;
    /* Remove right margin */
    padding: 0 !important;
}

.vue-grid-item:not(.vue-grid-placeholder) {
    border: 1px solid black;
}

.vue-grid-item .text {
    font-size: 16px;
    text-align: center;
    position: absolute;
    top: 10px !important;
    bottom: 0;
    left: 0;
    right: 0;
    height: 100%;
    width: 100%;
}

.vue-grid-item .remove {
    position: absolute;
    top: 0;
    cursor: pointer;
}

.layoutJSON {
    width: 1200px !important;
    background: #ddd;
    border: 1px solid black;
    margin-top: 10px;
    padding: 1px;
}

.fully-reserved-block {
    background-color: #ffc107 !important; /* Amber/Yellow warning color example */
    border: 2px solid #ff9800 !important;
    color: #000000 !important;
    opacity: 0.85;
}

.available-green {
    background-color: #28a745 !important;
    color: #ffffff !important;
}

.selected-blue {
    background-color: #2196f3 !important; 
    border: 1px solid #0d8aee !important;
    color: #ffffff !important;
    font-weight: bold;
}
</style>
