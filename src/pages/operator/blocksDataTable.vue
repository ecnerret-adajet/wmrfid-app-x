<script setup>
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import { ref } from 'vue';
import { VDataTableServer } from 'vuetify/components';

const emits = defineEmits(['pagination-changed', 'cancel-open']);

const props = defineProps({
    search: {
        type: String,
        default: ''
    },
    storageLocation: String
});

const isLoading = ref(false);
const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref('-updated_at'); // Default sort
const errorMessage = ref(null)
const filters = ref(null);

const headers = [
    {
        title: 'BLOCK',
        key: 'block',
        sortable: false
    },
    {
        title: 'ASSIGNED ITEM',
        key: 'assigned_item',
        align: 'center',
        sortable: false
    },
    {
        title: '',
        key: 'action',
        sortable: false,
        align: 'end',
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
        sortQuery.value = '-updated_at';
    }

    ApiService.query(`warehouse/get-blocks/${props.storageLocation}`,{
        params: {
            page,
            itemsPerPage,
            sort: sortQuery.value,
            search: props.search
        }
        })
        .then((response) => {
            totalItems.value = response.data.total;

            serverItems.value = response.data.data.map(item => ({
                id: item.id,
                label: item.label,
                inventories_count: item.inventories_count,
                isSelected: false,
                storage_location_id: item.storage_location_id
            }));

            loading.value = false
            console.log(serverItems.value);
            emits('pagination-changed', { page, itemsPerPage, sortBy: sortQuery.value, search: props.search });
        })
        .catch((error) => {
            console.log(error);
        });
}

const toast = ref({
    message: 'Test',
    color: 'success',
    show: false
});

const selectBlock = (block) => {
    console.log(block);
}

const cancelBlock = (block) => {
    console.log(block);
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

    <template #item.block="{ item }">
        {{ item.lot.label }} - {{ item.label }}123123
    </template>

    <template #item.assigned_item="{ item }">
        <td class="d-flex justify-center align-center">
            {{ item.inventories_count ?? 0}}
        </td>
    </template> 

    <template #item.action="{ item }">
        <template v-if="item.isSelected === false">
            <v-btn @click="selectBlock(item)" class="px-5" type="button" color="primary-light">
                Open
            </v-btn>
        </template>
        <template v-else>
            <button v-if="item.isSelected === true" @click="cancelBlock(item)"
                class="btn btn-warning float-right ml-3">Cancel</button>
            <button v-else isabled class="btn btn-secondary float-right disabled">
                {{ item.isSelected === true ? "Selected" : "Open" }}
            </button>
        </template>
    </template> 


    </VDataTableServer>


    <Toast :show="toast.show" :message="toast.message"/>

</template>
