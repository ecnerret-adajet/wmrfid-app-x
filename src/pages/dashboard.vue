<script setup>
import InventoryAgeChart from '@/components/dashboard/InventoryAgeChart.vue';
import WarehouseUtilization from '@/components/dashboard/WarehouseUtilization.vue';
import JwtService from '@/services/JwtService';
import axios from 'axios';
import Moment from "moment";
import { ref, watch } from 'vue';

const storageLocations = ref([]);
const totalItems = ref(0);
const itemsPerPage = ref(5);
const serverItems = ref([]);
const page = ref(1);
const pageLoading = ref(false);
const sortQuery = ref('-created_at'); // Default sort
const statisticsData = ref(null);
const filters = reactive({
    storage_location_id: null,
})

const headers = [
    {
        title: 'STORAGE LOCATION',
        key: 'storage_location_id',
        sortable: false
    },
    {
        title: 'MATERIAL',
        key: 'material_id',
        sortable: false
    },
    {
        title: 'START DATE TIME',
        key: 'start_date_time',
        sortable: false
    },
    {
        title: 'END DATE TIME',
        key: 'end_date_time',
        sortable: false
    },
    {
        title: 'STATUS',
        key: 'status',
        sortable: false
    },
]

watch(() => filters.storage_location_id, () => {
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{ key: sortQuery.value.replace('-', ''), order: sortQuery.value.startsWith('-') ? 'desc' : 'asc' }]
    });
});

const loadItems = async ({ page, itemsPerPage, sortBy }) => {
    pageLoading.value = true
    if (sortBy && sortBy.length > 0) {
        const sort = sortBy[0];  // Assuming single sort field
        sortQuery.value = `${sort.key}`;  // Default ascending order
        if (sort.order === 'desc') {
            sortQuery.value = `-${sort.key}`;  // Prefix with minus for descending order
        }
    } else {
        sortQuery.value = '-created_at';
    }

    try {
        const token = JwtService.getToken();
    
        const response = await axios.get('/dashboard/get-data/', {
            params: {
                page,
                itemsPerPage,
                sort: sortQuery.value,
                filters: filters
            },
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const { table, statistics, storage_locations } = response.data;
        
        totalItems.value = table.total;
        serverItems.value = table.data;

        statisticsData.value = statistics;

        storageLocations.value = storage_locations.map(item => ({
            value: item.id,
            title: item.name,
            name: item.name
        }));

    } catch (error) {
        console.log(error);
    } finally {
        pageLoading.value = false;
    }
}

</script>

<template>
    <v-select class="mx-4 mb-4" style="width: 380px;" label="Select Storage Location" density="compact"
        :items="[{ title: 'All', value: null }, ...storageLocations]" v-model="filters.storage_location_id"
        :rules="[value => value !== undefined || 'Please select an item from the list']"
    >
    </v-select>

    <!-- TOP KPI  -->
    <VRow class="match-height ml-1">
        <v-col cols="12"
            sm="12"
            md="3">
            <v-card
                class="pa-4"
                elevation="2"
                style="border-radius: 10px; background-color: #f9fafb;"
            >
                <div class="d-flex align-center">
                <div
                    class="d-flex align-center justify-center mr-4"
                    style="
                    width: 48px;
                    height: 48px;
                    background-color: #cae2fa;
                    border-radius: 12px;
                    "
                >
                    <v-icon
                    icon="ri-barcode-box-line"
                    color="primary"
                    size="24"
                    ></v-icon>
                </div>
                <div>
                    <span class="text-subtitle-1 font-weight-bold text-grey-700">
                    Total Inventory Items
                    </span>
                    <div class="text-h4 font-weight-bold text-primary mt-1">
                        {{ statisticsData?.total_inventory_items || 0 }}
                    </div>
                </div>
                </div>
            </v-card>
        </v-col>


        <v-col cols="12"
            sm="12"
            md="3">
            <v-card
                class="pa-4"
                elevation="2"
                style="border-radius: 10px; background-color: #f9fafb;"
            >
                <div class="d-flex align-center">
                <div
                    class="d-flex align-center justify-center mr-4"
                    style="
                    width: 48px;
                    height: 48px;
                    background-color: #cae2fa;
                    border-radius: 12px;
                    "
                >
                    <v-icon
                    icon="ri-home-gear-line"
                    color="primary-light"
                    size="24"
                    ></v-icon>
                </div>
                <div>
                    <span class="text-subtitle-1 font-weight-bold text-grey-700">
                    Today's Production
                    </span>
                    <div class="text-h4 font-weight-bold text-primary mt-1">
                        {{ statisticsData?.todays_production_count || 0 }}
                    </div>
                </div>
                </div>
            </v-card>
        </v-col>
        <v-col cols="12"
            sm="12"
            md="3">
            <v-card
                class="pa-4"
                elevation="2"
                style="border-radius: 10px; background-color: #f9fafb;"
            >
                <div class="d-flex align-center">
                <div
                    class="d-flex align-center justify-center mr-4"
                    style="
                    width: 48px;
                    height: 48px;
                    background-color: #cae2fa;
                    border-radius: 12px;
                    "
                >
                    <v-icon
                    icon="ri-box-1-line"
                    color="secondary"
                    size="24"
                    ></v-icon>
                </div>
                <div>
                    <span class="text-subtitle-1 font-weight-bold text-grey-700">
                    Today's Batches
                    </span>
                    <div class="text-h4 font-weight-bold text-primary mt-1">
                        {{ statisticsData?.todays_batches_count || 0 }}
                    </div>
                </div>
                </div>
            </v-card>
        </v-col>
        <v-col cols="12"
            sm="12"
            md="3">
            <v-card
                class="pa-4"
                elevation="2"
                style="border-radius: 10px; background-color: #f9fafb;"
            >
                <div class="d-flex align-center">
                <div
                    class="d-flex align-center justify-center mr-4"
                    style="
                    width: 48px;
                    height: 48px;
                    background-color: #cae2fa;
                    border-radius: 12px;
                    "
                >
                    <v-icon
                    icon="ri-truck-line"
                    color="info"
                    size="24"
                    ></v-icon>
                </div>
                <div>
                    <span class="text-subtitle-1 font-weight-bold text-grey-700">
                    Pending Shipments
                    </span>
                    <div class="text-h4 font-weight-bold text-primary mt-1">
                        {{ statisticsData?.pending_shipments || 0 }}
                    </div>
                </div>
                </div>
            </v-card>
        </v-col>
    
    </VRow>

    <!-- middle section -->
    <VRow class="match-height ml-1">
        <VCol
            cols="12"
            sm="12"
            md="6"
        >
            <WarehouseUtilization :series="statisticsData?.warehouse_utilization"/>
        </VCol>
        <VCol
            cols="12"
            sm="12"
            md="6"
        >
            <InventoryAgeChart :data="statisticsData?.inventory_age"/>
        </VCol>
    
    
    </VRow>

    <v-card class="mx-4 mt-4" elevation="2">
        <v-card-title class="text-h5 font-weight-bold mt-4 mx-4">
            Recent Production Runs
        </v-card-title>
        <v-card-text>
            <VDataTableServer 
                    v-model:items-per-page="itemsPerPage"
                    :headers="headers"
                    :items="serverItems"
                    :items-length="totalItems"
                    item-value="id"
                    @update:options="loadItems"
                    class="text-no-wrap"
            >
                <template #item.storage_location_id="{ item }">
                    {{ item.production_line?.reader?.storage_location?.name }}
                </template>
                <template #item.material_id="{ item }">
                    {{ item.material?.description }}
                </template>
                <template #item.start_date_time="{ item }">
                    {{ item.start_date_time ? Moment(item.start_date_time).format('MMMM D, YYYY h:mm A') : '' }}
                </template>

                <template #item.end_date_time="{ item }">
                    {{ item.end_date_time ? Moment(item.end_date_time).format('MMMM D, YYYY h:mm A') : '' }}
                </template>

                <template #item.status="{ item }">
                    <v-chip v-if="item.end_date_time" color="success" variant="flat">
                        Completed
                    </v-chip>
                    <v-chip v-else color="primary-2">In Progress</v-chip>
                </template>
            </VDataTableServer>
        </v-card-text>
    </v-card>
    <Loader :show="pageLoading"/>
</template>
