<script setup>
import axios from 'axios';

const scanValue = ref('');
const scanResult = ref(null);
const scanError = ref('');
const scanInputRef = ref(null);
const isChecking = ref(false);
const lastProcessedScan = ref('');
let autoScanTimer = null;

const defaultResult = {
    name: '--',
    epc: '--',
    current_batch: '--',
};

const displayedResult = computed(() => scanResult.value || defaultResult);

const focusScanInput = (delay = 0) => {
    setTimeout(() => {
        scanInputRef.value?.focus?.();
    }, delay);
};

onMounted(() => {
    focusScanInput(50);
});

const extractEpc = (scannedValue) => {
    const raw = scannedValue?.trim();
    if (!raw) return null;

    // Supports plain EPC scan and query payloads like epc=E280....
    const queryMatch = raw.match(/(?:epc)=([^&\s]+)/i);
    if (queryMatch?.[1]) return decodeURIComponent(queryMatch[1]);

    return raw;
};

const handleScan = async (force = false) => {
    const scannedValue = scanValue.value?.trim();

    if (!scannedValue) {
        scanError.value = 'Please scan or enter a value first.';
        scanResult.value = null;
        focusScanInput();
        return;
    }

    if (!force && scannedValue === lastProcessedScan.value) {
        focusScanInput();
        return;
    }

    const epc = extractEpc(scannedValue);
    if (!epc) {
        scanError.value = 'Invalid scanned value. Unable to resolve EPC.';
        scanResult.value = null;
        focusScanInput();
        return;
    }

    isChecking.value = true;

    try {
        const response = await axios.get(`check-pallet/${encodeURIComponent(epc)}`);
        const payload = response.data?.details;

        if (!payload) {
            scanError.value = 'No pallet information found for the scanned EPC.';
            scanResult.value = {
                name: '--',
                epc,
                current_batch: '--',
            };
            return;
        }

        scanError.value = '';
        scanResult.value = {
            name: payload?.name || '--',
            epc: payload?.epc || epc || '--',
            current_batch: payload?.current_batch || '--',
        };
        lastProcessedScan.value = scannedValue;
    } catch (error) {
        console.error('Error fetching pallet checker data:', error);
        scanError.value = 'Invalid scanned value or server error. Please scan a valid pallet.';
        scanResult.value = null;
    } finally {
        isChecking.value = false;
        scanValue.value = '';
        focusScanInput();
    }
};

const scheduleAutoScan = () => {
    if (autoScanTimer) clearTimeout(autoScanTimer);

    autoScanTimer = setTimeout(() => {
        const value = scanValue.value?.trim();
        if (!value || isChecking.value) return;

        // For Zebra wedge mode without Enter suffix, auto-trigger after scan burst settles.
        handleScan();
    }, 180);
};

watch(scanValue, () => {
    scheduleAutoScan();
});
</script>

<template>
    <v-card elevation="2" class="mx-4 my-4 handheld-shell">
        <v-card-title class="text-h4 font-weight-bold text-primary pb-2">
            Pallet Checker
        </v-card-title>

        <v-card-text>
            <p class="text-body-1 mb-4 text-grey-700">
                Use handheld reader to scan pallet to verify the physical ID.
            </p>

            <v-row>
                <v-col cols="12">
                    <v-text-field
                        ref="scanInputRef"
                        v-model="scanValue"
                        label="Scan EPC"
                        placeholder="Example: E28011700000020F2D66A101"
                        variant="outlined"
                        density="comfortable"
                        clearable
                        autofocus
                        prepend-inner-icon="ri-rfid-line"
                        class="scan-input"
                        @keyup.enter="handleScan"
                        @blur="focusScanInput(100)"
                    />
                </v-col>

                <v-col cols="12" class="pt-0">
                    <v-btn
                        color="primary"
                        size="large"
                        block
                        class="text-none"
                        :loading="isChecking"
                        :disabled="isChecking"
                        @click="handleScan(true)"
                    >
                        Check Pallet
                    </v-btn>
                </v-col>

                <v-col cols="12" v-if="scanError" class="pt-2">
                    <v-alert type="error" variant="tonal" density="comfortable">
                        {{ scanError }}
                    </v-alert>
                </v-col>

                <v-col cols="12" class="pt-2">
                    <v-card variant="outlined" class="result-card">
                        <v-card-title class="text-h6 font-weight-bold pb-1">
                            Result
                        </v-card-title>
                        <v-card-text class="pt-2">
                            <div class="result-row">
                                <span class="result-label">Physical ID</span>
                                <span class="result-value">{{ displayedResult.name }}</span>
                            </div>
                            <div class="result-row">
                                <span class="result-label">EPC</span>
                                <span class="result-value">{{ displayedResult.epc }}</span>
                            </div>
                            <div class="result-row">
                                <span class="result-label">Current Batch</span>
                                <span class="result-value">{{ displayedResult.current_batch }}</span>
                            </div>
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>
        </v-card-text>
    </v-card>
</template>

<style scoped>
.handheld-shell {
    max-width: 720px;
}

.scan-input :deep(input) {
    font-size: 1.05rem;
}

.result-card {
    border-width: 2px;
}

.result-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid #e7e7e7;
}

.result-row:last-child {
    border-bottom: none;
}

.result-label {
    font-size: 0.95rem;
    color: #5f6368;
}

.result-value {
    font-size: 1rem;
    font-weight: 700;
    text-align: right;
    word-break: break-all;
}
</style>
