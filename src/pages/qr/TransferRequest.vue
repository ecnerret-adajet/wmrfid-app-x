<template>
    <v-container fluid>
        <v-card class="pa-3 mb-2" elevation="1">
            <div class="d-flex align-center justify-space-between">
                <div class="text-subtitle-2 font-weight-medium">
                    Transfer Requests
                </div>
                <!-- <v-btn icon color="primary" @click="syncTransferRequests" :title="'Sync'">
                    <v-icon>mdi-sync</v-icon>
                </v-btn>
                <VIcon class="clickable-icon" v-bind="props" size="30"
                    color="primary" icon="ri-refresh-fill" @click="syncTransferRequests" /> -->

                <VTooltip location="top">
                    <template #activator="{ props }">
                        <VIcon class="clickable-icon" v-bind="props" size="30"
                            color="primary" icon="ri-refresh-fill" @click="syncTransferRequests" />
                    </template>
                    <span>Refresh Data</span>
                </VTooltip>
            </div>
            <div class="mt-5">
                <v-select
                    v-model="selectedStatus"
                    :items="statusOptions"
                    label="Status"
                    clearable
                    density="compact"
                    variant="outlined"
                    hide-details
                />
            </div>
        </v-card>
        <div class="flex-grow-1 overflow-y-auto pb-16">
            <v-row>
                <v-col
                    v-for="item in filteredItems?.transfer_requests"
                    :key="item.id"
                    cols="12"
                >
                <v-card class="pa-3" rounded="lg" elevation="2">
                    <!-- Header -->
                    <div class="d-flex justify-space-between align-center mb-2">
                        <div class="font-weight-bold">
                            TR #: {{ item.transfer_request_id }}
                        </div>
                        <v-chip
                            size="small"
                            :color="getStatusColor(item.status_text)"
                            dark
                        >
                            {{ item.status_text }}
                        </v-chip>
                    </div>
                    
                    <!-- Body -->
                    <div class="mb-2">
                        <div class="font-weight-bold">{{ item.physical_id }}</div>
                        <div v-if="item.batch" class="text-primary">
                            {{ item.batch }}
                        </div>
                    </div>

                    <!-- TO Section -->
                    <div v-if="item.transfer_order" class="d-flex flex-column align-center">
                        <div class="d-flex justify-space-between align-center w-100 mb-2">
                            <div>
                            <div class="text-caption text-grey">TO Number</div>
                            <div class="font-weight-medium">{{ item.transfer_order?.transfer_order_id }}</div>
                            </div>
                            <v-chip
                            size="small"
                            :color="getStatusColor(item.transfer_order?.status_text)"
                            dark
                            >
                            {{ item.transfer_order?.status_text }}
                            </v-chip>
                        </div>

                        <v-sheet v-if="item.has_wrapping_area && item.status_text === 'For Wrapping'" class="w-100 pa-2 mb-2" color="#f5f5f5" rounded>
                            <div class="d-flex justify-space-between align-center mb-1">
                                <span>Proceed To:</span>
                                <span class="font-weight-medium">Wrapping Area</span>
                            </div>
                        </v-sheet>

                        <v-sheet v-if="item.status_text === 'For Putaway'" class="w-100 pa-2 mb-2" color="#f5f5f5" rounded>
                            <div class="d-flex justify-space-between align-center mb-1">
                                <span>Proceed To:</span>
                                <span class="font-weight-medium">Storage Bin</span>
                            </div>
                        </v-sheet>

                        <v-sheet v-if="item.status_text === 'For Putaway'" class="w-100 pa-2 mb-2" color="#f5f5f5" rounded>
                            <div class="d-flex justify-space-between align-center mb-1">
                                <span>Wrapped Date:</span>
                                <span class="font-weight-medium">
                                    {{ item.wrapped_datetime ? moment(item.wrapped_datetime).format('MMM D, YYYY h:mm A') : '' }}
                                </span>
                            </div>
                            <div class="d-flex justify-space-between align-center mb-1">
                                <span>Assigned Bin #:</span>
                                <span class="font-weight-medium">
                                    {{ item.transfer_order?.designated_block?.lot?.label || '--' }} - {{ item.transfer_order?.designated_block?.label || '--' }}
                                </span>
                            </div>
                            <div class="d-flex justify-space-between align-center">
                                <span>Assigned Layer:</span>
                                <span class="font-weight-medium">Layer {{ item.transfer_order?.layer_position || '--' }}</span>
                            </div>
                        </v-sheet>
                        
                        <v-btn v-if="item.has_wrapping_area && item.status_text === 'For Wrapping'"
                            color="info"
                            block
                            class="mt-1"
                            @click="handleQrScan(item, 'wrapping')"
                            prepend-icon="mdi-qrcode-scan"
                        >
                            Scan Wrapping Area QR
                        </v-btn>
                        <v-btn v-else-if="item.status_text === 'For Putaway'"
                            color="primary"
                            block
                            class="mt-1"
                            @click="handleQrScan(item, 'bin')"
                            prepend-icon="mdi-qrcode-scan"
                        >
                            Scan Bin QR
                        </v-btn>
                    </div>
                    

                    <!-- If no TO yet -->
                    <div v-else class="d-flex flex-column align-center">
                    <div class="text-primary-2 mb-2">No TO yet</div>
                    <v-divider />
                    <v-btn
                        color="primary"
                        block
                        :loading="selectedTransferRequest === item.transfer_request_id"
                        class="mt-1"
                        @click="generateTransferOrder(item)"
                    >
                        Generate Transfer Order
                    </v-btn>
                    </div>

                </v-card>
                </v-col>
            </v-row>
        </div>
        <ScannerModal
            v-if="showScanner"
            :type="scanType"
            @close="showScanner = false"
            @scan-result="handleScanResult($event)"
        />
        <DefaultModal
            :show="showErrorModal"
            dialog-title="QR Scan Error"
            max-width="500px"
            min-height="300px"
            @close="showErrorModal = false"
        >
      
        <div class="text-center py-6">
            <v-icon class="mb-5" color="error" icon="ri-error-warning-line" size="56"></v-icon>
            <div class="text-h4 font-weight-bold mb-2">{{ errorMessageTitle }}</div>
            <div class="text-h6">{{ errorMessage }}</div>
            <v-btn
                class="mt-6"
                color="primary"
                variant="elevated"
                @click="close()">Close
            </v-btn>
        </div>
        </DefaultModal>

        <Loader :show="isLoading || transferRequestsStore.loading" />
        <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event"/>
    </v-container>
    
</template>

<script setup>

import DefaultModal from '@/components/DefaultModal.vue';
import Loader from '@/components/Loader.vue';
import Toast from '@/components/Toast.vue';
import { useTransferRequestsStore } from '@/stores/transferRequests';
import moment from 'moment';
import { storeToRefs } from 'pinia';
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import ScannerModal from './ScannerModal.vue';

function syncTransferRequests() {
    const plant_code = route.params.plant_code;
    const sloc = route.params.sloc;
    const forklift = route.params.forklift;
    if (plant_code && sloc && forklift) {
        transferRequestsStore.fetchTransferRequests(plant_code, sloc, forklift);
        toast.message = 'Syncing transfer requests...';
        toast.color = 'info';
        toast.show = true;
    }
}

const headers = [
  { text: 'Trans Request ID', value: 'transfer_request_id' },
  { text: 'Physical ID', value: 'physical_id' },
  { text: 'Status', value: 'status' },
  { text: 'TO Number', value: 'toNumber' },
]

const toast = reactive({
    message: 'Success!',
    color: 'success',
    show: false
});


const statusOptions = ['Pending', 'For Putaway' , 'For Wrapping', 'Completed']
const selectedStatus = ref('Pending')

// Pinia store usage
const route = useRoute();
const transferRequestsStore = useTransferRequestsStore();
const { items, loading, error } = storeToRefs(transferRequestsStore);
const showErrorModal = ref(false)
const errorMessageTitle = ref('')
const errorMessage = ref('')
const isLoading = ref(false)

onMounted(() => {
  const plant_code = route.params.plant_code;
  const sloc = route.params.sloc;
  const forklift = route.params.forklift;
  if (plant_code && sloc && forklift) {
    transferRequestsStore.fetchTransferRequests(plant_code, sloc, forklift);
  }
});

const getStatusColor = (status) => {
    switch (status) {
        case 'For Putaway': return 'success'
        case 'Pending': return 'warning'
        case 'For Wrapping': return 'info'
        case 'Completed': return 'primary'
        default: return 'grey'
    }
}

const filteredItems = computed(() => {
    if (!items.value || !items.value.transfer_requests) return { transfer_requests: [] };
    if (!selectedStatus.value) return items.value;
    return {
        ...items.value,
        transfer_requests: items.value.transfer_requests.filter(item => item.status_text === selectedStatus.value)
    };
})

const showScanner = ref(false);
const scanType = ref('pallet');
const scanResult = ref(null);
const selectedTransferRequest = ref(null);

async function generateTransferOrder(item) {
    const plant_code = route.params.plant_code;
    const sloc = route.params.sloc;
    const forklift = route.params.forklift;
    if (!plant_code || !sloc || !forklift) return;
    selectedTransferRequest.value = item.transfer_request_id;
  
    try {
        const result = await transferRequestsStore.generateTransferOrder(plant_code, sloc, forklift, item.id);
    } catch (err) {
        // Optionally show an error message
        if (err?.response?.data?.message === 'No Assigned Bin' ) {
            errorMessageTitle.value = 'Error'
            errorMessage.value = 'No assigned bin. Contact IT regarding putaway strategy.'
            showErrorModal.value = true
        }
    } finally {
        selectedTransferRequest.value = null;
        // Refresh the list after operation
        transferRequestsStore.fetchTransferRequests(plant_code, sloc, forklift);
    }
}


const handleScanResult = async (data) => {
    scanType.value = data.type
    scanResult.value = data
    if (scanType.value === 'bin') {
        await confirmPutaway(data.text)
    } else if (scanType.value === 'wrapping') {
        await confirmWrapping(data.text)
    } else {
        console.error('Unknown scan type:', scanType.value);
    }
}

function handleQrScan(item, type) {
    selectedTransferRequest.value = item;
    scanType.value = type;
    showScanner.value = true;
}

const confirmWrapping = async (text) => {
    if (!selectedTransferRequest.value) {
        console.error('error scanning wrapping QR: no selected transfer request');
        return;
    }
    isLoading.value = true;
    try {
        const response = await transferRequestsStore.confirmWrapping({
            plant_code: route.params.plant_code,
            sloc: route.params.sloc,
            forklift: route.params.forklift,
            physical_id: selectedTransferRequest.value.physical_id,
            transfer_request_id: selectedTransferRequest.value.id,
            qr_text: text
        });
        if (response?.data?.success) {
            toast.message = 'Pallet successfully moved to wrapping area';
            toast.color = 'success';
            toast.show = true;
            selectedTransferRequest.value = null;
        }
    } catch (err) {
        if (err?.response?.data?.message === 'Pallet not found.') {
            errorMessageTitle.value = 'Pallet not found.';
            errorMessage.value = 'Please scan a valid pallet QR code.';
            showErrorModal.value = true;
        } else if (err?.response?.data?.message === 'Invalid QR code for wrapping area.') {
            errorMessageTitle.value = 'Invalid QR code for wrapping area';
            errorMessage.value = 'The scanned QR code is not valid for wrapping area. Please scan the correct QR code at the wrapping area.';
            showErrorModal.value = true;
        } else if (err?.response?.data?.message === 'No Inventory') {
            errorMessageTitle.value = 'No Batch Assigned';
            errorMessage.value = 'No batch assigned on pallet. Please verify or coordinate with Production for reconciliation.';
            showErrorModal.value = true;
        } else if (err?.response?.data?.message === 'Already on wrapping Area') {
            errorMessageTitle.value = 'Wrapping not yet detected';
            errorMessage.value = 'Wrapping completion not yet detected. If completed, raise to IT for assistance.';
            showErrorModal.value = true;
        } else if (err?.response?.data?.message === 'Pallet is already wrapped.') {
            errorMessageTitle.value = 'Pallet Already Wrapped';
            errorMessage.value = 'This pallet is already tagged as wrapped. If this is incorrect, please raise to IT for assistance.';
            showErrorModal.value = true;
        } else {
            errorMessageTitle.value = 'An unexpected error occurred.';
            errorMessage.value = 'Please scan a valid pallet QR code.';
            showErrorModal.value = true;
        }
    } finally {
        isLoading.value = false;
        transferRequestsStore.fetchTransferRequests(route.params.plant_code, route.params.sloc, route.params.forklift);
    }
}

const confirmPutaway = async (text) => {
    if (!selectedTransferRequest.value) {
        console.error('error scanning bin QR: no selected transfer request');
        return;
    }
    isLoading.value = true;
    try {
        const response = await transferRequestsStore.confirmPutaway({
            plant_code: route.params.plant_code,
            sloc: route.params.sloc,
            forklift: route.params.forklift,
            physical_id: selectedTransferRequest.value.physical_id,
            transfer_request_id: selectedTransferRequest.value.id,
            qr_text: text
        });
        if (response?.data?.success) {
            toast.message = 'Pallet successfully moved to storage bin';
            toast.color = 'success';
            toast.show = true;
            selectedTransferRequest.value = null;
        }
    } catch (err) {
        if (err?.response?.data?.message === 'Invalid QR code') {
            errorMessageTitle.value = 'Invalid QR Code.'
            errorMessage.value = 'Please scan a valid QR code.'
            showErrorModal.value = true
        } else if (err?.response?.data?.message === 'Mismatch Block' ) {
            errorMessageTitle.value = 'Mismatched Bin Detected'
            errorMessage.value = 'The scanned bin location does not match the assigned bin for this pallet.'
            showErrorModal.value = true
        } else if (err?.response?.data?.message === 'Not yet wrapped') {
            errorMessageTitle.value = 'Not Yet Wrapped'
            errorMessage.value = 'Pallet not tagged as wrapped. If already wrapped, please raise to IT'
            showErrorModal.value = true
        } else {
            errorMessageTitle.value = 'An unexpected error occurred.'
            errorMessage.value = 'Please scan a valid QR code.'
            showErrorModal.value = true
        }
    } finally {
        isLoading.value = false;
        transferRequestsStore.fetchTransferRequests(route.params.plant_code, route.params.sloc, route.params.forklift);
    }
}

function close() {
    showErrorModal.value = false
    showScanner.value = false
    scanResult.value = null
    selectedTransferRequest.value = null
}

</script>

<style scoped>
.pending-color {
    background-color: #2196F3; /* Blue for pending */
}
</style>
