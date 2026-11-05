<template>
    <main class="queue-screen">
        <marquee scrollamount="20" v-if="loading_banner_message && loading_banner_message.length"
            class="loading-banner-marquee">
            {{ loading_banner_message.join(' | ') }}
        </marquee>
        <div class="queue-body-wrap">
            <header class="banner">
                <div class="banner-main">
                    <div class="banner-line">
                        <h1>WAREHOUSE QUEUE</h1>
                        <span class="banner-count">{{ completedCount }} of {{ totalCount }} trucks completed</span>
                    </div>
                    <div class="progress-track"><div class="progress-fill" :style="{ width: progressPct + '%' }"></div></div>
                </div>
                <div class="banner-timer">
                    <div class="timer-label">Reloading in</div>
                    <div class="timer-row">
                        <span class="timer-num">{{ refreshTimer }}</span>
                        <span class="timer-unit">seconds</span>
                    </div>
                    <div v-if="queuePages.length > 1" class="timer-page">Page {{ pageIndex + 1 }} of {{ queuePages.length }}</div>
                </div>
            </header>

            <section class="band" :class="{ empty: totalCount === 0 }">
                <div class="seg seg-queue">
                    <div><div class="seg-count">{{ summaryData.waiting }}</div><div class="seg-label">On Queue</div></div>
                    <svg class="seg-icon" style="width:calc(5.938 * var(--u));height:calc(3.958 * var(--u))" viewBox="0 0 114 76" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">
                        <path d="M3 3H66V54H3Z M66 20H88L108 38V54H66"/><circle cx="24" cy="58" r="12" fill="var(--seg-bg)"/><circle cx="88" cy="58" r="12" fill="var(--seg-bg)"/>
                    </svg>
                </div>
                <div class="seg seg-progress">
                    <div><div class="seg-count">{{ summaryData.in_progress }}</div><div class="seg-label">In Progress</div></div>
                    <svg class="seg-icon" style="width:calc(5.0 * var(--u));height:calc(5.0 * var(--u))" viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round">
                        <circle cx="48" cy="48" r="7" fill="currentColor" stroke="none"/>
                        <path d="M34 34a20 20 0 0 0 0 28 M20 20a40 40 0 0 0 0 56 M62 34a20 20 0 0 1 0 28 M76 20a40 40 0 0 1 0 56"/>
                    </svg>
                </div>
                <div class="seg seg-done">
                    <div><div class="seg-count">{{ summaryData.completed }}</div><div class="seg-label">Completed</div></div>
                    <svg class="seg-icon" style="width:calc(5.0 * var(--u));height:calc(5.0 * var(--u))" viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="48" cy="48" r="42"/><path d="M28 50L43 65L69 34"/>
                    </svg>
                </div>
            </section>

            <div class="table-wrap">
                <table class="queue-table queue-head">
                    <colgroup><col style="width:calc(17.708 * var(--u))"><col style="width:calc(16.667 * var(--u))"><col><col style="width:calc(16.667 * var(--u))"><col style="width:calc(7.812 * var(--u))"><col style="width:calc(14.583 * var(--u))"></colgroup>
                    <thead>
                        <tr>
                            <th>QUEUE NO.</th>
                            <th>PLATE NO.</th>
                            <th>DRIVER NAME</th>
                            <th>SHIPMENT NO.</th>
                            <th>BAY</th>
                            <th>STATUS</th>
                        </tr>
                    </thead>
                </table>
                <div v-if="!queueRowsList.length" class="empty-msg">
                    <svg style="width:calc(8.75 * var(--u));height:calc(5.833 * var(--u))" viewBox="0 0 114 76" fill="none" stroke="#00A36C" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">
                        <path d="M3 3H66V54H3Z M66 20H88L108 38V54H66"/><circle cx="24" cy="58" r="12" fill="#fff"/><circle cx="88" cy="58" r="12" fill="#fff"/>
                    </svg>
                    <div class="empty-title">No trucks in the queue</div>
                    <div class="empty-sub">New entries appear here at the next reload.</div>
                </div>
                <v-carousel v-else v-model="pageIndex" class="queue-carousel" height="100%" hide-delimiters
                    :show-arrows="false" :cycle="queuePages.length > 1" :interval="SLIDE_MS">
                    <v-carousel-item v-for="(page, pageNo) in queuePages" :key="pageNo">
                        <table class="queue-table queue-body">
                            <colgroup><col style="width:calc(17.708 * var(--u))"><col style="width:calc(16.667 * var(--u))"><col><col style="width:calc(16.667 * var(--u))"><col style="width:calc(7.812 * var(--u))"><col style="width:calc(14.583 * var(--u))"></colgroup>
                            <tbody>
                                <tr v-for="(row, index) in page" :key="`${row.queue_no}-${index}`"
                                    :class="{ 'row-progress': row.statusClass === 'in-progress' }">
                                    <td class="c-queue">{{ row.queue_no }}</td>
                                    <td class="c-plate">{{ row.plate_no }}</td>
                                    <td class="c-driver">{{ row.driver_name }}</td>
                                    <td class="c-ship">{{ row.shipment_number }}</td>
                                    <td v-if="row.queue_no" class="c-bay" :class="{ none: !row.warehouse_bay }">{{ row.warehouse_bay?.name ?? '–' }}</td>
                                    <td v-else></td>
                                    <td><span v-if="row.queue_no" class="tag" :class="row.statusClass">{{ row.statusLabel }}</span></td>
                                </tr>
                            </tbody>
                        </table>
                    </v-carousel-item>
                </v-carousel>
            </div>
        </div>
        <marquee scrollamount="20" v-if="banner_message" class="next-loading-banner-marquee">
            {{ banner_message }}
        </marquee>
    </main>
</template>

<script setup>
import ApiService from '@/services/ApiService';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import { useRoute } from 'vue-router';

const route = useRoute();

const plant_code = Array.isArray(route.params.plant_code) ? route.params.plant_code[0] : route.params.plant_code;
const storage_location = Array.isArray(route.params.storage_location) ? route.params.storage_location[0] : route.params.storage_location;

const SLIDE_MS = 10000
const refreshTimer = ref(30)
const pageIndex = ref(0)
let countdownInterval

const startCountdown = () => {
    countdownInterval = window.setInterval(() => {
        if (refreshTimer.value > 0) {
            refreshTimer.value -= 1
        }

        if (refreshTimer.value === 0) {
            window.clearInterval(countdownInterval)
            window.location.reload()
        }
    }, 1000)
}


onMounted(() => {
    void fetchData();
    fetchSummary();
    startCountdown()

    // Prepare event in case we want to use real-time updates in the future, but for now we'll rely on the auto-refresh every 30 seconds
    // Create private channels for each event type
    // const channelNameBase = `shipment.${readerId}.${bay}`;

    // picklistLogsChannel = echo.channel(`${channelNameBase}.picklist-logs`);
    // picklistRefreshChannel = echo.channel(`${channelNameBase}.picklist-refresh`);
    // driverTapOutChannel = echo.channel(`${channelNameBase}.driver-tap-out`);

    // picklistLogsChannel.listen('PicklistLogsEvent', onPicklistLogsEvent);
    // picklistRefreshChannel.listen('PicklistRefreshEvent', onPicklistRefreshEvent);
    // driverTapOutChannel.listen('DriverTapOutEvent', onDriverTapOutEvent);
})


onBeforeUnmount(() => {
    if (countdownInterval) {
        window.clearInterval(countdownInterval)
    }
})

const loading = ref(false);
const queueRows = ref([]);
const banner_message = ref(null);
const loading_banner_message = ref([]);
const summaryData = ref({
    waiting: 0,
    in_progress: 0,
    completed: 0,
});
const normalizedQueueRows = computed(() => {
    if (Array.isArray(queueRows.value?.data)) {
        return queueRows.value.data;
    }

    if (Array.isArray(queueRows.value)) {
        return queueRows.value;
    }

    return [];
});

const hasValue = value => value !== null && value !== undefined && value !== '';

const getQueueStatus = row => {
    if (row.isPlaceholder) {
        return {
            label: row.status,
            className: 'placeholder',
        };
    }

    const hasLoadStart = hasValue(row.loadstart_datetime) || hasValue(row.loadtstart_datetime);
    const hasLoadEnd = hasValue(row.loadend_datetime);
    const hasWarehouseBay = hasValue(row.warehouse_bay_id);

    if (hasLoadStart && hasLoadEnd) {
        return {
            label: 'COMPLETED',
            className: 'complete',
        };
    }

    if (hasLoadStart) {
        return {
            label: 'IN PROGRESS',
            className: 'in-progress',
        };
    }

    if (hasWarehouseBay) {
        return {
            label: 'WAITING TO TAP',
            className: 'waiting-to-tap',
        };
    }

    return {
        label: 'ON QUEUE',
        className: 'on-queue',
    };
};

const PAGE_SIZE = 6;

// completed trucks only count in the totals; in-progress first, then queue no.
const queueRowsList = computed(() => normalizedQueueRows.value
    .map(row => {
        const s = getQueueStatus(row);
        return { ...row, statusLabel: s.label === 'IN PROGRESS' ? s.label : 'ON QUEUE', statusClass: s.className };
    })
    .filter(row => row.statusClass !== 'complete')
    .sort((x, y) => (y.statusClass === 'in-progress') - (x.statusClass === 'in-progress')
        || String(x.queue_no).localeCompare(String(y.queue_no))));

// PAGE_SIZE rows per slide; last page padded with blank rows so row heights stay equal
const queuePages = computed(() => {
    const pages = [];
    for (let i = 0; i < queueRowsList.value.length; i += PAGE_SIZE) {
        const page = queueRowsList.value.slice(i, i + PAGE_SIZE);
        while (page.length < PAGE_SIZE) page.push({});
        pages.push(page);
    }
    return pages.length ? pages : [[]];
});

const completedCount = computed(() => Number(summaryData.value.completed) || 0);
const totalCount = computed(() => (Number(summaryData.value.waiting) || 0) + (Number(summaryData.value.in_progress) || 0) + completedCount.value);
const progressPct = computed(() => totalCount.value ? (completedCount.value / totalCount.value) * 100 : 0);

const fetchData = async () => {

    try {
        const response = await ApiService.get('loading-queue/get-data', `${plant_code}/${storage_location}`);
        if (response.data) {
            queueRows.value = response.data;
            banner_message.value = response.data.banner_message;
            loading_banner_message.value = response.data.loading_banner_message;
            // stretch the reload so every page is shown once (10 s per page, min 30 s)
            refreshTimer.value = Math.max(30, queuePages.value.length * SLIDE_MS / 1000);
        }
    } catch (error) {
        console.error('Error fetching loading queue data:', error);
    } finally {
        loading.value = false;
    }
};

const fetchSummary = async () => {

    try {
        const response = await ApiService.get('loading-queue/summary/daily', `${plant_code}/${storage_location}`);
        const payload = response?.data?.data ?? response?.data;

        if (payload) {
            summaryData.value = {
                waiting: payload.waiting,
                in_progress: payload.in_progress,
                completed: payload.completed,
            };
        }
    } catch (error) {
        console.error('Error fetching loading queue summary data:', error);
    } finally {
    }
};
</script>

<style scoped>
.queue-screen {
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #fff;
    color: #37343F;
    font-family: 'Rubik', Arial, sans-serif;
    font-variant-numeric: tabular-nums;
    --u: min(1vw, 1.7778vh);
}

.queue-body-wrap {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: calc(0.833 * var(--u));
    padding: calc(0.833 * var(--u)) calc(1.25 * var(--u));
}

.banner {
    flex: none;
    height: calc(6.458 * var(--u));
    display: flex;
    align-items: center;
    gap: calc(3.333 * var(--u));
    padding: 0 calc(2.083 * var(--u));
    background: #D9EEE3;
    border-radius: calc(0.312 * var(--u));
}

.banner-main { flex: 1; min-width: 0; }
.banner-line { display: flex; justify-content: space-between; align-items: baseline; }
.banner h1 { margin: 0; font-size: calc(2.396 * var(--u)); font-weight: 800; letter-spacing: 0.02em; line-height: 1.2; }
.banner-count { font-size: calc(1.354 * var(--u)); font-weight: 500; color: #2F4F40; }
.progress-track { margin-top: calc(0.521 * var(--u)); height: calc(0.625 * var(--u)); border-radius: calc(0.312 * var(--u)); background: #B9DDCA; overflow: hidden; }
.progress-fill { height: 100%; background: #00A36C; border-radius: calc(0.312 * var(--u)); }

.banner-timer { width: calc(14.583 * var(--u)); text-align: center; color: #2F4F40; }
.timer-label { font-size: calc(1.302 * var(--u)); font-weight: 500; }
.timer-row { display: flex; justify-content: center; align-items: baseline; gap: calc(0.625 * var(--u)); }
.timer-num { font-size: calc(3.125 * var(--u)); font-weight: 800; color: #007F54; line-height: 1.1; }
.timer-unit { font-size: calc(1.354 * var(--u)); font-weight: 500; }
.timer-page { font-size: calc(0.938 * var(--u)); font-weight: 700; }

.band { flex: none; height: calc(9.167 * var(--u)); display: flex; }
.seg {
    --seg-bg: #D9EEE3;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--seg-bg);
    padding: 0 calc(4.792 * var(--u)) 0 calc(2.083 * var(--u));
    clip-path: polygon(0 0, calc(100% - calc(2.5 * var(--u))) 0, 100% 50%, calc(100% - calc(2.5 * var(--u))) 100%, 0 100%);
}
.seg + .seg { margin-left: calc(-1.979 * var(--u)); padding-left: calc(4.583 * var(--u)); clip-path: polygon(0 0, calc(100% - calc(2.5 * var(--u))) 0, 100% 50%, calc(100% - calc(2.5 * var(--u))) 100%, 0 100%, calc(2.5 * var(--u)) 50%); }
.seg:last-child { padding-right: calc(2.292 * var(--u)); clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%, calc(2.5 * var(--u)) 50%); }
.seg-count { font-size: calc(5.417 * var(--u)); font-weight: 800; line-height: 1; }
.seg-label { font-size: calc(1.667 * var(--u)); font-weight: 700; }
.seg-queue .seg-icon { color: #007F54; }
.seg-progress { --seg-bg: #FFB020; }
.seg-done { --seg-bg: #00A36C; color: #fff; }
.band.empty .seg { --seg-bg: #EEF3F0; color: #4A5A52; }
.band.empty .seg-icon { color: #7E8C85; }

.table-wrap { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
.queue-carousel { flex: 1; min-height: 0; }
.queue-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.queue-body { height: 100%; }

.queue-table th {
    height: calc(3.021 * var(--u));
    background: #00A36C;
    color: #fff;
    font-size: calc(1.354 * var(--u));
    font-weight: 700;
    letter-spacing: 0.02em;
    text-align: center;
    border: calc(0.104 * var(--u)) solid #fff;
    border-top: 0;
}
.queue-table th:first-child { border-left: 0; }
.queue-table th:last-child { border-right: 0; }

.queue-body td { line-height: 1; text-align: center; border: calc(0.104 * var(--u)) solid #5FBF97; padding: 0 calc(0.625 * var(--u)); white-space: nowrap; overflow: hidden; }
.queue-body tr { height: calc(100% / 6); }
.queue-body tr.row-progress { background: #FFF4DC; }
.c-queue { font-size: calc(2.292 * var(--u)); font-weight: 600; color: #007F54; }
.c-plate { font-size: calc(2.083 * var(--u)); font-weight: 700; }
.c-driver { font-size: calc(1.875 * var(--u)); font-weight: 500; text-transform: uppercase; }
.c-ship { font-size: calc(1.979 * var(--u)); font-weight: 500; }
.c-bay { font-size: calc(3.75 * var(--u)); font-weight: 800; }
.c-bay.none { color: #5C6C64; }

.tag {
    display: inline-block;
    font-size: calc(1.354 * var(--u));
    font-weight: 700;
    padding: calc(0.521 * var(--u)) calc(1.875 * var(--u)) calc(0.521 * var(--u)) calc(0.833 * var(--u));
    background: #D9EEE3;
    clip-path: polygon(0 0, calc(100% - calc(1.042 * var(--u))) 0, 100% 50%, calc(100% - calc(1.042 * var(--u))) 100%, 0 100%);
}
.tag.in-progress { background: #FFB020; }

.empty-msg {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: calc(0.938 * var(--u));
    border: calc(0.104 * var(--u)) solid #5FBF97;
    border-top: 0;
}
.empty-title { font-size: calc(3.542 * var(--u)); font-weight: 800; }
.empty-sub { font-size: calc(1.667 * var(--u)); font-weight: 500; color: #4A5A52; }

.loading-banner-marquee,
.next-loading-banner-marquee {
    flex: none;
    color: #ffffff;
    font-weight: bold;
    padding: calc(0.5 * var(--u)) 0;
    font-size: calc(1.9 * var(--u));
    width: 100%;
    z-index: 10;
    min-height: calc(3.2 * var(--u));
    display: flex;
    align-items: center;
    justify-content: center;
}
.loading-banner-marquee { background: #257c02; }
.next-loading-banner-marquee { background: #FFCC33; }
</style>
