<script setup>
import SearchInput from '@/components/SearchInput.vue';
import { useAuthorization } from '@/composables/useAuthorization';
import ApiService from '@/services/ApiService';
import { debounce } from 'lodash';
import Moment from 'moment';
import { ref, watch } from 'vue';

// SPC worklist: open DOs of sensitive customers that have no active fumigation request
const props = defineProps({
    plantCode: {
        type: String,
        default: null,
    },
});

const emit = defineEmits(['create-request']);

const { authUserCan } = useAuthorization();

const serverItems = ref([]);
const loading = ref(false);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const searchValue = ref('');

const headers = [
    { title: 'DELIVERY DOCUMENT', key: 'delivery_document', sortable: false },
    { title: 'SOLD-TO', key: 'sold_to', sortable: false },
    { title: 'SHIP-TO', key: 'ship_to', sortable: false },
    { title: 'DELIVERY DATE', key: 'delivery_date', sortable: false },
    { title: 'MATERIALS', key: 'materials', sortable: false },
    { title: 'RESERVED PALLETS', key: 'reserved_pallet_count', align: 'center', sortable: false },
    { title: 'ACTION', key: 'action', align: 'center', sortable: false },
]

const loadItems = ({ page: pageNumber, itemsPerPage: perPage }) => {
    loading.value = true;
    page.value = pageNumber;

    ApiService.query('fumigations/sensitive-deliveries', {
        params: {
            page: pageNumber,
            itemsPerPage: perPage,
            search: searchValue.value,
            plant_code: props.plantCode,
        },
    })
        .then((response) => {
            totalItems.value = response.data.total;
            serverItems.value = response.data.data;
        })
        .catch((error) => {
            console.error(error);
            serverItems.value = [];
            totalItems.value = 0;
        })
        .finally(() => {
            loading.value = false;
        });
};

const reload = () => loadItems({ page: 1, itemsPerPage: itemsPerPage.value });

const handleSearch = debounce((search) => {
    searchValue.value = search;
}, 500);

watch(() => props.plantCode, reload);

const uniqueMaterials = delivery =>
    [...new Set((delivery.delivery_items ?? []).map(item => item.material_description ?? item.material_number).filter(Boolean))];

defineExpose({ reload });
</script>

<template>
    <div class="d-flex align-center gap-4 pa-4">
        <SearchInput class="flex-grow-1" @update:search="handleSearch" />
    </div>
    <VDataTableServer
        v-model:items-per-page="itemsPerPage"
        :headers="headers"
        :items="serverItems"
        :items-length="totalItems"
        :loading="loading"
        item-value="delivery_document"
        :search="searchValue"
        @update:options="loadItems"
        class="text-no-wrap"
    >
        <template #item.delivery_document="{ item }">
            <span class="font-weight-bold">{{ item.delivery_document }}</span>
        </template>

        <template #item.sold_to="{ item }">
            <div class="font-weight-medium">{{ item.sold_to_name }}</div>
            <div class="text-caption text-medium-emphasis">{{ item.sold_to_customer }}</div>
        </template>

        <template #item.ship_to="{ item }">
            <div>{{ item.ship_to_name }}</div>
            <div class="text-caption text-medium-emphasis">{{ item.ship_to_customer }}</div>
        </template>

        <template #item.delivery_date="{ item }">
            {{ item.delivery_date ? Moment(item.delivery_date).format('MMMM D, YYYY') : '—' }}
        </template>

        <template #item.materials="{ item }">
            <div v-for="material in uniqueMaterials(item)" :key="material" class="text-caption">{{ material }}</div>
        </template>

        <template #item.reserved_pallet_count="{ item }">
            <v-chip :color="item.reserved_pallet_count > 0 ? 'primary' : 'secondary'" size="small" variant="tonal" class="font-weight-bold">
                {{ item.reserved_pallet_count }}
            </v-chip>
        </template>

        <template #item.action="{ item }">
            <v-btn
                v-if="authUserCan('create.fumigation.requests')"
                size="small"
                color="primary"
                variant="tonal"
                prepend-icon="ri-add-line"
                @click="emit('create-request', item)"
            >
                Create Request
            </v-btn>
        </template>
    </VDataTableServer>
</template>
