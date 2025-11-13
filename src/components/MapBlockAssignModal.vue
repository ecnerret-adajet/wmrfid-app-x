<script setup>
import ApiService from '@/services/ApiService';
import axios from 'axios';
import { debounce } from 'lodash';
import Moment from 'moment';
import { ref } from 'vue';
import DefaultModal from './DefaultModal.vue';
import SearchInput from './SearchInput.vue';
import Toast from './Toast.vue';

const emits = defineEmits(['close', 'assign-success', 'actionSuccess']);

const props = defineProps({
    block: Object,
    show: {
        type: Boolean,
        default: false
    },
    storageLocation: String,
    plant: String
});

const selectedLayerIndex = ref(-1);
const selectedLayer = ref(null);
const searchValue = ref('');
const selectedInventory = ref(null);
const selectedNewBlock = ref(null); // For Bin Transfer
const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(5);
const page = ref(1);
const sortQuery = ref('-updated_at'); // Default sort
const confirmModalOpen = ref(false);
const enableBinTransfer = ref(false);
const binTransferDetails = ref(null);
const selectedAction = reactive({
    title: '',
    message: '',
    type: ''
});
const actionModalOpen = ref(false);

const headers = [
    {
        title: 'PHYSICAL ID',
        key: 'physical_id',
        sortable: false
    },
    {
        title: 'Material',
        key: 'material_id',
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

const layerHeaders = [
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

onMounted(() => {
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{ key: 'updated_at', order: 'desc' }],
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

    ApiService.query(`warehouse/get-grouped-inventories/${props.plant}/${props.storageLocation}`, {
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
                material_id: item.material_id,
                material: item.material,
                under_fumigation: item.under_fumigation,
                physical_id: item.physical_id
            }));

            loading.value = false
        })
        .catch((error) => {
            console.log(error);
        });
}

const layerItems = ref([]);
const layersLoading = ref(true);
const totalLayerItems = ref(0);
const layersItemsPerPage = ref(5);
const layerPage = ref(1);
const layerSortQuery = ref('-updated_at');
const layerSearchValue = ref('');

const loadAvailableBlocks = ({ page, itemsPerPage, sortBy, layerSearch }) => {
    layersLoading.value = true
    if (sortBy && sortBy.length > 0) {
        const sort = sortBy[0];  // Assuming single sort field
        sortQuery.value = `${sort.key}`;  // Default ascending order
        if (sort.order === 'desc') {
            sortQuery.value = `-${sort.key}`;  // Prefix with minus for descending order
        }
    } else {
        sortQuery.value = '-blocks.updated_at';
    }

    ApiService.query(`warehouse/get-available-blocks/${props.plant}/${props.storageLocation}`, {
        params: {
            page,
            itemsPerPage,
            sort: layerSortQuery.value,
            search: layerSearchValue.value
        }
    })
        .then((response) => {
            totalLayerItems.value = response.data.total;
            layerItems.value = response.data.data.map(item => ({
                id: item.id,
                label: item.label,
                inventories_count: item.inventories.length || 0,
                isSelected: false,
                lot: item.lot || null,
                allowMultipleMaterials: item.blocks_allow_multiple_materials == 1 ? true : false,
                inventories: item.inventories || []
            }));

            layersLoading.value = false
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
    selectedLayer.value = null;
    enableBinTransfer.value = false;
    selectedNewBlock.value = false
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

const assignLoading = ref(false);
const proceedAssign = async () => {
    let allow_multiple_materials = props.block.data?.allowMultipleMaterials;
    let selectedMaterialId = selectedInventory.value?.material_id;

    const hasDifferentMaterial = props.block.data?.inventories?.some(inv => inv.material_id !== selectedMaterialId);

    if (!allow_multiple_materials && hasDifferentMaterial) {
        toast.value.color = 'error';
        toast.value.message = 'Different materials on same block is not allowed. Please contact admin.'
        toast.value.show = true;
        confirmModalOpen.value = false;
        return;
    }

    // TODO:: Check if we should add flag for initial assigning of fumigated items
    // if (selectedInventory.value && selectedInventory.value.under_fumigation == true) {
    //     toast.value.color = 'error';
    //     toast.value.message = 'Items under fumigation cannot be moved, transferred, or return to mill.'
    //     toast.value.show = true;
    //     return;
    // }
    assignLoading.value = true;
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
                sortBy: [{ key: 'updated_at', order: 'desc' }],
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
        assignLoading.value = false;
    }
}

const items = [
    { title: 'Bin Transfer' },
    { title: 'For RTM' },
]

const handleActionClick = (action, layer, index) => {
    selectedAction.type = action;
    selectedInventory.value = layer.assigned_inventory;
    selectedLayerIndex.value = index;
    selectedLayer.value = layer;

    if (layer.assigned_inventory && layer.assigned_inventory.under_fumigation == true) {
        toast.value.color = 'error';
        toast.value.message = 'Items under fumigation cannot be transferred or return to mill.'
        toast.value.show = true;
        return;
    }

    if (action === 'Bin Transfer') {
        enableBinTransfer.value = true;
        binTransferDetails.value = 'Select inventory to transfer bin'
    } else if (action === 'For RTM') {
        enableBinTransfer.value = false;
        selectedAction.title = 'Return to Mill';
        selectedAction.message = `Are you sure you want to return RFID with physical ID of <strong>${selectedInventory.value.physical_id}</strong> to mill?`;
        actionModalOpen.value = true;
    }
}

const proceedActionLoading = ref(false);
const proceedAction = async () => {
    proceedActionLoading.value = true;
    try {
        // Check if action is 'Return to Mill'
        if (selectedAction.title === 'Return to Mill') {
            const response = await axios.post('warehouse/return-to-mill', {
                block: props.block.data,
                inventory: selectedInventory.value
            });

            if (response.status === 200) {
                loadItems({
                    page: page.value,
                    itemsPerPage: itemsPerPage.value,
                    sortBy: [{ key: 'updated_at', order: 'desc' }],
                    search: searchValue.value
                });
                selectedLayerIndex.value = -1;
                selectedLayer.value = null;
                selectedInventory.value = null;
            }

        } else {
            let allow_multiple_materials = selectedNewBlock.value?.allowMultipleMaterials
            let selectedMaterialId = selectedInventory.value?.material_id;

            const hasDifferentMaterial = selectedNewBlock.value?.inventories?.some(inv => inv.material_id !== selectedMaterialId);

            if (!allow_multiple_materials && hasDifferentMaterial) {
                toast.value.color = 'error';
                toast.value.message = 'Different materials on same block is not allowed. Please contact admin.'
                toast.value.show = true;
                confirmModalOpen.value = false;
                actionModalOpen.value = false;
                return;
            }
            const response = await axios.post('warehouse/bin-transfer', {
                block: props.block.data,
                inventory: selectedInventory.value,
                newBlock: selectedNewBlock.value,
                layer: selectedLayer.value
            });

            if (response.status === 200) {
                loadAvailableBlocks({
                    page: layerPage.value,
                    itemsPerPage: layersItemsPerPage.value,
                    sortBy: [{ key: '-blocks.updated_at', order: 'desc' }],
                    search: layerSearchValue.value
                });
                selectedLayerIndex.value = -1;
                selectedLayer.value = null;
                selectedInventory.value = null;
                selectedNewBlock.value = null;
            }
        }
        actionModalOpen.value = false;
        emits('actionSuccess', selectedAction.title);
    } catch (error) {
        console.error("Error proceeding with action:", error);
    } finally {
        closeModal();
        proceedActionLoading.value = false;
    }

    actionModalOpen.value = false;
};

const binTransfer = (item) => {

    selectedNewBlock.value = item;
    selectedAction.title = 'Bin Transfer';
    selectedAction.message = `Transfer selected RFID with physical ID of <strong>${selectedInventory.value?.physical_id}</strong> to bin location <strong>${selectedNewBlock.value.lot?.label} - ${selectedNewBlock.value.label}</strong>?`;
    actionModalOpen.value = true;
}

const cancelBinTransfer = () => {
    enableBinTransfer.value = false;
}

const handleSearch = debounce((search) => {
    if (enableBinTransfer.value) {
        layerSearchValue.value = search
    } else {
        searchValue.value = search;
    }
}, 500);

</script>
<template>
    <DefaultModal :dialog-title="'Block Details'" :show="show" @close="closeModal" :max-width="'1100px'">
        <p class="text-h3 font-weight-black text-grey-700">{{ block.data.lot?.label }} - {{ block.data.label }}</p>
        <VList class="py-0 mt-3" lines="two" border rounded density="compact">
            <template v-for="(layer, index) of block.layers" :key="layer.layer_name">
                <VListItem class="py-0 px-0"
                    :class="selectedLayerIndex === index ? 'bg-primary-light' : 'bg-transparent'">
                    <template v-if="layer.assigned_inventory">
                        <VListItem :class="[layer.layer_class,
                        (selectedLayerIndex === index && enableBinTransfer) ? 'highlighted-item' : '']">
                            <VListItemTitle>
                                <span class="text-h5 font-weight-bold text-white">{{ layer.layer_name }}</span>
                            </VListItemTitle>
                            <template #append>
                                <div class="assigned-info text-h5 text-white">
                                    <div class="assigned-row">
                                        <span class="label">Batch:</span>
                                        <span class="value">{{ layer.assigned_inventory?.batch }}</span>
                                    </div>
                                    <div class="assigned-row">
                                        <span class="label">Physical ID:</span>
                                        <span class="value">{{ layer.assigned_inventory?.physical_id }}</span>
                                    </div>
                                </div>
                                <div class="d-flex gap-1">
                                    <v-menu location="start">
                                        <template v-slot:activator="{ props }">
                                            <v-btn icon="ri-more-2-line" variant="text" v-bind="props"
                                                color="grey"></v-btn>
                                        </template>
                                        <v-list>
                                            <v-list-item v-for="(item, i) in items" :key="i" :value="i"
                                                @click="handleActionClick(item.title, layer, index)">
                                                <v-list-item-title>{{ item.title }}</v-list-item-title>
                                            </v-list-item>
                                        </v-list>
                                    </v-menu>
                                </div>
                            </template>
                        </VListItem>
                        <VDivider v-if="index !== block.layers - 1" />
                    </template>


                    <template v-if="!layer.assigned_inventory">
                        <VListItem>
                            <VListItemTitle>
                                <span :class="selectedLayerIndex === index ? 'text-grey-100' : 'text-grey-700'"
                                    class="text-h5 font-weight-bold">{{ layer.layer_name }}</span>
                            </VListItemTitle>

                            <template #append>
                                <VBtn v-if="selectedLayerIndex === index" size="large"
                                    :variant="selectedLayerIndex === index ? 'outlined' : 'flat'"
                                    :class="selectedLayerIndex === index ? 'text-grey-100' : ''" class="fixed-width-btn"
                                    @click="cancelLayerSelection(layer)">
                                    Cancel
                                </VBtn>

                                <VBtn v-else :disabled="!layer.layer_status || enableBinTransfer" size="large"
                                    class="fixed-width-btn" @click="layer.layer_status && selectLayer(index, layer)">
                                    {{ layer.layer_status ? "Open" : "Disabled" }}
                                </VBtn>
                            </template>

                        </VListItem>
                        <VDivider v-if="index !== block.layers - 1" />
                    </template>

                </VListItem>

            </template>
        </VList>
        <SearchInput @update:search="handleSearch" placeholder="Search inventory" />
        <div v-if="enableBinTransfer" class="d-flex justify-between align-center mb-4">
            <div class="text-h5 font-weight-medium text-grey-700">
                {{ binTransferDetails }}
            </div>
            <v-spacer></v-spacer>
            <v-btn @click="cancelBinTransfer" class="px-5" type="button" color="error">
                Cancel Bin Transfer
            </v-btn>
        </div>

        <VDataTableServer v-if="enableBinTransfer" v-model:items-per-page="layersItemsPerPage" :headers="layerHeaders"
            :items="layerItems" :items-length="totalLayerItems" :loading="layersLoading" item-value="id"
            :search="layerSearchValue" @update:options="loadAvailableBlocks" class="text-no-wrap">

            <template v-slot:item="{ item }">
                <tr class="text-no-wrap">
                    <td style="width: 200px;">{{ item.lot?.label }} - {{ item.label }}</td>
                    <td style="width: 200px;" class="text-center">{{ item.inventories_count }}</td>
                    <td style="width: 200px;">
                        <div v-if="enableBinTransfer" class="d-flex justify-end align-center">
                            <v-btn @click="binTransfer(item)" class="px-5" type="button" color="info">
                                Bin Transfer
                            </v-btn>
                        </div>
                        <div v-else class="d-flex justify-end align-center">
                            <v-btn :disabled="true" v-if="item.isAssigned" class="px-5" type="button"
                                style="background-color: #eece70 !important;">
                                Assigned
                            </v-btn>
                            <v-btn v-else :disabled="selectedLayer == null" @click="assign(item)" class="px-5"
                                type="button" color="primary-light">
                                Assign
                            </v-btn>
                        </div>
                    </td>
                </tr>
            </template>
        </VDataTableServer>

        <VDataTableServer v-else  :headers="headers" :items="serverItems"
            :items-length="totalItems" :loading="loading" item-value="id" :search="searchValue"
            @update:options="loadItems" class="text-no-wrap" :items-per-page-options="[]">

            <template v-slot:item="{ item }">
                <tr class="text-no-wrap">
                    <td style="width: 200px;">{{ item.physical_id }}</td>
                    <td style="width: 150px;">{{ item.material?.description }}</td>
                    <td class="text-center" style="width: 100px;">{{ item.batch }}</td>
                    <td style="width: 200px;">
                        {{ item.mfg_date ? Moment(item.mfg_date).format('MMMM D, YYYY') : '' }}
                    </td>
                    <td style="width: 200px;">
                        <div v-if="enableBinTransfer && item.isAssigned" class="d-flex justify-end align-center">
                            <v-btn @click="binTransfer(item)" class="px-5" type="button" color="info">
                                Bin Transfer
                            </v-btn>
                        </div>
                        <div v-else class="d-flex justify-end align-center">
                            <v-btn :disabled="true" v-if="item.isAssigned" class="px-5" type="button"
                                style="background-color: #eece70 !important;">
                                Assigned
                            </v-btn>
                            <v-btn v-else :disabled="selectedLayer == null" @click="assign(item)" class="px-5"
                                type="button" color="primary-light">
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

    <!-- Assign Confirmation  -->
    <v-dialog v-model="confirmModalOpen" v-if="selectedInventory" max-width="700">
        <v-card class="py-8 px-6">
            <div class="mx-auto">
                <i class="ri-add-box-line" style="font-size: 50px;"></i>
            </div>
            <p class="mt-4 text-h5 text-center text-high-emphasis">Assign inventory with physical ID of <span
                    class="font-weight-bold">{{ selectedInventory?.physical_id }}</span>
                to <span class="font-weight-black">{{ selectedLayer.layer_name }}</span> of <span
                    class="font-weight-black">{{ block.data.lot?.label }} - {{ block.data.label }}</span> block?</p>

            <v-card-actions class="mt-5">
                <v-spacer></v-spacer>
                <v-btn color="secondary" variant="flat" class="px-6" @click="confirmModalOpen = false">Cancel</v-btn>
                <v-btn color="primary" :loading="assignLoading" variant="flat" class="px-6" @click="proceedAssign" type="button">Confirm</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>

    <!-- Action item confirmation -->
    <v-dialog v-model="actionModalOpen" max-width="600">
        <v-card class="py-8 px-6">
            <div class="mx-auto">
                <i v-if="selectedAction.type == 'Bin Transfer'" class="ri-folder-transfer-line"
                    style="font-size: 50px;"></i>
                <i v-else class="ri-arrow-go-back-line" style="font-size: 50px;"></i>
            </div>
            <p class="mt-4 text-h4 text-center">{{ selectedAction.title }}</p>
            <p class="text-h5 text-center" v-html="selectedAction.message"></p>
            <v-card-actions class="mt-5">
                <v-spacer></v-spacer>
                <v-btn color="secondary" variant="flat" class="px-6" @click="actionModalOpen = false">Cancel</v-btn>
                <v-btn color="primary" :loading="proceedActionLoading" variant="flat" class="px-6" @click="proceedAction" type="button">Confirm</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>


    <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event" />
</template>
<style scoped>
.layer-1 {
    background-color: #eece70;
    color: white;
}

.transition-all {
    transition: all 0.3s ease-in-out;
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

.empty-layer,
.layer-0 {
    background-color: #f0edf2;
}

.under-fumigation {
    background-color: #f7897e;
}

.assigned-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.assigned-row {
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.assigned-row .label {
  min-width: 120px; /* aligns the values */
  font-weight: 600;
  opacity: 0.95;
}

.assigned-row .value {
  font-weight: 800;
  margin-left: 8px;
}
</style>
