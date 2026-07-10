<script setup>
import Loader from '@/components/Loader.vue';
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
const selectedStatus = ref(null);
const pageLoading = ref(false);

const toast = ref({
    message: '',
    color: 'success',
    show: false
});

const handleSearch = debounce((search) => {
    searchValue.value = search;
}, 500);

const isFiltering = computed(() => searchValue.value.trim() !== '');

// Evaluates text match state
const matchesSearchText = (item) => {
    if (!searchValue.value || searchValue.value.trim() === '') return true;
    
    const search = searchValue.value.toLowerCase().trim();
    if (item.type === 'block') {
        return item.lot?.label?.toLowerCase().includes(search) || 
               item.label?.toLowerCase().includes(search); // Extends search matching to block labels too
    } else if (item.type === 'lot') {
        return item.label?.toLowerCase().includes(search);
    }
    return false;
};

// Evaluates status match state
const matchesStatusFilter = (item) => {
    if (selectedStatus.value === null || selectedStatus.value === undefined) return true;
    
    // Always keep structural Lot headers matching to preserve top-level map grid canvas layout context
    if (item.type === 'lot') return true; 

    const targetStatus = selectedStatus.value;
    const isFumigation = item.under_fumigation === true || 
                         item.under_fumigation === 1 || 
                         item.under_fumigation === '1' ||
                         item.under_fumigation === 'true';

    const isInspection = item.for_quality_inspection === true || 
                         item.for_quality_inspection === 1 || 
                         item.for_quality_inspection === '1' ||
                         item.for_quality_inspection === 'true';

    if (targetStatus === 7) {
        return isFumigation; // Under Fumigation
    } else if (targetStatus === 3) {
        return isInspection; // For Quality Inspection
    } else if (targetStatus === 1) {
        return !isFumigation && !isInspection; // Good: Neither condition is active
    }

    return false;
};

// Unified computed tracking property
const filteredLayout = computed(() => {
    const hasSearchText = searchValue.value && searchValue.value.trim() !== '';
    const hasStatusFilter = selectedStatus.value !== null && selectedStatus.value !== undefined;
    const isAnyFilterActive = hasSearchText || hasStatusFilter;

    return state.layout.map(item => {
        // Must clear both text AND status checks to stay highlighted
        const textMatched = matchesSearchText(item);
        const statusMatched = matchesStatusFilter(item);
        const fullyMatched = textMatched && statusMatched;

        return {
            ...item,
            dimmed: isAnyFilterActive && !fullyMatched,
            clickable: fullyMatched || !isAnyFilterActive
        };
    });
});

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
            under_fumigation: item.under_fumigation,
            for_quality_inspection: item.for_quality_inspection,
            allowMultipleMaterials: item.storage_location?.blocks_allow_multiple_materials == 1 ? true : false,
            // for_quality_inspection: item.for_quality_inspection,
            max_layer_count: item.max_layer_count || 3,
            legend_only: item.legend_only == 1 ? true : false,
            qr_code_path: item.qr_code_path || null,
        }));

        state.index = state.layout.length;
    } catch (error) {
        console.error('Error fetching data:', error);
    } finally {
        loading.value = false;
        mapLoading.value = false;
    }
};

const handleBlockClick = async (item) => {
    selectedBlock.data = item;
    pageLoading.value = true
    try {
        const lotLabel = item?.lot?.label || '';
        const shouldForceEmptyLayers = /(wrapping|rtm|bay)/i.test(lotLabel);

        if (shouldForceEmptyLayers) {
            selectedBlock.layers = [];
            return;
        }

        const blockId = item.id || item.block_id;
        if (!blockId) {
            selectedBlock.layers = item.layers || [];
        } else {
            const response = await axios.get(`warehouse/${blockId}/get-block-layers`);
            const endpointLayers = response.data?.layers || response.data?.details?.layers || response.data?.data;
            selectedBlock.layers = Array.isArray(endpointLayers) ? endpointLayers : (item.layers || []);
        }
    } catch (error) {
        console.error('Error fetching block layers:', error);
        selectedBlock.layers = item.layers || [];
    } finally {
        pageLoading.value = false;
        openAssignModal.value = true;
    }
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

const statusOption = [
    { title: 'Good', label: 'Good', value: 1 },
    { title: 'Under Fumigation', label: 'Under Fumigation', value: 7 },
    { title: 'For Quality Inspection', label: 'For Quality Inspection', value: 3 },
];

const handleFilterStatus = (statusValue) => {
    selectedStatus.value = statusValue;
    isFiltered.value = statusValue !== null && statusValue !== undefined;
};

</script>

<template>
    <v-card elevation="2" class="mx-4 mt-4 px-3 py-2 sticky-top-card" style="border-radius: 0px !important;">
        <v-card-title class="d-flex justify-space-between align-center">
            <div class="d-inline-flex align-center">
                <v-btn @click="handleBack()" class="ma-2" color="grey-700" icon="ri-arrow-left-line"
                    variant="text"></v-btn>
                <h3 class="font-weight-black text-uppercase text-primary">{{ convertSlugToUpperCase(storageLocation) }}
                    Map</h3>
            </div>
            <div class="d-flex justify-end">
                <v-btn color="primary-light"  @click="handleEditMap"
                    class="px-12 mr-2 text-grey-100">
                    Edit Map
                </v-btn>
            </div>
        </v-card-title>

        <v-card-text>
            <VList lines="one" density="compact">
                <VListItem>
                    <VRow class="table-row" no-gutters>
                        <VCol md="6" class="table-cell d-inline-flex">
                            <VRow class="table-row">
                                <VCol cols="4" class="d-inline-flex align-center">
                                    <span class="text-h6 text-uppercase font-weight-black"
                                        style="margin-top: 1px;">SLOC: </span>
                                        <span class="font-weight-medium ml-3">
                                            {{ storageLocationModel?.code ?? '--' }}
                                        </span>
                                </VCol>
                                <VCol class="d-inline-flex align-center">
                                    <span class="font-weight-medium"></span>
                                </VCol>
                            </VRow>
                        </VCol>
                        <VCol md="6" class="table-cell d-inline-flex">
                            <VRow class="table-row">
                                <VCol cols="4" class="d-inline-flex align-center">
                                    <span class="text-h6 text-uppercase font-weight-black"
                                        style="margin-top: 1px;">Plant: </span>
                                        <span class="font-weight-medium ml-3">
                                            {{ storageLocationModel?.plant?.name ?? '--' }}
                                        </span>
                                </VCol>
                                <VCol class="d-inline-flex align-center">
                                    <span class="font-weight-medium">
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
                                <VCol cols="6" class="d-inline-flex align-center">
                                    <span class="text-h6 text-uppercase font-weight-black "
                                        style="margin-top: 1px;">Location: </span>
                                        <span class="font-weight-medium ml-3">
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
                                          <span class="font-weight-medium ml-3">
                                            {{ storageLocationModel?.plant?.plant_code ?? '--' }}
                                        </span>
                                </VCol>
                                <VCol class="d-inline-flex align-center">
                                    <span class="font-weight-medium">
                                    </span>
                                </VCol>
                            </VRow>
                        </VCol>
                    </VRow>
                </VListItem>

                <!-- Add item as needed  -->
            </VList>
            <div class="d-flex align-center justify-space-between pl-4 pr-1">
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
                                    (layer.layer === 2 ? '#4877f7' : '#ebc965'))
                        }"></div>
                        {{ layer.label }}
                    </template>
                    <div style="width: 30px; height: 30px; border-radius: 25px; margin-left: 25px;
                            margin-right: 5px; background-color: #f0edf2">
                    </div>
                    Empty
                    <!-- <div style="width: 30px; height: 30px; border-radius: 25px; margin-left: 25px;
                        margin-right: 5px; background-color: #f7897e">
                    </div>
                    Under Fumigation
                    <div style="width: 30px; height: 30px; border-radius: 25px; margin-left: 25px;
                        margin-right: 5px; background-color: #FFB400">
                    </div>
                    For Quality Inspection -->
                </div>

                <div class="d-flex align-center">
                    <v-select class="mr-2" style="min-width: 300px;" clearable label="Filter by Status" density="compact"
                        :items="statusOption" v-model="selectedStatus" @update:model-value="handleFilterStatus" 
                    />

                    <SearchInput style="min-width: 300px;" placeholder="Filter by lot" @update:search="handleSearch" />
                </div>
            </div>
        </v-card-text>
        <div class="d-flex justify-end">
            <!-- <v-btn color="primary-light" @click="smartAssignModal = true" class="px-8 mr-6 text-grey-100">
                Smart Assign
            </v-btn> -->
        </div>
        <!-- Main content  -->
        
    </v-card>
    <v-progress-linear v-if="mapLoading" indeterminate color="primary"></v-progress-linear>
    <div v-else>
        <v-card elevation="2" class="mx-4 mt-2">
            


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
    <Loader :show="pageLoading" />

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
    color:black;
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
    background-color: #ebc965;
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
    font-size: 12px;
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

.sticky-top-card {
    position: sticky;
    top: 0;
    z-index: 100; /* Keeps info header above warehouse grid layers */
    background-color: white !important;
    border-radius: 0px !important;
    box-shadow: 0 4px 20px 0 rgba(0, 0, 0, 0.1) !important;
}
</style>
