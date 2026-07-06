<template>
  <main class="monitor-screen">
    <!-- Header -->
    <header class="monitor-header">
      <div class="header-content">
        <div class="header-left">
          <!-- <h1 class="header-title">
            {{ groupName }}
          </h1> -->
          <span class="header-subtitle">Loading Monitor</span>
        </div>
        <div class="header-right">
          <div class="refresh-info">
            <span class="refresh-label">Refresh in</span>
            <span class="refresh-countdown">{{ refreshTimer }}</span>
            <span class="refresh-unit">s</span>
          </div>
          <button
            class="refresh-btn"
            :disabled="isRefreshing"
            title="Refresh now"
            @click="manualRefresh"
          >
            <svg
              class="refresh-icon"
              :class="{ spinning: isRefreshing }"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- Loading State -->
    <div
      v-if="loading"
      class="monitor-body"
    >
      <div class="card-grid">
        <div
          v-for="n in 6"
          :key="n"
          class="monitor-card skeleton-card"
        >
          <div class="card-header-skel">
            <div class="skel skel-title" />
            <div class="skel skel-chip" />
          </div>
          <div class="skel skel-divider" />
          <div class="card-body-skel">
            <div class="skel skel-line" />
            <div class="skel skel-line short" />
          </div>
          <div class="skel skel-divider" />
          <div class="card-footer-skel">
            <div class="skel skel-line" />
            <div class="skel skel-line" />
          </div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      class="monitor-body error-body"
    >
      <div class="error-container">
        <svg
          class="error-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
          />
          <line
            x1="12"
            y1="8"
            x2="12"
            y2="12"
          />
          <line
            x1="12"
            y1="16"
            x2="12.01"
            y2="16"
          />
        </svg>
        <h2 class="error-title">
          Unable to Load Monitor
        </h2>
        <p class="error-message">
          {{ error }}
        </p>
        <button
          class="error-retry-btn"
          @click="fetchData"
        >
          Try Again
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!cards.length"
      class="monitor-body error-body"
    >
      <div class="error-container">
        <svg
          class="error-icon empty"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <rect
            x="2"
            y="3"
            width="20"
            height="14"
            rx="2"
            ry="2"
          />
          <line
            x1="8"
            y1="21"
            x2="16"
            y2="21"
          />
          <line
            x1="12"
            y1="17"
            x2="12"
            y2="21"
          />
        </svg>
        <h2 class="error-title">
          No Data Available
        </h2>
        <p class="error-message">
          No loading bays are currently configured for this monitor.
        </p>
      </div>
    </div>

    <!-- Card Grid -->
    <div
      v-else
      class="monitor-body"
    >
      <div class="card-grid">
        <div
          v-for="card in cards"
          :key="card.bay_no"
          class="monitor-card"
          :class="`status-${card.status}`"
        >
          <!-- Card Header -->
          <div class="card-header">
            <span class="bay-label">Bay {{ card.bay_no }}</span>
            <span
              class="status-chip"
              :class="`chip-${card.status}`"
            >
              {{ formatStatus(card.status) }}
            </span>
          </div>

          <!-- Card Body -->
          <div class="card-body">
            <div class="info-row">
              <span class="info-label">Driver</span>
              <span
                class="info-value"
                :class="{ 'text-empty': !card.driver_name }"
              >
                {{ card.driver_name || '—' }}
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">Plate</span>
              <span
                class="info-value"
                :class="{ 'text-empty': !card.plate_number }"
              >
                {{ card.plate_number || '—' }}
              </span>
            </div>
          </div>

          <!-- Card Footer -->
          <div class="card-footer">
            <div class="time-block">
              <span class="time-label">Load Start</span>
              <span
                class="time-value"
                :class="{ 'text-empty': !card.load_start_datetime }"
              >
                {{ formatDateTime(card.load_start_datetime) }}
              </span>
            </div>
            <div class="time-block">
              <span class="time-label">Load End</span>
              <span
                class="time-value"
                :class="{ 'text-empty': !card.load_end_datetime }"
              >
                {{ formatDateTime(card.load_end_datetime) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import ApiService from '@/services/ApiService'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const slug = Array.isArray(route.params.slug) ? route.params.slug[0] : route.params.slug

const loading = ref(true)
const error = ref(null)
const groupName = ref('')
const cards = ref([])
const refreshTimer = ref(30)
const isRefreshing = ref(false)

let countdownInterval = null

const formatTime = datetime => {
  if (!datetime) return '—'
  const date = new Date(datetime)
  if (isNaN(date.getTime())) return '—'

  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

const formatDateTime = datetime => {
  if (!datetime) return '—'
  const date = new Date(datetime)
  if (isNaN(date.getTime())) return '—'

  const datePart = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const timePart = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  return `${datePart} ${timePart}`
}

const formatStatus = status => {
  const labels = {
    idle: 'IDLE',
    loading: 'LOADING',
    completed: 'COMPLETED',
  }

  
  return labels[status] || (status || '').toUpperCase()
}

const fetchData = async () => {
  try {
    isRefreshing.value = true

    const response = await ApiService.get('loading-monitor', slug)
    if (response.data) {
      groupName.value = response.data.group || ''
      cards.value = Array.isArray(response.data.cards) ? response.data.cards : []
      error.value = null
    }
  } catch (err) {
    console.error('Error fetching monitor data:', err)
    if (err.response?.status === 404) {
      error.value = 'Monitor group not found. Please check the URL and try again.'
    } else {
      error.value = 'Failed to load monitor data. Please try again later.'
    }
  } finally {
    loading.value = false
    isRefreshing.value = false
  }
}

const startCountdown = () => {
  refreshTimer.value = 30
  countdownInterval = window.setInterval(() => {
    if (refreshTimer.value > 0) {
      refreshTimer.value -= 1
    }
    if (refreshTimer.value === 0) {
      refreshTimer.value = 30
      fetchData()
    }
  }, 1000)
}

const manualRefresh = () => {
  if (countdownInterval) {
    window.clearInterval(countdownInterval)
  }
  fetchData()
  startCountdown()
}

onMounted(() => {
  fetchData()
  startCountdown()
})

onBeforeUnmount(() => {
  if (countdownInterval) {
    window.clearInterval(countdownInterval)
  }
})
</script>

<style scoped>
/* ── Full-Screen Layout ── */
.monitor-screen {
  width: 100%;
  min-height: 100vh;
  background: #f8f9fa;
  color: #212529;
  font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
  display: flex;
  flex-direction: column;
}

/* ── Header ── */
.monitor-header {
  flex-shrink: 0;
  background: #ffffff;
  border-bottom: 1px solid #e0e0e0;
  padding: 20px 28px;
  position: sticky;
  top: 0;
  z-index: 10;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  max-width: 1800px;
  margin: 0 auto;
  width: 100%;
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 14px;
  min-width: 0;
}

.header-title {
  margin: 0;
  font-size: clamp(1.5rem, 2.5vw, 2.2rem);
  font-weight: 700;
  color: #212529;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-subtitle {
  font-size: clamp(0.75rem, 1vw, 0.95rem);
  color: #757575;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  white-space: nowrap;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}

.refresh-info {
  display: flex;
  align-items: baseline;
  gap: 6px;
  color: #757575;
  font-size: 0.85rem;
}

.refresh-label {
  font-weight: 500;
}

.refresh-countdown {
  font-size: 1.5rem;
  font-weight: 800;
  color: #1565c0;
  font-variant-numeric: tabular-nums;
  min-width: 1.8ch;
  text-align: center;
}

.refresh-unit {
  font-weight: 600;
  color: #757575;
}

.refresh-btn {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  border: 1px solid #e0e0e0;
  background: #ffffff;
  color: #616161;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  padding: 0;
}

.refresh-btn:hover {
  background: #f5f5f5;
  color: #212529;
  border-color: #bdbdbd;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.refresh-icon {
  width: 20px;
  height: 20px;
}

.refresh-icon.spinning {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ── Body ── */
.monitor-body {
  flex: 1;
  padding: 24px 28px;
  overflow-y: auto;
}

/* ── Card Grid ── */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  max-width: 1800px;
  margin: 0 auto;
  width: 100%;
}

/* ── Monitor Card ── */
.monitor-card {
  background: #ffffff;
  border-radius: 14px;
  border: 1px solid #e0e0e0;
  border-left: 4px solid #bdbdbd;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.monitor-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

/* Status border accents */
.monitor-card.status-idle {
  border-left-color: #9e9e9e;
}

.monitor-card.status-loading {
  border-left-color: #4caf50;
}

.monitor-card.status-completed {
  border-left-color: #1976d2;
}

/* ── Card Header ── */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px 12px;
}

.bay-label {
  font-size: clamp(1.1rem, 1.4vw, 1.35rem);
  font-weight: 700;
  color: #212529;
  letter-spacing: 0.02em;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  padding: 5px 14px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.chip-idle {
  background: #f5f5f5;
  color: #616161;
  border: 1px solid #e0e0e0;
}

.chip-loading {
  background: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #c8e6c9;
}

.chip-completed {
  background: #e3f2fd;
  color: #1565c0;
  border: 1px solid #bbdefb;
}

/* ── Card Body ── */
.card-body {
  padding: 0 18px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.info-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #757575;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  min-width: 48px;
  flex-shrink: 0;
}

.info-value {
  font-size: clamp(0.9rem, 1.1vw, 1.05rem);
  font-weight: 600;
  color: #212529;
  word-break: break-word;
}

.info-value.text-empty {
  color: #bdbdbd;
  font-weight: 400;
}

/* ── Card Footer ── */
.card-footer {
  border-top: 1px solid #eeeeee;
  padding: 12px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #fafafa;
}

.time-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.time-label {
  font-size: 0.65rem;
  font-weight: 600;
  color: #9e9e9e;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.time-value {
  font-size: clamp(0.82rem, 0.95vw, 0.9rem);
  font-weight: 600;
  color: #424242;
  font-variant-numeric: tabular-nums;
}

.time-value.text-empty {
  color: #bdbdbd;
  font-weight: 400;
}

/* ── Skeleton Loading ── */
.skeleton-card {
  pointer-events: none;
}

.skel {
  background: linear-gradient(90deg, #e0e0e0 25%, #eeeeee 50%, #e0e0e0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 6px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.card-header-skel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px 12px;
}

.skel-title {
  width: 80px;
  height: 20px;
}

.skel-chip {
  width: 70px;
  height: 24px;
  border-radius: 999px;
}

.skel-divider {
  height: 1px;
  margin: 0 18px;
}

.card-body-skel {
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skel-line {
  width: 100%;
  height: 16px;
}

.skel-line.short {
  width: 65%;
}

.card-footer-skel {
  padding: 12px 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #fafafa;
}

/* ── Error / Empty State ── */
.error-body {
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-container {
  text-align: center;
  padding: 40px;
}

.error-icon {
  width: 56px;
  height: 56px;
  color: #bdbdbd;
  margin-bottom: 20px;
}

.error-icon.empty {
  color: #e0e0e0;
}

.error-title {
  margin: 0 0 8px;
  font-size: 1.3rem;
  font-weight: 700;
  color: #616161;
}

.error-message {
  margin: 0 0 24px;
  font-size: 0.95rem;
  color: #9e9e9e;
  max-width: 400px;
}

.error-retry-btn {
  padding: 10px 24px;
  border-radius: 10px;
  border: 1px solid #e0e0e0;
  background: #ffffff;
  color: #424242;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.error-retry-btn:hover {
  background: #f5f5f5;
  border-color: #bdbdbd;
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .monitor-header {
    padding: 16px 16px;
  }

  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-left {
    flex-direction: column;
    gap: 4px;
  }

  .header-right {
    width: 100%;
    justify-content: space-between;
  }

  .monitor-body {
    padding: 16px;
  }

  .card-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }
}

@media (min-width: 769px) and (max-width: 1200px) {
  .card-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }
}
</style>
