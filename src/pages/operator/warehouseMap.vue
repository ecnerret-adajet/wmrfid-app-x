<script setup>
import MapBlockAssignModal from '@/components/MapBlockAssignModal.vue';
import SearchInput from '@/components/SearchInput.vue';
import ApiService from '@/services/ApiService';
import { debounce } from 'lodash';
import { onMounted, reactive, ref } from 'vue';
import { GridItem, GridLayout } from 'vue-grid-layout-v3';

const props = defineProps({
    storageLocation: String,
});

const state = reactive({
    layout: [],
    draggable: true,
    resizable: true,
    colNum: 148,
    index: 0,
    inventories: null,
    inventoriesCount: 0,
    layers: []
});

const searchValue = ref('')
const loading = ref(true);
const layersData = ref(null);
const isFiltered = ref(false);
const openAssignModal = ref(false);
const selectedBlock = reactive({
    layers: [],
    data: null
})

const handleSearch = debounce((search) => {
    searchValue.value = search;
}, 500);

onMounted(() => {
    state.index = state.layout.length;
    fetchStorageLocationInformation()
})

const fetchStorageLocationInformation = async () => {
    loading.value = true;
    try {
        const response = await ApiService.get(`warehouse/get-storage-location-information/${props.storageLocation}`);
        const { storage_location, layers_data, blocks } = response.data
        layersData.value = layers_data;

        // Transform blocks data into GridItem format
        state.layout = blocks.map((item, index) => ({
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
            layers: item.layers || []
        }));

        state.index = state.layout.length;
    } catch (error) {
        console.error('Error fetching data:', error);
    } finally {
        loading.value = false
    }
};

const filterBlock = () => {
    isFiltered.value = true;
}

const handleBlockClick = (item) => {
    selectedBlock.data = item;
    selectedBlock.layers = item.layers;
    openAssignModal.value = true;
}

const getItemColor = (inventoriesCount) => {
    if (inventoriesCount >= 4) return '#ac84e0'; // Layer 4 color
    if (inventoriesCount === 3) return '#afe1af'; // Layer 3 color
    if (inventoriesCount === 2) return '#e9869a'; // Layer 2 color
    return '#ffeeba'; // Default layer 1 color
};

</script>

<template>
    <v-progress-linear v-if="loading" indeterminate color="primary"></v-progress-linear>
    <div v-else>
        <!-- Main content  -->
        <div class="d-flex align-center justify-space-between">
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
                        margin-right: 5px; background-color: #f0edf2"></div>
                Empty
            </div>

            <div class="d-flex align-center">
                <SearchInput style="min-width: 300px;" placeholder="Filter by block" @update:search="handleSearch"/>
                <v-btn class="bg-primary-light px-8 ml-4" @click="filterBlock">
                    Filter
                </v-btn>
            </div>
        </div>

        <!-- Filtered map  -->
        <div v-if="isFiltered">
            <h1>Filtered map</h1>
        </div>

        <!-- Map area  -->
        <div v-else>
            <GridLayout class="border mt-2"
                v-model:layout="state.layout"
                v-if="state.layout.length > 0"
                :col-num="148"
                :row-height="15"
                style="min-height: 200px;"
                :is-draggable="false"
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
                    :w="item.w"
                    :h="item.h"
                    :i="item.i"
                    :min-w="2.5"
                    :min-h="2"
                    :class="{
                        'cursor-pointer': item.type !== 'lot',
                        'bg-primary-light': item.type == 'lot',
                        'layer-1': item.type !== 'lot' && item.inventoriesCount === 1,
                        'layer-2': item.type !== 'lot' && item.inventoriesCount === 2,
                        'layer-3': item.type !== 'lot' && item.inventoriesCount === 3,
                        'layer-4': item.type !== 'lot' && item.inventoriesCount === 4,
                        'empty-layer': item.type !== 'lot' && item.inventoriesCount === 0,
                    }"
                    @click="item.type !== 'lot' && handleBlockClick(item)"
                    :is-resizable="false"
                >
                    <span class="text">{{item.label}}</span>
                </GridItem>
            </GridLayout>
        </div>
    </div>
    <MapBlockAssignModal :storage-location="storageLocation" :block="selectedBlock" :show="openAssignModal" @close="openAssignModal = false"/>
</template>

<style scoped>
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
    margin-left: 0 !important; /* Remove left margin */
    margin-right: 0 !important; /* Remove right margin */
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
