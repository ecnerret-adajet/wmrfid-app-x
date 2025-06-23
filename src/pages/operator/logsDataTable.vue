<script setup>
import BlockAssignModal from '@/components/BlockAssignModal.vue';
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import axios from 'axios';
import Moment from 'moment';
import { ref, watch } from 'vue';
import { VDataTableServer } from 'vuetify/components';

const emits = defineEmits(['pagination-changed', 'refreshReader']);

const props = defineProps({
    search: {
        type: String,
        default: ''
    },
    readerName: {
        type: String,
        default: ''
    },
    storageLocation: String,
    plantCode: String,
    page: {
        type: Number,
        default: 1,
    },
    itemsPerPage: {
        type: Number,
        default: 5
    }
});

const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const filters = ref(null);
const errorMessage = ref(null);
const pickLoading = ref(null);
const wrapLoading = ref(null);
const selectedInventory = ref(null);
const assignModalOpen = ref(false);
const confirmModalOpen = ref(false);

const headers = [
    {
        title: 'PHYSICAL ID',
        key: 'physical_id',
        sortable: false,
        headerProps: { class: 'custom-header' }
    },
    {
        title: 'BATCH',
        key: 'batch',
        sortable: false
    },
    {
        title: 'MFG DATE',
        key: 'manufacturing_date',
        sortable: false
    },
    {
        title: 'WRAP STATUS',
        key: 'wrap_status',
        sortable: false,
        align: 'center'
    },
    {
        title: '',
        key: 'action',
        sortable: false,
        align: 'center'
    },
]

const selectedAction = reactive({
    title: '',
    message: '',
    type: ''
});

const loadItems = (options = {}) => {
    // Ensure updated values are used
    const updatedPage = options.page || props.page;
    const updatedItemsPerPage = options.itemsPerPage || props.itemsPerPage;
    const updatedSearch = options.search ?? props.search;
    const updatedReaderName = props.readerName; // Always use latest value
    loading.value = true;
    ApiService.query(`data/get-antenna-logs/${props.plantCode}/${props.storageLocation}`, {
        params: {
            page: updatedPage,
            itemsPerPage: updatedItemsPerPage,
            search: updatedSearch,
            filters: filters.value,
            reader_name: updatedReaderName
        }
    })
        .then((response) => {
            totalItems.value = response.data.total;
            serverItems.value = response.data.data;

            loading.value = false;
            emits('pagination-changed', { page: updatedPage, itemsPerPage: updatedItemsPerPage, search: updatedSearch });
        })
        .catch((error) => {
            loading.value = false;
            console.error('Error fetching antenna logs:', error);
        });
};

const toast = ref({
    message: 'Item picked successfully!',
    color: 'success',
    show: false
});

watch(() => props.readerName, () => {
    if (!loading.value) {
        loadItems({ page: props.page, itemsPerPage: props.itemsPerPage, search: props.search });
    }
}, { immediate: true });



const wrapAction = async (inventory) => {
    if (inventory.picked_datetime == null) {
        toast.value.message = 'Item must be picked first!'
        toast.value.color = 'error';
        toast.value.show = true;
    } else {
        wrapLoading.value = inventory.id;
        try {
            const response = await axios.get(`inventory/wrap-inventory/${inventory.id}`);
            loadItems({ page: props.page, itemsPerPage: props.itemsPerPage, search: props.search });
            toast.value.message = 'Item wrapped successfully!'
            toast.value.color = 'success';
            toast.value.show = true;
        } catch (error) {
            errorMessage.value = error.response?.data?.message || 'An unexpected error occurred.';
            console.error('Error submitting:', error);
        } finally {
            wrapLoading.value = null;
        }
    }
}

const pickInventory = async (inventory) => {
    pickLoading.value = inventory.id;

    if (inventory.is_confirmed == false) {
        toast.value.message = 'Production run for this inventory must be confirmed first!'
        toast.value.color = 'error';
        toast.value.show = true;
        return;
    }
    try {
        const response = await axios.get(`inventory/pick-inventory/${inventory.id}`);
        loadItems({ page: props.page, itemsPerPage: props.itemsPerPage, search: props.search });
        toast.value.message = 'Item picked successfully!';
        toast.value.color = 'success';
        toast.value.show = true;
    } catch (error) {
        errorMessage.value = error.response?.data?.message || 'An unexpected error occurred.';
        console.error('Error submitting:', error);
    } finally {
        pickLoading.value = null;
    }
}

const selectInventory = (rfid) => {
    selectedInventory.value = rfid
    assignModalOpen.value = true;
}

const proceedAction = () => {
    if (selectedAction.title == 'Mark as Wrapped') {
        wrapAction(selectedInventory.value)
    } else {
        pickInventory(selectedInventory.value)
    }
    confirmModalOpen.value = false;
}

const handleShowConfirm = (action, item) => {
    let rfidModel = item;
    selectedInventory.value = item.inventory;
    if (action == 'wrap') {
        selectedAction.title = 'Mark as Wrapped';
        selectedAction.message = `Do you want to mark this RFID with physical ID of <strong>${rfidModel?.name}</strong> as wrapped?`;
    } else {
        selectedAction.title = 'Mark as Picked';
        selectedAction.message = `Do you want to mark this RFID with physical ID of <strong>${rfidModel?.name}</strong> as picked?`;
    }
    confirmModalOpen.value = true;
}

const onAssignSuccess = () => {
    toast.value.message = 'Assign to layer successfully!';
    toast.value.color = 'success';
    toast.value.show = true;
    loadItems({ page: props.page, itemsPerPage: props.itemsPerPage, search: props.search });
    assignModalOpen.value = false;
    emits('refreshReader', props.readerName);
}

const pageLimit = ref(5)

defineExpose({
    loadItems,
})

</script>

<template>
    <!-- :key props ensure to reset values on footer if tabs switched -->
    <VDataTableServer v-model:items-per-page="pageLimit" :headers="headers" :items="serverItems"
        :items-length="totalItems" :loading="loading" item-value="id" :search="search" :key="readerName"
        style=" overflow-x: auto;" @update:options="loadItems" class="text-no-wrap">

        <template class="font-weight-black" v-slot:header.physical_id="{ header }">
            <span class="font-weight-black text-h5">PHYSICAL ID</span>
        </template>

        <template class="font-weight-black" v-slot:header.batch="{ header }">
            <span class="font-weight-black text-h5">BATCH</span>
        </template>

        <template class="font-weight-black" v-slot:header.manufacturing_date="{ header }">
            <span class="font-weight-black text-h5">MFG DATE</span>
        </template>

        <template class="font-weight-black" v-slot:header.wrap_status="{ header }">
            <span class="font-weight-black text-h5">WRAP STATUS</span>
        </template>

        <template #item.physical_id="{ item }">
            <td class="py-1 font-weight-medium text-h5">
                {{ item.rfid?.name }}
            </td>
        </template>

        <template #item.batch="{ item }">
            <td class="py-1 font-weight-medium text-h5">
                {{ item.rfid?.inventory?.batch ?? '--' }}
            </td>
        </template>

        <template #item.manufacturing_date="{ item }">
            <td class="py-1 font-weight-medium text-h4">
                <span class="font-weight-medium text-h5">{{ item.rfid?.inventory?.mfg_date ?
                    Moment(item.rfid?.inventory?.mfg_date).format('MMMM D, YYYY') : '--' }}</span>
                <span class="font-weight-medium text-h5">&nbsp;{{ item.rfid?.inventory?.mfg_time ?? '' }}</span>
            </td>
        </template>

        <template #item.wrap_status="{ item }">
            <div class="d-flex justify-center align-center">
                <i v-if="item.rfid?.inventory?.is_wrapped" style="font-size: 40px; background-color: green;"
                    class="ri-checkbox-circle-line"></i>
                <i @click="handleShowConfirm('wrap', item.rfid)" v-else style="font-size: 40px;"
                    class="ri-close-circle-line clickable-icon-operator"></i>
            </div>
        </template>


        <template #item.action="{ item }">
            <template v-if="item.rfid?.inventory?.is_wrapped && item.rfid?.inventory?.picked_datetime != null">
                <v-btn v-if="item.rfid?.inventory?.picked_datetime !== null"
                    :color="item.rfid?.inventory?.picked_datetime === null ? 'primary-light' : 'primary-light'"
                    :variant="item.rfid?.inventory?.picked_datetime === null ? 'flat' : 'outlined'"
                    :loading="pickLoading === item.rfid?.inventory?.id" :disabled="item.rfid?.inventory?.block_id"
                    @click="selectInventory(item.rfid)" type="button" size="large"
                    :class="item.rfid?.inventory?.block_id === null ? 'px-6 cursor-pointer' : 'px-6 cursor-not-allowed'">
                    {{ item.rfid?.inventory?.block_id ? 'Assigned to Bin' : 'Assign to Bin' }}
                </v-btn>
            </template>

            <template v-else>
                <v-btn :color="item.rfid?.inventory?.picked_datetime === null ? 'primary-light' : 'primary-light'"
                    :variant="item.rfid?.inventory?.picked_datetime === null ? 'flat' : 'outlined'"
                    :loading="pickLoading === item.rfid?.inventory?.id"
                    :disabled="item.rfid?.inventory?.picked_datetime !== null"
                    @click="handleShowConfirm('pick', item.rfid)" type="button"
                    :class="item.rfid?.inventory?.picked_datetime === null ? 'px-8 cursor-pointer' : 'px-4 cursor-not-allowed'">
                    {{ item.rfid?.inventory?.picked_datetime === null ? 'Pick' : 'Picked' }}
                </v-btn>
            </template>
        </template>


    </VDataTableServer>
    <BlockAssignModal v-if="selectedInventory" :show="assignModalOpen" :selected-inventory="selectedInventory"
        :storage-location="storageLocation" :plant-code="plantCode" @close="assignModalOpen = false"
        @assign-success="onAssignSuccess" />
    <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event" />

    <v-dialog v-model="confirmModalOpen" max-width="500">
        <v-card class="py-6 px-4 rounded-lg elevation-10">
            <div class="d-flex flex-column align-center">
                <v-avatar color="primary" size="64" class="mb-4">
                    <v-icon size="36" icon="ri-question-line" color="white"></v-icon>
                </v-avatar>
                <div class="text-h4 font-weight-bold mb-2 text-center">
                    {{ selectedAction.title }}
                </div>
                <div class="text-body-1 text-center mb-4 text-h5" v-html="selectedAction.message"></div>
            </div>
            <v-card-actions class="justify-end mt-4">
                <v-btn color="secondary" variant="text" class="px-6" @click="confirmModalOpen = false">Cancel</v-btn>
                <v-btn color="primary" variant="flat" class="px-6" @click="proceedAction" type="button">Confirm</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<style>
.clickable-icon-operator {
    cursor: pointer;
    transition: background-color 0.2s ease-in-out;
    background-color: #FF474D;
}

.clickable-icon-operator:hover {
    background-color: #E23F44;
}

.v-data-table-footer__items-per-page {
    display: none !important;
}
</style>
