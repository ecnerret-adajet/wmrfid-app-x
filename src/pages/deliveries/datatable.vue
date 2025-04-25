<script setup>
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
    },
    {
        title: 'RESERVED PALLETS',
        key: 'reserved_pallets',
    },
    // {
    //     title: 'STATUS',
    //     key: 'status',
    //     align: 'center',
    //     sortable: false,
    // },
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
    router.push(`/deliveries/${delivery.delivery_document}`);
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
        {{ item.shipment?.shipment_number }}
    </template>

    <template #item.items="{ item }">
        {{ item.items.length }}
    </template>

    <template #item.reserved_pallets="{ item }">
        0
    </template>

    <!-- <template #item.status="{ item }">
        <v-chip 
            v-if="!item.load_end_date || item.load_end_time"
            class="ma-2"
            color="success"
            outlined
            label
        >
        Success
        </v-chip>
        <v-chip
            v-else
            class="ma-2"
            color="primary-2-light"
            outlined
            label
        >
        Pending
        </v-chip>
    </template> -->
    


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
