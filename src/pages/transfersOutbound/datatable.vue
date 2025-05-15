<script setup>
import DefaultModal from '@/components/DefaultModal.vue';
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
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
const showDeliveryItems = ref(false);
const deliveryData = ref([]);

const headers = [
    {
        title: '',
        key: 'action',
        align: 'center',
        sortable: false,
    },
    {
        title: 'Status',
        key: 'overall_status',
    },
    {
        title: 'Transport No.',
        key: 'transport_number',
    },
    {
        title: 'PO Number',
        key: 'po_number',
    },
    {
        title: 'Plate Number',
        key: 'plate_number',
        align: 'center',
        sortable: false,
    },
    {
        title: 'Driver Name',
        key: 'driver_name',
        sortable: false,
    },
    {
        title: 'Vendor Name',
        key: 'vendor_name',
    },
    {
        title: 'Transport Qty',
        key: 'transport_qty',
    },
    {
        title: 'Check In',
        key: 'check_in',
    },
    {
        title: 'Load Start',
        key: 'loadstart',
    },
    {
        title: 'Load End',
        key: 'loadend',
    },
    {
        title: 'Issuing',
        key: 'issuing',
    },
    {
        title: 'Receiving',
        key: 'receiving',
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

    ApiService.query('datatable/transfer-orders-outbound',{
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
            console.log(serverItems.value);
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

const actionList = [
    { title: 'View Delivery Items', key: 'view_delivery_items' },
]

const handleViewDelivery = (delivery) => {
    router.push(`/deliveries/${delivery.delivery_document}`);
}

const handleAction = (delivery, action) => {
    deliveryData.value = delivery;
    if(action.key == 'view_delivery_items') {
        showDeliveryItems.value = true;
    }
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

    <template #item.overall_status="{ item }">
        {{ item.transport_tracking.overall_status }}
    </template>

    <template #item.po_number="{ item }">
        {{ item.purchase_order.po_number }}
    </template>
    
    <template #item.plate_number="{ item }">
        {{ item.transport_tracking.plate_number }}
    </template> 
    
    <template #item.driver_name="{ item }">
        {{ item.transport_tracking.driver_name }}
    </template>
    
    <template #item.vendor_name="{ item }">
        {{ item.transport_tracking.vendor_name }}
    </template>
    
    <template #item.check_in="{ item }">
        {{ item.transport_tracking.check_in }}
    </template>
    
    <template #item.transport_qty="{ item }">
        {{ item.transport_load.qty }}
    </template>
    
    <template #item.loadstart="{ item }">
        {{ item.transport_tracking.loadstart }}
    </template>
    
    <template #item.loadend="{ item }">
        {{ item.transport_tracking.loadend }}
    </template>
    
    <template #item.issuing="{ item }">
        <div class="d-flex flex-column py-3">
            <span>{{ item.purchase_order.plant?.name }}</span>
            <span class="font-weight-bold">{{ item.purchase_order.plant?.plant_code }}</span>
        </div>
    </template>
    
    <template #item.receiving="{ item }">
        <div class="d-flex flex-column py-3">
            <span>{{ item.purchase_order.receiving_plant?.name }}</span>
            <span class="font-weight-bold">{{ item.purchase_order.receiving_plant?.plant_code }}</span>
        </div>
    </template>

    <!-- Actions -->
    <template #item.action="{ item }">
        <div class="d-flex justify-center gap-1">
            <v-menu location="end"> 
                <template v-slot:activator="{ props }">
                    <v-btn icon="ri-more-2-line" variant="text" v-bind="props" color="grey"></v-btn>
                </template>
                <v-list>
                <v-list-item
                    @click="handleAction(item, action)"
                    v-for="(action, i) in actionList"
                        :key="i"
                        :value="i"
                    >
                    <v-list-item-title>{{ action.title }}</v-list-item-title>
                </v-list-item>
                </v-list>
            </v-menu>
        </div>
    </template>
    </VDataTableServer>

    <!-- Delivery items modal -->
    <DefaultModal :dialog-title="`${deliveryData?.delivery_document} - Delivery Items`" :show="showDeliveryItems" @close="showDeliveryItems = false" min-height="auto"
        class="position-absolute d-flex align-center justify-center"  :fullscreen="true">
        <v-table class="mt-4">
                <thead>
                    <tr>
                        <th>Item No.</th>
                        <th>Sloc</th>
                        <th>Material</th>
                        <th>Material Desc</th>
                        <th>Quantity</th>
                        <th>UOM</th>
                        <th>Batch</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(item, index) in deliveryData?.items" :key="index">
                        <td>{{ item.item }}</td>
                        <td>{{ item.storage_location_id }}</td>
                        <td>{{ item.material }}</td>
                        <td>{{ item.material_desc }} </td>
                        <td>{{ item.quantity }}</td>
                        <td>{{ item.base_uom }}</td>
                        <td>{{ item.batch_item_number }}</td>
                    </tr>
                </tbody>
            </v-table>
    </DefaultModal>

    <Toast :show="toast.show" :message="toast.message"/>

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
