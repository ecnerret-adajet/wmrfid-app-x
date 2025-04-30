<script setup>
import MapBlockAssignModal from '@/components/MapBlockAssignModal.vue';
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import { debounce } from 'lodash';
import { onMounted, reactive, ref } from 'vue';
import { GridItem, GridLayout } from 'vue-grid-layout-v3';

const props = defineProps({
    storageLocation: String,
    plantCode: String
});

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
        const response = await ApiService.get(`warehouse/get-storage-location-information/${props.plantCode}/${props.storageLocation}`);
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
            allowMultipleMaterials: item.storage_location?.blocks_allow_multiple_materials == 1 ? true : false
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
                <SearchInput style="min-width: 300px;" placeholder="Filter by lot" @update:search="handleSearch"/>
            </div>
        </div>


        <!-- Map area  -->
        <div >
            <GridLayout class="border mt-2 "
                v-model:layout="filteredLayout"
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
                    v-for="item in filteredLayout"
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
                        'cursor-pointer': item.type !== 'lot' && item.clickable,
                        'bg-primary-light': item.type == 'lot',
                        'layer-1': item.type !== 'lot' && item.inventoriesCount === 1,
                        'layer-2': item.type !== 'lot' && item.inventoriesCount === 2,
                        'layer-3': item.type !== 'lot' && item.inventoriesCount === 3,
                        'layer-4': item.type !== 'lot' && item.inventoriesCount === 4,
                        'empty-layer': item.type !== 'lot' && item.inventoriesCount === 0,
                        'dimmed-block': item.dimmed,
                        'highlighted-block': !item.dimmed
                    }"
                    @click="item.type !== 'lot' && item.clickable && handleBlockClick(item)"
                    :is-resizable="false"
                >
                    <div
                        class="text"
                        :class="{
                            'dimmed-block': item.dimmed,
                            'highlighted-block': !item.dimmed
                        }"
                    >
                        {{ item.label }}
                    </div>
                    <!-- <span class="text" >{{item.label}}</span> -->
                </GridItem>
            </GridLayout>
            <div v-else class="border mt-2" style="min-height: 200px; display: flex; align-items: center; justify-content: center;">
                <p class="text-center mt-4 text-h4 font-weight-bold">No results found</p>
            </div>
        </div>
    </div>
    <MapBlockAssignModal :storage-location="storageLocation" :block="selectedBlock" 
        :plant="plantCode"
        @assign-success="onAssignSuccess"
        @action-success="actionSuccess"
        :show="openAssignModal" @close="openAssignModal = false"/>
    <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event"/>
</template>

<style scoped>

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
