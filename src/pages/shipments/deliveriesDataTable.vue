<script setup>
import DefaultModal from '@/components/DefaultModal.vue';
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

const isLoading = ref(false);
const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref('-created_at'); // Default sort
const filters = ref(null);
const deliveryItemsModalOpen = ref(false);
const selectedDelivery = ref(null);

// Delivery items table variables
const itemsTotalItems = ref(0);
const deliveryItemsPerPage = ref(10);

const headers = [
    {
        title: 'DELIVERY DOCUMENT',
        key: 'delivery_document',
    },
    {
        title: 'PLANT',
        key: 'plant_id',
    },
    {
        title: 'LAST UPDATED AT',
        key: 'updated_at',
    },
    {
        title: 'CREATED AT',
        key: 'created_at',
    },
    {
        title: 'ACTIONS',
        key: 'actions',
        sortable: false,
    },
]

const deliveryItemsHeaders = [
    {
        title: 'ITEM',
        key: 'item',
        sortable: false,
    },
    {
        title: 'MATERIAL',
        key: 'material',
        sortable: false,
    },
    {
        title: 'DESCRIPTION',
        key: 'material_desc',
        sortable: false,
    },
    {
        title: 'QUANTITY',
        key: 'quantity',
        sortable: false,
    },
    {
        title: 'UNIT',
        key: 'sales_unit',
        sortable: false,
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

    ApiService.query('datatable/deliveries',{
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
    message: 'Toast message!',
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

const items = [
    { title: 'View Picklist' },
    { title: 'View Curtain Screen' },
]

const handleViewDelivery = (delivery) => {
    selectedDelivery.value = delivery
    deliveryItemsModalOpen.value = true;
}

const closeModal = () => {
    // Clear selected object

    deliveryItemsModalOpen.value = false;
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
        class="text-no-wrap mt-4"
    >

    <template #item="{ item }">
        <tr @click="handleViewDelivery(item)" class="clickable-row">
            <td>{{ item.delivery_document }}</td>
            <td>{{ item.plant?.name }}</td>
            <td>{{ item.created_at ? Moment(item.created_at).format('MMMM D, YYYY') : '' }}</td>
            <td>{{ item.updated_at ? Moment(item.updated_at).format('MMMM D, YYYY') : '' }}</td>
            <td>
                <div class="d-flex gap-1">
                    <!-- <v-menu location="start"> 
                        <template v-slot:activator="{ props }">
                            <v-btn icon="ri-more-2-line" variant="text" v-bind="props" color="grey"></v-btn>
                        </template>
                        <v-list>
                        <v-list-item
                            v-for="(item, i) in items"
                                :key="i"
                                :value="i"
                            >
                            <v-list-item-title>{{ item.title }}</v-list-item-title>
                        </v-list-item>
                        </v-list>
                    </v-menu> -->
                </div>
            </td>
        </tr>
    </template>

    <!-- Actions -->
    <!-- <template #item.actions="{ item }">
        <div class="d-flex gap-1">
            <v-menu location="start"> 
                <template v-slot:activator="{ props }">
                    <v-btn icon="ri-more-2-line" variant="text" v-bind="props" color="grey"></v-btn>
                </template>
                <v-list>
                <v-list-item
                    v-for="(item, i) in items"
                        :key="i"
                        :value="i"
                    >
                    <v-list-item-title>{{ item.title }}</v-list-item-title>
                </v-list-item>
                </v-list>
            </v-menu>
        </div>
    </template> -->
    </VDataTableServer>

    <DefaultModal :dialog-title="'Delivery Items'" :show="deliveryItemsModalOpen" @close="closeModal">
        <VDataTableServer 
            v-model:items-per-page="deliveryItemsPerPage"
            :headers="deliveryItemsHeaders"
            :items="selectedDelivery.items"
            :items-length="itemsTotalItems"
            item-value="id"
            class="text-no-wrap"
        >
            <template v-if="selectedDelivery.items.length > 0" #item="{ item }">
                <tr>
                    <td>{{ item.item }}</td>
                    <td>{{ item.material }}</td>
                    <td>{{ item.material_desc }}</td>
                    <td>{{ item.quantity }}</td>
                    <td>{{ item.sales_unit }}</td>
                </tr>
            </template>
        </VDataTableServer>
    </DefaultModal>

    <Toast :show="toast.show" :message="toast.message"/>

</template>

<style scoped>

.clickable-row {
    cursor: pointer;
    transition: background-color 0.2s ease-in-out;
}

.clickable-row:hover {
    background-color: rgba(173,215,192, 0.3); 
}
</style>
