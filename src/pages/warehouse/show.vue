<script setup>
import JwtService from '@/services/JwtService';
import axios from 'axios';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AgeChart from './ageChart.vue';
import UtilizationChart from './utilizationChart.vue';

const pageLoading = ref(true);
const route = useRoute();
const router = useRouter();
const storageLocation = route.params.location;
const storageLocationModel = ref(null)

// Table variables
const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);

const headers = [
    {
        title: 'Batch',
        key: 'batch',
    },
    {
        title: 'Physical ID',
        key: 'physical_id',
    },
    {
        title: 'Type',
        key: 'type',
    },
    {
        title: 'Material',
        key: 'material',
    },
    {
        title: 'MFG DATE',
        key: 'mfg_date',
    },
    {
        title: 'TOTAL QUANTITY',
        key: 'load_start_date',
    },
    {
        title: 'LOAD END',
        key: 'load_end_date',
    },
]

onMounted(() => {
    loadData();
});

const loadData = async () => {
    pageLoading.value = true;
    try {
        const token = JwtService.getToken();
    
        const response = await axios.get(`/warehouse/${storageLocation}/get-warehouse-information`, {
            params: {
                
            },
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const { warehouse_information,  } = response.data;
        storageLocationModel.value = warehouse_information;
     
    } catch (error) {
        console.log(error);
    } finally {
        pageLoading.value = false;
    }
}

const loadItems = ({ page, itemsPerPage, sortBy, search }) => {

}

</script>
<template>
    <v-progress-linear v-if="pageLoading" indeterminate color="primary" class="mt-5"></v-progress-linear>
    <div v-else>
        <v-card elevation="2">
            <v-card-title>
                <div class="d-flex justify-space-between align-center px-4 mt-4">
                    <h4 class="text-h4 font-weight-black text-primary">Warehouse Details</h4>
                    <v-btn color="primary-light" @click="$router.push({ name: 'warehouse-map', params: { location: storageLocation } })">
                        View Warehouse Map
                    </v-btn>
                </div>

                <VList lines="one" density="compact" class="mt-4">
                    <VListItem>
                        <VRow class="table-row" no-gutters>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 text-uppercase font-weight-black text-grey-700" style="margin-top: 1px;">Name</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium">{{ storageLocationModel?.name }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 text-uppercase font-weight-black text-grey-700" style="margin-top: 1px;">Plant</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium">
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
                                        <span class="text-h6 text-uppercase font-weight-black  text-grey-700" style="margin-top: 1px;">Warehouse Code</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium">{{ storageLocationModel?.code }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 text-uppercase font-weight-black  text-grey-700" style="margin-top: 1px;">Plant Code</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium">{{ storageLocationModel?.plant?.plant_code }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                   
                    <!-- Add item as needed  -->
                </VList>
            </v-card-title>
        </v-card>
        <v-row class="mt-1">
            <v-col cols="12" sm="12" md="6">
                <UtilizationChart />
            </v-col>
            <v-col cols="12" sm="12" md="6">
                <AgeChart />
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
                    :items-length="totalItems"
                    item-value="id"
                    @update:options="loadItems"
                    class="text-no-wrap border"
                >
            </VDataTableServer>
        </v-card>
  
    </div>
</template>


