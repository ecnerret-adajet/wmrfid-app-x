<script setup>
import Toast from '@/components/Toast.vue';
import UnauthorizedPage from '@/components/UnauthorizedPage.vue';
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

const isLoading = ref(false);
const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref('-created_at'); // Default sort
const filters = ref(null);
const unauthorizedFlag = ref(false);

const headers = [
    {
        title: 'Code',
        key: 'stock_transfer_code',
    },
    {
        title: 'Ref. Doc. Number',
        key: 'ref_doc_number',
    },
    {
        title: 'Material Document',
        key: 'material_document',
    },
    {
        title: 'Year',
        key: 'mat_document_year',
    },
    {
        title: 'Movement type',
        key: 'movement_type.name',
    },
    // {
    //     title: 'Movement Reason',
    //     key: 'move_reas',
    // },
    {
        title: 'Posting Date',
        key: 'posting_date',
    },
    {
        title: 'Doc. Header',
        key: 'document_header_text',
    },
    // {
    //     title: 'Type',
    //     key: 'type',
    // },
    // {
    //     title: 'Status ID',
    //     key: 'status_id',
    // },
    // {
    //     title: 'SAP Server',
    //     key: 'sap_server',
    // },
    // {
    //     title: 'Updated At',
    //     key: 'updated_at',
    // },
    // {
    //     title: 'Deleted At',
    //     key: 'deleted_at',
    // },
    {
        title: 'Items',
        key: 'stock_transfer_items_count',
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

    ApiService.query('datatable/stock-transfers', {
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
            if (error.response && error.response.status === 403) {
                unauthorizedFlag.value = true;
            } else {
                toast.value.message = 'An error occurred while loading data.';
                toast.value.color = 'error';
                toast.value.show = true;
            }

            loading.value = false
        });
}

const toast = ref({
    message: 'Toast message!',
    color: 'success',
    show: false
});

const applyFilters = (data) => {
    filters.value = data;
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{ key: 'created_at', order: 'desc' }],
        search: props.search
    });
}

const formatDateTime = (date, time) => {
    // Pad time to 6 digits if needed (for 'HHmmss' format)
    let formattedDate = Moment(date).format('YYYY-MM-DD');
    
    return Moment(`${formattedDate} ${time}`, 'YYYY-MM-DD HH:mm:ss').format('MMMM D, YYYY hh:mm:ss A');
};

defineExpose({
    loadItems,
    applyFilters
})
</script>

<template>

    <VDataTableServer v-model:items-per-page="itemsPerPage" :headers="headers" :items="serverItems"
        :items-length="totalItems" :loading="loading" item-value="id" :search="search" @update:options="loadItems"
        class="text-no-wrap">
        
        <template #item.posting_date="{ item }">
            {{ item.posting_date ? Moment(item.posting_date).format('MMMM D, YYYY') : '' }}
        </template>
        
        <template #item.updated_at="{ item }">
            {{ item.updated_at ? Moment(item.updated_at).format('MMMM D, YYYY hh:mm A') : '' }}
        </template>

        <template #item.deleted_at="{ item }">
            {{ item.deleted_at ? Moment(item.deleted_at).format('MMMM D, YYYY hh:mm A') : '' }}
        </template>
        
    </VDataTableServer>

    <Toast :show="toast.show" :message="toast.message" />
    <UnauthorizedPage :show="unauthorizedFlag" @close="unauthorizedFlag = false" />
</template>

<style scoped>
.hover-underline {
    position: relative;
    text-decoration: none;
}

.hover-underline:hover::after {
    content: "";
    position: absolute;
    left: 0;
    bottom: 1px;
    width: 100%;
    height: 1px;
    background-color: #00833c;
}
</style>
