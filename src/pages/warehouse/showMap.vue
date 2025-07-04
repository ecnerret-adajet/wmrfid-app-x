<script setup>
import MapBlockAssignModal from '@/components/MapBlockAssignModal.vue';
import SearchInput from '@/components/SearchInput.vue';
import SmartAssignModal from '@/components/SmartAssignModal.vue';
import Toast from '@/components/Toast.vue';
import { convertSlugToUpperCase } from '@/composables/useHelpers';
import { useAuthStore } from '@/stores/auth';
import axios from 'axios';
import { debounce } from 'lodash';
import { onMounted, reactive, ref } from 'vue';
import { GridItem, GridLayout } from 'vue-grid-layout-v3';
import { useRoute, useRouter } from 'vue-router';

const authStore = useAuthStore();
const props = defineProps({
});

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

const route = useRoute();
const router = useRouter();
const storageLocation = route.params.location;
const plantCode = route.params.plant;
const searchValue = ref(route.query.search || '');
const loading = ref(true);
const mapLoading = ref(true);
const layersData = ref(null);
const isFiltered = ref(false);
const openAssignModal = ref(false);
const storageLocationModel = ref(null);
const smartAssignModal = ref(false);
const selectedBlock = reactive({
    layers: [],
    data: null
})

const toast = ref({
    message: '',
    color: 'success',
    show: false
});

const handleSearch = debounce((search) => {
    searchValue.value = search;
}, 500);

const isFiltering = computed(() => searchValue.value.trim() !== '');

const isMatch = (item) => {
    const search = searchValue.value.toLowerCase();
    if (item.type === 'block') {
        return item.lot?.label?.toLowerCase().includes(search);
    } else if (item.type === 'lot') {
        return item.label?.toLowerCase().includes(search);
    }
    return false;
};

const filteredLayout = computed(() =>
    state.layout.map(item => {
        const matched = isMatch(item);
        return {
            ...item,
            dimmed: isFiltering.value && !matched,
            clickable: matched || !isFiltering.value
        };
    })
);


onMounted(() => {
    state.index = state.layout.length;
    // Check for search query in the route params and set the search value
    if (route.query.search) {
        searchValue.value = route.query.search;
    }
    fetchStorageLocationInformation()
})

const fetchStorageLocationInformation = async () => {
    state.layout = [];
    loading.value = true;
    try {
        const response = await axios.get(`warehouse/get-storage-location-information/${plantCode}/${storageLocation}`);
        const { details } = response.data

        storageLocationModel.value = details.storage_location
        layersData.value = details.layers_data;

        state.layout = details.blocks?.map((item, index) => ({
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
            allowMultipleMaterials: item.storage_location?.blocks_allow_multiple_materials == 1 ? true : false,
            under_fumigation: item.under_fumigation,
            max_layer_count: item.max_layer_count || 3,
            legend_only: item.legend_only == 1 ? true : false,
        }));

        state.index = state.layout.length;
    } catch (error) {
        console.error('Error fetching data:', error);
    } finally {
        loading.value = false;
        mapLoading.value = false;
    }
};



const handleBlockClick = (item) => {
    selectedBlock.data = item;
    selectedBlock.layers = item.layers;
    openAssignModal.value = true;
}

const onAssignSuccess = () => {
    fetchStorageLocationInformation()
    openAssignModal.value = false;
    searchValue.value = '';
    isFiltered.value = false;
    toast.value.message = 'Inventory assigned successfully!';
    toast.value.color = 'success';
    toast.value.show = true;
}

const actionSuccess = (type) => {
    // Set toast message and color based on action type
    const isReturnToMill = type === 'Return to Mill';
    toast.value.message = isReturnToMill
        ? 'Returned to mill successfully!'
        : 'Bin transferred successfully!';
    toast.value.color = 'success';
    toast.value.show = true;

    fetchStorageLocationInformation();

    openAssignModal.value = false;
};

const handleBack = () => {
    router.push({
        path: `/warehouse`,
    });
}

const handleEditMap = () => {
    router.push({
        path: `/warehouse-map/${plantCode}/${storageLocation}/edit`,
    });
}

</script>

<template>
    <v-card elevation="2" class="mx-4 mt-4 px-3 py-4" style="border-radius: 0px !important;">
        <v-card-title class="d-flex justify-space-between align-center">
            <div class="d-inline-flex align-center">
                <v-btn @click="handleBack()" class="ma-2" color="grey-700" icon="ri-arrow-left-line"
                    variant="text"></v-btn>
                <h3 class="font-weight-black text-uppercase text-primary">{{ convertSlugToUpperCase(storageLocation) }}
                    Map</h3>
            </div>
            <div class="d-flex justify-end">
                <v-btn color="primary-light" v-if="authStore.user?.is_super_admin" @click="handleEditMap"
                    class="px-12 mr-2 text-grey-100">
                    Edit Map
                </v-btn>
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
                                        style="margin-top: 1px;">Code</span>
                                </VCol>
                                <VCol class="d-inline-flex align-center">
                                    <span class="font-weight-medium">{{ storageLocationModel?.code ?? '--' }}</span>
                                </VCol>
                            </VRow>
                        </VCol>
                        <VCol md="6" class="table-cell d-inline-flex">
                            <VRow class="table-row">
                                <VCol cols="4" class="d-inline-flex align-center">
                                    <span class="text-h6 text-uppercase font-weight-black"
                                        style="margin-top: 1px;">Plant</span>
                                </VCol>
                                <VCol class="d-inline-flex align-center">
                                    <span class="font-weight-medium">
                                        {{ storageLocationModel?.plant?.name ?? '--' }}
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

                <!-- Add item as needed  -->
            </VList>
        </v-card-text>
        <div class="d-flex justify-end">
            <v-btn color="primary-light" @click="smartAssignModal = true" class="px-8 mr-6 text-grey-100">
                Smart Assign
            </v-btn>
        </div>
    </v-card>
    <v-progress-linear v-if="mapLoading" indeterminate color="primary"></v-progress-linear>
    <div v-else>
        <v-card elevation="2" class="mx-4 mt-2">
            <!-- Main content  -->
            <div class="d-flex align-center justify-space-between px-4">
                <!-- Legend  -->
                <div class="d-flex align-center">
                    <template v-for="(layer, index) in layersData" :key="index">
                        <div :style="{
                            width: '30px',
                            height: '30px',
                            borderRadius: '25px',
                            marginLeft: index > 0 ? '25px' : '0px',
                            marginRight: '5px',
                            backgroundColor: layer.layer === 4 ? '#a06ee2' :
                                (layer.layer === 3 ? '#48a348' :
                                    (layer.layer === 2 ? '#4877f7' : '#eece70'))
                        }"></div>
                        {{ layer.label }}
                    </template>
                    <div style="width: 30px; height: 30px; border-radius: 25px; margin-left: 25px;
                            margin-right: 5px; background-color: #f0edf2">
                    </div>
                    Empty
                    <div style="width: 30px; height: 30px; border-radius: 25px; margin-left: 25px;
                            margin-right: 5px; background-color: #f7897e">
                    </div>
                    Under Fumigation
                </div>

                <div class="d-flex align-center">
                    <SearchInput style="min-width: 300px;" placeholder="Filter by lot" @update:search="handleSearch" />
                </div>
            </div>


            <!-- Map area  -->
            <div class="grid-scroll-wrapper">
                <v-progress-linear v-if="loading" indeterminate color="primary"></v-progress-linear>
                <GridLayout class="border mt-2 grid-layout" v-model:layout="filteredLayout"
                    v-else-if="state.layout.length > 0" :col-num="130" :row-height="25" style="min-height: 200px;"
                    :is-draggable="false" :is-resizable="false" :responsive="false" :vertical-compact="false"
                    :prevent-collision="true" :use-css-transforms="true" :margin="[2, 0]">
                    <GridItem v-for="item in filteredLayout" :key="item.i" :static="item.static" :x="item.x" :y="item.y"
                        :w="item.w" :h="item.h" :i="item.i" :min-w="2.5" :min-h="2" :class="{
                            'cursor-pointer': item.type !== 'lot' && item.clickable,
                            'bg-legend': item.type === 'lot' && (item.legend_only === true),
                            'bg-primary-light': item.type === 'lot' && !item.legend_only,
                            'under-fumigation': item.under_fumigation,
                            'layer-1': item.type !== 'lot' && item.inventoriesCount === 1,
                            'layer-2': item.type !== 'lot' && item.inventoriesCount === 2,
                            'layer-3': item.type !== 'lot' && item.inventoriesCount === 3,
                            'layer-4': item.type !== 'lot' && item.inventoriesCount === 4,
                            'empty-layer': item.type !== 'lot' && item.inventoriesCount === 0,
                            'dimmed-block': item.dimmed,
                            'highlighted-block': !item.dimmed
                        }" @click="item.type !== 'lot' && item.clickable && handleBlockClick(item)"
                        :is-resizable="false">

                        <div v-if="item.type === 'lot' && (item.legend_only || item.legend_only === true)"
                            class="legend-text">
                            {{ item.label }}
                        </div>

                        <div v-else class="text" :class="{
                            'dimmed-block': item.dimmed,
                            'highlighted-block': !item.dimmed
                        }">
                            {{ item.label }}
                        </div>
                    </GridItem>
                </GridLayout>
                <div v-else class="border mt-2"
                    style="min-height: 200px; display: flex; align-items: center; justify-content: center;">
                    <p class="text-center mt-4 text-h4 font-weight-bold">No results found</p>
                </div>
            </div>
        </v-card>
    </div>


    <MapBlockAssignModal :storage-location="storageLocation" :plant="plantCode" :block="selectedBlock"
        @assign-success="onAssignSuccess" @action-success="actionSuccess" :show="openAssignModal"
        @close="openAssignModal = false" />

    <SmartAssignModal :storage-location="storageLocation" :plant="plantCode" :show="smartAssignModal"
        @assign-success="onAssignSuccess" @close="smartAssignModal = false" />

    <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event" />

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
    opacity: 0.1;
    pointer-events: none;
    transition: opacity 0.6s ease;
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
    opacity: 1;
    pointer-events: auto;
    transition: opacity 0.6s ease;
}

.layer-1 {
    background-color: #eece70;
    color: white;
}

.layer-2 {
    background-color: #4877f7;
    color: white;
}

.layer-3 {
    background-color: #48a348;
    color: white;
}

.layer-4 {
    background-color: #a06ee2;
    color: white;
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



.vue-grid-item {
    /* min-height: 40px; */
    /* min-width: 40px; */
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
