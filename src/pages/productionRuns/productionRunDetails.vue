<script setup>
import DatePicker from '@/components/DatePicker.vue';
import EditingModal from '@/components/EditingModal.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import { useAuthorization } from '@/composables/useAuthorization';
import { exportExcel } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import { debounce } from 'lodash';
import Moment from 'moment';
import { computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { VTextarea } from 'vuetify/components';

const { authUserCan } = useAuthorization();

const emits = defineEmits(['update-success']);

const props = defineProps({
    productionRun: Object
})

const route = useRoute();
const searchValue = ref('');
const pageLoading = ref(false);
const tagTypesOption = ref([]);
const materialsOption = ref([]);
const statisticsData = ref(null);
const palletStats = ref({});
const labelStats = ref({});
const tonnerBagStats = ref({});
const selectedTagType = ref(null);
const changeBatchModal = ref(false);
const changeBatchLoading = ref(false);
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

// Fumigation variables
const fumigateModal = ref(false)
const fumigateLoading = ref(false)
const fumigateForm = reactive({
    remarks: null,
    startDate: null,
    endDate: null,
    batch: null,
    items: []
})

const headers = [
    {
        title: 'PHYSICAL ID',
        key: 'physical_id',
        align: 'center',
        sortable: false
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
        title: 'MATERIAL',
        key: 'material',
    },
    {
        title: 'MFG DATE',
        key: 'mfg_date',
    },
    // {
    //     title: 'IS LOADED',
    //     key: 'is_loaded',
    //     align: 'center',
    //     sortable: false
    // },
    // {
    //     title: 'IS EMPTY',
    //     key: 'is_empty',
    //     align: 'center',
    //     sortable: false
    // },
    // {
    //     title: 'Under Fumigation',
    //     key: 'under_fumigation',
    //     align: 'center',
    //     sortable: false
    // },
    {
        title: 'Line',
        key: 'line',
        align: 'center'
    },
    {
        title: 'Action',
        key: 'action',
        align: 'center',
    }

]

const batchUpdateForm = reactive({
    material_id: null,
    mfg_date: null,
    reason: null,
    miller_name: null,
    selectedRfid: [],
    type: 'inventory_log'
});

const wrongPalletForm = reactive({
    selectedRfid: [],
})

const router = useRouter();

const lastOptions = ref({});
const currentOptions = ref({});
const loadItems = ({ page, itemsPerPage, sortBy, search }) => {
    const options = { page, itemsPerPage, sortBy, search: searchValue.value };

    // Check if the options are the same as the last call
    // const isSame = JSON.stringify(lastOptions.value) === JSON.stringify(options);
    // if (isSame) return;

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

    ApiService.query(`production-runs/get-data/${props.productionRun.COMMODITY}`, {
        params: {
            page,
            itemsPerPage,
            sort: sortQuery.value,
            search: searchValue.value,
            filters: filters
        }
    })
        .then((response) => {
            const { table, statistics, tag_types, materials } = response.data
            totalItems.value = table.total;
            serverItems.value = table.data

            statisticsData.value = statistics
            palletStats.value = statisticsData.value.find(item => item.type === 'Pallet')
            labelStats.value = statisticsData.value.find(item => item.type === 'Label')
            tonnerBagStats.value = statisticsData.value.find(item => item.type === 'Tonner Bag')

            tagTypesOption.value = [
                { value: null, title: 'All' },
                ...tag_types.map(item => ({
                    value: item.id,
                    title: item.title
                }))
            ];

            materialsOption.value = materials.map(item => ({
                value: item.id,
                title: `${item.plant_code} - ${item.code} - ${item.description}`
            }));

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
        const response = await ApiService.query(`production-runs/get-data/${props.productionRun.COMMODITY}`, {
            params: {
                page: page.value,
                itemsPerPage: itemsPerPage.value,
                sortBy: [{ key: 'created_at', order: 'desc' }],
                search: searchValue.value,
                filters: filters
            }
        });

        const { table, statistics } = response.data

        totalItems.value = table.total;
        serverItems.value = table.data

        statisticsData.value = statistics
        palletStats.value = statisticsData.value.find(item => item.type === 'Pallet')
        labelStats.value = statisticsData.value.find(item => item.type === 'Label')
        tonnerBagStats.value = statisticsData.value.find(item => item.type === 'Tonner Bag')

        pageLoading.value = false
    } catch (error) {
        console.error("Error fetching filtered data:", error);
        pageLoading.value = false;
    } finally {
        pageLoading.value = false;
    }
});

const getTotalQuantity = computed(() => {
    if (statisticsData.value) {
        return statisticsData.value.reduce((total, item) => total + (parseInt(item.total_quantity) || 0), 0);
    }
});

const handleSearch = debounce((search) => {
    searchValue.value = search;
}, 500);

const handleViewRfid = (item) => {
    router.push(`/rfid/${item.type_slug}/${item.rfid?.name}`);
}

const changeBatch = () => {
    changeBatchModal.value = true;
}

const cancelChangeBatch = () => {
    clearChangeBatch()
    changeBatchModal.value = false;
}

const clearChangeBatch = () => {
    batchUpdateForm.material_id = null;
    batchUpdateForm.mfg_date = null;
    batchUpdateForm.batch = null;
    batchUpdateForm.reason = null;
    batchUpdateForm.miller_name = null;
}

const handleChangeBatch = async () => {
    changeBatchLoading.value = true;
    toast.value.show = false;
    batchUpdateForm.selectedRfid = selectedItems.value
    try {
        const response = await ApiService.post('inventories/batch-update', batchUpdateForm)
        changeBatchLoading.value = false;
        toast.value.message = 'Batch updated successfully!'
        toast.value.show = true;
        clearChangeBatch();
        loadItems({
            page: page.value,
            itemsPerPage: itemsPerPage.value,
            sortBy: [{ key: 'created_at', order: 'desc' }],
            search: searchValue.value
        });
        changeBatchModal.value = false;
        errorMessage.value = null;
    } catch (error) {
        errorMessage.value = error.response?.data?.message || 'An unexpected error occurred.';
        console.error('Error submitting:', error);
        changeBatchLoading.value = false;
    }
}

const fumigate = () => {
    selectedItems.value // check all under_fumigation column, if atleast 1 is true, dont allow
    const hasUnderFumigation = selectedItems.value.some(item => item.under_fumigation);
    if (hasUnderFumigation) {
        toast.value.message = 'Some selected items are already under fumigation. Please deselect them before proceeding.'
        toast.value.color = 'warning'
        toast.value.show = true;
        return;
    }

    fumigateModal.value = true;
}

const handleFumigate = async () => {
    fumigateLoading.value = true;
    toast.value.show = false;
    fumigateForm.items = selectedItems.value
    fumigateForm.batch = props.productionRun?.COMMODITY

    if (!fumigateForm.startDate || !fumigateForm.endDate || !fumigateForm.remarks) {
        errorMessage.value = 'Start Date, End Date, and Remarks are required.';
        fumigateLoading.value = false;
        return;
    }

    try {
        const response = await ApiService.post('production-runs/fumigate', fumigateForm)
        fumigateLoading.value = false;
        toast.value.message = 'Fumigation request created successfully'
        toast.value.show = true;
        clearFumigateForm();
        loadItems({
            page: page.value,
            itemsPerPage: itemsPerPage.value,
            sortBy: [{ key: 'updated_at', order: 'desc' }],
            search: searchValue.value
        });
        fumigateModal.value = false;
        errorMessage.value = null;
    } catch (error) {
        errorMessage.value = error.response?.data?.message || 'An unexpected error occurred.';
        console.error('Error submitting:', error);
        fumigateLoading.value = false;
    }
}

const cancelFumigate = () => {
    clearFumigateForm()
    fumigateModal.value = false;
}

const clearFumigateForm = () => {
    fumigateForm.remarks = null;
    fumigateForm.startDate = null;
    fumigateForm.endDate = null;
    fumigateForm.batch = null;
    fumigateForm.items = [];
}

const toast = ref({
    message: 'Batch updated successfully!',
    color: 'success',
    show: false
});

const exportLoading = ref(false);
const exportData = async () => {
    try {
        exportLoading.value = true;
        await exportExcel({
            url: `/export/production-runs/${props.productionRun.COMMODITY}`,
            params: {
                plant_id: filters.plant_id,
                tag_type_id: selectedTagType.value,
                search: searchValue.value,
            },
            filename: 'batch-run-report.xlsx',
        });
    } catch (error) {
        console.error('Export error:', error);
    } finally {
        exportLoading.value = false;
    }
}

const updateForm = reactive({
    quantity: null,
    rfid: null
})

const selectedItem = ref(null);
const updateLoading = ref(false);
const editDialog = ref(false);
const selectedRfid = ref(null);
const editItem = (item) => {
    selectedItem.value = item;
    selectedRfid.value = item.rfid;
    updateForm.rfid = {
        ...item.rfid,
        type: item.type_slug
    };
    updateForm.quantity = item.quantity;
    editDialog.value = true;
}

const showWrongPalletModal = ref(false)
const wrongPalletLoading = ref(false);
const wrongPalletPosition = () => {
    showWrongPalletModal.value = true;
}

const handleUpdate = async () => {
    updateLoading.value = true;
    toast.value.show = false;

    try {
        const response = await ApiService.post(`rfid/${selectedRfid.value.id}/update`, updateForm);
        if (response.status !== 200) {
            throw new Error('Failed to update RFID');
        }
        updateLoading.value = false;
        toast.value.message = 'Current quantity updated successfully!';
        toast.value.color = 'success';
        toast.value.show = true;
        loadItems({
            page: page.value,
            itemsPerPage: itemsPerPage.value,
            sortBy: [{ key: 'created_at', order: 'desc' }],
            search: searchValue.value
        });
    } catch (error) {
        console.error('Error updating:', error);
    } finally {
        updateLoading.value = false;
        editDialog.value = false;
        selectedRfid.value = null;
    }
}

const handleWrongPallet = async () => {
    wrongPalletLoading.value = true;
    toast.value.show = false;
    wrongPalletForm.selectedRfid = selectedItems.value
    try {
        const response = await ApiService.post(`production-runs/remove-batch-to-pallets`, wrongPalletForm);
        if (response.status !== 200) {
            throw new Error('Failed to update RFID');
        }
        wrongPalletLoading.value = false;
        toast.value.message = 'Successfully removed batch from pallet(s)';
        toast.value.color = 'success';
        toast.value.show = true;
        loadItems({
            page: page.value,
            itemsPerPage: itemsPerPage.value,
            sortBy: [{ key: 'created_at', order: 'desc' }],
            search: searchValue.value
        });
        emits('update-success')
        selectedItems.value = []
    } catch (error) {
        console.error('Error updating:', error);
    } finally {
        wrongPalletLoading.value = false;
        showWrongPalletModal.value = false;
        selectedRfid.value = null;
    }
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
                                    productionRun?.plant?.plant_code }}</span>
                                <div class="text-subtitle-1 font-weight-thin">{{ productionRun?.plant?.name }}</div>
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
                                    productionRun?.plant?.default_storage_location?.code }}</span>
                                <div class="text-subtitle-1 font-weight-thin">{{
                                    productionRun?.plant?.default_storage_location?.name }}</div>
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
                                <span class="font-weight-medium text-grey-700">{{ productionRun?.COMMODITY
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
                                <span class="font-weight-medium text-grey-700">{{ productionRun?.material?.description
                                    }}</span>
                            </VCol>
                        </VRow>
                    </VCol>
                </VRow>
            </VListItem>
        </VList>
        <div class="mx-4">
            <v-row>
                <v-col cols="3">
                    <v-skeleton-loader v-if="pageLoading" type="article"></v-skeleton-loader>
                    <v-card v-else class="px-4 py-2 bg-white border" elevation="0" style="border-radius: 4px;">
                        <div class="d-flex align-center">
                            <div class="d-flex align-center justify-center mr-4" style="
                            width: 48px;
                            height: 48px;
                            background-color: #cae2fa;
                            border-radius: 12px;
                            ">
                                <v-icon icon="ri-box-3-line" color="primary-light" size="24"></v-icon>
                            </div>
                            <div>
                                <span class="text-subtitle-1 font-weight-bold text-grey-700">
                                    Total Count
                                </span>
                                <div class="text-h4 font-weight-bold text-primary mt-1">
                                    {{ getTotalQuantity || 0 }}
                                </div>
                            </div>
                        </div>
                    </v-card>
                </v-col>
                <v-col cols="3">
                    <v-skeleton-loader v-if="pageLoading" type="article"></v-skeleton-loader>
                    <v-card v-else class="px-4 py-2 bg-white border" elevation="0" style="border-radius: 4px;">
                        <div class="d-flex align-center">
                            <div class="d-flex align-center justify-center mr-4" style="
                            width: 48px;
                            height: 48px;
                            background-color: #cae2fa;
                            border-radius: 12px;
                            ">
                                <v-icon icon="ri-box-3-line" color="primary" size="24"></v-icon>
                            </div>
                            <div>
                                <span class="text-subtitle-1 font-weight-bold text-grey-700">
                                    Pallet Count
                                </span>
                                <div class="text-h4 font-weight-bold text-primary mt-1">
                                    {{ palletStats?.pallet_count || 0 }}
                                </div>
                            </div>
                        </div>
                    </v-card>
                </v-col>

                <v-col cols="3">
                    <v-skeleton-loader v-if="pageLoading" type="article"></v-skeleton-loader>
                    <v-card v-else class="px-4 py-2 bg-white border" elevation="0" style="border-radius: 4px;">
                        <div class="d-flex align-center">
                            <div class="d-flex align-center justify-center mr-4" style="
                            width: 48px;
                            height: 48px;
                            background-color: #cae2fa;
                            border-radius: 12px;
                            ">
                                <v-icon icon="ri-box-3-line" color="primary" size="24"></v-icon>
                            </div>
                            <div>
                                <span class="text-subtitle-1 font-weight-bold text-grey-700">
                                    Label Count
                                </span>
                                <div class="text-h4 font-weight-bold text-primary mt-1">
                                    {{ labelStats?.label_count || 0 }}
                                </div>
                            </div>
                        </div>
                    </v-card>
                </v-col>
                <v-col cols="3">
                    <v-skeleton-loader v-if="pageLoading" type="article"></v-skeleton-loader>
                    <v-card v-else class="px-4 py-2 bg-white border" elevation="0" style="border-radius: 4px;">
                        <div class="d-flex align-center">
                            <div class="d-flex align-center justify-center mr-4" style="
                            width: 48px;
                            height: 48px;
                            background-color: #cae2fa;
                            border-radius: 12px;
                            ">
                                <v-icon icon="ri-box-3-line" color="primary" size="24"></v-icon>
                            </div>
                            <div>
                                <span class="text-subtitle-1 font-weight-bold text-grey-700">
                                    Tonner Bag
                                </span>
                                <div class="text-h4 font-weight-bold text-primary mt-1">
                                    {{ tonnerBagStats?.tonner_bag_count || 0 }}
                                </div>
                            </div>
                        </div>
                    </v-card>
                </v-col>
            </v-row>
        </div>
        <div class="mt-4 mx-4">
            <v-card elevation="0" class="border">
                <VRow class="mx-4">
                    <VCol md="8">
                        <SearchInput @update:search="handleSearch" />
                    </VCol>
                    <VCol md="2" class="d-flex justify-center align-center">
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
                    </VCol>
                </VRow>
                <v-divider class="border-opacity-25" style="border-color: #cbcfc8;"></v-divider>
                <v-card-text class="mx-2">
                    <div>
                        <div class="mb-4 d-flex justify-between align-center">
                            <h4 class="text-h4 font-weight-black text-primary">Batch Details</h4>
                            <v-spacer></v-spacer>

                            <v-btn @click="wrongPalletPosition" :disabled="selectedItems.length === 0" class="px-5"
                                type="button" color="warning">
                                Remove Batch
                            </v-btn>

                            <v-btn @click="changeBatch" :disabled="selectedItems.length === 0" class="px-5 ml-2"
                                type="button" color="primary-light">
                                Change Batch
                            </v-btn>

                            <v-btn v-if="authUserCan('create.fumigation.requests')" @click="fumigate"
                                :disabled="selectedItems.length === 0" class="px-5 ml-2" type="button"
                                color="primary-light">
                                Fumigate
                            </v-btn>
                        </div>

                        <div class="mb-2" v-if="selectedItems.length > 0">
                            <span class="text-h6 font-weight-medium text-high-emphasis">
                                Selected items count: ({{ selectedItems.length }})
                            </span>
                        </div>

                        <VDataTableServer v-model:items-per-page="itemsPerPage" v-model="selectedItems"
                            :headers="headers" :items="serverItems" :items-length="totalItems" :loading="pageLoading"
                            item-value="id" :search="searchValue" @update:options="loadItems" show-select return-object
                            class="text-no-wrap">

                            <template #item.physical_id="{ item }">
                                <span @click="handleViewRfid(item)"
                                    class="text-primary font-weight-bold cursor-pointer hover-underline">
                                    {{ item.rfid[0]?.name }}
                                </span>
                            </template>

                            <template #item.material="{ item }">
                                <span class="font-weight-bold">{{ item.material?.description }}</span><br />
                                <span class="text-subtitle-1">{{ item.material?.bu_material }}</span>
                            </template>

                            <template #item.type="{ item }">
                                {{ item.type }}
                            </template>

                            <template #item.mfg_date="{ item }">
                                {{ item.mfg_date ? Moment(item.mfg_date).format('MMMM D, YYYY') : '' }}
                            </template>

                            <!-- <template #item.is_loaded="{ item }">
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
                            </template> -->

                            <template #item.line="{ item }">
                                <div v-if="item.plc_run">
                                    {{ item.plc_run?.SILO ?? item.plc_run?.Section ?? null }}
                                </div>
                            </template>

                            <template #item.action="{ item }">
                                <div v-if="authUserCan('edit.rfid')" class="d-flex gap-1">
                                    <IconBtn size="small" @click="editItem(item)">
                                        <VIcon icon="ri-pencil-line" />
                                    </IconBtn>
                                </div>
                            </template>

                        </VDataTableServer>
                    </div>
                </v-card-text>
            </v-card>
        </div>
    </div>

    <EditingModal @close="changeBatchModal = false" max-width="900px" :show="changeBatchModal"
        :dialog-title="`Change Batch Assignment`">
        <template #default>
            <v-form @submit.prevent="handleChangeBatch">
                <v-row>
                    <v-col cols="12" md="6">
                        <v-autocomplete label="Select Material" density="compact" item-title="title" item-value="value"
                            :items="materialsOption" v-model="batchUpdateForm.material_id"
                            :rules="[value => !!value || 'Please select an item from the list']" />
                    </v-col>
                    <v-col cols="12" md="6">
                        <DatePicker v-model="batchUpdateForm.mfg_date" placeholder="Select Manufacturing Date" />
                    </v-col>
                </v-row>
                <v-text-field class="mt-4" density="compact" label="Miller Name"
                    v-model="batchUpdateForm.miller_name" />
                <v-textarea class="mt-4" clear-icon="ri-close-line" label="Reason" v-model="batchUpdateForm.reason"
                    clearable></v-textarea>
            </v-form>
            <VAlert v-if="errorMessage" class="mt-4" color="error" variant="tonal">
                {{ errorMessage }}
            </VAlert>
            <v-table class="mt-4">
                <thead>
                    <tr>
                        <th>RFID Code</th>
                        <th>Physical ID</th>
                        <th>Material</th>
                        <th>Receipt Date</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(item, index) in selectedItems" :key="index">
                        <td>{{ item.rfid_code }}</td>
                        <td>{{ item.rfid[0]?.name }}</td>
                        <td>{{ item.material?.description ?? 'N/A' }}</td>
                        <td>
                            {{ item.mfg_date ? Moment(item.mfg_date).format('MMMM D, YYYY') : '' }}
                        </td>
                    </tr>
                </tbody>
            </v-table>
            <div class="d-flex justify-end align-center mt-4">
                <v-btn color="secondary" variant="outlined" @click="cancelChangeBatch" class="px-12 mr-3">Cancel</v-btn>
                <PrimaryButton @click="handleChangeBatch" color="primary" class="px-12" type="submit"
                    :loading="changeBatchLoading">
                    Update
                </PrimaryButton>
            </div>
        </template>
    </EditingModal>

    <EditingModal @close="fumigateModal = false" max-width="900px" :show="fumigateModal"
        :dialog-title="`Fumigation Request`">
        <template #default>
            <v-form @submit.prevent="handleFumigate">
                <v-row>
                    <v-col cols="12" md="6">
                        <DatePicker v-model="fumigateForm.startDate" placeholder="Select Start Date" />
                    </v-col>
                    <v-col cols="12" md="6">
                        <DatePicker v-model="fumigateForm.endDate" placeholder="Select End Date" />
                    </v-col>
                </v-row>
                <v-textarea class="mt-4" clear-icon="ri-close-line" label="Remarks" v-model="fumigateForm.remarks"
                    clearable></v-textarea>
            </v-form>
            <VAlert v-if="errorMessage" class="mt-4" color="error" variant="tonal">
                {{ errorMessage }}
            </VAlert>
            <v-table class="mt-4">
                <thead>
                    <tr>
                        <th>RFID Code</th>
                        <th>Physical ID</th>
                        <th>Material</th>
                        <th>Receipt Date</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(item, index) in selectedItems" :key="index">
                        <td>{{ item.rfid_code }}</td>
                        <td>{{ item.rfid?.name }}</td>
                        <td>{{ item.material?.description ?? 'N/A' }}</td>
                        <td>
                            {{ item.mfg_date ? Moment(item.mfg_date).format('MMMM D, YYYY') : '' }}
                        </td>
                    </tr>
                </tbody>
            </v-table>
            <div class="d-flex justify-end align-center mt-4">
                <v-btn color="secondary" variant="outlined" @click="cancelFumigate" class="px-12 mr-3">Cancel</v-btn>
                <PrimaryButton @click="handleFumigate" color="primary" class="px-12" type="submit"
                    :loading="fumigateLoading">
                    Update
                </PrimaryButton>
            </div>
        </template>
    </EditingModal>

    <EditingModal v-if="selectedItem" @close="editDialog = false" :show="editDialog"
        :dialog-title="`Update ${selectedItem.rfid?.name}`">
        <template #default>
            <v-form @submit.prevent="handleUpdate">
                <v-text-field class="mt-6" density="compact" :rules="[value => !!value || 'Quantity is required']"
                    label="Actual Quantity" v-model="updateForm.quantity" />
                <div class="d-flex justify-end align-center mt-4">
                    <v-btn color="secondary" variant="outlined" @click="editDialog = false"
                        class="px-12 mr-3">Cancel</v-btn>
                    <PrimaryButton color="primary" class="px-12" type="submit" :loading="updateLoading">
                        Update
                    </PrimaryButton>
                </div>
            </v-form>
        </template>
    </EditingModal>


    <EditingModal @close="showWrongPalletModal = false" max-width="900px" :show="showWrongPalletModal"
        :dialog-title="`Remove Batch on Pallets`">
        <template #default>
            <div class="mx-4">
                <span class="text-h5 text-high-emphasis">
                    Do you want to remove the attached batch <span class="text-primary">{{ productionRun.COMMODITY
                        }}</span> from the following {{ selectedItems.length > 1 ? `pallets` : 'pallet' }}?
                </span>
            </div>
            <v-table class="mt-4">
                <thead>
                    <tr>
                        <th>Plant</th>
                        <th>Type</th>
                        <th>Physical ID</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(item, index) in selectedItems" :key="index">
                        <td>{{ productionRun.plant?.name }}</td>
                        <td class="text-uppercase">{{ item.type }}</td>
                        <td>{{ item.rfid?.name }}</td>
                    </tr>
                </tbody>
            </v-table>
            <div class="d-flex justify-end align-center mt-4">
                <v-btn color="secondary" variant="outlined" @click="showWrongPalletModal = false"
                    class="px-12 mr-3">Cancel</v-btn>
                <PrimaryButton @click="handleWrongPallet" color="primary" class="px-12" type="submit"
                    :loading="wrongPalletLoading">
                    Confirm
                </PrimaryButton>
            </div>
        </template>
    </EditingModal>
    <Toast :show="toast.show" :color="toast.color" :message="toast.message" @update:show="toast.show = $event" />
</template>
