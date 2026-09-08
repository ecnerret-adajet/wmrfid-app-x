<script setup>
import Loader from '@/components/Loader.vue';
import ApiService from '@/services/ApiService';
import { echo } from '@/utils/echo';
import fumigationImage from '@images/curtains/pallets.png';
import Moment from 'moment';
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const reader = route.params.reader;

const isLoading = ref(false);
const hasError = ref(false);
const errorMessage = ref(null);
const logs = ref([]);
const lastRead = ref(null);
const currentTime = ref(Moment().format('h:mm:ss A'));
const pulse = ref(false);
const snackbarVisible = ref(false);



const totalPalletsInside = computed(() =>
    chamberDoors.value.reduce((sum, { count }) => sum + count, 0)
);

const response = reactive({
    message: "RFID Pallet detected",
    type: 'success',
    color: 'primary'
})

let fumigationLogsChannel = null;
let clockInterval = null;

onMounted(() => {
    fetchFumigationLogs();

    clockInterval = window.setInterval(() => {
        currentTime.value = Moment().format('h:mm:ss A');
    }, 1000);

    const channelNameBase = `fumigation.${reader}`;
    fumigationLogsChannel = echo.channel(`${channelNameBase}.fumigation-logs`);
    fumigationLogsChannel.listen('FumigationScanEvent', onFumigationScanEvent);
});

onUnmounted(() => {
    if (clockInterval) window.clearInterval(clockInterval);
});

const chamberInventories = ref({});

const fetchFumigationLogs = async () => {
    isLoading.value = true;
    try {
        const response = await ApiService.get(`get-fumigation-logs/${reader}`);

        logs.value = response.data?.logs || [];
        chamberInventories.value = response.data?.chamber_inventories || {};
        lastRead.value = logs.value[0] || null;
    } catch (error) {
        errorMessage.value = error.response?.data?.message || 'An unexpected error occurred.';
        hasError.value = true;
        console.error('Error fetching fumigation logs:', error);
    } finally {
        isLoading.value = false;
    }
};

const chamberDoors = computed(() => {
    // Generates static 1-5 structural slots ensuring doors don't disappear from layout
    return [1, 2, 3, 4, 5].map(doorNum => {
        return {
            door: doorNum,
            count: Number(chamberInventories.value[doorNum]) || 0
        };
    });
});

const onFumigationScanEvent = data => {
    const log = data?.fumigationScan;
    console.log('Received FumigationScanEvent:', log);
    if (!log) return;

    if (data?.chamberInventories) {
        chamberInventories.value = data.chamberInventories;
    }

    logs.value.unshift(log);
    if (logs.value.length > 8) logs.value.pop();
    lastRead.value = logs.value[0] || null;

    // If pallet is unregistered
    if (log.fumigation_log?.reading_status === 'unregistered' || log.name === 'unregistered') {
        response.message = 'This pallet is not yet registered';
        response.type = 'error';
        response.color = 'error';
        snackbarVisible.value = true
        return;
    }

    if (log.fumigation_log?.reading_status === 'valid' || log.name === 'valid') {
        response.message = 'Pallet scanned successfully';
        response.type = 'success';
        response.color = 'info';
        snackbarVisible.value = true
        return;
    }

    pulse.value = true;
    setTimeout(() => { pulse.value = false }, 1200);
};

const physicalId = log => log?.name || log?.physical_id || '';

const scanDate = log => {
    const dt = log?.fumigation_log?.updated_at || log?.updated_at;
    return dt ? Moment(dt).format('MM/DD/YY') : '—';
};

const scanTime = log => {
    const dt = log?.fumigation_log?.updated_at || log?.updated_at;
    return dt ? Moment(dt).format('h:mm A') : '';
};

const mfgDate = log => {
    // 1. Try to find the date on either the root object or nested under inventory
    const dateValue = log?.mfg_date || log?.fumigation_log?.mfg_date;
    
    // 2. Format with Moment if found, otherwise return your fallback dash
    return dateValue ? Moment(dateValue).format('MMM D, YYYY') : '—';
};

watch(() => hasError.value, val => {
    if (val) setTimeout(() => { hasError.value = false }, 15000);
});

watch(
    () => snackbarVisible.value,
    (val) => {
        if (val) {
            setTimeout(() => {
                snackbarVisible.value = false
            }, 5000)
        }
    }
)

</script>

<template>
    <transition name="fade-transition">
        <v-alert v-if="snackbarVisible" style="position: absolute; z-index: 99; width: 94vw; right: 40px;"
            :color="response.color" :type="response.type">
            <template #title>
                <span style="font-size: 2rem;">{{ response.message }}</span>
            </template>
        </v-alert>
    </transition>
    <main class="fumi-screen">
        <!-- Header -->
        <header class="fumi-header">
            <div class="header-left">
                <div class="header-icon">
                    <i class="ri-shield-check-line" />
                </div>
                <div>
                    <h1 class="header-title">Fumigation Bay</h1>
                </div>
            </div>
            <div class="header-right">
                <div class="live-indicator">
                    <span class="live-dot" />
                    <span>LIVE</span>
                </div>
                <div class="clock">{{ currentTime }}</div>
            </div>
        </header>

        <div class="gold-ribbon" />

        <div class="fumi-body">
            <!-- Pallets Inside Fumigation -->
            <section class="stats-section">
                <div class="chamber-stats">
                    <div class="stat-card stat-card-total">
                        <div class="stat-icon">
                            <i class="ri-stack-line" />
                        </div>
                        <div class="stat-info">
                            <span class="stat-count">{{ totalPalletsInside }}</span>
                            <span class="stat-caption">Total Pallets on Fumigation Chamber</span>
                        </div>
                    </div>

                    <div class="door-list">
                        <div v-for="chamberDoor in chamberDoors" :key="chamberDoor.door" class="door-card">
                            <span class="door-label">Door {{ chamberDoor.door }}</span>
                            <span class="door-count mt-2">{{ chamberDoor.count }}</span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Latest Pallet -->
            <section class="hero-section">
                <h2 class="section-title">
                    Latest Pallet
                </h2>

                <div v-if="lastRead" class="hero-card" :class="{ pulse }">
                    <img :src="fumigationImage" class="hero-image" alt="" />

                    <div class="hero-field field-id">
                        <span class="field-label">Physical ID</span>
                        <span v-if="physicalId(lastRead) === 'unregistered'" class="field-value text-error">UNREGISTERED</span>
                        <span v-else class="field-value">{{ physicalId(lastRead) || '—' }}</span>
                    </div>

                    <div class="hero-field field-batch">
                        <span class="field-label">Batch</span>
                        <span class="field-value">{{ lastRead?.batch || lastRead?.fumigation_log?.batch || 'NO BATCH' }}</span>
                    </div>

                    <div class="hero-field field-material">
                        <span class="field-label">Material</span>
                        <span class="field-value material-value">{{ lastRead?.material_code || lastRead?.fumigation_log?.material_code || '—' }}</span>
                        <span class="field-sub">{{ lastRead?.material_desc || lastRead?.fumigation_log?.material_desc || '—' }}</span>
                    </div>

                    <div class="hero-field field-qty">
                        <span class="field-label">Qty</span>
                        <span class="field-value">{{ lastRead?.qty || lastRead?.fumigation_log?.qty || 'N/A' }}</span>
                    </div>

                    <div class="hero-field field-mfg-date">
                        <span class="field-label">Mfg Date</span>
                        <span class="field-value date-value">{{ mfgDate(lastRead) }}</span>
                    </div>

                    <div class="hero-field field-date">
                        <span class="field-label">Date &amp; Time</span>
                        <span class="field-value date-value">{{ scanDate(lastRead) }}</span>
                        <span class="field-sub">{{ scanTime(lastRead) }}</span>
                    </div>
                </div>

                <div v-else class="empty-hero">
                    <i class="ri-radar-line empty-icon" />
                    <span>Waiting for the next pallet scan…</span>
                </div>
            </section>

            <!-- Recent Logs -->
            <section class="logs-section">
                <h2 class="section-title">
                    Recent <span class="accent">Logs</span>
                </h2>

                <div class="logs-card">
                    <div class="logs-table">
                        <div class="logs-row logs-head">
                            <span class="col col-id">Physical ID</span>
                            <span class="col col-batch">Batch</span>
                            <span class="col col-material">Material</span>
                            <span class="col col-qty">Qty</span>
                            <span class="col col-mfg-date">Mfg Date</span>
                            <span class="col col-date">Date and Time</span>
                        </div>

                        <div v-if="!logs.length" class="empty-logs">
                            <i class="ri-inbox-line empty-icon" />
                            <span>No pallet logs recorded yet</span>
                        </div>

                        <transition-group v-else name="log-row" tag="div" class="logs-body">
                            <div v-for="(log, index) in logs" :key="`${physicalId(log)}-${index}`" class="logs-row">
                                <span v-if="physicalId(log) === 'unregistered'" class="col col-id text-error">
                                    UNREGISTERED
                                </span>
                                <span v-else class="col col-id" :class="{ 'text-error': !physicalId(log) }">
                                    {{ physicalId(log) || 'UNKNOWN' }}
                                </span>
                                <span class="col col-batch">
                                    <span class="batch-main">{{ log?.batch || log?.fumigation_log?.batch || 'NO BATCH' }}</span>
                                </span>
                                <span class="col col-material">
                                    <span class="material-main">{{ log?.material_code || log?.fumigation_log?.material_code || '—' }}</span>
                                    <span class="material-sub">{{ log?.material_desc || log?.fumigation_log?.material_desc || '—' }}</span>
                                </span>
                                <span class="col col-qty font-weight-bold">{{ log?.qty || log?.fumigation_log?.qty || 'N/A' }}</span>
                                <span class="col col-mfg-date font-weight-bold">{{ mfgDate(log) }}</span>
                                <span class="col col-date">
                                    <span class="date-main">{{ scanDate(log) }}</span>
                                    <span class="date-sub">{{ scanTime(log) }}</span>
                                </span>
                            </div>
                        </transition-group>
                    </div>
                </div>
            </section>
        </div>

        <v-dialog v-model="hasError" max-width="600" transition="dialog-bottom-transition">
            <v-card class="pa-4 rounded-lg">
                <v-card-title class="d-flex justify-center align-center pb-0">
                    <v-icon color="error" size="36" class="mr-2" icon="ri-error-warning-line" />
                    <span class="text-h5 font-weight-bold text-error">Fumigation Reader Error</span>
                </v-card-title>
                <v-card-text class="mt-4 text-center">
                    <p class="text-h6 font-weight-medium" style="word-break: break-word;">{{ errorMessage }}</p>
                </v-card-text>
                <v-card-actions class="justify-center mt-2">
                    <v-btn color="error" variant="flat" class="px-8" rounded @click="hasError = false">
                        Okay
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <Loader :show="isLoading" />
    </main>
</template>

<style scoped>
.fumi-screen {
    width: 100%;
    height: 100vh;
    background: #f4f6f5;
    font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

/* Header */
.fumi-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 12px 30px;
    background: linear-gradient(120deg, #00833c 0%, #006830 100%);
    color: #fff;
    flex-shrink: 0;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
}

.header-left {
    display: flex;
    align-items: center;
    gap: 16px;
}

.header-icon {
    width: 52px;
    height: 52px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
}

.header-title {
    margin: 0;
    color:white;
    font-size: 1.6rem;
    font-weight: 800;
    letter-spacing: 0.3px;
}

.header-subtitle {
    font-size: 0.85rem;
    opacity: 0.85;
    text-transform: uppercase;
    letter-spacing: 0.6px;
}

.header-right {
    display: flex;
    align-items: center;
    gap: 14px;
}

.live-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(0, 0, 0, 0.2);
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.6px;
}

.live-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: #4ade80;
    box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.7);
    animation: livePulse 1.6s infinite;
}

@keyframes livePulse {
    0% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.6); }
    70% { box-shadow: 0 0 0 8px rgba(74, 222, 128, 0); }
    100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); }
}

.clock {
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    font-size: 0.95rem;
    min-width: 92px;
    text-align: right;
}

.gold-ribbon {
    height: 6px;
    flex-shrink: 0;
    background: linear-gradient(90deg, #e1bc37, #eece70);
}

.fumi-body {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: 20px 34px;
    max-width: 1800px;
    width: 100%;
    margin: 0 auto;
}

.section-title {
    font-size: 1.6rem;
    font-weight: 800;
    color: #4a4a4a;
    margin: 0 0 8px;
}

.section-title .accent {
    color: #e1bc37;
}

/* Pallets inside fumigation stat card */
.stats-section {
    flex-shrink: 0;
    margin-bottom: 4px;
    display: flex;
    justify-content: flex-end;
}

.chamber-stats {
    display: flex;
    align-items: stretch;
    gap: 14px;
    flex-wrap: wrap;
    justify-content: flex-end;
}

.door-list {
    display: flex;
    align-items: stretch;
    gap: 10px;
    flex-wrap: wrap;
}

.door-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #fff;
    border: 1px solid #e3e8e5;
    border-radius: 14px;
    padding: 8px 18px;
    min-width: 72px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.door-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #9aa19d;
    font-weight: 700;
}

.door-count {
    font-size: 1.5rem;
    font-weight: 800;
    color: #00833c;
    line-height: 1.1;
}

.stat-card {
    display: inline-flex;
    align-items: center;
    gap: 18px;
    background: linear-gradient(135deg, #00833c 0%, #006830 100%);
    color: #fff;
    padding: 16px 30px;
    border-radius: 16px;
    box-shadow: 0 6px 20px rgba(0, 131, 60, 0.25);
}

.stat-icon {
    width: 52px;
    height: 52px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    flex-shrink: 0;
}

.stat-info {
    display: flex;
    flex-direction: column;
}

.stat-count {
    font-size: 2.2rem;
    font-weight: 800;
    line-height: 1;
}

.stat-caption {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    opacity: 0.9;
    margin-top: 4px;
}

/* Hero card */
.hero-section {
    flex-shrink: 0;
    margin-bottom: 20px;
}

.hero-card {
    display: grid;
    grid-template-columns: 90px 1.1fr 1fr 1.3fr 0.6fr 0.9fr 0.8fr;
    align-items: center;
    background: #fff;
    border-radius: 18px;
    border: 1px solid #e3e8e5;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
    padding: 4px 24px;
    border-left: 6px solid #00833c;
    transition: box-shadow 0.3s ease, transform 0.3s ease;
}

.hero-card.pulse {
    animation: heroPulse 1.2s ease;
}

@keyframes heroPulse {
    0% { box-shadow: 0 0 0 0 rgba(0, 131, 60, 0.35); }
    100% { box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06); }
}

.hero-image {
    width: 64px;
    height: 64px;
    object-fit: contain;
}

.hero-field {
    display: flex;
    flex-direction: column;
    padding: 0 12px;
    border-right: 1px solid #eef1f0;
}

.hero-field:last-child {
    border-right: none;
}

.field-label {
    font-size: 1.2rem;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: #9aa19d;
    font-weight: 700;
}

.field-value {
    font-size: 1.6rem;
    font-weight: 800;
    color: #00833c;
    word-break: break-word;
}

.field-sub {
    font-size: 0.8rem;
    color: #6b7370;
    margin-top: 2px;
}

.date-value {
    font-size: 1rem;
    color: #37403c;
}

.material-value {
    font-size: 1.2rem;
}

.empty-hero,
.empty-logs {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 48px 0;
    color: #9aa19d;
    font-size: 1rem;
    font-weight: 600;
    background: #fff;
    border-radius: 18px;
    border: 1px dashed #d9dfdc;
}

.empty-icon {
    font-size: 2.4rem;
    opacity: 0.6;
}

/* Logs table */
.logs-section {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    min-height: 0;
}

.logs-card {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: #fff;
    border-radius: 18px;
    border: 1px solid #e3e8e5;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.05);
    overflow: hidden;
}

.logs-table {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    min-height: 0;
    width: 100%;
    overflow-y: auto;
}

.logs-body {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    min-height: 0;
}

.logs-row {
    display: grid;
    grid-template-columns: 1.1fr 1fr 1.3fr 0.6fr 0.9fr 0.8fr;
    align-items: center;
    gap: 8px;
    font-size: 1.5rem;
    padding: 4px 24px;
    border-bottom: 1px solid #eef1f0;
    flex-shrink: 0;
}

.logs-body .logs-row {
    flex: 1 1 0;
    min-height: 0;
}

.logs-row:hover:not(.logs-head) {
    background: #f7faf8;
}

.logs-head {
    position: sticky;
    top: 0;
    z-index: 5;
    background: #00833c;
    color: #fff;
    text-transform: uppercase;
    font-size: 1.3rem;

    font-weight: 800;
    letter-spacing: 0.5px;
    border-bottom: none;
}

.col {
    display: flex;
    flex-direction: column;
    text-align: center;
    justify-content: center;
    align-items: center;
}

.col-id,
.col-batch,
.col-material {
    text-align: left;
    align-items: flex-start;
}

.batch-main,
.date-main,
.material-main {
    font-weight: 700;
    color: #37403c;
}

.batch-sub,
.date-sub,
.material-sub {
    font-size: 0.78rem;
    color: #404141;
}

.logs-row:not(.logs-head) .col-id {
    font-weight: 800;
    color: #00833c;
}

/* Row transition */
.log-row-enter-active {
    transition: all 0.4s ease;
}

.log-row-enter-from {
    opacity: 0;
    transform: translateY(-12px);
    background: #fff9db;
}

@media (max-width: 1100px) {
    .hero-card {
        grid-template-columns: 1fr;
        text-align: left;
    }

    .hero-image {
        display: none;
    }

    .hero-field {
        border-right: none;
        border-bottom: 1px solid #eef1f0;
        padding: 10px 0;
    }

    .logs-row {
        grid-template-columns: 1fr;
        text-align: left;
    }

    .logs-head {
        display: none;
    }

    .col {
        align-items: flex-start;
        text-align: left;
    }
}

@media (max-width: 640px) {
    .fumi-header {
        flex-wrap: wrap;
        padding: 18px 20px;
    }

    .fumi-body {
        padding: 24px 20px 40px;
    }
}
</style>
