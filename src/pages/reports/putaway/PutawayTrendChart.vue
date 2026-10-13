<script setup>
import moment from 'moment'
import { computed, defineProps } from 'vue'

const props = defineProps({
  data: {
    type: Array,
    default: () => [],
  },
  target: {
    type: [Number, String],
    default: null,
  },
})

const targetValue = computed(() => {
  if (props.target === null || props.target === '') return null

  const value = Number(props.target)

  return Number.isFinite(value) ? value : null
})

const chartPoints = computed(() => props.data
  .filter(row => row?.date)
  .map(row => {
    const value = Number(row.actual_avg_minutes)

    return {
      date: row.date,
      actual: row.actual_avg_minutes === null || row.actual_avg_minutes === '' || !Number.isFinite(value)
        ? null
        : value,
    }
  }))

const hasChartData = computed(() => chartPoints.value.some(point => point.actual !== null))

const series = computed(() => {
  const chartSeries = [{
    name: 'Actual',
    data: chartPoints.value.map(point => point.actual),
  }]

  if (targetValue.value !== null) {
    chartSeries.push({
      name: 'Average',
      data: chartPoints.value.map(() => targetValue.value),
    })
  }

  return chartSeries
})

const chartOptions = computed(() => ({
  chart: {
    type: 'area',
    parentHeightOffset: 0,
    toolbar: { show: false },
  },
  colors: ['#29b6f6', '#20c997'],
  dataLabels: { enabled: false },
  fill: {
    type: 'solid',
    opacity: [0.12, 0],
  },
  grid: {
    borderColor: 'rgba(var(--v-border-color), var(--v-border-opacity))',
    strokeDashArray: 4,
    padding: {
      left: 8,
      right: 12,
    },
  },
  legend: {
    position: 'top',
    horizontalAlign: 'right',
    markers: { radius: 12 },
  },
  markers: {
    size: 4,
    strokeWidth: 2,
    hover: { size: 6 },
  },
  stroke: {
    curve: 'straight',
    width: [3, 2],
    dashArray: [0, 5],
  },
  tooltip: {
    y: {
      formatter: value => `${Number(value).toFixed(2)} min`,
    },
  },
  xaxis: {
    categories: chartPoints.value.map(point => point.date),
    labels: {
      formatter: value => moment(value).format('MMM D'),
    },
    tickPlacement: 'on',
  },
  yaxis: {
    min: 0,
    title: {
      text: 'Average time (minutes)',
    },
    labels: {
      formatter: value => Number(value).toFixed(0),
    },
  },
}))
</script>

<template>
  <VCard>
    <VCardTitle class="text-h5 font-weight-bold">
      Warehouse Performance Trends
    </VCardTitle>
    <VCardText>
      <VueApexCharts
        v-if="hasChartData"
        type="area"
        :options="chartOptions"
        :series="series"
        height="350"
      />
      <div
        v-else
        class="text-body-2 text-medium-emphasis text-center py-12"
      >
        No TR creation to putaway trend data is available for the selected filters.
      </div>
    </VCardText>
  </VCard>
</template>
