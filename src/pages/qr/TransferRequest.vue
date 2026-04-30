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

                <div class="d-flex align-center ga-2">
                    <v-btn
                        size="small"
                        color="warning"
                        variant="elevated"
                        prepend-icon="ri-flag-2-line"
                        @click="showWeakPalletModal = true"
                    >
                        Tag Weak Pallet
                    </v-btn>
                    <VTooltip location="top">
                        <template #activator="{ props }">
                            <VIcon class="clickable-icon" v-bind="props" size="30"
                                color="primary" icon="ri-refresh-fill" @click="syncTransferRequests" />
                        </template>
                        <span>Refresh Data</span>
                    </VTooltip>
                </div>
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
            <div class="mb-2 font-weight-medium text-h4">
                Showing {{ filteredItems.transfer_requests.length }} entries
            </div>
            <div class="mb-4">
                <v-text-field
                    v-model="searchQuery"
                    label="Search"
                    clearable
                    density="compact"
                    variant="outlined"
                    hide-details
                    prepend-inner-icon="mdi-magnify"
                />
            </div>
            <v-row>
                <v-col
                    v-for="item in filteredItems?.transfer_requests"
                    :key="item.id"
                    cols="12"
                >
                <v-card
                    class="pa-3"
                    rounded="lg"
                    elevation="2"
                    :id="'tr-card-' + item.id"
                >
                    <!-- Header -->
                    <div class="d-flex justify-space-between align-center mb-2">
                        <div class="font-weight-bold">
                            TR #: {{ item.transfer_request_id }}
                        </div>
                        <v-chip
                            size="small"
                            :color="getStatusColor(item.status_text)"
                            dark
                            class="clickable"
                            @click="selectedStatus = item.status_text"
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

                        <v-sheet v-if="item.status_text !== 'Invalid Request'"  class="w-100 pa-2 mb-2" color="#f5f5f5" rounded>
                            <div class="d-flex justify-space-between align-center mb-1">
                                <span>RFID Wrapped Date:</span>
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

                        <v-sheet v-if="item.status_text === 'Invalid Request'"  class="w-100 pa-2 mb-2" color="#F75959" rounded>
                            <span>Invalid Request</span>
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
                        <v-btn v-if="item.status_text !== 'Invalid Request'"
                            color="primary"
                            block
                            :loading="selectedTransferRequest === item.transfer_request_id"
                            class="mt-1"
                            @click="generateTransferOrder(item)"
                        >
                            Generate Transfer Order
                        </v-btn>
                        <v-sheet v-else class="w-100 pa-2 mb-2" color="#F75959" rounded>
                            <span>Invalid Request</span>
                        </v-sheet>
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

        <!-- Tag Weak Pallet Modal -->
        <DefaultModal
            :show="showWeakPalletModal"
            dialog-title="Tag Weak Pallet"
            max-width="500px"
            @close="closeWeakPalletModal"
        >
            <div class="d-flex justify-space-between align-center mb-4">
                <v-autocomplete
                    v-model="weakPalletInfo.packing_no"
                    :items="items.packing_lines"
                    :loading="isLoading"
                    return-object
                    placeholder="Packing Line"
                />
            </div>
       
            <div class="d-flex ga-2 mb-4" v-if="weakPalletInfo.packing_no">
    
                <!-- Search Pallet -->
                <v-text-field
                    v-model="weakPalletSearch"
                    label="Search Pallet"
                    placeholder="Enter pallet ID or name"
                    append-inner-icon="ri-search-line"
                    variant="outlined"
                    density="compact"
                    hide-details
                />
                <v-btn
                    color="primary"
                    variant="elevated"
                    :loading="isSearchingPallet"
                    @click="findPallet()"
                >
                    Search
                </v-btn>
            </div>

            <v-card
                v-if="weakPalletInfo.physical_id"
                class="pa-4"
                elevation="3"
                rounded="lg"
            >
                <!-- Header -->
                <div class="text-h6 font-weight-bold text-primary mb-4">
                    Pallet Information
                </div>

                <v-sheet color="grey-lighten-4" rounded="lg" class="pa-2">
                    
                    <!-- Pallet Name -->
                    <v-row class="align-center mb-3">
                        <v-col cols="4">
                            Pallet Name
                        </v-col>
                        <v-col cols="8">
                            <div class="font-weight-medium">
                                {{ weakPalletInfo.physical_id }}
                            </div>
                        </v-col>
                    </v-row>

                    <!-- Commodity -->
                    <v-row class="align-center mb-3">
                        <v-col cols="4">
                            Commodity
                        </v-col>
                        <v-col cols="8">
                            <v-autocomplete
                                v-model="weakPalletInfo.material"
                                :items="materials"
                                :loading="isLoading"
                                item-title="description"
                                item-value="id"
                                return-object
                                density="comfortable"
                                variant="outlined"
                                hide-details
                                @update:modelValue="onCommoditySelect"
                            />
                        </v-col>
                    </v-row>

                    <!-- Batch -->
                    <v-row class="align-center mb-3">
                        <v-col cols="4">
                            Batch
                        </v-col>
                        <v-col cols="8">
                            <v-autocomplete
                                v-model="weakPalletInfo.batch"
                                :items="filteredBatches"
                                :loading="isLoading"
                                item-title="COMMODITY"
                                item-value="ID"
                                return-object
                                density="comfortable"
                                variant="outlined"
                                hide-details
                                :disabled="!weakPalletInfo.material"
                            />
                        </v-col>
                    </v-row>

                    <!-- Quantity -->
                    <v-row class="align-center mb-3">
                        <v-col cols="4">
                            Quantity
                        </v-col>
                        <v-col cols="8">
                            <v-text-field
                                v-model.number="weakPalletQuantity"
                                type="number"
                                min="1"
                                density="comfortable"
                                variant="outlined"
                                hide-details
                                :suffix="weakPalletInfo.unit || 'bags'"
                            />
                        </v-col>
                    </v-row>

                    <!-- Reason -->
                    <v-row class="align-center">
                        <v-col cols="4">
                            Reason
                        </v-col>
                        <v-col cols="8">
                            <v-autocomplete
                                v-model="weakPalletInfo.reason"
                                :items="items.weak_pallet_reasons"
                                :loading="isLoading"
                                item-title="name"
                                item-value="id"
                                return-object
                                density="comfortable"
                                variant="outlined"
                                hide-details
                            />
                        </v-col>
                    </v-row>

                </v-sheet>
            </v-card>

            <v-empty-state
                v-else
                icon="ri-search-line"
                title="Search for a pallet"
                text="Enter a pallet ID or name above to view its details."
                class="mt-2"
            />


            <template v-if="weakPalletInfo.physical_id">
                <!-- camera buttons -->
                <div class="mb-2">
                    <v-btn 
                        v-if="!stream"
                        class="mt-4 mr-2"
                        color="info"
                        variant="elevated"
                        @click="startCamera()"
                    >
                        Take Photo
                    </v-btn>
                    <v-btn
                        v-if="stream"
                        class="mt-4 mr-2"
                        color="primary"
                        variant="elevated"
                        @click="captureImage()"
                    >
                        Capture
                    </v-btn>
                    <v-btn 
                        v-if="stream"
                        class="mt-4 mr-2"
                        color="error"
                        variant="elevated"
                        @click="stopCamera()"
                    >
                        Stop Camera
                    </v-btn>
                    <v-btn 
                        v-if="stream"
                        class="mt-4"
                        color="default"
                        variant="elevated"
                        @click="switchCamera()"
                    >
                        {{ useFront ? 'Front' : 'Back' }}
                    </v-btn>
                </div>

                <!-- image preview -->
                <div v-if="image">
                    <h4>Preview:</h4>
                    <img :src="image" width="100%" />
                </div>
                <div v-else class="d-flex ga-2 mt-4">
                    <video ref="video" autoplay playsinline width="100%"></video>
                    <canvas ref="canvas" style="display:none;"></canvas>
                </div>

                
            </template>

             <v-divider class="mt-4" />

            <div class="d-flex ga-2 mt-4 justify-end">
                <v-btn
                    variant="outlined"
                    @click="closeWeakPalletModal"
                >
                    Cancel
                </v-btn>
                <v-btn
                    v-if="weakPalletInfo.physical_id && weakPalletInfo.material && image && weakPalletInfo.reason"
                    color="warning"
                    variant="elevated"
                    :disabled="!weakPalletInfo"
                    :loading="isConfirmingWeakPallet"
                    @click="confirmWeakPallet"
                >
                    Confirm Weak Pallet
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
import ApiService from '@/services/ApiService';
import { useTransferRequestsStore } from '@/stores/transferRequests';
import { debounce } from 'lodash';
import moment from 'moment';
import { storeToRefs } from 'pinia';
import { computed, onMounted, reactive, ref } from 'vue';
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


const statusOptions = ['Pending', 'For Wrapping', 'For Putaway', 'Completed', 'Invalid Request']
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
        case 'Pending': return 'error'
        case 'For Wrapping': return 'info'
        case 'Completed': return 'primary'
        default: return 'grey'
    }
}

const searchQuery = ref('');
const filteredItems = computed(() => {
    if (!items.value || !items.value.transfer_requests) return { transfer_requests: [] };
    let filtered = items.value.transfer_requests;
    if (selectedStatus.value) {
        filtered = filtered.filter(item => item.status_text === selectedStatus.value);
    }
    if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase();
        filtered = filtered.filter(item => {
            return (
                (item.physical_id && item.physical_id.toLowerCase().includes(q)) ||
                (item.batch && item.batch.toLowerCase().includes(q)) ||
                (item.transfer_request_id && item.transfer_request_id.toString().toLowerCase().includes(q)) ||
                (item.transfer_order?.transfer_order_id && item.transfer_order.transfer_order_id.toString().toLowerCase().includes(q))
            );
        });
    }
    return { ...items.value, transfer_requests: filtered };
});

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
        // Wait for the store to refresh
        await transferRequestsStore.fetchTransferRequests(plant_code, sloc, forklift);
        // Find the updated item
        const updated = transferRequestsStore.items?.transfer_requests?.find(tr => tr.id === item.id);
        if (updated) {
            // Set the filter to the new status
            selectedStatus.value = updated.status_text;
            // Scroll to the card after DOM update
            setTimeout(() => {
                const el = document.getElementById('tr-card-' + updated.id);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    } catch (err) {
        if (err?.response?.data?.message === 'No Assigned Bin' ) {
            errorMessageTitle.value = 'Error'
            errorMessage.value = 'No assigned bin. Contact IT regarding putaway strategy.'
            showErrorModal.value = true
        }
    } finally {
        selectedTransferRequest.value = null;
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

// Tag Weak Pallet
const showWeakPalletModal = ref(false)
const weakPalletSearch = ref('')

const weakPalletInfoInitialState = () => ({
    id: null,
    physical_id: null,
    batch: null,
    commodity_name: null,
    quantity: 40,
    unit: 'bags',
    material: null,
    reason: null,
    packing_no: null,
});

const weakPalletInfo = reactive(weakPalletInfoInitialState());
const materials = ref([]);
const plc_batches = ref([]);
const weakPalletQuantity = ref(40);
const isSearchingPallet = ref(false);
const isConfirmingWeakPallet = ref(false);

const confirmWeakPallet = async () => {

    isConfirmingWeakPallet.value = true
    try {
        await ApiService.post(
            'rfid-pallet/confirm-weak-pallet',
            {
                pallet_info: weakPalletInfo,
                plant_code: route.params.plant_code,
                sloc: route.params.sloc,
                image: image.value // ✅ send directly
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        )
        toast.message = 'Pallet successfully tagged as weak'
        toast.color = 'warning'
        toast.show = true
        closeWeakPalletModal()
        syncTransferRequests();
    } catch (err) {
        errorMessageTitle.value = 'Error'
        errorMessage.value = err?.response?.data?.message || 'An unexpected error occurred.'
        showErrorModal.value = true
    } finally {
        isConfirmingWeakPallet.value = false
    }
}

const closeWeakPalletModal = () => {
    showWeakPalletModal.value = false
    resetPalletInfo();
}

const resetPalletInfo = () => {
    weakPalletSearch.value = '';
    Object.assign(weakPalletInfo, weakPalletInfoInitialState());
    image.value = null;
    stopCamera();
};

const findPallet = debounce(async () => {
    isLoading.value = true;

    try {
        const response = await ApiService.query(
            `rfid-pallet/find-pallet`,
            {
                params: { 
                    pallet_name: weakPalletSearch.value, 
                    plant_code: route.params.plant_code 
                }
            }
        );

        weakPalletInfo.id = response.data.id;
        weakPalletInfo.physical_id = response.data.name;
        weakPalletInfo.storage_location_id = response.data.storage_location_id;

        if (weakPalletInfo.physical_id){
            searchMaterials();
        }
    
    } catch (error) {
        console.error(error);
    } finally {
        isLoading.value = false;
    }
}, 500);

const searchMaterials = debounce(async (search) => {
    // isLoading.value = true;

    try {
        const response = await ApiService.query(
            `rfid-pallet/${route.params.plant_code}/search-materials`,
            {
                params: { 
                    search, 
                    packing_no: weakPalletInfo.packing_no
                }
            }
        );

        materials.value = response.data.materials;
        plc_batches.value = response.data.plc_batches;

    } catch (error) {
        console.error(error);
    } finally {
        // isLoading.value = false;
    }
}, 500);

const filteredBatches = computed(() => {
    return plc_batches.value.filter(b =>
        b.COMMODITY?.trim().substring(0, 4) ==
        weakPalletInfo?.material?.code?.trim()
    );
});

// set default batcj
const onCommoditySelect = (value) => {
    weakPalletInfo.batch = plc_batches.value.find(b =>
        b.COMMODITY?.trim().substring(0, 4) ==
        weakPalletInfo?.material?.code?.trim() && b.STOP_T == null
    ) || null;
};


const video = ref(null)
const canvas = ref(null)
const image = ref(null)
const stream = ref(null)
const useFront = ref(false);

const startCamera = async () => {
    // 1. Stop all tracks in the current stream to release the hardware
    if (stream.value) {
        stream.value.getTracks().forEach(track => track.stop());
    }

    image.value = null;

    try {
        // 2. Request the new stream based on the updated facingMode
        stream.value = await navigator.mediaDevices.getUserMedia({ 
            video: {
                facingMode: useFront.value ? "user" : "environment"
            }
        });

        // 3. Attach the new stream to the video element
        if (video.value) {
            video.value.srcObject = stream.value;
        }
    } catch (err) {
        console.error("Error accessing camera:", err);
    }
}
const stopCamera = () => {
  if (stream.value) {
    stream.value.getTracks().forEach(track => track.stop())
    stream.value = null
  }

  if (video.value) {
    video.value.srcObject = null
  }
}

const captureImage = () => {
    const ctx = canvas.value.getContext('2d')
    canvas.value.width = video.value.videoWidth
    canvas.value.height = video.value.videoHeight
    ctx.drawImage(video.value, 0, 0)
    image.value = canvas.value.toDataURL('image/png') // base64
    stopCamera();
}

const switchCamera = () => {
    if (useFront.value == true){
        useFront.value = false;
    }
    else {
        useFront.value = true;
    }
}

</script>

<style scoped>
.pending-color {
    background-color: #2196F3; /* Blue for pending */
}
</style>
