<script setup>
import JwtService from '@/services/JwtService';
import axios from 'axios';
import Moment from 'moment';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AgeChart from './ageChart.vue';
import UtilizationChart from './utilizationChart.vue';

const pageLoading = ref(true);
const route = useRoute();
const router = useRouter();
const storageLocation = route.params.location;
const plantCode = route.params.plant;
const storageLocationModel = ref(null);
const warehouseUtilization = ref([]);
const inventoryAge = ref([]);

// Table variables
const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const searchValue = ref('');
const page = ref(1);
const sortQuery = ref('-created_at');
const filters = reactive([]);

const headers = [
    {
        title: 'Batch',
        key: 'batch',
    },
    {
        title: 'Physical ID',
        key: 'physical_id',
        sortable: false
    },
    {
        title: 'Location',
        key: 'location',
        sortable: false,
        align: 'center'
    },
    {
        title: 'Type',
        key: 'type',
        sortable: false
    },
    {
        title: 'Material',
        key: 'material',
        sortable: false
    },
    {
        title: 'MFG DATE',
        key: 'mfg_date',
    },
    {
        title: 'QUANTITY',
        key: 'quantity',
        align: 'center'
    },
]

onMounted(() => {
    loadData();
});

const loadData = async () => {
    pageLoading.value = true;
    try {
        const token = JwtService.getToken();
    
        const response = await axios.get(`/warehouse/${plantCode}/${storageLocation}/get-warehouse-information`, {
            params: {
                
            },
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const { warehouse_information, warehouse_utilization, inventory_age } = response.data;
        
        storageLocationModel.value = warehouse_information;
        warehouseUtilization.value = warehouse_utilization;
        inventoryAge.value = inventory_age;
        
    } catch (error) {
        console.log(error);
    } finally {
        pageLoading.value = false;
    }
}

const loadItems = async ({ page, itemsPerPage, sortBy, search }) => {
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

    try {
        const token = JwtService.getToken();
    
        const response = await axios.get(`/warehouse/${plantCode}/${storageLocation}/get-inventories`, {
            params: {
                page,
                itemsPerPage,
                sort: sortQuery.value,
                search: searchValue.value,
                filters: filters
            },
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        
        totalItems.value = response.data.total;
        serverItems.value = response.data.data

    } catch (error) {
        console.log(error);
    } finally {
        loading.value = false;
    }
}

const handleViewBatch = (inventory) => {
    router.push(`/inventories/${inventory.batch}`);
}

</script>
<template>
    <div>
        <v-skeleton-loader  v-if="pageLoading" type="card"></v-skeleton-loader>
        <v-card v-else elevation="2">
            <v-card-title>
                <div class="d-flex justify-space-between align-center px-4 mt-4">
                    <h4 class="text-h4 font-weight-black text-primary">Warehouse Details</h4>
                    <v-btn color="primary-light" @click="$router.push({ name: 'warehouse-map', params: { plant: plantCode ,location: storageLocation } })">
                        View Warehouse Map
                    </v-btn>
                </div>

                <VList lines="one" density="compact" class="mt-4">
                    <VListItem>
                        <VRow class="table-row" no-gutters>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 text-uppercase font-weight-bold text-high-emphasis" style="margin-top: 1px;">Name</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-medium-emphasis">{{ storageLocationModel?.name }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 text-uppercase font-weight-bold text-high-emphasis" style="margin-top: 1px;">Plant</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-medium-emphasis">
                                            {{ storageLocationModel?.plant?.name }}
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
                                        <span class="text-h6 text-uppercase font-weight-bold text-high-emphasis" style="margin-top: 1px;">Warehouse Code</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-medium-emphasis">{{ storageLocationModel?.code }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 text-uppercase font-weight-bold text-high-emphasis" style="margin-top: 1px;">Plant Code</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-medium-emphasis">{{ storageLocationModel?.plant?.plant_code }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                   
                    <!-- Add item as needed  -->
                </VList>
            </v-card-title>
        </v-card>
        <v-row class="mt-1 match-height">
            <v-col cols="12" sm="12" md="6">
                <div style="height: 100%;">
                    <v-skeleton-loader
                        v-if="pageLoading"
                        type="card"
                        style="height: 100%; min-height: 250px;"
                    ></v-skeleton-loader>

                    <div v-else style="height: 100%; min-height: 250px;">
                        <UtilizationChart :series="warehouseUtilization" />
                    </div>
                </div>
            </v-col>
            <v-col cols="12" sm="12" md="6">
                <div style="height: 100%;">
                    <v-skeleton-loader
                        v-if="pageLoading"
                        type="card"
                        style="height: 100%; min-height: 250px;"
                    ></v-skeleton-loader>

                    <div v-else style="height: 100%; min-height: 250px;">
                        <AgeChart :data="inventoryAge" />
                    </div>
                </div>
            </v-col>
        </v-row>
        <v-card
            elevation="2"
            class="mt-4"
        >
            <v-card-title class="mx-4 py-4">
                <h4 class="text-h5 font-weight-bold">Inventory</h4>
            </v-card-title>
            <VDataTableServer
                    v-model:items-per-page="itemsPerPage"
                    :headers="headers"
                    :items="serverItems"
                    :loading="loading"
                    :items-length="totalItems"
                    item-value="id"
                    @update:options="loadItems"
                    class="text-no-wrap border"
                >
                <template #item.batch="{ item }">
                    <span @click="handleViewBatch(item)" class="text-primary font-weight-bold cursor-pointer hover-underline">
                        {{ item.batch }}
                    </span>
                </template>
                <template #item.location="{ item }">
                    <v-chip v-if="item.block" color="success" variant="flat">
                        <span class="px-5">{{ item.block?.lot?.label }} - {{ item.block?.label }}</span>
                    </v-chip>
                    <v-chip v-else color="warning" variant="flat">
                        <span>Unassigned</span>
                    </v-chip>
                </template>
                <template #item.physical_id="{ item }">
                    {{ item.rfid?.name }}
                </template>
                <template #item.material="{ item }">
                    {{ item.material?.description }}
                </template>
                <template #item.mfg_date="{ item }">
                    {{ item.mfg_date ? Moment(item.mfg_date).format('MMMM D, YYYY') : '' }}
                </template>
            </VDataTableServer>
        </v-card>
  
    </div>
</template>


