<template>
    <div class="pa-8">
        <div class="d-flex gap-4 align-center mb-4 w-100">
            <!-- Expands dynamically to fill all remaining horizontal layout space -->
            <VTextField 
                v-model="searchValue" 
                label="Search" 
                placeholder="Search bin" 
                append-inner-icon="ri-search-line"
                single-line 
                hide-details 
                density="compact" 
                class="flex-grow-1" 
            />

            <!-- Swapped fixed style width for explicit structural flex sizing (fixed 250px-300px) -->
            <v-select 
                style="max-width: 400px; min-width: 300px;"
                label="Select Plant" 
                density="compact"
                hide-details
                :items="[{ title: 'All', value: null }, ...plantsOption]" 
                v-model="filters.plant_code"
                :rules="[value => value !== undefined || 'Please select an item from the list']"
                class="flex-grow-0"
            />

            <v-btn 
                :loading="exportLoading" 
                color="primary-light" 
                class="d-flex align-center" 
                prepend-icon="ri-download-line" 
                @click="exportData"
            >
                Export
            </v-btn> 

            <v-btn 
                class="d-flex align-center" 
                prepend-icon="ri-search-eye-line" 
                @click="handleSearch"
            >
                Search
            </v-btn>
        </div>

        <VCard>
            <VDataTableServer
                :headers="headers"
                :items="serverItems"
                :items-length="totalItems"
                :loading="tableLoading"
                :items-per-page="itemsPerPage"
                :page="page"
                class="text-no-wrap"
                @update:options="loadItems"
                item-value="id"
            >
                <template #item.shipment_no="{ item }">
                    {{ item.delivery_reserved_order?.sap_delivery?.shipment_no || '-' }}
                </template>

                <template #item.qty="{ item }">
                    {{ item.total_qty }}
                </template>

                <template #item.ref_no="{ item }">
                    {{ item.delivery_document }}
                </template>

                <template #item.material="{ item }">
                    <span class="font-weight-bold">{{ item.material_code }}</span><br />
                    <span v-if="item.material_description" class="text-subtitle-1">{{ item.material_description }}</span>
                </template>

                
            </VDataTableServer>
        </VCard>
    </div>
    <Loader :show="pageLoading" />
    <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event"/>

</template>

<script setup>
import Loader from '@/components/Loader.vue';
import Toast from '@/components/Toast.vue';
import { useAuthorization } from '@/composables/useAuthorization';
import { exportExcel } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import JwtService from '@/services/JwtService';
import { useAuthStore } from '@/stores/auth';
import axios from 'axios';
import { VDataTableServer } from 'vuetify/components';

const authStore = useAuthStore();
const { authUserCan } = useAuthorization();

const searchValue = ref('');
const serverItems = ref([]);
const itemsPerPage = ref(20);
const page = ref(1);
const totalItems = ref(0);
const pageLoading = ref(false);
const sortQuery = ref('-created_at');


const filters = reactive({
    plant_code: authStore.user?.assigned_plant?.plant_code
});

const toast = reactive({
    message: 'Success!',
    color: 'success',
    show: false
});

onMounted(() => {
    fetchDropdownData();
})

const plantsOption = ref([]);

const fetchDropdownData = async () => {
    pageLoading.value = true;
    try {
        const response = await ApiService.get('managed-plant-storage-locations');
        plantsOption.value = (response.data.plants ?? [])
            .filter(item => item.name !== null)
            .map(item => ({ value: item.plant_code, title: item.name }));
   
    } catch (error) {
        console.error(error);
    } finally {
        pageLoading.value = false;
    }
};


const headers = computed(() => {
    const baseHeaders = [
      { title: 'Shipment No.', key: 'shipment_no', align: 'start', sortable: false },
      { title: 'Ref No.', key: 'delivery_document', align: 'start', sortable: false },
      { title: 'Material', key: 'material', align: 'start', sortable: false },
      { title: 'Batch', key: 'commodity_batch_code', align: 'start', sortable: false },
      { title: 'Mfg Date', key: 'manufacturing_date', align: 'start', sortable: false },
      { title: 'Qty', key: 'qty', align: 'start', sortable: false },
      { title: 'Physical ID', key: 'pallet_physical_id', align: 'start', sortable: false },
    ];

    // TODO:: uncomment if adding specific column depending on user permissions
    // if (authUserCan('can.approve.bin.transfer.requests')) {
      
    // }
  
    return baseHeaders;
});

const tableLoading = ref(false)
const loadItems = async ({ page, itemsPerPage, sortBy, search }) => {
    tableLoading.value = true
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
        const response = await axios.get(`datatable/reserved-pallets`, {
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

        const { table } = response.data;
   
        totalItems.value = table.total;
        serverItems.value = table.data;

    } catch (error) {
        console.log(error);
    } finally {
        tableLoading.value = false;
    }
}

const handleSearch = () => {
    console.log('searching')
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{ key: 'updated_at', order: 'desc' }],
        search: searchValue.value,
        filters: filters
    });
};

const exportLoading = ref(false);
const exportData = async () => {
    try {
        exportLoading.value = true;
        await exportExcel({
            url: `/reports/reserved-pallets/export`,
            params: {
                search: searchValue.value,
                filters: filters
            },
            filename: 'reserved-pallets.xlsx',
        });
    } catch (error) {
        console.error('Export error:', error);
    } finally {
        exportLoading.value = false;
    }
}

</script>
