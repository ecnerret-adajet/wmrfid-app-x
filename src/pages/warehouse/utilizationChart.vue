<script setup>
import { ref } from 'vue';

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
  labels: ['Available', 'Occupied', 'Reserved'],
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
            Storage Bin Allocation
        </v-card-title>
        <v-card-text
            class="d-flex justify-center align-center"
            style="min-height: 250px; flex-direction: column;"
        >
            <div v-if="series.every(val => val === 0)" class="text-center">
                <span class="text-subtitle-1 font-weight-medium text-grey-600">No blocks found</span>
            </div>
            <VueApexCharts v-else
                type="donut"
                height="300"
                :options="chartOptions"
                :series="series"
            />
        </v-card-text>
    </v-card>
</template>
