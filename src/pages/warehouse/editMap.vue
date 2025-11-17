<script setup>
import DefaultModal from '@/components/DefaultModal.vue';
import Loader from '@/components/Loader.vue';
import Toast from '@/components/Toast.vue';
import { convertSlugToUpperCase } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import axios from 'axios';
import { reactive } from 'vue';
import { GridItem, GridLayout } from 'vue-grid-layout-v3';
import { useRoute, useRouter } from 'vue-router';

const state = reactive({
    layout: [],
    draggable: true,
    resizable: true,
    colNum: 130,
    index: 0,
    inventories: null,
    inventoriesCount: 0,
    max_layer_count: 3,
    legend_only: false
});

const route = useRoute();
const router = useRouter();
const storageLocation = route.params.location;
const plantCode = route.params.plant;
const showLoader = ref(false);
const actionDialog = ref(false);
const showBlockDetailsModal = ref(false);
const selectedBlock = ref(null);
const saveLoading = ref(false);
const removedItems = reactive([]);
const storageLocationModel = ref(null);
const warningModalOpen = ref(false);

// Controls
const editEnabled = ref(false)
const initialLayout = ref([]);

onMounted(() => {
    state.index = state.layout.length;
    fetchMapData();
});

const selectedItem = reactive({
    label: '',
    index: '',
    i: null,
    x: null,
    y: null,
    w: null,
    h: null,
    inventories: null,
    inventoriesCount: 0,
    lot_id: null,
    lot_label: null,
    title: null,
    type: 'block', // default block
    blocks: [], // For lot type
    max_layer_count: 3,
    legend_only: false
});

const toast = reactive({
    message: 'All blocks should have a label',
    color: 'error',
    show: false
});

// Fetch the map data from API
const fetchMapData = async () => {
    showLoader.value = true;
    try {
        const response = await axios.get('/warehouse/get-map', {
            params: {
                plantCode: plantCode,
                storageLocation: storageLocation
            }
        });
        const { items, storage_location } = response.data;

        storageLocationModel.value = storage_location

        // Transform API data into GridItem format
        state.layout = items.map((item, index) => ({
            i: String(index),
            x: item.x || 0,
            y: item.y || 0,
            w: item.w || 3,
            h: item.h || 2,
            label: item.label || 'Unnamed',
            title: item.label || 'Unnamed',
            type: item.type || 'unknown',
            index: item.index,
            lot_id: item.lot_id,
            lot_label: item.lot_label,
            isResizable: item.is_resizable || item.is_resizable == 1 ? true : false,
            inventories: item.inventories || null,
            inventoriesCount: item.inventories_count || 0,
            blocks: item.blocks || [],
            max_layer_count: item.max_layer_count || 3,
            legend_only: item.legend_only || item.legend_only == 1 ? true : false,
            id: item.id
        }));

        initialLayout.value = JSON.parse(JSON.stringify(state.layout));
        state.index = state.layout.length;
        showLoader.value = false;
    } catch (error) {
        showLoader.value = false;
        console.error("Error fetching map data:", error);
        router.replace('/404');
    } finally {
        showLoader.value = false;

    }
};

function addItem() {
    state.layout.push({
        x: 0,
        y: 0, // puts it at the bottom
        w: 2,
        h: 2,
        i: state.index,
        index: state.index,
        label: null,
        title: null,
        isResizable: false,
        type: 'block',
        lot_id: null,
        lot_label: null,
        inventories: null,
        inventoriesCount: 0,
    });
    // Increment the counter to ensure key is always unique.
    state.index++;
}

function addLot() {
    const newLot = {
        x: 0,
        y: 0,
        w: 3,
        h: 2,
        i: state.index,
        index: state.index,
        label: null,
        title: null,
        lot_id: null,
        isResizable: true, // Allow resizing
        type: 'lot',
        max_layer_count: 3,
        legend_only: false
    };

    state.layout.push(newLot);
    state.index++;
}

const lots = computed(() => state.layout.filter(item => item.type === 'lot' && item.label !== null && !item.legend_only));

const save = async () => {
    saveLoading.value = true
    const validation = checkItemsIfValid();
    if (state.layout.length > 0 && validation.valid) {
        try {
            const payload = {
                storage_location: storageLocation,
                plant: plantCode,
                items: state.layout,
                removedItems: removedItems
            };

            const response = await ApiService.post('warehouse-mapping/store', payload)
            toast.message = 'Map updated successfully!'
            toast.color = 'success'
            toast.show = true;
            saveLoading.value = false
            editEnabled.value = false
            fetchMapData();
        } catch (error) {
            toast.message = error.response?.data?.message || 'An unexpected error occurred.'
            toast.color = 'error'
            toast.show = true;
            console.error('Error submitting:', error);
            saveLoading.value = false
            editEnabled.value = false
        }

    } else {
        toast.message = validation.message;
        toast.show = true;
        saveLoading.value = false
    }
}

const checkItemsIfValid = () => {
    if (state.layout.some(item => !item.label || item.label.trim() === "")) {
        return { valid: false, message: 'All blocks should have a label' };
    }

    if (state.layout.some(item => item.type === 'block' && (item.lot_id === null || item.lot_id === undefined))) {
        return { valid: false, message: 'All blocks must have a valid lot assigned' };
    }

    if (state.layout.some(item => item.type === 'lot' && (!Number.isFinite(parseInt(item.max_layer_count)) || parseInt(item.max_layer_count) < 1))) {
        return { valid: false, message: 'All lots must have a valid max layer count' };
    }

    return { valid: true, message: '' };
};

const showBlockInformation = (item) => {
    selectedBlock.value = item;
    showBlockDetailsModal.value = true;
}

const openEditModal = (item) => {
    console.log(item);

    selectedItem.i = item.i;
    selectedItem.label = item.label;
    selectedItem.type = item.type;
    selectedItem.x = item.x;
    selectedItem.y = item.y;
    selectedItem.w = item.w;
    selectedItem.h = item.h;
    selectedItem.index = item.index;
    selectedItem.title = item.label;
    selectedItem.lot_id = item.lot_id;
    selectedItem.lot_label = item.lot_label;
    selectedItem.inventories = item.inventories;
    selectedItem.blocks = item.blocks;
    selectedItem.max_layer_count = item.max_layer_count;
    selectedItem.legend_only = item.legend_only;
    actionDialog.value = true;
}

const actionForm = ref(null);

const removeItem = () => {
    if (selectedItem.type === 'lot') {
        const hasInventoryInBlocks = selectedItem.blocks?.some(block => {
            return block.inventories && block.inventories.length > 0;
        });

        if (hasInventoryInBlocks) {
            toast.color = 'error';
            toast.message = 'Cannot remove this lot. One or more blocks have inventories.';
            toast.show = true;
            return;
        }

        warningModalOpen.value = true;
    } else {
        if (selectedItem.inventories && selectedItem.inventories.length > 0) {
            toast.color = 'error';
            toast.message = 'This block cannot be removed because it contains inventories.';
            toast.show = true;
            return;
        }
        proceedRemove();
    }
};

const proceedRemove = () => {
    if (selectedItem.type === 'block') {
        // Remove the selected block
        state.layout = state.layout.filter(item => item.i !== selectedItem.i);
        removedItems.push(selectedItem);
    } else if (selectedItem.type === 'lot') {
        // Get all block from the lot
        const blocks = selectedItem.blocks
        const lotId = blocks?.length > 0 ? blocks[0].lot_id : null;

        // Remove the lot and its blocks from the layout
        state.layout = state.layout.filter(item => {
            // Remove the lot using its unique label
            if (item.type === 'lot' && item.label === selectedItem.label) {
                return false;
            }
            // Remove blocks that belong to this lot
            if (item.type === 'block' && item.lot_id === lotId) {
                return false;
            }
            return true;
        });

        // Push lot and blocks into removedItems
        removedItems.push(selectedItem, ...blocks);
    }

    actionDialog.value = false; // Close dialog after removing
    if (warningModalOpen.value) {
        warningModalOpen.value = false;
    }
}

const saveEdit = () => {
    if (actionForm.value.isValid) {
        const item = state.layout.find(obj => obj.i === selectedItem.i);

        if (!item) return;
        console.log(selectedItem);

        if (item) {
            item.label = selectedItem.label;
            item.title = selectedItem.label;
            item.lot_id = selectedItem.lot_id;
            item.lot_label = selectedItem.lot_label;
            item.max_layer_count = selectedItem.max_layer_count;
            item.legend_only = selectedItem.legend_only;

        }
        actionDialog.value = false;
    }
}

const clearItems = () => {
    state.layout = [];

    // Clear removed items array
    removedItems.splice(0, removedItems.length);

    selectedItem.i = null;
    selectedItem.label = null;
    selectedItem.type = null;
    selectedItem.x = null;
    selectedItem.y = null;
    selectedItem.w = null;
    selectedItem.h = null;
    selectedItem.index = null;
    selectedItem.lot_id = null;
    selectedItem.lot_label = null;
    selectedItem.title = null;
}

const editCancelClicked = () => {
    if (editEnabled.value) {
        // Reset to the saved layout before editing
        state.layout = JSON.parse(JSON.stringify(initialLayout.value));
    } else {
        // Save the current layout before enabling edit mode
        initialLayout.value = JSON.parse(JSON.stringify(state.layout));
    }

    // Clear removed items array
    removedItems.splice(0, removedItems.length);

    // Toggle edit mode
    editEnabled.value = !editEnabled.value;
};

const handleBack = () => {
    router.push({
        path: `/warehouse-map/${plantCode}/${storageLocation}`,
    });
}

</script>


<template>
    <v-card class="mx-4 mt-4 px-3 py-4" style="border-radius: 0px !important;">

        <v-card-title class="d-flex justify-space-between align-center">
            <div class="d-inline-flex align-center">
                <v-btn @click="handleBack()" class="ma-2" color="grey-700" icon="ri-arrow-left-line"
                    variant="text"></v-btn>
                <h3 class="font-weight-black text-uppercase text-primary">{{ convertSlugToUpperCase(storageLocation) }}
                    Map</h3>
            </div>
            <div class="d-flex justify-end">
                <v-btn color="primary-2" @click="editCancelClicked" :variant="editEnabled ? 'outlined' : 'flat'"
                    :class="editEnabled ? 'text-primary-2' : 'text-grey-100'" class="px-12 mr-2">
                    {{ editEnabled ? 'Cancel' : 'Edit' }}
                </v-btn>
                <v-btn color="primary" :loading="saveLoading" class="px-12" :disabled="state.layout.length === 0"
                    @click="save">Save</v-btn>
            </div>
        </v-card-title>

        <v-card-text class="mt-4">
            <VList lines="one" density="compact" class="mt-4">
                <VListItem>
                    <VRow class="table-row" no-gutters>
                        <VCol md="6" class="table-cell d-inline-flex">
                            <VRow class="table-row">
                                <VCol cols="4" class="d-inline-flex align-center">
                                    <span class="text-h6 text-uppercase font-weight-black"
                                        style="margin-top: 1px;">Plant</span>
                                </VCol>
                                <VCol class="d-inline-flex align-center">
                                    <span class="font-weight-medium">{{ storageLocationModel?.plant?.name ?? '--'
                                    }}</span>
                                </VCol>
                            </VRow>
                        </VCol>
                        <VCol md="6" class="table-cell d-inline-flex">
                            <VRow class="table-row">
                                <VCol cols="4" class="d-inline-flex align-center">
                                    <span class="text-h6 text-uppercase font-weight-black"
                                        style="margin-top: 1px;">Plant Code</span>
                                </VCol>
                                <VCol class="d-inline-flex align-center">
                                    <span class="font-weight-medium">
                                        {{ storageLocationModel?.plant?.plant_code ?? '--' }}
                                    </span>
                                </VCol>
                            </VRow>
                        </VCol>
                    </VRow>
                </VListItem>
                <VListItem>
                    <VRow class="table-row" no-gutters>
                        <VCol md="6" class="table-cell d-inline-flex">
                            <VRow class="table-row">
                                <VCol cols="4" class="d-inline-flex align-center">
                                    <span class="text-h6 text-uppercase font-weight-black "
                                        style="margin-top: 1px;">Location</span>
                                </VCol>
                                <VCol class="d-inline-flex align-center">
                                    <span class="font-weight-medium">
                                        {{ storageLocationModel?.plant?.city ?? '--' }}
                                    </span>
                                </VCol>
                            </VRow>
                        </VCol>
                    </VRow>
                </VListItem>

                <!-- Add item as needed  -->
            </VList>
        </v-card-text>
    </v-card>
    <div class="d-flex justify-space-between align-center mx-1 mt-6 px-3">
        <div v-if="editEnabled">
            <v-btn color="primary" variant="outlined" @click="addLot" class="px-8">Add Lot</v-btn>
            <v-btn color="primary" variant="outlined" @click="addItem" class="px-8 ml-3">Add Block</v-btn>
        </div>
        <div v-if="editEnabled">
            <v-btn color="info" variant="outlined" @click="clearItems" class="px-8">Clear</v-btn>
        </div>
    </div>
    <div class="grid-scroll-wrapper" v-if="state.layout.length > 0">
        <GridLayout class="border mx-4 mt-2 grid-layout" v-model:layout="state.layout" :col-num="130" :row-height="20"
            style="min-height: 200px;" :is-draggable="editEnabled" :is-resizable="false" :responsive="false"
            :vertical-compact="false" :prevent-collision="true" :use-css-transforms="true" :margin="[2, 1]">
            <GridItem v-for="item in state.layout" :key="item.i" :static="item.static" :x="item.x" :y="item.y" :class="{
                'cursor-grabbing': editEnabled,
                'cursor-pointer': !editEnabled && item.type !== 'lot',
                'cursor-default bg-legend': item.type === 'lot' && (item.legend_only === true),
                'cursor-default bg-primary-light': item.type === 'lot' && !item.legend_only
            }" :w="item.w" :h="item.h" :i="item.i" :min-w="2.5" :min-h="2"
                @dblclick="editEnabled && openEditModal(item)" :is-resizable="item.isResizable && editEnabled">
                <span v-if="item.type === 'lot' && (item.legend_only || item.legend_only === true)"
                    class="legend-text">{{
                        item.label }}
                </span>
                <span v-else class="text">{{ item.label }}</span>
            </GridItem>
        </GridLayout>
    </div>
    <div v-else class="d-flex justify-center align-center mx-4 border py-2 mt-4"
        style="min-height: 200px; display: flex; text-align: center;">
        <span class="text-h5">No map preview yet. Create now by clicking on 'Edit' button on the top right.</span>
    </div>
    <Loader :show="showLoader" />
    <v-dialog v-model="actionDialog" persistent max-width="500">
        <v-card>
            <v-form @submit.prevent="saveEdit" ref="actionForm">
                <v-card-title>Edit Item</v-card-title>
                <v-autocomplete class="mx-5" v-if="selectedItem.type === 'block'" density="compact" item-title="label" item-value="id"
                    :items="lots" v-model="selectedItem.lot_id"
                    :rules="[value => !!value || 'Please select lot from the list']" />
                <v-card-text class="mt-5">
                    <v-text-field v-model="selectedItem.label" label="Enter label" type="text"></v-text-field>
                </v-card-text>
                <v-card-text v-if="selectedItem.type === 'lot' && selectedItem.legend_only === false">
                    <v-text-field density="compact" label="Max Layer Count" v-model="selectedItem.max_layer_count"
                        type="number" :min="1" :max="10" hint="This sets the level of layer in the group"
                        :rules="[value => !!value || 'Max layer count is required']" />
                </v-card-text>
                <v-checkbox class="mx-5 mb-3" v-if="selectedItem.type === 'lot'" v-model="selectedItem.legend_only"
                    label="Use this as legend only" density="compact"></v-checkbox>
                <v-card-actions class="mt-4">
                    <v-btn color="error" text @click="removeItem">Remove</v-btn>
                    <v-spacer></v-spacer>
                    <v-btn color="secondary" text @click="actionDialog = false">Cancel</v-btn>
                    <v-btn color="primary" text type="submit">Save</v-btn>
                </v-card-actions>
            </v-form>
        </v-card>
    </v-dialog>

    <v-dialog v-model="warningModalOpen" max-width="500">
        <v-card class="py-8 px-6">
            <div class="mx-auto">
                <i class="ri-error-warning-line bg-error" style="font-size: 54px;"></i>
            </div>
            <h4 class="mt-4 text-h4">Removing a lot will also remove blocks associated with this lot. Do you want to
                proceed?</h4>

            <v-card-actions class="mt-5">
                <v-spacer></v-spacer>
                <v-btn color="secondary" variant="flat" @click="warningModalOpen = false">Cancel</v-btn>
                <v-btn color="primary" variant="flat" @click="proceedRemove" type="button">Proceed</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>

    <DefaultModal :dialog-title="'Details'" :show="showBlockDetailsModal" @close="showBlockDetailsModal = false">
        <h1>Show block details, pallets, etc</h1>
        <!-- {{ selectedBlock }} -->
    </DefaultModal>
    <Toast :show="toast.show" :color="toast.color" :message="toast.message" @update:show="toast.show = $event" />
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
    min-width: 2500px; /* ensure grid has a minimum visible width */
    min-height: 250px;
}

/* Ensure grid items are positioned relative so absolutely-positioned children are contained */
.vue-grid-item {
    position: relative;
    margin-left: 0 !important; /* Remove left margin */
    margin-right: 0 !important; /* Remove right margin */
    padding: 0 !important;
    box-sizing: border-box;
}

/* Default background and border for grid items (except placeholders) */
.vue-grid-item:not(.vue-grid-placeholder) {
    background: #b9bbba;
    border: 1px solid black;
}

/* styling for placeholder */
:deep(.vue-grid-item.vue-grid-placeholder) {
    background: rgb(159, 182, 159);
}

/* Make text centered both horizontally and vertically without changing layout height.
   Use inset: 0 to fill the grid item and flexbox to center content. Avoid explicit height/top/bottom. */
.vue-grid-item .text,
.vue-grid-item .legend-text {
    position: absolute;
    inset: 0; /* shorthand for top:0; right:0; bottom:0; left:0; */
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 4px; /* small padding to avoid hugging borders */
    box-sizing: border-box;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    pointer-events: none; /* allows clicks to pass through if needed */
}

/* Appearance differences between normal text and legend text */
.vue-grid-item .text {
    font-size: 16px;
    color: white;
}

.vue-grid-item .legend-text {
    font-size: 16px;
    color: rgb(36, 35, 35);
    background: transparent;
}

/* optional: icon/remove button inside item should be clickable and sit on top */
.vue-grid-item .remove {
    position: absolute;
    top: 2px;
    right: 2px;
    cursor: pointer;
    z-index: 2;
}

/* small utility so legend-only lots can have white background */
.bg-legend {
    background-color: white !important;
}

.layoutJSON {
    background: #ddd;
    border: 1px solid black;
    margin-top: 10px;
    padding: 3px;
}
</style>
