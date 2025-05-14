<script setup>
import { generateSlug } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import JwtService from '@/services/JwtService';
import axios from 'axios';
import Moment from 'moment';
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const id = route.params.id;
const pageLoading = ref(false);
const requestData = ref(null);

const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref(null);
const searchValue = ref('');

onMounted(() => {
    loadData();
});

const headers = [
    {
        title: 'RFID Code',
        key: 'rfid_code',
    },
    {
        title: 'Physical ID',
        key: 'physical_id',
    },
    {
        title: 'TYPE',
        key: 'type',
        align: 'center',
        sortable: false,
    },
    {
        title: 'Plant',
        key: 'plant_id',
        sortable: false,
    },
    {
        title: 'Storage Location',
        key: 'storage_location_id',
        sortable: false,
    },
    {
        title: 'Block Location',
        key: 'block_location',
        align: 'center',
        sortable: false,
    },
    {
        title: 'BATCH',
        key: 'batch',
    },
    {
        title: 'Current Age',
        key: 'current_age',
        align: 'center',
        sortable: false,
    },
]

const loadData = async () => {
    pageLoading.value = true;
    try {
        const token = JwtService.getToken();
    
        const response = await axios.get(`/production-runs/get-fumigation-data/${id}`, {
            params: {
                
            },
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        
        if (response.data.status == 200) {
            requestData.value = response.data.details
        }
    } catch (error) {
        console.log(error);
    } finally {
        pageLoading.value = false;
    }
}

const loadItems = ({ page, itemsPerPage, sortBy, search }) => {
    loading.value = true
    if (sortBy && sortBy.length > 0) {
        const sort = sortBy[0];  // Assuming single sort field
        sortQuery.value = `${sort.key}`;  // Default ascending order
        if (sort.order === 'desc') {
            sortQuery.value = `-${sort.key}`;  // Prefix with minus for descending order
        }
    } else {
        sortQuery.value = '-id';
    }

    ApiService.query(`production-runs/get-fumigated-items-table/${id}`, {
            params: {
                page,
                itemsPerPage,
                sort: sortQuery.value,
                search: searchValue.value,
            }
        })
        .then((response) => {
            totalItems.value = response.data.total;
            serverItems.value = response.data.data
            loading.value = false
        })
        .catch((error) => {
            console.log(error);
        });
}



</script>
<template>
    <v-card>
        <v-skeleton-loader  v-if="pageLoading" type="article"></v-skeleton-loader>
        <v-card-text v-else>
            <div class="d-flex align-center px-4 ">
                <h4 class="text-h4 font-weight-black text-primary mr-2">Fumigation Details</h4>
                <v-badge v-if="requestData?.status == 'scheduled'"
                        color="info"
                        :content="requestData?.status"
                        class="text-uppercase"
                        inline
                ></v-badge>
                <v-badge v-else-if="requestData?.status == 'in progress'"
                        color="warning"
                        :content="requestData?.status"
                        class="text-uppercase"
                        inline
                ></v-badge>
                <v-badge v-else-if="requestData?.status == 'completed'"
                        color="success"
                        :content="requestData?.status"
                        class="text-uppercase"
                        inline
                ></v-badge>
            </div>
            <VList lines="one" density="compact" class="mt-4">
                <VListItem style="padding-top: 0px !important; padding-bottom: 0px !important;">
                    <VRow class="table-row" no-gutters>
                        <VCol md="6" class="table-cell d-inline-flex">
                            <VRow class="table-row">
                                <VCol cols="4" class="d-inline-flex align-center">
                                    <span class="text-h6 font-weight-bold text-high-emphasis">Material</span>
                                </VCol>
                                <VCol class="d-inline-flex align-center">
                                    <span class="font-weight-medium text-medium-emphasis">{{ requestData?.material?.description }}</span>
                                </VCol>
                            </VRow>
                        </VCol>
                        <VCol md="6" class="table-cell d-inline-flex">
                            <VRow class="table-row">
                                <VCol cols="4" class="d-inline-flex align-center">
                                    <span class="text-h6 font-weight-bold text-high-emphasis">Fumigation Age</span>
                                </VCol>
                                <VCol class="d-inline-flex align-center">
                                    <span class="font-weight-medium text-medium-emphasis">
                                        {{ requestData?.fumigation_age }}
                                    </span>
                                </VCol>
                            </VRow>
                        </VCol>
                    </VRow>
                </VListItem>
                <VListItem style="padding-top: 0px !important; padding-bottom: 0px !important;">
                    <VRow class="table-row" no-gutters>
                        <VCol md="6" class="table-cell d-inline-flex">
                            <VRow class="table-row">
                                <VCol cols="4" class="d-inline-flex align-center">
                                    <span class="text-h6 font-weight-bold text-high-emphasis ">Batch</span>
                                </VCol>
                                <VCol class="d-inline-flex align-center">
                                    <span class="font-weight-medium text-medium-emphasis">{{ requestData?.batch }}</span>
                                </VCol>
                            </VRow>
                        </VCol>
                        <VCol md="6" class="table-cell d-inline-flex">
                            <VRow class="table-row">
                                <VCol cols="4" class="d-inline-flex align-center">
                                    <span class="text-h6 font-weight-bold text-high-emphasis ">Start Date</span>
                                </VCol>
                                <VCol class="d-inline-flex align-center">
                                    <span class="font-weight-medium text-medium-emphasis">
                                        {{ requestData?.start_date ? Moment(requestData?.start_date).format('MMMM D, YYYY') : '' }}
                                    </span>
                                </VCol>
                            </VRow>
                        </VCol>
                    </VRow>
                </VListItem>
                <VListItem style="padding-top: 0px !important; padding-bottom: 0px !important;">
                    <VRow class="table-row" no-gutters>
                        <VCol md="6" class="table-cell d-inline-flex">
                            <VRow class="table-row">
                                <VCol cols="4" class="d-inline-flex align-center">
                                    <span class="text-h6 font-weight-bold text-high-emphasis ">Current Age</span>
                                </VCol>
                                <VCol class="d-inline-flex align-center">
                                    <span class="font-weight-medium text-medium-emphasis">{{ requestData?.current_age }}</span>
                                </VCol>
                            </VRow>
                        </VCol>
                        <VCol md="6" class="table-cell d-inline-flex">
                            <VRow class="table-row">
                                <VCol cols="4" class="d-inline-flex align-center">
                                    <span class="text-h6 font-weight-bold text-high-emphasis ">End Date</span>
                                </VCol>
                                <VCol class="d-inline-flex align-center">
                                    <span class="font-weight-medium text-medium-emphasis">
                                        {{ requestData?.end_date ? Moment(requestData?.end_date).format('MMMM D, YYYY') : '' }}
                                    </span>
                                </VCol>
                            </VRow>
                        </VCol>
                    </VRow>
                </VListItem>
                <!-- Add item as needed  -->
            </VList>
        </v-card-text>
    </v-card>
    <v-card class="mt-2">
        <v-skeleton-loader  v-if="pageLoading" type="article"></v-skeleton-loader>
        <v-card-text v-else>
            <div class="d-flex justify-space-between align-center px-4 ">
                <h4 class="text-h4 font-weight-black text-primary">Fumigated Items</h4>
            </div>

            <VDataTableServer
                v-model:items-per-page="itemsPerPage"
                :headers="headers"
                :items="serverItems"
                :items-length="totalItems"
                :loading="loading"
                item-value="id"
                :search="searchValue"
                @update:options="loadItems"
                class="text-no-wrap mt-3"
            >
                <template #item.plant_id="{ item }">
                    {{ item.storage_location?.plant?.name }}
                </template>
                <template #item.storage_location_id="{ item }">
                    {{ item.storage_location?.name }}
                </template>
                <template #item.physical_id="{ item }">
                    {{ item.rfid?.name }}
                </template>
                <template #item.block_location="{ item }">
                    <v-btn v-if="item.block?.label" :to="{
                            path: `/warehouse-map/${item.storage_location?.plant_code}/${generateSlug(item.storage_location?.name)}`,
                            query: { search: item.block?.lot?.label }
                        }"
                        color="primary-light"
                        variant="outlined"
                        size="small"
                    >
                        {{ item?.block?.lot?.label }} - {{ item?.block?.label }}
                    </v-btn>
                   
                    <v-badge v-else
                            color="warning"
                            content="Unassigned"
                            class="text-uppercase"
                            inline
                    ></v-badge>
                </template>
            </VDataTableServer>
        </v-card-text>
    </v-card>

</template>
