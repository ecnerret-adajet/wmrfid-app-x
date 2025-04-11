<script setup>
import PrimaryButton from '@/components/PrimaryButton.vue';
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import axios from 'axios';
import Moment from "moment";
import { ref } from 'vue';
import { VDataTableServer } from 'vuetify/components';

const emits = defineEmits(['pagination-changed']);

const props = defineProps({
    search: {
        type: String,
        default: ''
    },
    materialsOption: {
        type: Array,
        default: () => []
    },
    productionLinesOption: {
        type: Array,
        default: () => []
    }
});

const triggerEndDialog = ref(false);
const selectedProductionRun = ref(null);
const triggerEndLoading = ref(false);
const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref(null); // Default sort
const errorMessage = ref(null)
const filters = ref(null);

const headers = [
    {
        title: 'MATERIAL',
        key: 'material_id',
    },
    {
        title: 'BATCH',
        key: 'batch',
    },
    {
        title: 'MFG DATE',
        key: 'mfg_date',
    },
    {
        title: 'QUANTITY',
        key: 'total_quantity',
        align: 'center',
        sortable: false,
    },
    {
        title: 'START DATE',
        key: 'start_date_time',
    },
    {
        title: 'END DATE',
        key: 'end_date_time',
        align: 'center',
    },
]

const loadItems = ({ page, itemsPerPage, sortBy, search }) => {
    loading.value = true
    ApiService.query('datatable/production-runs',{
        params: {
            page,
            itemsPerPage,
            sort: sortQuery.value,
            search: props.search,
            filters: filters.value
        }
        })
        .then((response) => {
            totalItems.value = response.data.total;
            serverItems.value = response.data.data
            loading.value = false

            emits('pagination-changed', { page, itemsPerPage, sortBy: sortQuery.value, search: props.search });
        })
        .catch((error) => {
            console.log(error);
        });
}

const toast = ref({
    message: 'Production run trigger end successfully!',
    color: 'success',
    show: false
});

const form = ref({
    'production_line_id': null,
    'material_id': null,
    'start_date_time': null,
    'end_date_time': null
});

const handleEndProductionRun = async () => {
    triggerEndLoading.value = true
    try {
        const response = await axios.put(`production-runs/${selectedProductionRun.value.production_run_id}/trigger-end`);
        loadItems({ page: page.value, itemsPerPage: itemsPerPage.value, search: props.search });
        toast.value.message = 'Production run end trigger successfully!'
        toast.value.color = 'success';
        toast.value.show = true;
    } catch (error) {
        errorMessage.value = error.response?.data?.message || 'An unexpected error occurred.';
        console.error('Error updating:', error);
    } finally {
        triggerEndLoading.value = null;
        triggerEndDialog.value = false
    } 
}

const triggerEnd = (item) => {
    selectedProductionRun.value = item;
    triggerEndDialog.value = true;
}

const applyFilters = (data) => {
    filters.value = data;
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{key: 'created_at', order: 'desc'}],
        search: props.search
    });
}

defineExpose({
    loadItems,
    applyFilters
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

    <template #item.material_id="{ item }">
        {{ item.material?.description }}
    </template>

    <template #item.production_line_id="{ item }">
        {{ item.production_run?.production_line?.name }}
    </template>

    <template #item.start_date_time="{ item }">
        {{ item.production_run?.start_date_time ? Moment(item.production_run?.start_date_time).format('MMMM D, YYYY h:mm A') : '' }}
    </template>

    <template #item.mfg_date="{ item }">
        {{ item.latest_mfg_date ? Moment(item.latest_mfg_date).format('MMMM D, YYYY') : '' }}
    </template>

    <template #item.total_quantity="{ item }">
       <div>
            <div class="font-weight-bold">
                {{ item.total_quantity }}
            </div>
            <span class="text-subtitle-1 font-weight-bold">
                {{ item.rfid_type }}
            </span>
        </div>
    </template>

    <template #item.end_date_time="{ item }">
        <div v-if="item.production_run?.end_date_time">
            {{ item.production_run?.end_date_time ? Moment(item.production_run?.end_date_time).format('MMMM D, YYYY h:mm A') : '' }}
        </div>
        <div v-else>
            <v-btn class="px-2" @click="triggerEnd(item)" type="button" color="primary-light">
                Trigger End
            </v-btn>
        </div>
    </template>

    </VDataTableServer>

    <v-dialog v-model="triggerEndDialog" max-width="600px" persistent>
    
        <v-sheet class="px-4 pt-8 pb-4 text-center mx-auto" elevation="12" max-width="600" rounded="lg" width="100%">
            <v-icon
                class="mb-5"
                color="primary"
                icon="ri-information-line"
                size="112"
            ></v-icon>

            <h2 class="text-h4 mb-6">Do you want to end this production run?</h2>

            <div class="text-end">
                <v-btn color="secondary" variant="outlined" @click="triggerEndDialog = false" class="px-12 mr-3">Cancel</v-btn>
                <PrimaryButton @click="handleEndProductionRun" color="primary" class="px-12" :loading="triggerEndLoading">
                    Update
                </PrimaryButton>
            </div>
        </v-sheet>
    </v-dialog>


    <Toast :show="toast.show" :message="toast.message"/>

</template>
