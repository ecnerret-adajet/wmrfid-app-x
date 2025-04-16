<script setup>
import DefaultModal from '@/components/DefaultModal.vue';
import Loader from '@/components/Loader.vue';
import Toast from '@/components/Toast.vue';
import { convertSlugToOriginal } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import axios from 'axios';
import { reactive } from 'vue';
import { GridItem, GridLayout } from 'vue-grid-layout-v3';
import { useRoute, useRouter } from 'vue-router';

const state = reactive({
    layout: [],
    draggable: true,
    resizable: true,
    colNum: 148,
    index: 0,
    inventories: null,
    inventoriesCount: 0
});

const route = useRoute();
const router = useRouter();
const storageLocation = route.params.location;
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
    title: null,
    type: 'block' // default block
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
            params: { storageLocation }
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
            isResizable: item.is_resizable || item.is_resizable == 1 ? true : false,
            inventories: item.inventories || null,
            inventoriesCount: item.inventories_count || 0
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
        x: (state.layout.length * 2) % (state.colNum || 12),
        y: 0, // puts it at the bottom
        w: 3,
        h: 2,
        i: state.index,
        index: state.index,
        label: null,
        title: null,
        isResizable: false,
        type: 'block',
        lot_id: null,
        inventories: null,
        inventoriesCount: 0,
    });
    // Increment the counter to ensure key is always unique.
    state.index++;
}

function addLot() {
    const newLot = {
        x: (state.layout.length * 2) % (state.colNum || 12),
        y: 0, 
        w: 6, 
        h: 2,
        i: state.index,
        index: state.index,
        label: null,
        title: null,
        lot_id: null,
        isResizable: true, // Allow resizing
        type: 'lot'
    };

    state.layout.push(newLot);
    state.index++;
}

const lots = computed(() => state.layout.filter(item => item.type === 'lot' && item.label !== null));

const save = async () => {
    saveLoading.value = true
    const validation = checkItemsIfValid();
    if (state.layout.length > 0 && validation.valid) {
        try {
            const payload = {
                storage_location: storageLocation,
                items: state.layout,
                removedItems : removedItems 
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

    return { valid: true, message: '' };
};

const showBlockInformation = (item) => {
    selectedBlock.value = item;
    showBlockDetailsModal.value = true;
}

const openEditModal = (item) => {
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
    actionDialog.value = true;
}

const actionForm = ref(null);

const removeItem = () => {
    if (selectedItem.type == 'lot') {
        warningModalOpen.value = true;
    } else {
        proceedRemove();
    }
};

const proceedRemove = () => {
    // Find all blocks associated with the selected lot
    const lotAndBlocks = state.layout.filter(item => item.lot_id === selectedItem.lot_id);

    // Filter out removed items
    state.layout = state.layout.filter(item => item.i !== selectedItem.i && item.lot_id !== selectedItem.lot_id);
    removedItems.push(...lotAndBlocks);
    actionDialog.value = false; // Close dialog after removing
    if (warningModalOpen.value) {
        warningModalOpen.value = false;
    }
}

const saveEdit = () => {
    if (actionForm.value.isValid) {
        const item = state.layout.find(obj => obj.i === selectedItem.i);
        
        if (!item) return;
        
        if (item) {
            item.label = selectedItem.label;
            item.title = selectedItem.label;
            item.lot_id = selectedItem.lot_id;
        }
        actionDialog.value = false;
    }
}

const clearItems = () => {
    state.layout = [];
    selectedItem.i = null;
    selectedItem.label = null;
    selectedItem.type = null;
    selectedItem.x = null;
    selectedItem.y = null;
    selectedItem.w = null;
    selectedItem.h = null;
    selectedItem.index = null;
    selectedItem.lot_id = null;
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
    
    // Toggle edit mode
    editEnabled.value = !editEnabled.value;
};

const handleBack = () => {
    router.push({
        path: `/warehouse`,
    });
}
</script>

<template>
    <v-card class="mx-4 mt-3 px-3 py-4" style="border-radius: 0px !important;">
        <div>
            <v-btn @click="handleBack()"
                class="ma-2"
                color="grey-700"
                icon="ri-arrow-left-line"
                variant="text"
            ></v-btn>
        </div>
        <v-card-title class="d-flex justify-space-between align-center">
            <h3 class="font-weight-black">{{ convertSlugToOriginal(storageLocation) }} Map</h3>
            <div class="d-flex justify-end">
                <v-btn color="primary-2" 
                    @click="editCancelClicked"
                    :variant="editEnabled ? 'outlined' : 'flat'"
                    :class="editEnabled ? 'text-primary-2' : 'text-grey-100'"
                    class="px-12 mr-2">
                    {{ editEnabled ? 'Cancel' : 'Edit'}}
                </v-btn>
                <v-btn color="primary" :loading="saveLoading" class="px-12" :disabled="state.layout.length === 0" @click="save">Save</v-btn>
            </div>
        </v-card-title>

        <v-card-text class="mt-4">
            <VList lines="one" density="compact" class="mt-4">
                    <VListItem>
                        <VRow class="table-row" no-gutters>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 text-uppercase font-weight-black" style="margin-top: 1px;">Plant</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium">{{ storageLocationModel?.plant?.name ?? '--' }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 text-uppercase font-weight-black" style="margin-top: 1px;">Plant Code</span>
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
                                        <span class="text-h6 text-uppercase font-weight-black " style="margin-top: 1px;">Location</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium">
                                            {{ storageLocationModel?.plant?.address ?? '--' }}
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
    <GridLayout class="border mx-4 mt-2"
        v-model:layout="state.layout"
        v-if="state.layout.length > 0"
        :col-num="148"
        :row-height="15"
        style="min-height: 200px;"
        :is-draggable="editEnabled"
        :is-resizable="false"
        :responsive="false"
        :vertical-compact="false"
        :prevent-collision="true"
        :use-css-transforms="true"
        :margin="[1, 1]"
    >
        <GridItem
            v-for="item in state.layout"
            :key="item.i"
            :static="item.static"
            :x="item.x"
            :y="item.y"
            :class="{
                'cursor-grabbing': editEnabled,
                'cursor-pointer': !editEnabled && item.type !== 'lot',
                'cursor-default bg-primary-light': item.type === 'lot',
            }"
            :w="item.w"
            :h="item.h"
            :i="item.i"
            :min-w="2.5"
            :min-h="2"
            @dblclick="editEnabled && openEditModal(item)"
            :is-resizable="item.isResizable && editEnabled"
        >
            <span class="text">{{item.label}}</span>
        </GridItem>
    </GridLayout>
    <div v-else 
        class="d-flex justify-center align-center mx-4 border py-2 mt-4"
        style="min-height: 200px; display: flex; text-align: center;">
        <span class="text-h5">No map preview yet. Create now by clicking on 'Edit' button on the top right.</span>
    </div>
    <Loader :show="showLoader"/>
    <v-dialog v-model="actionDialog" persistent max-width="500">
        <v-card>
            <v-form @submit.prevent="saveEdit" ref="actionForm">
                <v-card-title>Edit Item</v-card-title>
                <v-select v-if="selectedItem.type == 'block'" class="mt-4 mx-5" label="Select Lot" density="compact"
                    :items="lots" v-model="selectedItem.lot_id" 
                    :rules="[value => !!value || 'Please select lot from the list']"
                >
                </v-select>
                <v-card-text class="mt-5">
                    <v-text-field v-model="selectedItem.label" label="Enter label" type="text"></v-text-field>
                </v-card-text>
                <v-card-actions>
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
            <h4 class="mt-4 text-h4">Removing a lot will also remove blocks associated with this lot. Do you want to proceed?</h4>
          
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
    <Toast :show="toast.show" :color="toast.color" :message="toast.message" @update:show="toast.show = $event"/>
</template>

<style scoped>

.vue-grid-layout {
    margin: 0;
    padding: 0;
}

.vue-grid-item {
    margin-left: 0 !important; /* Remove left margin */
    margin-right: 0 !important; /* Remove right margin */
    padding: 0 !important;
}

.vue-grid-item:not(.vue-grid-placeholder) {
    background: #b9bbba;
    border: 1px solid black;
}

:deep(.vue-grid-item.vue-grid-placeholder) {
    background: rgb(159, 182, 159);
}

.vue-grid-item .text {
    font-size: 16px;
    color: white;
    text-align: center;
    position: absolute;
    top: 3px;
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
    background: #ddd;
    border: 1px solid black;
    margin-top: 10px;
    padding: 3px;
}

</style>


