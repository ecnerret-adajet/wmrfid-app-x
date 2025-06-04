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
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref('-created_at'); // Default sort
const filterModalVisible = ref(false)
const searchValue = ref('');
const filters = reactive({
    start_date: null,
    end_date: null
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
        key: 'inventory_log_count',
        align: 'center',
        sortable: false,
    },
    {
        title: 'TYPE',
        key: 'rfid_type',
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
            totalItems.value = response.data.total;
            serverItems.value = response.data.data
            loading.value = false

        })
        .catch((error) => {
            console.log(error);
        });
}

const handleViewBatch = (item) => {
    router.push(`/production-runs/${item.batch}`);
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
        const response = await ApiService.post(`production-runs/fumigate/update/${selectedFumigationRequest.value.id}`, fumigateForm)
        
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

            <template #item.inventory_log_count="{ item }">
                {{ item.inventory_logs.length }}
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


    <!-- <EditingModal @close="fumigateModal = false" max-width="900px"
        :show="fumigateModal" :dialog-title="`Edit Fumigation Request`">
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
    </EditingModal> -->
</template>
