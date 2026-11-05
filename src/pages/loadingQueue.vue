<template>
    <main class="queue-screen">
        <marquee scrollamount="20" v-if="loading_banner_message && loading_banner_message.length"
            class="loading-banner-marquee">
            {{ loading_banner_message.join(' | ') }}
        </marquee>
        <section class="board-card" :style="{ minHeight: cardMinHeight }">
            <header class="board-header">
                <div class="title-row">
                    <h1 class="text-uppercase font-weight-black">Warehouse Queue</h1>
                    <div class="header-timer" aria-label="reload countdown">
                        <span v-if="queuePages.length > 1" class="page-label">
                            Page {{ pageIndex + 1 }} of {{ queuePages.length }}
                        </span>
                        <span>Reloading in</span>
                        <span class="text-h4 font-weight-black">{{ refreshTimer }}</span>
                        <span>seconds</span>
                    </div>
                </div>
            </header>

            <section class="summary-row">
                <v-card v-for="card in summaryCards" :key="card.label" variant="tonal" :color="card.color"
                    class="pa-4" :style="{ borderLeft: `6px solid ${card.color}` }">
                    <div class="text-caption text-uppercase font-weight-black">{{ card.label }}</div>
                    <div class="text-h3 font-weight-black">{{ card.value }}</div>
                </v-card>
            </section>
            <div class="table-wrap">
                <table class="queue-table">
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
                <v-carousel v-model="pageIndex" class="queue-carousel" height="100%" hide-delimiters
                    :show-arrows="false" :cycle="queuePages.length > 1" :interval="SLIDE_MS">
                    <v-carousel-item v-for="(page, pageNo) in queuePages" :key="pageNo">
                        <table class="queue-table queue-body">
                            <tbody>
                                <tr v-for="(row, index) in page" :key="`${row.queue_no}-${index}`"
                                    :class="{ 'placeholder-row': row.isPlaceholder }">
                                    <td>{{ row.queue_no }}</td>
                                    <td>{{ row.plate_no }}</td>
                                    <td :class="getDriverNameClass(row.driver_name)">{{ row.driver_name }}</td>
                                    <td>
                                        <template v-if="row.shipment_number && !row.isPlaceholder">
                                            {{ row.shipment_number }}
                                        </template>
                                        <template v-else>
                                            <span class="placeholder-text">No queue yet</span>
                                        </template>
                                    </td>
                                    <td>
                                        <template v-if="row.warehouse_bay">
                                            {{ row.warehouse_bay?.name }}
                                        </template>
                                        <template v-else>
                                            <span class="status" :class="'on-queue'">
                                                ON QUEUE
                                            </span>
                                        </template>
                                    </td>
                                    <td>
                                        <span class="status" :class="row.statusClass">{{ row.statusLabel }}</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </v-carousel-item>
                </v-carousel>
            </div>
        
            <marquee scrollamount="20" v-if="banner_message"
                class="next-loading-banner-marquee">
                 {{ banner_message }}
            </marquee>
        </section>
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
const createPlaceholderRow = (index) => ({
    queue_no: 'No queue yet',
    plate_no: 'No queue yet',
    driver_name: 'No queue yet',
    warehouse_bay: { name: 'No queue yet' },
    status: 'No queue yet',
    statusClass: 'placeholder',
    isPlaceholder: true,
    id: `placeholder-${index}`,
});

const cardMinHeight = computed(() => {
    if (loading_banner_message.value.length > 0) {
        return banner_message.value ? '92vh' : '95vh';
    }
    return '100vh';
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

const chunkArray = (arr, size) => {
    const result = []
    for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size))
    }
    return result
}

const padPage = rows => {
    while (rows.length < 5) {
        const placeholder = createPlaceholderRow(rows.length + 1);
        rows.push({
            ...placeholder,
            statusLabel: 'No queue yet',
            statusClass: placeholder.statusClass,
        });
    }
    return rows;
};

// 5 rows per slide, each slide padded to 5; zero rows = one page of placeholders
const queuePages = computed(() => {
    const rows = normalizedQueueRows.value.map(row => {
        // If this is a placeholder row, keep its properties as is
        if (row.isPlaceholder) {
            return row;
        }
        const queueStatus = getQueueStatus(row);
        return {
            ...row,
            statusLabel: queueStatus.label,
            statusClass: queueStatus.className,
            isPlaceholder: false,
        };
    });

    const pages = chunkArray(rows, 5).map(padPage);
    return pages.length ? pages : [padPage([])];
});

const summaryCards = computed(() => [
    { label: 'On Queue', color: '#607d8b', value: Number(summaryData.value.waiting) || 0 },
    { label: 'In Progress', color: '#ff9800', value: Number(summaryData.value.in_progress) || 0 },
    { label: 'Completed', color: '#43a047', value: Number(summaryData.value.completed) || 0 },
]);

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


const getDriverNameClass = (name) => {
    const normalizedLength = (name ?? '').replace(/\s+/g, '').length

    if (normalizedLength >= 20) {
        return ['driver-name', 'is-very-long']
    }

    if (normalizedLength >= 16) {
        return ['driver-name', 'is-long']
    }

    return 'driver-name'
}
</script>

<style scoped>
.queue-screen {
    width: 100%;
    min-height: 100vh;
    padding: 0;
    background: #ffffff;
    color: #212121;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.board-card {
    width: 100%;
    border-radius: 0;
    overflow: hidden;
    box-shadow: none;
    background: #ffffff;
    border: none;
    display: grid;
    grid-template-rows: auto auto 1fr auto;
}

.board-header {
    padding: 14px 24px;
    background: #ffffff;
    border-bottom: 6px solid #00A36C;
}

.title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
}

.board-header h1 {
    margin: 0;
    letter-spacing: 0.04em;
    font-size: clamp(1.8rem, 3vw, 2.6rem);
    line-height: 1.2;
}

.header-timer {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: clamp(1.05rem, 1.15vw, 1.4rem);
    font-weight: 600;
}

.page-label {
    margin-right: 16px;
    font-weight: 900;
    color: #00A36C;
}

.summary-row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
    padding: 12px 20px;
}

.table-wrap {
    display: flex;
    flex-direction: column;
    overflow: auto;
}

.queue-carousel {
    flex: 1;
}

.queue-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
}

.queue-body {
    height: 100%;
}

.queue-table th,
.queue-table td {
    text-align: center;
    border: 1px solid #329b62;
    font-weight: 700;
}

.queue-table th {
    padding: 8px 4px;
    background: #00A36C;
    color: #ffffff;
    text-transform: uppercase;
    font-size: 1.4rem;
    font-weight: 900;
}

.queue-table td {
    padding: 6px 4px;
    font-size: 2rem;
    line-height: 1.25;
}

.queue-table tbody tr.placeholder-row td {
    color: #9e9e9e;
    font-size: 1.4rem;
}

.queue-table td.driver-name {
    overflow-wrap: anywhere;
    word-break: break-word;
    font-size: clamp(1.6rem, 1.4vw, 2rem);
}

.queue-table td.driver-name.is-long {
    font-size: clamp(1.4rem, 1.2vw, 1.8rem);
}

.queue-table td.driver-name.is-very-long {
    font-size: clamp(1.1rem, 1vw, 1.5rem);
}

.status {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: clamp(140px, 10vw, 200px);
    padding: 6px 14px;
    border-radius: 999px;
    font-weight: 700;
    font-size: 1.2rem;
}

.status.on-queue {
    background: #e2e8f0;
    color: #334155;
}

.status.waiting-to-tap {
    background: #fff7ed;
    color: #c2410c;
}

.status.in-progress {
    background: #dbeafe;
    color: #1d4ed8;
}

.status.complete {
    background: #dcfce7;
    color: #15803d;
}

.status.placeholder {
    background: #e2e8f0;
    color: #64748b;
}

.loading-banner-marquee {
    background: #257c02;
    color: #ffffff;
    font-weight: bold;
    padding: 19px 0;
    font-size: 2.3rem;
    width: 100%;
    z-index: 10;
    min-height: 70px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.next-loading-banner-marquee {
    background: #FFCC33;
    color: #ffffff;
    font-weight: bold;
    padding: 19px 0;
    font-size: 2.3rem;
    width: 100%;
    z-index: 10;
    min-height: 70px;
    display: flex;
    align-items: center;
    justify-content: center;
}

@media (max-width: 768px) {
    .queue-screen {
        min-height: auto;
    }

    .board-card {
        min-height: auto;
        grid-template-rows: auto auto auto auto;
    }

    .summary-row {
        grid-template-columns: 1fr;
    }

    .title-row {
        flex-direction: column;
        align-items: flex-start;
    }

    .header-timer {
        justify-content: flex-start;
        flex-wrap: wrap;
    }

    .queue-table th,
    .queue-table td {
        padding: 10px 8px;
        font-size: 0.95rem;
    }

    .loading-banner-marquee {
        background: #257c02;
        color: #ffffff;
        font-weight: bold;
        padding: 19px 0;
        font-size: 1.4rem;
        border-bottom: 1px solid #ffd700;
        width: 100%;
        z-index: 10;
        min-height: 48px;
        display: flex;
        align-items: center;
    }

    .next-loading-banner-marquee {
        background: #FFCC33;
        color: #ffffff;
        font-weight: bold;
        padding: 19px 0;
        font-size: 1.4rem;
        border-bottom: 1px solid #ffd700;
        width: 100%;
        z-index: 10;
        min-height: 48px;
        display: flex;
        align-items: center;
    }

}
</style>
