<script setup>
import ApiService from '@/services/ApiService';
import { debounce } from 'lodash';
import { ref } from 'vue';
import DefaultModal from './DefaultModal.vue';
import SearchInput from './SearchInput.vue';

const emits = defineEmits(['close', 'assign-success']);

const props = defineProps({
    block: Object,
    show: {
        type: Boolean,
        default: false
    },
    storageLocation: String
});

const selectedLayerIndex = ref(-1);
const selectedLayer = ref(null);
const searchValue = ref('');
const selectedInventory = ref(null);
const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(5);
const page = ref(1);
const sortQuery = ref('-updated_at'); // Default sort

const headers = [
    {
        title: 'PHYSICAL ID',
        key: 'physical_id',
        sortable: false
    },
    {
        title: 'BATCH',
        key: 'assigned_item',
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
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{key: 'updated_at', order: 'desc'}],
        search: searchValue.value
    });
})

const loadItems = ({ page, itemsPerPage, sortBy, search }) => {
    loading.value = true
    if (sortBy && sortBy.length > 0) {
        const sort = sortBy[0];  // Assuming single sort field
        sortQuery.value = `${sort.key}`;  // Default ascending order
        if (sort.order === 'desc') {
            sortQuery.value = `-${sort.key}`;  // Prefix with minus for descending order
        }
    } else {
        sortQuery.value = '-updated_at';
    }

    ApiService.query(`warehouse/get-inventories/${props.storageLocation}`,{
        params: {
            page,
            itemsPerPage,
            sort: sortQuery.value,
            search: searchValue.value
        }
        })
        .then((response) => {
            console.log(response.data);
            // totalItems.value = response.data.total;

            // serverItems.value = response.data.data.map(item => ({
            //     id: item.id,
            //     label: item.label,
            //     inventories_count: item.inventories_count,
            //     isSelected: false,
            //     storage_location_id: item.storage_location_id
            // }));

            loading.value = false
        })
        .catch((error) => {
            console.log(error);
        });
}

const toast = ref({
    message: '',
    color: 'success',
    show: false
});

const closeModal = () => {
    emits('close');
}

const assignInventoryToLayerBin = async (layer) => {

    // if (defaultLayer.value[selectedLayerIndex.value]['assigned_inventory'] && defaultLayer.value[selectedLayerIndex.value]['assigned_inventory'] !== null) {
    //     toast.value.message = 'Selected layer has an assigned inventory already!';
    //     toast.value.color = 'error';
    //     toast.value.show = true;
    // } else {

    //     try {
            
    //         const response = await axios.post(`warehouse/assign-inventory`, {
    //             block: selectedBlock.value,
    //             position: selectedLayer.value,
    //             inventory: props.selectedInventory.inventory
    //         }); 

    //         if (response.status == 200) {
    //             emits('assign-success');
    //         } 

    //     } catch (error) {
    //         console.error("Error assigning inventory:", error);
    //     } finally {
    //         layerLoading.value = false;
    //         close();
    //     }
    // }
}

const selectLayer = (index, layer) => {
    // Must select and open a  first
    if (!selectedInventory.value) {
        toast.value.message = 'Assign inventory item first';
        toast.value.color = 'error';
        toast.value.show = true;
    } else {
        selectedLayerIndex.value = index;
        selectedLayer.value = layer
    }
}

const handleSearch = debounce((search) => {
    searchValue.value = search;
}, 500);

</script>
<template>
    <DefaultModal :dialog-title="'RFID Details'" max-width="800px" :show="show" @close="closeModal">
        <VList class="py-0 mt-3" lines="two" border rounded density="compact">
                <template 
                    v-for="(layer, index) of block.layers"
                    :key="layer.layer_name"
                >
                    <VListItem class="py-0 px-0" :class="selectedLayerIndex === index ? 'bg-primary-light' : 'bg-transparent'">
                        <template v-if="layer.assigned_inventory">
                            <VListItem :class="layer.layer_class"> 
                                <VListItemTitle>
                                    <span class="text-h5 font-weight-bold text-white" >{{ layer.layer_name }}</span>
                                </VListItemTitle>
                                <template #append>
                                    <div class="flex-column text-h5 text-white">
                                        Batch: <span class="font-weight-bold">{{ layer.assigned_inventory?.batch }}</span>
                                        <div>
                                            Group Name:
                                            <span class="font-weight-bold">{{ layer.assigned_inventory.rfid?.name }}</span>
                                        </div>
                                    </div>
                                </template>
                            </VListItem>
                        </template>
                      
                  
                        <template v-if="!layer.assigned_inventory">
                            <VListItem>
                                <VListItemTitle>
                                    <span :class="selectedLayerIndex === index ? 'text-grey-100' :'text-grey-900'" class="text-h5 font-weight-bold">{{ layer.layer_name }}</span>
                                </VListItemTitle>

                                <template #append>
                                    <VBtn 
                                        v-if="selectedLayerIndex === index" 
                                        size="large" 
                                        :variant="selectedLayerIndex === index ? 'outlined' : 'flat'"
                                        :class="selectedLayerIndex === index ? 'text-grey-100' : ''"
                                        class="fixed-width-btn"
                                        @click="assignInventoryToLayerBin(layer)"
                                    >
                                        Confirm
                                    </VBtn>

                                    <VBtn 
                                        v-else 
                                        :disabled="!layer.layer_status" 
                                        size="large" 
                                        class="fixed-width-btn"
                                        @click="layer.layer_status && selectLayer(index, layer)"
                                    >
                                        {{ layer.layer_status ? "Open" : "Disabled" }}
                                    </VBtn>
                                </template>

                            </VListItem>
                        </template>

                    </VListItem>
                    <VDivider v-if="index !== block.layers - 1" />
                </template>
        </VList>
        <SearchInput @update:search="handleSearch" placeholder="Search inventory"/>

        <!-- <VDataTableServer
            v-model:items-per-page="itemsPerPage"
            :headers="headers"
            :items="serverItems"
            :items-length="totalItems"
            :loading="loading"
            item-value="id"
            :search="searchValue"
            @update:options="loadItems"
            class="text-no-wrap"
        >

            <template v-slot:item="{ item }">
                <tr class="text-no-wrap" :class="{'selected-row': item.isSelected}">
                    <td style="width: 200px;">{{ item.label }}</td>
                    <td style="width: 200px;" class="text-center">{{ item.inventories_count }}</td>
                    <td style="width: 200px;">
                        <template v-if="item.isSelected === false">
                            <div class="d-flex justify-end align-center">
                                <v-btn @click="selectBlock(item)" class="px-5" type="button" color="primary-light">
                                    Open
                                </v-btn>
                            </div>
                        </template>
                        <template v-else>
                            <div class="d-flex justify-end align-center">
                                <v-btn v-if="item.isSelected === true" @click="cancelBlock(item)"
                                    class="ml-3 bg-primary-light">Cancel</v-btn>
                                <v-btn v-else >
                                    {{ item.isSelected === true ? "Selected" : "Open" }}
                                </v-btn>
                            </div>
                        </template>
                    </td>
                </tr>
            </template>

        </VDataTableServer> -->
        <div class="d-flex justify-end align-center mt-4">
            <v-btn color="secondary" variant="outlined" @click="emits('close')" class="px-12 mr-3">Close</v-btn>
        </div>
    </DefaultModal>
    <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event"/>
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

</style>
