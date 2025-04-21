<script setup>
import { ref } from 'vue';

const props = defineProps({
    data: {
        type: Array,
        default: () => [], // available, taken, reserved
    },
})

const series = ref([])

watch(() => props.data, (newVal) => {
    series.value = []
    if (newVal && Array.isArray(newVal)) {
        series.value.push({
            name: 'Materials',  
            data: newVal,           
        });
    }
}, { immediate: true });


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
      formatter: (val) => `${val} qty`,
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
      
    </v-card-text>
    <v-card-text class="d-flex justify-center align-center" >
        <v-progress-circular
            v-if="series.length === 0"
            color="primary"
            indeterminate
        ></v-progress-circular>
        <div v-else-if="series.every(val => val === 0)" class="text-center">
            <span class="text-subtitle-1 font-weight-medium text-grey-600">No blocks found</span>
        </div>
        <VueApexCharts v-else
            type="bar"
            height="350"
            width="450"
            :options="chartOptions"
            :series="series"
        />
    </v-card-text>
    </v-card>
</template>
