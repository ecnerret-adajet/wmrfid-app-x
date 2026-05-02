<script setup>
import ApiService from '@/services/ApiService';
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { VDataTableServer } from 'vuetify/components';

const route = useRoute();

const plantCode = route.params.plant_code;
const sloc = route.params.sloc;

const searchValue = ref('');

const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref('-created_at');
const pageLoading = ref(false);
const storageLocation = ref(null);

const detailDialog = ref(false);
const selectedFumigation = ref(null);

const headers = [
    { title: 'BATCH', key: 'batch' },
    { title: 'STATUS', key: 'status', align: 'center', sortable: false },
    { title: 'START DATE', key: 'start_date' },
    { title: 'END DATE', key: 'end_date', sortable: false },
    { title: 'FUMIGATION AGE', key: 'fumigation_age', sortable: false },
    { title: 'REMARKS', key: 'remarks', sortable: false },
    { title: 'CREATED BY', key: 'created_by', sortable: false },
    { title: 'ITEMS', key: 'items_count', align: 'center', sortable: false },
    { title: '', key: 'actions', sortable: false, align: 'end' },
];

const fumigationItemHeaders = [
    { title: 'PHYSICAL ID', key: 'physical_id' },
    { title: 'RFID CODE', key: 'rfid_code' },
    { title: 'BATCH', key: 'batch' },
    { title: 'BLOCK', key: 'block_id', align: 'center' },
    { title: 'POSITION', key: 'position_in_block', align: 'center' },
    { title: 'TRANSFER ORDER', key: 'transfer_order_id' },
    { title: 'TO STATUS', key: 'to_status', align: 'center' },
];

onMounted(() => {
    fetchStorageLocationDetails();
})

const fetchStorageLocationDetails = async () => {
    pageLoading.value = true;
    try {
        const response = await ApiService.get(`warehouse/storage-location/${plantCode}/${sloc}`);
        storageLocation.value = response.data.storage_location;
    } catch (error) {
        console.log(error);
    } finally {
        pageLoading.value = false;
    }
};

const loadItems = ({ page: pageVal, itemsPerPage: perPage, sortBy }) => {
    loading.value = true;

    const plant_code = route.params.plant_code;
    const sloc = route.params.sloc;

    if (!plant_code || !sloc) {
        loading.value = false;
        return;
    }

    if (sortBy && sortBy.length > 0) {
        const sort = sortBy[0];
        sortQuery.value = sort.order === 'desc' ? `-${sort.key}` : sort.key;
    } else {
        sortQuery.value = '-created_at';
    }

    ApiService.query('datatable/fumigations/', {
        params: {
            page: pageVal,
            itemsPerPage: perPage,
            sort: sortQuery.value,
            search: searchValue.value,
            plant_code,
            sloc,
        }
    })
        .then((response) => {
            totalItems.value = response.data.total;
            serverItems.value = response.data.data;
            loading.value = false;
        })
        .catch((error) => {
            console.log(error);
            loading.value = false;
        });
};

const handleSearch = () => {
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [],
    });
};

const openDetailDialog = (fumigation) => {
    selectedFumigation.value = fumigation;
    detailDialog.value = true;
};

const statusColor = (status) => {
    if (status === 'in progress') return 'warning';
    if (status === 'completed') return 'success';
    return 'secondary';
};
</script>

<template>
    <div>
        <div class="pa-4">
            <h4 class="text-h5 font-weight-bold mb-2">Plant : <span class="font-bold text-primary">{{storageLocation?.plant?.plant_code}} - {{ storageLocation?.plant?.name }}</span></h4>
            <h4 class="text-h5 font-weight-bold mb-2">Storage Location : <span class="font-bold text-primary">{{storageLocation?.code}} - {{ storageLocation?.name }}</span></h4>
            <h4 class="text-h5 font-weight-bold mb-2">Total Fumigation Records : <span class="font-bold text-primary">{{ totalItems }}</span></h4>
        </div>
        <div class="d-flex gap-4 align-center justify-center px-4 mb-2">
            <VTextField
                v-model="searchValue"
                label="Search"
                placeholder="Search batch, remarks..."
                append-inner-icon="ri-search-line"
                single-line
                hide-details
                density="compact"
                class="flex-grow-1"
                @keyup.enter="handleSearch"
            />
            <v-btn
                class="d-flex align-center"
                prepend-icon="ri-search-eye-line"
                @click="handleSearch"
            >
                <template #prepend>
                    <v-icon color="white"></v-icon>
                </template>
                Search
            </v-btn>
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
            class="text-no-wrap"
        >
            <template #item.batch="{ item }">
                <v-chip
                    color="secondary"
                    size="small"
                    label
                >
                    {{ item.batch }}
                </v-chip>
            </template>

            <template #item.status="{ item }">
                <v-chip
                    :color="statusColor(item.status)"
                    size="small"
                    label
                    class="text-capitalize"
                >
                    {{ item.status }}
                </v-chip>
            </template>

            <template #item.start_date="{ item }">
                {{ item.start_date ? item.start_date.split(' ')[0] : '--' }}
            </template>

            <template #item.end_date="{ item }">
                {{ item.end_date ? item.end_date.split(' ')[0] : '--' }}
            </template>

            <template #item.remarks="{ item }">
                <span class="text-truncate d-inline-block" style="max-width: 180px;">{{ item.remarks || '--' }}</span>
            </template>

            <template #item.created_by="{ item }">
                {{ item.created_by?.name || '--' }}
            </template>

            <template #item.items_count="{ item }">
                <v-chip size="small" variant="tonal" color="primary">
                    {{ item.fumigation_items?.length ?? 0 }}
                </v-chip>
            </template>

            <template #item.actions="{ item }">
                <v-btn
                    icon
                    variant="text"
                    size="small"
                    color="primary"
                    @click="openDetailDialog(item)"
                >
                    <v-icon icon="ri-eye-line" />
                </v-btn>
            </template>
        </VDataTableServer>

        <v-dialog
            v-model="detailDialog"
            max-width="900"
            scrollable
        >
            <v-card v-if="selectedFumigation">
                <v-card-title class="text-h6 font-weight-bold pa-4 d-flex align-center justify-space-between">
                    <span>Fumigation Detail</span>
                    <v-btn icon variant="text" size="small" @click="detailDialog = false">
                        <v-icon icon="ri-close-line" />
                    </v-btn>
                </v-card-title>
                <v-divider />
                <v-card-text class="pa-4">
                    <div class="d-flex flex-wrap gap-3 mb-4">
                        <v-card variant="tonal" color="secondary" rounded="lg" class="flex-1-1">
                            <v-card-text class="pa-3">
                                <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold mb-1">Batch</div>
                                <div class="text-h6 font-weight-bold">{{ selectedFumigation.batch }}</div>
                            </v-card-text>
                        </v-card>
                        <v-card variant="tonal" :color="statusColor(selectedFumigation.status)" rounded="lg" class="flex-1-1">
                            <v-card-text class="pa-3">
                                <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold mb-1">Status</div>
                                <div class="text-h6 font-weight-bold text-capitalize">{{ selectedFumigation.status }}</div>
                            </v-card-text>
                        </v-card>
                        <v-card variant="tonal" color="primary" rounded="lg" class="flex-1-1">
                            <v-card-text class="pa-3">
                                <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold mb-1">Fumigation Age</div>
                                <div class="text-h6 font-weight-bold">{{ selectedFumigation.fumigation_age }}</div>
                            </v-card-text>
                        </v-card>
                    </div>

                    <v-row dense class="mb-4">
                        <v-col cols="6">
                            <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold">Start Date</div>
                            <div class="text-body-1">{{ selectedFumigation.start_date?.split(' ')[0] || '--' }}</div>
                        </v-col>
                        <v-col cols="6">
                            <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold">End Date</div>
                            <div class="text-body-1">{{ selectedFumigation.end_date?.split(' ')[0] || '--' }}</div>
                        </v-col>
                        <v-col cols="6">
                            <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold">Plant</div>
                            <div class="text-body-1">{{ selectedFumigation.plant_code || '--' }}</div>
                        </v-col>
                        <v-col cols="6">
                            <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold">SLOC</div>
                            <div class="text-body-1">{{ selectedFumigation.sloc || '--' }}</div>
                        </v-col>
                        <v-col cols="6">
                            <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold">Created By</div>
                            <div class="text-body-1">{{ selectedFumigation.created_by?.name || '--' }}</div>
                        </v-col>
                        <v-col cols="12">
                            <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold">Remarks</div>
                            <div class="text-body-1">{{ selectedFumigation.remarks || '--' }}</div>
                        </v-col>
                    </v-row>

                    <div class="text-subtitle-2 font-weight-bold mb-2">Fumigation Items ({{ selectedFumigation.fumigation_items?.length ?? 0 }})</div>
                    <v-table density="compact">
                        <thead>
                            <tr>
                                <th v-for="h in fumigationItemHeaders" :key="h.key" :class="h.align === 'center' ? 'text-center' : ''">
                                    {{ h.title }}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="!selectedFumigation.fumigation_items?.length">
                                <td :colspan="fumigationItemHeaders.length" class="text-center text-medium-emphasis py-4">No items found</td>
                            </tr>
                            <tr v-for="item in selectedFumigation.fumigation_items" :key="item.id">
                                <td>{{ item.physical_id }}</td>
                                <td>{{ item.rfid_code }}</td>
                                <td>{{ item.batch }}</td>
                                <td class="text-center">{{ item.block_id }}</td>
                                <td class="text-center">{{ item.position_in_block }}</td>
                                <td>{{ item.transfer_order?.transfer_order_id || '--' }}</td>
                                <td class="text-center">
                                    <v-chip
                                        v-if="item.transfer_order?.status_text"
                                        color="success"
                                        size="small"
                                        label
                                    >
                                        {{ item.transfer_order.status_text }}
                                    </v-chip>
                                    <span v-else>--</span>
                                </td>
                            </tr>
                        </tbody>
                    </v-table>
                </v-card-text>
            </v-card>
        </v-dialog>
    </div>
</template>
