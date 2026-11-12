<script setup>
import Loader from '@/components/Loader.vue';
import Toast from '@/components/Toast.vue';
import { useAuthorization } from '@/composables/useAuthorization';
import ApiService from '@/services/ApiService';
import { useAuthStore } from '@/stores/auth';
import { useStoBatchPickingStore } from '@/stores/stoBatchPickingStore';
import moment from 'moment';
import Swal from 'sweetalert2';
import { computed, defineEmits, defineExpose, defineProps, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { VDataTableServer } from 'vuetify/components';

const stoBatchPickingStore = useStoBatchPickingStore();
const emits = defineEmits(['pagination-changed']);
const { authUserCan } = useAuthorization();
const authStore = useAuthStore();

const props = defineProps({
    search: {
        type: String,
        default: ''
    },
    initialFilters: {
        type: Object,
        default: () => ({})
    },
});

const router = useRouter();

const saveLoading = ref(false)
const isLoading = ref(false);
const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(50);
const page = ref(1);
const sortQuery = ref('-created_at'); // Default sort
const filters = ref({ ...props.initialFilters });
const stoData = ref([]);
const assignTruckscaleDialog = ref(false);
const assignPalletsDialog = ref(false);
const palletAssignmentTruckscale = ref(null);
const reservedPalletsTruckscale = ref(null);
const selectedLineItemId = ref(null);
const selectedPalletIds = ref([]);
const lineItems = ref([]);
const lineItemsLoading = ref(false);
const lineItemsError = ref('');
let lineItemsRequest = 0;
const assignedPalletRecords = ref([]);
const assignedPalletsLoading = ref(false);
const assignedPalletsError = ref('');
const palletSearch = ref('');
const showSelectablePalletsOnly = ref(false);
const isSavingPalletAssignment = ref(false);
let assignedPalletsRequest = 0;
const selectedLineItem = computed(() =>
    lineItems.value.find(item => item.po_item === selectedLineItemId.value) || null
);
const formatLineItemQuantity = (value) => {
    if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) return 'Unavailable';
    return Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const lockedAssignedPalletIds = computed(() =>
    new Set(assignedPalletRecords.value.filter(pallet => pallet.truckscale_no).map(pallet => pallet.physical_id))
);
const filteredAssignedPallets = computed(() => {
    const search = (palletSearch.value || '').trim().toLowerCase();
    return assignedPalletRecords.value.filter(pallet =>
        pallet.physical_id.toLowerCase().includes(search)
        && (!showSelectablePalletsOnly.value || !lockedAssignedPalletIds.value.has(pallet.physical_id))
    );
});
const selectableVisiblePallets = computed(() =>
    filteredAssignedPallets.value.filter(pallet => !lockedAssignedPalletIds.value.has(pallet.physical_id))
);
const allVisiblePalletsSelected = computed(() =>
    selectableVisiblePallets.value.length > 0
    && selectableVisiblePallets.value.every(pallet => selectedPalletIds.value.includes(pallet.physical_id))
);
const someVisiblePalletsSelected = computed(() =>
    selectableVisiblePallets.value.some(pallet => selectedPalletIds.value.includes(pallet.physical_id))
);
const selectedTruckscaleItem = ref(null);
const selectedScaleType = ref(null);
const selectedTruckscale = ref(null);
const selectedTruckscalePalletIds = ref([]);
const isSavingTruckscale = ref(false);
const truckscales = ref([]);
const truckscalesLoading = ref(false);
const truckscalesError = ref('');
const assignedPallets = computed(() =>
    selectedTruckscaleItem.value?.sto_transactions?.flatMap(transaction => transaction.items || []) || []
);

const headers = [
    {
        title: '',
        key: 'action',
        align: 'center',
        sortable: false,
    },
    {
        title: 'SCALE NO.',
        key: 'truckscale_no',
        align: 'center',
        sortable: false,
    },
    {
        title: 'SCALE TYPE',
        key: 'scale_type',
        align: 'center',
        sortable: false,
    },
    {
        title: 'TARE WEIGHT',
        key: 'tare_weight',
        sortable: false,    
        width: '150px'
    },
     {
        title: 'NET WEIGHT',
        key: 'net_weight',
        sortable: false,    
        width: '150px'
    },
    {
        title: 'IS FINAL',
        key: 'is_final',
        align: 'center',
        sortable: false,
    },
    {
        title: 'DRIVER',
        key: 'driver_name',
        sortable: false,    
        width: '150px'
    },
    {
        title: 'PLATE NO',
        key: 'plate_number',
        sortable: false,
        width: '120px'

    },
    {
        title: 'STO NO.',
        key: 'po_number',
        sortable: false,
    },
    {
        title: 'PALLET ASSIGNMENT',
        key: 'pallet_assignment',
        align: 'center',
        sortable: false,
    },
    {
        title: 'BATCH PICKED',
        key: 'batch_picked',
        align: 'center',
        sortable: false,
    },
    
    {
        title: 'DATE CREATED',
        key: 'created_at',
        width: '170px'
    },

]

const loadItems = ({ page, itemsPerPage, sortBy, search }) => {
    // Explicitly applied filters win; the parent's live filters fill in anything not applied yet (e.g. first load)
    const requestFilters = { ...props.initialFilters, ...filters.value };

    // Skip fetching until both plant and storage location filters are selected
    if (!requestFilters.plant_id || !requestFilters.storage_location_id) {
        serverItems.value = [];
        totalItems.value = 0;
        loading.value = false;
        emits('pagination-changed', {
            page,
            itemsPerPage,
            sortBy: sortQuery.value,
            search: props.search,
            totalItems: totalItems.value,
        });
        return;
    }

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

    ApiService.query('datatable/purchase-orders', {
        params: {
            page,
            itemsPerPage,
            sort: sortQuery.value,
            filters: requestFilters,
            alc_mode: true
        }
    })
        .then((response) => {
            totalItems.value = response.data.total;
            serverItems.value = response.data.data
            loading.value = false

            emits('pagination-changed', {
                page,
                itemsPerPage,
                sortBy: sortQuery.value,
                search: props.search,
                totalItems: totalItems.value,
            });
        })
        .catch((error) => {
            console.log(error);
        });
}

const toast = ref({
    message: 'Toast message!',
    color: 'success',
    show: false
});

const applyFilters = (data) => {
    filters.value = data;
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{ key: 'created_at', order: 'desc' }],
        search: props.search
    });
}

const viewReservedPallets = ref(false);
const palletModalOpen = ref(false);
const isSaving = ref(false);
const selectedItemForPallet = ref(null);

const fetchTruckscales = async (sto) => {
    const plantCode = sto.supplying_order_plant?.plant_code || sto.supplying_plant;
    const storageLocation = sto.issuing_storage_location?.code || sto.issuing_sloc_sto;

    truckscales.value = [];
    truckscalesError.value = '';
    if (!plantCode || !storageLocation || !sto.po_number) {
        truckscalesError.value = 'Plant, storage location, or STO number is missing. Truckscales could not be loaded.';
        return;
    }

    truckscalesLoading.value = true;
    try {
        const response = await ApiService.query(
            `transfer-orders/${encodeURIComponent(plantCode)}/${encodeURIComponent(storageLocation)}/${encodeURIComponent(sto.po_number)}/fetch-sto-truckscales`,
            {}
        );
        const fetchedTruckscales = response.data?.truckscales ?? response.data?.data?.truckscales;
        if (!Array.isArray(fetchedTruckscales)) {
            throw new Error('Unexpected response while loading truckscales.');
        }
        truckscales.value = fetchedTruckscales;
    } catch (error) {
        console.error('Failed to fetch truckscales:', error);
        truckscalesError.value = error.response?.data?.message || error.message || 'Could not load truckscales. Please try again.';
    } finally {
        truckscalesLoading.value = false;
    }
};

const getReservedPallets = (item) => {
    const truckscaleNo = item?.truckscale_no;
    if (truckscaleNo == null || truckscaleNo === '') return [];
    return item?.sto_transactions?.flatMap(transaction =>
        (transaction.items || []).filter(pallet =>
            pallet.truckscale_no != null && String(pallet.truckscale_no) === String(truckscaleNo)
        ).map(pallet => ({
            ...pallet,
            lineItem: transaction.po_item ?? pallet.sto_transaction?.po_item,
        }))
    ) || [];
};

const fetchLineItems = async (sto) => {
    const requestId = ++lineItemsRequest;
    const plantCode = sto.truckscale_plant;
    const storageLocation = sto.sloc;
    const poNumber = sto.po_number;

    lineItems.value = [];
    lineItemsError.value = '';
    lineItemsLoading.value = false;
    if (!plantCode || !storageLocation || !poNumber) {
        lineItemsError.value = 'Plant, storage location, or STO number is missing. Line items could not be loaded.';
        return;
    }

    lineItemsLoading.value = true;
    try {
        const response = await ApiService.query(
            `transfer-orders/get-sto-line-items/${encodeURIComponent(plantCode)}/${encodeURIComponent(storageLocation)}/${encodeURIComponent(poNumber)}`,
            {}
        );
        if (!Array.isArray(response.data) || !response.data.every(item =>
            item && (typeof item.po_item === 'string' || typeof item.po_item === 'number')
            && (typeof item.material_code === 'string' || typeof item.material_code === 'number')
            && (typeof item.material_description === 'string' || item.material_description === null)
        )) {
            throw new Error('Unexpected response while loading line items.');
        }
        if (requestId === lineItemsRequest) lineItems.value = response.data;
    } catch (error) {
        if (requestId !== lineItemsRequest) return;
        console.error('Failed to fetch STO line items:', error);
        lineItemsError.value = error.response?.data?.message || error.message || 'Could not load line items. Please try again.';
    } finally {
        if (requestId === lineItemsRequest) lineItemsLoading.value = false;
    }
};

const resetAssignedPallets = () => {
    assignedPalletsRequest++;
    assignedPalletRecords.value = [];
    selectedPalletIds.value = [];
    assignedPalletsLoading.value = false;
    assignedPalletsError.value = '';
    palletSearch.value = '';
    showSelectablePalletsOnly.value = false;
};

const toggleAllVisiblePallets = (checked) => {
    const visibleIds = new Set(selectableVisiblePallets.value.map(pallet => pallet.physical_id));
    selectedPalletIds.value = checked
        ? [...new Set([...selectedPalletIds.value, ...visibleIds])]
        : selectedPalletIds.value.filter(id => !visibleIds.has(id));
};

const fetchAssignedPallets = async (lineItemId) => {
    resetAssignedPallets();
    if (lineItemId === null || lineItemId === undefined) return;

    const requestId = assignedPalletsRequest;
    const lineItem = lineItems.value.find(item => item.po_item === lineItemId);
    const poNumber = palletAssignmentTruckscale.value?.po_number;
    if (!poNumber || !lineItem || lineItem.material_code === '') {
        assignedPalletsError.value = 'STO number or line item details are missing. Pallets could not be loaded.';
        return;
    }

    assignedPalletsLoading.value = true;
    try {
        const response = await ApiService.query(
            `transfer-orders/get-assigned-pallets/${encodeURIComponent(poNumber)}/${encodeURIComponent(lineItem.po_item)}/${encodeURIComponent(lineItem.material_code)}`,
            {}
        );
        if (!Array.isArray(response.data) || !response.data.every(pallet =>
            pallet && typeof pallet.physical_id === 'string' && pallet.physical_id.length > 0
            && Object.prototype.hasOwnProperty.call(pallet, 'truckscale_no')
            && Object.prototype.hasOwnProperty.call(pallet, 'is_loaded')
        )) {
            throw new Error('Unexpected response while loading pallets.');
        }
        if (requestId === assignedPalletsRequest) assignedPalletRecords.value = response.data;
    } catch (error) {
        if (requestId !== assignedPalletsRequest) return;
        console.error('Failed to fetch assigned pallets:', error);
        assignedPalletsError.value = error.response?.data?.message || error.message || 'Could not load pallets. Please try again.';
    } finally {
        if (requestId === assignedPalletsRequest) assignedPalletsLoading.value = false;
    }
};

watch(assignPalletsDialog, (open) => {
    if (!open) resetAssignedPallets();
}, { flush: 'sync' });

const handleAction = async (sto, action) => {
    if (action === 'assign_pallets') {
        if (!sto.sto_transactions?.[0]?.items?.length > 0) {
            Swal.fire({
                icon: 'error',
                title: 'No Batch Picked Yet',
                text: 'Please contact supply chain.',
                confirmButtonColor: '#00833c',
                confirmButtonText: '<span style="color: #ffffff;">OK</span>',
            });
            return;
        }

        palletAssignmentTruckscale.value = sto;
        selectedLineItemId.value = null;
        resetAssignedPallets();
        assignPalletsDialog.value = true;
        fetchLineItems(sto);
        return;
    }

    if (action == 'batch_pick' && sto.purchase_order?.release_indicator == 'X') {
        Swal.fire({
            icon: 'error',
            title: 'STO not yet released',
            text: 'Please contact supply chain.',
            confirmButtonColor: '#00833c',
            confirmButtonText: '<span style="color: #ffffff;">OK</span>',
        });
        return;
    }

    stoData.value = sto;
    selectedItemForPallet.value = sto
    stoBatchPickingStore.selectedPoItem = sto;
    
    if (action == 'batch_pick') {
        router.push({ name: 'sto-batch-selection', params: { po_number: sto.po_number, po_item: sto.po_item } });
    } else if (action == 'assign_truckscale') {
        selectedTruckscaleItem.value = sto;
        selectedScaleType.value = null;
        selectedTruckscale.value = null;
        selectedTruckscalePalletIds.value = [];
        assignTruckscaleDialog.value = true;
        fetchTruckscales(sto);
    } else if (action == 'view_reserved_pallets') {
        reservedPalletsTruckscale.value = sto;
        selectedUnassignIds.value = [];
        viewReservedPallets.value = true;
        refreshReservedPallets();
    }

}

const assignPalletsToTruckscale = (poNumber, poItem, truckscaleNo, pallets) =>
    ApiService.post('transfer-orders/assign-truckscale', {
        po_number: poNumber,
        po_item: poItem,
        truckscale_no: truckscaleNo,
        pallets,
    });

const savePalletAssignmentToTruckscale = async () => {
    if (isSavingPalletAssignment.value) return;

    const truckscale = palletAssignmentTruckscale.value;
    const lineItem = selectedLineItem.value;
    const selectedIds = new Set(selectedPalletIds.value);
    const pallets = assignedPalletRecords.value.filter(pallet =>
        selectedIds.has(pallet.physical_id) && !lockedAssignedPalletIds.value.has(pallet.physical_id)
    );
    if (!truckscale?.po_number || !truckscale?.truckscale_no || !lineItem || !selectedIds.size
        || new Set(pallets.map(pallet => pallet.physical_id)).size !== selectedIds.size) {
        Swal.fire({
            icon: 'error',
            title: 'Pallet Assignment Failed',
            text: 'Select a line item and available pallets for a valid truckscale.',
        });
        return;
    }

    isSavingPalletAssignment.value = true;
    try {
        await assignPalletsToTruckscale(
            truckscale.po_number,
            lineItem.po_item,
            truckscale.truckscale_no,
            pallets.map(pallet => ({
                physical_id: pallet.physical_id,
                batch: pallet.batch ?? null,
                material_code: String(lineItem.material_code),
            }))
        );
        assignPalletsDialog.value = false;
        Swal.fire({
            icon: 'success',
            title: 'Pallets Assigned',
            text: 'The selected pallets were assigned to the truckscale.',
            confirmButtonColor: '#00833c',
            confirmButtonText: '<span style="color: #ffffff;">OK</span>'
        });
        fetchStockTransferDetails();
    } catch (error) {
        console.error('Failed to assign pallets to truckscale:', error);
        Swal.fire({
            icon: 'error',
            title: 'Pallet Assignment Failed',
            text: error.response?.data?.message || 'Could not assign the selected pallets to this truckscale. Please try again.',
            confirmButtonColor: '#d33',
            confirmButtonText: '<span style="color: #ffffff;">OK</span>'
        });
    } finally {
        isSavingPalletAssignment.value = false;
    }
};

const batchPickModalOpen = ref(false);

const reservedPalletItems = computed(() => getReservedPallets(reservedPalletsTruckscale.value));
const selectedUnassignIds = ref([]);
const unassignLoading = ref(false);
const unassignConfirmDialog = ref(false);
const unassignMessage = ref('');
const unassignMessageType = ref('success');
const reservedPalletsLoading = ref(false);
const reservedPalletsError = ref('');
let reservedPalletsRequest = 0;
const canUnassignReservedPallet = item =>
    item.id != null && typeof item.physical_id === 'string' && item.physical_id.length > 0
    && item.material_code != null && String(item.material_code) !== ''
    && Object.prototype.hasOwnProperty.call(item, 'batch')
    && Object.prototype.hasOwnProperty.call(item, 'is_loaded') && !item.is_loaded
    && reservedPalletsTruckscale.value?.truckscale_no != null
    && reservedPalletsTruckscale.value.truckscale_no !== ''
    && item.truckscale_no != null
    && String(item.truckscale_no) === String(reservedPalletsTruckscale.value.truckscale_no);
const selectableUnassignItems = computed(() => reservedPalletItems.value.filter(canUnassignReservedPallet));
const selectedUnassignItems = computed(() => {
    const ids = new Set(selectedUnassignIds.value);
    return selectableUnassignItems.value.filter(item => ids.has(item.id));
});
const allUnassignSelected = computed(() =>
    selectableUnassignItems.value.length > 0
    && selectableUnassignItems.value.every(item => selectedUnassignIds.value.includes(item.id))
);
const toggleAllUnassign = checked => {
    selectedUnassignIds.value = checked ? [...new Set(selectableUnassignItems.value.map(item => item.id))] : [];
};
watch(viewReservedPallets, open => {
    if (!open) {
        reservedPalletsRequest++;
        selectedUnassignIds.value = [];
        unassignConfirmDialog.value = false;
        unassignMessage.value = '';
        reservedPalletsError.value = '';
        reservedPalletsLoading.value = false;
    }
}, { flush: 'sync' });

const refreshReservedPallets = async () => {
    const requestId = ++reservedPalletsRequest;
    const row = reservedPalletsTruckscale.value;
    reservedPalletsError.value = '';
    reservedPalletsLoading.value = true;
    try {
        if (row?.id == null) throw new Error('The truckscale row has no ID and cannot be refreshed.');
        if (row.truckscale_no == null || row.truckscale_no === '') throw new Error('The selected row has no truckscale number.');
        const response = await ApiService.query('datatable/purchase-orders', {
            params: {
                page: page.value,
                itemsPerPage: itemsPerPage.value,
                sort: sortQuery.value,
                filters: { ...props.initialFilters, ...filters.value },
                alc_mode: true,
            },
        });
        if (!Array.isArray(response.data?.data)) throw new Error('Unexpected response while refreshing reserved pallets.');
        const updated = response.data.data.find(item => item.id === row.id);
        if (!updated) throw new Error('This truckscale is no longer on the current page. Close the dialog and reopen it.');
        if (String(updated.truckscale_no) !== String(row.truckscale_no)) {
            throw new Error('The selected truckscale has changed. Close the dialog and reopen it.');
        }
        if (!Array.isArray(updated.sto_transactions) || !updated.sto_transactions.every(transaction => Array.isArray(transaction.items))) {
            throw new Error('Reserved pallet details were not returned. Close the dialog and try again.');
        }
        if (requestId !== reservedPalletsRequest) return;
        reservedPalletsTruckscale.value = updated;
        serverItems.value = response.data.data;
        totalItems.value = response.data.total;
        selectedUnassignIds.value = [];
    } catch (error) {
        if (requestId !== reservedPalletsRequest) return;
        console.error('Failed to refresh reserved pallets:', error);
        reservedPalletsError.value = error.response?.data?.message || error.message || 'Could not refresh reserved pallets.';
    } finally {
        if (requestId === reservedPalletsRequest) reservedPalletsLoading.value = false;
    }
};

const validateUnassignSelection = () => {
    if (unassignLoading.value || reservedPalletsLoading.value || reservedPalletsError.value) return;
    const ids = new Set(selectedUnassignIds.value);
    const pallets = selectedUnassignItems.value;
    const poNumber = reservedPalletsTruckscale.value?.po_number;
    const truckscaleNo = reservedPalletsTruckscale.value?.truckscale_no;
    if (!poNumber || !truckscaleNo || !ids.size || new Set(pallets.map(item => item.id)).size !== ids.size) {
        unassignMessageType.value = 'error';
        unassignMessage.value = 'Select eligible pallets for a valid truckscale.';
        return;
    }
    return { pallets, poNumber, truckscaleNo };
};

const confirmUnassignPallets = () => {
    unassignMessage.value = '';
    if (validateUnassignSelection()) unassignConfirmDialog.value = true;
};

const unassignSelectedPallets = async () => {
    if (unassignLoading.value) return;
    const selection = validateUnassignSelection();
    if (!selection) {
        unassignConfirmDialog.value = false;
        return;
    }
    const { pallets, poNumber, truckscaleNo } = selection;
    unassignLoading.value = true;
    try {
        await ApiService.post('transfer-orders/unassign-truckscale', {
            po_number: poNumber,
            truckscale_no: truckscaleNo,
            pallets: pallets.map(item => ({
                id: item.id,
                physical_id: item.physical_id,
                batch: item.batch,
                material_code: String(item.material_code),
            })),
        });
        await refreshReservedPallets();
        unassignMessageType.value = 'success';
        unassignMessage.value = 'Pallets unassigned. The selected pallets remain reserved for the STO.';
    } catch (error) {
        console.error('Failed to unassign pallets:', error);
        await refreshReservedPallets();
        unassignMessageType.value = 'error';
        unassignMessage.value = error.response?.data?.message || 'Could not unassign the selected pallets. Please try again.';
    } finally {
        unassignLoading.value = false;
        unassignConfirmDialog.value = false;
    }
};

const cancelProposalLoading = ref(false);
const cancelProposal = async () => {
    cancelProposalLoading.value = true;
    try {
        // Call your API to cancel the reservation
        await ApiService.post('transfer-orders/transfer-order-remove', {
            po_number: selectedCancelItem.value?.po_number,
            po_item: selectedCancelItem.value?.po_item,
            transport_number: selectedCancelItem.value.transport?.transport_number
        });

        Swal.fire({
            icon: 'success',
            title: 'Batch Reservation Cancelled Successfully',
            text: 'The batch reservation has been cancelled.',
            confirmButtonColor: '#00833c',
            confirmButtonText: '<span style="color: #ffffff;">OK</span>',
        });
        batchPickModalOpen.value = false;
        // fetchStockTransferDetails();
        loadItems({
            page: page.value,
            itemsPerPage: itemsPerPage.value,
            sortBy: [{ key: 'updated_at', order: 'desc' }],
            search: props.search
        });
    } catch (error) {
        console.error(error);
        Swal.fire({
            icon: 'error',
            title: 'Error Cancelling Reservation',
            text: error.response?.data?.message || 'Failed to cancel reservation',
            confirmButtonColor: '#d33', // Custom alert styling match
            confirmButtonText: '<span style="color: #ffffff;">OK</span>'
        });
    } finally {
        cancelProposalLoading.value = false;
        viewReservedPallets.value = false;
        cancelConfirmationModal.value = false;
    }
};

function fetchStockTransferDetails() {
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{ key: 'updated_at', order: 'desc' }],
        search: props.search
    });
}

function removeLeadingZeros(value) {
    if (!value) return '';
    return String(value).replace(/^0+/, '');
}

defineExpose({
    loadItems,
    applyFilters
})
</script>

<template>
    <VDataTableServer v-model:items-per-page="itemsPerPage" :items-per-page-options="[25, 50, 100]" fixed-header :headers="headers" :items="serverItems"
        :items-length="totalItems" :loading="loading" item-value="id" :search="search" @update:options="loadItems">
        <template class="font-weight-black" v-slot:header.remaining_qty="{ header }">
            <span>REMAINING</span><br />
            <span>QTY</span>
        </template>

        <template class="font-weight-black" v-slot:header.gr_remaining_qty="{ header }">
            <span>REMAINING</span><br />
            <span>GR QTY</span>
        </template>

        <template #item.po_item="{ item }">
            <span class="font-weight-bold mb-1">{{ item.sto_transaction_items?.[0]?.sto_transaction?.po_item }}</span>
        </template>

        <template #item.transport_number="{ item }">
            <span class="font-weight-bold mb-1">{{ item.transport?.transport_number }}</span>
        </template>

        <template #item.pallet_assignment="{ item }">
            <div class="d-flex flex-column py-2 g-1">
                <v-chip color="info" label small>
                    Reserved: <span class="font-weight-bold ml-1">{{ getReservedPallets(item).length }}</span>
                </v-chip>
                
                <v-chip color="primary" class="mt-1" label small>
                    &nbsp;&nbsp;&nbsp;Loaded: <span class="font-weight-bold ml-1">{{ getReservedPallets(item).filter(pallet => pallet.is_loaded).length }}</span>
                </v-chip>
            </div>
        </template>

        <template #item.scale_type="{ item }">
            <div class="d-flex flex-column  g-1">
                <v-chip v-if="item.fl_weight1" color="info" label small>
                    Floorscale
                </v-chip>
                <v-chip v-else color="primary" label small>
                    Truckscale
                </v-chip>
            </div>
        </template>

        <template #item.is_final="{ item }">
            <i v-if="item.final_indicator === 'X'" style="font-size: 30px; background-color: green;"
                                    class="ri-checkbox-circle-line"></i>
            <i v-else style="font-size: 30px; background-color: #FF4C51;" class="ri-close-circle-line"></i>
        </template>

        <template #item.batch_picked="{ item }">
            <i v-if="item.sto_transactions?.[0]?.items?.length > 0" style="font-size: 30px; background-color: green;"
                                    class="ri-checkbox-circle-line"></i>
            <i v-else style="font-size: 30px; background-color: #FF4C51;" class="ri-close-circle-line"></i>
        </template>

        <template #item.from_plant_sloc="{ item }">
            <div class="d-flex flex-column mt-1">
                <span class="font-weight-bold text-sm">{{ item.sto_transaction_items?.[0]?.sto_transaction?.supplying_plant }}</span>
            </div>
            <div class="d-flex flex-column py-1">
                <span class="font-weight text-sm">{{ item.sto_transaction_items?.[0]?.sto_transaction?.issuing_sloc }}</span>
            </div>
        </template>

        <template #item.to_plant_sloc="{ item }">
            <div class="d-flex flex-column mt-1">
                <span class="font-weight-bold text-sm">{{ item.sto_transaction_items?.[0]?.sto_transaction?.receiving_plant }}</span>
            </div>
            <div class="d-flex flex-column py-1">
                <span class="font-weight text-sm">{{ item.sto_transaction_items?.[0]?.sto_transaction?.receiving_sloc }}</span>
            </div>
        </template>

        <template v-slot:[`item.tare_weight`]="{ item }">
            <span>
                {{ Number(item.tare_weight ?? 0).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }) }} KG
            </span>
        </template>

        <template v-slot:[`item.net_weight`]="{ item }">
            <v-chip v-if="item.outgoing_net_weight === null || item.outgoing_net_weight === undefined || item.outgoing_net_weight === 0" color="warning" small>
                PENDING
            </v-chip>
            <span v-else>
                {{ Number(item.outgoing_net_weight).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }) }} KG
            </span>
        </template>


        <template v-slot:[`item.gr_remaining_qty`]="{ item }">
            <span>
                {{ Number(item.gr_current_quantity ?? 0).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }) }}
            </span>
        </template>

        <template #item.uom="{ item }">
            {{ item.commercial_uom?.commercial_uom }}
        </template>

        <template #item.created_at="{ item }">
            {{ item.created_at ? moment(item.created_at).format('M/D/YY h:mm A') : '' }}
        </template>

        <!-- Actions -->
        <template #item.action="{ item }">
            <div class="d-flex justify-center gap-1">
                <v-menu location="end">
                    <template v-slot:activator="{ props }">
                        <v-btn icon="ri-more-2-line" variant="text" v-bind="props" color="grey"></v-btn>
                    </template>
                    <v-list>
                        <v-list-item prepend-icon="ri-add-box-line" @click="handleAction(item, 'assign_pallets')">Assign Pallets</v-list-item>
                        <v-list-item prepend-icon="ri-stack-line"  @click="handleAction(item, 'view_reserved_pallets')">View Reserved Pallets</v-list-item>
                        <v-list-item
                            v-if="item.batch_pick_status === 'Batch Picked' && (authUserCan('can.sto.assign.truckscale') || authStore.user?.is_super_admin)"
                            prepend-icon="ri-scales-3-line"
                            @click="handleAction(item, 'assign_truckscale')"
                        >
                            Assign Truckscale
                        </v-list-item>
                    </v-list>
                </v-menu>
            </div>
        </template>
    </VDataTableServer>


    <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event" />
    <Loader :show="isLoading || saveLoading" />
  
    <v-dialog v-model="assignPalletsDialog" max-width="1400px" scrollable :persistent="isSavingPalletAssignment">
        <v-card rounded="lg" class="pallet-dialog">
            <v-card-title class="pallet-dialog__header pa-5 pa-sm-6">
                <div class="d-flex align-start ga-3">
                    <v-avatar color="primary" variant="tonal" rounded="lg" size="48" class="flex-shrink-0">
                        <v-icon icon="ri-stack-line" size="24" />
                    </v-avatar>
                    <div class="flex-grow-1">
                        <div class="text-h5 font-weight-bold">Assign Pallets</div>
                        <div class="text-body-2 text-medium-emphasis mt-1 text-wrap">
                            Select a line item and choose its pallets for this truckscale.
                        </div>
                    </div>
                    <v-btn icon="ri-close-line" variant="text" size="small" aria-label="Close dialog" :disabled="isSavingPalletAssignment" @click="assignPalletsDialog = false" />
                </div>
            </v-card-title>
            <v-card-text class="pa-5 pa-sm-6">
                <v-row dense class="mb-5">
                    <v-col cols="12" sm="6">
                        <div class="pallet-dialog__context rounded-lg pa-3 d-flex align-center ga-3">
                            <v-icon icon="ri-scales-3-line" color="primary" />
                            <div>
                                <div class="text-caption text-medium-emphasis">Truckscale</div>
                                <div class="font-weight-bold">{{ palletAssignmentTruckscale?.truckscale_no || '-' }}</div>
                            </div>
                        </div>
                    </v-col>
                    <v-col cols="12" sm="6">
                        <div class="pallet-dialog__context rounded-lg pa-3 d-flex align-center ga-3">
                            <v-icon icon="ri-file-list-3-line" color="primary" />
                            <div>
                                <div class="text-caption text-medium-emphasis">STO Number</div>
                                <div class="font-weight-bold">{{ palletAssignmentTruckscale?.po_number || '-' }}</div>
                            </div>
                        </div>
                    </v-col>
                </v-row>

                <div class="d-flex align-center ga-2 mb-3">
                    <v-avatar color="primary" size="26" class="text-caption font-weight-bold">1</v-avatar>
                    <div class="text-subtitle-1 font-weight-bold">Choose a line item</div>
                </div>
                <v-alert v-if="lineItemsError" type="error" variant="tonal" density="comfortable" class="mb-4">
                    {{ lineItemsError }}
                    <v-btn variant="text" size="small" @click="fetchLineItems(palletAssignmentTruckscale)">Retry</v-btn>
                </v-alert>
                <v-select
                    v-model="selectedLineItemId"
                    :items="lineItems"
                    :item-title="item => `${item.po_item} - ${removeLeadingZeros(item.material_code)}`"
                    item-value="po_item"
                    :loading="lineItemsLoading"
                    :disabled="isSavingPalletAssignment || lineItemsLoading || Boolean(lineItemsError)"
                    label="Line item"
                    placeholder="Select a line item"
                    no-data-text="No line items found for this STO"
                    prepend-inner-icon="ri-file-list-3-line"
                    variant="outlined"
                    density="comfortable"
                    class="mb-4"
                    @update:model-value="fetchAssignedPallets"
                >
                    <template #item="{ props: itemProps, item }">
                        <v-list-item v-bind="itemProps" :subtitle="item.raw.material_description || '-'"/>
                    </template>
                </v-select>

                <v-card v-if="selectedLineItem" variant="outlined" rounded="lg" class="mb-5">
                    <v-card-text>
                        <v-row dense>
                            <v-col cols="6" sm="3">
                                <div class="text-caption text-medium-emphasis">Line Item</div>
                                <div class="font-weight-bold">{{ selectedLineItemId }}</div>
                            </v-col>
                            <v-col cols="6" sm="3">
                                <div class="text-caption text-medium-emphasis">Material Code</div>
                                <div class="font-weight-bold">{{ removeLeadingZeros(selectedLineItem.material_code) }}</div>
                            </v-col>
                            <v-col cols="12" sm="6">
                                <div class="text-caption text-medium-emphasis">Material Description</div>
                                <div class="font-weight-bold">{{ selectedLineItem.material_description || '-' }}</div>
                            </v-col>
                            <v-col cols="12" sm="3">
                                <div class="text-caption text-medium-emphasis">PO Quantity</div>
                                <div class="font-weight-bold">{{ formatLineItemQuantity(selectedLineItem.qty) }} {{selectedLineItem.uom}}</div>
                            </v-col>
                            <v-col cols="6" sm="3">
                                <div class="text-caption text-medium-emphasis">GI Quantity</div>
                                <div class="font-weight-bold">{{ formatLineItemQuantity(selectedLineItem.gi_quantity) }} {{selectedLineItem.uom}}</div>
                            </v-col>
                            <v-col cols="12" sm="6">
                                <div class="text-caption text-medium-emphasis">Remaining Quantity</div>
                                <div class="font-weight-bold">{{ formatLineItemQuantity(selectedLineItem.remaining_quantity) }} {{selectedLineItem.uom}}</div>
                            </v-col>
                        </v-row>
                        <v-alert v-if="selectedLineItem.qty == null" type="warning" variant="tonal" density="compact" class="mt-3">
                            PO quantity is unavailable in the line item response.
                        </v-alert>
                    </v-card-text>
                </v-card>

                <div class="d-flex align-center justify-space-between ga-3 mb-3">
                    <div class="d-flex align-center ga-2">
                        <v-avatar :color="selectedLineItem ? 'primary' : 'secondary'" size="26" class="text-caption font-weight-bold">2</v-avatar>
                        <div class="text-subtitle-1 font-weight-bold">Choose pallets</div>
                    </div>
                    <v-chip size="small" color="primary" variant="tonal" prepend-icon="ri-checkbox-circle-line">
                        {{ selectedPalletIds.length }} selected
                    </v-chip>
                </div>
                <v-alert v-if="assignedPalletsError" type="error" variant="tonal" density="comfortable">
                    {{ assignedPalletsError }}
                    <v-btn variant="text" size="small" @click="fetchAssignedPallets(selectedLineItemId)">Retry</v-btn>
                </v-alert>
                <div v-else-if="assignedPalletsLoading" class="pallet-dialog__empty rounded-lg text-center pa-6" role="status">
                    <v-progress-circular indeterminate color="primary" size="28" class="mb-2" />
                    <div>Loading pallets...</div>
                </div>
                <div v-else-if="!selectedLineItem" class="pallet-dialog__empty rounded-lg text-center pa-6">
                    <v-icon icon="ri-inbox-line" size="32" color="secondary" class="mb-2" />
                    <div class="font-weight-medium">No line item selected</div>
                    <div class="text-body-2 text-medium-emphasis">Choose a line item above to view its reserved pallets.</div>
                </div>
                <div v-else-if="!assignedPalletRecords.length" class="pallet-dialog__empty rounded-lg text-center pa-6">
                    <v-icon icon="ri-inbox-line" size="32" color="secondary" class="mb-2" />
                    <div class="font-weight-medium">No pallets reserved on this line item yet</div>
                    <div class="text-body-2 text-medium-emphasis">Please contact supply chain for batch and pallet reservation</div>
                </div>
                <template v-else>
                    <div class="d-flex flex-wrap align-center ga-2 mb-3">
                        <v-text-field
                            v-model="palletSearch"
                            label="Search physical ID"
                            prepend-inner-icon="ri-search-line"
                            variant="outlined"
                            density="compact"
                            hide-details
                            clearable
                            :disabled="isSavingPalletAssignment"
                            class="pallet-dialog__search"
                        />
                    </div>
                    <v-switch
                        v-model="showSelectablePalletsOnly"
                        label="Show selectable pallets only"
                        color="primary"
                        density="compact"
                        hide-details
                        :disabled="isSavingPalletAssignment"
                        class="mb-3"
                    />
                    <div v-if="!filteredAssignedPallets.length" class="pallet-dialog__empty rounded-lg text-center pa-6">
                        <v-icon icon="ri-search-line" size="28" color="secondary" class="mb-2" />
                        <div class="font-weight-medium">No available pallets</div>
                        <div class="text-body-2 text-medium-emphasis">Please contact supply chain for pallet reservation.</div>
                    </div>
                    <v-table v-else density="comfortable" class="border rounded">
                        <thead>
                            <tr >
                                <th class="text-center">
                                    <v-checkbox-btn
                                        :model-value="allVisiblePalletsSelected"
                                        :indeterminate="someVisiblePalletsSelected && !allVisiblePalletsSelected"
                                        :disabled="isSavingPalletAssignment || !selectableVisiblePallets.length"
                                        aria-label="Select all visible selectable pallets"
                                        density="compact"
                                        @update:model-value="toggleAllVisiblePallets"
                                    />
                                </th>
                                <th>Physical ID</th>
                                <th>Material</th>
                                <th>Batch Code</th>
                                <th>Mfg Date</th>
                                <th class="text-center">Qty</th>
                                <th class="text-center">Truckscale No.</th>
                                <th class="text-center">Loaded</th>
                                <th>TR #</th>
                                <th>TO #</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(pallet, index) in filteredAssignedPallets" :key="`${pallet.physical_id}-${index}`">
                                <td class="text-center">
                                    <v-checkbox-btn
                                        v-model="selectedPalletIds"
                                        :value="pallet.physical_id"
                                        :disabled="isSavingPalletAssignment || lockedAssignedPalletIds.has(pallet.physical_id)"
                                        :aria-label="`Select pallet ${pallet.physical_id}`"
                                    />
                                </td>
                                <td class="font-weight-medium">{{ pallet.physical_id }}</td>
                                <td>
                                    <span class="font-weight-bold">{{ removeLeadingZeros(pallet.material_code) || '-' }}</span><br />
                                    <span v-if="pallet.material_description">{{ pallet.material_description }}</span>
                                </td>
                                <td>{{ pallet.batch || '-' }}</td>
                                <td>{{ pallet.mfg_date ? moment(pallet.mfg_date).format('YYYY-MM-DD') : '-' }}</td>
                                <td class="text-center">{{ pallet.quantity ?? '-' }} {{ pallet.uom || '' }}</td>
                                <td class="text-center">
                                    <v-chip v-if="pallet.truckscale_no" color="primary" label size="small">{{ pallet.truckscale_no }}</v-chip>
                                    <v-chip v-else color="success" variant="tonal" size="x-small">NOT ASSIGNED</v-chip>
                                </td>
                                <td class="text-center">
                                    <v-icon v-if="pallet.is_loaded" icon="ri-checkbox-circle-line" color="success" aria-label="Loaded" />
                                    <v-icon v-else icon="ri-close-circle-line" color="error" aria-label="Not loaded" />
                                </td>
                                <td>{{ pallet.transfer_request?.transfer_request_id || '-' }}</td>
                                <td>{{ pallet.transfer_request?.transfer_order?.transfer_order_id || '-' }}</td>
                            </tr>
                        </tbody>
                    </v-table>
                    <div class="text-caption text-medium-emphasis mt-2">
                        Pallets already assigned to a truckscale cannot be selected.
                    </div>
                </template>
            </v-card-text>
            <v-divider />
            <v-card-actions class="px-5 px-sm-6 py-4">
                <span class="text-body-2 text-medium-emphasis">{{ selectedPalletIds.length }} pallet(s) selected</span>
                <v-spacer />
                <v-btn variant="outlined" color="secondary" :disabled="isSavingPalletAssignment" @click="assignPalletsDialog = false">Close</v-btn>
                <v-btn
                    color="primary"
                    prepend-icon="ri-check-line"
                    :loading="isSavingPalletAssignment"
                    :disabled="!selectedLineItem || !selectedPalletIds.length || assignedPalletsLoading || Boolean(assignedPalletsError) || !palletAssignmentTruckscale?.truckscale_no"
                    @click="savePalletAssignmentToTruckscale"
                >Assign Pallets</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>

    <v-dialog v-model="viewReservedPallets" max-width="1400px" scrollable :persistent="unassignLoading">
        <v-card rounded="lg">
            <v-card-title class="pallet-dialog__header pa-5 pa-sm-6">
                <div class="d-flex align-start ga-3">
                    <v-avatar color="primary" variant="tonal" rounded="lg" size="48" class="flex-shrink-0">
                        <v-icon icon="ri-stack-line" size="24" />
                    </v-avatar>
                    <div class="flex-grow-1">
                        <div class="text-h5 font-weight-bold">Reserved Pallets</div>
                        <div class="text-body-2 text-medium-emphasis mt-1 text-wrap">
                            Reserved pallets assigned to this truckscale and their loading details.
                        </div>
                    </div>
                    <v-btn icon="ri-close-line" variant="text" size="small" aria-label="Close dialog" :disabled="unassignLoading" @click="viewReservedPallets = false" />
                </div>
            </v-card-title>
            <v-card-text class="pa-5 pa-sm-6">
                <v-row dense class="mb-5">
                    <v-col cols="12" sm="6">
                        <div class="pallet-dialog__context rounded-lg pa-3 d-flex align-center ga-3">
                            <v-icon icon="ri-file-list-3-line" color="primary" />
                            <div>
                                <div class="text-caption text-medium-emphasis">STO Number</div>
                                <div class="font-weight-bold">{{ reservedPalletsTruckscale?.po_number || '-' }}</div>
                            </div>
                        </div>
                    </v-col>
                    <v-col cols="12" sm="6">
                        <div class="pallet-dialog__context rounded-lg pa-3 d-flex align-center ga-3">
                            <v-icon icon="ri-scales-3-line" color="primary" />
                            <div>
                                <div class="text-caption text-medium-emphasis">Truckscale Number</div>
                                <div class="font-weight-bold">{{ reservedPalletsTruckscale?.truckscale_no || '-' }}</div>
                            </div>
                        </div>
                    </v-col>
                </v-row>
                <v-alert v-if="reservedPalletsError" type="error" variant="tonal" class="mb-4">
                    {{ reservedPalletsError }}
                    <v-btn variant="text" size="small" :disabled="unassignLoading" @click="refreshReservedPallets">Retry</v-btn>
                </v-alert>
                <v-alert v-if="unassignMessage" :type="unassignMessageType" variant="tonal" closable class="mb-4" @click:close="unassignMessage = ''">
                    {{ unassignMessage }}
                </v-alert>
                <v-alert type="info" variant="tonal" density="comfortable" class="mb-4">
                    To unassign pallets, select the unloaded pallets from the list below and click the "Unassign" button.
                </v-alert>
             
                <div class="d-flex align-center justify-space-between ga-3 mb-3">
                    <div>
                        <div class="text-subtitle-1 font-weight-bold">Pallet details</div>
                        <div class="text-body-2 text-medium-emphasis">Review line items and loading status.</div>
                    </div>
                    <v-chip size="small" color="primary" variant="tonal" prepend-icon="ri-stack-line">
                        {{ reservedPalletItems.length }} pallet(s)
                    </v-chip>
                </div>
                <div v-if="reservedPalletsLoading" class="pallet-dialog__empty rounded-lg text-center pa-6" role="status">
                    <v-progress-circular indeterminate color="primary" size="28" class="mb-2" />
                    <div>Refreshing pallets...</div>
                </div>
                <div v-else-if="!reservedPalletItems.length" class="pallet-dialog__empty rounded-lg text-center pa-6">
                    <v-icon icon="ri-inbox-line" size="32" color="secondary" class="mb-2" />
                    <div class="font-weight-medium">No assigned pallets</div>
                    <div class="text-body-2 text-medium-emphasis">No reserved pallets are assigned to this truckscale.</div>
                </div>
                <v-table v-else density="comfortable" class="border rounded-lg">
                    <thead>
                        <tr>
                            <th>
                                <v-checkbox-btn
                                    :model-value="allUnassignSelected"
                                    :indeterminate="selectedUnassignIds.length > 0 && !allUnassignSelected"
                                    :disabled="unassignLoading || Boolean(reservedPalletsError) || !selectableUnassignItems.length"
                                    aria-label="Select all eligible pallets"
                                    density="compact"
                                    @update:model-value="toggleAllUnassign"
                                />
                            </th>
                            <th>Physical ID</th>
                            <th>Batch</th>
                            <th style="min-width: 130px; white-space: nowrap;">Mfg Date</th>
                            <th class="text-center" style="min-width: 130px; white-space: nowrap;">
                                <span>QTY</span><br/>
                                <span>& UOM</span>
                            </th>
                            <th>Line Item</th>
                            <th>Material</th>
                            <th>
                                <span>Truckscale</span><br/>
                                <span>No.</span>
                            </th>
                            <th class="text-center">Bin Location</th>
                            <th class="text-center">Layer</th>
                            <th class="text-center">Loaded</th>
                            <th>TR #</th>
                            <th>TO #</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(item, index) in reservedPalletItems" :key="item.id ?? index">
                            <td>
                                <v-checkbox-btn
                                    v-model="selectedUnassignIds"
                                    :value="item.id"
                                    :disabled="unassignLoading || Boolean(reservedPalletsError) || !canUnassignReservedPallet(item)"
                                    :aria-label="`Select pallet ${item.physical_id || ''} for unassignment`"
                                    density="compact"
                                />
                            </td>
                            <td class="font-weight-medium">{{ item.physical_id || '-' }}</td>
                            <td>{{ item.batch || '-' }}</td>
                            <td>{{ item.mfg_date ? moment(item.mfg_date).format('YYYY-MM-DD') : '-'}}</td>
                            <td class="text-center">{{ item.quantity ?? '-' }} {{ item.uom || '' }}</td>
                            <td>{{ item.lineItem ?? '-' }}</td>
                            <td>
                                <div class="d-flex flex-column">
                                    <span class="font-weight-bold">{{ removeLeadingZeros(item.material_code) || '-' }}</span>
                                    <span>{{ item.material_description || '-' }}</span>
                                </div>
                            </td>
                            <td>
                                <v-chip prepend-icon="ri-checkbox-circle-line" v-if="item.truckscale_no" color="primary" variant="tonal" size="small">
                                    {{ item.truckscale_no || '-' }}
                                </v-chip>
                                <v-chip prepend-icon="ri-time-line" v-else color="warning" variant="tonal" size="small">
                                    PENDING
                                </v-chip>
                            </td>
                            <td class="text-center">{{ item.bin_location || '-' }}</td>
                            <td class="text-center">{{ item.layer_position || '-' }}</td>
                            <td class="text-center">
                                <v-chip
                                    :color="item.is_loaded ? 'primary' : 'warning'"
                                    :prepend-icon="item.is_loaded ? 'ri-checkbox-circle-line' : 'ri-time-line'"
                                    variant="tonal"
                                    size="small"
                                >{{ item.is_loaded ? 'LOADED' : 'NOT LOADED' }}</v-chip>
                            </td>
                            <td>{{ item.transfer_request?.transfer_request_id || '-' }}</td>
                            <td>{{ item.transfer_request?.transfer_order?.transfer_order_id || '-' }}</td>
                        </tr>
                    </tbody>
                </v-table>
            </v-card-text>
            <v-divider />
            <v-card-actions class="px-5 px-sm-6 py-4">
                <span class="text-body-2 text-medium-emphasis">{{ selectedUnassignIds.length }} selected</span>
                <v-spacer />
                <v-btn color="secondary" variant="outlined" :disabled="unassignLoading" @click="viewReservedPallets = false">Close</v-btn>
                <v-btn
                    color="warning"
                    prepend-icon="ri-link-unlink"
                    :loading="unassignLoading"
                    :disabled="reservedPalletsLoading || Boolean(reservedPalletsError) || !selectedUnassignIds.length"
                    @click="confirmUnassignPallets"
                >Unassign from truckscale</v-btn>
            </v-card-actions>
        </v-card>
        <v-dialog v-model="unassignConfirmDialog" max-width="700px" scrollable :persistent="unassignLoading">
            <v-card rounded="lg">
                <v-card-title class="unassign-dialog__header pa-5 pa-sm-6">
                    <div class="d-flex align-start ga-3">
                        <v-avatar color="warning" variant="tonal" rounded="lg" size="48" class="flex-shrink-0">
                            <v-icon icon="ri-link-unlink" size="24" />
                        </v-avatar>
                        <div class="flex-grow-1 text-wrap">
                            <div class="text-h5 font-weight-bold">Unassign pallets?</div>
                            <div class="text-body-2 text-medium-emphasis mt-1">
                                Review the selected pallets before confirming.
                            </div>
                        </div>
                        <v-btn icon="ri-close-line" variant="text" size="small" aria-label="Close confirmation" :disabled="unassignLoading" @click="unassignConfirmDialog = false" />
                    </div>
                </v-card-title>
                <v-card-text class="pa-5 pa-sm-6">
                    <div class="unassign-dialog__context rounded-lg pa-4 d-flex align-center ga-3 mb-5">
                        <v-icon icon="ri-scales-3-line" color="primary" />
                        <div>
                            <div class="text-caption text-medium-emphasis">Unassign from truckscale</div>
                            <div class="font-weight-bold">{{ reservedPalletsTruckscale?.truckscale_no || '-' }}</div>
                        </div>
                    </div>
                    <div class="d-flex align-center justify-space-between ga-3 mb-3">
                        <div class="text-subtitle-1 font-weight-bold">Selected pallets</div>
                        <v-chip size="small" color="primary" variant="tonal">
                            {{ selectedUnassignItems.length }} selected
                        </v-chip>
                    </div>
                    <div class="unassign-dialog__pallets rounded-lg pa-3 mb-5">
                        <div class="d-flex flex-wrap ga-2">
                            <v-chip v-for="item in selectedUnassignItems" :key="item.id" variant="outlined" size="small">
                                {{ item.physical_id }}
                            </v-chip>
                        </div>
                    </div>
                    <v-alert type="info" variant="tonal" density="comfortable">
                        The pallets will remain reserved for the STO after unassignment.
                    </v-alert>
                </v-card-text>
                <v-divider />
                <v-card-actions class="px-5 px-sm-6 py-4">
                    <v-spacer />
                    <v-btn variant="outlined" color="secondary" :disabled="unassignLoading" @click="unassignConfirmDialog = false">Cancel</v-btn>
                    <v-btn color="error" variant="flat" prepend-icon="ri-link-unlink" :loading="unassignLoading" @click="unassignSelectedPallets">Unassign pallets</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </v-dialog>

</template>

<style scoped>
.pallet-dialog__header {
    background: rgba(var(--v-theme-primary), 0.06);
}

.pallet-dialog__context {
    background: rgba(var(--v-theme-on-surface), 0.04);
    height: 100%;
}

.pallet-dialog__empty {
    border: 1px dashed rgba(var(--v-border-color), var(--v-border-opacity));
    background: rgba(var(--v-theme-on-surface), 0.02);
}

.pallet-dialog__search {
    flex: 1 1 220px;
}

.unassign-dialog__header {
    background: rgba(var(--v-theme-warning), 0.06);
}

.unassign-dialog__context {
    background: rgba(var(--v-theme-on-surface), 0.04);
}

.unassign-dialog__pallets {
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    max-height: 180px;
    overflow-y: auto;
}

.hover-underline {
    position: relative;
    text-decoration: none;
}

.hover-underline:hover::after {
    content: "";
    position: absolute;
    left: 0;
    bottom: 1px;
    width: 100%;
    height: 1px;
    background-color: #00833c;
}
</style>
