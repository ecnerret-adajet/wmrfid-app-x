<script setup>
import DatePicker from '@/components/DatePicker.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import { useAuthorization } from '@/composables/useAuthorization';
import ApiService from '@/services/ApiService';
import { fumigationItemStatusColor, fumigationItemStatusLabel, fumigationStatusColor, fumigationStatusLabel } from '@/utils/fumigation';
import CreateFumigationRequest from './components/CreateFumigationRequest.vue';
import SensitiveDeliveriesTable from './components/SensitiveDeliveriesTable.vue';
import { debounce } from 'lodash';
import Moment from 'moment';
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const serverItems = ref([]);
const plantsOption = ref([]);
const loading = ref(true);
const plantsLoaded = ref(false);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref('-created_at'); // Default sort
const filterModalVisible = ref(false)
const searchValue = ref('');
const filters = reactive({
    start_date: null,
    end_date: null,
    plant_code: null,
});

onMounted(() => loadPlants())

const loadPlants = async () => {
    try {
        const response = await ApiService.get('managed-plant-storage-locations')
        plantsOption.value = (response.data.plants ?? [])
            .filter(item => item.name !== null)
            .map(item => ({ value: item.plant_code, title: item.name }))
        plantsLoaded.value = true
        if (plantsOption.value.length > 0) {
            filters.plant_code = plantsOption.value[0].value
            // watcher on filters.plant_code will trigger loadItems
        } else {
            loadItems({ page: 1, itemsPerPage: itemsPerPage.value, sortBy: [] })
        }
    } catch (error) {
        console.error(error)
        plantsLoaded.value = true
        loadItems({ page: 1, itemsPerPage: itemsPerPage.value, sortBy: [] })
    }
}

watch(() => filters.plant_code, () => {
    page.value = 1
    loadItems({ page: 1, itemsPerPage: itemsPerPage.value, sortBy: [] })
})

const { authUserCan } = useAuthorization();

const headers = [
    { title: 'REQUEST NO.', key: 'request_no' },
    { title: 'SOURCE', key: 'requester_type', align: 'center', sortable: false },
    { title: 'DELIVERY DOCUMENT', key: 'delivery_document' },
    { title: 'PLANT', key: 'plant_code', align: 'center', sortable: false },
    { title: 'CHAMBER', key: 'chamber', sortable: false },
    { title: 'PALLETS', key: 'pallets', align: 'center', sortable: false },
    { title: 'Current Age', key: 'current_age', align: 'center', sortable: false },
    { title: 'FUMIGATION DATE', key: 'start_date' },
    { title: 'AERATION DATE', key: 'end_date', align: 'center' },
    { title: 'STATUS', key: 'status', align: 'center', sortable: false },
    { title: 'Fumigation Age', key: 'fumigation_age', align: 'center', sortable: false },
    { title: 'ACTION', key: 'action', align: 'center', sortable: false },
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
    if (!plantsLoaded.value) return
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
            const { table } = response.data;
            totalItems.value = table.total;
            serverItems.value = table.data;

            // Keep an open details modal in sync after an action
            if (detailsModal.value && selectedFumigationRequest.value) {
                selectedFumigationRequest.value = serverItems.value.find(item => item.id === selectedFumigationRequest.value.id) ?? selectedFumigationRequest.value;
            }

            loading.value = false
        })
        .catch((error) => {
            console.log(error);
        });
}

const reloadItems = () => loadItems({
    page: page.value,
    itemsPerPage: itemsPerPage.value,
    sortBy: [{ key: 'updated_at', order: 'desc' }],
    search: searchValue.value
});

const toast = reactive({
    message: '',
    color: 'error',
    show: false
});

const showToast = (message, color = 'success') => {
    toast.message = message;
    toast.color = color;
    toast.show = true;
}

const apiErrorMessage = (error, fallback) => error.response?.data?.error || error.response?.data?.message || fallback;

const activeItems = request => (request?.fumigation_items ?? []).filter(item => !['removed', 'cancelled'].includes(item.status));
const chamberLabel = request => request?.chamber_block
    ? `${request.chamber_block.lot?.label ?? '--'} - ${request.chamber_block.label}`
    : '—';

// Status-driven actions (Phase 2): edit/cancel/remove only before every pallet is in the chamber
const isForTransfer = request => request?.status === 'for_transfer';
const canEnd = request => ['fumigating', 'aeration'].includes(request?.status);
const canRemoveItem = (request, item) => isForTransfer(request) && item.status === 'for_transfer' && authUserCan('update.fumigation.requests');

// --- Create ---------------------------------------------------------------------
const showCreateFumigate = ref(false);
const prefillDelivery = ref(null);
const activeTab = ref('requests');
const sensitiveDeliveriesRef = ref(null);

const createFumigation = () => {
    prefillDelivery.value = null;
    showCreateFumigate.value = true;
}

// Pre-fill a c/o Sales request from the sensitive-DO worklist
const createFumigationFor = (delivery) => {
    prefillDelivery.value = delivery;
    showCreateFumigate.value = true;
}

// Nav "Create" (and the retired nomination URL) land here with ?create=1; wait for plants so the form has a default plant
watch(() => [route.query.create, plantsLoaded.value], ([create, loaded]) => {
    if (!create || !loaded) return;
    router.replace({ query: { ...route.query, create: undefined } });
    if (authUserCan('create.fumigation.requests')) createFumigation();
}, { immediate: true });

const onCreated = () => {
    showCreateFumigate.value = false;
    showToast('Fumigation request created successfully');
    activeTab.value = 'requests';
    reloadItems();
    sensitiveDeliveriesRef.value?.reload();
}

// --- Details --------------------------------------------------------------------
const detailsModal = ref(false);
const selectedFumigationRequest = ref(null)

const openDetailsModal = (item) => {
    selectedFumigationRequest.value = item;
    detailsModal.value = true;
}

// Material / batch / sloc are stored per item; a request can span several
const uniqueItemValues = (request, key) =>
    [...new Set((request?.fumigation_items ?? []).map(item => item[key]).filter(Boolean))].join(', ') || '—'
const requestMaterials = request => uniqueItemValues(request, 'material_description')
const requestBatches = request => uniqueItemValues(request, 'batch')
const requestSlocs = request => uniqueItemValues(request, 'sloc')

// New requests link TR/TO through the chamber movement; legacy ones through the item's TO
const itemTransferRequestNo = item => item.chamber_movement?.transfer_request?.transfer_request_id ?? item.transfer_order?.transfer_request?.transfer_request_id
const itemTransferOrderNo = item => item.chamber_movement?.transfer_order?.transfer_order_id ?? item.transfer_order?.transfer_order_id

// --- Edit -----------------------------------------------------------------------
const fumigateModal = ref(false);
const fumigateLoading = ref(false)
const editChamberBins = ref([]);
const fumigateForm = reactive({
    fumigation_date: null,
    aeration_date: null,
    ticket_range: null,
    chamber_block_id: null,
    remarks: null,
})

const editItem = async (item) => {
    if (!isForTransfer(item)) {
        showToast('Only requests that are still for transfer can be edited', 'error');
        return;
    }
    fumigateForm.fumigation_date = item.start_date ? new Date(item.start_date) : null;
    fumigateForm.aeration_date = item.end_date ? new Date(item.end_date) : null;
    fumigateForm.ticket_range = item.ticket_range;
    fumigateForm.chamber_block_id = item.chamber_block_id;
    fumigateForm.remarks = item.remarks;
    selectedFumigationRequest.value = item;
    fumigateModal.value = true;

    try {
        const response = await ApiService.get(`fumigations/chamber-bins/${item.plant_code}`);
        editChamberBins.value = (response.data ?? []).map(bin => ({ ...bin, title: `${bin.sloc} · ${bin.lot_label ?? '--'} - ${bin.label}` }));
    } catch {
        editChamberBins.value = [];
    }
}

const handleFumigate = async () => {
    if (!fumigateForm.fumigation_date || !fumigateForm.aeration_date || !fumigateForm.chamber_block_id) {
        showToast('Fumigation date, aeration date and chamber are required.', 'error');
        return;
    }

    if (Moment(fumigateForm.fumigation_date).isAfter(Moment(fumigateForm.aeration_date), 'day')) {
        showToast('Aeration date cannot be earlier than the fumigation date.', 'error');
        return;
    }

    fumigateLoading.value = true;
    try {
        await ApiService.post(`fumigations/update/${selectedFumigationRequest.value.id}`, {
            ...fumigateForm,
            fumigation_date: Moment(fumigateForm.fumigation_date).format('YYYY-MM-DD'),
            aeration_date: Moment(fumigateForm.aeration_date).format('YYYY-MM-DD'),
        })
        showToast('Fumigation request updated successfully');
        fumigateModal.value = false;
        reloadItems();
    } catch (error) {
        showToast(apiErrorMessage(error, 'Failed to update fumigation request'), 'error');
    } finally {
        fumigateLoading.value = false;
    }
}

// --- Confirmed actions: end / cancel / remove pallet ------------------------------
const confirmDialog = reactive({
    show: false,
    loading: false,
    title: '',
    message: '',
    note: '',
    confirmText: '',
    color: 'warning',
    action: null,
});

const openConfirm = (options) => Object.assign(confirmDialog, { show: true, loading: false, note: '', color: 'warning', ...options });

const runConfirmedAction = async () => {
    confirmDialog.loading = true;
    try {
        const message = await confirmDialog.action();
        showToast(message);
        confirmDialog.show = false;
        reloadItems();
    } catch (error) {
        showToast(apiErrorMessage(error, 'Action failed'), 'error');
    } finally {
        confirmDialog.loading = false;
    }
}

const openEndFumigationDialog = (item) => openConfirm({
    title: 'End Fumigation',
    message: `End the fumigation for ${item.request_no ?? item.delivery_document ?? '—'}?`,
    note: 'This marks the fumigation as completed and returns the pallets to GOOD. It cannot be undone.',
    confirmText: 'End Fumigation',
    action: async () => {
        await ApiService.post(`fumigations/end-fumigation/${item.id}`);
        return 'Fumigation ended successfully';
    },
});

const openCancelDialog = (item) => openConfirm({
    title: 'Cancel Fumigation Request',
    message: `Cancel ${item.request_no ?? 'this request'} (${activeItems(item).length} pallet(s))?`,
    note: 'Open chamber transfers are invalidated, pending bin-to-bin requests are rejected, and pallets go back to GOOD in their original bin. Any DO reservation is kept.',
    confirmText: 'Cancel Request',
    color: 'error',
    action: async () => {
        await ApiService.post(`fumigations/${item.id}/cancel`);
        return 'Fumigation request cancelled';
    },
});

const openRemoveItemDialog = (request, item) => openConfirm({
    title: 'Remove Pallet',
    message: `Remove pallet ${item.physical_id} from ${request.request_no ?? 'this request'}?`,
    note: 'Its chamber transfer is invalidated and the pallet goes back to GOOD in its original bin. If it is the last pallet, the request is cancelled.',
    confirmText: 'Remove Pallet',
    color: 'error',
    action: async () => {
        await ApiService.post(`fumigations/${request.id}/items/${item.id}/remove`);
        return `Pallet ${item.physical_id} removed`;
    },
});

</script>
<template>
    <div class="d-flex flex-wrap gap-4 align-center justify-center">
        <v-select
            label="Filter by Plant"
            density="compact"
            hide-details
            :items="plantsOption.length > 1 ? [{ title: 'All', value: null }, ...plantsOption] : plantsOption"
            v-model="filters.plant_code"
            style="min-width: 200px; max-width: 250px;"
        />
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
    <v-tabs v-model="activeTab" class="mt-4">
        <v-tab value="requests">Fumigation Requests</v-tab>
        <v-tab value="sensitive">Sensitive DOs Without Request</v-tab>
    </v-tabs>
    <v-card v-show="activeTab === 'sensitive'">
        <SensitiveDeliveriesTable ref="sensitiveDeliveriesRef" :plant-code="filters.plant_code" @create-request="createFumigationFor" />
    </v-card>
    <v-card v-show="activeTab === 'requests'">
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
            <template #item.request_no="{ item }">
                <span class="font-weight-medium">{{ item.request_no ?? '—' }}</span>
                <div v-if="item.ticket_range" class="text-caption text-medium-emphasis">Ticket {{ item.ticket_range }}</div>
            </template>

            <template #item.requester_type="{ item }">
                <v-chip v-if="item.requester_type" size="small" variant="tonal" :color="item.requester_type === 'alc' ? 'info' : 'primary'" class="text-uppercase font-weight-bold">
                    {{ item.requester_type === 'alc' ? 'c/o ALC' : 'c/o Sales' }}
                </v-chip>
                <span v-else class="text-medium-emphasis">—</span>
            </template>

            <template #item.delivery_document="{ item }">
                {{ item.delivery_document ?? '—' }}
                <div v-if="item.sold_to_name" class="text-caption text-medium-emphasis">{{ item.sold_to_name }}</div>
            </template>

            <template #item.chamber="{ item }">
                {{ chamberLabel(item) }}
            </template>

            <template #item.pallets="{ item }">
                {{ activeItems(item).length }}
            </template>

            <template #item.start_date="{ item }">
                <span v-if="item.start_date">{{ Moment(item.start_date).format('MMMM D, YYYY') }}</span>
            </template>

            <template #item.end_date="{ item }">
                <span v-if="item.end_date">{{ Moment(item.end_date).format('MMMM D, YYYY') }}</span>
            </template>

            <template #item.status="{ item }">
                <v-badge
                        :color="fumigationStatusColor(item.status)"
                        :content="fumigationStatusLabel(item.status)"
                        class="text-uppercase"
                        inline
                ></v-badge>
            </template>

             <template #item.action="{ item }">
                <div class="d-flex gap-1 justify-center align-center">
                    <IconBtn
                        size="small"
                        @click="openDetailsModal(item)"
                    >
                        <VIcon icon="ri-eye-line" />
                    </IconBtn>
                    <v-menu v-if="authUserCan('update.fumigation.requests') && (isForTransfer(item) || canEnd(item))" location="end">
                        <template v-slot:activator="{ props }">
                            <v-btn icon="ri-more-2-line" variant="text" v-bind="props" color="grey" size="small"></v-btn>
                        </template>
                        <v-list>
                            <v-list-item v-if="isForTransfer(item)" @click="editItem(item)">
                                <v-list-item-title>Edit</v-list-item-title>
                            </v-list-item>
                            <v-list-item v-if="isForTransfer(item)" @click="openCancelDialog(item)">
                                <v-list-item-title class="text-error">Cancel Request</v-list-item-title>
                            </v-list-item>
                            <v-list-item v-if="canEnd(item)" @click="openEndFumigationDialog(item)">
                                <v-list-item-title>End Fumigation</v-list-item-title>
                            </v-list-item>
                        </v-list>
                    </v-menu>
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
                                        <span class="font-weight-medium text-medium-emphasis">{{ requestMaterials(selectedFumigationRequest) }}</span>
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
                                        <span class="font-weight-medium text-medium-emphasis">{{ requestBatches(selectedFumigationRequest) }}</span>
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
                                        <span class="font-weight-medium text-medium-emphasis">{{ selectedFumigationRequest?.plant_code ?? '—' }}</span>
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
                                        <span class="font-weight-medium text-medium-emphasis">{{ requestSlocs(selectedFumigationRequest) }}</span>
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
                                v-model="fumigateForm.fumigation_date"
                                placeholder="Fumigation Date"
                            />
                        </v-col>
                        <v-col cols="12" md="6">
                            <DatePicker
                                v-model="fumigateForm.aeration_date"
                                :min-date="fumigateForm.fumigation_date"
                                placeholder="Aeration Date"
                            />
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-autocomplete
                                v-model="fumigateForm.chamber_block_id"
                                :items="editChamberBins"
                                item-title="title"
                                item-value="id"
                                label="Fumigation Chamber"
                                density="compact"
                                hint="Can only change until a pallet is scanned toward the chamber"
                                persistent-hint
                            />
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="fumigateForm.ticket_range"
                                label="Ticket Range"
                                density="compact"
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

    <v-dialog v-model="confirmDialog.show" max-width="500px">
        <v-card elevation="2">
            <v-card-title class="d-flex justify-space-between align-center px-6 pt-6 pb-2">
                <div class="d-flex align-center gap-2">
                    <i :class="['ri-error-warning-line', 'text-h4', `text-${confirmDialog.color}`]"></i>
                    <span class="text-h5 font-weight-bold">{{ confirmDialog.title }}</span>
                </div>
                <v-btn icon="ri-close-line" variant="text" @click="confirmDialog.show = false" />
            </v-card-title>
            <v-card-text class="px-6 pt-4">
                <p class="text-body-1">{{ confirmDialog.message }}</p>
                <p v-if="confirmDialog.note" class="text-body-2 text-medium-emphasis mt-2">{{ confirmDialog.note }}</p>
            </v-card-text>
            <v-divider />
            <v-card-actions class="justify-end px-6 py-3">
                <v-btn variant="outlined" @click="confirmDialog.show = false" class="mr-3">Close</v-btn>
                <PrimaryButton :color="confirmDialog.color" @click="runConfirmedAction" :loading="confirmDialog.loading">
                    {{ confirmDialog.confirmText }}
                </PrimaryButton>
            </v-card-actions>
        </v-card>
    </v-dialog>

    <Toast :show="toast.show" :color="toast.color" :message="toast.message" @update:show="toast.show = $event"/>

    <v-dialog v-model="detailsModal" max-width="1400px" scrollable>
        <v-card elevation="2">
            <v-card-title class="d-flex justify-space-between align-center px-6 pt-6 pb-2">
                <div class="d-flex align-center gap-2">
                    <i class="ri-file-list-3-line text-primary text-h4"></i>
                    <div>
                        <div class="text-h5 font-weight-bold text-primary">
                            {{ selectedFumigationRequest?.request_no ?? 'Fumigation Items' }}
                        </div>
                        <div class="text-caption text-medium-emphasis">
                            Delivery: <strong>{{ selectedFumigationRequest?.delivery_document ?? '—' }}</strong>
                            &nbsp;|&nbsp;
                            Plant: <strong>{{ selectedFumigationRequest?.plant_code ?? '—' }}</strong>
                            &nbsp;|&nbsp;
                            Chamber: <strong>{{ chamberLabel(selectedFumigationRequest) }}</strong>
                            <template v-if="selectedFumigationRequest?.ticket_range">
                                &nbsp;|&nbsp;
                                Ticket: <strong>{{ selectedFumigationRequest.ticket_range }}</strong>
                            </template>
                            &nbsp;|&nbsp;
                            Status:
                            <v-chip
                                :color="fumigationStatusColor(selectedFumigationRequest?.status)"
                                size="x-small"
                                variant="tonal"
                                class="text-uppercase font-weight-bold"
                            >{{ fumigationStatusLabel(selectedFumigationRequest?.status) }}</v-chip>
                        </div>
                    </div>
                </div>
                <v-btn icon="ri-close-line" variant="text" @click="detailsModal = false" />
            </v-card-title>

            <v-divider />

            <v-card-text class="pa-4">
                <div class="overflow-x-auto">
                    <v-table density="compact" class="border rounded fumigation-details-table">
                        <thead>
                            <tr>
                                <th class="text-no-wrap">Physical ID</th>
                                <th class="text-no-wrap">Batch</th>
                                <th class="text-no-wrap">Origin Bin</th>
                                <th class="text-center text-no-wrap">Delivery Item</th>
                                <th>Material</th>
                                <th class="text-center text-no-wrap">Reserved Qty</th>
                                <th class="text-no-wrap">Transfer Request</th>
                                <th class="text-no-wrap">Transfer Order</th>
                                <th class="text-center text-no-wrap">Stage</th>
                                <th class="text-center text-no-wrap">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="fumigation_item in selectedFumigationRequest?.fumigation_items ?? []"
                                :key="fumigation_item.id"
                                :class="{ 'text-disabled': ['removed', 'cancelled'].includes(fumigation_item.status) }"
                            >
                                <td class="text-no-wrap font-weight-medium">{{ fumigation_item.physical_id }}</td>
                                <td class="text-no-wrap">{{ fumigation_item.batch ?? '—' }}</td>
                                <td class="text-no-wrap">
                                    <span v-if="fumigation_item.block?.lot?.label || fumigation_item.block?.label">
                                        {{ fumigation_item.block?.lot?.label ?? '—' }} &mdash; {{ fumigation_item.block?.label ?? '—' }}
                                    </span>
                                    <span v-else class="text-medium-emphasis">—</span>
                                </td>
                                <td class="text-center text-no-wrap">{{ fumigation_item.delivery_item_number ?? '—' }}</td>
                                <td style="min-width: 200px;">
                                    <span class="font-weight-bold d-block">{{ fumigation_item.material_description ?? '—' }}</span>
                                    <span class="text-caption text-medium-emphasis">{{ fumigation_item.material_code }}</span>
                                </td>
                                <td class="text-center text-no-wrap">
                                    <v-chip
                                        v-if="fumigation_item.reserved_quantity != null"
                                        color="primary"
                                        variant="tonal"
                                        size="small"
                                        class="font-weight-bold"
                                    >
                                        {{ fumigation_item.reserved_quantity }} {{ fumigation_item.uom }}
                                    </v-chip>
                                    <span v-else class="text-medium-emphasis">—</span>
                                </td>
                                <td class="text-no-wrap">
                                    <v-chip v-if="itemTransferRequestNo(fumigation_item)" color="secondary" variant="tonal" size="small">
                                        {{ itemTransferRequestNo(fumigation_item) }}
                                    </v-chip>
                                    <span v-else class="text-medium-emphasis">—</span>
                                </td>
                                <td class="text-no-wrap">
                                    <v-chip v-if="itemTransferOrderNo(fumigation_item)" color="secondary" variant="tonal" size="small">
                                        {{ itemTransferOrderNo(fumigation_item) }}
                                    </v-chip>
                                    <span v-else class="text-medium-emphasis">—</span>
                                </td>
                                <td class="text-center text-no-wrap">
                                    <v-chip
                                        :color="fumigationItemStatusColor(fumigation_item.status)"
                                        size="small"
                                        variant="tonal"
                                        class="text-uppercase font-weight-bold"
                                    >{{ fumigationItemStatusLabel(fumigation_item.status) }}</v-chip>
                                </td>
                                <td class="text-center">
                                    <IconBtn
                                        v-if="canRemoveItem(selectedFumigationRequest, fumigation_item)"
                                        size="small"
                                        color="error"
                                        @click="openRemoveItemDialog(selectedFumigationRequest, fumigation_item)"
                                    >
                                        <VIcon icon="ri-delete-bin-line" />
                                        <VTooltip activator="parent" location="top">Remove from request</VTooltip>
                                    </IconBtn>
                                </td>
                            </tr>
                            <tr v-if="!(selectedFumigationRequest?.fumigation_items?.length > 0)">
                                <td colspan="10" class="text-center text-medium-emphasis py-6">No fumigation items found.</td>
                            </tr>
                        </tbody>
                    </v-table>
                </div>
                <div class="text-caption text-medium-emphasis mt-2 text-right">
                    {{ activeItems(selectedFumigationRequest).length }} active of {{ selectedFumigationRequest?.fumigation_items?.length ?? 0 }} item(s)
                </div>
            </v-card-text>

            <v-divider />

            <v-card-actions class="justify-end px-6 py-3">
                <v-btn variant="outlined" @click="detailsModal = false">Close</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>

    <CreateFumigationRequest
        :show="showCreateFumigate"
        :plants-option="plantsOption"
        :prefill-delivery="prefillDelivery"
        @close="showCreateFumigate = false"
        @created="onCreated"
    />

</template>

<style scoped>
.fumigation-details-table :deep(th) {
    white-space: nowrap;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    background-color: rgba(var(--v-theme-on-surface), 0.04);
}

.fumigation-details-table :deep(td) {
    vertical-align: middle;
    padding-block: 8px;
}
</style>
