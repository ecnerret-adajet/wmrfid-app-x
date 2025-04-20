<script setup>
import { ref } from 'vue';

const series = ref([40, 45, 15]) // available, taken, reserved

const chartOptions = ref({
  chart: {
    type: 'donut',
  },
  labels: ['Available Space', 'Taken Space', 'Reserved Space'],
  colors: ['#4CAF50', '#16B1FF', '#FFC107'],
  legend: {
    position: 'bottom',
  },
  responsive: [
    {
      breakpoint: 480,
      options: {
        chart: {
          width: 300,
        },
        legend: {
          position: 'bottom',
        },
      },
    },
  ],
})
</script>

<template>
    <v-card class="pa-4" elevation="2">
        <v-card-title class="font-weight-bold">
          Warehouse Utilization
        </v-card-title>
    <v-card-text>
      <VueApexCharts
        type="donut"
        height="350"
        :options="chartOptions"
        :series="series"
      />
    </v-card-text>
    </v-card>
</template>
