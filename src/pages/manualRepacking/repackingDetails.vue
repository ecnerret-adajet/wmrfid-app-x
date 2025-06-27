<script setup>
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import { useAuthorization } from '@/composables/useAuthorization';
import ApiService from '@/services/ApiService';
import { debounce } from 'lodash';
import Moment from 'moment';
import { reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const { authUserCan } = useAuthorization();

const props = defineProps({
    repacking: Object
})

const route = useRoute();
const searchValue = ref('');
const pageLoading = ref(false);
const tagTypesOption = ref([]);
const selectedTagType = ref(null);
const errorMessage = ref(null);

const serverItems = ref([]);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref('-created_at');
const selectedItems = ref([])
const filters = reactive({
    tag_type_id: null,
    plant_id: null
})

const headers = [
    {
        title: 'RFID CODE',
        key: 'rfid_code',
    },
    {
        title: 'PHYSICAL ID',
        key: 'physical_id',
    },
    {
        title: 'QUANTITY',
        key: 'quantity',
        align: 'center',
        sortable: false
    },
    {
        title: 'TYPE',
        key: 'type',
        align: 'center',
        sortable: false

    },
    {
        title: 'MFG DATE',
        key: 'mfg_date',
    },
    {
        title: 'IS LOADED',
        key: 'is_loaded',
        align: 'center',
        sortable: false
    },
    {
        title: 'IS EMPTY',
        key: 'is_empty',
        align: 'center',
        sortable: false
    },
    {
        title: 'Under Fumigation',
        key: 'under_fumigation',
        align: 'center',
        sortable: false
    },
    {
        title: 'CURRENT AGE',
        key: 'age',
        align: 'center'
    },

]

const batchUpdateForm = reactive({
    material_id: null,
    mfg_date: null,
    reason: null,
    miller_name: null,
    selectedRfid: [],
    type: 'inventory_log'
});

const router = useRouter();

const lastOptions = ref({});
const currentOptions = ref({});
const loadItems = ({ page, itemsPerPage, sortBy, search }) => {
    const options = { page, itemsPerPage, sortBy, search: searchValue.value };

    // Check if the options are the same as the last call
    const isSame = JSON.stringify(lastOptions.value) === JSON.stringify(options);
    if (isSame) return;

    // Store the current options
    lastOptions.value = options;
    currentOptions.value = options;

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

    ApiService.query(`repackings/get-data/${props.repacking?.batch}`, {
        params: {
            page,
            itemsPerPage,
            sort: sortQuery.value,
            search: searchValue.value,
            filters: filters
        }
    })
        .then((response) => {
            const { table, tag_types } = response.data
            totalItems.value = table.total;
            serverItems.value = table.data

            tagTypesOption.value = [
                { value: null, title: 'All' },
                ...tag_types.map(item => ({
                    value: item.id,
                    title: item.title
                }))
            ];

            pageLoading.value = false
        })
        .catch((error) => {
            console.log(error);
            pageLoading.value = false
        });
}

watch(selectedTagType, async (newVal) => {
    pageLoading.value = true;
    filters.tag_type_id = newVal
    try {
        const response = await ApiService.query(`repackings/get-data/${props.repacking?.batch}`, {
            params: {
                page: page.value,
                itemsPerPage: itemsPerPage.value,
                sortBy: [{ key: 'created_at', order: 'desc' }],
                search: searchValue.value,
                filters: filters
            }
        });

        const { table, tag_types } = response.data

        totalItems.value = table.total;
        serverItems.value = table.data

        tagTypesOption.value = [
            { value: null, title: 'All' },
            ...tag_types.map(item => ({
                value: item.id,
                title: item.title
            }))
        ];

        pageLoading.value = false
    } catch (error) {
        console.error("Error fetching filtered data:", error);
        pageLoading.value = false;
    } finally {
        pageLoading.value = false;
    }
});


const handleSearch = debounce((search) => {
    searchValue.value = search;
}, 500);

const handleViewRfid = (item) => {
    router.push(`/rfid/${item.type_slug}/${item.rfid?.name}`);
}

const toast = ref({
    message: 'Batch updated successfully!',
    color: 'success',
    show: false
});

const exportLoading = ref(false);
const exportData = async () => {
    // try {
    //     exportLoading.value = true;
    //     await exportExcel({
    //         url: `/export/production-runs/${props.productionRun.COMMODITY}`,
    //         params: {
    //             plant_id: filters.plant_id,
    //             tag_type_id: selectedTagType.value,
    //             search: searchValue.value,
    //         },
    //         filename: 'batch-run-report.xlsx',
    //     });
    // } catch (error) {
    //     console.error('Export error:', error);
    // } finally {
    //     exportLoading.value = false;
    // }
}

</script>

<template>
    <div>
        <VList lines="one" density="compact" class="border mx-4 mb-4">
            <VListItem>
                <VRow class="table-row" no-gutters>
                    <VCol md="6" class="table-cell d-inline-flex">
                        <VRow class="table-row">
                            <VCol cols="4" class="d-inline-flex align-start">
                                <span class="text-h6 text-uppercase font-weight-bold text-grey-700"
                                    style="margin-top: 1px;">Plant</span>
                            </VCol>
                            <VCol class="d-flex flex-column">
                                <span class="text-medium-emphasis font-weight-medium">{{
                                    repacking?.to_material?.plant?.plant_code }}</span>
                                <div class="text-subtitle-1 font-weight-thin">{{ repacking?.to_material?.plant?.name }}
                                </div>
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
                                    repacking?.to_material?.plant?.default_storage_location?.code }}</span>
                                <div class="text-subtitle-1 font-weight-thin">{{
                                    repacking?.to_material?.plant?.default_storage_location?.name }}</div>
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
                                    style="margin-top: 1px;">Batch</span>
                            </VCol>
                            <VCol class="d-inline-flex align-center">
                                <span class="font-weight-medium text-grey-700">{{ repacking?.batch
                                }}</span>
                            </VCol>
                        </VRow>
                    </VCol>
                    <VCol md="6" class="table-cell d-inline-flex">
                        <VRow class="table-row">
                            <VCol cols="4" class="d-inline-flex align-center">
                                <span class="text-h6 text-uppercase font-weight-bold text-grey-700"
                                    style="margin-top: 1px;">Material</span>
                            </VCol>
                            <VCol class="d-inline-flex align-center">
                                <span class="font-weight-medium text-grey-700">{{ repacking?.to_material?.description
                                }}</span>
                            </VCol>
                        </VRow>
                    </VCol>
                </VRow>
            </VListItem>
        </VList>

        <div class="mt-4 mx-4">
            <v-card elevation="0" class="border">
                <VRow class="mx-4">
                    <VCol md="12">
                        <SearchInput @update:search="handleSearch" />
                    </VCol>
                    <!-- <VCol md="2" class="d-flex justify-center align-center">
                        <v-select class="mt-1" label="Filter by Type" density="compact" :items="tagTypesOption"
                            v-model="selectedTagType">
                        </v-select>
                    </VCol>
                    <VCol md="2" class="d-flex justify-center align-center">
                        <v-btn block :loading="exportLoading" class="d-flex align-center"
                            prepend-icon="ri-download-line" @click="exportData">
                            <template #prepend>
                                <v-icon color="white"></v-icon>
                            </template>
Export
</v-btn>
</VCol> -->
                </VRow>
                <v-divider class="border-opacity-25" style="border-color: #cbcfc8;"></v-divider>
                <v-card-text class="mx-2">
                    <div>
                        <div class="mb-4 d-flex justify-between align-center">
                            <h4 class="text-h4 font-weight-black text-primary">Batch Details</h4>
                            <v-spacer></v-spacer>

                        </div>

                        <div class="mb-2" v-if="selectedItems.length > 0">
                            <span class="text-h6 font-weight-medium text-high-emphasis">
                                Selected items count: ({{ selectedItems.length }})
                            </span>
                        </div>

                        <VDataTableServer v-model:items-per-page="itemsPerPage" :headers="headers" :items="serverItems"
                            :items-length="totalItems" :loading="pageLoading" item-value="id" :search="searchValue"
                            @update:options="loadItems" class="text-no-wrap">

                            <template #item.rfid_code="{ item }">
                                <span @click="handleViewRfid(item)"
                                    class="text-primary font-weight-bold cursor-pointer hover-underline">
                                    {{ item.rfid_code }}
                                </span>
                            </template>

                            <template #item.material_id="{ item }">
                                {{ item.material?.description }}
                            </template>

                            <template #item.physical_id="{ item }">
                                {{ item.rfid?.name }}
                            </template>

                            <template #item.type="{ item }">
                                {{ item.type }}
                            </template>

                            <template #item.mfg_date="{ item }">
                                {{ item.mfg_date ? Moment(item.mfg_date).format('MMMM D, YYYY') : '' }}
                            </template>

                            <template #item.is_loaded="{ item }">
                                <div class="d-flex justify-center align-center">
                                    <i v-if="item.is_loaded" style="font-size: 30px; background-color: green;"
                                        class="ri-checkbox-circle-line"></i>
                                    <i v-else style="font-size: 30px; background-color: #FF4C51;"
                                        class="ri-close-circle-line"></i>
                                </div>
                            </template>

                            <template #item.is_empty="{ item }">
                                <div class="d-flex justify-center align-center">
                                    <i v-if="item.is_empty" style="font-size: 30px; background-color: green;"
                                        class="ri-checkbox-circle-line"></i>
                                    <i v-else style="font-size: 30px; background-color: #FF4C51;"
                                        class="ri-close-circle-line"></i>
                                </div>
                            </template>

                            <template #item.under_fumigation="{ item }">
                                <v-btn v-if="item.under_fumigation" :to="`/fumigations/${item.fumigation_request_id}`"
                                    color="warning" variant="outlined" size="small">
                                    Fumigated
                                </v-btn>
                                <i v-else style="font-size: 30px; background-color: #FF4C51;"
                                    class="ri-close-circle-line"></i>
                            </template>

                            <template #item.age="{ item }">
                                {{ item.current_age }}
                            </template>

                            <template #item.latest_created_at="{ item }">
                                {{ item.latest_created_at ? Moment(item.latest_created_at).format('MMMM D, YYYY') : ''
                                }}
                            </template>

                            <template #item.updated_at="{ item }">
                                {{ item.updated_at ? Moment(item.updated_at).format('MMMM D, YYYY') : '' }}
                            </template>

                        </VDataTableServer>
                    </div>
                </v-card-text>
            </v-card>
        </div>
    </div>

    <Toast :show="toast.show" :color="toast.color" :message="toast.message" @update:show="toast.show = $event" />
</template>
