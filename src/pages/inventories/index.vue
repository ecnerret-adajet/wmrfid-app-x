<script setup>
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import JwtService from '@/services/JwtService';
import axios from 'axios';
import { debounce } from 'lodash';
import Moment from 'moment';
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';

const pageLoading = ref(false);
const storageLocations = ref([]);
const statisticsData = ref(null);

const toast = ref({
    message: 'New production line successfully created!',
    color: 'success',
    show: false
});
const filters = reactive({
    storage_location_id: null,
})


onMounted(() => {
    loadData();
})

const loadData = async () => {
    pageLoading.value = true;
    try {
        const token = JwtService.getToken();
        const response = await axios.get(`/inventories/get-statistics-data`, {
            params: {
                filters: filters
            },
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const { storage_locations, statistics } = response.data;
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

const handleSearch = debounce((search) => {
    searchValue.value = search;
}, 500);

const searchValue = ref('');
const router = useRouter();
const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref('-created_at'); // Default sort

const headers = [
    {
        title: 'BATCH',
        key: 'batch',
    },
    {
        title: 'STORAGE LOCATION',
        key: 'storage_location_id',
        sortable: false
    },
    {
        title: 'MATERIAL',
        key: 'material_id',
    },
    {
        title: 'MFG DATE',
        key: 'latest_mfg_date',
    },
    {
        title: 'CURRENT AGE',
        key: 'age',
        align: 'center'
    },
    {
        title: 'TOTAL QUANTITY',
        key: 'total_count',
        align: 'center'
    },
    {
        title: 'STOCK STATUS',
        key: 'stock_status',
        align: 'center',
        sortable: false
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

    ApiService.query('datatable/inventories',{
        params: {
            page,
            itemsPerPage,
            sort: sortQuery.value,
            search: searchValue.value,
            filters: filters
        }
        })
        .then((response) => {
            totalItems.value = response.data.total;
            serverItems.value = response.data.data
            loading.value = false
        })
        .catch((error) => {
            loading.value = false
            console.log(error);
        });
}

watch(() => filters.storage_location_id, () => {
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{ key: sortQuery.value.replace('-', ''), 
        order: sortQuery.value.startsWith('-') ? 'desc' : 'asc' }]
    });

    loadData()
});

const handleViewBatch = (inventory) => {
    router.push(`/inventories/${inventory.batch}`);
}

</script>

<template>
    <VRow>
        <VCol md="9">
            <SearchInput @update:search="handleSearch"/>
        </VCol>
        <VCol md="3" class="d-flex justify-center align-center">
            <v-select class="mt-1" label="Filter by Warehouse" density="compact"
                :items="[{ title: 'All', value: null }, ...storageLocations]" v-model="filters.storage_location_id"
                :rules="[value => value !== undefined || 'Please select an item from the list']"
            >
            </v-select>
        </VCol>
    </VRow>
        <!-- <MovementChart /> -->
    <v-row class="match-height my-4">
        <v-col cols="3">
            <v-skeleton-loader  v-if="pageLoading" type="article"></v-skeleton-loader>
            <v-card v-else
                class="pa-4 bg-grey-50"
                elevation="2"
                style="border-radius: 4px;"
            >
                <div class="d-flex align-center justify-space-between">
                    <div class="d-flex align-center">
                        <div
                            class="d-flex align-center justify-center mr-4"
                            style="
                                width: 48px;
                                height: 48px;
                                background-color: #fdecea;
                                border-radius: 12px;
                            "
                        >
                            <v-icon
                                icon="ri-error-warning-line"
                                color="error"
                                size="24"
                            ></v-icon>
                        </div>
                        <div>
                            <span class="text-subtitle-1 font-weight-bold text-grey-700">
                                Near Expiry
                            </span>
                            <div class="text-h4 font-weight-bold text-primary mt-1">
                                {{ statisticsData?.near_expiry_total || 0 }}
                            </div>
                        </div>
                    </div>

                    <!-- Call to Action Button -->
                    <!-- <v-btn
                        color="primary"
                        variant="outlined"
                    >
                        View Items
                    </v-btn> -->
                </div>
            </v-card>
        </v-col>
        <v-col cols="3">
            <v-skeleton-loader  v-if="pageLoading" type="article"></v-skeleton-loader>
            <v-card v-else
                class="pa-4 bg-grey-50"
                elevation="2"
                style="border-radius: 4px;"
            >
                <div class="d-flex align-center justify-space-between">
                    <div class="d-flex align-center">
                        <div
                            class="d-flex align-center justify-center mr-4"
                            style="
                                width: 48px;
                                height: 48px;
                                background-color: #fdecea;
                                border-radius: 12px;
                            "
                        >
                            <v-icon
                                icon="ri-battery-low-line"
                                color="error"
                                size="24"
                            ></v-icon>
                        </div>
                        <div>
                            <span class="text-subtitle-1 font-weight-bold text-grey-700">
                                Low Stock
                            </span>
                            <div class="text-h4 font-weight-bold text-primary mt-1">
                                {{ statisticsData?.low_stock_total || 0 }}
                            </div>
                        </div>
                    </div>

                    <!-- Call to Action Button -->
                    <!-- <v-btn
                        color="primary"
                        variant="outlined"
                    >
                        View Items
                    </v-btn> -->
                </div>
            </v-card>
        </v-col>
        <v-col cols="3">
            <v-skeleton-loader  v-if="pageLoading" type="article"></v-skeleton-loader>
            <v-card v-else
                class="pa-4 bg-grey-50"
                elevation="2"
                style="border-radius: 4px;"
            >
                <div class="d-flex align-center justify-space-between">
                    <div class="d-flex align-center">
                        <div
                            class="d-flex align-center justify-center mr-4"
                            style="
                                width: 48px;
                                height: 48px;
                                background-color: #fff3d8;
                                border-radius: 12px;
                            "
                        >
                            <v-icon
                                icon="ri-weight-line"
                                color="warning"
                                size="24"
                            ></v-icon>
                        </div>
                        <div>
                            <span class="text-subtitle-1 font-weight-bold text-grey-700">
                                Overstocked
                            </span>
                            <div class="text-h4 font-weight-bold text-primary mt-1">
                                {{ statisticsData?.overstock_total || 0 }}
                            </div>
                        </div>
                    </div>

                    <!-- Call to Action Button -->
                    <!-- <v-btn
                        color="primary"
                        variant="outlined"
                    >
                        View Items
                    </v-btn> -->
                </div>
            </v-card>
        </v-col>
        <v-col cols="3">
            <v-skeleton-loader  v-if="pageLoading" type="article"></v-skeleton-loader>
            <v-card v-else
                class="pa-4 bg-grey-50"
                elevation="2"
                style="border-radius: 4px;"
            >
                <div class="d-flex align-center justify-space-between">
                    <div class="d-flex align-center">
                        <div
                            class="d-flex align-center justify-center mr-4"
                            style="
                                width: 48px;
                                height: 48px;
                                background-color: #fdecea;
                                border-radius: 12px;
                            "
                        >
                            <v-icon
                                icon="ri-time-line"
                                color="error"
                                size="24"
                            ></v-icon>
                        </div>
                        <div>
                            <span class="text-subtitle-1 font-weight-bold text-grey-700">
                                Expired Items
                            </span>
                            <div class="text-h4 font-weight-bold text-primary mt-1">
                                {{ statisticsData?.expired_total || 0 }}
                            </div>
                        </div>
                    </div>

                    <!-- Call to Action Button -->
                    <!-- <v-btn
                        color="primary"
                        variant="outlined"
                    >
                        View Items
                    </v-btn> -->
                </div>
            </v-card>
        </v-col>
    </v-row>
       
    <VCard>
        <VDataTableServer
            v-model:items-per-page="itemsPerPage"
            :headers="headers"
            :items="serverItems"
            :items-length="totalItems"
            :loading="loading"
            item-value="id"
            :search="searchValue"
            @update:options="loadItems"
            class="text-no-wrap"
        >
            <template #item.batch="{ item }">
                <span @click="handleViewBatch(item)" class="text-primary font-weight-bold cursor-pointer hover-underline">
                    {{ item.batch }}
                </span>
            </template>

            <template #item.storage_location_id="{ item }">
                {{ item.storage_location?.name }}
            </template>

            <template #item.material_id="{ item }">
                {{ item.material?.description }}
            </template>

            <template #item.age="{ item }" class="d-flex align-center justify-center">
                <span class="mr-1" :class="item.is_expired ? 'text-error' : 'text-warning'">
                    {{ item.latest_mfg_date ? `${Moment().diff(Moment(item.latest_mfg_date), 'days')} ${Moment().diff(Moment(item.latest_mfg_date), 'days') === 1 ? 'day' : 'days'}` : '' }}
                </span>
                <v-tooltip v-if="item.is_near_expiry || item.is_expired" :text="item.is_expired ? 'This batch is already expired' : 'This batch is near expiring'">
                    <template v-slot:activator="{ props }">
                        <v-icon v-bind="props" v-if="item.is_near_expiry || item.is_expired"
                            :color="item.is_expired ? 'error' : 'warning'"
                            icon="ri-error-warning-line"
                        >
                        </v-icon>
                    </template>
                </v-tooltip>
                
            </template>

            <template #item.stock_status="{ item }">
                <v-chip v-if="item.total_count <= 200" color="error" variant="flat">
                    <span class="px-4">Low</span>
                </v-chip>
                <v-chip v-else-if="item.total_count > 200 && item.total_count <= 600" color="success" variant="flat">
                    <span class="px-4">Ok</span>
                </v-chip>
                <v-chip v-else-if="item.total_count > 600" color="warning" variant="flat">
                    <span class="px-4">High</span>
                </v-chip>
            </template>

            <template #item.latest_mfg_date="{ item }">
                {{ item.latest_mfg_date ? Moment(item.latest_mfg_date).format('MMMM D, YYYY') : '' }}
            </template>

            <template #item.latest_created_at="{ item }">
                {{ item.latest_created_at ? Moment(item.latest_created_at).format('MMMM D, YYYY') : '' }}
            </template>

            <template #item.updated_at="{ item }">
                {{ item.updated_at ? Moment(item.updated_at).format('MMMM D, YYYY') : '' }}
            </template>

        </VDataTableServer>
    </VCard>
 
    <Toast :show="toast.show" :message="toast.message"/>
</template>
