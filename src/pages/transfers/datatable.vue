<script setup>
import Toast from '@/components/Toast.vue';
import { numberWithComma } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import { useStoBatchPickingStore } from '@/stores/stoBatchPickingStore';
import moment from 'moment';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { VDataTableServer } from 'vuetify/components';
import BatchPick from './batchPick.vue';

const stoBatchPickingStore = useStoBatchPickingStore();
const emits = defineEmits(['pagination-changed']);

const props = defineProps({
    search: {
        type: String,
        default: ''
    },
});

const router = useRouter();

const isLoading = ref(false);
const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref('-created_at'); // Default sort
const filters = ref(null);
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
        title: 'PO ITEM',
        key: 'po_item',
        align: 'center',
    },
    {
        title: 'PO NUMBER',
        key: 'po_number',
    },
    {
        title: 'Material',
        key: 'material',
        sortable: false,
        width: '50px'
    },
    {
        title: 'From',
        key: 'from_plant_sloc',
    },
    {
        title: 'To',
        key: 'to_plant_sloc',
    },
    {
        title: 'UOM',
        key: 'uom',
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

]

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

    ApiService.query('datatable/purchase-orders', {
        params: {
            page,
            itemsPerPage,
            sort: sortQuery.value,
            search: props.search,
            filters: filters.value
        }
    })
        .then((response) => {
            totalItems.value = response.data.total;
            serverItems.value = response.data.data
            console.log(serverItems.value);
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
const viewTransports = ref(false);
const transports = ref([]);
const handleAction = (sto, action) => {
    stoData.value = sto;
    if (action == 'batch_pick') {
        // showReservedPallets.value = true;
        viewTransports.value = true;
        fetchTransports()
    } else if (action == 'view_reserved_pallets') {
        viewReservedPallets.value = true;
    }

}

const transportLoading = ref(false)
const fetchTransports = async (searchQuery = '') => {
    transportLoading.value = true;
    try {
        const response = await ApiService.query(`transfer-orders/get-transports/${stoData?.value?.po_number}/${stoData?.value?.po_item}`, {

        });
        transports.value = response.data.transports;
        console.log(transports.value)
    } catch (error) {
        console.error('Failed fetching transports:', error);
    } finally {
        transportLoading.value = false;
    }
};

const handleSelectBatch = () => {
    viewTransports.value = false;

    const selectedTransport = transports.value?.find(
        (item) => item.id === selectedTransportId.value
    );
    stoBatchPickingStore.selectedTransport = selectedTransport;

    showReservedPallets.value = true;
}

const selectedTransportId = ref(null);

watch(() => viewTransports.value, (isOpen) => {
    if (!isOpen) {
        selectedTransportId.value = null;
    }
});

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

defineExpose({
    loadItems,
    applyFilters
})
</script>

<template>
    <VDataTableServer v-model:items-per-page="itemsPerPage" fixed-header :headers="headers" :items="serverItems"
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
            <span class="font-weight-bold mb-1">{{ item.po_item }}</span><br />
            <v-chip v-if="item.rfid_batch_picking_status === 'Reserved'" size="x-small" label color="primary"
                variant="tonal">Reserved</v-chip>
            <v-chip v-else-if="item.rfid_batch_picking_status === 'Pending'" size="x-small" label color="warning"
                variant="tonal">Pending</v-chip>
            <v-chip v-else-if="item.rfid_batch_picking_status === 'Partial'" size="x-small" label color="info"
                variant="tonal">Pending</v-chip>
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

        <template #item.po_number="{ item }">
            <div class="d-flex flex-column py-3">
                <span class="font-weight-bold">{{ item.po_number }}</span>
                <span><small class="text-gray-400 text-muted">{{ item.purchase_order?.created_on }}</small></span>
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

        <!-- Actions -->
        <template #item.action="{ item }">
            <div class="d-flex justify-center gap-1">
                <v-menu location="end">
                    <template v-slot:activator="{ props }">
                        <v-btn icon="ri-more-2-line" variant="text" v-bind="props" color="grey"></v-btn>
                    </template>
                    <v-list>
                        <v-list-item v-if="item.open_quantity > 0" @click="handleAction(item, 'batch_pick')">Batch
                            Picking</v-list-item>
                        <v-list-item v-if="item.reserved_pallets && item.reserved_pallets.length > 0"
                            @click="handleAction(item, 'view_reserved_pallets')">View Reserved Pallets</v-list-item>
                    </v-list>
                </v-menu>
            </div>
        </template>
    </VDataTableServer>

    <v-dialog v-model="viewReservedPallets" max-width="1300px">
        <v-card elevation="2">
            <v-card-title class="d-flex justify-space-between align-center mx-4 px-4 mt-6">
                <div class="text-h4 font-weight-bold ps-2 text-primary">
                    Reserved Pallets
                </div>
                <v-btn icon="ri-close-line" variant="text" @click="viewReservedPallets = false"></v-btn>
            </v-card-title>
            <v-card-text>
                <v-table density="compact" class="elevation-0 border mx-4">
                    <thead>
                        <tr>
                            <th>Transport Number</th>
                            <th>Driver Name</th>
                            <th>Plate Number</th>
                            <th>Physical ID</th>
                            <th>Batch Code</th>
                            <th>Mfg Date</th>
                            <th class="text-center">Quantity ({{ stoData?.uom }})</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(item, index) in stoData?.reserved_pallets">
                            <td>{{ item.transport_number }}</td>
                            <td>{{ item.driver_name }}</td>
                            <td>{{ item.plate_number }}</td>
                            <td>{{ item.pallet_physical_id }}</td>
                            <td>{{ item.batch }}</td>
                            <td>{{ item.manufacturing_date }}</td>
                            <td class="text-center">{{ item.total_qty }} {{ stoData?.uom }}</td>
                        </tr>
                    </tbody>
                </v-table>
                <div class="d-flex justify-end mt-8 mx-4">
                    <v-btn color="secondary" variant="outlined" @click="viewReservedPallets = false"
                        type="button">Close</v-btn>
                    <!-- <v-btn color="error" class="ml-3" @click="handleCancelProposal" type="button">Cancel
                        Reservation</v-btn> -->
                </div>
            </v-card-text>
        </v-card>
    </v-dialog>

    <v-dialog v-model="viewTransports" max-width="1500px">
        <v-skeleton-loader v-if="transportLoading" type="article"></v-skeleton-loader>
        <v-card v-else elevation="2">
            <v-card-title class="d-flex justify-space-between align-center mx-4 px-4 mt-6">
                <div class="text-h4 font-weight-bold ps-2 text-primary">
                    Select Transport
                </div>
                <v-btn icon="ri-close-line" variant="text" @click="viewTransports = false"></v-btn>
            </v-card-title>
            <v-card-text>
                <!-- FIX: Wrap table in a single radio group component to restrict selection context -->
                <v-radio-group v-model="selectedTransportId" hide-details class="w-100">
                    <v-table density="compact" class="elevation-0 border mx-4">
                        <thead>
                            <tr>
                                <th class="text-center" style="width: 60px;"></th>
                                <th>Transport Number</th>
                                <th>Driver</th>
                                <th>Plate Number</th>
                                <th>Batch</th>
                                <th>Transport Entry Qty</th>
                                <th>Reserved Qty</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- 1. Show the transport rows if data exists -->
                            <template v-if="transports && transports.length > 0">
                                <tr v-for="(item, index) in transports" :key="index">
                                    <td class="text-center">
                                        <v-radio :value="item.id" color="primary" density="compact"
                                            class="d-inline-flex justify-center"></v-radio>
                                    </td>
                                    <td>{{ item.transport?.transport_number }}</td>
                                    <td>{{ item.transport?.driver?.full_name }}</td>
                                    <td>{{ item.transport?.vehicle?.plate_number }}</td>
                                    <td>{{ item.batch }}</td>
                                    <td>{{ numberWithComma(item.qty) }} {{ stoData?.uom }}</td>
                                    <td>{{ numberWithComma(item.origin_qty) }} {{ stoData?.uom }}</td>
                                </tr>
                            </template>

                            <!-- 2. Fallback empty state row -->
                            <tr v-else>
                                <td colspan="7" class="text-center text-grey-darken-1 py-8">
                                    <v-icon icon="ri-truck-line" size="large" class="mb-1 mr-2"></v-icon>
                                    No transport data found for this item.
                                </td>
                            </tr>
                        </tbody>
                    </v-table>
                </v-radio-group>

                <div class="d-flex justify-end mt-8 mx-4">
                    <v-btn color="secondary" variant="outlined" @click="viewTransports = false"
                        type="button">Close</v-btn>
                    <!-- Disabled button rule if nothing is picked yet -->
                    <v-btn color="primary" class="ml-3" @click="handleSelectBatch" :disabled="!selectedTransportId"
                        type="button">Select Batch</v-btn>
                </div>
            </v-card-text>
        </v-card>
    </v-dialog>

    <!-- Show Reserved Pallets Modal -->
    <BatchPick v-if="showReservedPallets" :show="showReservedPallets" :sto-data="stoData" @close="batchPickClose" />

    <Toast :show="toast.show" :message="toast.message" />

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
