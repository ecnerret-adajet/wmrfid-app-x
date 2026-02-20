<script setup>
import DefaultModal from '@/components/DefaultModal.vue';
import ApiService from "@/services/ApiService";
import JwtService from '@/services/JwtService';
import { echo } from '@/utils/echo';
import gateIcon from "@images/pick_list_icons/icons8-airport-gate.png";
import loadEndIcon from "@images/pick_list_icons/icons8-calendar-minus.png";
import loadStartIcon from "@images/pick_list_icons/icons8-calendar-plus.png";
import haulerIcon from "@images/pick_list_icons/icons8-company.png";
import plateNumberIcon from "@images/pick_list_icons/icons8-licence-plate.png";
import driverIcon from "@images/pick_list_icons/icons8-name-tag.png";
import rfidIcon from "@images/pick_list_icons/icons8-rfid-50.png";
import shipmentIcon from "@images/pick_list_icons/icons8-truck.png";
import axios from 'axios';
import Moment from 'moment';
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const readerId = route.params.reader;
const bay = route.params.bay;
const loading = ref(false);
const shipment = ref(null);
const noAccessLog = ref(false);
const dialogVisible = ref(false);
const syncingLoading = ref(false);
const errorMessage = ref(null);
const setTimeInSeconds = ref(120);
const refreshTimer = ref(null);
const totalRead = ref(0);

// Variable to watch if tapping load end is already provided
const is_tapping_load_end_found = ref(false);

// initialize null shipment data
const shipmentData = reactive({
    deliveries: [],
    shipment: {}
});

let picklistLogsChannel = null;
let picklistRefreshChannel = null;
let driverTapOutChannel = null;

onMounted(() => {
    fetchData();
    reloadPageChecker();

    // Create private channels for each event type
    const channelNameBase = `shipment.${readerId}.${bay}`;

    picklistLogsChannel = echo.channel(`${channelNameBase}.picklist-logs`);
    picklistRefreshChannel = echo.channel(`${channelNameBase}.picklist-refresh`);
    driverTapOutChannel = echo.channel(`${channelNameBase}.driver-tap-out`);

    picklistLogsChannel.listen('PicklistLogsEvent', onPicklistLogsEvent);
    picklistRefreshChannel.listen('PicklistRefreshEvent', onPicklistRefreshEvent);
    driverTapOutChannel.listen('DriverTapOutEvent', onDriverTapOutEvent);
});

onUnmounted(() => {
    // if (picklistLogsChannel) {
    //     echo.leaveChannel(picklistLogsChannel.name);
    // }

    // if (picklistRefreshChannel) {
    //     echo.leaveChannel(picklistRefreshChannel.name);
    // }

    // if (driverTapOutChannel) {
    //     echo.leaveChannel(driverTapOutChannel.name);
    // }
})

const onPicklistRefreshEvent = (data) => {
    console.log(data);
    if (data.picklistRefresh === true) {
        fetchShipmentDetails(shipment.value?.shipment_number);
    }
}

const processedEpcs = ref({});
const onPicklistLogsEvent = (data) => {
    console.log(data)
    if (data.picklistLog?.current_shipment_number == shipmentData.shipment?.shipment) {
        // Find the delivery with matching batch and increment loaded_qty
        const batch = data.picklistLog.inventory?.batch;
        const is_loaded = data.picklistLog.inventory?.is_loaded;
        const epc = data.picklistLog.inventory?.epc || data.picklistLog?.epc;
        const shipmentNumber = data.picklistLog?.current_shipment_number;

        // Compose a unique key for this shipment, bay, and epc
        const key = `${shipmentNumber}_${bay}_${epc}`;
        if (!epc || !shipmentNumber || !bay) return;
        console.log(key);
        // Prevent double increment: skip if already processed
        if (processedEpcs.value[key]) return;
        processedEpcs.value[key] = true;

        if (batch && (is_loaded == false || is_loaded == 0)) {
            const normalizedBatch = String(batch).trim();

            const delivery = shipmentData.deliveries.find(d => String(d.batch).trim() === normalizedBatch);

            if (!delivery) {
                errorMessage.value = `Batch ${normalizedBatch} does not match any batch in this shipment.`;
                dialogVisible.value = true;
                return;
            }

            const sapExpected = Number(delivery.required_qty) || 0;
            const wmrfidExpected = Number(delivery.required_pallets) || 0;
            const maxAllowedLoadedQty = wmrfidExpected === null
                ? sapExpected
                : Math.min(sapExpected, wmrfidExpected);

            const currentLoadedQty = Number(delivery.loaded_qty) || 0;
            if (currentLoadedQty < maxAllowedLoadedQty) {
                delivery.loaded_qty += 1;
            }
        }
    }
};

const reloadPageChecker = () => {
    setInterval(function () {
        const isLoadingInProgress = shipmentData.shipment.wm_load_start_date && shipmentData.shipment.wm_load_end_date === null;
        const isWaitingForBatches = shipmentData.shipment?.no_batches_yet === true;
        const isNoInventory = shipmentData.shipment?.batch_no_inventory_yet === true && shipmentData.shipment?.no_batches_yet === false;

        if (isLoadingInProgress && isWaitingForBatches === false && isNoInventory === false) {
            // Do not decrement timer or reload during loading
            return;
        }

        setTimeInSeconds.value -= 1;
        refreshTimer.value = setTimeInSeconds.value;
        if (setTimeInSeconds.value == 1) {
            window.location.reload();
        }
    }, 1000);
}

const refreshData = () => {
    // ApiService.get(`test-load-end/${shipment.value?.shipment_number}`)
    //     .then(response => {
    //         window.location.reload();
    //         console.log(response);
    //     })
}

const fetchData = async () => {
    loading.value = true;
    try {
        const response = await ApiService.post(`loading-tapping/${readerId}/${bay}`);
        // const response = await ApiService.get(`test-loading-entry/0000196891`);

        shipment.value = response.data

        if (response.data.original?.error) {
            errorMessage.value = response.data.original.error;
            dialogVisible.value = true;
        } else {
            // Check if the shipment number is 'NO SHIPMENT' from the response
            if (response.data.shipment_number === 'NO SHIPMENT') {
                errorMessage.value = 'No shipment detected. Please tap again';
                dialogVisible.value = true;
            } else {
                // Proceed with fetching shipment details if the shipment number is valid
                if (shipment.value?.shipment_number && shipment.value?.shipment_number !== "") {
                    await fetchShipmentDetails(shipment.value.shipment_number);
                }
            }
        }
    } catch (error) {
        dialogVisible.value = true
        errorMessage.value = error.response?.data?.error || 'An unexpected error occurred.';
    } finally {
        loading.value = false
    }
};

const sapLoadEnd = async (shipmentNumber) => {
    // ApiService.get(`test-load-end/${shipmentNumber}`)
    //     .then(response => {
    //         window.location.reload();
    //         console.log(response);
    //     })
    ApiService.get(`picklist/load-end/${shipmentNumber}`)
        .then(response => {
            window.location.reload();
        })
        .catch(error => {
            console.error(error);
            window.location.reload();
        });

};

const fetchShipmentDetails = async (shipmentNumber) => {
    try {
        const token = JwtService.getToken();
        let bay_no = 1; // Default bay number
        // If bay is provided, use it; otherwise, default to 1
        if (bay) {
            bay_no = bay;
        }
        let url = `picklist/shipment-picklist/${shipmentNumber}`;
        // let url = `test-picklist-data/${shipmentNumber}`;

        const response = await axios.get(url, {
            params: {
                reader_id: readerId,
                bay_no: bay_no
            },
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        // If success
        if (response.data.result == 'S') {
            shipmentData.deliveries = response.data.picklists;
            shipmentData.shipment = response.data;

            totalRead.value = shipmentData.shipment?.total_pallet_to_load;
        } else {
            shipmentData.shipment = response.data;
            if (response.data.result == 'F') {
                errorMessage.value = response.data.message !== '' ? response.data.message : 'Error encountered. Please contact admin.'
                dialogVisible.value = true;
            }
        }
    } catch (error) {
        console.error('Error fetching shipment details:', error);
    }

};

const showSyncConfirmModal = ref(false);

const triggerLoadingSync = () => {
    showSyncConfirmModal.value = true;
};

const proceedSync = () => {
    showSyncConfirmModal.value = false;
    // Place the original sync logic here, or call the actual sync function
    if (shipmentData.shipment?.shipment_number) {
        sapLoadSync(shipmentData.shipment.shipment_number);
    }
};

const cancelSync = () => {
    showSyncConfirmModal.value = false;
};

const sapLoadSync = (shipmentNumber) => {
    ApiService.get(`picklist/sync/${shipmentNumber}`)
        .then(response => {
            if (response.status == 200) {
                // success message here
            }
        })
        .catch((error) => {
            // error message here for something went wrong
        })
};

const close = () => {
    dialogVisible.value = false
}

const displayPlateNumber = computed(() => {
    return shipmentData.shipment?.plate_number_1 ||
        shipmentData.shipment?.plate_number_2 ||
        shipmentData.shipment?.plate_number_3 ||
        ""; // Default value if none exist
});

const displayHaulerName = computed(() => {
    const shipmentInfo = shipmentData.shipment || {};
    const isUsingPlateNumber2 = !shipmentInfo.plate_number_1 && !!shipmentInfo.plate_number_2;

    if (isUsingPlateNumber2) {
        return 'PICK-UP';
    }

    return shipmentInfo.hauler_name || '';
});

const formatDateTime = (date, time) => {
    // Remove time if it's '000000'
    if (time === '00:00:00' || time === '000000' || !time) return '';
    if (!date || date === '00000000') return '';

    // Pad time to 6 digits if needed (for 'HHmmss' format)
    const paddedTime = time.toString().padStart(6, '0');
    return Moment(`${date} ${paddedTime}`, 'YYYYMMDD HHmmss').format('MMM D, YYYY hh:mm:ss A');
};

const palletCalculation = (uom, quantity, numerator = 1, denominator = 1, defaultPalletCapacity = 40) => {
    uom = String(uom).toLowerCase();

    if (uom === 'kg') {
        // Convert kg qty to bags, then calculate pallets
        return Math.ceil((quantity / (numerator / denominator)) / defaultPalletCapacity);
    }

    if (uom === 'bag') {
        // If bag based, convert quantity
        const convertedQuantity = quantity * (numerator / denominator);
        return Math.ceil((convertedQuantity / (numerator / denominator)) / defaultPalletCapacity);
    }

    // Default fallback: treat as bags and divide by default pallet capacity
    return Math.ceil(quantity / defaultPalletCapacity);
}

const toast = ref({
    message: 'Inventory refreshed',
    color: 'success',
    show: false
});

const chunkArray = (arr, size) => {
    const result = []
    for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size))
    }
    return result
}

const deliveryChunks = computed(() => chunkArray(shipmentData.deliveries || [], 5))

const carouselIndex = ref(0)

watch(
    () => dialogVisible.value,
    (val) => {
        if (val) {
            setTimeout(() => {
                dialogVisible.value = false
            }, 6000)
        }
    }
)

// Add this computed to get the total loaded quantity
const totalLoadedQty = computed(() =>
    shipmentData.deliveries?.reduce((sum, item) => sum + (item.loaded_qty || 0), 0)
);

const totalRequiredQtyByBatch = computed(() =>
    shipmentData.deliveries?.reduce((sum, item) => sum + (Number(item.required_pallets) || 0), 0)
);

const isLoadedQtySatisfiedPerBatch = computed(() => {
    if (!shipmentData.deliveries?.length) return false;

    return shipmentData.deliveries.every(item => {
        const requiredQty = Number(item.required_pallets) || 0;
        const loadedQty = Number(item.loaded_qty) || 0;

        return parseInt(loadedQty) === parseInt(requiredQty);
    });
});

const isBatchMismatchErrorShown = ref(false);

const onDriverTapOutEvent = (data) => {
    // Attempt to find driver tap out only if picklist satisfied
    // if (totalLoadedQty.value > 0 && totalLoadedQty.value >= shipmentData.shipment?.total_pallet_to_load) {
    console.log(data);
    if (data.driverTapOut?.shipment_number == shipmentData.shipment?.shipment && data.driverTapOut?.load_end_date === null) {
        if (data.driverTapOut?.is_tap_out_found === true) {
            is_tapping_load_end_found.value = true;
        } else {
            // errorMessage.value = 'No tap out found. Please tap out again';
            // dialogVisible.value = true;
        }
    }
    // }
}

// Stop listening to event once found
// watch(is_tapping_load_end_found.value, (newValue) => {
//     if (newValue) {
//         // Stop listening to driver tap out events once found
//         if (driverTapOutChannel) {
//             driverTapOutChannel.stopListening('DriverTapOutEvent', onDriverTapOutEvent);
//         }
//     }
// });

watch(
    [isLoadedQtySatisfiedPerBatch, () => is_tapping_load_end_found.value],
    ([isSatisfiedPerBatch, tappingLoadEndFound]) => {
        if (tappingLoadEndFound === true && isSatisfiedPerBatch) {
            sapLoadEnd(shipmentData.shipment.shipment);
        }
    },
    { immediate: true }
);

const progressPercentage = computed(() => {
    const total = totalRequiredQtyByBatch.value || 0;
    if (total === 0) return 0;

    return Math.min(Math.round((totalLoadedQty.value / total) * 100), 100);
});

const carouselPageIndicator = computed(() => {
    const totalPages = deliveryChunks.value.length || 0;
    if (totalPages === 0) return 'Page 0 of 0';

    return `Page ${carouselIndex.value + 1} of ${totalPages}`;
})

const goToPrevCarouselPage = () => {
    const totalPages = deliveryChunks.value.length;
    if (totalPages <= 1) return;

    carouselIndex.value = (carouselIndex.value - 1 + totalPages) % totalPages;
}

const goToNextCarouselPage = () => {
    const totalPages = deliveryChunks.value.length;
    if (totalPages <= 1) return;

    carouselIndex.value = (carouselIndex.value + 1) % totalPages;
}

</script>
<template>
    <v-progress-linear v-if="loading" indeterminate color="primary"></v-progress-linear>

    <div v-else class="py-2 px-8 whiteBackground">

        <div>
            <v-card
                v-if="shipmentData.shipment?.no_batches_yet === false && shipmentData.shipment?.wm_load_end_date === null && shipmentData.shipment?.batch_no_inventory_yet === true"
                class="mb-4 pa-4 d-flex align-center" color="info" variant="tonal" elevation="3"
                style="border-left: 6px solid #2196f3;">
                <VRow class="w-100" align="center">
                    <VCol cols="12" md="8" class="d-flex flex-column justify-center">
                        <div class="text-h6 font-weight-bold mb-1" style="color: #1976d2;">
                            <v-icon color="info" class="mr-2" size="32" icon="ri-inbox-line"></v-icon>
                            No Available Inventory
                        </div>
                        <div class="text-body-1 mb-2">
                            There are currently no pallets available for loading on certain DO.<br>
                            <span class="font-italic" style="color: #2196f3;">Please contact warehouse production or
                                admin.</span>
                        </div>
                    </VCol>
                    <VCol cols="12" md="4" class="d-flex flex-column align-center justify-center">
                        <div class="text-h4 font-weight-black" style="color: #2196f3;">
                            No Inventory
                        </div>
                        <div style="color: #2196f3;" class="d-flex align-center justify-center">
                            Reloading in <span class="text-h4 font-weight-black mx-2" style="color: #2196f3;">{{
                                refreshTimer }}</span>
                            <span class="text-h5 font-weight-regular" style="color: #2196f3;">seconds</span>
                        </div>
                    </VCol>
                </VRow>
            </v-card>
            <v-card v-else-if="shipmentData.shipment?.no_batches_yet === true" class="mb-4 pa-4 d-flex align-center"
                color="warning" variant="tonal" elevation="3" style="border-left: 6px solid #ff9800;">
                <VRow class="w-100" align="center">
                    <VCol cols="12" md="8" class="d-flex flex-column justify-center">
                        <div class="text-h6 font-weight-bold mb-1" style="color: #e65100;">
                            <v-icon color="warning" class="mr-2" size="32" icon="ri-time-line"></v-icon>
                            Awaiting Batches
                        </div>
                        <div class="text-body-1 mb-2">
                            No batches found for this shipment yet<br>
                            <span class="font-italic" style="color: #ff9800;">Please wait for batches to be
                                picked.</span>
                        </div>
                    </VCol>
                    <VCol cols="12" md="4" class="d-flex flex-column align-center justify-center">
                        <div class="text-h4 font-weight-black" style="color: #ff9800;">
                            No Available Batches Yet
                        </div>
                        <div style="color: #e65100;" class="d-flex align-center justify-center">
                            Reloading in <span class="text-h4 font-weight-black text-warning mx-2">{{ refreshTimer
                                }}</span>
                            <span class="text-h5 font-weight-regular" style="color: #e65100;">seconds</span>
                        </div>
                    </VCol>
                </VRow>
            </v-card>

            <v-card
                v-else-if="shipmentData.shipment.wm_load_start_date && shipmentData.shipment.wm_load_end_date === null && !isLoadedQtySatisfiedPerBatch"
                class="mb-4 pa-4 d-flex align-center" color="warning" variant="tonal" elevation="3"
                style="border-left: 6px solid #ff9800;">
                <VRow class="w-100" align="center">
                    <VCol cols="12" md="8" class="d-flex flex-column justify-center">
                        <div class="text-h6 font-weight-bold mb-1" style="color: #e65100;">
                            <v-icon color="warning" class="mr-2" size="32" spin icon="ri-progress-1-line"></v-icon>
                            Loading In Progress
                        </div>
                        <div class="text-body-1 mb-2">
                            Please wait while the current loading operation completes.<br>
                            <span class="font-italic" style="color: #ff9800;">Do not proceed until loading is
                                finished.</span>
                        </div>
                        <v-progress-linear :model-value="progressPercentage" color="warning" height="14" rounded
                            :indeterminate="!totalRequiredQtyByBatch">
                            <template #default>
                                <span class="text-caption font-weight-bold">
                                    {{ Math.min(totalLoadedQty, totalRequiredQtyByBatch || 0) }}
                                    out of
                                    {{ totalRequiredQtyByBatch || 0 }}
                                    <span v-if="totalRequiredQtyByBatch">
                                        ({{ progressPercentage }}%)
                                    </span>
                                </span>
                            </template>
                        </v-progress-linear>
                    </VCol>
                    <VCol cols="12" md="4" class="d-flex flex-column align-center justify-center">
                        <div class="text-caption mb-1" style="color: #e65100;">Status</div>
                        <div class="text-h4 font-weight-black" style="color: #ff9800;">
                            Loading...
                        </div>
                    </VCol>
                </VRow>
            </v-card>

            <v-card
                v-else-if="shipmentData.shipment.wm_load_end_date === null && is_tapping_load_end_found === false && isLoadedQtySatisfiedPerBatch"
                class="mb-4 pa-4 d-flex align-center" color="success" variant="tonal" elevation="3"
                style="border-left: 6px solid #4caf50;">
                <VRow class="w-100" align="center">
                    <VCol cols="12" md="8" class="d-flex flex-column justify-center">
                        <div class="text-h6 font-weight-bold mb-1" style="color: #4caf50;">
                            <v-icon color="success" class="mr-2" size="32" spin icon="ri-progress-1-line"></v-icon>
                            Pallet Loading Status: Completed
                        </div>
                        <div class="text-body-1 mb-2">
                            We are currently awaiting the driver to tap out.<br>
                            <span class="font-italic" style="color: #4caf50;">Please wait up to 30 seconds after the tap
                                out.</span>
                        </div>
                        <v-progress-linear :model-value="progressPercentage" color="success" height="14" rounded
                            :indeterminate="!totalRequiredQtyByBatch">
                            <template #default>
                                <span class="text-caption font-weight-bold">
                                    {{ Math.min(totalLoadedQty, totalRequiredQtyByBatch || 0) }} out of {{
                                        totalRequiredQtyByBatch || 0 }}
                                    <span v-if="totalRequiredQtyByBatch">
                                        ({{ progressPercentage }}%)
                                    </span>
                                </span>
                            </template>
                        </v-progress-linear>
                    </VCol>
                    <VCol cols="12" md="4" class="d-flex flex-column align-center justify-center">
                        <div class="text-caption mb-1" style="color: #4caf50;">Status</div>
                        <div class="text-h4 font-weight-black" style="color: #66bb6a;">
                            Pallet Completed
                        </div>
                    </VCol>
                </VRow>
            </v-card>

            <v-card v-else class="mb-4 pa-4 d-flex align-center" color="primary" variant="tonal" elevation="3"
                style="border-left: 6px solid #43a047;">
                <VRow class="w-100" align="center">
                    <VCol cols="12" md="8" class="d-flex flex-column justify-center">
                        <div class="text-h6 font-weight-bold mb-1" style="color: #2e7d32;">
                            Loading Complete!
                        </div>
                        <div class="text-body-1 mb-2">
                            Next loading will start soon.<br>
                            <span class="font-italic" style="color: #388e3c;">Please tap in to proceed.</span>
                        </div>
                        <v-progress-linear :model-value="(refreshTimer / 120) * 100" color="success" height="8" rounded
                            class="mt-2" />
                    </VCol>
                    <VCol cols="12" md="4" class="d-flex flex-column align-center justify-center">
                        <div class="text-caption mb-1" style="color: #388e3c;">Reloading in</div>
                        <div class="text-h2 font-weight-black" style="color: #43a047;">
                            {{ refreshTimer }}
                            <span class="text-h5 font-weight-regular" style="color: #388e3c;">seconds</span>
                        </div>
                    </VCol>
                </VRow>
            </v-card>
            <VRow>
                <VCol md="8">
                    <VList lines="one" density="compact"
                        style="border: 2px solid #329b62; padding-top: 0px !important;">
                        <VListItem>
                            <VRow class="table-row" no-gutters>
                                <VCol md="6" class="table-cell d-inline-flex">
                                    <VRow class="table-row">
                                        <VCol md="6" class="d-inline-flex align-center">
                                            <v-img :src="shipmentIcon" class="icon-class" />
                                            <span class="text-h6 text-uppercase ml-3 font-weight-black "
                                                style="margin-top: 1px;">Shipment</span>
                                        </VCol>
                                        <VCol md="6" class="d-inline-flex align-center">
                                            <span class="font-weight-bold">{{ shipmentData.shipment?.shipment }}</span>
                                        </VCol>
                                    </VRow>
                                </VCol>
                                <VCol md="6" class="table-cell d-inline-flex">
                                    <VRow class="table-row">
                                        <VCol md="6" class="d-inline-flex align-center">
                                            <v-img :src="gateIcon" class="icon-class" />
                                            <span class="text-h6 text-uppercase ml-3 font-weight-black "
                                                style="margin-top: 1px;">Gate in</span>
                                        </VCol>
                                        <VCol md="4" class="d-inline-flex align-center">
                                            <span class="font-weight-bold"> {{shipmentData.shipment?.gate_in ? Moment(shipmentData.shipment?.gate_in).format('MMM D, YYYY hh:mm A') : ''}}</span>
                                        </VCol>
                                        <VCol md="1" class="d-inline-flex align-center">
                                            <VTooltip location="top">
                                                <template #activator="{ props }">
                                                    <VIcon class="clickable-icon" v-bind="props" size="30"
                                                        color="primary" icon="ri-refresh-fill" @click="refreshData" />
                                                </template>
                                                <span>Refresh Data</span>
                                            </VTooltip>
                                        </VCol>
                                    </VRow>
                                </VCol>
                            </VRow>
                        </VListItem>
                        <VListItem>
                            <VRow class="table-row" no-gutters>
                                <VCol md="6" class="table-cell d-inline-flex">
                                    <VRow class="table-row">
                                        <VCol md="6" class="d-inline-flex align-center">
                                            <v-img :src="plateNumberIcon" class="icon-class" />
                                            <span class="text-h6 text-uppercase ml-3 font-weight-black"
                                                style="margin-top: 1px;">Plate
                                                Number</span>
                                        </VCol>
                                        <VCol md="6" class="d-inline-flex align-center">
                                            <span class="font-weight-bold">{{ displayPlateNumber }}</span>
                                        </VCol>
                                    </VRow>
                                </VCol>
                                <VCol md="6" class="table-cell d-inline-flex">
                                    <VRow class="table-row">
                                        <VCol md="6" class="d-inline-flex align-center">
                                            <v-img :src="loadStartIcon" class="icon-class" />
                                            <span class="text-h6 text-uppercase ml-3 font-weight-black"
                                                style="margin-top: 1px;">Load
                                                Start</span>
                                        </VCol>
                                        <VCol md="6" class="d-inline-flex align-center">
                                            <span class="font-weight-bold">{{
                                                formatDateTime(shipmentData.shipment.wm_load_start_date,
                                                    shipmentData.shipment.wm_load_start_time) }}</span>
                                        </VCol>
                                    </VRow>

                                </VCol>
                            </VRow>
                        </VListItem>
                        <VListItem>
                            <VRow class="table-row" no-gutters>
                                <VCol md="6" class="table-cell d-inline-flex">
                                    <VRow class="table-row">
                                        <VCol md="6" class="d-inline-flex align-center">
                                            <v-img :src="driverIcon" class="icon-class" />
                                            <span class="text-h6 text-uppercase ml-3 font-weight-black"
                                                style="margin-top: 1px;">Driver
                                                Name</span>
                                        </VCol>
                                        <VCol md="6" class="d-inline-flex align-center">
                                            <span class="font-weight-bold">{{ shipmentData.shipment?.driver_name
                                                }}</span>
                                        </VCol>
                                    </VRow>
                                </VCol>
                                <VCol md="6" class="table-cell d-inline-flex">
                                    <VRow class="table-row">
                                        <VCol md="6" class="d-inline-flex align-center">
                                            <v-img :src="loadEndIcon" class="icon-class" />
                                            <span class="text-h6 text-uppercase ml-3 font-weight-black"
                                                style="margin-top: 1px;">Load End</span>
                                        </VCol>
                                        <VCol md="6" class="d-inline-flex align-center">
                                            <span class="font-weight-bold">{{
                                                formatDateTime(shipmentData.shipment.wm_load_end_date,
                                                    shipmentData.shipment.wm_load_end_time) }}</span>
                                        </VCol>
                                    </VRow>
                                </VCol>

                            </VRow>
                        </VListItem>
                        <VListItem>
                            <VRow class="table-row" no-gutters>
                                <VCol md="6" class="table-cell d-inline-flex">
                                    <VRow class="table-row">
                                        <VCol md="6" class="d-inline-flex align-center">
                                            <v-img :src="haulerIcon" class="icon-class" />
                                            <span class="text-h6 text-uppercase ml-3 font-weight-black"
                                                style="margin-top: 1px;">Hauler
                                                Name</span>
                                        </VCol>
                                        <VCol md="6" class="d-inline-flex align-center">
                                            <div class="font-weight-bold">{{ displayHaulerName }}</div>
                                        </VCol>
                                    </VRow>
                                </VCol>
                                <VCol md="6" class="table-cell d-inline-flex">

                                </VCol>
                            </VRow>
                        </VListItem>


                    </VList>
                    <VDivider />
                </VCol>
                <VCol md="4">
                    <v-sheet class="mx-auto px-6 py-1" elevation="2"
                        style="height: 100%; display: flex; flex-direction: column; background-color: #00A36C;">
                        <div class="text-h4 text-white text-bold-emphasis font-weight-black">
                            Bay No. {{ bay }}

                        </div>
                        <div>
                            <h2 class="text-h4 font-weight-black mt-8" style="font-size: 5rem !important; color: #fff;">
                                <span>{{ totalLoadedQty }}</span> / {{ shipmentData.shipment?.total_pallet_to_load }}
                            </h2>
                        </div>
                        <div class="d-flex justify-between align-center mt-auto">
                            <div class="text-h4 text-white font-weight-bold">
                                Total Pallets
                            </div>
                            <div class="ml-auto">
                                <img :src="rfidIcon" :width="72" :height="72" alt="RFID Icon">
                            </div>
                        </div>
                    </v-sheet>
                </VCol>
            </VRow>
            <div v-if="noAccessLog">
                <div style="min-height: 200px;" class="d-flex justify-center align-center">
                    <h1>No access log found!</h1>
                </div>
            </div>
            <div v-else class="mt-4">
                <div>
                    <VRow no-gutters>
                        <VCol md="3" style="font-size: 18px; background-color: #00A36C;"
                            class="text-uppercase px-3 py-2 text-center font-weight-black text-grey-100">
                            Shipment Details
                        </VCol>
                        <VCol md="3" class="text-uppercase px-3 py-2 text-center font-weight-black text-grey-100"
                            style="background-color: #00A36C; font-size: 18px; border-left: 1px solid #fff; border-right: 1px solid #fff;">
                            Expected (SAP)
                        </VCol>
                        <VCol md="3" class="text-uppercase px-3 py-2 text-center font-weight-black text-grey-100"
                            style="background-color: #00A36C; font-size: 18px; border-right: 1px solid #fff;">
                            Expected (WMRFID)
                        </VCol>
                        <VCol md="3" style="font-size: 18px; background-color: #00A36C;"
                            class="text-uppercase px-3 py-2 text-center font-weight-black text-grey-100">
                            Read (RFID PALLETS)
                        </VCol>
                    </VRow>
                    <div>
                        <div>
                            <div v-if="shipmentData.deliveries.length === 0" style="min-height: 100px;"
                                class="d-flex justify-center align-center border">
                                <span class="text-h4 text-error">No delivery found</span>
                            </div>
                            <v-carousel v-else height="450" hide-delimiters :show-arrows="false" v-model="carouselIndex"
                                :cycle="deliveryChunks.length > 1" :interval="10000">
                                <v-carousel-item v-for="(chunk, index) in deliveryChunks" :key="index">
                                    <v-sheet height="100%">
                                        <div v-for="(delivery, index) in chunk" :key="index">
                                            <VRow no-gutters style="border: 1px solid #329b62;">
                                                <VCol md="3" class="px-3 py-2 text-center rightBorderedGreen">
                                                    <div class="text-center">
                                                        <div class="text-overline mb-1 font-weight-bold"
                                                            style="font-size: 15px !important;">
                                                            {{ delivery.material_desc }}
                                                        </div>
                                                        <div>
                                                            <span style="color: #00A36C;"
                                                                class="text-uppercase text-h5 font-weight-black">
                                                                {{ delivery.material }} - {{ delivery.batch }}
                                                            </span>
                                                            <br>
                                                            <p style="margin-bottom: 0px !important;"
                                                                class="font-weight-bold">
                                                                {{ delivery.quantity_all }} {{ delivery.sales_unit }}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </VCol>
                                                <VCol md="3" class="px-3 py-1.5 text-center rightBorderedGreen"
                                                    style="border-left: 1px solid #fff; border-right: 1px solid #fff;">
                                                    <span class="font-weight-black"
                                                        style="font-size: 3rem; color: #3e3b3b !important;">
                                                        {{ delivery.required_pallets }}
                                                    </span>
                                                </VCol>
                                                <VCol md="3" class="px-3 text-center rightBorderedGreen"
                                                    style="border-right: 1px solid #fff;">
                                                    <div class="font-weight-black"
                                                        style="font-size: 3rem; color: #3e3b3b !important;">
                                                        <span>
                                                            {{ delivery.required_pallets }}
                                                        </span>
                                                    </div>
                                                </VCol>
                                                <VCol md="3" class="px-3 py-1.5 text-center rightBorderedGreen">
                                                    <span class="font-weight-black"
                                                        style="font-size: 3rem; color: #3e3b3b !important;">
                                                        {{ delivery.loaded_qty }}
                                                    </span>
                                                </VCol>
                                            </VRow>
                                        </div>
                                    </v-sheet>
                                </v-carousel-item>
                            </v-carousel>

                            <div v-if="deliveryChunks.length > 1" class="d-flex align-center justify-center mt-3" style="gap: 12px;">
                                <v-btn size="large" variant="outlined" color="primary" @click="goToPrevCarouselPage">
                                    Prev
                                </v-btn>

                                <v-chip color="primary" label size="large">
                                    {{ carouselPageIndicator }}
                                </v-chip>

                                <v-btn size="large" variant="outlined" color="primary" @click="goToNextCarouselPage">
                                    Next
                                </v-btn>
                            </div>


                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <v-dialog v-model="dialogVisible" max-width="600px" persistent>
        <v-sheet class="pa-4 text-center mx-auto" elevation="12" max-width="600" rounded="lg" width="100%">
            <v-icon class="mb-5" color="error" icon="ri-error-warning-line" size="112"></v-icon>

            <h2 class="text-h3 mb-6">Error</h2>

            <p class="mb-4 text-medium-emphasis text-h4">
                {{ errorMessage }}
            </p>

            <v-divider class="mb-4"></v-divider>

            <div class="text-end">
                <!-- <v-btn class="text-none" color="success" variant="flat" width="90" @click="close">
                    Okay
                </v-btn> -->
            </div>
        </v-sheet>
    </v-dialog>

    <DefaultModal :show="showSyncConfirmModal" dialogTitle="Proceed with Sync?" maxWidth="400px" minHeight="200px"
        @close="cancelSync">
        <template #default>
            <div class="text-center">
                <p class="mb-6 text-h5">Are you sure you want to proceed with this action?</p>
                <div class="d-flex justify-end align-center mt-8">
                    <v-btn color="secondary" variant="outlined" @click="cancelSync" class="px-8 mr-3">Cancel</v-btn>
                    <v-btn color="primary" @click="proceedSync" class="px-8">Proceed</v-btn>
                </div>
            </div>
        </template>
    </DefaultModal>

</template>

<style scoped>
.progress-with-icon {
    position: relative;
}

.icon-moving {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    transition: left 0.3s ease-in-out;
    /* Smooth transition for the icon movement */
}

.v-progress-linear__bar {
    position: relative;
    height: 10px;
    /* Progress bar height */
}

.rightBorderedGreen {
    border-right: 1px solid rgba(0, 131, 60, 0.5) !important;
}

.whiteBackground {
    background-color: white !important;
}

.v-card-item__content {
    padding-top: 0 !important;
}

.v-card-item {
    padding-top: 0 !important;
    padding-bottom: 15px !important;
}

.v-table .v-table__wrapper>table>tbody>tr:not(:last-child)>td,
.v-table .v-table__wrapper>table>tbody>tr:not(:last-child)>th {
    border-bottom: 1px solid rgba(0, 131, 60, 0.5) !important;
}

.icon-class {
    max-width: 30px !important;
    max-height: 30px !important;
}

.clickable-icon {
    cursor: pointer;
    transition: color 0.3s ease !important;
    /* Smooth transition for color change */
}

.clickable-icon:hover {
    color: #006830 !important;
    /* Change color on hover (replace with your desired color) */
}

.v-table--density-default {
    --v-table-header-height: 36px;
}
</style>
