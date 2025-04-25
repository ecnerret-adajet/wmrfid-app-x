<script setup>
import axios from 'axios';
import { debounce } from 'lodash';
import Moment from 'moment';
import { ref } from 'vue';
import SearchInput from './SearchInput.vue';

const emits = defineEmits(['close', 'assign-success']);

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
const selectedInventory = ref(null);

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

    loading.value = true;
    try {
        const response = await axios.get(`warehouse/get-unassigned-inventories/${props.storageLocation}`, {
            params: {
                page,
                itemsPerPage,
                sort: sortQuery.value,
                search: searchValue.value,
            },
        });
        totalItems.value = response.data.total;
        serverItems.value = response.data.data
        
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

const loadingItem = ref(null);
// Coordinates for starting position
// Ideally, these should come from the storage location model as each warehouse has its own coordinates for pre-assigning area
const positionX = ref(0);
const positionY = ref(0);
const assignConfirmation = ref(false);
const suggestedBlock = ref(null);

const assign = async (item) => {
    selectedInventory.value = item;
    loadingItem.value = item.id;
    try {
        const response = await axios.get(`warehouse/get-nearest-block/${props.storageLocation}`, {
            params: {
                positionX: positionX.value,
                positionY: positionY.value,
                material_id: item.material?.id
            },
        });

        if (response.status === 200) {
            suggestedBlock.value = response.data
            console.log(suggestedBlock.value);
            assignConfirmation.value = true;
        } else {
            console.error('Failed to fetch nearest block.');
        }
    } catch (error) {
        console.error('Error during assign request:', error);
    } finally {
        // Reset loading state after request completion
        loadingItem.value = null;
    }
}

// Declining auto assignment
const isDeclining = ref(false);
const declinedAssign = async () => {
    isDeclining.value = true
    try {
        const response = await axios.get(`warehouse/save-declined-auto-assignment/${props.storageLocation}`, {
            params: {
                inventory_id: selectedInventory.value.id,
                block_id: suggestedBlock.value.id
            },
        });

    } catch (error) {
        console.error('Error during assign request:', error);
    } finally {
        isDeclining.value = false;
        // Close also the current modal
        assignConfirmation.value = false;
        dialogVisible.value = false;
    }
}

// Accepting auto assigning
const isAssigning = ref(false);
const onAssign = async () => {
    isAssigning.value = true
    try {
        const response = await axios.post(`warehouse/auto-assignment/${props.storageLocation}`, {
            inventory_id: selectedInventory.value.id,
            block_id: suggestedBlock.value.id
        });

        if (response.status == 200) {
            suggestedBlock.value = null;
            selectedInventory.value = null;
            emits('assign-success');
        } 

    } catch (error) {
        console.error('Error during assign request:', error);
    } finally {
        isAssigning.value = false;
        // Close also the current modal
        assignConfirmation.value = false;
        dialogVisible.value = false;
    }
 
}

const handleSearch = debounce((search) => {
    searchValue.value = search;
}, 500);

</script>
<template>
    <v-dialog
        width="900px"
        v-model="dialogVisible"
        transition="dialog-bottom-transition"
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
                            2. Click 'Assign' and the system will automatically find the nearest appropriate bin location.
                        </v-list-item>
                    </v-list>
                </div>
             
                <VRow class="h-100 ">
                    <VCol
                        class="pe-4"
                        style="border-right: 1px solid #e0e0e0;"
                    >
                        <SearchInput @update:search="handleSearch" placeholder="Search inventory"/>

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
                                <td class="text-center" style="width: 100px;">
                                    {{ item.mfg_date ? Moment(item.mfg_date).format('MMMM D, YYYY') : '' }}
                                </td>
                                <td style="width: 200px;">
                                    <div class="d-flex justify-end align-center">
                                        <v-btn @click="assign(item)" :loading="loadingItem === item.id" class="px-5" type="button" color="primary-light">
                                            Assign
                                        </v-btn>
                                    </div>
                                </td>
                            </tr>
                        </template>
                        </VDataTableServer>
                    </VCol>
                </VRow>
            </v-card-text>
            <v-card-actions class="d-flex justify-end mr-2">
                <v-btn @click="emits('close')" color="secondary" variant="flat" class="ma-2 px-6">Cancel</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
    <v-dialog v-if="suggestedBlock" v-model="assignConfirmation" max-width="600px" persistent>
        <v-sheet
            class="pa-4 text-center mx-auto"
            elevation="12"
            max-width="600"
            rounded="lg"
            width="100%"
        >
            <v-icon
            class="mb-1"
            color="info"
            icon="ri-information-line"
            size="64"
            ></v-icon>

            <h2 class="text-h5 mb-6">Bin Selection</h2>

            <p class="mb-4 text-medium-emphasis text-body-1">
                This inventory is suggested to be placed in <strong>Block {{ suggestedBlock.lot?.label }} - {{ suggestedBlock.label }}</strong>. Do you want to proceed?
            </p>

            <v-divider class="mb-4"></v-divider>

            <div class="text-end">
                <v-btn
                    class="text-none"
                    color="info"
                    variant="flat"
                    :loading="isDeclining"
                    @click="declinedAssign"
                >
                    Choose Manually
                </v-btn>
                <v-btn
                    class="text-none ml-3 px-8"
                    color="success"
                    variant="flat"
                    @click="onAssign"
                >
                    Confirm
                </v-btn>
            </div>
        </v-sheet>
    </v-dialog>
</template>
