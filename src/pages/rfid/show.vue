<script setup>
import SearchInput from '@/components/SearchInput.vue';
import { convertSlugToOriginal } from '@/composables/useHelpers';
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

const items = [
    'test',
    'test',
    'test',
]

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

    ApiService.query(`rfid/get-physical-id-data/${rfidType}/${physicalId}`,{
        params: {
            page,
            itemsPerPage,
            sort: sortQuery.value,
            search: searchValue.value
        }
        })
        .then((response) => {
            const { table, rfid_data } = response.data
            
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

</script>

<template>
    <div>
        <v-card elevation="2">
            <v-card-title>
                <div class="d-flex align-center px-4 mt-4">
                    <h4 class="text-h4 font-weight-black text-primary">RFID Details</h4>
                    <v-badge class="ml-3"
                        color="primary-light"
                        :content="convertSlugToOriginal(rfidType)"
                        inline
                    ></v-badge>
                </div>

                <VList lines="one" density="compact" class="mt-4">
                    <VListItem>
                        <VRow class="table-row" no-gutters>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 text-uppercase font-weight-bold text-grey-700" style="margin-top: 1px;">RFID Code</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-grey-700">{{ rfidData?.rfid_code }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 text-uppercase font-weight-bold text-grey-700" style="margin-top: 1px;">Wrapping Area</span>
                                    </VCol>
                                    <VCol v-if="rfidData?.inventory" class="d-inline-flex align-center">
                                        <i v-if="rfidData?.inventory?.is_wrapped" style="font-size: 30px; background-color: green;" class="ri-checkbox-circle-line"></i>
                                        <i v-else style="font-size: 30px; background-color: #FF4C51;"  class="ri-close-circle-line"></i>
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
                                        <span class="text-h6 text-uppercase font-weight-bold text-grey-700" style="margin-top: 1px;">Physical ID</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-grey-700">{{ rfidData?.name }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 text-uppercase font-weight-bold text-grey-700" style="margin-top: 1px;">Loading Area</span>
                                    </VCol>
                                    <VCol v-if="rfidData?.inventory" class="d-inline-flex align-center">
                                        <i v-if="rfidData?.inventory?.is_loaded" style="font-size: 30px; background-color: green;" class="ri-checkbox-circle-line"></i>
                                        <i v-else style="font-size: 30px; background-color: #FF4C51;"  class="ri-close-circle-line"></i>
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
                                        <span class="text-h6 text-uppercase font-weight-bold text-grey-700" style="margin-top: 1px;">Current Batch</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-grey-700">{{ rfidData?.inventory?.batch }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 text-uppercase font-weight-bold text-grey-700" style="margin-top: 1px;">Empty Area</span>
                                    </VCol>
                                    <VCol v-if="rfidData?.inventory" class="d-inline-flex align-center">
                                        <i v-if="rfidData?.inventory?.is_empty" style="font-size: 30px; background-color: green;" class="ri-checkbox-circle-line"></i>
                                        <i v-else style="font-size: 30px; background-color: #FF4C51;"  class="ri-close-circle-line"></i>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                </VList>
                <div class="mx-5">
                    <VRow class="table-row">
                        <VCol cols="2" class="d-inline-flex justify-start align-center">
                            <span class="text-h6 text-uppercase font-weight-bold text-grey-700" style="margin-top: 1px;">EPCs</span>
                        </VCol>
                        <VCol cols="10" class="d-flex align-center">
                            <v-chip v-if="rfidData?.epc_data.length > 0"
                                v-for="(epc, index) in rfidData?.epc_data"
                                :key="index"
                                class="ma-2"
                                label
                            >
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
                            <SearchInput @update:search="handleSearch"/>
                        </VCol>
                    </VRow>
                    <v-divider class="border-opacity-25" style="border-color: #cbcfc8;"></v-divider>

                    <v-card-text class="mx-2">
                        <div class="mb-4 d-flex justify-between align-center">
                            <h4 class="text-h4 font-weight-black text-primary">Batch History</h4>
                        </div>
                        <div class="mt-2">
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
    </div>
</template>
