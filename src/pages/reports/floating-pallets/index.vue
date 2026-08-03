<script setup>
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import { exportExcel } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import { useAuthStore } from '@/stores/auth';
import Moment from 'moment';
import { computed, onMounted, reactive, ref } from 'vue';

const authStore = useAuthStore();

const searchValue = ref('');
const datatableRef = ref(null);
const isLoading = ref(false);
const plantsOption = ref([])

const toast = ref({
    message: 'Success!',
    color: 'success',
    show: false
});

const filters = reactive({
    created_at: null,
    updated_at: null,
    plant_code: authStore.user?.assigned_plant?.plant_code || null,
    date_filter: null,
    status_type: null,
});

const activeView = ref('table')

const clearFilters = () => {
    filters.created_at = null;
    filters.updated_at = null;
    filters.plant_code = null;
    filters.date_filter = null;
    filters.status_type = null;
};

onMounted(() => {
    fetchDropdownData();
})

const shifts = ref([]);
const fetchDropdownData = async () => {
    isLoading.value = true;
    try {
        let endpoint = 'reports/putaway-data-dropdown';

        // Check if filters.plant_code is a valid, non-null value
        if (filters.plant_code) {
            endpoint += `/${filters.plant_code}`;
        }

        const preReqData = await ApiService.get(endpoint);
        const { plants } = preReqData.data;

        plantsOption.value = plants.map(item => ({
            value: item.plant_code,
            title: `${item.plant_code} - ${item.name}`,
            name: item.name
        }));
    } catch (error) {
        console.error('Error fetching data:', error);
    } finally {
        isLoading.value = false;
    }
};


const exportLoading = ref(false);
const exportData = async () => {
    try {
        exportLoading.value = true;
        await exportExcel({
            url: `/reports/floating-pallets/export`,
            params: {
                filters: filters
            },
            filename: 'floating-pallets-report.xlsx',
        });
    } catch (error) {
        console.error('Export error:', error);
    } finally {
        exportLoading.value = false;
    }
}

const handleSearch = () => {
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{ key: 'created_at', order: 'desc' }],
        filters: filters,
        search: searchValue.value
    });
};


const baseHeaders = [
    { title: 'PLANT', key: 'plant_id', align: 'start', sortable: false },
    { title: 'PHYSICAL ID', key: 'physical_id',  sortable: false },
    { title: 'BATCH', key: 'batch', sortable: false },
    { title: 'MATERIAL', key: 'material', sortable: false },
    { title: 'MFG DATE', key: 'mfg_date', sortable: false },
    { title: 'Pallet Status', key: 'commodity_status_id', sortable: false },
    { title: 'WITH QR', key: 'with_qr', sortable: false, align: 'center' },
]

// 2. Create the computed headers layer to track totalItems state changes
const headers = computed(() => {
    if (totalItems.value === 0) {
        // Map over headers and safely strip away the fixed constraint parameter mapping
        return baseHeaders.map(({ fixed, ...rest }) => rest)
    }
    return baseHeaders
})

const loading = ref(true);
const serverItems = ref([]);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref('-created_at'); // Default sort

const chartKpis = ref(null)

const loadItems = ({ page, itemsPerPage, sortBy }) => {
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

    ApiService.query('reports/datatable/floating-pallets', {
        params: {
            page,
            itemsPerPage,
            sort: sortQuery.value,
            search: searchValue.value,
            filters: filters
        }
    })
        .then((response) => {
            const payload = response.data;
     
            if (payload.table) {
                serverItems.value = payload.table.data;   // Current page raw line records array
                totalItems.value = payload.table.total;   // Total absolute matched lines for footer
            }

            loading.value = false;
        })
        .catch((error) => {
            console.log(error);
        });
}


</script>

<template>
    <div class="d-flex flex-wrap gap-4 align-center justify-center">
        <SearchInput class="flex-grow-1" @update:search="(val) => { searchValue = val; handleSearch(); }" />

        <!-- Plant Filter -->
        <v-select style="max-width: 350px;" class="flex-grow-1 align-center mt-1" label="Filter by Plant"
            density="compact"
            :items="plantsOption.length > 1 ? [{ title: 'All', value: null }, ...plantsOption] : plantsOption"
            v-model="filters.plant_code"
            :rules="[value => value !== undefined || 'Please select an item from the list']">
        </v-select>
       
        <!-- Status Filter -->
        <v-select style="max-width: 200px;" class="flex-grow-1 align-center mt-1" label="Filter by Status"
            density="compact" :items="[
                { title: 'All', value: null },
                { title: 'Good', value: 1 },
                { title: 'For QI', value: 3 }
            ]" v-model="filters.status_type">
        </v-select>

        <!-- Action Buttons -->
        <!-- <v-btn :loading="exportLoading" class="d-flex align-center" prepend-icon="ri-download-line" @click="exportData">
            <template #prepend>
                <v-icon color="white"></v-icon>
            </template>
            Export
        </v-btn>  -->
        <v-btn class="d-flex align-center" prepend-icon="ri-search-eye-line" @click="handleSearch">
            <template #prepend>
                <v-icon color="white"></v-icon>
            </template>
            Search
        </v-btn>
    </div>

    <VCard>
        <VDataTableServer v-model:items-per-page="itemsPerPage" :headers="headers" :items="serverItems"
            :items-length="totalItems" :loading="loading" item-value="id" @update:options="loadItems"
            class="text-no-wrap fixed-column-table">

            <template #item.plant_id="{ item }">
                <span class="font-weight-bold">{{ item.material?.plant?.plant_code }}</span><br />
                <span v-if="item.material?.plant" class="text-subtitle-1">{{ item.material?.plant?.name }}</span>
            </template>

            <template #item.material="{ item }">
                <span class="font-weight-bold">{{ item.material?.bu_material }}</span><br />
                <span v-if="item.material" class="text-subtitle-1">{{ item.material?.description }}</span>
            </template>

            <template #item.mfg_date="{ item }">
                {{ item.mfg_date ? Moment(item.mfg_date).format('MMM D, YYYY') : '' }}
            </template>
    
            <template #item.created_at="{ item }">
                {{ item.created_at ? Moment(item.created_at).format('MMMM D, YYYY') : '' }}
            </template>

            <template #item.updated_at="{ item }">
                {{ item.updated_at ? Moment(item.updated_at).format('MMMM D, YYYY') : '' }}
            </template>

            <template #item.commodity_status_id="{ item }">
                <v-chip v-if="item.commodity_status_id == 3" size="small" color="warning"
                    style="width: 100px; justify-content: center;" text-color="white">For QI</v-chip>
                <v-chip v-else-if="item.commodity_status_id == 1" size="small" color="primary"
                    style="width: 100px; justify-content: center;" text-color="white">Good</v-chip>
                <v-chip v-else-if="item.commodity_status_id == 7 || item.commodity_status_id == 5" size="small" color="error"
                    style="width: 100px; justify-content: center;" text-color="white">Invalid</v-chip>
                <v-chip v-else style="width: 100px; justify-content: center;" text-color="white" size="small" color="secondary">
                    N/A
                </v-chip>
            </template>

            <template #item.with_qr="{ item }">
                <div class="d-flex justify-center align-center">
                    <i v-if="item.rfid?.[0]?.with_qr" style="font-size: 30px; background-color: green;"
                        class="ri-checkbox-circle-line"></i>
                    <i v-else style="font-size: 30px; background-color: #FF4C51;" class="ri-close-circle-line"></i>
                </div>
            </template>

        </VDataTableServer>
    </VCard>

    <Toast :show="toast.show" :message="toast.message" />
</template>
<style scoped>
/* 2. Keeps the background solid on pinned elements so text doesn't bleed during scroll gaps */
.fixed-column-table :deep(th.v-data-table__th--fixed),
.fixed-column-table :deep(td.v-data-table__td--fixed) {
    background-color: #f6f7fb !important;
    /* Matches your light header card styling background */
}

.fixed-column-table :deep(thead.v-data-table__thead) {
    background-color: #f6f7fb !important;
}
</style>
