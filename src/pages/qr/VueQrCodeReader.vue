<template>
    <v-dialog
        v-model="dialog"
        fullscreen
        transition="dialog-bottom-transition"
        :scrim="false"
    >
        <div class="qr-scanner-container">
            <qrcode-stream :track="paintBoundingBox" 
                :paused="paused"
                @detect="onDetect" 
                @camera-on="onCameraReady"
                @camera-off="onCameraOff"
                class="scanner"
                @error="onError">
            </qrcode-stream>

             <!-- Detection Zone Overlay -->
            <div class="detection-zone-overlay">
                <div class="detection-zone-frame"></div>
                <div class="detection-zone-label">Position QR Code Here</div>
            </div>

            <div v-if="error" class="error">{{ error }}</div>
            <!-- <div v-if="result" class="result">{{ result }}</div> -->

            <!-- QR List for Selection -->
            <div v-if="detectedCodes.length > 0" class="qr-list">
                <div class="qr-list-title">Detected QR Code: {{ detectedCodes.length }}</div>
                <div class="qr-items">
                    <div
                        v-for="(code, index) in detectedCodes"
                        :key="index"
                        class="qr-item"
                        :class="{ selected: selectedIndex === index }"
                        @click="selectQR(index)"
                    >
                        {{ code.rawValue }}
                    </div>
                </div>
            </div>

             <!-- Action Buttons -->
            <div class="button-group">
                <v-btn
                    v-if="selectedIndex !== null"
                    color="green"
                    size="large"
                    @click="confirmSelection"
                >
                    Confirm
                </v-btn>
                <v-btn
                    color="red"
                    size="large"
                    @click="close"
                >
                    Cancel
                </v-btn>
            </div>
        </div>
    </v-dialog>
</template>

<script setup>
import { onUnmounted, ref, watch } from 'vue'
import { QrcodeStream } from 'vue-qrcode-reader'

const emit = defineEmits(['close', 'scan-result'])

const props = defineProps({
    type: {
        type: String,
        default: 'pallet', 
    },
})

const result = ref('')
const error = ref('')
const detectedCodes = ref([])
const selectedIndex = ref(null)
const paused = ref(false)

function onDetect(detectedCodesParam) {
    // Access the raw video dimensions from the qrcode-stream component or its internal video element
    const scanner = document.querySelector('.scanner video');
    if (!scanner) return;

    const videoWidth = scanner.videoWidth;
    const videoHeight = scanner.videoHeight;

    // Filter using the camera's raw resolution
    const filteredCodes = detectedCodesParam.filter(code => 
        isWithinDetectionZone(code.boundingBox, videoWidth, videoHeight)
    );

    detectedCodes.value = filteredCodes;
    result.value = `Detected ${filteredCodes.length} in zone (Total: ${detectedCodesParam.length})`;

    if (selectedIndex.value === null && filteredCodes.length > 0) {
        selectedIndex.value = 0;
    }
}

// Detection zone configuration (in percentage of screen)
const DETECTION_ZONE_SIZE = 40 // width %
const DETECTION_ZONE_HEIGHT = 20 // height %
const DETECTION_ZONE_X = 30 // left %
const DETECTION_ZONE_Y = 40 // top %

function isWithinDetectionZone(boundingBox, canvasWidth, canvasHeight) {
  // Calculate detection zone in pixels
  const zoneWidth = (canvasWidth * DETECTION_ZONE_SIZE) / 100
  const zoneHeight = (canvasHeight * DETECTION_ZONE_HEIGHT) / 100
  const zoneX = (canvasWidth * DETECTION_ZONE_X) / 100
  const zoneY = (canvasHeight * DETECTION_ZONE_Y) / 100

  // Check if QR center is within detection zone
  const qrCenterX = boundingBox.x + boundingBox.width / 2
  const qrCenterY = boundingBox.y + boundingBox.height / 2

  return (
    qrCenterX >= zoneX &&
    qrCenterX <= zoneX + zoneWidth &&
    qrCenterY >= zoneY &&
    qrCenterY <= zoneY + zoneHeight
  )
}

function selectQR(index) {
  selectedIndex.value = index
}

function confirmSelection() {
    if (selectedIndex.value !== null && detectedCodes.value[selectedIndex.value]) {
        const selectedCode = detectedCodes.value[selectedIndex.value]
        emit('scan-result', {type: props.type, data: selectedCode.rawValue})
        close()
    }
}

const defaultConstraintOptions = [
  { label: 'rear camera', constraints: { facingMode: 'environment' } },
  { label: 'front camera', constraints: { facingMode: 'user' } }
]
const constraintOptions = ref(defaultConstraintOptions)

async function onCameraReady() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter(({ kind }) => kind === 'videoinput')

        constraintOptions.value = [
            ...defaultConstraintOptions,
            ...videoDevices.map(({ deviceId, label }) => ({
                label: `${label} (ID: ${deviceId})`,
                constraints: { deviceId }
            }))
        ]

        error.value = ''
    } catch (err) {
        error.value = 'Failed to enumerate devices: ' + err.message
    }
}

function onCameraOff() {

}

/*** track functions ***/
function paintBoundingBox(detectedCodesParam, ctx) {
  const canvasWidth = ctx.canvas.width
  const canvasHeight = ctx.canvas.height

  const zoneWidth = (canvasWidth * DETECTION_ZONE_SIZE) / 100
  const zoneHeight = (canvasHeight * DETECTION_ZONE_HEIGHT) / 100
  const zoneX = (canvasWidth * DETECTION_ZONE_X) / 100
  const zoneY = (canvasHeight * DETECTION_ZONE_Y) / 100

  // 1. Draw Darkened background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
  ctx.fillRect(0, 0, canvasWidth, zoneY) // Top
  ctx.fillRect(0, zoneY + zoneHeight, canvasWidth, canvasHeight - (zoneY + zoneHeight)) // Bottom
  ctx.fillRect(0, zoneY, zoneX, zoneHeight) // Left
  ctx.fillRect(zoneX + zoneWidth, zoneY, canvasWidth - (zoneX + zoneWidth), zoneHeight) // Right

  // 2. Draw Frame
  ctx.lineWidth = 3
  ctx.strokeStyle = '#00ff00'
  ctx.strokeRect(zoneX, zoneY, zoneWidth, zoneHeight)

    // 3. Draw Bounding Boxes ONLY for codes inside the zone
    for (const detectedCode of detectedCodesParam) {
        if (isWithinDetectionZone(detectedCode.boundingBox, canvasWidth, canvasHeight)) {
            const { x, y, width, height } = detectedCode.boundingBox
            
            ctx.lineWidth = 2
            ctx.strokeStyle = '#00ff00'
            ctx.strokeRect(x, y, width, height)
            
            ctx.fillStyle = 'rgba(0, 255, 0, 0.1)'
            ctx.fillRect(x, y, width, height)
        }
    }
}

/*** barcode formats ***/
function onError(err) {
  console.error('[QR Scanner Error]:', err)
  error.value = `[${err.name}]: `

  if (err.name === 'NotAllowedError') {
    error.value += 'you need to grant camera access permission'
  } else if (err.name === 'NotFoundError') {
    error.value += 'no camera on this device'
  } else if (err.name === 'NotSupportedError') {
    error.value += 'secure context required (HTTPS, localhost)'
  } else if (err.name === 'NotReadableError') {
    error.value += 'is the camera already in use?'
  } else if (err.name === 'OverconstrainedError') {
    error.value += 'installed cameras are not suitable'
  } else if (err.name === 'StreamApiNotSupportedError') {
    error.value += 'Stream API is not supported in this browser'
  } else if (err.name === 'InsecureContextError') {
    error.value += 'Camera access is only permitted in secure context. Use HTTPS or localhost rather than HTTP.'
  } else {
    error.value += err.message
  }
}

const dialog = ref(true)

watch(dialog, (val) => {
  if (!val) close()
})

function close() {
    dialog.value = false
    paused.value = true
    emit('close')
}

onUnmounted(() => {
  close()
})
</script>

<style scoped>
.qr-scanner-container {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    background: #000;
    z-index: 9999;
}

.scanner {
    flex: 1;
    width: 100%;
    height: 100%;
}

.error {
    position: absolute;
    top: 20px;
    left: 20px;
    right: 20px;
    color: #fff;
    background: rgba(198, 40, 40, 0.9);
    padding: 16px;
    border-radius: 4px;
    font-size: 14px;
    z-index: 10;
}

.result {
    position: absolute;
    top: 80px;
    left: 20px;
    right: 20px;
    color: #fff;
    background: rgba(46, 125, 50, 0.9);
    padding: 16px;
    border-radius: 4px;
    font-size: 14px;
    word-break: break-all;
    z-index: 10;
}

.qr-list {
    position: absolute;
    bottom: 80px;
    left: 20px;
    right: 20px;
    max-height: 200px;
    background: rgba(0, 0, 0, 0.8);
    border: 2px solid #007bff;
    border-radius: 8px;
    padding: 12px;
    z-index: 10;
    overflow-y: auto;
}

.qr-list-title {
    color: #fff;
    font-weight: bold;
    margin-bottom: 8px;
    font-size: 12px;
}

.qr-items {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.qr-item {
    padding: 10px;
    background: rgba(0, 150, 255, 0.3);
    border: 1px solid #007bff;
    border-radius: 4px;
    color: #fff;
    cursor: pointer;
    font-size: 12px;
    word-break: break-all;
    transition: all 0.3s ease;
}

.qr-item:hover {
    background: rgba(0, 150, 255, 0.5);
}

.qr-item.selected {
    background: rgba(0, 255, 0, 0.5);
    border-color: #00ff00;
    font-weight: bold;
}

.button-group {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 12px;
    z-index: 10;
}

.button-group .v-btn {
    min-width: 120px;
}

.detection-zone-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 5;
}

.detection-zone-frame {
    position: absolute;
    top: 40%;   /* Matches DETECTION_ZONE_Y */
    left: 30%;  /* Matches DETECTION_ZONE_X */
    width: 40%; /* Matches DETECTION_ZONE_SIZE */
    height: 20%;/* Matches DETECTION_ZONE_HEIGHT */
    border: 3px solid #00ff00;
    border-radius: 8px;
    /* This shadow creates the "dimmed" effect on the rest of the screen */
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.4); 
}

.detection-zone-label {
    position: absolute;
    top: 35%; /* Positioned just above the box (20% - padding) */
    left: 50%;
    transform: translateX(-50%);
    color: #00ff00;
    font-weight: bold;
    font-size: 14px;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    background: rgba(0, 0, 0, 0.6);
    padding: 4px 12px;
    border-radius: 4px;
    z-index: 6;
}
</style>
