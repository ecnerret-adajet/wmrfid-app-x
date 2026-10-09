<script setup>
import Loader from '@/components/Loader.vue';
import Toast from '@/components/Toast.vue';
import { useAuthorization } from '@/composables/useAuthorization';
import ApiService from '@/services/ApiService';
import { useAuthStore } from '@/stores/auth';
import { useStoBatchPickingStore } from '@/stores/stoBatchPickingStore';
import axios from 'axios';
import moment from 'moment';
import Swal from 'sweetalert2';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { VDataTableServer } from 'vuetify/components';
import BatchPickSelectionModal from './BatchPickSelectionModal.vue';
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

const headers = [
    {
        title: '',
        key: 'action',
        align: 'center',
        sortable: false,
    },
    {
        title: 'TRANSACTION NO.',
        key: 'transport_number',
        align: 'center',
        sortable: false,
    },
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
        title: 'PLATE NO.',
        key: 'plate_number',
        align: 'center',
        sortable: false,
        width: '90px'
    },
    {
        title: 'DRIVER NAME',
        key: 'driver_name',
        align: 'center',
        sortable: false,
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
    {
        title: 'GR qty',
        key: 'gr_quantity',
        align: 'center',
        sortable: false,
    },
    {
        title: 'GR Remaining qty',
        key: 'gr_remaining_qty',
        align: 'center',
        sortable: false,
    },
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
            is_alc_managed: false
        }
    })
        .then((response) => {
            totalItems.value = response.data.total;
            serverItems.value = response.data.data
            loading.value = false

            emits('pagination-changed', { page, itemsPerPage, sortBy: sortQuery.value, search: props.search });
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

const handleAction = async (sto, action) => {
    stoData.value = sto;
    selectedItemForPallet.value = sto
    if (action == 'batch_pick') {
        batchPickModalOpen.value = true;
    } else if (action == 'view_reserved_pallets') {
        viewReservedPallets.value = true;
    } else if (action == 'pallet_assignment') {
        try {
            isLoading.value = true;
            // Call the API endpoint (adjust the URL/payload format if needed)
            const response = await axios.get(`transfers/check-sto-batch-picked/${sto.purchase_order_item?.po_number}/${sto.purchase_order_item?.po_item}`);

            // If the API returns true directly or inside data (e.g., response.data === true)
            if (response.data?.batch_picked) {
                palletModalOpen.value = true;
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

const selectedTransportId = ref(null);

const batchPickModalOpen = ref(false);

const closeBatchPickModal = () => {
    batchPickModalOpen.value = false;
};

const saveLoading = ref(false)
const handleBatchPickSave = async ({ transport, batches, is_alc_managed }) => {
    // 1. Extract route parameters (or replace with your component state variables, e.g., stoData.value.po_number)
    const poNumber = stoData.value?.purchase_order_item?.po_number;
    const poItem = stoData.value?.purchase_order_item?.po_item;
    saveLoading.value = true;
    try {
        // 2. Build the dynamic endpoint URL and send the POST request
        const response = await ApiService.post(`transfer-orders/sto-batch-pick/${poNumber}/${poItem}/save`, {
            transport: transport,
            batches: batches,
            is_alc_managed: is_alc_managed,
            material_code: stoData.value?.purchase_order_item?.material_code,
            plant: stoData.value?.purchase_order_item?.supplying_order_plant?.plant_code
        });

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
        material_code: parseInt(selectedItemForPallet.value?.purchase_order_item?.material_code),
        quantity: parseFloat(selectedItemForPallet.value?.purchase_order_item?.qty),
        po_number: selectedItemForPallet.value?.purchase_order_item?.po_number,
        po_item: selectedItemForPallet.value?.purchase_order_item?.po_item,
        plant: selectedItemForPallet.value?.purchase_order_item?.supplying_plant,
        sloc: selectedItemForPallet.value?.purchase_order_item?.issuing_sloc_sto,
        base_unit: selectedItemForPallet.value?.purchase_order_item?.uom,
        receiving_plant: selectedItemForPallet.value?.purchase_order_item?.plant,
        receiving_sloc: selectedItemForPallet.value?.purchase_order_item?.storage_location,
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
    }
};

const cancelConfirmationModal = ref(false);
const selectedCancelItem = ref(null)
const cancelReservation = async ({ item }) => {
    console.log(item)
    selectedCancelItem.value = item;
    cancelConfirmationModal.value = true;
};

const cancelReserveLoading = ref(false);
const cancelReserve = async () => {
    cancelReserveLoading.value = true;
    try {
        // Call your API to cancel the reservation
        await ApiService.post('transfer-orders/transfer-order-remove', {
            po_number: selectedCancelItem.value?.purchase_order_item?.po_number,
            po_item: selectedCancelItem.value?.purchase_order_item?.po_item,
            transport_number: selectedCancelItem.value.transport?.transport_number
        });

        Swal.fire({
            icon: 'success',
            title: 'Batch Reservation Cancelled Successfully',
            text: 'The batch reservation has been cancelled.',
            confirmButtonColor: '#00833c',
            confirmButtonText: '<span style="color: #ffffff;">OK</span>',
        });
        cancelConfirmationModal.value = false;
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
        cancelReserveLoading.value = false;
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
            <span class="font-weight-bold mb-1">{{ item.purchase_order_item?.po_item }}</span>
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
                <span class="font-weight-bold">{{ item.purchase_order_item?.po_number }}</span>
                <span><small class="text-gray-400 text-muted">{{ item.purchase_order_item?.purchase_order?.created_on }}</small></span>
            </div>
        </template>

        <template #item.pallet_assignment="{ item }">
            <v-chip v-if="item.pallet_assignment === 'Completed'" size="x-small" label color="primary"
                variant="tonal">Completed</v-chip>
            <v-chip v-else-if="item.pallet_assignment === 'Pending'" size="x-small" label color="warning"
                variant="tonal">Pending</v-chip>
            <v-chip v-else-if="item.pallet_assignment === 'Partial'" size="x-small" label color="info"
                variant="tonal">Partial</v-chip>
        </template>

        <template #item.batch_pick_status="{ item }">
            <v-chip v-if="item.batch_pick_status === 'Batch Picked'" size="x-small" label color="primary"
                variant="tonal">Batch Picked</v-chip>
            <v-chip v-else-if="item.batch_pick_status === 'No Batch Picked'" size="x-small" label color="error"
                variant="tonal">No Batch Picked</v-chip>
        </template>

        <template #item.material="{ item }">
            <div class="d-flex flex-column py-3 text-sm">
                <span class="font-weight-bold" v-if="item.purchase_order_item?.material_code">{{ parseInt(item.purchase_order_item?.material_code, 10) }}</span>
                <span v-if="item.purchase_order_item?.material_description">{{ item.purchase_order_item?.material_description }}</span>
            </div>
        </template>

        <template #item.from_plant_sloc="{ item }">
            <div class="d-flex flex-column mt-1">
                <span class="font-weight-bold text-sm">{{ item.purchase_order_item?.supplying_order_plant?.plant_code }}</span>
                <span class="text-sm">{{ item.purchase_order_item?.supplying_order_plant?.name }}</span>
            </div>
            <div class="d-flex flex-column py-1">
                <span class="font-weight-bold text-sm">{{ item.purchase_order_item?.issuing_storage_location?.code }}</span>
                <span class="text-sm">{{ item.purchase_order_item?.issuing_storage_location?.name }}</span>
            </div>
        </template>

        <template #item.to_plant_sloc="{ item }">
            <div class="d-flex flex-column mt-1">
                <span class="font-weight-bold text-sm">{{ item.purchase_order_item?.receiving_order_plant?.plant_code }}</span>
                <span class="text-sm">{{ item.purchase_order_item?.receiving_order_plant?.name }}</span>
            </div>
            <div class="d-flex flex-column py-1">
                <span class="font-weight-bold text-sm">{{ item.purchase_order_item?.receiving_storage_location?.code }}</span>
                <span class="text-sm">{{ item.purchase_order_item?.receiving_storage_location?.name }}</span>
            </div>
        </template>

        <template #item.storage_location="{ item }">
            <div class="d-flex flex-column py-3">
                <span class="font-weight-bold">{{ item.purchase_order_item?.storage_location?.code }}</span>
                <span>{{ item.purchase_order_item?.storage_location?.name }}</span>
            </div>
        </template>

        <template v-slot:[`item.po_qty`]="{ item }">
            <span>
                {{ Number(item.purchase_order_item?.qty ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
            {{ item.purchase_order_item?.commercial_uom?.commercial_uom }}
        </template>

        <template #item.release_indicator="{ item }">
            {{ item.purchase_order_item?.purchase_order?.release_indicator }}
        </template>

        <template #item.created_at="{ item }">
            {{ item.purchase_order_item?.purchase_order?.created_at ? moment(item.purchase_order_item?.purchase_order?.created_at).format('M/D/YY h:mm A') : '' }}
        </template>

        <!-- Actions -->
        <template #item.action="{ item }">
            <div class="d-flex justify-center gap-1">
                <v-menu location="end">
                    <template v-slot:activator="{ props }">
                        <v-btn icon="ri-more-2-line" variant="text" v-bind="props" color="grey"></v-btn>
                    </template>
                    <v-list>
                        <v-list-item v-if="item.open_quantity > 0 && (authUserCan('can.sto.batch.pick') || authStore.user?.is_super_admin)" @click="handleAction(item, 'batch_pick')">Batch
                            Picking</v-list-item>
                        <!-- <v-list-item v-if="item.reserved_pallets && item.reserved_pallets.length > 0"
                            @click="handleAction(item, 'view_reserved_pallets')">View Reserved Pallets</v-list-item> -->
                        <v-list-item  @click="handleAction(item, 'pallet_assignment')">Pallet Assignment</v-list-item>
                    </v-list>
                </v-menu>
            </div>
        </template>
    </VDataTableServer>

    <BatchPickSelectionModal
        :show="batchPickModalOpen"
        :item="stoData"
        @close="closeBatchPickModal"
        @save="handleBatchPickSave"
        @cancel-reservation="cancelReservation"
    />

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
                <p class="text-body-2 text-medium-emphasis mb-5">
                    Are you sure you want to cancel this batch assignment? This action cannot be undone.
                </p>

                <!-- Metadata Details Container -->
                <v-card variant="flat" color="grey-lighten-4" class="pa-4 text-left rounded-md mb-6">
                    <v-row dense>
                        <v-col cols="5" class="font-weight-bold ">PO Number:</v-col>
                        <v-col cols="7">{{ selectedCancelItem?.purchase_order_item?.po_number || 'N/A' }}</v-col>
                        
                        <v-col cols="5" class="font-weight-bold ">PO Item:</v-col>
                        <v-col cols="7">{{ selectedCancelItem?.purchase_order_item?.po_item || 'N/A' }}</v-col>
                        
                        <v-col cols="5" class="font-weight-bold ">Transport No:</v-col>
                        <v-col cols="7">{{ selectedCancelItem?.transport?.transport_number || 'N/A' }}</v-col>
                        
                        <v-col cols="5" class="font-weight-bold ">Plate Number:</v-col>
                        <v-col cols="7">{{ selectedCancelItem?.transport?.vehicle?.plate_number || 'N/A' }}</v-col>
                        
                        <v-col cols="5" class="font-weight-bold ">Driver Name:</v-col>
                        <v-col cols="7">
                            {{ selectedCancelItem?.transport?.driver?.full_name }} 
                        </v-col>
                        
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
                        @click="cancelReserve" 
                        :loading="cancelReserveLoading" 
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
