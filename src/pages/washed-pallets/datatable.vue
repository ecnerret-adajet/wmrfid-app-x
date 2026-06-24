<script setup>
import ApiService from '@/services/ApiService';
import Moment from 'moment';
import { ref } from 'vue';
import { VDataTableServer } from 'vuetify/components';

const emits = defineEmits(['summary-updated']);

const props = defineProps({
    search: {
        type: String,
        default: '',
    },
});

const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const filters = ref({ date_from: null, date_to: null });

const headers = [
    { title: 'PALLET CODE', key: 'pallet_code', sortable: false },
    { title: 'NAME', key: 'name', sortable: false },
    { title: 'EPC', key: 'epc', sortable: false },
    { title: 'PLANT', key: 'plant_code', sortable: false },
    { title: 'STATUS', key: 'status', sortable: false },
    { title: 'WASHED AT', key: 'created_at', sortable: false },
];

const loadItems = ({ page: requestedPage, itemsPerPage: requestedPerPage, search }) => {
    loading.value = true;

    ApiService.query('pallet-washing', {
        params: {
            page: requestedPage,
            per_page: requestedPerPage,
            search: search || props.search,
            date_from: filters.value?.date_from,
            date_to: filters.value?.date_to,
        },
    })
        .then(response => {
            const { summary, pallets } = response.data.data;

            totalItems.value = pallets.total;
            serverItems.value = pallets.data;
            page.value = pallets.current_page;
            itemsPerPage.value = pallets.per_page;
            loading.value = false;

            emits('summary-updated', summary);
        })
        .catch(error => console.error(error));
};

const applyFilters = data => {
    filters.value = data;
    loadItems({
        page: 1,
        itemsPerPage: itemsPerPage.value,
        search: props.search,
    });
};

defineExpose({ loadItems, applyFilters });
</script>

<template>
    <VDataTableServer
        v-model:items-per-page="itemsPerPage"
        v-model:page="page"
        :headers="headers"
        :items="serverItems"
        :items-length="totalItems"
        :loading="loading"
        item-value="id"
        :search="search"
        @update:options="loadItems"
        class="text-no-wrap"
    >
        <template #item.status="{ item }">
            <v-chip size="small" color="success" variant="tonal" class="text-uppercase">
                {{ item.status }}
            </v-chip>
        </template>

        <template #item.created_at="{ item }">
            {{ item.created_at ? Moment(item.created_at).format('MMMM D, YYYY h:mm A') : '' }}
        </template>
    </VDataTableServer>
</template>
