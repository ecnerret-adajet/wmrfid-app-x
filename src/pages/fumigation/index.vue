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
const plantsLoaded = ref(false);
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

const rfidFilters = reactive({
    start_date: null,
    end_date: null,
    material_id: null,
    plant_code: null,
    sloc: null,
    under_fumigation: false
});

const { authUserCan } = useAuthorization();

const headers = [
    {
        title: 'DELIVERY DOCUMENT',
        key: 'delivery_document',
    },
    // {
    //     title: 'BATCH',
    //     key: 'batch',
    // },
    // {
    //     title: 'RFID COUNT',
    //     key: 'inventory_count',
    //     align: 'center',
    //     sortable: false,
    // },
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
    { title: 'PALLET ID', key: 'physical_id' },
    { title: 'QUANTITY', key: 'quantity', align: 'center', sortable: false },
    { title: 'BATCH', key: 'batch' },
    { title: 'MATERIAL', key: 'material', sortable: false },
    { title: 'BIN LOCATION', key: 'bin_location', sortable: false },
    { title: 'LAYER', key: 'position_in_block', align: 'center', sortable: false },
    { title: 'STATUS', key: 'commodity_status', align: 'center', sortable: false },
    { title: 'RESERVED QTY', key: '_assigned_quantity', align: 'center', sortable: false },
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
           
            const { table, materials } = response.data;
            totalItems.value = table.total;
            serverItems.value = table.data;

            materialsOption.value = materials.map(item => ({
                value: item.id,
                title: `${item.plant_code} - ${item.code} - ${item.description}`,
                plant_code: item.plant_code,
                default_pallet_quantity: item.default_pallet_quantity
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
    delivery_order_no: null,
    plant_code: null,
    items: [],
})

const fumigateModal = ref(false);
const detailsModal = ref(false);
const selectedFumigationRequest = ref(null)

const openDetailsModal = (item) => {
    selectedFumigationRequest.value = item;
    detailsModal.value = true;
}
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

    createFumigateForm.plant_code = filters.plant_code

    // Build items: each assigned RFID enriched with item_number from its delivery line item
    createFumigateForm.items = selectedDeliveryItems.value
        .filter(lineItem => assignedRfidsByLineItem.value[lineItem.id]?.items.length > 0)
        .flatMap(lineItem =>
            assignedRfidsByLineItem.value[lineItem.id].items.map(item => ({
                ...item,
                item_number: lineItem.item_number,
                assigned_quantity: item.assigned_quantity,
                _assigned_quantity: item.assigned_quantity,
            }))
        )

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

    if (createFumigateForm.items.length === 0) {
        errorMessage.value = 'Please assign at least one RFID item to a delivery line item.';
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
    showCreateFumigate.value = true;
    fetchDeliveryOrders();
}

const clearFumigateForm = () => {
    createFumigateForm.remarks = null;
    createFumigateForm.startDate = null;
    createFumigateForm.endDate = null;
    createFumigateForm.delivery_order_no = null;
    createFumigateForm.plant_code = null;
    createFumigateForm.items = [];
    deliveryOrderSearch.value = '';
    selectedDeliveryLineItem.value = null;
    assignedRfidsByLineItem.value = {};
}

const deliveryOrderSearch = ref('');
const deliveryOrderItems = ref([]);
const deliveryOrderLoading = ref(false);

const fetchDeliveryOrders = async (search = '') => {
    deliveryOrderLoading.value = true;
    try {
        const response = await ApiService.query('fumigations/open-delivery-orders', {
            params: {
                plant_code: filters.plant_code,
                search,
            },
        });
        deliveryOrderItems.value = response.data ?? [];
    } catch {
        deliveryOrderItems.value = [];
    } finally {
        deliveryOrderLoading.value = false;
    }
};

let deliverySearchTimer = null;
watch(deliveryOrderSearch, (val) => {
    clearTimeout(deliverySearchTimer);
    deliverySearchTimer = setTimeout(() => fetchDeliveryOrders(val), 350);
});

const selectedDelivery = computed(() =>
    deliveryOrderItems.value.find(d => d.delivery_document === createFumigateForm.delivery_order_no) ?? null
);

const selectedDeliveryItems = computed(() => selectedDelivery.value?.delivery_items ?? []);

const selectedDeliveryLineItem = ref(null);

// keyed by delivery line item id → { items: [{...rfid, assigned_quantity}], totalAssigned }
const assignedRfidsByLineItem = ref({})
const assignedItemsModal = ref(false)
const assignedItemsModalTarget = ref(null)

watch(() => createFumigateForm.delivery_order_no, () => {
    selectedDeliveryLineItem.value = null;
    assignedRfidsByLineItem.value = {};
    selectedItems.value = [];
});

const toggleDeliveryLineItem = (item) => {
    selectedDeliveryLineItem.value = selectedDeliveryLineItem.value?.id === item.id ? null : item;
};

const isDeliveryLineItemSelected = (item) =>
    selectedDeliveryLineItem.value?.id === item.id;

const loadRfid = ({ page, itemsPerPage, sortBy, search }) => {
    if (!selectedDeliveryLineItem.value) {
        rfidServerItems.value = [];
        rfidTotalItems.value = 0;
        return;
    }
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

    // ApiService.query('fumigations/datatable/rfid',{
    //     params: {
    //         page,
    //         itemsPerPage,
    //         sort: rfidSortQuery.value,
    //         search: rfidSearchValue.value,
    //         filters: rfidFilters
    //     }
    //     })
    //     .then((response) => {
    //         rfidTotalItems.value = response.data.total;
    //         rfidServerItems.value = response.data.data
    //         rfidLoading.value = false
    //     })
    //     .catch((error) => {
    //         console.log(error);
    //     });

    ApiService.query('inventories/fetch-inventories', {
        params: {
            page,
            itemsPerPage,
            sort: rfidSortQuery.value,
            search: rfidSearchValue.value,
            plant_code: filters.plant_code,
            sloc: rfidFilters.sloc,
            commodity_status_id: 1,
            material_code: selectedDeliveryLineItem.value?.material_number,
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

    rfidFilters.sloc = null;
    storageLocation.value = null;

    if (!newVal) {
        rfidFilters.material_id = null;
        slocOptions.value = [];
        onFilterChange();
        return;
    }

    const currentMaterial = materialsOption.value.find(
        m => String(m.value) === String(rfidFilters.material_id)
    );

    if (!currentMaterial || String(currentMaterial.plant_code) !== String(newVal)) {
        rfidFilters.material_id = null;
    }

    fetchSlocOptions(newVal);
    onFilterChange();
});

watch(selectedDeliveryLineItem, (newVal) => {
    page.value = 1;
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

// TODO (backend): Allow create when at least one line item is satisfied.
// Future: enforce all delivery line items must be satisfied before submitting.
const hasAnySatisfiedLineItem = computed(() => {
    return selectedDeliveryItems.value.some(lineItem => {
        const assignment = assignedRfidsByLineItem.value[lineItem.id]
        return assignment && assignment.totalAssigned >= lineItem.delivery_quantity
    })
})

// RFIDs whose full quantity has been consumed by an assignment — not selectable in the table
const fullyConsumedRfidIds = computed(() => {
    const consumed = new Set()
    for (const assignment of Object.values(assignedRfidsByLineItem.value)) {
        for (const item of assignment.items) {
            if (item.assigned_quantity >= item.quantity) consumed.add(item.id)
        }
    }
    return consumed
})

// Injects _selectable and _assigned_quantity for display and selectability control
const rfidServerItemsWithSelectability = computed(() =>
    rfidServerItems.value.map(item => {
        let assignedQty = null
        for (const assignment of Object.values(assignedRfidsByLineItem.value)) {
            const found = assignment.items.find(i => i.id === item.id)
            if (found) { assignedQty = found.assigned_quantity; break }
        }
        return {
            ...item,
            _selectable: !fullyConsumedRfidIds.value.has(item.id),
            _assigned_quantity: assignedQty,
        }
    })
)

const storageLocation = ref(null);
const slocOptions = ref([]);
const slocLoading = ref(false);

const fetchSlocOptions = async (plant_code) => {
    if (!plant_code) {
        slocOptions.value = [];
        return;
    }
    slocLoading.value = true;
    try {
        const response = await ApiService.query('warehouse/storage-locations', {
            params: { plant_code },
        });
        slocOptions.value = (response.data ?? []).map(s => ({
            value: s.code,
            title: `${s.code} - ${s.name}`,
        }));
    } catch {
        slocOptions.value = [];
    } finally {
        slocLoading.value = false;
    }
};

const fetchStorageLocationDetails = async () => {
    if (!rfidFilters.plant_code || !rfidFilters.sloc) {
        storageLocation.value = null;
        return;
    }
    try {
        const response = await ApiService.get(`warehouse/storage-location/${rfidFilters.plant_code}/${rfidFilters.sloc}`);
        storageLocation.value = response.data.storage_location;
    } catch {
        storageLocation.value = null;
    }
};

watch(() => rfidFilters.sloc, (newVal) => {
    if (newVal) {
        fetchStorageLocationDetails();
    } else {
        storageLocation.value = null;
    }
    onFilterChange();
});

// TODO: Add under_fumigation and is_reserved RFID eligibility filtering once backend support is confirmed.
// under_fumigation=0 → available; under_fumigation=1 → skip. is_reserved=true → include.
const handleAssign = () => {
    if (!selectedDeliveryLineItem.value) {
        errorMessage.value = 'Please select a delivery line item first.'
        return
    }
    if (selectedItems.value.length === 0) {
        errorMessage.value = 'Please select at least one RFID entry to assign.'
        return
    }

    const lineItemId = selectedDeliveryLineItem.value.id
    const deliveryQty = selectedDeliveryLineItem.value.delivery_quantity

    if (!assignedRfidsByLineItem.value[lineItemId]) {
        assignedRfidsByLineItem.value[lineItemId] = { items: [], totalAssigned: 0 }
    }

    const assignment = assignedRfidsByLineItem.value[lineItemId]
    let remaining = deliveryQty - assignment.totalAssigned

    if (remaining <= 0) {
        errorMessage.value = `Delivery quantity of ${deliveryQty} is already satisfied for this line item.`
        return
    }

    for (const rfid of selectedItems.value) {
        if (remaining <= 0) break
        if (assignment.items.find(i => i.id === rfid.id)) continue // deduplicate
        const take = Math.min(rfid.quantity, remaining)
        assignment.items.push({ ...rfid, assigned_quantity: take })
        assignment.totalAssigned += take
        remaining -= take
    }

    selectedItems.value = []
    errorMessage.value = null
}

const openAssignedModal = (lineItem) => {
    assignedItemsModalTarget.value = lineItem
    assignedItemsModal.value = true
}

const removeAssignedRfid = (lineItemId, rfidId) => {
    const assignment = assignedRfidsByLineItem.value[lineItemId]
    if (!assignment) return
    const idx = assignment.items.findIndex(i => i.id === rfidId)
    if (idx !== -1) {
        assignment.totalAssigned -= assignment.items[idx].assigned_quantity
        assignment.items.splice(idx, 1)
    }
}

const cancelCreateFumigation = () => {
    showCreateFumigate.value = false;
    clearFumigateForm();
    selectedItems.value = [];
    errorMessage.value = null;
}

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
            <!-- <template #item.material_id="{ item }">
                {{ item.material?.description }}
            </template>

            <template #item.batch="{ item }">
                {{ item.batch }}
            </template> -->

            <!-- <template #item.inventory_count="{ item }">
                {{ item.inventories?.length }}
            </template> -->

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
                    <IconBtn
                        size="small"
                        @click="openDetailsModal(item)"
                    >
                        <VIcon icon="ri-eye-line" />
                    </IconBtn>
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

    <v-dialog v-model="detailsModal" max-width="1400px" scrollable>
        <v-card elevation="2">
            <v-card-title class="d-flex justify-space-between align-center px-6 pt-6 pb-2">
                <div class="d-flex align-center gap-2">
                    <i class="ri-file-list-3-line text-primary text-h4"></i>
                    <div>
                        <div class="text-h5 font-weight-bold text-primary">Fumigation Items</div>
                        <div class="text-caption text-medium-emphasis">
                            Delivery: <strong>{{ selectedFumigationRequest?.delivery_document ?? '—' }}</strong>
                            &nbsp;|&nbsp;
                            Plant: <strong>{{ selectedFumigationRequest?.plant_code ?? '—' }}</strong>
                            &nbsp;|&nbsp;
                            Status:
                            <v-chip
                                :color="selectedFumigationRequest?.status === 'completed' ? 'success' : selectedFumigationRequest?.status === 'in progress' ? 'warning' : 'info'"
                                size="x-small"
                                variant="tonal"
                                class="text-uppercase font-weight-bold"
                            >{{ selectedFumigationRequest?.status }}</v-chip>
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
                                <th class="text-no-wrap">Bin Location</th>
                                <th class="text-no-wrap">Delivery No.</th>
                                <th class="text-center text-no-wrap">Delivery Item</th>
                                <th>Material</th>
                                <th class="text-center text-no-wrap">Reserved Qty</th>
                                <th class="text-no-wrap">Transfer Request</th>
                                <th class="text-no-wrap">Transfer Order</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="fumigation_item in selectedFumigationRequest?.fumigation_items ?? []"
                                :key="fumigation_item.id"
                            >
                                <td class="text-no-wrap font-weight-medium">{{ fumigation_item.physical_id }}</td>
                                <td class="text-no-wrap">{{ fumigation_item.batch ?? '—' }}</td>
                                <td class="text-no-wrap">
                                    <span v-if="fumigation_item.block?.lot?.label || fumigation_item.block?.label">
                                        {{ fumigation_item.block?.lot?.label ?? '—' }} &mdash; {{ fumigation_item.block?.label ?? '—' }}
                                    </span>
                                    <span v-else class="text-medium-emphasis">—</span>
                                </td>
                                <td class="text-no-wrap">{{ fumigation_item.delivery_document ?? '—' }}</td>
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
                                    <v-chip
                                        v-if="fumigation_item.transfer_order?.transfer_request?.transfer_request_id"
                                        color="secondary"
                                        variant="tonal"
                                        size="small"
                                    >
                                        {{ fumigation_item.transfer_order.transfer_request.transfer_request_id }}
                                    </v-chip>
                                    <span v-else class="text-medium-emphasis">—</span>
                                </td>
                                <td class="text-no-wrap">
                                    <v-chip
                                        v-if="fumigation_item.transfer_order?.transfer_order_id"
                                        color="secondary"
                                        variant="tonal"
                                        size="small"
                                    >
                                        {{ fumigation_item.transfer_order.transfer_order_id }}
                                    </v-chip>
                                    <span v-else class="text-medium-emphasis">—</span>
                                </td>
                            </tr>
                            <tr v-if="!(selectedFumigationRequest?.fumigation_items?.length > 0)">
                                <td colspan="9" class="text-center text-medium-emphasis py-6">No fumigation items found.</td>
                            </tr>
                        </tbody>
                    </v-table>
                </div>
                <div class="text-caption text-medium-emphasis mt-2 text-right">
                    {{ selectedFumigationRequest?.fumigation_items?.length ?? 0 }} item(s)
                </div>
            </v-card-text>

            <v-divider />

            <v-card-actions class="justify-end px-6 py-3">
                <v-btn variant="outlined" @click="detailsModal = false">Close</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>

    <EditingModal @close="showCreateFumigate = false" max-width="1500px" :show="showCreateFumigate"
        :dialog-title="`Fumigation Request`">
        <template #default>
            <div v-if="storageLocation" class="mb-4 pa-3 rounded border">
                <h4 class="text-h6 font-weight-bold mb-1">
                    Plant: <span class="text-primary">{{ storageLocation?.plant?.plant_code }} - {{ storageLocation?.plant?.name }}</span>
                </h4>
                <h4 class="text-h6 font-weight-bold">
                    Storage Location: <span class="text-primary">{{ storageLocation?.code }} - {{ storageLocation?.name }}</span>
                </h4>
            </div>
            <v-form @submit.prevent="handleFumigate">
                <v-row>
                    <v-col cols="12" md="6">
                        <DatePicker v-model="createFumigateForm.startDate" placeholder="Select Start Date" />
                    </v-col>
                    <v-col cols="12" md="6">
                        <DatePicker v-model="createFumigateForm.endDate" placeholder="Select End Date" />
                    </v-col>
                </v-row>
                <VAutocomplete
                    v-model="createFumigateForm.delivery_order_no"
                    v-model:search="deliveryOrderSearch"
                    :items="deliveryOrderItems"
                    :loading="deliveryOrderLoading"
                    item-title="delivery_document"
                    item-value="delivery_document"
                    label="Delivery Order No."
                    placeholder="Type to search delivery order..."
                    variant="outlined"
                    density="compact"
                    clearable
                    clear-icon="ri-close-line"
                    no-filter
                    class="mt-4"
                >
                    <template #item="{ item, props: itemProps }">
                        <v-list-item v-bind="itemProps" />
                    </template>
                    <template #no-data>
                        <v-list-item>
                            <v-list-item-title class="text-medium-emphasis">
                                {{ deliveryOrderLoading ? 'Searching...' : 'No delivery orders found' }}
                            </v-list-item-title>
                        </v-list-item>
                    </template>
                </VAutocomplete>
                <v-card v-if="selectedDelivery" variant="tonal" color="primary" rounded="lg" class="mt-3 mb-2 pa-3">
                    <VRow dense>
                        <VCol cols="12" md="4">
                            <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis">Ship To</div>
                            <div class="font-weight-bold">{{ selectedDelivery.ship_to_name }}</div>
                            <div class="text-caption text-medium-emphasis">{{ selectedDelivery.ship_to_customer }}</div>
                        </VCol>
                        <VCol cols="12" md="4">
                            <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis">Ship To Address</div>
                            <div class="font-weight-bold">{{ selectedDelivery.ship_to_address }}</div>
                        </VCol>
                        <VCol cols="12" md="4">
                            <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis">Sold To</div>
                            <div class="font-weight-bold">{{ selectedDelivery.sold_to_name }}</div>
                            <div class="text-caption text-medium-emphasis">{{ selectedDelivery.sold_to_customer }}</div>
                        </VCol>
                    </VRow>
                </v-card>
                <v-table
                    v-if="selectedDeliveryItems.length > 0"
                    density="compact"
                    class="mt-2 mb-2 border rounded"
                >
                    <thead>
                        <tr>
                            <th style="width: 48px;"></th>
                            <th>Material</th>
                            <th class="text-center">Quantity</th>
                            <th>Plant Code</th>
                            <th>Storage Location</th>
                            <th class="text-center">Assigned</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="item in selectedDeliveryItems"
                            :key="item.id"
                            style="cursor: pointer;"
                            @click="toggleDeliveryLineItem(item)"
                        >
                            <td @click.stop>
                                <v-checkbox
                                    :model-value="isDeliveryLineItemSelected(item)"
                                    density="compact"
                                    hide-details
                                    @update:model-value="toggleDeliveryLineItem(item)"
                                />
                            </td>
                            <td>
                                <span class="font-weight-bold">{{ item.material_description }}</span><br />
                                <span class="text-caption text-medium-emphasis">{{ item.material_number }}</span>
                            </td>
                            <td class="text-center">
                                {{ item.delivery_quantity }}<br />
                                <span class="text-caption text-medium-emphasis">{{ item.sales_unit }}</span>
                            </td>
                            <td>{{ item.plant }}</td>
                            <td>{{ item.storage_location }}</td>
                            <td class="text-center" @click.stop>
                                <v-btn
                                    v-if="assignedRfidsByLineItem[item.id]?.items.length > 0"
                                    size="small"
                                    variant="tonal"
                                    color="primary"
                                    @click="openAssignedModal(item)"
                                >
                                    {{ assignedRfidsByLineItem[item.id]?.items.length }} pallets / {{ assignedRfidsByLineItem[item.id]?.totalAssigned }} units
                                </v-btn>
                                <span v-else class="text-medium-emphasis">—</span>
                            </td>
                        </tr>
                    </tbody>
                </v-table>
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
                <div class="d-flex align-center" style="min-width: 260px;">
                    <v-autocomplete
                        label="Select Storage Location"
                        density="compact"
                        item-title="title"
                        item-value="value"
                        :items="slocOptions"
                        :loading="slocLoading"
                        :disabled="!rfidFilters.plant_code"
                        v-model="rfidFilters.sloc"
                    />
                </div>
                <div class="d-flex align-center" style="min-width: 330px;">
                    <v-autocomplete label="Select Material" density="compact" @update:modelValue="onFilterChange" item-title="title" item-value="value"
                        :items="filteredMaterialsOption" v-model="rfidFilters.material_id" />
                </div>
            </div>

            <VAlert
                v-if="!selectedDeliveryLineItem"
                color="info"
                variant="tonal"
                class="mb-3"
                density="compact"
                icon="ri-information-line"
            >
                Please select at least one delivery line item above to proceed with pallet selection.
            </VAlert>

            <div class="mb-2" v-if="selectedItems.length > 0">
                <span class="text-h6 font-weight-medium text-high-emphasis">
                    Selected items count: ({{ selectedItems.length }})
                </span>
            </div>

            <VDataTableServer v-model:items-per-page="rfidItemsPerPage" v-model="selectedItems"
                            :headers="rfidHeaders" :items="rfidServerItemsWithSelectability" :items-length="rfidTotalItems" :loading="rfidLoading"
                            item-value="id" item-selectable="_selectable" :search="rfidSearchValue" @update:options="loadRfid" show-select return-object
                            :class="['text-no-wrap', { 'rfid-select-disabled': !selectedDeliveryLineItem }]">
                <template #item.physical_id="{ item }">
                    {{ item.physical_id }}
                </template>
                <template #item.batch="{ item }">
                    {{ item.batch }}
                </template>
                <template #item.material="{ item }">
                    <span class="font-weight-bold">{{ item.material?.description }}</span><br />
                    <span class="text-subtitle-1 text-medium-emphasis">{{ item.material?.bu_material }}</span>
                </template>
                <template #item.bin_location="{ item }">
                    {{ item.block?.lot?.label ?? '--' }} - {{ item.block?.label ?? '--' }}
                </template>
                <template #item.position_in_block="{ item }">
                    Layer {{ item.position_in_block ?? '--' }}
                </template>
                <template #item.commodity_status="{ item }">
                    <v-chip
                        v-if="item.commodity_status?.name"
                        color="success"
                        variant="tonal"
                        size="small"
                        class="text-uppercase font-weight-bold"
                    >
                        {{ item.commodity_status.name }}
                    </v-chip>
                    <span v-else>--</span>
                </template>
                <template #item._assigned_quantity="{ item }">
                    <v-chip
                        v-if="item._assigned_quantity !== null"
                        color="warning"
                        variant="tonal"
                        size="small"
                        class="font-weight-bold"
                    >
                        {{ item._assigned_quantity }}
                    </v-chip>
                    <span v-else class="text-medium-emphasis">—</span>
                </template>

            </VDataTableServer>

            <div class="d-flex justify-end align-center mt-4">
                <v-btn color="secondary" variant="outlined" @click="cancelCreateFumigation" class="px-12 mr-3">Cancel</v-btn>
                <v-btn
                    color="warning"
                    variant="tonal"
                    class="px-12 mr-3"
                    :disabled="!selectedDeliveryLineItem || selectedItems.length === 0"
                    @click="handleAssign"
                >
                    Assign
                </v-btn>
                <PrimaryButton
                    v-if="hasAnySatisfiedLineItem"
                    @click="handleCreateFumigate"
                    color="primary"
                    class="px-12"
                    :loading="fumigateLoading"
                >
                    Create
                </PrimaryButton>
            </div>
        </template>
    </EditingModal>

    <v-dialog v-model="assignedItemsModal" max-width="800px">
        <v-card elevation="2">
            <v-card-title class="d-flex justify-space-between align-center mx-4 px-4 mt-6">
                <div>
                    <div class="text-h5 font-semibold text-primary">Assigned RFIDs</div>
                    <div class="text-body-2 text-medium-emphasis mt-1">
                        {{ assignedItemsModalTarget?.material_description }}
                        &mdash;
                        <strong>{{ assignedRfidsByLineItem[assignedItemsModalTarget?.id]?.totalAssigned ?? 0 }}</strong>
                        / {{ assignedItemsModalTarget?.delivery_quantity }} {{ assignedItemsModalTarget?.sales_unit }} assigned
                    </div>
                </div>
                <v-btn icon="ri-close-line" variant="text" @click="assignedItemsModal = false" />
            </v-card-title>
            <v-card-text>
                <v-table density="compact" class="border rounded mt-2">
                    <thead>
                        <tr>
                            <th>Pallet ID</th>
                            <th>Batch</th>
                            <th>Material</th>
                            <th class="text-center">Assigned Qty</th>
                            <th class="text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="rfid in assignedRfidsByLineItem[assignedItemsModalTarget?.id]?.items ?? []"
                            :key="rfid.id"
                        >
                            <td>{{ rfid.physical_id }}</td>
                            <td>{{ rfid.batch }}</td>
                            <td>
                                <span class="font-weight-bold">{{ rfid.material?.description }}</span><br />
                                <span class="text-caption text-medium-emphasis">{{ rfid.material?.bu_material }}</span>
                            </td>
                            <td class="text-center">{{ rfid.assigned_quantity }}</td>
                            <td class="text-center">
                                <IconBtn
                                    size="small"
                                    color="error"
                                    @click="removeAssignedRfid(assignedItemsModalTarget.id, rfid.id)"
                                >
                                    <VIcon icon="ri-delete-bin-line" />
                                </IconBtn>
                            </td>
                        </tr>
                        <tr v-if="!(assignedRfidsByLineItem[assignedItemsModalTarget?.id]?.items?.length > 0)">
                            <td colspan="5" class="text-center text-medium-emphasis py-4">No RFIDs assigned yet.</td>
                        </tr>
                    </tbody>
                </v-table>
            </v-card-text>
            <v-card-actions class="justify-end px-6 pb-4">
                <v-btn variant="outlined" @click="assignedItemsModal = false">Close</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>

</template>

<style scoped>
.rfid-select-disabled :deep(.v-selection-control) {
    pointer-events: none;
    opacity: 0.38;
}

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
