<script setup>
import DefaultModal from '@/components/DefaultModal.vue';
import Loader from '@/components/Loader.vue';
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import qrScan from '@images/qr-scan.png';
import moment from 'moment';
import { ref } from 'vue';
import ScannerModal from './ScannerModal.vue';

const props = defineProps({
    plant_code: String,
    sloc: String,
    forklift: String,
})

const palletInfo = ref(null)
const showErrorModal = ref(false)
const errorMessageTitle = ref('')
const errorMessage = ref('')
const scanType = ref('pallet')
const isLoading = ref(false)
const shouldWrap = computed(() =>
    palletInfo.value?.plant_configuration?.has_wrapping_area === true &&
    (palletInfo.value?.is_wrapped === 0 || palletInfo.value?.is_wrapped === false)
);

const hasWrappingArea = computed(() => palletInfo.value?.plant_configuration?.has_wrapping_area === true);

const handleScanResult = async (data) => {
    scanType.value = data.type
    if (scanType.value === 'pallet') {
        await getPalletInfo(data.text)
    } else if (scanType.value === 'bin') {
        await getBinLocationInfo(data.text)
    } else if (scanType.value === 'wrapping') {
        // For wrapping area, we can directly call the putaway API since there's no QR code to validate
        await confirmWrapping(data.text)
    }
}

onMounted(async () => {
    await checkPendingPallet();
})

const pendingPallet = ref(null);
const checkPendingPallet = async () => {
    let url = `rfid/pallet/${encodeURIComponent(props.plant_code)}/${encodeURIComponent(props.sloc)}/${encodeURIComponent(props.forklift)}/check-pending-pallet`;
    isLoading.value = true
    try {
        const response = await ApiService.query(url, {})
        pendingPallet.value = response.data
        if (pendingPallet.value && pendingPallet.value.current_pallet) {
            await getPalletInfo(pendingPallet.value.current_pallet)
        }
    } catch (err) {
        console.error('Error checking pending pallet:', err)
    } finally {
        isLoading.value = false
    }
}

const getPalletInfo = async (physicalId = null) => {
    let url = `rfid/pallet/${physicalId}/${encodeURIComponent(props.plant_code)}/${encodeURIComponent(props.sloc)}/${encodeURIComponent(props.forklift)}/info`;
    isLoading.value = true
    try {
        const response = await ApiService.query(url, {})
        palletInfo.value = response.data.data
    } catch (err) {
        if (err?.response?.data?.message === 'Pallet not found.') {
            errorMessageTitle.value = 'Pallet not found.'
            errorMessage.value = 'Please scan a valid pallet QR code.'
            showErrorModal.value = true
        } else if (err?.response?.data?.message === 'Weak Signal' ) {
            errorMessageTitle.value = 'Weak Signal'
            errorMessage.value = 'The pallet tag is weak. Please coordinate with Engineering for RFID tags re-installation.'
            showErrorModal.value = true
        } else if (err?.response?.data?.message === 'No Inventory' ) {
            errorMessageTitle.value = 'No Batch Assigned'
            errorMessage.value = 'No batch assigned on pallet. Please verify or coordinate with Production for reconciliation.'
            showErrorModal.value = true

        } else {
            errorMessageTitle.value = 'An unexpected error occurred.'
            errorMessage.value = 'Please scan a valid pallet QR code.'
            showErrorModal.value = true
        }
    } finally {
        isLoading.value = false
    }
}

const binLocationData = ref(null)
const showConfirmModal = ref(false)
const getBinLocationInfo = async (text) => {
    let url = `rfid/pallet/${encodeURIComponent(props.plant_code)}/${encodeURIComponent(props.sloc)}/${encodeURIComponent(props.forklift)}/check-putaway`;
    isLoading.value = true
    try {
        if (!palletInfo.value) {
            console.error('palletInfo is null or undefined');
            return;
        }
        const response = await ApiService.post(url, {
            bin_location: text,
            physical_id: palletInfo.value.physical_id,
            inventory: palletInfo.value.inventory,
            block_suggestion: palletInfo.value.block_suggestion,
        })

        if (response.data.data.valid) {
            console.log('showing modal confirm')
            binLocationData.value = response.data.data
            showConfirmModal.value = true
        }
    } catch (err) {
        if (err?.response?.data?.message === 'Invalid QR code') {
            errorMessageTitle.value = 'Invalid QR Code.'
            errorMessage.value = 'Please scan a valid QR code.'
            showErrorModal.value = true
        } else if (err?.response?.data?.message === 'Mismatch Block' ) {
            errorMessageTitle.value = 'Mismatched Bin Detected'
            errorMessage.value = 'The scanned bin location does not match the suggested bin for this pallet.'
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
        isLoading.value = false
    }
}

const confirmWrapping = async (text) => {
    // For wrapping area, we can directly call the putaway API since there's no QR code to validate
    let url = `rfid/pallet/${encodeURIComponent(props.plant_code)}/${encodeURIComponent(props.sloc)}/${encodeURIComponent(props.forklift)}/confirm-wrapping`;
    isLoading.value = true
    try {
        if (!palletInfo.value) {
            console.error('palletInfo is null or undefined');
            return;
        }
        const response = await ApiService.post(url, {
            bin_location: null,
            physical_id: palletInfo.value.physical_id,
            inventory: palletInfo.value.inventory,
            block_suggestion: palletInfo.value.block_suggestion,
            putaway_type: 'wrapping_area',
            qr_text: text
        })

        if (response.data.data.success) {
            toast.message = 'Pallet successfully moved to wrapping area'
            toast.color = 'success'
            toast.show = true

            binLocationData.value = null
            palletInfo.value = null
        }
       
    } catch (err) {

      if (err?.response?.data?.message === 'Pallet not found.') {
            errorMessageTitle.value = 'Pallet not found.'
            errorMessage.value = 'Please scan a valid pallet QR code.'
            showErrorModal.value = true
        } else if (err?.response?.data?.message === 'Invalid QR code for wrapping area.' ) {
            errorMessageTitle.value = 'Invalid QR code for wrapping area'
            errorMessage.value = 'The scanned QR code is not valid for wrapping area. Please scan the correct QR code at the wrapping area.'
            showErrorModal.value = true
        } else if (err?.response?.data?.message === 'No Inventory' ) {
            errorMessageTitle.value = 'No Batch Assigned'
            errorMessage.value = 'No batch assigned on pallet. Please verify or coordinate with Production for reconciliation.'
            showErrorModal.value = true

        } else if (err?.response?.data?.message === 'Already on wrapping Area' ) {
            errorMessageTitle.value = 'Pallet Already on Wrapping Area'
            errorMessage.value = 'This pallet is already on the wrapping area but not yet tagged as wrapped. Please raise to IT for assistance.'
            showErrorModal.value = true

        } else if (err?.response?.data?.message === 'Pallet is already wrapped.' ) {
            errorMessageTitle.value = 'Pallet Already Wrapped'
            errorMessage.value = 'This pallet is already tagged as wrapped. If this is incorrect, please raise to IT for assistance.'
            showErrorModal.value = true

        } else {
            errorMessageTitle.value = 'An unexpected error occurred.'
            errorMessage.value = 'Please scan a valid pallet QR code.'
            showErrorModal.value = true
        }

       
    } finally {
      isLoading.value = false
    }
}

const toast = reactive({
    message: 'Success!',
    color: 'success',
    show: false
});

const onConfirmAssign = async () => {
    toast.show = false
    // Call your assign/putaway API here
    showConfirmModal.value = false
    isLoading.value = true
    try {
        let url = `rfid/pallet/${encodeURIComponent(props.plant_code)}/${encodeURIComponent(props.sloc)}/${encodeURIComponent(props.forklift)}/putaway`;
        const response = await ApiService.post(url, {
            bin_location: binLocationData.value?.bin_location,
            physical_id: palletInfo.value.physical_id,
            inventory: palletInfo.value.inventory,
            block_suggestion: palletInfo.value.block_suggestion,
        })
   
        binLocationData.value = null
        palletInfo.value = null
        toast.message = 'Pallet successfully assigned to bin location!'
        toast.color = 'success'
        toast.show = true
    } catch (err) {
        errorMessageTitle.value = 'Assignment Failed'
        errorMessage.value = 'Failed to assign pallet to bin. Please try again.'
        showErrorModal.value = true
    } finally {
        isLoading.value = false
    }
}

const onCancelAssign = () => {
  showConfirmModal.value = false
  binLocationData.value = null
}

// const processPutaway = () => {
//     let url = `rfid/pallet/${encodeURIComponent(props.plant_code)}/${encodeURIComponent(props.sloc)}/${encodeURIComponent(props.forklift)}/putaway`;
//     isLoading.value = true
//     // try {
//     //     if (!palletInfo.value) {
//     //         console.error('palletInfo is null or undefined');
//     //         return;
//     //     }
//     //     const response = await ApiService.post(url, {
//     //         bin_location: text,
//     //         physical_id: palletInfo.value.physical_id,
//     //         inventory: palletInfo.value.inventory,
//     //         block_suggestion: palletInfo.value.block_suggestion,
//     //     })


//     //     console.log('Bin location info:', response.data)
//     // } catch (err) {
//     //   if (err?.response?.data?.message === 'Invalid QR code') {
//     //       errorMessageTitle.value = 'Invalid QR Code.'
//     //       errorMessage.value = 'Please scan a valid QR code.'
//     //       showErrorModal.value = true
//     //   } else if (err?.response?.data?.message === 'Mismatch Block' ) {
//     //       errorMessageTitle.value = 'Mismatch Bin Detected'
//     //       errorMessage.value = 'The scanned bin location does not match the suggested bin for this pallet.'
//     //       showErrorModal.value = true
//     //   } else {
//     //       errorMessageTitle.value = 'An unexpected error occurred.'
//     //       errorMessage.value = 'Please scan a valid QR code.'
//     //       showErrorModal.value = true
//     //   }
//     // } finally {
//     //   isLoading.value = false
//     // }
// }

const showScanner = ref(false);
const onStartScanning = (type) => {
    scanType.value = type
    showScanner.value = true
}

const tryAgain = () => {
    showErrorModal.value = false
    showScanner.value = true
}

</script>

<template>
  <div class="qr-center-container">
    <v-empty-state v-if="!palletInfo"
        action-text="Start Scanning"
        :image="qrScan"
        text="Ready to scan. Please use your device to scan a QR code for putaway or bin transfer."
        title="Waiting for QR Scan"
        @click:action="onStartScanning('pallet')"
    ></v-empty-state>


    <div v-else class="d-flex justify-center align-center" style="min-height: 95vh;">
      <v-card elevation="8" rounded="xl" class="pa-6 pallet-info-card" style="width: 400px; max-width: 95vw;">
        <div class="d-flex align-center mb-4">
          <v-icon color="primary" size="40" class="me-3">ri-box-3-line</v-icon>
          <span class="text-h5 font-weight-bold text-primary">Pallet Details</span>
        </div>
        <v-divider class="mb-4" />
        <v-list lines="two" density="compact" class="pallet-info-list " >
          <v-list-item>
            <v-list-item-title class="text-caption text-medium-emphasis text-uppercase font-weight-bold">Physical ID</v-list-item-title>
            <v-list-item-subtitle class="text-body-1 font-weight-medium">{{ palletInfo.physical_id ?? '—' }}</v-list-item-subtitle>
          </v-list-item>
          <v-divider />
          <v-list-item>
            <v-list-item-title class="text-caption text-medium-emphasis text-uppercase font-weight-bold">Plant</v-list-item-title>
            <v-list-item-subtitle class="text-body-1 font-weight-medium">{{ palletInfo.plant_code }} - {{ palletInfo.plant_name }}</v-list-item-subtitle>
          </v-list-item>
          <v-divider />
          <v-list-item>
            <v-list-item-title class="text-caption text-medium-emphasis text-uppercase font-weight-bold">Sloc</v-list-item-title>
            <v-list-item-subtitle class="text-body-1 font-weight-medium">{{ palletInfo.sloc }} - {{ palletInfo.storage_location }}</v-list-item-subtitle>
          </v-list-item>
          <v-divider />
          <v-list-item>
            <v-list-item-title class="text-caption text-medium-emphasis text-uppercase font-weight-bold">Current Batch</v-list-item-title>
            <v-list-item-subtitle class="text-body-1 font-weight-medium">{{ palletInfo.inventory?.batch ?? '—' }}</v-list-item-subtitle>
          </v-list-item>
          <v-divider />
          <v-list-item>
            <v-list-item-title class="text-caption text-medium-emphasis text-uppercase font-weight-bold">Mfg Date</v-list-item-title>
            <v-list-item-subtitle class="text-body-1 font-weight-medium">{{ palletInfo.inventory?.mfg_date ? moment(palletInfo.inventory.mfg_date).format('YYYY-MM-DD') : '—' }}</v-list-item-subtitle>
          </v-list-item>
          <v-divider />
          <v-list-item>
            <v-list-item-title class="text-caption text-medium-emphasis text-uppercase font-weight-bold">Current Location</v-list-item-title>
            <v-list-item-subtitle class="text-body-1 font-weight-medium text-uppercase">{{ palletInfo.current_location ?? '—' }}</v-list-item-subtitle>
          </v-list-item>
          <v-divider />

          <v-list-item>
                <v-list-item-title class="text-caption text-medium-emphasis text-uppercase font-weight-bold">Next Step</v-list-item-title>
                <v-list-item-subtitle class="text-body-1 font-weight-medium text-uppercase">
                    <v-chip
                            color="warning"
                            text-color="white"
                            class="text-h6 font-weight-bold px-6 mb-2 mt-1"
                            size="large"
                            variant="outlined"
                        >
                            <span v-if="hasWrappingArea && palletInfo?.current_location !== 'Wrapping Area'">Proceed to Wrapping Area</span>
                            <span v-else>Proceed to Bin Location</span>
                        </v-chip>
                </v-list-item-subtitle>
          </v-list-item>
          <v-divider />

           <v-list-item>
                <v-list-item-title class="text-caption text-medium-emphasis text-uppercase font-weight-bold">Designated Location</v-list-item-title>
                <v-list-item-subtitle class="text-body-1 font-weight-medium text-uppercase">
                   <v-chip
                        color="primary"
                        text-color="white"
                        class="text-h6 font-weight-bold px-6 py-3 mb-0"
                        size="large"
                        variant="outlined"
                    >
                        {{ palletInfo.block_suggestion?.lot_label }} - {{ palletInfo.block_suggestion?.label }}
                    </v-chip>
                </v-list-item-subtitle>
          </v-list-item>
          
        </v-list>
        <v-divider />
        <v-btn v-if="shouldWrap && palletInfo?.current_location !== 'Wrapping Area'" color="primary" class="mt-6" @click="onStartScanning('wrapping')">
          <v-icon start>ri-qr-scan-2-line</v-icon>
            Scan Wrapping Area
        </v-btn>
        <v-btn v-else color="primary" class="mt-6" @click="onStartScanning('bin')">
          <v-icon start>ri-qr-scan-2-line</v-icon>
            Scan Bin Location
        </v-btn>
      </v-card>
    </div>

    <!-- Confirmation Modal -->
      <DefaultModal
        :show="showConfirmModal"
        dialog-title="Confirm Putaway"
        max-width="400px"
        min-height="200px"
        @close="onCancelAssign"
      >
        <div class="text-center py-6">
          <v-icon class="mb-5" color="primary" icon="ri-question-line" size="56"></v-icon>
          <div class="text-h6 font-weight-bold mb-4">
            You are about to assign pallet with physical ID of <span class="text-primary">{{ palletInfo.physical_id }}</span> to <span class="text-primary">{{ binLocationData?.lot?.label }}-{{ binLocationData?.block?.label }}</span>.
          </div>
          <div class="d-flex justify-center mt-6">
            <v-btn color="primary" class="me-4" @click="onConfirmAssign">Yes, Assign</v-btn>
            <v-btn variant="outlined" @click="onCancelAssign">Cancel</v-btn>
          </div>
        </div>
    </DefaultModal>

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
            @click="tryAgain()">Try Again
        </v-btn>
      </div>
    </DefaultModal>
  </div>
  <Loader :show="isLoading" />
  <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event"/>

</template>

<style scoped>
.qr-center-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  width: 100vw;
  box-sizing: border-box;
  padding: 16px;
}
@media (max-width: 600px) {
  .qr-center-container {
    min-height: 100dvh;
  }
}
</style>
