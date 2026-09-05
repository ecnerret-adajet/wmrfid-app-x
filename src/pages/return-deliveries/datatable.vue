<script setup>
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import { ref } from 'vue';
import { VDataTableServer } from 'vuetify/components';

const emits = defineEmits(['pagination-changed']);

const props = defineProps({
    search: {
        type: String,
        default: ''
    },
});

const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref('-created_at');
const filters = ref(null);

const showDeliveryItems = ref(false);
const selectedDelivery = ref(null);

const toast = ref({
    message: 'Toast message!',
    color: 'success',
    show: false
});

const headers = [
    { title: 'DELIVERY NUMBER', key: 'delivery_document' },
    { title: 'CUSTOMER', key: 'customer', sortable: false },
    { title: 'DELIVERY DATE', key: 'delivery_date' },
    { title: 'PICKING STATUS', key: 'picking_status' },
    { title: 'GOODS ISSUE STATUS', key: 'goods_issue_status' },
    { title: 'DELIVERY ITEMS', key: 'delivery_items', align: 'center', sortable: false },
    { title: '', key: 'action', align: 'center', sortable: false },
];

const loadItems = ({ page, itemsPerPage, sortBy, search }) => {
    loading.value = true;
    if (sortBy && sortBy.length > 0) {
        const sort = sortBy[0];
        sortQuery.value = sort.order === 'desc' ? `-${sort.key}` : sort.key;
    } else {
        sortQuery.value = '-created_at';
    }

    ApiService.query('datatable/return-deliveries', {
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
            serverItems.value = response.data.data;
            loading.value = false;

            emits('pagination-changed', { page, itemsPerPage, sortBy: sortQuery.value, search: props.search });
        })
        .catch((error) => {
            console.log(error);
            loading.value = false;
        });
}

const applyFilters = (data) => {
    filters.value = data;
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{ key: 'created_at', order: 'desc' }],
        search: props.search
    });
}

const handleAction = (delivery, action) => {
    if (action === 'view_delivery_items') {
        selectedDelivery.value = delivery;
        showDeliveryItems.value = true;
    }
}

defineExpose({
    loadItems,
    applyFilters
})
</script>

<template>
    <VDataTableServer v-model:items-per-page="itemsPerPage" fixed-header :headers="headers" :items="serverItems"
        :items-length="totalItems" :loading="loading" item-value="id" :search="search" @update:options="loadItems">

        <template #item.customer="{ item }">
            <div class="d-flex flex-column py-1">
                <span class="font-weight-bold text-sm">{{ item.sold_to_name }}</span>
                <span class="text-sm">{{ item.ship_to_name }}</span>
            </div>
        </template>

        <template #item.delivery_items="{ item }">
            {{ item.delivery_items?.length ?? 0 }}
        </template>

        <!-- Actions -->
        <template #item.action="{ item }">
            <div class="d-flex justify-center gap-1">
                <v-menu location="end">
                    <template v-slot:activator="{ props }">
                        <v-btn icon="ri-more-2-line" variant="text" v-bind="props" color="grey"></v-btn>
                    </template>
                    <v-list>
                        <v-list-item @click="handleAction(item, 'view_delivery_items')">View Delivery Items</v-list-item>
                    </v-list>
                </v-menu>
            </div>
        </template>
    </VDataTableServer>

    <v-dialog v-model="showDeliveryItems" max-width="1300px">
        <v-card elevation="2">
            <v-card-title class="d-flex justify-space-between align-center mx-4 px-4 mt-6">
                <div class="text-h4 font-weight-bold ps-2 text-primary">
                    Return Delivery Items — {{ selectedDelivery?.delivery_document }}
                </div>
                <v-btn icon="ri-close-line" variant="text" @click="showDeliveryItems = false"></v-btn>
            </v-card-title>
            <v-card-text>
                <v-table density="compact" class="elevation-0 border mx-4">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Material</th>
                            <th>Plant</th>
                            <th>Storage Location</th>
                            <th class="text-center">Quantity</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(item, index) in selectedDelivery?.delivery_items" :key="index">
                            <td>{{ item.item_number }}</td>
                            <td>{{ item.material_number }}</td>
                            <td>{{ item.plant }}</td>
                            <td>{{ item.storage_location }}</td>
                            <td class="text-center">{{ item.delivery_quantity }} {{ item.sales_unit }}</td>
                        </tr>
                    </tbody>
                </v-table>
                <div class="d-flex justify-end mt-8 mx-4">
                    <v-btn color="secondary" variant="outlined" @click="showDeliveryItems = false" type="button">Close</v-btn>
                </div>
            </v-card-text>
        </v-card>
    </v-dialog>

    <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event" />
</template>
