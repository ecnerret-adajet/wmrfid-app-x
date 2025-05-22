<script setup>
import DatePicker from '@/components/DatePicker.vue';
import EditingModal from '@/components/EditingModal.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import { exportExcel } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import { debounce } from 'lodash';
import Moment from 'moment';
import { computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { VTextarea } from 'vuetify/components';

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
const tonerBagStats = ref({});
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

    ApiService.query(`production-runs/get-data/${props.productionRun.generated_batch}`,{
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
            tonerBagStats.value = statisticsData.value.find(item => item.type === 'Toner Bag')
            
            tagTypesOption.value = [
                { value: null, title: 'All' }, 
                ...tag_types.map(item => ({
                    value: item.id,
                    title: item.title 
                }))
            ];

            materialsOption.value = materials

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
        const response = await ApiService.query(`production-runs/get-data/${props.productionRun.generated_batch}`, {
            params: {
                page: page.value,
                itemsPerPage: itemsPerPage.value,
                sortBy: [{key: 'created_at', order: 'desc'}],
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
            tonerBagStats.value = statisticsData.value.find(item => item.type === 'Toner Bag')

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
            sortBy: [{key: 'created_at', order: 'desc'}],
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
    fumigateForm.batch = batch

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
            sortBy: [{key: 'updated_at', order: 'desc'}],
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
            url: `/export/production-runs/${props.productionRun.generated_batch}`,
            params: {
                plant_id: filters.plant_id,
                tag_type_id: selectedTagType.value,
                search: searchValue.value,
            },
            filename: 'production-runs-report.xlsx',
        });
    } catch (error) {
        console.error('Export error:', error);
    } finally {
        exportLoading.value = false;
    }
}

</script>

<template>
    <div>
        <div class="mx-4">
            <v-row>
                <v-col cols="3">
                    <v-skeleton-loader  v-if="pageLoading" type="article"></v-skeleton-loader>
                    <v-card v-else
                        class="px-4 py-2 bg-white border"
                        elevation="0"
                        style="border-radius: 4px;"
                    >
                        <div class="d-flex align-center">
                        <div
                            class="d-flex align-center justify-center mr-4"
                            style="
                            width: 48px;
                            height: 48px;
                            background-color: #cae2fa;
                            border-radius: 12px;
                            "
                        >
                            <v-icon
                            icon="ri-box-3-line"
                            color="primary-light"
                            size="24"
                            ></v-icon>
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
                    <v-skeleton-loader  v-if="pageLoading" type="article"></v-skeleton-loader>
                    <v-card v-else
                        class="px-4 py-2 bg-white border"
                        elevation="0"
                        style="border-radius: 4px;"
                    >
                        <div class="d-flex align-center">
                        <div
                            class="d-flex align-center justify-center mr-4"
                            style="
                            width: 48px;
                            height: 48px;
                            background-color: #cae2fa;
                            border-radius: 12px;
                            "
                        >
                            <v-icon
                            icon="ri-box-3-line"
                            color="primary"
                            size="24"
                            ></v-icon>
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
                    <v-skeleton-loader  v-if="pageLoading" type="article"></v-skeleton-loader>
                    <v-card v-else
                        class="px-4 py-2 bg-white border"
                        elevation="0"
                        style="border-radius: 4px;"
                    >
                        <div class="d-flex align-center">
                        <div
                            class="d-flex align-center justify-center mr-4"
                            style="
                            width: 48px;
                            height: 48px;
                            background-color: #cae2fa;
                            border-radius: 12px;
                            "
                        >
                            <v-icon
                            icon="ri-box-3-line"
                            color="primary"
                            size="24"
                            ></v-icon>
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
                    <v-skeleton-loader  v-if="pageLoading" type="article"></v-skeleton-loader>
                    <v-card v-else
                        class="px-4 py-2 bg-white border"
                        elevation="0"
                        style="border-radius: 4px;"
                    >
                        <div class="d-flex align-center">
                        <div
                            class="d-flex align-center justify-center mr-4"
                            style="
                            width: 48px;
                            height: 48px;
                            background-color: #cae2fa;
                            border-radius: 12px;
                            "
                        >
                            <v-icon
                            icon="ri-box-3-line"
                            color="primary"
                            size="24"
                            ></v-icon>
                        </div>
                        <div>
                            <span class="text-subtitle-1 font-weight-bold text-grey-700">
                            Toner Bag
                            </span>
                            <div class="text-h4 font-weight-bold text-primary mt-1">
                            {{ tonerBagStats?.toner_bag_count || 0 }}
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
                        <SearchInput @update:search="handleSearch"/>
                    </VCol>
                    <VCol md="2" class="d-flex justify-center align-center">
                        <v-select class="mt-1" label="Filter by Type" density="compact"
                            :items="tagTypesOption" v-model="selectedTagType" 
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
                <v-divider class="border-opacity-25" style="border-color: #cbcfc8;"></v-divider>
                <v-card-text class="mx-2">
                    <div>
                        <div class="mb-4 d-flex justify-between align-center">
                            <h4 class="text-h4 font-weight-black text-primary">Batch Details</h4>
                            <v-spacer></v-spacer>
                            <v-btn @click="changeBatch" :disabled="selectedItems.length === 0" class="px-5" type="button" color="primary-light">
                                Change Batch
                            </v-btn>

                            <v-btn @click="fumigate" :disabled="selectedItems.length === 0" class="px-5 ml-2" type="button" color="primary-light">
                                Fumigate
                            </v-btn>
                        </div>

                        <VDataTableServer
                            v-model:items-per-page="itemsPerPage"
                            v-model="selectedItems"
                            :headers="headers"
                            :items="serverItems"
                            :items-length="totalItems"
                            :loading="pageLoading"
                            item-value="id"
                            :search="searchValue"
                            @update:options="loadItems"
                            show-select
                            return-object
                            class="text-no-wrap"
                        >

                        <template #item.rfid_code="{ item }">
                            <span @click="handleViewRfid(item)" class="text-primary font-weight-bold cursor-pointer hover-underline">
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
                                <i v-if="item.is_loaded" style="font-size: 30px; background-color: green;" class="ri-checkbox-circle-line"></i>
                                <i v-else style="font-size: 30px; background-color: #FF4C51;"  class="ri-close-circle-line"></i>
                            </div>
                        </template>

                        <template #item.is_empty="{ item }">
                            <div class="d-flex justify-center align-center">
                                <i v-if="item.is_empty" style="font-size: 30px; background-color: green;" class="ri-checkbox-circle-line"></i>
                                <i v-else style="font-size: 30px; background-color: #FF4C51;"  class="ri-close-circle-line"></i>
                            </div>
                        </template>

                        <template #item.under_fumigation="{ item }">
                            <v-btn
                                v-if="item.under_fumigation"
                                :to="`/fumigations/${item.fumigation_request_id}`"
                                color="warning"
                                variant="outlined"
                                size="small"
                            >
                             Fumigated
                            </v-btn>
                        </template>

                        <template #item.age="{ item }">
                            {{  item.current_age }}
                        </template>

                        <template #item.latest_created_at="{ item }">
                            {{ item.latest_created_at ? Moment(item.latest_created_at).format('MMMM D, YYYY') : '' }}
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

    <EditingModal @close="changeBatchModal = false" max-width="900px"
        :show="changeBatchModal" :dialog-title="`Change Batch Assignment`">
        <template #default>
            <v-form @submit.prevent="handleChangeBatch">
                <v-row>
                    <v-col cols="12" md="6">
                        <v-select
                            label="Select Material"
                            density="compact"
                            :items="materialsOption"
                            v-model="batchUpdateForm.material_id"
                            :rules="[value => !!value || 'Please select an item from the list']"
                        />
                    </v-col>
                    <v-col cols="12" md="6">
                        <DatePicker
                            v-model="batchUpdateForm.mfg_date"
                            placeholder="Select Manufacturing Date"
                        />
                    </v-col>
                </v-row>
                <v-text-field class="mt-4" density="compact" 
                    label="Miller Name"
                    v-model="batchUpdateForm.miller_name" 
                />
                <v-textarea class="mt-4"
                    clear-icon="ri-close-line"
                    label="Reason"
                    v-model="batchUpdateForm.reason"
                    clearable
                ></v-textarea>
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
                <v-btn color="secondary" variant="outlined" @click="cancelChangeBatch" class="px-12 mr-3">Cancel</v-btn>
                <PrimaryButton @click="handleChangeBatch" color="primary" class="px-12" type="submit" :loading="changeBatchLoading">
                    Update
                </PrimaryButton>
            </div>
        </template>
    </EditingModal>

    <EditingModal @close="fumigateModal = false" max-width="900px"
        :show="fumigateModal" :dialog-title="`Fumigation Request`">
        <template #default>
            <v-form @submit.prevent="handleFumigate">
                <v-row>
                    <v-col cols="12" md="6">
                        <DatePicker 
                            v-model="fumigateForm.startDate"
                            placeholder="Select Start Date"
                        />
                    </v-col>
                    <v-col cols="12" md="6">
                        <DatePicker 
                            v-model="fumigateForm.endDate"
                            placeholder="Select End Date"
                        />
                    </v-col>
                </v-row>
                <v-textarea class="mt-4"
                    clear-icon="ri-close-line"
                    label="Remarks"
                    v-model="fumigateForm.remarks"
                    clearable
                ></v-textarea>
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
                <PrimaryButton @click="handleFumigate" color="primary" class="px-12" type="submit" :loading="fumigateLoading">
                    Update
                </PrimaryButton>
            </div>
        </template>
    </EditingModal>
    <Toast :show="toast.show" :color="toast.color" :message="toast.message" @update:show="toast.show = $event"/>
</template>
