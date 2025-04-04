<script setup>
import ApiService from '@/services/ApiService';
import axios from 'axios';
import { debounce } from 'lodash';
import { ref } from 'vue';
import DefaultModal from './DefaultModal.vue';
import SearchInput from './SearchInput.vue';
import Toast from './Toast.vue';

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
const confirmModalOpen = ref(false);

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

    ApiService.query(`warehouse/get-grouped-inventories/${props.storageLocation}`,{
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
                rfid: item.rfid,
                batch: item.batch,
                mfg_date: item.mfg_date,
                isAssigned: item.block_id !== null ? true : false,
            }));

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
    selectedLayerIndex.value = -1;
    selectedLayer.value = null
}

const selectLayer = (index, layer) => {
    selectedLayerIndex.value = index;
    selectedLayer.value = layer
}

const cancelLayerSelection = (layer) => {
    selectedLayerIndex.value = -1;
    selectedLayer.value = null;
}

const assign = (item) => {
    selectedInventory.value = item;
    confirmModalOpen.value = true
}

const proceedAssign = async () => {
    try {
        const response = await axios.post(`warehouse/assign-inventory`, {
            block: props.block.data,
            position: selectedLayer.value,
            inventory: selectedInventory.value
        }); 

        if (response.status == 200) {
            loadItems({
                page: page.value,
                itemsPerPage: itemsPerPage.value,
                sortBy: [{key: 'updated_at', order: 'desc'}],
                search: searchValue.value
            });
            selectedLayerIndex.value = -1;
            selectedLayer.value = null;
            selectedInventory.value = null;
            emits('assign-success');
        } 
    } catch (error) {
        console.error("Error assigning inventory:", error);
    } finally {
        confirmModalOpen.value = false
    }
}

const handleSearch = debounce((search) => {
    searchValue.value = search;
}, 500);

</script>
<template>
    <DefaultModal :dialog-title="'Block Details'" max-width="800px" :show="show" @close="closeModal">
        <p class="text-h3 font-weight-black text-grey-700">{{block.data.lot?.label }} - {{ block.data.label }}</p>
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
                                    <span :class="selectedLayerIndex === index ? 'text-grey-100' :'text-grey-700'" class="text-h5 font-weight-bold">{{ layer.layer_name }}</span>
                                </VListItemTitle>

                                <template #append>
                                    <VBtn 
                                        v-if="selectedLayerIndex === index" 
                                        size="large" 
                                        :variant="selectedLayerIndex === index ? 'outlined' : 'flat'"
                                        :class="selectedLayerIndex === index ? 'text-grey-100' : ''"
                                        class="fixed-width-btn"
                                        @click="cancelLayerSelection(layer)"
                                    >
                                        Cancel
                                    </VBtn>

                                    <VBtn v-else
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
                <tr class="text-no-wrap">
                    <td style="width: 200px;">{{ item.rfid?.name }}</td>
                    <td class="text-center" style="width: 200px;">{{ item.batch }}</td>
                    <td style="width: 200px;">{{ item.mfg_date }}</td>
                    <td style="width: 200px;">
                        <div class="d-flex justify-end align-center">
                            <v-btn :disabled="true" v-if="item.isAssigned" class="px-5" type="button" color="primary-light">
                                Assigned
                            </v-btn>
                            <v-btn v-else :disabled="selectedLayer == null" @click="assign(item)" class="px-5" type="button" color="primary-light">
                                Assign
                            </v-btn>
                        </div>
                    </td>
                </tr>
            </template>

        </VDataTableServer>
        <div class="d-flex justify-end align-center mt-4">
            <v-btn color="secondary" variant="outlined" @click="closeModal" class="px-12 mr-3">Close</v-btn>
        </div>
    </DefaultModal>
    <v-dialog v-model="confirmModalOpen" v-if="selectedInventory" max-width="500">
        <v-card class="py-8 px-6">
            <div class="mx-auto">
                <i class="ri-add-box-line" style="font-size: 54px;"></i>
            </div>
            <p class="mt-4 text-h4 text-center">Assign RFID with physical ID of <span class="font-weight-black">{{ selectedInventory.rfid?.name }}</span> 
                to <span class="font-weight-black">{{selectedLayer.layer_name}}</span> of <span class="font-weight-black">{{block.data.lot?.label }} - {{ block.data.label }}</span> block?</p>
          
            <v-card-actions class="mt-5">
                    <v-spacer></v-spacer>
                    <v-btn color="secondary" variant="flat" class="px-6" @click="confirmModalOpen = false">Cancel</v-btn>
                    <v-btn color="primary" variant="flat" class="px-6" @click="proceedAssign" type="button">Confirm</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
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
