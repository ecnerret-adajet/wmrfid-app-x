<script setup>
import { ref } from 'vue';

const series = ref([
  {
    name: 'Items',
    data: [50, 35, 40, 10, 160], // Replace with your actual values
  },
])

const chartOptions = ref({
  chart: {
    type: 'bar',
    toolbar: {
      show: false,
    },
  },
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: '50%',
      endingShape: 'rounded',
    },
  },
  dataLabels: {
    enabled: false,
  },
  xaxis: {
    categories: ['0-30days', '31-60days', '61-90days', '91-120days', '120+ days'],
    title: {
      text: 'Age (days)',
    },
  },
  yaxis: {
    title: {
      text: 'Item Count',
    },
  },
  colors: ['#2196F3'], // Blue
  tooltip: {
    y: {
      formatter: (val) => `${val} items`,
    },
  },
})
</script>

<template>
    <v-card class="pa-4" elevation="2">
        <v-card-title class="text-h5 font-weight-bold">
            Inventory Age Distribution
        </v-card-title>
    <v-card-text>
      <VueApexCharts
        type="bar"
        height="250"
        :options="chartOptions"
        :series="series"
      />
    </v-card-text>
    </v-card>
</template>
