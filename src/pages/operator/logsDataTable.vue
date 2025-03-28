<script setup>
import ApiService from '@/services/ApiService';
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
    }
});

const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const filters = ref(null);

const headers = [
    {
        title: 'PHYSICAL ID',
        key: 'physical_id',
        sortable: false
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
        sortable: false
    },
    {
        title: '',
        key: 'actions',
        sortable: false,
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

watch(() => props.readerName, () => {
    if (!loading.value) {
        loadItems({ page: 1, itemsPerPage: itemsPerPage.value, search: props.search });
    }
}, { immediate: true });

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

    <template #item.physical_id="{ item }">
        {{ item.rfid?.name }}
    </template>

    <template #item.batch="{ item }">
        TEST BATCH
    </template>

    <template #item.manufacturing_date="{ item }">
        TEST MFG DATE
    </template>

    <!-- <template #item.created_at="{ item }">
        {{ item.created_at ? Moment(item.created_at).format('MMMM D, YYYY') : '' }}
    </template>

    <template #item.updated_at="{ item }">
        {{ item.updated_at ? Moment(item.updated_at).format('MMMM D, YYYY') : '' }}
    </template> -->

    </VDataTableServer>

</template>
