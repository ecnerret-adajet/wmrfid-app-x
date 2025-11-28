<script setup>
import DatePicker from '@/components/DatePicker.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import { useAuthorization } from '@/composables/useAuthorization';
import ApiService from '@/services/ApiService';
import { useAuthStore } from '@/stores/auth';
import { debounce } from 'lodash';
import Moment from 'moment';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();
const serverItems = ref([]);
const rfidServerItems = ref([]);
const materialsOption = ref([]);
const plantsOption = ref([]);
const rfidLoading = ref(false);
const loading = ref(true);
const totalItems = ref(0);
const rfidTotalItems = ref(0);
const itemsPerPage = ref(10);
const rfidItemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref('-created_at'); // Default sort
const rfidSortQuery = ref('-created_at'); // Default sort
const filterModalVisible = ref(false)
const searchValue = ref('');
const rfidSearchValue = ref('');
const errorMessage = ref(null);
const filters = reactive({
    start_date: null,
    end_date: null
});

const rfidFilters = reactive({
    start_date: null,
    end_date: null,
    material_id: null,
    plant_code: null,
    under_fumigation: false
});

const { authUserCan } = useAuthorization();

const headers = [
    {
        title: 'MATERIAL',
        key: 'material_id',
    },
    {
        title: 'BATCH',
        key: 'batch',
    },
    {
        title: 'RFID COUNT',
        key: 'inventory_count',
        align: 'center',
        sortable: false,
    },
    {
        title: 'PLANT',
        key: 'plant_code',
        align: 'center',
        sortable: false,
    },
    {
        title: 'Current Age',
        key: 'current_age',
        align: 'center',
        sortable: false,
    },
    {
        title: 'START DATE',
        key: 'start_date',
    },
    {
        title: 'END DATE',
        key: 'end_date',
        align: 'center',
    },
    {
        title: 'STATUS',
        key: 'status',
        align: 'center',
        sortable: false,
    },
    {
        title: 'Fumigation Age',
        key: 'fumigation_age',
        align: 'center',
        sortable: false,
    },
    {
        title: 'ACTION',
        key: 'action',
        align: 'center',
        sortable: false,
    },
]

const rfidHeaders = [
    {
        title: 'PHYSICAL ID',
        key: 'physical_id',
    },
    {
        title: 'PLANT',
        key: 'plant',
    },
    {
        title: 'BATCH',
        key: 'batch', 
    },
    {
        title: 'MATERIAL',
        key: 'material_description',
    },
    {
        title: 'QUANTITY',
        key: 'quantity', 
        align: 'center',
    },
    {
        title: 'MFG DATE',
        key: 'mfg_date',
    },
]

const filterModalOpen = () => {
    if (!filterModalVisible.value) {
        filterModalVisible.value = true;
    }
};

const handleSearch = debounce((search) => {
    searchValue.value = search;
}, 500);

const loadItems = ({ page, itemsPerPage, sortBy, search }) => {
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

    ApiService.query('datatable/fumigation-requests',{
        params: {
            page,
            itemsPerPage,
            sort: sortQuery.value,
            search: searchValue.value,
            filters: filters
        }
        })
        .then((response) => {
           
            const { table, materials, plants } = response.data;
            totalItems.value = table.total;
            serverItems.value = table.data;
            console.log(serverItems.value);

            materialsOption.value = materials.map(item => ({
                value: item.id,
                title: `${item.plant_code} - ${item.code} - ${item.description}`,
                plant_code: item.plant_code,
                default_pallet_quantity: item.default_pallet_quantity
            }));

            plantsOption.value = plants.map(item => ({
                value: item.plant_code,
                title: item.name,
                name: item.name
            }));

            loading.value = false

        })
        .catch((error) => {
            console.log(error);
        });

        
}


const toast = reactive({
    message: '',
    color: 'error',
    show: false
});

const fumigateForm = reactive({
    startDate: null,
    remarks: null,
    endDate: null,
})

const createFumigateForm = reactive({
    remarks: null,
    startDate: null,
    endDate: null,
    items: []
})

const fumigateModal = ref(false);
const selectedFumigationRequest = ref(null)
const editItem = (item) => {
    if (item.status === 'completed') {
        toast.message = 'Fumigation request already completed';
        toast.color = 'error';
        toast.show = true;
        return;
    }
    fumigateForm.startDate = item.start_date ? new Date(item.start_date) : null;
    fumigateForm.endDate = item.end_date ? new Date(item.end_date) : null;
    fumigateForm.remarks = item.remarks;
    selectedFumigationRequest.value = item;
    fumigateModal.value = true;
}  

const fumigateLoading = ref(false)
const handleFumigate = async () => {
    fumigateLoading.value = true;
    toast.show = false;
  
    if ((!fumigateForm.startDate || fumigateForm.startDate === 'Invalid Date' ) || !fumigateForm.endDate || !fumigateForm.remarks) {
        toast.message = 'Start Date, End Date, and Remarks are required.';
        toast.color = 'error';
        toast.show = true;
        fumigateLoading.value = false;
        return; 
    }

    if (Moment(fumigateForm.startDate).isAfter(Moment(fumigateForm.endDate))) {
        toast.message = 'Start Date cannot be later than End Date.';
        toast.color = 'error';
        toast.show = true;
        fumigateLoading.value = false;
        return;
    }
    
    try {
        const response = await ApiService.post(`fumigations/update/${selectedFumigationRequest.value.id}`, fumigateForm)
        
        fumigateLoading.value = false;
        toast.message = 'Fumigation request updated successfully'
        toast.color = 'success';
        toast.show = true;
        loadItems({
            page: page.value,
            itemsPerPage: itemsPerPage.value,
            sortBy: [{key: 'updated_at', order: 'desc'}],
            search: searchValue.value
        });
        fumigateModal.value = false;
    } catch (error) {
        console.error('Error submitting:', error);
        fumigateLoading.value = false;
    }
}

const handleCreateFumigate = async () => {
    fumigateLoading.value = true;
    toast.show = false;
    createFumigateForm.items = selectedItems.value

    if (!createFumigateForm.startDate || !createFumigateForm.endDate || !createFumigateForm.remarks) {
        errorMessage.value = 'Start Date, End Date, and Remarks are required.';
        fumigateLoading.value = false;
        return;
    }

    const start = new Date(createFumigateForm.startDate);
    const end = new Date(createFumigateForm.endDate);

    if (start.getTime() > end.getTime()) {
        errorMessage.value = 'Start Date cannot be later than End Date.';
        fumigateLoading.value = false;
        return;
    }

    if (selectedItems.value.length === 0) {
        errorMessage.value = 'Please select at least one RFID item for fumigation.';
        fumigateLoading.value = false;
        return;
    }

    try {
        const response = await ApiService.post('fumigations/create', createFumigateForm)
        fumigateLoading.value = false;
        toast.color = 'success';
        toast.message = 'Fumigation request created successfully'
        toast.show = true;
        clearFumigateForm();
        loadItems({
            page: page.value,
            itemsPerPage: itemsPerPage.value,
            sortBy: [{ key: 'updated_at', order: 'desc' }],
            search: searchValue.value
        });
        showCreateFumigate.value = false;
        errorMessage.value = null;
    } catch (error) {
        errorMessage.value = error.response?.data?.message || 'An unexpected error occurred.';
        console.error('Error submitting:', error);
        fumigateLoading.value = false;
    }
}

const showCreateFumigate = ref(false);
const selectedItems = ref([])
const createFumigation = () => {
    showCreateFumigate.value = true
}

const clearFumigateForm = () => {
    createFumigateForm.remarks = null;
    createFumigateForm.startDate = null;
    createFumigateForm.endDate = null;
    createFumigateForm.items = [];
}

const loadRfid = ({ page, itemsPerPage, sortBy, search }) => {
    rfidLoading.value = true
    if (sortBy && sortBy.length > 0) {
        const sort = sortBy[0];  // Assuming single sort field
        rfidSortQuery.value = `${sort.key}`;  // Default ascending order
        if (sort.order === 'desc') {
            rfidSortQuery.value = `-${sort.key}`;  // Prefix with minus for descending order
        }
    } else {
        rfidSortQuery.value = '-created_at';
    }

    ApiService.query('fumigations/datatable/rfid',{
        params: {
            page,
            itemsPerPage,
            sort: rfidSortQuery.value,
            search: rfidSearchValue.value,
            filters: rfidFilters
        }
        })
        .then((response) => {
            rfidTotalItems.value = response.data.total;
            rfidServerItems.value = response.data.data
            rfidLoading.value = false
        })
        .catch((error) => {
            console.log(error);
        });
}

const handleSearchRfid = debounce((search) => {
    rfidSearchValue.value = search;
    // reset to first page on new search
    page.value = 1;
    onFilterChange();
}, 500);

// WATCHERS: react to the actual reactive changes (guaranteed to be current)
watch(() => rfidFilters.material_id, (newVal, oldVal) => {
    // If user clears selection, we still want to refresh
    page.value = 1;
    onFilterChange();
});

// Keep material selection if it still matches newly selected plant; otherwise clear it.
watch(() => rfidFilters.plant_code, (newVal, oldVal) => {
    if (newVal === oldVal) return;
    page.value = 1;

    if (!newVal) {
        rfidFilters.material_id = null;
        onFilterChange();
        return;
    }

    const currentMaterial = materialsOption.value.find(
        m => String(m.value) === String(rfidFilters.material_id)
    );

    if (!currentMaterial || String(currentMaterial.plant_code) !== String(newVal)) {
        rfidFilters.material_id = null;
    }

    onFilterChange();
});

// onFilterChange keeps same implementation but ensure we reset page when needed
const onFilterChange = () => {
    loadRfid({
        page: page.value,
        itemsPerPage: rfidItemsPerPage.value,
        sortBy: [{key: 'updated_at', order: 'desc'}],
        search: rfidSearchValue.value,
        filters: rfidFilters
    });
}

// computed filteredMaterialsOption stays the same
const filteredMaterialsOption = computed(() => {
    if (!rfidFilters.plant_code) return materialsOption.value;
    return materialsOption.value.filter(m => String(m.plant_code) === String(rfidFilters.plant_code));
});

const cancelCreateFumigation = () => {
    showCreateFumigate.value = false;
    clearFumigateForm();
    selectedItems.value = [];
    errorMessage.value = null;
}

</script>
<template>
    <div class="d-flex flex-wrap gap-4 align-center justify-center">
        <SearchInput class="flex-grow-1" @update:search="handleSearch" />
        <v-btn
            class="d-flex align-center"
            prepend-icon="ri-equalizer-line"
            @click="filterModalOpen"
        >
            <template #prepend>
            <v-icon color="white"></v-icon>
            </template>
            Filter
        </v-btn>

        <v-btn v-if="authUserCan('create.fumigation.requests')" class="d-flex align-center" prepend-icon="ri-add-line"
            @click="createFumigation">
            <template #prepend>
                <v-icon color="white"></v-icon>
            </template>
            Create Fumigation
        </v-btn>

    </div>
    <v-card>
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
            <template #item.material_id="{ item }">
                {{ item.material?.description }}
            </template>

            <template #item.batch="{ item }">
                {{ item.batch }}
            </template>

            <template #item.inventory_count="{ item }">
                {{ item.inventories?.length }}
            </template>

            <template #item.start_date="{ item }">
                <span v-if="item.start_date">{{ item.start_date ? Moment(item.start_date).format('MMMM D, YYYY') : '' }}</span>
            </template>

            <template #item.end_date="{ item }">
                <span v-if="item.end_date">{{ item.end_date ? Moment(item.end_date).format('MMMM D, YYYY') : '' }}</span>
            </template>

            <template #item.status="{ item }">
                <v-badge v-if="item.status == 'scheduled'"
                        color="info"
                        :content="item.status"
                        class="text-uppercase"
                        inline
                ></v-badge>
                <v-badge v-else-if="item.status == 'in progress'"
                        color="warning"
                        :content="item.status"
                        class="text-uppercase"
                        inline
                ></v-badge>
                <v-badge v-else-if="item.status == 'completed'"
                        color="success"
                        :content="item.status"
                        class="text-uppercase"
                        inline
                ></v-badge>
            </template>

            <!-- <template #item.action="{ item }">
                <v-btn
                    :to="`/fumigations/${item.id}`"
                    color="primary-light"
                    variant="outlined"
                    size="small"
                >
                    Details
                </v-btn>
            </template> -->

             <template #item.action="{ item }">
                <div class="d-flex gap-1 justify-center align-center">
                    <!-- Add role allowed for editing fumigation  -->
                    <IconBtn v-if="authUserCan('update.fumigation.requests')"
                        size="small"
                        @click="editItem(item)"
                    >
                        <VIcon icon="ri-pencil-line" />
                    </IconBtn>
                </div>
            </template>

        </VDataTableServer>
    </v-card>

     <v-dialog v-model="fumigateModal" max-width="800px">
        <v-card elevation="2">
            <v-card-title class="d-flex justify-space-between align-center mx-4 px-4 mt-6">
                  <div class="text-h4 font-semibold ps-2 text-primary d-flex align-center">
                    <i class="ri-shield-check-line text-primary text-h4 mr-2" style="margin-top: -1px;"></i>
                    Edit Fumigation Request Details
                </div>
                <v-btn
                    icon="ri-close-line"
                    variant="text"
                    @click="fumigateModal = false"
                ></v-btn>
            </v-card-title>
            <v-card-text>
                <VList lines="one" density="compact" class="mt-4 mx-4 border">
                    <VListItem>
                        <VRow class="table-row" no-gutters>
                            <VCol md="12" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 text-uppercase font-weight-bold text-high-emphasis" style="margin-top: 1px;">Material</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-medium-emphasis">{{ selectedFumigationRequest?.material?.description }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                    <VListItem>
                        <VRow class="table-row" no-gutters>
                            <VCol md="12" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 text-uppercase font-weight-bold text-high-emphasis" style="margin-top: 1px;">Batch</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-medium-emphasis">{{ selectedFumigationRequest?.batch }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                    <VListItem>
                        <VRow class="table-row" no-gutters>
                            <VCol md="12" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 text-uppercase font-weight-bold text-high-emphasis" style="margin-top: 1px;">Plant</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-medium-emphasis">{{ selectedFumigationRequest?.material?.plant?.plant_code }}
                                            - {{ selectedFumigationRequest?.material?.plant?.name }}
                                        </span>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                    <VListItem>
                        <VRow class="table-row" no-gutters>
                            <VCol md="12" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 text-uppercase font-weight-bold text-high-emphasis" style="margin-top: 1px;">Storage Location</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-medium-emphasis">
                                            {{ selectedFumigationRequest?.production_run?.production_line?.reader?.default_storage_location?.code}} 
                                            - {{ selectedFumigationRequest?.production_run?.production_line?.reader?.default_storage_location?.name}}
                                        </span>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                </VList>

                <v-form class="mx-4 mt-4" id="editFumigateForm" ref="editFumigateForm" @submit.prevent="handleFumigate">
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
                                :min-date="fumigateForm.startDate"
                                placeholder="Select End Date"
                            />
                        </v-col>
                    </v-row>
                    <v-textarea class="mt-4"
                        clear-icon="ri-close-line"
                        label="Remarks"
                        lines="2"
                        v-model="fumigateForm.remarks"
                        clearable
                    ></v-textarea>
                    <div class="d-flex justify-end align-center mt-4">
                        <v-btn color="secondary" variant="outlined" @click="fumigateModal = false" class="px-12 mr-3">Cancel</v-btn>
                        <PrimaryButton color="primary" for="editFumigateForm" class="px-12" type="submit" :loading="fumigateLoading">
                            Update
                        </PrimaryButton>
                    </div>
                </v-form>
            </v-card-text>

        </v-card>
    </v-dialog>

    <Toast :show="toast.show" :color="toast.color" :message="toast.message" @update:show="toast.show = $event"/>

    <EditingModal @close="showCreateFumigate = false" max-width="1500px" :show="showCreateFumigate"
        :dialog-title="`Fumigation Request`">
        <template #default>
            <v-form @submit.prevent="handleFumigate">
                <v-row>
                    <v-col cols="12" md="6">
                        <DatePicker v-model="createFumigateForm.startDate" placeholder="Select Start Date" />
                    </v-col>
                    <v-col cols="12" md="6">
                        <DatePicker v-model="createFumigateForm.endDate" placeholder="Select End Date" />
                    </v-col>
                </v-row>
                <v-textarea class="mt-4" clear-icon="ri-close-line" label="Remarks" v-model="createFumigateForm.remarks"
                    clearable></v-textarea>
            </v-form>
            <VAlert v-if="errorMessage" class="mt-4" color="error" variant="tonal">
                {{ errorMessage }}
            </VAlert>

            <v-divider class="my-4"></v-divider>


            <div class="d-flex flex-wrap gap-4 align-center justify-center">
                <SearchInput class="flex-grow-1" @update:search="handleSearchRfid" />

                <div class="d-flex align-center" style="min-width: 230px;">
                    <v-autocomplete label="Select Plant" density="compact" item-title="title" item-value="value"
                        :items="plantsOption" v-model="rfidFilters.plant_code" @update:modelValue="onFilterChange"/>
                </div>
                 <div class="d-flex align-center" style="min-width: 330px;">
                    <v-autocomplete label="Select Material" density="compact" @update:modelValue="onFilterChange" item-title="title" item-value="value"
                        :items="filteredMaterialsOption" v-model="rfidFilters.material_id" />
                </div>
            </div>

            <div class="mb-2" v-if="selectedItems.length > 0">
                <span class="text-h6 font-weight-medium text-high-emphasis">
                    Selected items count: ({{ selectedItems.length }})
                </span>
            </div>

            <VDataTableServer v-model:items-per-page="rfidItemsPerPage" v-model="selectedItems"
                            :headers="rfidHeaders" :items="rfidServerItems" :items-length="rfidTotalItems" :loading="rfidLoading"
                            item-value="id" :search="rfidSearchValue" @update:options="loadRfid" show-select return-object
                            class="text-no-wrap">
                <template #item.physical_id="{ item }">
                    {{ item.name }}
                </template>
                <template #item.batch="{ item }">
                    {{ item.batch }}
                </template>
                <template #item.plant="{ item }">
                    {{ item.plant_name }}
                </template>
                <template #item.material_description="{ item }">
                    {{ item.description }}
                </template>
                <template #item.mfg_date="{ item }">
                    {{ item.mfg_date ? Moment(item.mfg_date).format('MMMM D, YYYY') : '' }}
                </template>

            </VDataTableServer>
            
            <div class="d-flex justify-end align-center mt-4">
                <v-btn color="secondary" variant="outlined" @click="cancelCreateFumigation" class="px-12 mr-3">Cancel</v-btn>
                <PrimaryButton @click="handleCreateFumigate" color="primary" class="px-12" type="submit"
                    :loading="fumigateLoading">
                    Create
                </PrimaryButton>
            </div>
        </template>
    </EditingModal>

</template>
