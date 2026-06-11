<template>
  <VCard>
    <VCardTitle>
      Process Duration Comparison (Min / Avg / Max)
    </VCardTitle>

    <VCardText>
      <VueApexCharts
        type="bar"
        height="450"
        :options="chartOptions"
        :series="series"
      />
    </VCardText>
  </VCard>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    data: {
        type: Object,
        default: () => ({})
    }
})

const categories = computed(() =>
  Object.values(props.data).map(i => i.label)
)

/**
 * SERIES (Min / Avg / Max)
 */
const series = computed(() => [
    {
        name: 'Min',
        data: Object.values(props.data).map(i => i.min)
    },
    {
        name: 'Avg',
        data: Object.values(props.data).map(i => i.avg)
    },
    {
        name: 'Max',
        data: Object.values(props.data).map(i => i.max)
    }
])

/**
 * CHART OPTIONS
 */
const chartOptions = computed(() => ({
  chart: {
    type: 'bar',
    stacked: false,
    toolbar: { show: true }
  },

  plotOptions: {
    bar: {
      horizontal: true,
      barHeight: '60%',
      borderRadius: 4
    }
  },

  colors: ['#4CAF50', '#2196F3', '#F44336'],

  xaxis: {
    categories: categories.value,
    labels: {
      formatter: (val) => `${Math.floor(val / 60)}m`
    }
  },

  dataLabels: {
    enabled: true,
    formatter: (val) => {
      const m = Math.floor(val / 60)
      const s = val % 60
      return `${m}m ${s}s`
    }
  },

  tooltip: {
    y: {
      formatter: (val) => {
        const m = Math.floor(val / 60)
        const s = val % 60
        return `${m}m ${s}s`
      }
    }
  },

  legend: {
    position: 'top'
  },

  grid: {
    borderColor: '#e0e0e0'
  }
}))
</script>
