<script setup>
import MapBlockAssignModal from '@/components/MapBlockAssignModal.vue';
import SearchInput from '@/components/SearchInput.vue';
import ApiService from '@/services/ApiService';
import { debounce } from 'lodash';
import { onMounted, reactive, ref } from 'vue';
import { GridItem, GridLayout } from 'vue-grid-layout-v3';
import VueZoomable from "vue-zoomable";
import "vue-zoomable/dist/style.css";

const props = defineProps({
    plant: Object,
    storageLocation: Object
})

const state = reactive({
    layout: [],
    draggable: true,
    resizable: true,
    colNum: 148,
    index: 0,
    inventories: null,
    inventoriesCount: 0,
    layers: [],
    lot: null,
    id: null,
    max_layer_count: 3,
    legend_only: false
});

const searchValue = ref('')
const loading = ref(true);
const mapLoading = ref(true);
const layersData = ref(null);
const isFiltered = ref(false);
const openAssignModal = ref(false);
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
    fetchStorageLocationInformation()
})

const fetchStorageLocationInformation = async () => {
    state.layout = [];
    loading.value = true;
    try {
        const response = await ApiService.get(`warehouse/get-storage-location-information/${props.plant.plant_code}/${props.storageLocation.slug}`);
        const { details } = response.data
        layersData.value = details.layers_data;

        // Transform blocks data into GridItem format
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

const pan = {
    x: 0,
    y: 0
}

</script>

<template>
    <div>
        <v-progress-linear v-if="loading" indeterminate color="primary"></v-progress-linear>
        <v-card v-else class="pa-3 mb-4" flat>

            <v-row align="center" class="flex-nowrap">
                <!-- Plant (left) -->
                <v-col cols="auto" class="text-h6 font-weight-bold text-primary">
                    {{ plant.name }}
                </v-col>

                <!-- Legend (center) -->
                <v-col class="d-flex align-center justify-center flex-wrap" style="gap: 5px;">
                    <div class="d-flex align-center">
                        <template v-for="(layer, index) in layersData" :key="index">
                            <div :style="{
                                width: '20px',
                                height: '20px',
                                borderRadius: '25px',
                                marginLeft: index > 0 ? '20px' : '-10px',
                                marginRight: '5px',
                                backgroundColor: layer.layer === 4 ? '#a06ee2' :
                                    (layer.layer === 3 ? '#48a348' :
                                        (layer.layer === 2 ? '#4877f7' : '#eece70'))
                            }"></div>
                            {{ layer.label }}
                        </template>
                        <div style="width: 20px; height: 20px; border-radius: 25px; margin-left: 5px;
                                margin-right: 5px; background-color: #f0edf2"></div>
                        Empty
                        <div style="width: 20px; height: 20px; border-radius: 25px; margin-left: 10px;
                                margin-right: 5px; background-color: #f7897e">
                        </div>
                        Under Fumigation
                    </div>
                </v-col>

                <!-- Storage Location (right) -->
                <v-col cols="auto" class="d-flex align-center justify-end" style="gap: 16px;">
                    <SearchInput style="min-width: 220px;" placeholder="Filter by lot" @update:search="handleSearch" />
                    <span class="text-h6 font-weight-bold text-primary">{{ storageLocation.name }}</span>
                </v-col>
            </v-row>

            <VueZoomable :enable-control-button="false" :pan="{ x: -260, y: 0 }"
                style="border: 1px solid black; height: 60vh;" selector="#mapLayout" :min-zoom="0.5" :maxZoom="3">
                <div id="mapLayout" class="grid-scroll-wrapper">
                    <GridLayout class="border mt-2 grid-layout" v-model:layout="filteredLayout"
                        v-if="state.layout.length > 0" :col-num="148" :row-height="15" :is-draggable="false"
                        :is-resizable="false" :responsive="false" :vertical-compact="false" :prevent-collision="true"
                        :use-css-transforms="true" :margin="[1, 1]">
                        <GridItem v-for="item in filteredLayout" :key="item.i" :static="item.static" :x="item.x"
                            :y="item.y" :w="item.w" :h="item.h" :i="item.i" :min-w="2.5" :min-h="2" :class="{
                                ' cursor-pointer': item.type !== 'lot' && item.clickable, 'bg-legend':
                                    item.type === 'lot' && (item.legend_only === true), 'bg-primary-light': item.type == 'lot', 'layer-1':
                                    item.type !== 'lot' && item.inventoriesCount === 1, 'layer-2': item.type !== 'lot' &&
                                        item.inventoriesCount === 2, 'layer-3': item.type !== 'lot' && item.inventoriesCount === 3, 'layer-4':
                                    item.type !== 'lot' && item.inventoriesCount === 4, 'empty-layer': item.type !== 'lot' &&
                                        item.inventoriesCount === 0, 'dimmed-block': item.dimmed, 'highlighted-block': !item.dimmed
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
                            <!-- <span class="text" >{{item.label}}</span> -->
                        </GridItem>
                    </GridLayout>
                    <div v-else class="border mt-2"
                        style="min-height: 200px; display: flex; align-items: center; justify-content: center;">
                        <p class="text-center mt-4 text-h4 font-weight-bold">No results found</p>
                    </div>
                </div>
            </VueZoomable>
        </v-card>

        <MapBlockAssignModal :storage-location="storageLocation?.slug" :block="selectedBlock" :plant="plant?.plant_code"
            @assign-success="onAssignSuccess" @action-success="actionSuccess" :show="openAssignModal"
            @close="openAssignModal = false" />
        <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event" />
    </div>
</template>

<style scoped>
.grid-scroll-wrapper {
    min-width: 100%;
    min-height: 250px;
}

.grid-layout {
    min-width: 2500px;
    /* ensure grid has a minimum visible width */
    min-height: 250px;
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

.dimmed-block {
    opacity: 0.1;
    pointer-events: none;
    transition: opacity 0.6s ease;
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

.vue-grid-layout {
    margin: 0;
    padding: 0;
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
    min-height: 30px;
}

.vue-grid-item .text {
    font-size: 16px;
    text-align: center;
    position: absolute;
    top: 2px !important;
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
