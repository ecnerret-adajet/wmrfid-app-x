<script setup>
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import { exportExcel } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import JwtService from '@/services/JwtService';
import axios from 'axios';
import { debounce } from 'lodash';
import Moment from 'moment';
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import batchDetails from './batchDetails.vue';

const pageLoading = ref(false);
const storageLocations = ref([]);
const plantsOptions = ref([]);
const statisticsData = ref(null);

const toast = ref({
    message: 'New production line successfully created!',
    color: 'success',
    show: false
});
const filters = reactive({
    storage_location_id: null,
    plant_id: null
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

        const { storage_locations, statistics, plants } = response.data;
        statisticsData.value = statistics;
        
        storageLocations.value = storage_locations.map(item => ({
            value: item.id,
            title: item.name,
            name: item.name
        }));

        plantsOptions.value = plants
            .filter(item => item.name !== null)
            .map(item => ({
                value: item.id,
                title: item.name
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
        title: '',
        key: 'action',
        align: 'center',
        sortable: false,
    },
    {
        title: 'BATCH',
        key: 'batch',
    },
    {
        title: 'PLANT',
        key: 'plant_id',
        sortable: false
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
    // {
    //     title: 'STOCK STATUS',
    //     key: 'stock_status',
    //     align: 'center',
    //     sortable: false
    // },
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

watch(() => filters.plant_id, () => {
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{ key: sortQuery.value.replace('-', ''), 
        order: sortQuery.value.startsWith('-') ? 'desc' : 'asc' }]
    });
    // loadData()
});

const actionList = [
    { title: 'View Details', key: 'view_details' },
]

const selectedInventory = ref(null);
const showInventoryDetails = ref(false);
const handleAction = (inventory, action) => {
    selectedInventory.value = inventory;
    
    if(action.key == 'view_details') {
        showInventoryDetails.value = true;
    } 
}

const exportLoading = ref(false);
const exportData = async () => {

    try {
        exportLoading.value = true;
        await exportExcel({
            url: '/export/inventories/',
            params: {
                plant_id: filters.plant_id,
                search: searchValue.value,
            },
            filename: 'inventories.xlsx',
        });
    } catch (error) {
        console.error('Export error:', error);
    } finally {
        exportLoading.value = false;
    }
}

</script>

<template>
    <VRow>
        <VCol md="7">
            <SearchInput @update:search="handleSearch"/>
        </VCol>
        <VCol md="3" class="d-flex justify-center align-center">
            <v-select
                class="mt-1"
                label="Filter by Plant"
                density="compact"
                :items="plantsOptions.length > 1 ? [{ title: 'All', value: null }, ...plantsOptions] : plantsOptions"
                v-model="filters.plant_id"
                :rules="[value => value !== undefined || 'Please select an item from the list']"
            >
            </v-select>
        </VCol>
        <VCol md="2" class="d-flex justify-center align-center">
            <v-btn block
                :loading="exportLoading"
                class="d-flex align-center"
                prepend-icon="ri-download-line"
                @click="exportData"
            >
                <template #prepend>
                <v-icon color="white"></v-icon>
                </template>
                Export
            </v-btn>
        </VCol>
    </VRow>
  
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
            <template #item.batch="{ item }">
                    {{ item.batch }}
            </template>

            <template #item.plant_id="{ item }">
                {{ item.storage_location?.plant?.name }}
            </template>

            <template #item.storage_location_id="{ item }">
                {{ item.storage_location?.name }}
            </template>

            <template #item.material_id="{ item }">
                {{ item.material?.description }}
            </template>

            <template #item.age="{ item }" class="d-flex align-center justify-center">
                <span class="mr-1" 
                    :class="item.is_expired 
                                ? 'text-error' 
                                : item.is_near_expiry 
                                    ? 'text-warning' 
                                    : ''">
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

            <!-- <template #item.stock_status="{ item }">
                <v-chip v-if="item.total_count <= 200" color="error" variant="flat">
                    <span class="px-4">Low</span>
                </v-chip>
                <v-chip v-else-if="item.total_count > 200 && item.total_count <= 600" color="success" variant="flat">
                    <span class="px-4">Ok</span>
                </v-chip>
                <v-chip v-else-if="item.total_count > 600" color="warning" variant="flat">
                    <span class="px-4">High</span>
                </v-chip>
            </template> -->

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

    <!-- Batch Details Modal -->
    <v-dialog v-if="selectedInventory" v-model="showInventoryDetails" max-width="1500px">
        <v-card elevation="2">
            <v-card-title class="d-flex justify-space-between align-center mx-4 px-4 mt-6">
                <div class="text-h4 font-semibold ps-2 text-primary d-flex align-center">
                    <i class="ri-database-2-line text-primary text-h4 mr-2" style="margin-top: -1px;"></i>
                    Batch Details
                </div>
                <v-btn
                    icon="ri-close-line"
                    variant="text"
                    @click="showInventoryDetails = false"
                ></v-btn>
            </v-card-title>
            <v-card-text>
                <batchDetails :inventory="selectedInventory"/>
            </v-card-text>
        </v-card>
    </v-dialog>
 
    <Toast :show="toast.show" :message="toast.message"  @update:show="toast.show = $event"/>
</template>
