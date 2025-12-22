<script setup>
import Toast from '@/components/Toast.vue';
import axios from 'axios';
import { computed, onMounted, reactive } from 'vue';
import { GridItem, GridLayout } from 'vue-grid-layout-v3';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const shipment_number = route.params.shipment_number;

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


onMounted(() => {
    state.index = state.layout.length;
    fetchShipmentReservedPallets()
})

const filteredLayout = computed(() => {
  return state.layout.map(item => {
    // determine reserved state: prefer explicit flag, otherwise infer from inventories
    const isReserved = !!(item.is_reserved || item.inventories?.some(inv => inv.is_reserved));

    // Only blocks can be clickable per requirement
    if (item.type === 'block') {
      return { ...item, clickable: isReserved };
    }

    // non-block items: not clickable
    return { ...item, clickable: false };
  });
});

const mapLoading = ref(false);
const fetchShipmentReservedPallets = async () => {
    state.layout = [];
    mapLoading.value = true;
    try {
        const response = await axios.get(`shipments/get-reserved-pallets/${shipment_number}`);
        state.layout = response.data?.warehouse_data?.blocks?.map((item, index) => ({
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
            layers: (item.layers || []).map(l => ({
                ...l,
                // if backend provides is_reserved on layer use it, otherwise infer from assigned_inventory
                is_reserved: (l.assigned_inventory && (l.assigned_inventory?.is_reserved || l.assigned_inventory?.is_reserved == 1)) ? true : false,
                test: l.assigned_inventory?.is_reserved
            })),
            is_reserved: // true if atleast one layer is reserved
                (item.layers || []).some(l => (l.assigned_inventory && (l.assigned_inventory?.is_reserved || l.assigned_inventory?.is_reserved == 1)) ? true : false),
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
                    'reserved': item.is_reserved
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
            </v-card-title>
            <v-card-text>
                <div class="px-4 mt-4 mx-2 text-h5">
                    <VList class="py-0 mt-3" lines="two" border rounded density="compact">
                        <template v-for="(layer, index) of selectedBlock.layers" :key="index">
                            <VListItem class="py-0 px-0" :class="{ reserved: layer.is_reserved }">
                                <template v-if="layer.assigned_inventory">
                                    <VListItem style="color: black;">
                                        <VListItemTitle>
                                        <div class="text-h5 mb-2 font-weight-bold">
                                            <div class="text-black">
                                            <span class="label">Batch: </span>
                                            <span class="value">{{ layer.assigned_inventory?.batch }}</span>
                                            </div>
                                            <div class="text-black">
                                            <span class="label">Physical ID: </span>
                                            <span class="value">{{ layer.assigned_inventory?.physical_id }}</span>
                                            </div>
                                            <div class="text-black">
                                            <span class="label">Quantity: </span>
                                            <span class="value">{{ layer.assigned_inventory?.quantity }}</span>
                                            </div>
                                        </div>
                                        </VListItemTitle>

                                        <template #append>
                                        <div class="d-flex gap-1 align-center">
                                            <span v-if="layer.is_reserved" class="reserved-chip">Reserved</span>
                                        </div>
                                        </template>
                                    </VListItem>
                                    <VDivider v-if="index !== selectedBlock.layers.length - 1" />
                                    </template>

                                    <template v-else>
                                    <VListItem>
                                        <VListItemTitle>
                                        <span :class="selectedLayerIndex === index ? 'text-grey-100' : 'text-grey-900'"
                                                class="text-h5 font-weight-bold">Empty</span>
                                        </VListItemTitle>
                                    </VListItem>
                                    <VDivider v-if="index !== selectedBlock.layers.length - 1" />
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

.bg-legend {
    background-color: white !important;
}

.vue-grid-item .legend-text {
    font-size: 16px;
    color: black;
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


.reserved {
    background-color: rgb(243, 167, 60);
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
</style>
