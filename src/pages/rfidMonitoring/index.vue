<script setup>
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import { exportExcel } from '@/composables/useHelpers';
import JwtService from '@/services/JwtService';
import axios from 'axios';
import { debounce } from 'lodash';
import Moment from 'moment';
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';

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
    storage_location_id: null,
    plant_id: null
})

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
        title: 'Physical ID',
        key: 'physical_id',
        sortable: false
    },
    {
        title: 'EPC',
        key: 'epc',
        sortable: false
    },
    {
        title: 'Type',
        key: 'type',
        sortable: false
    },
    {
        title: 'plant',
        key: 'plant',
        sortable: false
    },
    {
        title: 'Read Count',
        key: 'unique_read_count',
        align: 'center',
        sortable: false
    },
    {
        title: 'Last Read Date',
        key: 'last_read_date',
    },
    {
        title: 'Last Reader',
        key: 'last_reader',
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

        const response = await axios.get('/datatable/rfid-monitoring', {
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

        const { table, tag_types, plants } = response.data;
        totalItems.value = table.total;
        serverItems.value = table.data;
        console.log(serverItems.value);

        tagTypesOption.value = tag_types.map(item => ({
            value: item.id,
            title: item.title,
            name: item.title
        }));

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

watch(() => filters.plant_id, () => {
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{ key: sortQuery.value.replace('-', ''), 
        order: sortQuery.value.startsWith('-') ? 'desc' : 'asc' }]
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

const selectedLogOpen = ref(false);
const handleViewEntry = (item) => {
    selectedLog.value = item;
    selectedLogOpen.value = true;
    currentPage.value = 1; // Reset pagination when opening a new log
}

const itemHeaders = [
    {
        title: 'Physical ID',
        key: 'physical_id',
        sortable: false
    },
    {
        title: 'EPC',
        key: 'epc',
        sortable: false
    },
    {
        title: 'Type',
        key: 'type',
        sortable: false
    },
    {
        title: 'plant',
        key: 'plant',
        sortable: false
    },
    {
        title: 'Read Count',
        key: 'unique_read_count',
        align: 'center',
        sortable: false
    },
    {
        title: 'Last Read Date',
        key: 'last_read_date',
    },
    {
        title: 'Last Reader',
        key: 'last_reader',
    },
]

const currentPage = ref(1);
const itemsPerPageModal = ref(5); // Number of items per page in modal

const paginatedSessions = computed(() => {
    if (!selectedLog.value?.sessions) return [];
    
    const start = (currentPage.value - 1) * itemsPerPageModal.value;
    const end = start + itemsPerPageModal.value;
    
    return selectedLog.value.sessions.slice(start, end);
});

const totalPages = computed(() => {
    if (!selectedLog.value?.sessions) return 0;
    return Math.ceil(selectedLog.value.sessions.length / itemsPerPageModal.value);
});

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
                :items="plantsOption.length > 1 ? [{ title: 'All', value: null }, ...plantsOption] : plantsOption"
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
            :loading="pageLoading"
            item-value="id"
            :search="searchValue"
            @update:options="loadItems"
            class="text-no-wrap"
        >
            <template #item="{ item }">
                <tr @click="handleViewEntry(item)" class="clickable-row">
                    <td>{{ item.physical_id }}</td>
                    <td>{{ item.epc }}</td>
                    <td>
                        <span v-if="item.rfid_type === 'RfidPallet'">
                            Pallet
                        </span>
                        <span v-else-if="item.rfid_type === 'RfidLabel'">
                            Label
                        </span>
                        <span v-else-if="item.rfid_type === 'RfidTonerBag'">
                            Toner Bag
                        </span>
                        <span v-else>
                            N/A
                        </span>
                    </td>
                    <td>{{ item.plant?.name }}</td>
                    <td class="text-center">{{ item.unique_read_count }}</td>
                    <td>{{ item.last_read ? Moment(item.last_read).format('MMMM D, YYYY h:mm A') : '' }}</td>
                    <td>{{ item.last_reader ? item.last_reader?.name : '' }}</td>
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
                                            style="margin-top: 1px;">Physical ID</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-grey-700">
                                            {{ selectedLog?.physical_id }}
                                        </span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 text-uppercase font-weight-bold text-grey-700"
                                            style="margin-top: 1px;">Type</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-grey-700">
                                            <span v-if="selectedLog?.rfid_type === 'RfidPallet'">
                                                Pallet
                                            </span>
                                            <span v-else-if="selectedLog?.rfid_type === 'RfidLabel'">
                                                Label
                                            </span>
                                            <span v-else-if="selectedLog?.rfid_type === 'RfidTonerBag'">
                                                Toner Bag
                                            </span>
                                            <span v-else>
                                                N/A
                                            </span>
                                        </span>
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
                                            {{ selectedLog?.unique_read_count }}
                                        </span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                </VList>
            <v-card-text>
                 <v-table class="mt-4">
                    <thead>
                        <tr>
                            <th>EPC</th>
                            <th>Plant</th>
                            <th>Read Date</th>
                            <th>Reader</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(item, index) in paginatedSessions" :key="index">
                            <td>{{ selectedLog?.epc }}</td>
                            <td>{{ item.plant?.name }}</td>
                            <td>{{ item.last_read ? Moment(item.last_read).format('MMMM D, YYYY h:mm A') : '' }}</td>
                            <td>{{ item.reader_name }}</td>
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
