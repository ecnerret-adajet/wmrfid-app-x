<template>
    <main class="queue-screen">
        <section class="board-card">
            <header class="board-header">
                <div class="title-row">
                    <h1 class="text-white font-bold">Loading Queue</h1>
                    <div class="header-timer" aria-label="30 second reload countdown">
                        <span class="header-timer-label">Reloading in</span>
                        <span class="header-timer-value">{{ refreshTimer }}</span>
                        <span class="header-timer-unit">seconds</span>
                    </div>
                </div>
            </header>

            <section class="summary-row">
                <article class="summary-item queued">
                    <p class="label">On Queue</p>
                    <p class="value">{{ summaryCounts.onQueue }}</p>
                </article>
                <article class="summary-item waiting">
                    <p class="label">Waiting</p>
                    <p class="value">{{ summaryCounts.waiting }}</p>
                </article>
                <article class="summary-item active">
                    <p class="label">In Progress</p>
                    <p class="value">{{ summaryCounts.inProgress }}</p>
                </article>
                <article class="summary-item complete">
                    <p class="label">Completed</p>
                    <p class="value">{{ summaryCounts.completed }}</p>
                </article>
            </section>
            <div class="table-wrap">
                <table class="queue-table">
                <thead>
                    <tr>
                        <th>QUEUE NO.</th>
                        <th>PLATE NO.</th>
                        <th>DRIVER NAME</th>
                        <th>BAY</th>
                        <th>STATUS</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="(row, index) in displayedQueueRows"
                        :key="`${row.queue_no}-${index}`"
                        :class="{ 'placeholder-row': row.isPlaceholder }"
                    >
                        <td>{{ row.queue_no }}</td>
                        <td>{{ row.plate_no }}</td>
                        <td :class="getDriverNameClass(row.driver_name)">{{ row.driver_name }}</td>
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
            </div>

            <footer class="notice-bar">
                Please prepare documents before your queue is called
            </footer>
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

const refreshTimer = ref(30)
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

const displayedQueueRows = computed(() => {
    const rows = normalizedQueueRows.value.slice(0, 5).map(row => {
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

    while (rows.length < 5) {
        const placeholder = createPlaceholderRow(rows.length + 1);
        rows.push({
            ...placeholder,
            statusLabel: 'No queue yet',
            statusClass: placeholder.statusClass,
        });
    }

    return rows;
});

const summaryCounts = computed(() => normalizedQueueRows.value.reduce((counts, row) => {
    const queueStatus = getQueueStatus(row);

    if (queueStatus.className === 'on-queue') {
        counts.onQueue += 1;
    }

    if (queueStatus.className === 'waiting-to-tap') {
        counts.waiting += 1;
    }

    if (queueStatus.className === 'in-progress') {
        counts.inProgress += 1;
    }

    if (queueStatus.className === 'complete') {
        counts.completed += 1;
    }

    return counts;
}, {
    onQueue: 0,
    waiting: 0,
    inProgress: 0,
    completed: 0,
}));

const fetchData = async () => {
  
    try {
        const response = await ApiService.get('loading-queue/get-data', `${plant_code}/${storage_location}`);
        if (response.data) {
            queueRows.value = response.data;
        }
    } catch (error) {
        console.error('Error fetching loading queue data:', error);
    } finally {
        loading.value = false;
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
    background:
        radial-gradient(circle at 15% 20%, rgba(0, 109, 165, 0.2), transparent 30%),
        radial-gradient(circle at 85% 10%, rgba(191, 13, 37, 0.15), transparent 25%),
        linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 50%, #f8fafc 100%);
    color: #0f172a;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.board-card {
    width: 100%;
    min-height: 100vh;
    border-radius: 0;
    overflow: hidden;
    box-shadow: none;
    background: #ffffff;
    border: none;
    display: grid;
    grid-template-rows: auto auto 1fr auto;
}

.board-header {
    padding: 26px 30px;
    background: linear-gradient(90deg, #075985 0%, #0e7490 100%);
    color: #ffffff;
}

.title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
}

.board-header h1 {
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: clamp(1.8rem, 3.2vw, 3rem);
    line-height: 1.2;
}

.header-timer {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: #d7efff;
    text-align: center;
    font-size: clamp(1.05rem, 1.15vw, 1.4rem);
    font-weight: 600;
}

.header-timer-label,
.header-timer-unit {
    color: #d7efff;
}

.header-timer-value {
    color: #ffffff;
    font-size: clamp(1.5rem, 1.9vw, 2.2rem);
    font-weight: 900;
    line-height: 1;
}

.meta-row {
    margin-top: 12px;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.badge {
  font-size: clamp(1.2rem, 1.15vw, 1.05rem);
    padding: 6px 14px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.18);
    border: 1px solid rgba(255, 255, 255, 0.3);
}

.summary-row {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    padding: 16px 20px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
}

.summary-item {
    border-radius: 12px;
    padding: 14px 16px;
    border: 1px solid transparent;
}

.summary-item .label {
    margin: 0;
    font-size: clamp(1rem, 1vw, 1.2rem);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #334155;
}

.summary-item .value {
    margin: 4px 0 0;
    font-size: clamp(1.5rem, 2vw, 2rem);
    font-weight: 700;
}

.summary-item.waiting {
    background: #fff7ed;
    border-color: #fdba74;
    color: #9a3412;
}

.summary-item.queued {
    background: #e2e8f0;
    border-color: #cbd5e1;
    color: #334155;
}

.summary-item.active {
    background: #ecfeff;
    border-color: #67e8f9;
    color: #155e75;
}

.summary-item.complete {
    background: #f0fdf4;
    border-color: #86efac;
    color: #166534;
}

.table-wrap {
    overflow: auto;
}

.queue-table {
    width: 100%;
    height: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    min-width: 1180px;
}

.queue-table th,
.queue-table td {
    text-align: center;
    border: 1px solid #e2e8f0;
    font-weight: 700;
}

.queue-table th {
    padding: 4px 1px;
    background: #0b6a99;
    color: #ffffff;
    font-size: clamp(2.5rem, 1.6vw, 2.5rem);
    font-weight: 700;
}

.queue-table tbody tr:nth-child(odd) {
    background: #f8fafc;
}

.queue-table tbody tr:nth-child(even) {
    background: #f1f5f9;
}

.queue-table td {
    font-size: clamp(2.5rem, 1.75vw, 2.5rem);
    line-height: 1.25;
}

.queue-table tbody tr.placeholder-row {
    background: #f8fafc;
}

.queue-table tbody tr.placeholder-row td {
    color: #94a3b8;
    font-style: italic;
}

.queue-table td.driver-name {
    overflow-wrap: anywhere;
    word-break: break-word;
    font-size: clamp(1.8rem, 1.5vw, 2.3rem);
}

.queue-table td.driver-name.is-long {
    font-size: clamp(1.4rem, 1.2vw, 1.9rem);
}

.queue-table td.driver-name.is-very-long {
    font-size: clamp(1.1rem, 1vw, 1.5rem);
}

.status {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: clamp(160px, 11vw, 220px);
    padding: 10px 20px;
    border-radius: 999px;
    font-weight: 700;
    font-size: clamp(1.4rem, 1.6vw, 1.8rem);
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

.notice-bar {
    background: #b91c1c;
    color: #ffffff;
    text-align: center;
    font-size: clamp(1.1rem, 2vw, 2rem);
    text-transform: uppercase;
    font-weight: 800;
    letter-spacing: 0.03em;
    padding: 14px 16px;
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
}
</style>
