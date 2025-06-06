<script setup>
import EditingModal from '@/components/EditingModal.vue';
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import { exportExcel } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import { debounce } from 'lodash';
import Moment from 'moment';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const props = defineProps({
    inventory: Object
})

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const searchValue = ref('');
const pageLoading = ref(false);
const tagTypesOption = ref([]);
const materialsOption = ref([]);
const statisticsData = ref(null);
const sequenceOption = ref([]);
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
    tag_type_id: null
})

const headers = [
    {
        title: 'MATERIAL',
        key: 'material_id',
    },
    {
        title: 'PHYSICAL ID',
        key: 'physical_id',
    },
    {
        title: 'TYPE',
        key: 'type',
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
        title: 'IS WRAPPED',
        key: 'is_wrapped',
        align: 'center',
        sortable: false
    },
    {
        title: 'CURRENT AGE',
        key: 'age',
        align: 'center',
        sortable: false
    },
    {
        title: 'QUANTITY',
        key: 'quantity',
        align: 'center'
    },
]

const batchUpdateForm = reactive({
    material_id: null,
    mfg_date: null,
    reason: null,
    miller_name: null,
    selectedRfid: [],
    type: 'inventory'
});

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

    ApiService.query(`inventories/get-data/${props.inventory?.batch}`,{
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
    filters.tag_type_id = newVal
    pageLoading.value = true;
    try {
        const response = await ApiService.query(`inventories/get-data/${props.inventory?.batch}`, {
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
       

            pageLoading.value = false
    } catch (error) {
        console.error("Error fetching filtered data:", error);
        pageLoading.value = false;
    } finally {
        pageLoading.value = false;
    }
});

const totalQuantity = computed(() => {
    return statisticsData.value?.reduce((sum, item) => {
        return sum + Number(item.total_quantity || 0)
    }, 0)
})

const loadedItemsTotal = computed(() => {
    return statisticsData.value?.reduce((sum, item) => {
        return sum + Number(item.loaded_items || 0)
    }, 0)
})

const wrappedTotal = computed(() => {
    return statisticsData.value?.reduce((sum, item) => {
        return sum + Number(item.wrapped_items || 0)
    }, 0)
})

const availableTotal = computed(() => {
    return statisticsData.value?.reduce((sum, item) => {
        return sum + Number(item.available_items || 0)
    }, 0)
})

const handleSearch = debounce((search) => {
    searchValue.value = search;
}, 500);

const handleViewBatch = (inventory) => {
    router.push(`/inventories/${inventory.batch}`);
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
        changeBatchModal.value = false;
        errorMessage.value = null;

        await router.push('/inventories');
    } catch (error) {
        errorMessage.value = error.response?.data?.message || 'An unexpected error occurred.';
        console.error('Error submitting:', error);
        changeBatchLoading.value = false;
    }
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
            url: `/export/inventories/${props.inventory?.batch}`,
            params: {
                filters: {
                    tag_type_id: selectedTagType.value
                },
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

</script>

<template>
    <div>
        <VList lines="one" density="compact" class="border mx-4 mb-4">
            <VListItem>
                <VRow class="table-row" no-gutters>
                    <VCol md="6" class="table-cell d-inline-flex">
                        <VRow class="table-row">
                            <VCol cols="4" class="d-inline-flex align-start">
                                <span class="text-h6 text-uppercase font-weight-bold text-grey-700" style="margin-top: 1px;">Plant</span>
                            </VCol>
                            <VCol class="d-flex flex-column">
                                <span class="text-medium-emphasis font-weight-medium">{{ inventory?.storage_location?.plant?.plant_code}}</span>
                                <div class="text-subtitle-1 font-weight-thin">{{ inventory?.storage_location?.plant?.name}}</div>
                            </VCol>
                        </VRow>
                    </VCol>
                    <VCol md="6" class="table-cell d-inline-flex">
                        <VRow class="table-row">
                            <VCol cols="4" class="d-inline-flex align-start">
                                <span class="text-h6 text-uppercase font-weight-bold text-grey-700" style="margin-top: 1px;">Storage Location</span>
                            </VCol>
                            <VCol class="d-flex flex-column">
                                <span class="text-medium-emphasis font-weight-medium">{{ inventory?.storage_location?.code}}</span>
                                <div class="text-subtitle-1 font-weight-thin">{{ inventory?.storage_location?.name }}</div>
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
                                <span class="text-h6 text-uppercase font-weight-bold text-grey-700" style="margin-top: 1px;">Batch</span>
                            </VCol>
                            <VCol class="d-inline-flex align-center">
                                <span class="font-weight-medium text-grey-700">{{ inventory?.batch }}</span>
                            </VCol>
                        </VRow>
                    </VCol>
                </VRow>
            </VListItem>
        </VList>
        <div class="mx-4">
            <v-row>
                <v-col cols="3">
                    <v-card
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
                            Total Quantity
                            </span>
                            <div class="text-h4 font-weight-bold text-primary mt-1">
                            {{ totalQuantity || 0 }}
                            </div>
                        </div>
                        </div>
                    </v-card>
                </v-col>
                <v-col cols="3">
                    <v-card
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
                            background-color: #e0f2fe;
                            border-radius: 12px;
                            "
                        >
                            <v-icon
                            icon="ri-truck-line"
                            color="info"
                            size="24"
                            ></v-icon>
                        </div>
                        <div>
                            <span class="text-subtitle-1 font-weight-bold text-grey-700">
                            Loaded Items
                            </span>
                            <div class="text-h4 font-weight-bold text-primary mt-1">
                            {{ loadedItemsTotal || 0 }}
                            </div>
                        </div>
                        </div>
                    </v-card>
                </v-col>
            
                <v-col cols="3">
                    <v-card
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
                            background-color: #e0f2fe;
                            border-radius: 12px;
                            "
                        >
                            <v-icon
                            icon="ri-folder-5-line"
                            color="primary"
                            size="24"
                            ></v-icon>
                        </div>
                        <div>
                            <span class="text-subtitle-1 font-weight-bold text-grey-700">
                            Wrapped Items
                            </span>
                            <div class="text-h4 font-weight-bold text-primary mt-1">
                            {{ wrappedTotal || 0 }}
                            </div>
                        </div>
                        </div>
                    </v-card>
                </v-col>
                <v-col cols="3">
                    <v-card
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
                            background-color: #e8f5e9;
                            border-radius: 12px;
                            "
                        >
                            <v-icon
                            icon="ri-thumb-up-line"
                            color="primary"
                            size="24"
                            ></v-icon>
                        </div>
                        <div>
                            <span class="text-subtitle-1 font-weight-bold text-grey-700">
                            Available Items
                            </span>
                            <div class="text-h4 font-weight-bold text-primary mt-1">
                            {{ availableTotal || 0 }}
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
                    <VCol md="6">
                        <SearchInput @update:search="handleSearch"/>
                    </VCol>
                    
                    <VCol md="2" class="d-flex justify-center align-center">
                        <v-select class="mt-1" label="Filter by Type" density="compact"
                            :items="tagTypesOption" v-model="selectedTagType" 
                        >
                        </v-select>
                    </VCol>
                    <VCol md="2" class="d-flex justify-center align-center">
                        <v-select class="mt-1" label="Filter by Sequence" density="compact"
                            :items="sequenceOption" 
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
                    <div class="mb-4 d-flex justify-between align-center">
                        <v-spacer></v-spacer>
                        <v-btn @click="changeBatch" :disabled="selectedItems.length === 0" class="px-5" type="button" color="primary-light">
                            Change Batch
                        </v-btn>
                    </div>
                    <div class="mb-2" v-if="selectedItems.length > 0">
                        <span class="text-h6 font-weight-medium text-high-emphasis">
                            Selected items count: ({{ selectedItems.length }})
                        </span>
                    </div>
                    <div class="mt-2">
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

                            <template #item.batch="{ item }">
                                <span @click="handleViewBatch(item)" class="text-primary font-weight-bold cursor-pointer hover-underline">
                                    {{ item.batch }}
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

                            <template #item.is_wrapped="{ item }">
                                <div class="d-flex justify-center align-center">
                                    <i v-if="item.is_wrapped" style="font-size: 30px; background-color: green;" class="ri-checkbox-circle-line"></i>
                                    <i v-else style="font-size: 30px; background-color: #FF4C51;"  class="ri-close-circle-line"></i>
                                </div>
                            </template>

                            <template #item.is_loaded="{ item }">
                                <div class="d-flex justify-center align-center">
                                    <i v-if="item.is_loaded" style="font-size: 30px; background-color: green;" class="ri-checkbox-circle-line"></i>
                                    <i v-else style="font-size: 30px; background-color: #FF4C51;"  class="ri-close-circle-line"></i>
                                </div>
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
    <Toast :show="toast.show" :color="toast.color" :message="toast.message" @update:show="toast.show = $event"/>
</template>
