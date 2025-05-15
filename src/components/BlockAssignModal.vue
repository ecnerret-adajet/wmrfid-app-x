<script setup>
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import axios from 'axios';
import { debounce } from 'lodash';
import DefaultModal from './DefaultModal.vue';
import SearchInput from './SearchInput.vue';

const emits = defineEmits(['close', 'assign-success']);

const props = defineProps({
    selectedInventory: Object,
    storageLocation: String,
    plantCode: String,
    show: {
        type: Boolean,
        default: false
    }
});

const layerLoading = ref(true);
const defaultLayer = ref([]);
const selectedBlock = ref(null);
const blockSearch = ref('');
const selectedLayerIndex = ref(-1);
const selectedLayer = ref(null);
const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref('-updated_at'); // Default sort
const errorMessage = ref(null)
const searchValue = ref('');

const closeModal = () => {
    emits('close')
    const previousBlock = selectedBlock.value?.id;
    selectedLayerIndex.value = -1;
    selectedLayer.value = null;
    selectedBlock.value = null;
    if (previousBlock) {
        getLayer(previousBlock);
    }
    resetLayers()

}

onMounted(() => {
    getLayer(props.selectedInventory.inventory?.block_id);
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

    ApiService.query(`warehouse/get-blocks/${props.plantCode}/${props.storageLocation}`,{
        params: {
            page,
            itemsPerPage,
            sort: sortQuery.value,
            search: searchValue.value
        }
        })
        .then((response) => {
            totalItems.value = response.data.total;

            serverItems.value = response.data.data.map(item => ({
                id: item.id,
                label: item.label,
                inventories_count: item.inventories_count,
                isSelected: false,
                storage_location_id: item.storage_location_id,
                lot: item.lot ?? null
            }));

            loading.value = false
        })
        .catch((error) => {
            console.log(error);
        });
}

const getLayer = async (block) => {
    layerLoading.value = true;
    try {
        const response = await axios.get(`warehouse/get-inventories-in-block/${props.plantCode}/${props.storageLocation}/${block ?? ''}`); 
        defaultLayer.value = response.data.reverse();
    } catch (error) {
        console.error("Error fetching layers:", error);
    } finally {
        layerLoading.value = false;
    }
}

const handleSearch = debounce((search) => {
    searchValue.value = search;
}, 500);

const cancelBlock = (event) => {
    const previousBlock = selectedBlock.value?.id;
    selectedLayerIndex.value = -1;
    selectedBlock.value = null;
    selectedLayer.value = null;
    if (previousBlock) {
        getLayer(previousBlock);
    }
    resetLayers()
    // Reset isSelected property
    serverItems.value = serverItems.value.map(item => ({
        ...item,
        isSelected: false
    }));
}

const selectBlock = (block) => {
    selectedBlock.value = block;
    getLayer(selectedBlock.value.id) // Fetch layers using the block id
    serverItems.value = serverItems.value.map(item => ({
        ...item,
        isSelected: item.id === block.id, // Set isSelected to true for the clicked block
    }));

    selectedBlock.value = block;
}

const toast = ref({
    message: 'Item picked successfully!',
    color: 'success',
    show: false
});

const selectLayer = (index, layer) => {
    // Must select and open a block first
    if (!selectedBlock.value) {
        toast.value.message = 'Select block location first';
        toast.value.color = 'error';
        toast.value.show = true;
    } else {
        selectedLayerIndex.value = index;
        selectedLayer.value = layer
    }
}

const assignInventoryToLayerBin = async (layer) => {
    let selectedMaterialId = props.selectedInventory.inventory?.material_id;
    // get 1 layer from defaultLayer.value and check storage location config
    let allow_multiple_materials = defaultLayer.value[0].storage_location?.blocks_allow_multiple_materials;
    const hasAssigned = defaultLayer.value.some(layer => layer.assigned_inventory);
    const hasDifferentMaterial = defaultLayer.value.some(layer => {
        const inv = layer.assigned_inventory;
        return inv && inv.material_id !== selectedMaterialId;
    });

     // TODO:: Check if we should add flag for initial assigning of fumigated items
    // if (props.selectedInventory.inventory && props.selectedInventory.inventory.under_fumigation == true) {
    //     toast.value.color = 'error';
    //     toast.value.message = 'Items under fumigation cannot be moved, transferred, or return to mill.'
    //     toast.value.show = true;
    //     return;
    // }

    // if no inventory assigned to a block yet, assign immediately
    if (!hasAssigned) {
        try {
            const response = await axios.post(`warehouse/assign-inventory`, {
                block: selectedBlock.value,
                position: selectedLayer.value,
                inventory: props.selectedInventory.inventory
            });

            if (response.status === 200) {
                emits('assign-success');
            }
        } catch (error) {
            console.error("Error assigning inventory:", error);
        } finally {
            layerLoading.value = false;
            close();
        }
        return;
    }

    if (!allow_multiple_materials && hasDifferentMaterial) {
        toast.value.message = 'Multiple materials on the same block are not allowed. Please contact admin.';
        toast.value.color = 'error';
        toast.value.show = true;
        selectedLayer.value = null;
        selectedLayerIndex.value = -1;
        return;
    }

    if (defaultLayer.value[selectedLayerIndex.value]?.assigned_inventory) {
        toast.value.message = 'Selected layer has an assigned inventory already!';
        toast.value.color = 'error';
        toast.value.show = true;
        return;
    }

    
    try {
        const response = await axios.post(`warehouse/assign-inventory`, {
            block: selectedBlock.value,
            position: selectedLayer.value,
            inventory: props.selectedInventory.inventory
        });

        if (response.status === 200) {
            emits('assign-success');
        }
    } catch (error) {
        console.error("Error assigning inventory:", error);
    } finally {
        layerLoading.value = false;
        close();
    }
        
}

const resetLayers = () => {
    defaultLayer.value = [];
};


const headers = [
    {
        title: 'BLOCK',
        key: 'block',
        sortable: false
    },
    {
        title: 'ASSIGNED ITEM',
        key: 'assigned_item',
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

// Computed properties
const isPalletAlreadyAssigned = computed(() => {
    if (defaultLayer.value.length === 0) return false;

    return defaultLayer.value.some(item => 
        item.assigned_inventory &&
        item.assigned_inventory.name === props.selectedInventory.name
    );
});

const hasSelectedBlock = computed(() => {
    return Object.keys(selectedBlock.value).length !== 0;
});

const filteredDefaultLayer = computed(() => {
    if (defaultLayer.value.length === 0) return [];

    // Count assigned pallets
    const assigned_inventory_layer_count = defaultLayer.value.filter(
        (item) => item.assigned_inventory != null
    ).length;
    
    return defaultLayer.value.map((item) => ({
        ...item,
        layer_status: item.layer_position === assigned_inventory_layer_count + 1, 
    }));
});

</script>

<template>
    <DefaultModal :dialog-title="'RFID Details'" max-width="800px" :show="show" @close="closeModal">
        <div class="mt-8">
            <h2 class="font-weight-bold">
                Physical ID: 
                <span class="font-weight-medium">{{ selectedInventory.name }}</span>
            </h2>
        </div>
        <v-progress-linear v-if="layerLoading" indeterminate color="primary" class="mt-5"></v-progress-linear>

        <VList v-else class="py-0 mt-3" lines="two" border rounded density="compact">
                <template 
                    v-for="(layer, index) of filteredDefaultLayer"
                    :key="layer.layer_name"
                >
                    <VListItem class="py-0 px-0" :class="selectedLayerIndex === index ? 'bg-primary-light' : 'bg-transparent'">
                        <template v-if="layer.assigned_inventory">
                            <VListItem class="selected-blue">
                                <VListItemTitle>
                                    <span class="text-h5 font-weight-bold">{{ layer.layer_name }}</span>
                                </VListItemTitle>
                                <template #append>
                                    <div class="flex-column text-h5">
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
                    <VDivider v-if="index !== filteredDefaultLayer.length - 1" />
                </template>
        </VList>

        <SearchInput @update:search="handleSearch"/>

        <VDataTableServer
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
                                                <!-- Combine lot label and block label  -->
                    <td style="width: 200px;">{{ item.lot?.label }} - {{ item.label }}</td>
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

        </VDataTableServer>
        <div class="d-flex justify-end align-center mt-4">
            <v-btn color="secondary" variant="outlined" @click="emits('close')" class="px-12 mr-3">Close</v-btn>
        </div>
    </DefaultModal>
    <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event"/>
</template>

<style scoped>
.fixed-width-btn {
    min-width: 140px !important; 
    text-align: center; 
}
.selected-row {
    background-color: #88dfe6 !important; 
    transition: background-color 0.3s ease-in-out;
}

.selected-blue {
    background-color: #88dfe6 !important;  
}
</style>
