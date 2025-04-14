<script setup>
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import Moment from "moment";
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { VDataTableServer } from 'vuetify/components';

const emits = defineEmits(['pagination-changed']);

const props = defineProps({
    search: {
        type: String,
        default: ''
    },
});

const router = useRouter();
const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref('-created_at'); // Default sort

const headers = [
    {
        title: 'BATCH',
        key: 'batch',
    },
    {
        title: 'MATERIAL',
        key: 'material_id',
    },
    {
        title: 'MFG DATE',
        key: 'latest_mfg_date',
    },
    {
        title: 'TOTAL QUANTITY',
        key: 'total_count',
        align: 'center'
    },
    {
        title: 'CREATED AT',
        key: 'latest_created_at',
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

    ApiService.query('datatable/inventories',{
        params: {
            page,
            itemsPerPage,
            sort: sortQuery.value,
            search: props.search
        }
        })
        .then((response) => {
            totalItems.value = response.data.total;
            serverItems.value = response.data.data
            loading.value = false

            emits('pagination-changed', { page, itemsPerPage, sortBy: sortQuery.value, search: props.search });
        })
        .catch((error) => {
            loading.value = false
            console.log(error);
        });
}

const toast = ref({
    message: 'Inventory refreshed',
    color: 'success',
    show: false
});

const handleViewBatch = (inventory) => {
    router.push(`/inventories/${inventory.batch}`);
}

defineExpose({
    loadItems
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

    <template #item.batch="{ item }">
        <span @click="handleViewBatch(item)" class="text-primary font-weight-bold cursor-pointer hover-underline">
            {{ item.batch }}
        </span>
    </template>

    <template #item.material_id="{ item }">
        {{ item.material?.description }}
    </template>

    <template #item.latest_mfg_date="{ item }">
        {{ item.latest_mfg_date ? Moment(item.latest_mfg_date).format('MMMM D, YYYY') : '' }}
    </template>

    <template #item.latest_created_at="{ item }">
        {{ item.latest_created_at ? Moment(item.latest_created_at).format('MMMM D, YYYY') : '' }}
    </template>

    <template #item.updated_at="{ item }">
        {{ item.updated_at ? Moment(item.updated_at).format('MMMM D, YYYY') : '' }}
    </template>

    </VDataTableServer>


    <Toast :show="toast.show" :message="toast.message"/>

</template>
