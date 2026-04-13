<template>
  <v-dialog v-model="dialog" max-width="380" persistent>
    <v-card>
      <v-card-title class="text-subtitle-1 font-weight-bold pa-4">
        QR Code
      </v-card-title>

      <v-card-text class="d-flex flex-column align-center pb-2">
        <!-- Loading -->
        <v-progress-circular
          v-if="loading"
          indeterminate
          color="primary"
          size="64"
          class="my-8"
        />

        <!-- QR Image -->
        <template v-else-if="qrUrl">
          <v-img
            :src="qrUrl"
            width="260"
            height="260"
            contain
            class="rounded"
          />
          <div class="mt-3 text-caption text-medium-emphasis text-center">
            {{ physicalId }}
          </div>
        </template>

        <!-- Error -->
        <div v-else class="text-body-2 text-error my-8">
          {{ errorMessage }}
        </div>
      </v-card-text>

      <v-card-actions class="px-4 pb-4 justify-end gap-2">
        <v-btn
          v-if="qrUrl"
          color="primary"
          variant="flat"
          prepend-icon="ri-download-line"
          :loading="downloading"
          @click="download"
        >
          Download
        </v-btn>
        <v-btn variant="text" @click="close">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import ApiService from '@/services/ApiService'
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  physicalId: {
    type: String,
    required: true,
  },
  // True when the row already has a qr_code_path — triggers GET instead of POST
  hasExistingQr: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'generated'])

const dialog = ref(false)
const loading = ref(false)
const downloading = ref(false)
const qrUrl = ref(null)
const errorMessage = ref('Failed to load QR code. Please try again.')

// Sync v-model
watch(() => props.modelValue, async (val) => {
  dialog.value = val
  if (val) {
    if (props.hasExistingQr) {
      await retrieve()   // GET — QR already exists on this pallet
    } else {
      await generate()   // POST — QR does not exist yet, generate it
    }
  } else {
    qrUrl.value = null
    errorMessage.value = 'Failed to load QR code. Please try again.'
  }
}, { immediate: true })

watch(dialog, (val) => {
  if (!val) emit('update:modelValue', false)
})

// POST — generate a new QR code
async function generate() {
  loading.value = true
  qrUrl.value = null
  try {
    const response = await ApiService.post('rfid/pallet/generate-qr-code', {
      physical_id: props.physicalId,
    })
    qrUrl.value = response.data.data.qr_code_url
    emit('generated', {
      physical_id: response.data.data.physical_id,
      qr_code_path: response.data.data.qr_code_path,
    })
  } catch {
    qrUrl.value = null
    errorMessage.value = 'Failed to generate QR code. Please try again.'
  } finally {
    loading.value = false
  }
}

// GET — retrieve an already-generated QR code
async function retrieve() {
  loading.value = true
  qrUrl.value = null
  try {
    const response = await ApiService.get(`rfid/pallet/qr-code/${encodeURIComponent(props.physicalId)}`)
    qrUrl.value = response.data.data.qr_code_url
  } catch (err) {
    qrUrl.value = null
    const status = err?.response?.status
    errorMessage.value = status === 404
      ? 'No QR code found for this pallet.'
      : 'Failed to load QR code. Please try again.'
  } finally {
    loading.value = false
  }
}

// Download — fetch as blob so the browser saves the file (cross-origin safe)
// ApiService.get(resource, slug) only accepts a string slug as its 2nd arg.
// ApiService.query(resource, axiosConfig) is used here to pass { responseType: 'blob' }.
async function download() {
  downloading.value = true
  try {
    const response = await ApiService.query(
      `rfid/pallet/qr-code/${encodeURIComponent(props.physicalId)}/download`,
      { responseType: 'blob' }
    )
    const blob = new Blob([response.data], { type: 'image/png' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${props.physicalId}-qr.png`
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    // Silent — the QR image is still displayed; download failure is non-critical
  } finally {
    downloading.value = false
  }
}

function close() {
  dialog.value = false
}
</script>
