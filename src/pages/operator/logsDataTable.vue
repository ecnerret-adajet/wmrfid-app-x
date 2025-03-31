<script setup>
import BlockAssignModal from '@/components/BlockAssignModal.vue';
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import axios from 'axios';
import Moment from 'moment';
import { ref, watch } from 'vue';
import { VDataTableServer } from 'vuetify/components';

const emits = defineEmits(['pagination-changed']);

const props = defineProps({
    search: {
        type: String,
        default: ''
    },
    readerName: {
        type: String,
        default: ''
    },
    storageLocation: String
});

const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const filters = ref(null);
const errorMessage = ref(null);
const pickLoading = ref(null);
const wrapLoading = ref(null);
const selectedInventory = ref(null);
const assignModalOpen = ref(false);


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

const loadItems = (options = {}) => {
    // Ensure updated values are used
    const updatedPage = options.page || page.value;
    const updatedItemsPerPage = options.itemsPerPage || itemsPerPage.value;
    const updatedSearch = options.search ?? props.search;
    const updatedReaderName = props.readerName; // Always use latest value
    loading.value = true;
    ApiService.query('data/get-antenna-logs', {
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
        console.log(response.data);
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
        loadItems({ page: 1, itemsPerPage: itemsPerPage.value, search: props.search });
    }
}, { immediate: true });

const wrapAction = async (inventory) => {
    wrapLoading.value = inventory.id;
    try {
        const response = await axios.get(`inventory/wrap-inventory/${inventory.id}`);
        loadItems({ page: page.value, itemsPerPage: itemsPerPage.value, search: props.search });
        toast.value.message = 'Item wrapped successfully!'
        toast.value.show = true;
    } catch (error) {
        errorMessage.value = error.response?.data?.message || 'An unexpected error occurred.';
        console.error('Error submitting:', error);
    } finally {
        wrapLoading.value = null;
    }
}

const pickInventory =  async (inventory) => {
    pickLoading.value = inventory.id;
    try {
        const response = await axios.get(`inventory/pick-inventory/${inventory.id}`);
        loadItems({ page: page.value, itemsPerPage: itemsPerPage.value, search: props.search });
        toast.value.message = 'Item picked successfully!'
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
    console.log(selectedInventory.value);
}

defineExpose({
    loadItems,
})

</script>

<template>
    <VDataTableServer
        v-model:items-per-page="itemsPerPage"
        :headers="headers"
        :items="serverItems"
        :items-length="totalItems"
        :loading="loading"
        item-value="id"
        :search="search"
        @update:options="loadItems"
        class="text-no-wrap"
    >

        <template class="font-weight-black" v-slot:header.physical_id="{ header }">
             <span class="font-weight-black text-h4">PHYSICAL ID</span>
        </template>

        <template class="font-weight-black" v-slot:header.batch="{ header }">
             <span class="font-weight-black text-h4">BATCH</span>
        </template>

        <template class="font-weight-black" v-slot:header.manufacturing_date="{ header }">
             <span class="font-weight-black text-h4">MFG DATE</span>
        </template>

        <template class="font-weight-black" v-slot:header.wrap_status="{ header }">
             <span class="font-weight-black text-h4">WRAP STATUS</span>
        </template>

        <template #item.physical_id="{ item }">
            <td class="py-5 font-weight-medium text-h4">
                {{ item.rfid?.name }}
            </td>
        </template>

        <template #item.batch="{ item }">
            <td class="py-5 font-weight-medium text-h4">
                {{ item.rfid?.inventory?.batch ?? '--'}}
            </td>
        </template>

        <template #item.manufacturing_date="{ item }">
            <td class="py-5 font-weight-medium text-h4">
                <span class="font-weight-medium text-h4">{{ item.rfid?.inventory?.mfg_date ? Moment(item.rfid?.inventory?.mfg_date).format('MMMM D, YYYY') : '--' }}</span>
                <span class="font-weight-medium text-h4">&nbsp;{{ item.rfid?.inventory?.mfg_time ?? '' }}</span>
            </td>
        </template>

        <template #item.wrap_status="{ item }">
            <div class="d-flex justify-center align-center">
                <i v-if="item.rfid?.inventory?.is_wrapped" style="font-size: 44px; background-color: green;" class="ri-checkbox-circle-line"></i>
                <i @click="wrapAction(item.rfid?.inventory)" v-else style="font-size: 44px;" class="ri-close-circle-line clickable-icon"></i>
            </div>
        </template>

        <template #item.action="{ item }">
            <template v-if="item.rfid?.inventory?.is_wrapped">
                <v-btn v-if="item.rfid?.inventory?.picked_datetime !== null"
                    :color="item.rfid?.inventory?.picked_datetime === null ? 'primary-light' : 'primary-light'"
                    :variant="item.rfid?.inventory?.picked_datetime === null ? 'flat' : 'outlined'" 
                    :loading="pickLoading === item.rfid?.inventory?.id"
                    :disabled="item.rfid?.inventory?.block_id" 
                    @click="selectInventory(item.rfid)"
                    type="button"
                    size="large"
                    :class="item.rfid?.inventory?.block_id === null ? 'px-6 cursor-pointer' : 'px-11 cursor-not-allowed'" 
                >
                    {{ item.rfid?.inventory?.block_id ? 'Assigned to Bin' : 'Assign to Bin' }} 
                </v-btn>
            </template>

            <template v-else>
                <v-btn size="large"
                    :color="item.rfid?.inventory?.picked_datetime === null ? 'primary-light' : 'primary-light'"
                    :variant="item.rfid?.inventory?.picked_datetime === null ? 'flat' : 'outlined'" 
                    :loading="pickLoading === item.rfid?.inventory?.id"
                    :disabled="item.rfid?.inventory?.picked_datetime !== null" 
                    @click="pickInventory(item.rfid?.inventory)"
                    type="button"
                    :class="item.rfid?.inventory?.picked_datetime === null ? 'px-16 cursor-pointer' : 'px-13 cursor-not-allowed'" 
                >
                    {{ item.rfid?.inventory?.picked_datetime === null ? 'Pick' : 'Picked' }} 
                </v-btn>

            </template>
        </template>

    </VDataTableServer>
    <BlockAssignModal v-if="selectedInventory" :show="assignModalOpen" 
        :selected-inventory="selectedInventory" :storage-location="storageLocation"
        @close="assignModalOpen = false"
    />
    <Toast :show="toast.show" :message="toast.message"/>
</template>

<style scoped>
   
    .clickable-icon {
        cursor: pointer;
        transition: background-color 0.2s ease-in-out;
        background-color: #FF474D;
    }

    .clickable-icon:hover {
        background-color: #E23F44;
    }

</style>

