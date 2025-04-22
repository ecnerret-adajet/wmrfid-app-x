<script setup>
import axios from 'axios';
import Moment from 'moment';
import { ref } from 'vue';
import { GridItem, GridLayout } from 'vue-grid-layout-v3';

const emits = defineEmits(['close', 'assign-success', 'actionSuccess']);

const props = defineProps({
    show: {
        type: Boolean,
        default: false
    },
    storageLocation: String
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

const searchValue = ref('');
const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(5);
const page = ref(1);
const sortQuery = ref('-updated_at'); // Default sort

const storageLocationModel = ref(null);
const layersData = ref(null);
const blocks = ref([]);

const headers = [
    {
        title: 'PHYSICAL ID',
        key: 'physical_id',
        sortable: false
    },
    {
        title: 'BATCH',
        key: 'batch',
        align: 'center',
        sortable: false
    },
    {
        title: 'MANUFACTURED DATE',
        key: 'mfg_date',
        align: 'center',
        sortable: false
    },
    {
        title: '',
        key: 'action',
        sortable: false,
        align: 'end',
    },
]

onMounted(() => {
    loadInformation({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{key: 'updated_at', order: 'desc'}],
        search: searchValue.value
    });
})

const loadInformation = async ({ page, itemsPerPage, sortBy, search }) => {
    if (sortBy && sortBy.length > 0) {
        const sort = sortBy[0];  // Assuming single sort field
        sortQuery.value = `${sort.key}`;  // Default ascending order
        if (sort.order === 'desc') {
            sortQuery.value = `-${sort.key}`;  // Prefix with minus for descending order
        }
    } else {
        sortQuery.value = '-created_at';
    }

    state.layout = [];
    loading.value = true;
    try {
        const response = await axios.get(`warehouse/get-warehouse-information/${props.storageLocation}`, {
            params: {
                page,
                itemsPerPage,
                sort: sortQuery.value,
                search: searchValue.value,
            },
        });
        const { details, table } = response.data
        totalItems.value = table.total;
        serverItems.value = table.data;
        // console.log(response.data);
        
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
        }));

        state.index = state.layout.length;
    } catch (error) {
        console.error('Error fetching data:', error);
    } finally {
        loading.value = false;
    }
};

const dialogVisible = ref(props.show);

watch(
  () => props.show,
  (newVal) => {
    dialogVisible.value = newVal;
  }
)

watch(
    () => dialogVisible.value,
    (newVal) => {
        if (!newVal) {
            emits('close')
        }
    }
)

const assign = (item) => {
    console.log(item);
}


</script>
<template>
     <v-dialog
        v-model="dialogVisible"
        transition="dialog-bottom-transition"
        fullscreen
    >
        <v-card>
            <v-btn @click="emits('close')"
                class="ma-2"
                color="grey-700"
                icon="ri-close-line"
                variant="text"
            ></v-btn>
            <v-card-title class="d-flex align-center">
                <div class="text-h5 text-bold-emphasis ps-2">
                    Assign RFID to Bin
                </div>
            </v-card-title>
            
            <v-card-text class="border-e-md">
                <div>
                    <v-list>
                        <v-list-item class="text-grey-700 text-emphasis">
                            1. Select an inventory from the table.
                        </v-list-item>
                        <v-list-item class="text-grey-700 text-emphasis">
                            2. Click assign and the system will automatically find the nearest appropriate bin location.
                        </v-list-item>
                    </v-list>
                </div>
                <VRow class="h-100 align-stretch">
                    <VCol
                        md="5"
                        class="pe-4"
                        style="border-right: 1px solid #e0e0e0;"
                    >
                        <VDataTableServer 
                            v-model:items-per-page="itemsPerPage"
                            :headers="headers"
                            :items="serverItems"
                            :items-length="totalItems"
                            :loading="loading"
                            item-value="id"
                            :search="searchValue"
                            @update:options="loadInformation"
                            class="text-no-wrap"
                        >
                        <template v-slot:item="{ item }">
                            <tr class="text-no-wrap">
                                <td style="width: 200px;">{{ item.rfid?.name }}</td>
                                <td class="text-center" style="width: 200px;">{{ item.batch }}</td>
                                <td style="width: 200px;">
                                    {{ item.mfg_date ? Moment(item.mfg_date).format('MMMM D, YYYY') : '' }}
                                </td>
                                <td style="width: 200px;">
                                    <div  class="d-flex justify-end align-center">
                                        <v-btn @click="assign(item)" class="px-5" type="button" color="primary-light">
                                            Assign
                                        </v-btn>
                                    </div>
                                </td>
                            </tr>
                        </template>
                        </VDataTableServer>
                    </VCol>

                    <VCol md="7">
                        <div class="d-flex align-center justify-space-between px-4">
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
                        </div>
                        <div>
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
                            <div v-else class="border mt-2" style="min-height: 200px; display: flex; align-items: center; justify-content: center;">
                                <p class="text-center mt-4 text-h4 font-weight-bold">No results found</p>
                            </div>
                        </div>
                    </VCol>
                </VRow>
            </v-card-text>
        </v-card>
    </v-dialog>
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
.empty-layer, .layer-0 {
    background-color: #f0edf2;
}

.highlighted-item {
    border: 3px solid #00833c;  /* Green border to indicate selection */
}

</style>
