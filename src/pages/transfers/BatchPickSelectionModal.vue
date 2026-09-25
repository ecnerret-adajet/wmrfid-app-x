<script setup>
import { numberWithComma } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import { useStoBatchPickingStore } from '@/stores/stoBatchPickingStore';
import Moment from 'moment';
import { computed, onMounted, ref, watch } from 'vue';
const stoBatchPickingStore = useStoBatchPickingStore();

const props = defineProps({
    show: {
        type: Boolean,
        default: false
    },
    item: {
        type: Object,
        default: null
    },
    loading: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['close', 'save', 'cancel-reservation']);

const dialogVisible = ref(props.show);
const step = ref(1);
const pageLoading = ref(false);
const transports = ref([]);
const selectedTransportId = ref(null);
const selectedBatchCodes = ref([]);

const batchHeaders = [
    { title: '', key: 'select', sortable: false },
    { title: 'Batch Code', key: 'BATCH', sortable: false },
    { title: 'Mfg. Date', key: 'MANUF_DATE', sortable: false },
    { title: 'Expiry Date', key: 'SLED_STR', sortable: false },
    { title: 'Available Qty', key: 'BAG', sortable: false, align: 'end' },
];

const fetchTransports = async () => {
    try {
        const response = await ApiService.query(`transfer-orders/get-transports/${props.item?.po_number}/${props.item?.po_item}`);
        transports.value = response.data.transports || [];
    } catch (error) {
        console.error('Failed fetching transports:', error);
    }
};


const fetchData = async () => {
    if (!props.item?.po_number || !props.item?.po_item) return;
    transports.value = [];
    pageLoading.value = true;
    try {
        const openQuantityParams = {
            po_number: props.item.po_number,
            po_item: props.item.po_item,
            po_quantity: stoBatchPickingStore.stoDetails?.qty ?? props.item.qty,
            plant_code: stoBatchPickingStore.stoDetails?.supplying_plant ?? props.item.supplying_plant,
            sloc: stoBatchPickingStore.stoDetails?.issuing_sloc_sto ?? props.item.issuing_sloc_sto
        };

        // Open quantity value
        await stoBatchPickingStore.fetchOpenQuantity(openQuantityParams);

        const availableParams = {
            ...openQuantityParams,
            material_code: stoBatchPickingStore.stoDetails?.material_code ?? props.item.material_code
        };

        // Batch selection
        await stoBatchPickingStore.fetchAvailableCommodities(availableParams);

        // Transport selection
        await fetchTransports();
    } catch (error) {
        console.error('Failed to fetch picking data:', error);
    } finally {
        pageLoading.value = false;
    }
};

onMounted(() => {
    if (props.show) fetchData();
});

watch(() => props.show, (val) => {
    dialogVisible.value = val;
    if (val) {
        step.value = 1;
        selectedTransportId.value = null;
        selectedBatchCodes.value = [];
        fetchData();
    }
});

watch(dialogVisible, (val) => {
    if (!val) emit('close');
});

const selectedGroup = ref(null);
const selectedTransport = computed(() => selectedGroup.value);

const goToBatchStep = () => {
    if (!selectedGroup.value) return;
    step.value = 2;
};

const goBackToTransportStep = () => {
    step.value = 1;
};

const toggleBatch = (batch) => {
    const index = selectedBatchCodes.value.indexOf(batch.BATCH);
    if (index === -1) {
        selectedBatchCodes.value.push(batch.BATCH);
    } else {
        selectedBatchCodes.value.splice(index, 1);
    }
};

const formatDate = (date) => date ? Moment(date).format('MMMM D, YYYY') : '';

const handleConfirm = () => {
    const selectedBatches = stoBatchPickingStore.availableStocks.filter((batch) => selectedBatchCodes.value.includes(batch.BATCH));
    emit('save', {
        transport: selectedTransport.value,
        batches: selectedBatches
    });

    transports.value = [];
};

const cancelReservation = () => {
    emit('cancel-reservation', {
        item: props.item,
        group: selectedGroup.value
    });
    selectedGroup.value = null;
};

const handleClose = () => {
    dialogVisible.value = false;
};
</script>

<template>
    <v-dialog v-model="dialogVisible" max-width="1300px" scrollable>
        <v-card class="d-flex flex-column" min-height="620px">
            <v-card-title class="d-flex justify-space-between align-center pa-4">
                <span class="text-h5">Batch Picking</span>
                <v-btn icon="ri-close-line" variant="text" @click="handleClose"></v-btn>
            </v-card-title>

            <v-divider></v-divider>

            <div v-if="item" class="pa-4 bg-grey-lighten-4">
                <v-row dense>
                    <v-col cols="6" md="3">
                        <div >PO Number</div>
                        <div class="font-weight-bold">{{ item.po_number }}</div>
                    </v-col>
                    <v-col cols="6" md="3">
                        <div>PO Item</div>
                        <div class="font-weight-bold">{{ item.po_item }}</div>
                    </v-col>
                    <v-col cols="12" md="3">
                        <div>Material Code</div>
                        <div class="font-weight-bold">{{ item.material_code || '-' }}</div>
                    </v-col>
                    <v-col cols="6" md="3">
                        <div>Material Desc</div>
                        <div class="font-weight-bold">{{ item.material_description || '-' }}</div>
                    </v-col>
                </v-row>
                 <v-row dense>
                    <v-col cols="6" md="3">
                        <div>Issuing Plant</div>
                        <div class="font-weight-bold">{{ item.supplying_order_plant?.plant_code }}</div>
                        <div class="font-weight-bold">{{ item.supplying_order_plant?.name }}</div>
                    </v-col>
                    <v-col cols="6" md="3">
                        <div>Issuing SLOC</div>
                        <div class="font-weight-bold">{{ item.issuing_storage_location?.code }}</div>
                        <div class="font-weight-bold">{{ item.issuing_storage_location?.name }}</div>
                    </v-col>
                    <v-col cols="12" md="3">
                        <div>Receiving Plant</div>
                        <div class="font-weight-bold">{{ item.receiving_order_plant?.plant_code }}</div>
                        <div class="font-weight-bold">{{ item.receiving_order_plant?.name }}</div>
                    </v-col>
                    <v-col cols="6" md="3">
                        <div>Receiving SLOC</div>
                        <div class="font-weight-bold">{{ item.receiving_storage_location?.code }}</div>
                        <div class="font-weight-bold">{{ item.receiving_storage_location?.name }}</div>
                    </v-col>
                </v-row>
                <v-row dense>
                    <v-col cols="12" md="12">
                        <!-- Transparent background with a thin primary-colored border -->
                        <v-sheet border="primary md" rounded="lg" class="pa-3 d-flex justify-space-between align-center">
                            <span class="text-primary font-weight-medium">PO Item Qty</span>
                            <span class="text-h6 text-primary font-weight-bold">
                                {{ numberWithComma(item.qty ?? 0) }} {{ item.uom}}
                            </span>
                        </v-sheet>
                    </v-col>
                </v-row>
                <v-row dense>
                    <v-col cols="12" md="12">
                        <!-- Transparent background with a thin primary-colored border -->
                        <v-skeleton-loader v-if="pageLoading" type="list-item"></v-skeleton-loader>
                        <v-sheet v-else border="primary md" rounded="lg" class="pa-3 d-flex justify-space-between align-center">
                            <span class="text-error font-weight-medium">Open Qty</span>
                            <span class="text-h6 text-error font-weight-bold">
                                {{ numberWithComma(stoBatchPickingStore.stoDetails?.open_quantity ?? 0) }} {{ item.uom}}
                            </span>
                        </v-sheet>
                    </v-col>
                </v-row>
            </div>

            <v-divider></v-divider>

            <v-card-text class="flex-grow-1 overflow-y-auto pt-4">
                <div class="d-flex align-center flex-nowrap mb-4">
                    <div class="d-flex align-center flex-shrink-0">
                        <v-avatar :color="step >= 1 ? 'primary' : 'grey-lighten-1'" size="28">
                            <span class="text-body-2 text-white">1</span>
                        </v-avatar>
                        <span class="ml-2 text-no-wrap" :class="{ 'font-weight-bold': step === 1 }">Select Transport</span>
                    </div>
                    
                    <v-divider class="mx-4"></v-divider>
                    
                    <div class="d-flex align-center flex-shrink-0">
                        <v-avatar :color="step >= 2 ? 'primary' : 'grey-lighten-1'" size="28">
                            <span class="text-body-2 text-white">2</span>
                        </v-avatar>
                        <span class="ml-2 text-no-wrap" :class="{ 'font-weight-bold': step === 2 }">Select Batch</span>
                    </div>
                </div>

                <!-- Step 1: Select Transport -->
                <div v-if="step === 1">
                    <v-progress-linear v-if="pageLoading" indeterminate color="primary" class="mb-4"></v-progress-linear>
                    <!-- <v-radio-group v-model="selectedTransportId" hide-details>
                        <v-list class="border rounded">
                            <v-list-item
                                v-for="group in transports"
                                :key="group.transport_id"
                                @click="selectedTransportId = group.transport_id"
                            >
                                <template #prepend>
                                    <v-radio :value="group.transport_id"></v-radio>
                                </template>
                                <v-list-item-title class="font-weight-bold">{{ group.transport?.transport_number }}</v-list-item-title>
                                <v-list-item-subtitle>
                                    {{ group.transport?.driver?.full_name || (group.transport?.driver?.first_name + ' ' + group.transport?.driver?.last_name) }}
                                    &bull; {{ group.transport?.vehicle?.plate_number }}
                                </v-list-item-subtitle>
                            </v-list-item>
                        </v-list>
                        <div v-if="!pageLoading && transports.length === 0" class="pa-4 text-center text-grey">
                            No transport data found for this item.
                        </div>
                    </v-radio-group> -->

                    <v-radio-group v-model="selectedGroup" hide-details class="w-100">
                        <div class="d-flex justify-end mb-3 px-4">
                            <v-btn 
                                v-if="selectedGroup && selectedGroup.has_batch_picked"
                                color="error" 
                                type="button"
                                @click="cancelReservation"
                            >
                                Cancel Reservation
                            </v-btn>
                        </div>
                        <v-table density="compact" class="elevation-0 border mx-4">
                            <thead>
                                <tr>
                                    <th class="text-center" style="width: 60px;"></th>
                                    <th>Transport Number</th>
                                    <th>Driver</th>
                                    <th>Plate Number</th>
                                    <th>Transport Entry Qty</th>
                                    <th>Batch</th>
                                    <th>Reserved Qty</th>
                                </tr>
                            </thead>
                            <tbody>
                                <template v-if="transports && transports.length > 0">
                                    <template v-for="(group, groupIndex) in transports" :key="'group-' + groupIndex">
                                        <tr v-for="(item, itemIndex) in group.transport_transaction_items" :key="'item-' + item.id">
                                            <td v-if="itemIndex === 0" :rowspan="group.transport_transaction_items.length" class="text-center">
                                                <v-radio 
                                                    :value="group" 
                                                    color="primary" 
                                                    density="compact"
                                                    class="d-inline-flex justify-center"
                                                ></v-radio>
                                            </td>
                                            <td v-if="itemIndex === 0" :rowspan="group.transport_transaction_items.length">
                                                {{ group.transport?.transport_number }}
                                            </td>
                                            <td v-if="itemIndex === 0" :rowspan="group.transport_transaction_items.length">
                                                {{ group.transport?.driver ? (group.transport.driver.full_name || (group.transport.driver.first_name + ' ' + group.transport.driver.last_name)) : '' }}
                                            </td>
                                            <td v-if="itemIndex === 0" :rowspan="group.transport_transaction_items.length">
                                                {{ group.transport?.vehicle?.plate_number ?? '' }}
                                            </td>
                                            <td v-if="itemIndex === 0" :rowspan="group.transport_transaction_items.length">
                                                {{ numberWithComma(item.qty) }} {{ stoBatchPickingStore?.stoDetails?.uom }}
                                            </td>

                                            <td>{{ item.batch }}</td>
                                            <td>
                                                {{ numberWithComma(item.reserved_qty) }} {{ stoBatchPickingStore?.stoDetails?.uom }}
                                            </td>
                                        </tr>
                                    </template>
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
                </div>

                <!-- Step 2: Select Batch(es) -->
                <div v-else-if="step === 2">
                    <div class="mb-3">
                        Transport: <strong>{{ selectedTransport?.transport?.transport_number }}</strong>
                        &bull; Driver: <strong>{{ selectedTransport?.transport?.driver?.full_name ?? 'N/A' }}</strong>
                        &bull; Plate No: <strong>{{ selectedTransport?.transport?.vehicle?.plate_number ?? 'N/A' }}</strong>
                    </div>

                    <v-data-table
                        :headers="batchHeaders"
                        :items="stoBatchPickingStore.availableStocks"
                        :loading="pageLoading"
                        item-value="BATCH"
                        class="elevation-1 border rounded"
                        density="compact"
                        hide-default-footer
                    >
                        <template #item.select="{ item }">
                            <v-checkbox
                                :model-value="selectedBatchCodes.includes(item.BATCH)"
                                @update:model-value="toggleBatch(item)"
                                hide-details
                                density="compact"
                            ></v-checkbox>
                        </template>
                        <template #item.MANUF_DATE="{ item }">
                            {{ formatDate(item.MANUF_DATE) }}
                        </template>
                        <template #item.BAG="{ item }">
                            {{ numberWithComma(item.BAG) }} {{ item.BASE_UOM }}
                        </template>
                    </v-data-table>
                </div>
            </v-card-text>

            <v-divider></v-divider>

            <v-card-actions class="pa-4">
                <v-btn v-if="step === 2" variant="outlined" @click="goBackToTransportStep">Back</v-btn>
                <v-spacer></v-spacer>
                <v-btn variant="outlined" @click="handleClose">Cancel</v-btn>
                <v-btn
                    v-if="step === 1"
                    color="primary"
                    variant="elevated"
                    :disabled="!selectedGroup || selectedGroup?.has_batch_picked"
                    @click="goToBatchStep"
                >
                    Next
                </v-btn>
                <v-btn
                    v-else
                    color="primary"
                    variant="elevated"
                    :loading="loading"
                    :disabled="selectedBatchCodes.length === 0"
                    @click="handleConfirm"
                >
                    Confirm
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>
