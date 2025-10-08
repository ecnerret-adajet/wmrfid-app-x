<script setup>
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import { exportExcel } from '@/composables/useHelpers';
import JwtService from '@/services/JwtService';
import { useAuthStore } from '@/stores/auth';
import axios from 'axios';
import { debounce } from 'lodash';
import Moment from 'moment';
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const pageLoading = ref(false);
const plantsOption = ref([]);
const tagTypesOption = ref([]);
const logs = ref([]);
const selectedLog = ref(null);

const toast = ref({
    message: 'New production line successfully created!',
    color: 'success',
    show: false
});

const filters = reactive({
    plant_code: authStore.user?.assigned_plant?.plant_code || null,
    date_filter: 'today'
});

onMounted(() => {
})

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
        title: 'Reader Name',
        key: 'name',
        sortable: false
    },
    {
        title: 'Type',
        key: 'type',
        sortable: false
    },
    {
        title: 'Plant',
        key: 'plant',
        sortable: false
    },
    {
        title: 'Read Pallets Count',
        key: 'count_pallets',
        align: 'center',
    },
    // {
    //     title: 'Read Tonner Bags Count',
    //     key: 'count_tonner_bags',
    //     align: 'center',
    // },
    {
        title: 'Last Read',
        key: 'last_read',
    },
]

const loadItems = async ({ page, itemsPerPage, sortBy, search }) => {
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

        const response = await axios.get('/reports/datatable/readers-report', {
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

        const { table, plants } = response.data;
        totalItems.value = table.total;
        serverItems.value = table.data;
        console.log(serverItems.value);

        plantsOption.value = plants.map(item => ({
            value: item.plant_code,
            title: `${item.plant_code} - ${item.name}`,
            name: `${item.plant_code} - ${item.name}`
        }));

    } catch (error) {
        console.log(error);
    } finally {
        pageLoading.value = false;
    }
}

watch(() => filters.plant_code, () => {
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{ key: sortQuery.value.replace('-', ''), 
        order: sortQuery.value.startsWith('-') ? 'desc' : 'asc' }]
    });
});

watch(() => filters.date_filter, () => {
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{
            key: sortQuery.value.replace('-', ''),
            order: sortQuery.value.startsWith('-') ? 'desc' : 'asc'
        }]
    });
});

const exportLoading = ref(false);

// TODO:: Update export
const exportData = async () => {

    try {
        exportLoading.value = true;
        await exportExcel({
            url: '/export/inventories/',
            params: {
                plant_code: filters.plant_code,
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

const selectedLogOpen = ref(false);
const handleViewEntry = (item) => {
    selectedLog.value = item;
    selectedLogOpen.value = true;
    currentPage.value = 1; // Reset pagination when opening a new log
}

const currentPage = ref(1);
const itemsPerPageModal = ref(5); // Number of items per page in modal

const paginatedSessions = computed(() => {
    if (!selectedLog.value?.unique_pallet_reads) return [];
    
    const start = (currentPage.value - 1) * itemsPerPageModal.value;
    const end = start + itemsPerPageModal.value;
    
    return selectedLog.value.unique_pallet_reads.slice(start, end);
});

const totalPages = computed(() => {
    if (!selectedLog.value?.unique_pallet_reads) return 0;
    return Math.ceil(selectedLog.value.unique_pallet_reads.length / itemsPerPageModal.value);
});

const dateFilters = [
    { title: 'Today', value: 'today' },
    { title: 'Yesterday', value: 'yesterday' },
    { title: 'Last 7 Days', value: 'last_7_days' },
    { title: 'This Month', value: 'this_month' },
]

</script>

<template>
    <div class="d-flex flex-wrap gap-4 align-center justify-center">
        <SearchInput class="flex-grow-1" @update:search="handleSearch" />
        <v-select style="max-width: 300px;" class="flex-grow-1 align-center mt-1" density="compact" :items="dateFilters"
            v-model="filters.date_filter">
        </v-select>
        <v-select style="max-width: 400px;" class="flex-grow-1 align-center mt-1" label="Filter by Plant"
            density="compact" :items="plantsOption.length > 1 ? [{ title: 'All', value: null }, ...plantsOption] : plantsOption" v-model="filters.plant_code"
            :rules="[value => value !== undefined || 'Please select an item from the list']">
        </v-select>
        <v-btn :loading="exportLoading" class="d-flex align-center" prepend-icon="ri-download-line" @click="exportData">
            <template #prepend>
                <v-icon color="white"></v-icon>
            </template>
            Export
        </v-btn>
    </div>
    <VCard>
        <VDataTableServer
            v-model:items-per-page="itemsPerPage"
            :headers="headers"
            :items="serverItems"
            :items-length="totalItems"
            :loading="pageLoading"
            item-value="id"
            :search="searchValue"
            @update:options="loadItems"
            class="text-no-wrap"
        >
            <template #item="{ item }">
                <tr @click="handleViewEntry(item)" class="clickable-row">
                    <td>{{ item.name }}</td>
                    <td>{{ item.reader_type?.name }}</td>
                    <td>{{ item.plant?.name }}</td>
                    <td class="text-center">{{ item.unique_pallet_reads.length }}</td>
                    <!-- <td class="text-center">{{ item.unique_tonner_bag_reads.length }}</td> -->
                    <td>{{ item.unique_pallet_reads.length > 0 ? Moment(item.unique_pallet_reads[0]?.updated_at).format('MMMM D, YYYY h:mm A') : '' }}</td>
                </tr>
            </template>

        </VDataTableServer>
    </VCard>

    <!-- Batch Details Modal -->
    <v-dialog v-if="selectedLog" v-model="selectedLogOpen" max-width="1200px">
        <v-card elevation="2">
            <v-card-title class="d-flex justify-space-between align-center mx-4 px-4 mt-6">
                <div class="text-h4 font-semibold ps-2 text-primary d-flex align-center">
                    <i class="ri-database-2-line text-primary text-h4 mr-2" style="margin-top: -1px;"></i>
                    Read Logs
                </div>
                <v-btn
                    icon="ri-close-line"
                    variant="text"
                    @click="selectedLogOpen = false"
                ></v-btn>
                
            </v-card-title>
                <VList lines="one" density="compact" class="mt-4 mx-5">
                    <VListItem>
                        <VRow class="table-row" no-gutters>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 text-uppercase font-weight-bold text-grey-700"
                                            style="margin-top: 1px;">Reader Name</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-grey-700">
                                            {{ selectedLog?.name }}
                                        </span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 text-uppercase font-weight-bold text-grey-700"
                                            style="margin-top: 1px;">Reader Type</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-grey-700">
                                            <span>
                                                {{selectedLog.reader_type?.name}}
                                            </span>
                                        </span>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                        <VRow class="table-row mt-3" no-gutters>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-start">
                                        <span class="text-h6 text-uppercase font-weight-bold text-grey-700"
                                            style="margin-top: 1px;">Plant</span>
                                    </VCol>
                                    <VCol class="d-flex flex-column">
                                        <span class="text-medium-emphasis font-weight-medium">{{
                                            selectedLog?.plant?.plant_code }}</span>
                                        <div class="text-subtitle-1 font-weight-thin">{{ selectedLog?.plant?.name }}</div>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-start">
                                        <span class="text-h6 text-uppercase font-weight-bold text-grey-700"
                                            style="margin-top: 1px;">Storage Location</span>
                                    </VCol>
                                    <VCol class="d-flex flex-column">
                                        <span class="text-medium-emphasis font-weight-medium">{{
                                            selectedLog?.plant?.default_storage_location?.code }}</span>
                                        <div class="text-subtitle-1 font-weight-thin">{{ selectedLog?.plant?.default_storage_location?.name }}</div>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                        <VRow class="table-row mt-3" no-gutters>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 text-uppercase font-weight-bold text-grey-700"
                                            style="margin-top: 1px;">Read Count</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-grey-700">
                                            {{ selectedLog?.unique_pallet_reads.length }}
                                        </span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                               
                            </VCol>
                        </VRow>
                    </VListItem>
                </VList>
            <v-card-text>
                 <v-table class="mt-4">
                    <thead>
                        <tr>
                            <th>Physical ID</th>
                            <th>EPC</th>
                            <th>TID</th>
                            <th>ANTENNA</th>
                            <th>Read Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(item, index) in paginatedSessions" :key="index">
                            <td>{{ item.rfid?.name }}</td>
                            <td>{{ item.epc }}</td>
                            <td>{{ item.tid }}</td>
                            <td>{{ item.antenna }}</td>
                            <td>{{ item.updated_at ? Moment(item.updated_at).format('MMMM D, YYYY h:mm A') : '' }}</td>
                        </tr>
                    </tbody>
                </v-table>
                  <!-- Add pagination controls -->
                <div class="d-flex justify-end mt-4">
                    <v-pagination
                        v-model="currentPage"
                        :length="totalPages"
                        :total-visible="5"
                    ></v-pagination>
                </div>
      
            </v-card-text>
        </v-card>
    </v-dialog>
 
    <Toast :show="toast.show" :message="toast.message"  @update:show="toast.show = $event"/>
</template>

<style scoped>

.clickable-row {
    cursor: pointer;
    transition: background-color 0.2s ease-in-out;
}

.clickable-row:hover {
    background-color: rgba(173,215,192, 0.3); 
}
</style>
