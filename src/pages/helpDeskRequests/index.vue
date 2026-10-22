<script setup>
import Loader from '@/components/Loader.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import { useAuthorization } from '@/composables/useAuthorization';
import { exportExcel } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import { useAuthStore } from '@/stores/auth';
import Moment from 'moment';
import { computed, onMounted, reactive, ref } from 'vue';

const authStore = useAuthStore();
const todayStr = Moment().format('YYYY-MM-DD');
const { authUserCan } = useAuthorization();
const searchValue = ref('');
const datatableRef = ref(null);
const isLoading = ref(false);
const plantsOption = ref([])
const showCreateModal = ref(false);
const createLoading = ref(false);
const deliveryLoading = ref(false);
const deliveryOptions = ref([]);
const selectedDeliveryOption = ref(null);
const batchOptions = ref([]);
const batchLoading = ref(false); 

let deliverySearchTimeout = null;

const toast = ref({
    message: 'Success!',
    color: 'success',
    show: false
});

const filters = reactive({
    created_at: null,
    updated_at: null,
    plant_code: authStore.user?.assigned_plant?.plant_code || null,
    date_filter: null,
    status_type: 2,
    request_type: 'All'
});


onMounted(() => {
    fetchDropdownData();
})

const requestTypes = ref([]);
const createForm = reactive({
    application_request_type: null,
    delivery_document: null,
    batches: [],
    line_item: null,
    customer_age_requirement: null,
    remarks: ''
});

const selectedRequestType = computed(() => {
    return requestTypes.value.find(item => item.value === createForm.application_request_type) || null;
});

const isBatchException = computed(() => {
    const requestTypeName = selectedRequestType.value?.name || selectedRequestType.value?.title;

    return requestTypeName === 'Batch Exception';
});

const fetchDropdownData = async () => {
    isLoading.value = true;
    try {
        let endpoint = 'application-requests/get-data-dropdown';

        // Check if filters.plant_code is a valid, non-null value
        if (filters.plant_code) {
            endpoint += `/${filters.plant_code}`;
        }

        const preReqData = await ApiService.get(endpoint);
        const { plants, types } = preReqData.data;

        plantsOption.value = plants.map(item => ({
            value: item.plant_code,
            title: `${item.plant_code} - ${item.name}`,
            name: item.name
        }));

        requestTypes.value = types.map(item => ({
            value: item.id,
            title: item.name,
            name: item.name
        }));
    } catch (error) {
        console.error('Error fetching data:', error);
    } finally {
        isLoading.value = false;
    }
};


function removeLeadingZeros(value) {
    if (!value) return '';
    return value.replace(/^0+/, '');
}

const itemsLoading = ref(false);

const exportLoading = ref(false);
const exportData = async () => {
    try {
        exportLoading.value = true;
        await exportExcel({
            url: `/reports/floating-pallets/export`,
            params: {
                filters: filters
            },
            filename: 'floating-pallets-report.xlsx',
        });
    } catch (error) {
        console.error('Export error:', error);
    } finally {
        exportLoading.value = false;
    }
}

const handleSearch = () => {
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{ key: 'created_at', order: 'desc' }],
        filters: filters,
        search: searchValue.value
    });
};


const baseHeaders = computed(() => {
    const mainHeaders = [
        { title: 'PLANT', key: 'plant_id', align: 'start', sortable: false },
        { title: 'TYPE', key: 'type',  sortable: false, align: 'center' },
        { title: 'REQUESTED BY', key: 'requested_by', sortable: false },
        { title: 'REQUESTED AT', key: 'requested_at', sortable: false },
        // { title: 'Status', key: 'status_id', sortable: false, align: 'center' },
        { title: 'Processed By', key: 'processed_by', sortable: false, align: 'center', width: '220px' },
        { title: 'Processed At', key: 'processed_at', sortable: false, align: 'center' },
    ];

    if (authUserCan('can.approve.batch.exception')) {
        mainHeaders.splice(9, 0, {
            title: 'Actions',
            key: 'actions',
            align: 'center',
            sortable: false
        });
    }
  
    return mainHeaders;
});

// 2. Create the computed headers layer to track totalItems state changes
const headers = computed(() => {
    if (totalItems.value === 0) {
        // FIX: Added .value to baseHeaders to extract the actual array layer
        return baseHeaders.value.map(({ fixed, ...rest }) => rest)
    }
    return baseHeaders.value
})

const loading = ref(true);
const serverItems = ref([]);
const totalItems = ref(0);
const itemsPerPage = ref(50);
const page = ref(1);
const sortQuery = ref('-created_at'); // Default sort
const loadItems = ({ page, itemsPerPage, sortBy }) => {
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

    ApiService.query('help-desk-requests', {
        params: {
            page,
            itemsPerPage,
            sort: sortQuery.value,
            search: searchValue.value,
            filters: filters
        }
    })
        .then((response) => {
            const payload = response.data;
            console.log(payload)
       
            serverItems.value = payload.data;   // Current page raw line records array
            totalItems.value = payload.total;   // Total absolute matched lines for footer

            loading.value = false;
        })
        .catch((error) => {
            console.log(error);
        });
}

const showApproveModal = ref(false);
const approveItem = ref(null);
const approveRemarks = ref('');
const pendingRequestAction = ref('approve');

const approveItemTypeLabel = computed(() => {
    return approveItem.value?.type || 'Batch Exception';
});

function approveRequest(item) {
    approveItem.value = item;
    console.log(approveItem.value)
    approveRemarks.value = '';
    showApproveModal.value = true;
}

const pageLoading = ref(false);
const submitProcessRequest = () => {
    processRequest(pendingRequestAction.value);
};

async function processRequest(action) {
    try {
        pageLoading.value = true;
        const statusId = action === 'approve' ? 1 : 3;
        const payload = {
            request_id: approveItem.value?.id,
            status_id: statusId,
            remarks: approveRemarks.value || null // Always pass context or null
        };

        const response = await ApiService.post(
            `/help-desk-requests/approve-request`,
            payload
        );

        if (response.data?.result === 'S') {
            toast.message = response.data?.message || 'Service Request approved!';
            toast.color = 'success';
            toast.show = true;
            // Optionally reload items
            await loadItems({
                page: page.value,
                itemsPerPage: itemsPerPage.value,
                sortBy: [{ key: 'updated_at', order: 'desc' }],
                search: searchValue.value
            });
            closeApproveModal();
        } else {
            toast.message = response.data?.message || 'Failed to approve service request.';
            toast.color = 'error';
            toast.show = true;
        }
    } catch (e) {
        toast.message = 'Failed to approve service request.';
        toast.color = 'error';
        toast.show = true;
        console.error(e);
    } finally {
        pageLoading.value = false;
    }
}

function closeApproveModal() {
    showApproveModal.value = false;
    approveItem.value = null;
    approveRemarks.value = '';
    pendingRequestAction.value = 'approve';
}

const ageRequirementDisplay = computed(() => {
    const from = approveItem.value?.application_requestable?.age_requirement_from
    const to = approveItem.value?.application_requestable?.age_requirement_to

    // If both values are missing or null, show a dash or empty string
    if (from === null || from === undefined || to === null || to === undefined) {
        return 'N/A'
    }

    return `${from} - ${to} days`
})

</script>

<template>
    <div class="d-flex flex-wrap gap-4 align-center justify-center">
        <SearchInput class="flex-grow-1" @update:search="(val) => { searchValue = val; handleSearch(); }" />

        <!-- Plant Filter -->
        <v-select style="max-width: 300px;" class="flex-grow-1 align-center" label="Filter by Plant"
            density="compact"
            :items="plantsOption.length > 1 ? [{ title: 'All', value: null }, ...plantsOption] : plantsOption"
            v-model="filters.plant_code"
            :rules="[value => value !== undefined || 'Please select an item from the list']">
        </v-select>

        <VCol md="2" cols="12" class="">
            <v-text-field v-model="filters.dateFrom" label="Date From" type="date" density="compact" variant="outlined" hide-details />
        </VCol>
        <VCol md="2" cols="12" class=" ">
            <v-text-field v-model="filters.dateTo" label="Date To" type="date" density="compact" variant="outlined" hide-details />
        </VCol>
       
        <!-- Status Filter -->
        <v-select style="max-width: 200px;" class="flex-grow-1 align-center" label="Filter by Status"
            density="compact" :items="[
                { title: 'All', value: null },
                { title: 'Pending', value: 2 },
                { title: 'Processed', value: 1 },
            ]" v-model="filters.status_type">
        </v-select>

        <!-- Action Buttons -->
        <!-- <v-btn :loading="exportLoading" class="d-flex align-center" prepend-icon="ri-download-line" @click="exportData">
            <template #prepend>
                <v-icon color="white"></v-icon>
            </template>
            Export
        </v-btn>  -->
      
        <PrimaryButton type="button" @click="handleSearch" :loading="loading">
            <i class="ri-search-eye-line mr-2"></i>
            Search
        </PrimaryButton>
    </div>

    <VRow no-gutters class="mb-4">
       
        <VCol md="6" class="d-none d-md-flex"></VCol>
    </VRow>

    <VCard>
        <VDataTableServer v-model:items-per-page="itemsPerPage" :headers="headers" :items="serverItems"
            :items-length="totalItems" :loading="loading" item-value="id" @update:options="loadItems"
            class="text-no-wrap fixed-column-table">

            <template #item.plant_id="{ item }">
                <span class="font-weight-bold">{{ item.plant?.plant_code }}</span><br />
                <span v-if="item.plant" class="text-subtitle-1">{{ item.plant?.name }}</span>
            </template>

            <template #item.material="{ item }">
                <span class="font-weight-bold">{{ item.material?.bu_material }}</span><br />
                <span v-if="item.material" class="text-subtitle-1">{{ item.material?.description }}</span>
            </template>

            <!-- temporarily assign update as needed  -->
            <template #item.type="{ item }">
                Putaway Request 
                <!-- <div v-if="item.type === 'Batch Exception'" class="py-2">
                    <span class="font-weight-bold">{{ item.type }}</span><br />
                    <span class="text-subtitle-1">
                        {{ item.application_requestable?.exception_type === 'within_age_requirement' ? 'Within Age Requirement' : 'Outside Age Requirement' }}
                    </span>
                </div>
                <div v-else class="py-2">
                    <span class="font-weight-bold">{{ item.type }}</span>
                </div> -->
            </template>

            <template #item.requested_by="{ item }">
                <span>{{ item.requested_by?.name }}</span><br />
            </template>

    
            <template #item.requested_at="{ item }">
                {{ item.requested_at ? Moment(item.requested_at).format('MMMM D, YYYY') : '' }}
            </template>

            <template #item.updated_at="{ item }">
                {{ item.updated_at ? Moment(item.updated_at).format('MMMM D, YYYY') : '' }}
            </template>

            <template #item.approved_by="{ item }">
                <template v-if="item.type === 'Batch Exception' || item.type === 'Putaway Exception'">
                    <div class="approved-by-cell mx-auto">
                        <span class="font-weight-bold d-block">{{ item.approver?.name }}</span>
                        <span v-if="item.approver_remarks" class="text-subtitle-1 approved-by-remarks d-block">{{ item.approver_remarks }}</span>
                    </div>
                </template>
            </template>

            <template #item.processed_at="{ item }">
                {{ item.processed_at ? Moment(item.processed_at).format('MM/DD/YY h:mm A') : '' }}
            </template>

            <!-- <template #item.status_id="{ item }">
                <v-chip v-if="item.status_id == 2" size="small" color="warning"
                    style="width: 100px; justify-content: center;" text-color="white">For Approval</v-chip>
                <v-chip v-else-if="item.status_id == 1" size="small" color="primary"
                    style="width: 100px; justify-content: center;" text-color="white">Approved</v-chip>
                <v-chip v-else-if="item.status_id == 3" size="small" color="error"
                    style="width: 100px; justify-content: center;" text-color="white">Rejected</v-chip>
                <v-chip v-else style="width: 100px; justify-content: center;" text-color="white" size="small" color="secondary">
                    Cancelled
                </v-chip>
            </template> -->

             <template #item.actions="{ item }">
                <v-btn v-if="item.status_id === 2 || item.status_id === '2'" icon="ri-file-check-line" size="30" @click="approveRequest(item)" color="primary"></v-btn>
            </template>

        </VDataTableServer>
    </VCard>

    <Toast :show="toast.show" :message="toast.message" />

    <v-dialog v-model="showCreateModal" max-width="700px">
        <v-sheet
            class="pa-8 text-center mx-auto"
            elevation="12"
            width="100%"
        >
           <v-form>
                <div>
                    <v-autocomplete
                        v-model="createForm.application_request_type"
                        label="Request Type"
                        density="compact"
                        :items="requestTypes"
                        item-title="title"
                        item-value="value"
                        clearable
                    />
                </div>

                <template v-if="isBatchException">
                    <div class="mt-4">
                        <v-autocomplete
                            v-model="createForm.delivery_document"
                            label="Delivery Document"
                            density="compact"
                            :items="deliveryOptions"
                            item-title="title"
                            item-value="value"
                            :loading="deliveryLoading"
                            :custom-filter="() => true"
                            :no-data-text="deliveryLoading ? 'Searching delivery documents...' : 'No delivery documents found'"
                            clearable
                            @update:search="handleDeliverySearchInput"
                        />
                    </div>

                    <!-- 2. NEW: Delivery Items Dropdown -->
                    <div class="mt-4">
                        <v-autocomplete
                            v-model="createForm.line_item"
                            label="Delivery Line Items"
                            density="compact"
                            :items="deliveryItems"
                            item-title="title"
                            item-value="value"
                            :disabled="!createForm.delivery_document"
                            :loading="itemsLoading"
                            :no-data-text="itemsLoading ? 'Loading line items...' : 'No items found'"
                            clearable
                        >
                            <template #item="{ props, item }">
                                <v-list-item v-bind="props">
                                    <template #title>
                                        <div class="font-weight-bold">
                                            {{ item.raw.item_number }} - {{ removeLeadingZeros(item.raw.material_number) }}
                                        </div>
                                    </template>
                                    <template #subtitle>
                                        <div class="text-wrap mt-0.5">
                                            {{ item.raw.material_description }}
                                        </div>
                                    </template>
                                </v-list-item>
                            </template>
                        </v-autocomplete>
                    </div>

                    <div class="mt-4">
                        <v-autocomplete
                            v-model="createForm.batches"
                            label="Batch"
                            density="compact"
                            :items="batchOptions"
                            item-title="title"
                            item-value="value"
                            :disabled="!createForm.delivery_document"
                            :messages="createForm.delivery_document && batchOptions.length === 0 ? 'No batch options available for the selected delivery document.' : ''"
                            chips
                            clearable
                            multiple
                        />
                    </div>

                    <div class="mt-4">
                        <v-radio-group
                            v-model="createForm.customer_age_requirement"
                            label="Customer age requirement"
                            inline
                        >
                            <v-radio
                                v-for="option in customerAgeRequirementOptions"
                                :key="option.value"
                                :label="option.label"
                                :value="option.value"
                            />
                        </v-radio-group>
                    </div>
                </template>

                <div class="mt-4">
                    <v-textarea
                        v-model="createForm.remarks"
                        label="Remarks (Optional)"
                        density="compact"
                        rows="2"
                        maxlength="500"
                        counter
                        clearable
                    />
                </div>

                <div class="d-flex justify-end align-center">
                    <v-btn color="secondary" variant="outlined" class="px-8 mr-3" @click="closeCreateModal">
                        Cancel
                    </v-btn>
                    <v-btn color="primary" class="px-8" :loading="createLoading" @click="createServiceRequest">
                        Proceed
                    </v-btn>
                </div>
            </v-form>
        </v-sheet>
    </v-dialog>

        <v-dialog v-model="showApproveModal" max-width="700px">
            <v-card>
            <v-card-title class="text-h6 font-weight-medium">{{approveItem?.type}} Request</v-card-title>
            <v-divider />
                <form @submit.prevent="submitProcessRequest">
                    <v-card-text class="py-6">

                    <v-text-field
                        label="Transaction Number"
                        density="compact"
                        :model-value="approveItem?.transaction_number ?? null"
                        readonly
                    />

                    <v-text-field
                        class="mt-4"
                        label="Application Request Type"
                        density="compact"
                        :model-value="approveItemTypeLabel"
                        readonly
                    />

                    <template v-if="approveItem?.type === 'Batch Exception'">

                        <v-text-field
                            v-if="approveItem?.type === 'Batch Exception' && approveItem?.application_requestable?.exception_type === 'outside_age_requirement'"
                            class="mt-4"
                            label="Batch Exception Type"
                            density="compact"
                            model-value="Outside customer age requirements"
                            readonly
                        />

                        <v-text-field
                            v-else-if="approveItem?.type === 'Batch Exception' && approveItem?.application_requestable?.exception_type === 'within_age_requirement'"
                            class="mt-4"
                            label="Batch Exception Type"
                            density="compact"
                            model-value="Within customer age requirements"
                            readonly
                        />

                        <v-text-field
                            class="mt-4"
                            label="Age Requirements"
                            density="compact"
                            :model-value="ageRequirementDisplay"
                            readonly
                        />

                        <v-text-field
                            class="mt-4"
                            label="Delivery Document"
                            density="compact"
                            :model-value="approveItem?.application_requestable?.delivery_document ?? null"
                            readonly
                        />

                        <v-text-field
                            class="mt-4"
                            label="Line Item"
                            density="compact"
                            :model-value="approveItem?.application_requestable?.line_item ?? null"
                            readonly
                        />

                        <div class="mt-4">
                            <div class="text-subtitle-1 font-weight-medium mb-2">Requested Batch(es)</div>
                            <div v-if="approveItem?.application_requestable?.batches?.length > 0" class="d-flex flex-wrap ga-2">
                                <v-chip
                                        v-for="batch in approveItem?.application_requestable?.batches"
                                        :key="batch"
                                        color="warning"
                                        variant="tonal"
                                >
                                        {{ batch }}
                                </v-chip>
                            </div>
                            <div v-else class="text-medium-emphasis">
                                    No batch list is available for this batch exception.
                            </div>
                        </div>

                        <div class="mt-4">
                            <div class="text-subtitle-1 font-weight-medium mb-2">Attached File</div>
                            <a v-if="approveItem?.application_requestable?.customer_approval_file_url" :href="approveItem?.application_requestable?.customer_approval_file_url" target="_blank">
                                {{ approveItem?.application_requestable?.original_filename || 'Open attachment' }}
                            </a>
                            <div v-else class="text-medium-emphasis">
                                No attachment available.
                            </div>
                        </div>
                    </template>

                    <template v-if="approveItem?.type === 'Putaway Exception'">
                        <v-text-field
                            class="mt-4"
                            label="Physical ID"
                            density="compact"
                            :model-value="approveItem?.application_requestable?.physical_id ?? null"
                            readonly
                        />
                        <v-text-field
                            class="mt-4"
                            label="Batch"
                            density="compact"
                            :model-value="approveItem?.application_requestable?.batch ?? null"
                            readonly
                        />
                        <v-text-field
                            class="mt-4"
                            label="Pallet Actual Status"
                            density="compact"
                            :model-value="approveItem?.application_requestable?.pallet_status ?? null"
                            readonly
                        />
                        <v-text-field
                            class="mt-4"
                            label="Reason for Putaway Exception"
                            density="compact"
                            :model-value="approveItem?.application_requestable?.reason ?? null"
                            readonly
                        />
                        <v-text-field
                            class="mt-4"
                            label="Requestor Remarks"
                            density="compact"
                            :model-value="approveItem?.application_requestable?.remarks ?? null"
                            readonly
                        />
                        <div class="mt-4">
                            <div class="text-subtitle-1 font-weight-medium mb-2">Attached File</div>
                            <a v-if="approveItem?.application_requestable?.pallet_image_url" :href="approveItem?.application_requestable?.pallet_image_url" target="_blank">
                                {{ approveItem?.application_requestable?.pallet_filename || 'Open attachment' }}
                            </a>
                            <div v-else class="text-medium-emphasis">
                                No attachment available.
                            </div>
                        </div>
                    </template>


                    <v-textarea
                        class="mt-4"
                        v-model="approveRemarks"
                        label="Remarks (Required if rejecting)"
                        density="compact"
                        rows="3"
                        :required="pendingRequestAction === 'reject'"
                        clearable
                    />
                    </v-card-text>
                    <v-divider />
                    <v-card-actions class="pa-4">
                        <v-spacer />
                        <v-btn variant="outlined" color="secondary" @click="closeApproveModal" type="button">Close</v-btn>
                        <v-btn variant="flat" color="error" class="px-6" type="submit" @click="pendingRequestAction = 'reject'">
                            Reject
                        </v-btn>
                        <v-btn variant="flat" color="primary" class="px-6" type="submit" formnovalidate @click="pendingRequestAction = 'approve'">
                            Approve
                        </v-btn>
                    </v-card-actions>
                </form>
          </v-card>
      </v-dialog>
    <Loader :show="pageLoading" />
</template>

<style scoped>
.approved-by-cell {
    width: 220px;
    min-width: 220px;
    max-width: 220px;
}

.approved-by-remarks {
    white-space: normal;
    overflow-wrap: anywhere;
    word-break: break-word;
}
</style>
