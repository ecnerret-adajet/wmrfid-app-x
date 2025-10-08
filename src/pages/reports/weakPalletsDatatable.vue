<script setup>
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import { useAuthStore } from '@/stores/auth';
import Moment from "moment";
import { ref } from 'vue';
import { VDataTableServer } from 'vuetify/components';

const emits = defineEmits(['pagination-changed']);

const authStore = useAuthStore();

const props = defineProps({
    search: {
        type: String,
        default: ''
    },
    readersOption: {
        type: Array,
        default: () => []
    },
    tagTypesOption: {
        type: Array,
        default: () => []
    }
});

const editDialog = ref(false);
const deleteDialog = ref(false);
const selectedProductionLine = ref(null);
const isLoading = ref(false);
const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref('-created_at'); // Default sort
const errorMessage = ref(null)
const filters = ref(null);

const headers = [
    {
        title: 'NAME',
        key: 'name',
    },
    {
        title: 'PLANT',
        key: 'plant_id',
    },
    {
        title: 'EPC',
        key: 'epc',
    },
    {
        title: 'CURRENT BATCH',
        key: 'batch',
    },
    {
        title: 'DATE CREATED',
        key: 'created_at',
    },
    {
        title: 'LAST UPDATED AT',
        key: 'updated_at',
    },
]

const loadItems = ({ page, itemsPerPage, sortBy, search }) => {
    
    loading.value = true
    if (sortBy && sortBy.length > 0) {
        const sort = sortBy[0];  // Assuming single sort field
        sortQuery.value = `${sort.key}`;  // Default ascending order
        if (sort.order === 'desc') {
            sortQuery.value = `-${sort.key}`;  // Prefix with minus for descending order
        }
    } else {
        sortQuery.value = '-created_at';
    }

    ApiService.query('reports/datatable/weak-pallets',{
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
    message: 'Production line deleted successfully!',
    color: 'success',
    show: false
});

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

        <template #item.reader_id="{ item }">
            <!-- Use the reader name instead of reader_id -->
            {{ item.reader?.name }}
        </template>

        <template #item.plant_id="{ item }">
            {{ item.plant?.name }}
        </template>

        <template #item.batch="{ item }">
            {{ item.inventory?.batch }}
        </template>

        <template #item.created_at="{ item }">
            {{ item.created_at ? Moment(item.created_at).format('MMMM D, YYYY') : '' }}
        </template>

        <template #item.updated_at="{ item }">
            {{ item.updated_at ? Moment(item.updated_at).format('MMMM D, YYYY') : '' }}
        </template>

    </VDataTableServer>

    <Toast :show="toast.show" :message="toast.message"/>

</template>
