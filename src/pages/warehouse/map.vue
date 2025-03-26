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
    colNum: 144,
    index: 0,
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

// Controls
const editEnabled = ref(false)
const initialLayout = ref([]);

onMounted(() => {
    state.index = state.layout.length;
    fetchMapData();
});

const selectedItem = reactive({
    label: '',
    i: null,
    x: null,
    y: null,
    w: null,
    h: null,
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
            x: item.x || 0, // Default to 0 if x is not provided
            y: item.y || 0, // Default to 0 if y is not provided
            w: item.w || 2, // Default width
            h: item.h || 2, // Default height
            label: item.label || 'Unnamed', // Use name from API
            type: item.type || 'unknown', 
            isResizable: item.is_resizable || item.is_resizable == 1 ? true : false,
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
        w: 2,
        h: 2,
        i: state.index,
        label: null,
        isResizable: false,
        type: 'block'
    });
    // Increment the counter to ensure key is always unique.
    state.index++;
}

function addLot() {
    state.layout.push({
        x: (state.layout.length * 2) % (state.colNum || 12),
        y: 0, 
        w: 2, 
        h: 2,
        i: state.index,
        label: null,
        isResizable: true, // Allow resizing
        type: 'lot'
    });
    state.index++;
}

const save = async () => {
    saveLoading.value = true
    if (state.layout.length > 0 && checkItemsIfValid()) {
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
            // isLoading.value = false;
        }

    } else {
        toast.message = 'All blocks should have a label';
        toast.show = true;
    }
}

const checkItemsIfValid = () => {
    return !state.layout.some(item => !item.label || item.label.trim() === "");
}

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
    actionDialog.value = true;
}

const removeItem = () => {
    state.layout = state.layout.filter(item => item.i !== selectedItem.i);
    removedItems.push(selectedItem)
    actionDialog.value = false; // Close dialog after removing
};

const saveEdit = () => {
    const item = state.layout.find(obj => obj.i === selectedItem.i);

    if (!item) return;
    
    if (item) {
        item.label = selectedItem.label;
    }
    actionDialog.value = false;
}

const clearItems = () => {
    state.layout = [];
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
</script>

<template>
    <v-card class="mx-4 mt-3 px-3 py-4" style="border-radius: 0px !important;">
        <v-card-title class="d-flex justify-space-between align-center">
            <h3 class="font-weight-black">{{ convertSlugToOriginal(storageLocation) }} Warehouse Map</h3>
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
        :col-num="144"
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
            :class="editEnabled ? 'cursor-grabbing' : 'cursor-pointer'"
            :w="item.w"
            :h="item.h"
            :i="item.i"
            @click="!editEnabled && showBlockInformation(item)"
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
    <v-dialog v-model="actionDialog" persistent max-width="400">
        <v-card>
            <v-card-title>Edit Item</v-card-title>
            <v-card-text class="mt-4">
                <v-text-field v-model="selectedItem.label" label="Enter label" type="text"></v-text-field>
            </v-card-text>
            <v-card-actions>
                <v-btn color="error" text @click="removeItem">Remove</v-btn>
                <v-spacer></v-spacer>
                <v-btn color="secondary" text @click="actionDialog = false">Cancel</v-btn>
                <v-btn color="primary" text @click="saveEdit">Save</v-btn>
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
    background: #00833c;
    border: 1px solid black;
}

:deep(.vue-grid-item.vue-grid-placeholder) {
    background: green;
}

.vue-grid-item .text {
    font-size: 16px;
    color: white;
    text-align: center;
    position: absolute;
    top: 0;
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


