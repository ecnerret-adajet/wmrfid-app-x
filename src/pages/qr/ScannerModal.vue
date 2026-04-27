<template>
    <v-dialog
        v-model="dialog"
        fullscreen
        :scrim="false"
        transition="dialog-bottom-transition"
    >
        <v-card
            color="black"
            class="d-flex flex-column align-center justify-center"
            style="min-height: 100vh;"
        >
            <v-card-text class="d-flex flex-column align-center justify-center flex-grow-1 pa-4">
                <div style="position: relative; width: 100%; max-width: 480px;">
                    <!-- Scanning frame overlay -->
                    <div class="scan-frame" />

                <video
                        ref="videoEl"
                        autoplay
                        playsinline
                        style="width: 100%; border-radius: 8px; display: block;"
                />
                </div>

                <!-- Error message -->
                <v-alert
                    v-if="error"
                    type="error"
                    variant="tonal"
                    class="mt-4"
                    style="max-width: 480px; width: 100%;"
                >
                    {{ error }}
                </v-alert>

                <!-- Scanning hint -->
                <p
                    v-if="!error"
                    class="text-white text-body-2 text-center mt-4 text-medium-emphasis"
                >
                    Point the camera at a QR code to scan
                </p>

                <!-- Zoom slider — shown only when device supports zoom -->
                <div v-if="zoomSupported" class="mt-4 d-flex align-center gap-3" style="max-width: 480px; width: 100%;">
                    <v-icon
                        icon="ri-zoom-out-line"
                        color="white"
                        size="20"
                    />
                    <v-slider
                        v-model="zoomLevel"
                        :min="zoomMin"
                        :max="zoomMax"
                        :step="0.1"
                        color="white"
                        track-color="rgba(255,255,255,0.3)"
                        hide-details
                        @update:model-value="applyZoom"
                    />
                    <v-icon
                        icon="ri-zoom-in-line"
                        color="white"
                        size="20"
                    />
                </div>
            </v-card-text>

            <v-card-actions class="justify-center" style="padding-bottom: 20px;">
                <v-btn style="z-index: 99;"
                    variant="elevated"
                    color="white"
                    size="large"
                    min-width="160"
                    @click="close"
                >
                    Cancel
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup>
import { BrowserQRCodeReader } from '@zxing/browser'
import { onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const emit = defineEmits(['close', 'scan-result'])

const props = defineProps({
    type: {
        type: String,
        default: 'pallet', 
    },
})

const router = useRouter()

const dialog = ref(true)
const videoEl = ref(null)
const error = ref(null)
const zoomSupported = ref(false)
const zoomMin = ref(1)
const zoomMax = ref(3)
const zoomLevel = ref(1)

let scanControls = null
let activeTrack = null

watch(dialog, (val) => {
  if (!val) close()
})

// Start camera + scanner when modal mounts
watch(videoEl, async (el) => {
  if (el) await startScanner()
}, { once: true })

async function startScanner() {
    error.value = null
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
        })

        if (videoEl.value) {
            videoEl.value.srcObject = stream
        }

        // Detect zoom capability
        const tracks = stream.getVideoTracks()
        if (tracks.length > 0) {
            activeTrack = tracks[0]
            const capabilities = activeTrack.getCapabilities?.()
            if (capabilities?.zoom) {
                zoomSupported.value = true
                zoomMin.value = capabilities.zoom.min ?? 1
                zoomMax.value = capabilities.zoom.max ?? 3
                zoomLevel.value = capabilities.zoom.min ?? 1
            }
        }

        const codeReader = new BrowserQRCodeReader()
        scanControls = await codeReader.decodeFromVideoDevice(
            undefined,
            videoEl.value,
            (result, err) => {
                if (result) {
                handleScanResult(result.getText())
                }
            },
        )
    } catch (err) {
        if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
            error.value = 'Camera access denied. Please allow camera permission and try again.'
        } else if (err?.name === 'NotFoundError') {
            error.value = 'No camera found on this device.'
        } else {
            error.value = 'Unable to start camera. Please try again.'
        }
    }
}

function handleScanResult(text) {
    stopCamera()
    emit('scan-result', {type: props.type, text})
    dialog.value = false
    emit('close')
}

function applyZoom(value) {
    if (activeTrack) {
        activeTrack.applyConstraints({ advanced: [{ zoom: value }] }).catch(() => {})
    }
}

function stopCamera() {
    scanControls?.stop()
    scanControls = null
    if (videoEl.value && videoEl.value.srcObject) {
        videoEl.value.srcObject.getTracks().forEach(t => t.stop())
        videoEl.value.srcObject = null
    }
    activeTrack = null
}

function close() {
    stopCamera()
    dialog.value = false
    emit('close')
}

onUnmounted(() => {
    stopCamera()
})
</script>

<style scoped>
.scan-frame {
    position: absolute;
    inset: 0;
    border: 2px solid rgba(255, 255, 255, 0.6);
    border-radius: 8px;
    pointer-events: none;
    z-index: 1;
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.4);
}
</style>
