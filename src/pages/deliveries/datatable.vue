<script setup>
import DefaultModal from '@/components/DefaultModal.vue';
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { VDataTableServer } from 'vuetify/components';
import ReservedPallets from './reservedPallets.vue';
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
const showReservedPallets = ref(false);
const deliveryData = ref([]);

const headers = [
    {
        title: 'DELIVERY NUMBER',
        key: 'delivery_document',
    },
    {
        title: 'PLANT',
        key: 'plant_name',
    },
    {
        title: 'CUSTOMER',
        key: 'ship_to_customer',
    },
    {
        title: 'SHIPMENT',
        key: 'shipment_number',
    },
    {
        title: 'ITEMS',
        key: 'items',
        align: 'center',
        sortable: false
    },
    {
        title: 'RESERVED PALLETS',
        key: 'reserved_pallets',
        align: 'center',
        sortable: false
    },
    {
        title: 'ACTION',
        key: 'action',
        align: 'center',
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
    { title: 'Reserve Pallets', key: 'reserved_pallets' },
    { title: 'View Reserved Pallets', key: 'view_reserved_pallets' },

]

const handleViewDelivery = (delivery) => {
    router.push(`/deliveries/${delivery.delivery_document}`);
}

const handleAction = (delivery, action) => {
    deliveryData.value = delivery;
    if(action.key == 'view_delivery_items') {
        showDeliveryItems.value = true;
    } else if (action.key == 'reserved_pallets') {
        showReservedPallets.value = true;
    }
}

const displayPlateNumber = computed(() => {
  return deliveryData.value?.shipment?.plate_number_1 || 
    deliveryData.value?.shipment?.plate_number_2 || 
    deliveryData.value?.shipment?.plate_number_3 || 
         "N/A"; // Default value if none exist
});

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

    <template #item.delivery_document="{ item }">
        <span @click="handleViewDelivery(item)" class="text-primary font-weight-bold cursor-pointer hover-underline">
            {{ item.delivery_document }}
        </span>
    </template>

    <template #item.plant_name="{ item }">
        {{ item?.plant?.name }}
    </template>

    <template #item.ship_to_customer="{ item }">
        {{ item.ship_to_customer }}
    </template>

    <template #item.shipment_number="{ item }">
        {{ item.shipment_number }}
    </template>

    <template #item.items="{ item }">
        {{ item.items.length }}
    </template>

    <template #item.reserved_pallets="{ item }">
        0
    </template>
    
    <!-- Actions -->
    <template #item.action="{ item }">
        <div class="d-flex justify-center gap-1">
            <v-menu location="start"> 
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
        <v-card>
            <v-card-title>
                <VList lines="one" density="compact" class="mt-4">
                    <VListItem>
                        <VRow class="table-row" no-gutters>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis">Shipment</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-medium-emphasis">{{ deliveryData?.shipment_number }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis" >Hauler</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-medium-emphasis">
                                            {{ deliveryData?.shipment?.hauler_name }}
                                        </span>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                    <VListItem>
                        <VRow class="table-row" no-gutters>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis" >Plant</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-medium-emphasis">{{ deliveryData?.plant?.name }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis" >Plate Number</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-medium-emphasis">{{ displayPlateNumber }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                    <VListItem>
                        <VRow class="table-row" no-gutters>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis " >Driver</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-medium-emphasis">{{ deliveryData?.shipment?.driver_name }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                            </VCol>
                        </VRow>
                    </VListItem>
                    <!-- Add item as needed  -->
                </VList>
            </v-card-title>
        <v-divider class="my-4"></v-divider>

            <v-card-text>
                <v-table class="mt-4 striped">
                    <thead>
                        <tr>
                            <th>Item No.</th>
                            <th>Storage Location</th>
                            <th>Material</th>
                            <th>Material Desc</th>
                            <th class="text-center">Quantity</th>
                            <th class="text-center">UOM</th>
                            <th class="text-center">Batch</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(item, index) in deliveryData?.items" :key="index">
                            <td>{{ item.item }}</td>
                            <td>{{ item.storage_location?.name ?? '' }}</td>
                            <td>{{ item.material }}</td>
                            <td>{{ item.material_desc }} </td>
                            <td class="text-center">{{ item.quantity }}</td>
                            <td class="text-center">{{ item.base_uom }}</td>
                            <td class="text-center">{{ item.batch_item_number }}</td>
                        </tr>
                    </tbody>
                </v-table>
            </v-card-text>
        </v-card>
           
    </DefaultModal>

    <!-- Show Reserved Pallets Modal -->
    <ReservedPallets v-if="deliveryData"
        :show="showReservedPallets" 
        :delivery-data="deliveryData" 
        @close="showReservedPallets = false"
    />

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
