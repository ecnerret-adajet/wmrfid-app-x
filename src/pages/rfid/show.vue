<script setup>
import SearchInput from '@/components/SearchInput.vue';
import { convertSlugToUpperCase, exportExcel } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import { debounce } from 'lodash';
import Moment from 'moment';
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const pageLoading = ref(false);
const physicalId = route.params.physicalId;
const rfidType = route.params.type;
const rfidData = ref(null);

const searchValue = ref('');
const serverItems = ref([]);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref('-created_at');

const loadItems = ({ page, itemsPerPage, sortBy, search }) => {
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

    ApiService.query(`rfid/get-physical-id-data/${rfidType}/${physicalId}`, {
        params: {
            page,
            itemsPerPage,
            sort: sortQuery.value,
            search: searchValue.value
        }
    })
        .then((response) => {
            const { table, rfid_data } = response.data
            console.log(rfid_data);

            totalItems.value = table.total;
            serverItems.value = table.data
            rfidData.value = rfid_data
            pageLoading.value = false
        })
        .catch((error) => {
            console.log(error);
            pageLoading.value = false
        });
}



const headers = [
    {
        title: 'EPC',
        key: 'epc',
    },
    {
        title: 'TID',
        key: 'tid',
    },
    {
        title: 'BATCH',
        key: 'batch',
        align: 'center',
        sortable: false
    },
    {
        title: 'CREATED AT',
        key: 'created_at',
    },
]

const handleSearch = debounce((search) => {
    searchValue.value = search;
}, 500);

const historyHeaders = [
    {
        title: 'EVENT',
        key: 'title', // E.g., "Item Wrapped", "Loaded for Delivery", etc.
    },
    {
        title: 'DETAILS',
        key: 'event', // e.g., "Batch updated from X to Y", "Moved to FG Warehouse", etc.
    },
    {
        title: 'TIMESTAMP',
        key: 'timestamp', // Exact date and time.
    },
    {
        title: 'TIME AGO',
        key: 'time_diff', // Human-readable diff like "3 hours ago".
    },
];
const historyServerItems = ref([]);
const totalHistoryItems = ref(0);
const historyItemsPerPage = ref(10);
const historyPage = ref(1);
const historyLoading = ref(false);
const loadHistory = ({ historyPage, historyItemsPerPage }) => {
    historyLoading.value = true

    ApiService.query(`rfid/get-history/${rfidType}/${physicalId}`, {
        params: {
            page: historyPage,
            itemsPerPage: historyItemsPerPage,
            // sort: sortQuery.value,
            // search: searchValue.value
        }
    })
        .then((response) => {
            // TODO:: Update display of history here
            console.log(response);
            // totalItems.value = table.total;
            // serverItems.value = table.data
            // rfidData.value = rfid_data
            historyLoading.value = false
        })
        .catch((error) => {
            console.log(error);
            historyLoading.value = false
        });
}

const exportLoading = ref(false);
const exportData = async () => {
    try {
        exportLoading.value = true;
        await exportExcel({
            url: `/export/rfid-history/${physicalId}`,
            params: {
                rfid_type: rfidType,
            },
            filename: 'rfid-history-report.xlsx',
        });
    } catch (error) {
        console.error('Export error:', error);
    } finally {
        exportLoading.value = false;
    }
}

const exportBatchLoading = ref(false);
const exportBatchData = async () => {
    try {
        exportBatchLoading.value = true;
        await exportExcel({
            url: `/export/rfid-batch-history/${physicalId}`,
            params: {
                rfid_type: rfidType,
            },
            filename: 'rfid-batch-history-report.xlsx',
        });
    } catch (error) {
        console.error('Export error:', error);
    } finally {
        exportBatchLoading.value = false;
    }
}

</script>

<template>
    <div>
        <v-skeleton-loader v-if="pageLoading" type="article"></v-skeleton-loader>
        <v-card v-else elevation="2">
            <v-card-title>
                <div class="d-flex align-center px-4 mt-4">
                    <h4 class="text-h4 font-weight-black text-primary">RFID Details</h4>
                    <v-badge class="ml-3" color="primary-light" :content="convertSlugToUpperCase(rfidType)"
                        inline></v-badge>

                    <v-badge v-if="rfidData?.inventory?.under_fumigation" color="warning" content="UNDER FUMIGATION"
                        inline></v-badge>
                    <v-badge v-if="rfidData?.is_weak_signal || rfidData?.is_weak_signal === 1" color="error"
                        content="Yes" class="text-uppercase" inline></v-badge>
                </div>

                <VList lines="one" density="compact" class="mt-4">
                    <VListItem>
                        <VRow class="table-row" no-gutters>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 text-uppercase font-weight-bold text-grey-700"
                                            style="margin-top: 1px;">Storage Location</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-grey-700">{{
                                            rfidData?.storage_location?.name }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 text-uppercase font-weight-bold text-grey-700"
                                            style="margin-top: 1px;">Plant</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-grey-700">{{
                                            rfidData?.storage_location?.plant?.name }}</span>
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
                                        <span class="text-h6 text-uppercase font-weight-bold text-grey-700"
                                            style="margin-top: 1px;">RFID Code</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-grey-700">{{ rfidData?.rfid_code }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 text-uppercase font-weight-bold text-grey-700"
                                            style="margin-top: 1px;">Wrapping Area</span>
                                    </VCol>
                                    <VCol v-if="rfidData?.inventory" class="d-inline-flex align-center">
                                        <i v-if="rfidData?.inventory?.is_wrapped"
                                            style="font-size: 30px; background-color: green;"
                                            class="ri-checkbox-circle-line"></i>
                                        <i v-else style="font-size: 30px; background-color: #FF4C51;"
                                            class="ri-close-circle-line"></i>
                                    </VCol>
                                    <VCol v-else class="d-inline-flex align-center">
                                        <v-badge color="warning" content="NO INVENTORY YET" inline></v-badge>
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
                                        <span class="text-h6 text-uppercase font-weight-bold text-grey-700"
                                            style="margin-top: 1px;">Physical ID</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-grey-700">{{ rfidData?.name }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 text-uppercase font-weight-bold text-grey-700"
                                            style="margin-top: 1px;">Loading Area</span>
                                    </VCol>
                                    <VCol v-if="rfidData?.inventory" class="d-inline-flex align-center">
                                        <i v-if="rfidData?.inventory?.is_loaded"
                                            style="font-size: 30px; background-color: green;"
                                            class="ri-checkbox-circle-line"></i>
                                        <i v-else style="font-size: 30px; background-color: #FF4C51;"
                                            class="ri-close-circle-line"></i>
                                    </VCol>
                                    <VCol v-else class="d-inline-flex align-center">
                                        <v-badge color="warning" content="NO INVENTORY YET" inline></v-badge>
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
                                        <span class="text-h6 text-uppercase font-weight-bold text-grey-700"
                                            style="margin-top: 1px;">Current Batch</span>
                                    </VCol>
                                    <VCol v-if="rfidData?.inventory" class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-grey-700">{{ rfidData?.inventory?.batch
                                        }}</span>
                                    </VCol>
                                    <VCol v-else class="d-inline-flex align-center">
                                        <v-badge color="warning" content="NOT YET ASSIGNED" inline></v-badge>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 text-uppercase font-weight-bold text-grey-700"
                                            style="margin-top: 1px;">Empty Area</span>
                                    </VCol>
                                    <VCol v-if="rfidData?.inventory" class="d-inline-flex align-center">
                                        <i v-if="rfidData?.inventory?.is_empty"
                                            style="font-size: 30px; background-color: green;"
                                            class="ri-checkbox-circle-line"></i>
                                        <i v-else style="font-size: 30px; background-color: #FF4C51;"
                                            class="ri-close-circle-line"></i>
                                    </VCol>
                                    <VCol v-else class="d-inline-flex align-center">
                                        <v-badge color="warning" content="NO INVENTORY YET" inline></v-badge>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                </VList>
                <div class="mx-5">
                    <VRow class="table-row">
                        <VCol cols="2" class="d-inline-flex justify-start align-center">
                            <span class="text-h6 text-uppercase font-weight-bold text-grey-700"
                                style="margin-top: 1px;">EPCs</span>
                        </VCol>
                        <VCol cols="10" class="d-flex align-center">
                            <v-chip v-if="rfidData?.epc_data.length > 0" v-for="(epc, index) in rfidData?.epc_data"
                                :key="index" class="mb-1" label>
                                {{ epc.epc }}
                            </v-chip>
                        </VCol>
                    </VRow>
                </div>
            </v-card-title>
        </v-card>
        <div>
            <div class="mt-4">
                <v-card elevation="2">
                    <VRow class="mx-4">
                        <VCol md="12">
                            <SearchInput @update:search="handleSearch" />
                        </VCol>
                    </VRow>
                    <v-divider class="border-opacity-25" style="border-color: #cbcfc8;"></v-divider>

                    <v-card-text class="mx-2">

                        <div class="d-flex justify-space-between align-center mt-1 py-2">
                            <h4 class="text-h4 font-weight-black text-primary mx-4">Batch History</h4>
                            <VCol md="2" class="d-flex justify-center align-center">
                                <v-btn block :loading="exportBatchLoading" class="d-flex align-center"
                                    prepend-icon="ri-download-line" @click="exportBatchData">
                                    <template #prepend>
                                        <v-icon color="white"></v-icon>
                                    </template>
                                    Export Batch History
                                </v-btn>
                            </VCol>
                        </div>
                        <div class="mt-2">
                            <VDataTableServer v-model:items-per-page="itemsPerPage" :headers="headers"
                                :items="serverItems" :items-length="totalItems" :loading="pageLoading" item-value="id"
                                :search="searchValue" @update:options="loadItems" class="text-no-wrap">

                                <template #item.epc="{ item }">
                                    {{ item.rfid?.epc }}
                                </template>

                                <template #item.tid="{ item }">
                                    {{ item.rfid?.tid }}
                                </template>

                                <template #item.created_at="{ item }">
                                    {{ item.created_at ? Moment(item.created_at).format('MMMM D, YYYY h:mm A') : '' }}
                                </template>

                            </VDataTableServer>
                        </div>
                    </v-card-text>
                </v-card>
            </div>
        </div>
        <div>
            <v-card elevation="2" class="mt-4">
                <v-card-title>
                    <div class="d-flex justify-space-between align-center mt-1 py-2">
                        <h4 class="text-h4 font-weight-black text-primary mx-4">RFID History</h4>
                        <VCol md="2" class="d-flex justify-center align-center">
                            <v-btn block :loading="exportLoading" class="d-flex align-center"
                                prepend-icon="ri-download-line" @click="exportData">
                                <template #prepend>
                                    <v-icon color="white"></v-icon>
                                </template>
                                Export RFID History
                            </v-btn>
                        </VCol>
                    </div>
                </v-card-title>
                <v-card-text class="mx-3">
                    <VDataTableServer v-model:items-per-page="itemsPerPage" :headers="historyHeaders"
                        :items="historyServerItems" :items-length="totalHistoryItems" :loading="historyLoading"
                        item-value="id" @update:options="loadHistory" class="text-no-wrap"></VDataTableServer>
                </v-card-text>
            </v-card>
        </div>
    </div>
</template>
