<script setup>
import DefaultModal from '@/components/DefaultModal.vue';
import Toast from '@/components/Toast.vue';
import { useAuthorization } from '@/composables/useAuthorization';
import ApiService from '@/services/ApiService';
import JwtService from '@/services/JwtService';
import { useAuthStore } from '@/stores/auth';
import axios from 'axios';
import Moment from 'moment';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const shipmentData = ref(null);
const pageLoading = ref(false);
const shipmentNumber = route.params.shipmentNumber; // Get the shipment number from URL

// Delivery table variables
const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref('-updated_at'); // Default sort
const deliveryItemsModalOpen = ref(false);
const selectedDelivery = ref(null);
const searchValue = ref('');
const authStore = useAuthStore();

const lastOptions = ref({});
const currentOptions = ref({});

const toast = ref({
    message: '',
    color: 'success',
    show: false
});

// Load-end quantity check override (supervisors only)
const { authUserCan } = useAuthorization();
const canOverrideQuantity = computed(() => authUserCan('can.override.loadend.quantity'));
const overrideModalOpen = ref(false);
const clearOverrideModalOpen = ref(false);
const overrideReason = ref('');
const overrideSaving = ref(false);

const shipmentRecord = computed(() => shipmentData.value?.shipment ?? null);
const isOverrideOn = computed(() => !!shipmentRecord.value?.exclude_quantity_check);
const isLoadEnded = computed(() => !!shipmentRecord.value?.load_end_date);

const openOverrideModal = () => {
    overrideReason.value = '';
    overrideModalOpen.value = true;
};

const applyOverrideResponse = (shipment) => {
    if (!shipmentData.value?.shipment || !shipment) return;

    Object.assign(shipmentData.value.shipment, {
        exclude_quantity_check: shipment.exclude_quantity_check,
        quantity_override_reason: shipment.quantity_override_reason,
        quantity_override_by: shipment.quantity_override_by,
        quantity_override_by_name: shipment.quantity_override_by_name,
        quantity_override_at: shipment.quantity_override_at,
    });
};

const showOverrideError = (error, fallback) => {
    const errors = error.response?.data?.error;
    toast.value.message = (typeof errors === 'string' ? errors : errors?.reason?.[0]) || fallback;
    toast.value.color = 'error';
    toast.value.show = true;
};

const submitOverride = async () => {
    if (!overrideReason.value.trim()) return;

    overrideSaving.value = true;
    try {
        const response = await ApiService.post(`shipments/${shipmentNumber}/quantity-override`, {
            reason: overrideReason.value.trim(),
        });
        applyOverrideResponse(response.data?.data);
        overrideModalOpen.value = false;
        toast.value.message = 'Quantity check override set.';
        toast.value.color = 'success';
        toast.value.show = true;
    } catch (error) {
        showOverrideError(error, 'Failed to set the override.');
    } finally {
        overrideSaving.value = false;
    }
};

const submitClearOverride = async () => {
    overrideSaving.value = true;
    try {
        const response = await ApiService.delete(`shipments/${shipmentNumber}/quantity-override`);
        applyOverrideResponse(response.data?.data);
        clearOverrideModalOpen.value = false;
        toast.value.message = 'Quantity check override removed.';
        toast.value.color = 'success';
        toast.value.show = true;
    } catch (error) {
        showOverrideError(error, 'Failed to remove the override.');
    } finally {
        overrideSaving.value = false;
    }
};

// TODO:: Consider separating the API for calling the header and for the datatable
// to avoid loading the header if next/prev page 
const loadItems = async ({ page, itemsPerPage, sortBy, search }) => {
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
        sortQuery.value = '-updated_at';
    }

    try {
        const token = JwtService.getToken();

        const response = await axios.get(`/shipments/${shipmentNumber}`, {
            params: {
                page,
                itemsPerPage,
                sort: sortQuery.value,
                search: searchValue.value
            },
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const { shipment } = response.data;

        shipmentData.value = shipment

    } catch (error) {
        console.log(error);
    } finally {
        pageLoading.value = false;
    }
}

onMounted(async () => {
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{ key: 'created_at', order: 'desc' }],
        search: searchValue.value
    });
});

const displayPlateNumber = computed(() => {
    return shipmentData.value?.shipment?.plate_number_1 ||
        shipmentData.value?.shipment?.plate_number_2 ||
        shipmentData.value?.shipment?.plate_number_3 ||
        shipmentData.value?.shipment?.plate_number_4 ||
        ""; // Default value if none exist
});

const handleViewDelivery = (delivery) => {
    selectedDelivery.value = delivery
    deliveryItemsModalOpen.value = true;
}

const closeModal = () => {
    deliveryItemsModalOpen.value = false;
}

const isStatusMatched = computed(() => {
    return shipmentData.value?.shipment?.bu_overall_status === shipmentData.value?.shipment?.alc_overall_status;
});

const reservedPallets = computed(() => {
    return serverItems.value.flatMap(delivery =>
        (delivery.items ?? []).flatMap(item =>
            (item.delivery_reserved_orders ?? []).flatMap(order =>
                order.reserved_pallets ?? []
            )
        )
    )
});

const syncingLoading = ref(false)
const syncStatus = async () => {
    syncingLoading.value = true;
    try {
        const token = JwtService.getToken();
        const response = await axios.get(`/picklist/sync/${shipmentData.value?.shipment?.shipment_number}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (response.status === 200) {
            await loadItems({
                page: page.value,
                itemsPerPage: itemsPerPage.value,
                sortBy: [{ key: 'created_at', order: 'desc' }],
                search: searchValue.value
            });
            toast.value.color = 'success';
            toast.value.message = 'Sync successful!';
            toast.value.show = true;
        }
    } catch (error) {
        console.log(error);
    } finally {
        syncingLoading.value = false;
    }
}


function removeLeadingZeros(value) {
    if (!value) return '';
    return value.replace(/^0+/, '');
}

</script>

<template>

    <div>
        <v-card>
            <v-card-title>
                <div class="d-flex justify-space-between align-center px-4 mt-4">
                    <h4 class="text-h4 font-weight-black text-primary">Shipment Details</h4>
                    <v-spacer></v-spacer>
                    <v-btn :loading="syncingLoading" @click="syncStatus" v-if="isStatusMatched === false &&
                        (
                            [2, 3, 4].includes(Number(shipmentData?.shipment?.bu_overall_status)) &&
                            [2, 3, 4].includes(Number(shipmentData?.shipment?.alc_overall_status))
                        )" class="px-5" type="button" color="warning">
                        Sync Status
                    </v-btn>
                </div>
                <v-skeleton-loader v-if="pageLoading" type="article"></v-skeleton-loader>
                <VList v-else lines="one" density="compact" class="mt-4">
                    <VListItem>
                        <VRow class="table-row" no-gutters>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis"
                                            style="margin-top: 1px;">Shipment</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-medium-emphasis">{{
                                            shipmentData?.shipment?.shipment_number }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis"
                                            style="margin-top: 1px;">Check-in Date</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-medium-emphasis">
                                            {{ shipmentData?.shipment?.check_in_date ?
                                                Moment(shipmentData?.shipment?.check_in_date).format('M/D/YY h:mm A') : '--'
                                            }}
                                        </span>
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
                                        <span class="text-h6 font-weight-bold text-high-emphasis "
                                            style="margin-top: 1px;">Hauler</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-medium-emphasis">{{
                                            shipmentData?.shipment?.hauler_name }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis "
                                            style="margin-top: 1px;">Plate Number</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-medium-emphasis">{{ displayPlateNumber
                                            }}</span>
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
                                        <span class="text-h6 font-weight-bold text-high-emphasis "
                                            style="margin-top: 1px;">Driver</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        <span class="font-weight-medium text-medium-emphasis">{{
                                            shipmentData?.shipment?.driver_name }}</span>
                                    </VCol>
                                </VRow>
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow v-if="[2, 3, 4].includes(Number(shipmentData?.shipment?.bu_overall_status))"
                                    class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis "
                                            style="margin-top: 1px;">BU Trans Status</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        {{ shipmentData?.shipment?.bu_overall_status }}
                                        <v-chip :color="isStatusMatched ? 'success' : 'error'"
                                            :content="isStatusMatched ? 'synced' : 'not synced'"
                                            class="text-uppercase ml-3" size="x-small" inline variant="outlined">
                                            {{ isStatusMatched ? 'synced' : 'not synced' }}
                                        </v-chip>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                    <VListItem>
                        <VRow class="table-row" no-gutters>
                            <VCol md="6" class="table-cell d-inline-flex">
                            </VCol>
                            <VCol md="6" class="table-cell d-inline-flex">
                                <VRow v-if="[2, 3, 4].includes(Number(shipmentData?.shipment?.alc_overall_status))"
                                    class="table-row">
                                    <VCol cols="4" class="d-inline-flex align-center">
                                        <span class="text-h6 font-weight-bold text-high-emphasis "
                                            style="margin-top: 1px;">ALC Trans Status</span>
                                    </VCol>
                                    <VCol class="d-inline-flex align-center">
                                        {{ shipmentData?.shipment?.alc_overall_status }}
                                        <v-chip :color="isStatusMatched ? 'success' : 'error'"
                                            :content="isStatusMatched ? 'synced' : 'not synced'"
                                            class="text-uppercase ml-3" inline size="x-small" variant="outlined">
                                            {{ isStatusMatched ? 'synced' : 'not synced' }}
                                        </v-chip>
                                    </VCol>
                                </VRow>
                            </VCol>
                        </VRow>
                    </VListItem>
                </VList>
            </v-card-title>
        </v-card>
        <v-card v-if="canOverrideQuantity && shipmentRecord" class="mt-2">
            <v-card-text class="mx-2">
                <div class="d-flex align-center justify-space-between flex-wrap" style="gap: 12px;">
                    <h4 class="text-h4 font-weight-black text-primary">Quantity Check Override</h4>
                    <v-chip :color="isOverrideOn ? 'warning' : 'secondary'" label>
                        {{ isOverrideOn ? 'On' : 'Off' }}
                    </v-chip>
                </div>

                <p class="mt-2 mb-0">
                    When on, load end continues even if the loaded quantity does not match the delivery order.
                    The delivery order quantity in SAP is left unchanged.
                </p>

                <div v-if="isOverrideOn" class="mt-3">
                    <div><span class="font-weight-bold">Reason:</span> {{ shipmentRecord.quantity_override_reason }}</div>
                    <div>
                        <span class="font-weight-bold">Approved by:</span>
                        {{ shipmentRecord.quantity_override_by_name }}
                        <span v-if="shipmentRecord.quantity_override_at">
                            on {{ Moment(shipmentRecord.quantity_override_at).format('MMM D, YYYY hh:mm A') }}
                        </span>
                    </div>
                </div>

                <div v-if="!isLoadEnded" class="d-flex justify-end mt-4" style="gap: 12px;">
                    <v-btn v-if="!isOverrideOn" color="warning" @click="openOverrideModal">
                        Set Override
                    </v-btn>
                    <v-btn v-else color="secondary" variant="outlined" @click="clearOverrideModalOpen = true">
                        Clear Override
                    </v-btn>
                </div>
            </v-card-text>
        </v-card>
        <div>
            <v-card class="mt-2">
                <v-card-text class="mx-2">
                    <h4 class="text-h4 font-weight-black text-primary">Delivery Details</h4>

                    <div class="mt-2">
                        <v-table class="text-no-wrap">
                            <thead>
                                <tr>
                                    <th>Delivery Document</th>
                                    <th>Ship To</th>
                                    <th>Sold To</th>
                                    <th>Created At</th>
                                </tr>
                            </thead>

                            <tbody>
                                <tr
                                    v-for="item in shipmentData?.shipment?.bu_shipment?.deliveries ?? []"
                                    :key="item.id"
                                    @click="handleViewDelivery(item)"
                                    class="clickable-row"
                                >
                                    <td>{{ item.delivery_document }}</td>
                                    <td>{{ item.ship_to_name }}</td>
                                    <td>{{ item.sold_to_name }}</td>
                                    <td>
                                        {{ item.created_at
                                            ? Moment(item.created_at).format('M/D/YY h:mm A')
                                            : ''
                                        }}
                                    </td>
                                </tr>

                                <tr v-if="!shipmentData?.shipment?.bu_shipment?.deliveries?.length">
                                    <td colspan="6" class="text-center">
                                        No delivery details found.
                                    </td>
                                </tr>
                            </tbody>
                        </v-table>
                    </div>
                </v-card-text>
            </v-card>
            <!-- <v-card class="mt-2">
                <v-card-text class="mx-2">
                    <h4 class="text-h4 font-weight-black text-primary">Reserved Orders</h4>
                    <div class="mt-2">
                        <reserved-orders-data-table />
                    </div>
                </v-card-text>
            </v-card> -->
        </div>

        <div v-if="authStore.user?.assigned_plant?.plant_code === '2110'">
            <v-card class="mt-2">
                <v-card-text class="mx-2">
                    <h4 class="text-h4 font-weight-black text-primary">Reserved Pallets</h4>
                    <div class="mt-2">
                        <v-skeleton-loader v-if="pageLoading" type="article"></v-skeleton-loader>
                        <v-table v-else>
                            <thead>
                                <tr>
                                    <th class="text-left">Batch</th>
                                    <th class="text-left">Physical ID</th>
                                    <th class="text-center">Item No.</th>
                                    <th class="text-left">Material Code</th>
                                    <th class="text-left">Description</th>
                                    <th class="text-center">Qty</th>
                                    <th class="text-left">Scanned QR</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(pallet, index) in reservedPallets" :key="index">
                                    <td>{{ pallet.batch }}</td>
                                    <td>{{ pallet.pallet_physical_id }}</td>
                                    <td class="text-center">{{ pallet.delivery_item_number }}</td>
                                    <td>{{ pallet.material_code }}</td>
                                    <td>{{ pallet.material_description }}</td>
                                    <td class="text-center">{{ pallet.total_qty }}</td>
                                    <td>{{ pallet.scanned_qr }}</td>
                                </tr>
                                <tr v-if="!reservedPallets.length">
                                    <td colspan="7" class="text-center text-medium-emphasis py-4">
                                        No reserved pallets found.
                                    </td>
                                </tr>
                            </tbody>
                        </v-table>
                    </div>
                </v-card-text>
            </v-card>
        </div>

        <div>
            <v-card class="mt-2">
                <v-card-text class="mx-2">
                    <h4 class="text-h4 font-weight-black text-primary">Picklist Read Pallet Logs</h4>
                    <div class="mt-2">
                        <v-skeleton-loader v-if="pageLoading" type="article"></v-skeleton-loader>
                        <v-table v-else>
                            <thead>
                                <tr>
                                    <th class="text-left">
                                        Pallet #
                                    </th>
                                    <th class="text-left">
                                        Batch
                                    </th>
                                    <th class="text-left">
                                        Material
                                    </th>
                                    <th class="text-center">
                                        Item Number
                                    </th>
                                    <th class="text-center">
                                        Quantity
                                    </th>
                                    <th class="text-left">
                                        Mfg Date
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="item in shipmentData?.shipment?.references" :key="item.rfid_name">
                                    <td>{{ item.rfid_name }}</td>
                                    <td>{{ item.batch }}</td>
                                    <td>
                                        <span class="font-weight-bold">{{ item.material?.bu_material }}</span><br />
                                        <span v-if="item.material?.material_description" class="text-subtitle-1">{{ item.material?.material_description }}</span>
                                    </td>
                                    <td class="text-center">{{ item.item_number }}</td>
                                    <td class="text-center">{{ item.quantity }}</td>
                                    <td>{{ item.mfg_date ? Moment(item.mfg_date).format('MMMM D, YYYY') : '' }}</td>
                                </tr>
                            </tbody>
                        </v-table>
                    </div>
                </v-card-text>
            </v-card>
        </div>
    </div>
    <DefaultModal :dialog-title="'Delivery Items'" :show="deliveryItemsModalOpen" @close="closeModal">
        <v-table class="mt-4">
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Batch</th>
                    <th>Material Code</th>
                    <th>Description</th>
                    <th class="text-center">Quantity</th>
                    <th>Unit</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="(item, index) in selectedDelivery.delivery_items" :key="index">
                    <td>{{ item.item_number }}</td>
                    <td>{{ item.batch }}</td>
                    <td>{{ removeLeadingZeros(item.material_number) }}</td>
                    <td>{{ item.material_description }}</td>
                    <td class="text-center">{{ item.delivery_quantity }}</td>
                    <td>{{ item.sales_unit }}</td>
                </tr>
            </tbody>
        </v-table>
    </DefaultModal>
    <DefaultModal v-if="canOverrideQuantity" :show="overrideModalOpen" dialogTitle="Set Quantity Check Override"
        maxWidth="500px" @close="overrideModalOpen = false">
        <template #default>
            <p class="mb-4">
                Load end will continue for shipment {{ shipmentNumber }} even if the loaded quantity does not match
                the delivery order. Please enter the reason.
            </p>
            <v-textarea v-model="overrideReason" label="Reason" rows="3" counter="255" maxlength="255" />
            <div class="d-flex justify-end align-center mt-4">
                <v-btn color="secondary" variant="outlined" class="px-8 mr-3" @click="overrideModalOpen = false">
                    Cancel
                </v-btn>
                <v-btn color="warning" class="px-8" :loading="overrideSaving" :disabled="!overrideReason.trim()"
                    @click="submitOverride">
                    Set Override
                </v-btn>
            </div>
        </template>
    </DefaultModal>
    <DefaultModal v-if="canOverrideQuantity" :show="clearOverrideModalOpen" dialogTitle="Clear Override?"
        maxWidth="400px" @close="clearOverrideModalOpen = false">
        <template #default>
            <p class="mb-4">The quantity check will apply again for this shipment.</p>
            <div class="d-flex justify-end align-center mt-4">
                <v-btn color="secondary" variant="outlined" class="px-8 mr-3" @click="clearOverrideModalOpen = false">
                    Cancel
                </v-btn>
                <v-btn color="primary" class="px-8" :loading="overrideSaving" @click="submitClearOverride">
                    Clear Override
                </v-btn>
            </div>
        </template>
    </DefaultModal>
    <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event" />
</template>

<style scoped>
.clickable-row {
    cursor: pointer;
    transition: background-color 0.2s ease-in-out;
}

.clickable-row:hover {
    background-color: rgba(173, 215, 192, 0.3);
}
</style>
