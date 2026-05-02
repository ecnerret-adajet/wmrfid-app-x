<script setup>
import ApiService from '@/services/ApiService';
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { VDataTableServer } from 'vuetify/components';

const props = defineProps({
    search: {
        type: String,
        default: ''
    }
});

const emits = defineEmits(['pagination-changed', 'update:selected']);

const route = useRoute();

const selectedItems = ref([]);
const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref('-created_at');

const headers = [
    { title: 'PALLET PHYSICAL ID', key: 'physical_id' },
    { title: 'QUANTITY', key: 'quantity', align: 'center', sortable: false },
    { title: 'BATCH', key: 'batch' },
    { title: 'MATERIAL', key: 'material', sortable: false },
    { title: 'BIN LOCATION', key: 'bin_location', sortable: false },
    { title: 'LAYER', key: 'position_in_block', align: 'center', sortable: false },
];

const loadItems = ({ page: pageVal, itemsPerPage: perPage, sortBy }) => {
    loading.value = true;

    const plant_code = route.params.plant_code;
    const sloc = route.params.sloc;
    const forklift = route.params.forklift;

    if (!plant_code || !sloc || !forklift) {
        loading.value = false;
        return;
    }

    if (sortBy && sortBy.length > 0) {
        const sort = sortBy[0];
        sortQuery.value = sort.order === 'desc' ? `-${sort.key}` : sort.key;
    } else {
        sortQuery.value = '-created_at';
    }

    ApiService.query(`for-quality-inspection/${plant_code}/${sloc}/${forklift}`, {
        params: {
            page: pageVal,
            itemsPerPage: perPage,
            sort: sortQuery.value,
            search: props.search,
        }
    })
        .then((response) => {
            totalItems.value = response.data.total;
            serverItems.value = response.data.data;
            loading.value = false;
            emits('pagination-changed', { page: pageVal, itemsPerPage: perPage, sortBy: sortQuery.value });
        })
        .catch((error) => {
            console.log(error);
            loading.value = false;
        });
};

const handleSelectionChange = (val) => {
    selectedItems.value = val;
    emits('update:selected', val);
};

defineExpose({ loadItems, selectedItems });
</script>

<template>
    <VDataTableServer
        v-model:items-per-page="itemsPerPage"
        :model-value="selectedItems"
        :headers="headers"
        :items="serverItems"
        :items-length="totalItems"
        :loading="loading"
        item-value="id"
        :search="search"
        show-select
        return-object
        @update:options="loadItems"
        @update:model-value="handleSelectionChange"
        class="text-no-wrap"
    >
        <template #item.material="{ item }">
            <span class="font-weight-bold">{{ item.material?.description }}</span><br />
            <span class="text-subtitle-1 text-medium-emphasis">{{ item.material?.bu_material }}</span>
        </template>

        <template #item.bin_location="{ item }">
            {{ item.block?.lot?.label ?? '--' }} - {{ item.block?.label ?? '--' }}
        </template>

        <template #item.position_in_block="{ item }">
            Layer {{ item.position_in_block ?? '--' }}
        </template>
    </VDataTableServer>
</template>
