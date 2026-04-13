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
            {{ blockLabel }}
          </div>
        </template>

        <!-- Error -->
        <div v-else class="text-body-2 text-error my-8 text-center">
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
  blockId: {
    type: [String, Number],
    required: true,
  },
  blockLabel: {
    type: String,
    default: '',
  },
  // True when the block already has a qr_code_path — triggers GET instead of POST
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
      await retrieve()   // GET — QR already exists on this block
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
    const response = await ApiService.post('rfid/block/generate-qr-code', {
      block_id: props.blockId,
    })
    qrUrl.value = response.data.data.qr_code_url
    emit('generated', {
      block_id: response.data.data.block_id,
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
    const response = await ApiService.get(`rfid/block/qr-code/${encodeURIComponent(props.blockId)}`)
    qrUrl.value = response.data.data.qr_code_url
  } catch (err) {
    qrUrl.value = null
    const status = err?.response?.status
    errorMessage.value = status === 404
      ? 'No QR code found for this block.'
      : 'Failed to load QR code. Please try again.'
  } finally {
    loading.value = false
  }
}

// Download — fetch as blob so the browser saves the file (cross-origin safe)
async function download() {
  downloading.value = true
  try {
    const response = await ApiService.query(
      `rfid/block/qr-code/${encodeURIComponent(props.blockId)}/download`,
      { responseType: 'blob' }
    )
    const blob = new Blob([response.data], { type: 'image/png' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    // remove spaces and invalid characters for filename
    const safeLabel = props.blockLabel ? props.blockLabel.replace(/\s+/g, '-') : props.blockId
    a.download = `${safeLabel}qr.png`
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
