<script setup>
import Loader from '@/components/Loader.vue';
import Toast from '@/components/Toast.vue';
import { useAuthorization } from '@/composables/useAuthorization';
import { numberWithComma } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import { useAuthStore } from '@/stores/auth';
import { useStoBatchPickingStore } from '@/stores/stoBatchPickingStore';
import axios from 'axios';
import moment from 'moment';
import Swal from 'sweetalert2';
import { computed, defineEmits, defineExpose, defineProps, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { VDataTableServer } from 'vuetify/components';
import PalletAssignModal from './PalletAssignModal.vue';

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

const isLoading = ref(false);
const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(50);
const page = ref(1);
const sortQuery = ref('-created_at'); // Default sort
const filters = ref({ ...props.initialFilters });
const showDeliveryItems = ref(false);
const showReservedPallets = ref(false);
const stoData = ref([]);
const assignTruckscaleDialog = ref(false);
const selectedTruckscaleItem = ref(null);
const selectedTruckscale = ref(null);
const selectedTruckscalePalletIds = ref([]);
const isSavingTruckscale = ref(false);
const truckscales = ref([]);
const truckscalesLoading = ref(false);
const truckscalesError = ref('');
const assignedPallets = computed(() =>
    selectedTruckscaleItem.value?.sto_transactions?.flatMap(transaction => transaction.items || []) || []
);
const selectedTruckscaleDetails = computed(() =>
    truckscales.value.find(truckscale => truckscale.truckscale_no === selectedTruckscale.value) || null
);
const availablePalletCount = computed(() =>
    assignedPallets.value.filter(pallet => !pallet.truckscale_no && pallet.physical_id).length
);

const headers = [
    {
        title: '',
        key: 'action',
        align: 'center',
        sortable: false,
    },
    // {
    //     title: 'TRANSACTION NO.',
    //     key: 'transaction_number',
    //     align: 'center',
    //     sortable: false,
    // },
    {
        title: 'STO NO.',
        key: 'po_number',
        sortable: false,

    },
    {
        title: 'PO ITEM',
        key: 'po_item',
        align: 'center',
        sortable: false,
    },
    {
        title: 'PALLET ASSIGNMENT',
        key: 'pallet_assignment',
        align: 'center',
        sortable: false,

    },
    {
        title: 'BATCH PICK STATUS',
        key: 'batch_pick_status',
        align: 'center',
        sortable: false,
    },
    {
        title: 'Material',
        key: 'material',
        sortable: false,
        width: '90px'
    },
    {
        title: 'From',
        key: 'from_plant_sloc',
        sortable: false,

    },
    {
        title: 'To',
        key: 'to_plant_sloc',
        sortable: false,

    },
    {
        title: 'UOM',
        key: 'uom',
        sortable: false,
    },
    {
        title: 'PO qty',
        key: 'po_qty',
        align: 'center',
        sortable: false,
    },
    {
        title: 'GI qty',
        key: 'gi_quantity',
        align: 'center',
        sortable: false,
    },
    {
        title: 'Remaining qty',
        key: 'remaining_qty',
        align: 'center',
        sortable: false,
    },
    // {
    //     title: 'GR qty',
    //     key: 'gr_quantity',
    //     align: 'center',
    //     sortable: false,
    // },
    // {
    //     title: 'GR Remaining qty',
    //     key: 'gr_remaining_qty',
    //     align: 'center',
    //     sortable: false,
    // },
    {
        title: 'DATE CREATED',
        key: 'created_at',
    },

]

const loadItems = ({ page, itemsPerPage, sortBy, search }) => {

    // Skip fetching until both plant and storage location filters are selected
    if (!filters.value.plant_id || !filters.value.storage_location_id) {
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
            filters: filters.value,
            is_alc_managed: true
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

const getReservedPallets = (item) =>
    item?.sto_transactions?.flatMap(transaction => transaction.items || []) || [];

const handleAction = async (sto, action) => {
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
        selectedTruckscale.value = null;
        selectedTruckscalePalletIds.value = [];
        assignTruckscaleDialog.value = true;
        fetchTruckscales(sto);
    } else if (action == 'view_reserved_pallets') {
        try {
            isLoading.value = true;
            // Call the API endpoint (adjust the URL/payload format if needed)
            const response = await axios.get(`transfers/check-sto-batch-picked/${sto?.po_number}/${sto?.po_item}`);

            // If the API returns true directly or inside data (e.g., response.data === true)
            if (response.data?.batch_picked) {
                viewReservedPallets.value = true;
            } else {
                // Show SweetAlert2 warning if false
                Swal.fire({
                    icon: 'error',
                    title: 'No Batch Picked Yet',
                    text: 'Please contact supply chain.',
                    confirmButtonColor: '#00833c',
                    confirmButtonText: '<span style="color: #ffffff;">OK</span>',
                });
            }
        } catch (error) {
            // Handle potential API errors gracefully
            console.error("API Error:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to verify batch picking status. Please try again.'
            });
        } finally {
            isLoading.value = false;
        }
    }

}

const saveTruckscaleAssignment = async () => {
    if (!selectedTruckscaleItem.value || !selectedTruckscale.value || !selectedTruckscalePalletIds.value.length) return;

    const selectedPalletIds = new Set(selectedTruckscalePalletIds.value);
    const pallets = assignedPallets.value
        .filter(pallet =>
            selectedPalletIds.has(pallet.physical_id)
            && pallet.physical_id
            && !pallet.truckscale_no
        )
        .map(pallet => ({
            physical_id: pallet.physical_id,
            batch: pallet.batch || null,
        }));

    if (!pallets.length) return;

    isSavingTruckscale.value = true;
    try {
        await ApiService.post('transfer-orders/assign-truckscale', {
            po_number: selectedTruckscaleItem.value.po_number,
            po_item: selectedTruckscaleItem.value.po_item,
            truckscale_no: selectedTruckscale.value,
            pallets,
        });

        assignTruckscaleDialog.value = false;
        selectedTruckscalePalletIds.value = [];
        Swal.fire({
            icon: 'success',
            title: 'Truckscale Assigned',
            text: 'Truckscale assigned to the selected pallets.',
            confirmButtonColor: '#00833c',
            confirmButtonText: '<span style="color: #ffffff;">OK</span>'
        });
        loadItems({
            page: page.value,
            itemsPerPage: itemsPerPage.value,
            sortBy: [{ key: 'updated_at', order: 'desc' }],
            search: props.search
        });
    } catch (error) {
        console.error('Failed to assign truckscale:', error);
        Swal.fire({
            icon: 'error',
            title: 'Truckscale Assignment Failed',
            text: error.response?.data?.message || 'Could not assign the selected pallets to this truckscale. Please try again.',
            confirmButtonColor: '#d33',
            confirmButtonText: '<span style="color: #ffffff;">OK</span>'
        });
    } finally {
        isSavingTruckscale.value = false;
        assignTruckscaleDialog.value = false;
    }
};

const selectedTransportId = ref(null);

const batchPickModalOpen = ref(false);

const closeBatchPickModal = () => {
    batchPickModalOpen.value = false;
};

const saveLoading = ref(false)
const handleBatchPickSave = async ({ transport, batches, is_alc_managed }) => {
    // 1. Extract route parameters (or replace with your component state variables, e.g., stoData.value.po_number)
    const poNumber = stoData.value?.po_number;
    const poItem = stoData.value?.po_item;
    saveLoading.value = true;
    try {
        // 2. Build the dynamic endpoint URL and send the POST request
        // const response = await ApiService.post(`transfer-orders/sto-batch-pick/${poNumber}/${poItem}/save`, {
        //     transport: transport,
        //     batches: batches,
        //     is_alc_managed: is_alc_managed,
        //     material_code: stoData.value?.material_code,
        //     plant: stoData.value?.supplying_order_plant?.plant_code
        // });

        // 3. Handle successful processing
        batchPickModalOpen.value = false;

        stoBatchPickingStore.setOriginalBatchList(batches);
        router.push({ name: 'sto-warehouse-map', params: { po_number: poNumber, po_item: poItem } });

    } catch (error) {
        console.error('Failed to save batch picking:', error);
        
        const errorMessage = error.response?.data?.message || 'Failed to save batch picking selection.';
        
        Swal.fire({
            icon: 'error',
            title: 'Error Saving',
            text: errorMessage,
            confirmButtonColor: '#d33', // Custom alert styling match
            confirmButtonText: '<span style="color: #ffffff;">OK</span>'
        });
    } finally {
        saveLoading.value = false;
    }
};

const calculateAge = (date) => {
    if (!date) return '';
    const now = moment();
    const mfgDate = moment(date);
    const days = now.diff(mfgDate, 'days');
    return days;
};

function batchPickClose() {
    selectedTransportId.value = null;
    stoData.value = null;
    showReservedPallets.value = false
}

function handleUpdated(){
    selectedTransportId.value = null;
    stoData.value = null;
    showReservedPallets.value = false

      // Close dialog modal view layer immediately
    toast.value.color = 'success';
    toast.value.message = 'Transfer order proposal saved successfully.';
    toast.value.show = true;
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{ key: 'updated_at', order: 'desc' }],
        search: props.search
    });
}


const closePalletModal = () => {
    palletModalOpen.value = false;
    selectedItemForPallet.value = null;
};

const savePalletAssignment = async ({ pallets, transport_number }) => {
    if (!selectedItemForPallet.value) return;

    isSaving.value = true;

    // Construct Payload
    const payload = {
        pallets: pallets.map(p => ({ 
            physical_id: p.physical_id,
            batch: p.batch || null, // Keeps the batch info or sets it to null if missing
            quantity: p.quantity || 0 // Default to 0 if quantity is not provided
        })),
        material_code: parseInt(selectedItemForPallet.value?.material_code),
        quantity: parseFloat(selectedItemForPallet.value?.qty),
        po_number: selectedItemForPallet.value?.po_number,
        po_item: selectedItemForPallet.value?.po_item,
        plant: selectedItemForPallet.value?.supplying_plant,
        sloc: selectedItemForPallet.value?.issuing_sloc_sto,
        base_unit: selectedItemForPallet.value?.uom,
        receiving_plant: selectedItemForPallet.value?.plant,
        receiving_sloc: selectedItemForPallet.value?.storage_location,
        transport_number
    };

    try {
        await ApiService.post('transfers/assign-pallets', payload);

        Swal.fire({
            icon: 'success',
            title: 'Saved Successfully',
            text: 'Pallet assignment has been saved.',
            confirmButtonColor: '#00833c',
            confirmButtonText: '<span style="color: #ffffff;">OK</span>',
        });
        closePalletModal();
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
            title: 'Error Saving Pallet Assignment',
            text: error.response?.data?.message || 'Failed to assign pallets',
            confirmButtonColor: '#d33',
            confirmButtonText: '<span style="color: #ffffff;">OK</span>'
        });
    } finally {
        isSaving.value = false;
        palletModalOpen.value = false;
    }
};

const cancelConfirmationModal = ref(false);
const selectedCancelItem = ref(null)
const cancelReservation = async () => {
    selectedCancelItem.value = stoBatchPickingStore.selectedPoItem;
    cancelConfirmationModal.value = true;
};

const canUnreservePallet = computed(() =>
    authUserCan('can.sto.batch.pick.unreserve.pallet') || authStore.user?.is_super_admin
);
const reservedPalletItems = computed(() =>
    stoBatchPickingStore.selectedPoItem?.sto_transactions?.[0]?.items || []
);
const isPalletLocked = (item) => Boolean(item.truckscale_no && item.is_loaded);
const selectableReservedItems = computed(() =>
    reservedPalletItems.value.filter(item => !isPalletLocked(item))
);
const selectedUnreserveIds = ref([]);
const unreserveLoading = ref(false);
const allReservedSelected = computed(() =>
    selectableReservedItems.value.length > 0 && selectedUnreserveIds.value.length === selectableReservedItems.value.length
);
const toggleAllReserved = (checked) => {
    selectedUnreserveIds.value = checked ? selectableReservedItems.value.map(item => item.id) : [];
};

watch(viewReservedPallets, (open) => {
    if (!open) selectedUnreserveIds.value = [];
});

const unreserveConfirmationModal = ref(false);
const selectedUnreservePallets = computed(() =>
    reservedPalletItems.value.filter(item => selectedUnreserveIds.value.includes(item.id))
);

const unreservePallets = () => {
    if (!selectedUnreserveIds.value.length) return;
    unreserveConfirmationModal.value = true;
};

const confirmUnreservePallets = async () => {
    const po = stoBatchPickingStore.selectedPoItem;
    unreserveLoading.value = true;
    try {
        await ApiService.post('transfer-orders/unreserve-pallets', {
            po_number: po?.po_number,
            po_item: po?.po_item,
            sto_transaction_item_ids: selectedUnreserveIds.value,
        });
        Swal.fire({
            icon: 'success',
            title: 'Pallets Unreserved',
            confirmButtonColor: '#00833c',
            confirmButtonText: '<span style="color: #ffffff;">OK</span>',
        });
        viewReservedPallets.value = false;
        fetchStockTransferDetails();
    } catch (error) {
        console.error(error);
        Swal.fire({
            icon: 'error',
            title: 'Error Unreserving Pallets',
            text: error.response?.data?.message || 'Failed to unreserve pallets',
            confirmButtonColor: '#d33',
            confirmButtonText: '<span style="color: #ffffff;">OK</span>',
        });
    } finally {
        unreserveLoading.value = false;
        unreserveConfirmationModal.value = false;
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
    return value.replace(/^0+/, '');
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

        <template #item.transaction_number="{ item }">
            <v-chip v-if="!item.sto_transactions || item.sto_transactions.length === 0" 
                size="x-small" 
                label
                color="warning"
                variant="tonal"
            >
                PENDING
            </v-chip>
            <v-chip v-else size="x-small" label color="info"
                variant="tonal">{{item.sto_transactions?.[0].transaction_number}}</v-chip>
        </template>

        <template #item.po_item="{ item }">
            <span class="font-weight-bold mb-1">{{ item.po_item }}</span>
        </template>

        <template #item.plate_number="{ item }">
            <span class="font-weight-bold mb-1">{{ item.transport?.vehicle?.plate_number }}</span>
        </template>

        <template #item.driver_name="{ item }">
            <span class="font-weight-bold mb-1">{{ item.transport?.driver?.full_name }}</span>
        </template>

        <template #item.transport_number="{ item }">
            <span class="font-weight-bold mb-1">{{ item.transport?.transport_number }}</span>
        </template>

        <template #item.po_number="{ item }">
            <div class="d-flex flex-column py-3">
                <span class="font-weight-bold">{{ item.po_number }}</span>
                <span><small class="text-gray-400 text-muted">{{ item.purchase_order?.created_on }}</small></span>
            </div>
        </template>

        <template #item.pallet_assignment="{ item }">
            <div class="d-flex flex-column  g-1">
                <v-chip color="info" label small>
                    Reserved: <span class="font-weight-bold ml-1">{{ getReservedPallets(item).length }}</span>
                </v-chip>
                
                <v-chip color="primary" class="mt-1" label small>
                    &nbsp;&nbsp;&nbsp;Loaded: <span class="font-weight-bold ml-1">{{ getReservedPallets(item).filter(pallet => pallet.is_loaded).length }}</span>
                </v-chip>
            </div>
        </template>

        <template #item.batch_pick_status="{ item }">
            <v-chip v-if="item.batch_pick_status === 'Batch Picked'" size="x-small" label color="primary"
                variant="tonal">Batch Picked</v-chip>
            <v-chip v-else-if="item.batch_pick_status === 'No Batch Picked'" size="x-small" label color="error"
                variant="tonal">No Batch Picked</v-chip>
        </template>

        <template #item.material="{ item }">
            <div class="d-flex flex-column py-3 text-sm">
                <span class="font-weight-bold" v-if="item.material_code">{{ parseInt(item.material_code, 10) }}</span>
                <span v-if="item.material_description">{{ item.material_description }}</span>
            </div>
        </template>

        <template #item.from_plant_sloc="{ item }">
            <div class="d-flex flex-column mt-1">
                <span class="font-weight-bold text-sm">{{ item.supplying_order_plant?.plant_code }}</span>
                <span class="text-sm">{{ item.supplying_order_plant?.name }}</span>
            </div>
            <div class="d-flex flex-column py-1">
                <span class="font-weight-bold text-sm">{{ item.issuing_storage_location?.code }}</span>
                <span class="text-sm">{{ item.issuing_storage_location?.name }}</span>
            </div>
        </template>

        <template #item.to_plant_sloc="{ item }">
            <div class="d-flex flex-column mt-1">
                <span class="font-weight-bold text-sm">{{ item.receiving_order_plant?.plant_code }}</span>
                <span class="text-sm">{{ item.receiving_order_plant?.name }}</span>
            </div>
            <div class="d-flex flex-column py-1">
                <span class="font-weight-bold text-sm">{{ item.receiving_storage_location?.code }}</span>
                <span class="text-sm">{{ item.receiving_storage_location?.name }}</span>
            </div>
        </template>

        <template #item.storage_location="{ item }">
            <div class="d-flex flex-column py-3">
                <span class="font-weight-bold">{{ item.storage_location?.code }}</span>
                <span>{{ item.storage_location?.name }}</span>
            </div>
        </template>

        <template v-slot:[`item.po_qty`]="{ item }">
            <span>
                {{ Number(item.qty ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                }}
            </span>
        </template>


        <template v-slot:[`item.gi_quantity`]="{ item }">
            <span>
                {{ Number(item.gi_quantity ?? 0).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }) }}
            </span>
        </template>

        <template v-slot:[`item.remaining_qty`]="{ item }">
            <span>
                {{ Number(item.current_quantity ?? 0).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }) }}
            </span>
        </template>

        <template v-slot:[`item.gr_quantity`]="{ item }">
            <span>
                {{ Number(item.gr_quantity ?? 0).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }) }}
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

        <template #item.release_indicator="{ item }">
            {{ item.purchase_order?.release_indicator }}
        </template>

        <template #item.created_at="{ item }">
            {{ item.purchase_order?.created_at ? moment(item.purchase_order?.created_at).format('M/D/YY h:mm A') : '' }}
        </template>

        <!-- Actions -->
        <template #item.action="{ item }">
            <div class="d-flex justify-center gap-1">
                <v-menu location="end">
                    <template v-slot:activator="{ props }">
                        <v-btn icon="ri-more-2-line" variant="text" v-bind="props" color="grey"></v-btn>
                    </template>
                    <v-list>
                        <v-list-item prepend-icon="ri-hand" v-if="item.open_quantity > 0 && (authUserCan('can.sto.batch.pick') || authStore.user?.is_super_admin)" @click="handleAction(item, 'batch_pick')">Batch
                            Picking</v-list-item>
                        <!-- <v-list-item v-if="item.reserved_pallets && item.reserved_pallets.length > 0"
                            @click="handleAction(item, 'view_reserved_pallets')">View Reserved Pallets</v-list-item> -->
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

    <v-dialog v-model="cancelConfirmationModal" min-width="400px" max-width="600px">
        <v-card class="pa-6 rounded-lg" color="surface">
            <div class="text-center">
                <!-- Icon Indicator -->
                <v-icon
                    class="mb-4"
                    color="error"
                    icon="ri-close-circle-line"
                    size="80"
                ></v-icon>
                
                <h3 class="text-h5 font-weight-bold mb-2">Cancel Batch Reservation?</h3>
                <p class="text-body-1 text-medium-emphasis mb-5">
                    Are you sure you want to cancel this batch assignment? The pallets will be released and made
                    available for delivery batch reservation or another STO picking.
                </p>

                <!-- Metadata Details Container -->
                <v-card variant="flat" color="grey-lighten-4" class="pa-4 text-left rounded-md mb-6">
                    <v-row dense>
                        <v-col cols="5" class="font-weight-bold ">PO Number:</v-col>
                        <v-col cols="7">{{ selectedCancelItem?.po_number || 'N/A' }}</v-col>
                        
                        <v-col cols="5" class="font-weight-bold ">PO Item:</v-col>
                        <v-col cols="7">{{ selectedCancelItem?.po_item || 'N/A' }}</v-col>

                        <v-col cols="5" class="font-weight-bold ">Pallets to Cancel:</v-col>
                        <v-col cols="7">{{ selectedCancelItem?.sto_transactions?.[0]?.items?.length ?? 0 }}</v-col>

                        <!-- <v-col cols="5" class="font-weight-bold" v-if="selectedCancelItem.sto_transactions?.[0]?.transport_number !== 'N/A' || selectedCancelItem.transport_number !== null">Transport No:</v-col>
                        <v-col cols="7" v-if="selectedCancelItem.sto_transactions?.[0]?.transport_number !== 'N/A' || selectedCancelItem.transport_number !== null">{{ selectedCancelItem?.transport?.transport_number || 'N/A' }}</v-col>
                        
                        <v-col cols="5" class="font-weight-bold ">Plate Number:</v-col>
                        <v-col cols="7">{{ selectedCancelItem?.transport?.vehicle?.plate_number || 'N/A' }}</v-col>
                        
                        <v-col cols="5" class="font-weight-bold ">Driver Name:</v-col>
                        <v-col cols="7">
                            {{ selectedCancelItem?.transport?.driver?.full_name }} 
                        </v-col> -->
                        
                        <v-col cols="12">
                            <v-divider class="my-2" color="grey-darken-2"></v-divider>
                        </v-col>

                        <v-col cols="5" class="font-weight-bold text-body-2 text-primary">
                            Reserved Batches:
                        </v-col>
                        <v-col cols="7" class="text-body-2 d-flex flex-wrap gap-1">
                            <!-- Filter out null/empty batches, grab unique codes, and render as chips -->
                            <template v-if="selectedCancelItem?.sto_transactions?.length > 0">
                                <v-chip
                                    v-for="batchObj in [...new Map(selectedCancelItem.sto_transactions.flatMap(t => t.batch || []).map(b => [b.batch, b])).values()]"
                                    :key="batchObj.batch"
                                    color="primary"
                                    variant="outlined"
                                    density="comfortable"
                                    class="ma-1"
                                >
                                    {{ batchObj.batch }}
                                </v-chip>
                            </template>
                            <span v-else style="color: #ffd166;">N/A</span>
                        </v-col>
                    </v-row>
                </v-card>

                <!-- Action Buttons -->
                <div class="d-flex justify-end align-center mt-4">
                    <v-btn 
                        color="secondary" 
                        variant="outlined" 
                        @click="cancelConfirmationModal = false" 
                        class="px-6 mr-3"
                    >
                        Cancel
                    </v-btn>
                    <v-btn 
                        color="error" 
                        @click="cancelProposal" 
                        :loading="cancelProposalLoading" 
                        class="px-6"
                    >
                        Yes, Proceed
                    </v-btn>
                </div>
            </div>
        </v-card>
    </v-dialog>

    <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event" />
    <Loader :show="isLoading || saveLoading" />
    <PalletAssignModal 
        :show="palletModalOpen" 
        :item="selectedItemForPallet"
        :loading="isSaving"
        :stock-transfer="stoData"
        @close="closePalletModal"
        @save="savePalletAssignment"
        @updated="fetchStockTransferDetails"
    />

    <v-dialog v-model="assignTruckscaleDialog" max-width="1350px" scrollable>
        <v-card>
            <v-card-title class="d-flex justify-space-between align-center px-6 pt-6">
                <div>
                    <div class="text-h5 font-weight-bold">Assign Truckscale</div>
                    <div class="text-body-2 text-medium-emphasis mt-1">
                        Choose a truckscale for the pallets reserved against this STO item.
                    </div>
                </div>
                <v-btn icon="ri-close-line" variant="text" aria-label="Close dialog"
                    @click="assignTruckscaleDialog = false"></v-btn>
            </v-card-title>
            <v-card-text class="px-6">
                <v-row dense class="mb-2">
                    <v-col cols="6" sm="3">
                        <div class="text-caption text-medium-emphasis">STO Number</div>
                        <div class="font-weight-bold">{{ selectedTruckscaleItem?.po_number || '-' }}</div>
                    </v-col>
                    <v-col cols="6" sm="3">
                        <div class="text-caption text-medium-emphasis">PO Item</div>
                        <div class="font-weight-bold">{{ selectedTruckscaleItem?.po_item || '-' }}</div>
                    </v-col>
                    <v-col cols="6" sm="3">
                        <div class="text-caption text-medium-emphasis">Available pallets</div>
                        <div class="font-weight-bold">{{ availablePalletCount }}</div>
                    </v-col>
                </v-row>

                <v-alert type="info" variant="tonal" density="comfortable" class="mb-4">
                    Choose a truckscale, then select unassigned pallets to assign to it.
                </v-alert>

                <v-alert
                    v-if="truckscalesError"
                    type="error"
                    variant="tonal"
                    density="comfortable"
                    class="mb-4"
                >
                    {{ truckscalesError }}
                </v-alert>

                <v-select
                    v-model="selectedTruckscale"
                    :items="truckscales"
                    item-title="truckscale_no"
                    item-value="truckscale_no"
                    label="Truckscale"
                    placeholder="Select a truckscale"
                    prepend-inner-icon="ri-scales-3-line"
                    variant="outlined"
                    density="comfortable"
                    clearable
                    width="50%"
                    class="mb-4"
                    :loading="truckscalesLoading"
                    :disabled="truckscalesLoading || Boolean(truckscalesError)"
                    no-data-text="No truckscales available for this STO"
                    @update:model-value="selectedTruckscalePalletIds = []"
                />

                <v-card
                    v-if="selectedTruckscaleDetails"
                    variant="outlined"
                    class="mb-5"
                >
                    <v-card-text class="pa-4">
                        <!-- Truckscale -->
                        <div class="d-flex align-center ga-2 mb-3">
                            <v-icon icon="ri-scales-3-line" size="18" class="text-medium-emphasis"></v-icon>
                            <span class="text-caption text-medium-emphasis text-uppercase" style="letter-spacing: 0.05em;">Truckscale</span>
                            <span class="font-weight-bold">{{ selectedTruckscaleDetails.truckscale_no }}</span>
                        </div>

                        <!-- Transport (priority) -->
                        <div
                            v-if="selectedTruckscaleDetails.transport_id"
                            class="d-flex align-center justify-space-between flex-wrap ga-3 pa-3 mb-3 rounded border-primary"
                            style="border: 1px solid rgb(var(--v-theme-primary)); border-left-width: 4px;"
                        >
                            <div class="d-flex align-center ga-3 min-width-0">
                                <v-icon icon="ri-route-line" size="24" color="primary"></v-icon>
                                <div class="min-width-0">
                                    <div class="text-caption text-medium-emphasis text-uppercase" style="letter-spacing: 0.05em;">Transport No.</div>
                                    <div class="text-h6 font-weight-bold text-primary text-truncate">
                                        {{ selectedTruckscaleDetails.transport?.transport_number || '—' }}
                                    </div>
                                </div>
                            </div>
                            <div class="d-flex align-start ga-2 text-body-2 text-medium-emphasis" style="max-width: 280px;">
                                <v-icon icon="ri-information-line" size="20" color="info" class="mt-1"></v-icon>
                                <span><span class="font-weight-bold">ALC-Managed:</span> Please process GI-STO on MM Transport Screen.</span>
                            </div>
                        </div>
                        <div
                            v-else
                            class="d-flex align-center ga-3 pa-3 mb-3 rounded text-medium-emphasis"
                            style="border: 1px dashed rgba(var(--v-border-color), var(--v-border-opacity));"
                        >
                            <v-icon icon="ri-link-unlink" size="24" color="warning"></v-icon>
                            <span class="text-body-2">No transport assigned</span>
                        </div>

                        <!-- Driver & Plate -->
                        <v-row dense class="mb-1">
                            <v-col cols="12" sm="6">
                                <div class="d-flex align-center ga-2">
                                    <v-icon icon="ri-user-line" size="18" class="text-medium-emphasis"></v-icon>
                                    <div class="min-width-0">
                                        <div class="text-caption text-medium-emphasis">Driver</div>
                                        <div class="font-weight-medium text-truncate">{{ selectedTruckscaleDetails.driver_name || '—' }}</div>
                                    </div>
                                </div>
                            </v-col>
                            <v-col cols="12" sm="6">
                                <div class="d-flex align-center ga-2">
                                    <v-icon icon="ri-car-line" size="18" class="text-medium-emphasis"></v-icon>
                                    <div class="min-width-0">
                                        <div class="text-caption text-medium-emphasis">Plate No.</div>
                                        <div class="font-weight-medium text-truncate">{{ selectedTruckscaleDetails.plate_number || '—' }}</div>
                                    </div>
                                </div>
                            </v-col>
                        </v-row>

                        <v-divider class="my-3"></v-divider>

                        <!-- Weights -->
                        <v-row dense>
                            <v-col cols="4">
                                <div class="d-flex align-center ga-1 text-caption text-medium-emphasis">
                                    <v-icon icon="ri-arrow-down-line" size="14"></v-icon>Tare
                                </div>
                                <div class="font-weight-medium">{{ numberWithComma(selectedTruckscaleDetails.tare_weight) ?? '—' }}</div>
                            </v-col>
                            <v-col cols="4">
                                <div class="d-flex align-center ga-1 text-caption text-medium-emphasis">
                                    <v-icon icon="ri-arrow-up-line" size="14"></v-icon>Gross
                                </div>
                                <v-chip v-if="!Number(selectedTruckscaleDetails.gross_weight)" size="x-small" label color="warning" variant="tonal" prepend-icon="ri-time-line">Pending</v-chip>
                                <div v-else class="font-weight-medium">{{ numberWithComma(selectedTruckscaleDetails.gross_weight) }}</div>
                            </v-col>
                            <v-col cols="4">
                                <div class="d-flex align-center ga-1 text-caption text-primary">
                                    <v-icon icon="ri-scales-line" size="14"></v-icon>Net (outgoing)
                                </div>
                                <v-chip v-if="!Number(selectedTruckscaleDetails.outgoing_net_weight)" size="x-small" label color="warning" variant="tonal" prepend-icon="ri-time-line">Pending</v-chip>
                                <div v-else class="text-subtitle-1 font-weight-bold text-primary">{{ numberWithComma(selectedTruckscaleDetails.outgoing_net_weight) }}</div>
                            </v-col>
                        </v-row>
                    </v-card-text>
                </v-card>

                <div class="d-flex align-center justify-space-between mb-2">
                    <div>
                        <div class="text-subtitle-1 font-weight-bold">Select pallets</div>
                        <div class="text-body-2 text-medium-emphasis">
                            {{ selectedTruckscale ? 'Choose unassigned pallets to send to this truckscale.' : 'Select a truckscale to enable pallet selection.' }}
                        </div>
                    </div>
                    <v-chip size="small" color="primary" variant="tonal">
                        {{ selectedTruckscalePalletIds.length }} selected
                    </v-chip>
                </div>
           
                <v-table v-if="assignedPallets.length" density="comfortable" class="border rounded">
                    <thead>
                        <tr>
                            <th class="text-center">Select</th>
                            <th>Physical ID</th>
                            <th>Material</th>
                            <th>Batch Code</th>
                            <th>Mfg Date</th>
                            <th class="text-center">Qty</th>
                            <th class="text-center">Truckscale No.</th>
                            <th class="text-center">Loaded</th>
                            <th>
                                <span>Transfer</span><br/>
                                <span>Request #</span>
                            </th>
                            <th>
                                <span>Transfer</span><br/>
                                <span>Order #</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(pallet, index) in assignedPallets" :key="`${pallet.physical_id || 'pallet'}-${index}`">
                            <td class="text-center">
                                <v-checkbox-btn
                                    v-model="selectedTruckscalePalletIds"
                                    :value="pallet.physical_id"
                                    :disabled="!selectedTruckscale || Boolean(pallet.truckscale_no) || !pallet.physical_id"
                                    :aria-label="`Select pallet ${pallet.physical_id || ''}`"
                                />
                            </td>
                            <td class="font-weight-medium">{{ pallet.physical_id || '-' }}</td>
                            <td>
                                <span class="font-weight-bold">{{ pallet.material_code }}</span><br />
                                <span v-if="pallet.material_description" class="text-subtitle-1">{{ pallet.material_description }}</span>
                            </td>
                            <td>{{ pallet.batch || '-' }}</td>
                            <td>{{ pallet.mfg_date ? moment(pallet.mfg_date).format('YYYY-MM-DD') : '-' }}</td>
                            <td class="text-center">{{ pallet.quantity ?? '-' }} {{ pallet.uom || '' }}</td>
                            <td class="text-center">
                                <v-chip
                                    v-if="pallet.truckscale_no"
                                    color="primary"
                                    label
                                    small
                                >
                                    {{ pallet.truckscale_no }}
                                </v-chip>
                                <v-chip
                                    v-else
                                    :color="selectedTruckscale ? 'success' : 'warning'"
                                    variant="tonal"
                                    size="x-small"
                                >
                                    {{ selectedTruckscale ? 'AVAILABLE' : 'NOT ASSIGNED' }}
                                </v-chip>
                            </td>
                             <td class="text-center">
                                <i v-if="pallet.is_loaded" style="font-size: 30px; background-color: green;"
                                    class="ri-checkbox-circle-line"></i>
                                <i v-else style="font-size: 30px; background-color: #FF4C51;" class="ri-close-circle-line"></i>
                            </td>
                            <td>{{ pallet.transfer_request?.transfer_request_id || '-' }}</td>
                            <td>{{ pallet.transfer_request?.transfer_order?.transfer_order_id || '-' }}</td>
                        </tr>
                    </tbody>
                </v-table>
                <v-card v-else variant="tonal" class="pa-6 text-center">
                    <v-icon icon="ri-inbox-line" size="32" color="medium-emphasis" class="mb-2"></v-icon>
                    <div class="text-body-1 font-weight-medium">No assigned pallets found</div>
                    <div class="text-body-2 text-medium-emphasis">This STO item has no pallet records to assign.</div>
                </v-card>
            </v-card-text>
            <v-card-actions class="px-6 pb-6">
                <v-spacer />
                <v-btn variant="outlined" color="secondary" @click="assignTruckscaleDialog = false">Close</v-btn>
                <v-btn
                    color="primary"
                    prepend-icon="ri-check-line"
                    :disabled="!selectedTruckscale || !selectedTruckscalePalletIds.length"
                    :loading="isSavingTruckscale"
                    @click="saveTruckscaleAssignment"
                >
                    Assign {{ selectedTruckscalePalletIds.length || '' }} {{ selectedTruckscalePalletIds.length === 1 ? 'Pallet' : 'Pallets' }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>

    <v-dialog v-model="viewReservedPallets" max-width="1400px">
        <v-card elevation="2">
            <v-card-title class="d-flex justify-space-between align-center mx-4 px-4 mt-6">
                <div class="text-h4 font-weight-bold ps-2 text-primary">
                    Reserved Pallets
                </div>
                <v-btn icon="ri-close-line" variant="text" @click="viewReservedPallets = false"></v-btn>
            </v-card-title>
            <v-card-text>
                <v-row dense class="mx-4 mb-2">
                    <v-col cols="6" md="3">
                        <div class="text-caption text-medium-emphasis">PO Number</div>
                        <div class="font-weight-bold">{{ stoBatchPickingStore.selectedPoItem?.po_number || '-' }}</div>
                    </v-col>
                    <v-col cols="6" md="3">
                        <div class="text-caption text-medium-emphasis">PO Item</div>
                        <div class="font-weight-bold">{{ stoBatchPickingStore.selectedPoItem?.po_item || '-' }}</div>
                    </v-col>
                    <v-col cols="6" md="3">
                        <div class="text-caption text-medium-emphasis">PO Quantity</div>
                        <div class="font-weight-bold">
                            {{ Number(stoBatchPickingStore.selectedPoItem?.qty ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                            {{ stoBatchPickingStore.selectedPoItem?.uom || '' }}
                        </div>
                    </v-col>
                    <v-col cols="6" md="3">
                        <div class="text-caption text-medium-emphasis">GI Quantity</div>
                        <div class="font-weight-bold">
                            {{ Number(stoBatchPickingStore.selectedPoItem?.gi_quantity ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                            {{ stoBatchPickingStore.selectedPoItem?.uom || '' }}
                        </div>
                    </v-col>
                </v-row>
                <v-row dense class="mx-4 mb-4">
                    <v-col cols="6" md="3">
                        <div class="text-caption text-medium-emphasis">Material Code</div>
                        <div class="font-weight-bold">{{ removeLeadingZeros(stoBatchPickingStore.selectedPoItem?.material_code) || '-' }}</div>
                    </v-col>
                    <v-col cols="6" md="3">
                        <div class="text-caption text-medium-emphasis">Material Description</div>
                        <div class="font-weight-bold">{{ stoBatchPickingStore.selectedPoItem?.material_description || '-' }}</div>
                    </v-col>
                    <v-col cols="6" md="3">
                        <div class="text-caption text-medium-emphasis">Open Quantity</div>
                        <div class="font-weight-bold">
                            {{ Number(stoBatchPickingStore.selectedPoItem?.open_quantity ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                            {{ stoBatchPickingStore.selectedPoItem?.uom || '' }}
                        </div>
                    </v-col>
                </v-row>
                <v-table density="comfortable" class="elevation-0 border mx-4">
                    <thead>
                        <tr>
                            <th v-if="canUnreservePallet" style="width: 48px;">
                                <v-checkbox-btn
                                    :model-value="allReservedSelected"
                                    :indeterminate="selectedUnreserveIds.length > 0 && !allReservedSelected"
                                    :disabled="selectableReservedItems.length === 0"
                                    density="compact"
                                    @update:model-value="toggleAllReserved"
                                />
                            </th>
                            <th>Physical ID</th>
                            <th>Batch</th>
                            <th>Mfg Date</th>
                            <th class="text-center">
                                <span>Quantity</span><br/>
                                <span>& UOM</span>
                            </th>
                            <th class="text-center">
                                <span>Truckscale</span><br/>
                                <span>No.</span>
                            </th>
                            <th class="text-center">Bin Location</th>
                            <th class="text-center">Layer</th>
                            <th class="text-center">Loaded</th>
                            <th>
                                <span>Transfer</span><br/>
                                <span>Request #</span>
                            </th>
                            <th>
                                <span>Transfer</span><br/>
                                <span>Order #</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(item, index) in reservedPalletItems" :key="item.id ?? index">
                            <td v-if="canUnreservePallet">
                                <v-checkbox-btn v-model="selectedUnreserveIds" :value="item.id" density="compact" :disabled="isPalletLocked(item)" />
                            </td>
                            <td>{{ item.physical_id }}</td>
                            <td>{{ item.batch }}</td>
                            <td>{{ item.mfg_date ? moment(item.mfg_date).format('YYYY-MM-DD') : '-'}}</td>
                            <td class="text-center">{{ item.quantity }} {{ item.uom }}</td>
                            <td class="text-center">
                                <v-chip
                                    v-if="item.truckscale_no"
                                    color="primary"
                                    label
                                    small
                                >
                                    {{ item.truckscale_no }}
                                </v-chip>
                                <v-chip
                                    v-else
                                    variant="tonal"
                                    size="x-small"
                                    style="color: #424242 !important; background-color: #FFB400;" 
                                >
                                    {{ 'NOT ASSIGNED' }}
                                </v-chip>
                            </td>
                            <td class="text-center">{{ item.bin_location || '-' }}</td>
                            <td class="text-center">{{ item.layer_position || '-' }}</td>
                            <td class="text-center">
                                <i v-if="item.is_loaded" style="font-size: 30px; background-color: green;"
                                    class="ri-checkbox-circle-line"></i>
                                <i v-else style="font-size: 30px; background-color: #FF4C51;" class="ri-close-circle-line"></i>
                            </td>
                            <td>{{ item.transfer_request?.transfer_request_id || '-' }}</td>
                            <td>{{ item.transfer_request?.transfer_order?.transfer_order_id || '-' }}</td>
                        </tr>
                    </tbody>
                </v-table>
                <div class="d-flex justify-end mt-8 mx-4">
                    <v-btn
                        v-if="canUnreservePallet"
                        color="warning"
                        variant="tonal"
                        style="color: #424242 !important; background-color: #FFB400;" 
                        class="me-auto"
                        prepend-icon="ri-lock-unlock-line"
                        :disabled="!selectedUnreserveIds.length"
                        :loading="unreserveLoading"
                        type="button"
                        @click="unreservePallets"
                    >Unreserve Pallet{{ selectedUnreserveIds.length > 1 ? 's' : '' }}<template v-if="selectedUnreserveIds.length"> ({{ selectedUnreserveIds.length }})</template></v-btn>
                    <v-btn color="secondary" variant="outlined" @click="viewReservedPallets = false"
                        type="button">Close</v-btn>
                    <v-btn v-if="authUserCan('can.cancel.sto.batch.pick') || authStore.user?.is_super_admin" color="error" class="ml-3" @click="cancelReservation" type="button">Cancel
                        Reservation</v-btn>
                </div>
            </v-card-text>
        </v-card>
    </v-dialog>

    <v-dialog v-model="unreserveConfirmationModal" max-width="620px" :persistent="unreserveLoading">
        <v-card class="rounded-lg overflow-hidden">
            <v-card-text class="pa-6">
                <div class="d-flex align-start ga-4 mb-5">
                    <v-avatar color="warning" variant="tonal" size="52">
                        <v-icon icon="ri-lock-unlock-line" size="28"></v-icon>
                    </v-avatar>
                    <div>
                        <h3 class="text-h5 font-weight-bold mb-1">Unreserve Pallets?</h3>
                        <p class="text-body-1 text-medium-emphasis mb-0">
                            The selected pallets will be released from this STO and become available for sales picking or other STO reservations.
                        </p>
                    </div>
                </div>

                <div class="d-flex ga-6 mb-4">
                    <div>
                        <div class="text-caption text-medium-emphasis">PO Number</div>
                        <div class="font-weight-bold">{{ stoBatchPickingStore.selectedPoItem?.po_number || 'N/A' }}</div>
                    </div>
                    <div>
                        <div class="text-caption text-medium-emphasis">PO Item</div>
                        <div class="font-weight-bold">{{ stoBatchPickingStore.selectedPoItem?.po_item || 'N/A' }}</div>
                    </div>
                    <div>
                        <div class="text-caption text-medium-emphasis">Pallets</div>
                        <div class="font-weight-bold text-warning">{{ selectedUnreserveIds.length }}</div>
                    </div>
                </div>

                <div class="rounded border pa-2 mb-5" style="max-height: 160px; overflow-y: auto;">
                    <div
                        v-for="pallet in selectedUnreservePallets"
                        :key="pallet.id"
                        class="d-flex align-center justify-space-between py-1 px-1"
                    >
                        <div class="d-flex align-center ga-2">
                            <v-icon icon="ri-stack-line" size="16" class="text-medium-emphasis"></v-icon>
                            <span class="font-weight-medium">{{ pallet.physical_id }}</span>
                        </div>
                        <v-chip size="x-small" label variant="tonal" color="primary">{{ pallet.batch || '-' }}</v-chip>
                    </div>
                </div>

                <div class="d-flex justify-end">
                    <v-btn
                        variant="outlined"
                        color="secondary"
                        class="px-6 me-3"
                        :disabled="unreserveLoading"
                        @click="unreserveConfirmationModal = false"
                    >Cancel</v-btn>
                    <v-btn
                        color="warning"
                        class="px-6"
                        style="color: #424242 !important; background-color: #FFB400;" 
                        prepend-icon="ri-lock-unlock-line"
                        :loading="unreserveLoading"
                        @click="confirmUnreservePallets"
                    >Yes, Unreserve</v-btn>
                </div>
            </v-card-text>
        </v-card>
    </v-dialog>
  
</template>

<style scoped>
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
