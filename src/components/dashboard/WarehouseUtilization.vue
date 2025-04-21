<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
    series: {
        type: Array,
        default: () => [], // available, taken, reserved
    },
})

const series = ref(props.series); // default while loading

watch(() => props.series, (newVal) => {
    if (newVal && newVal.length === 2) {
        series.value = newVal;
    }
});


const chartOptions = ref({
  chart: {
    type: 'donut',
  },
//   labels: ['Available Space', 'Taken Space', 'Reserved Space'],
  labels: ['Available Space', 'Taken Space'],
//   colors: ['#4CAF50', '#16B1FF', '#FFC107'],
  colors: ['#4CAF50', '#16B1FF'],

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
        <v-card-text class="d-flex justify-center align-center" style="min-height: 100%;">
            <v-progress-circular
                v-if="series.length === 0"
                color="primary"
                indeterminate
            ></v-progress-circular>
            <div v-else-if="series.every(val => val === 0)" class="text-center">
                <span class="text-subtitle-1 font-weight-medium text-grey-600">No blocks found</span>
            </div>
            <VueApexCharts v-else
                type="donut"
                height="350"
                :options="chartOptions"
                :series="series"
            />
        </v-card-text>
    </v-card>
</template>
