<script setup>
// Use this component if date range is needed
import Datepicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import moment from 'moment';
import { ref } from 'vue';

const emit = defineEmits(['update:modelValue', 'cleared']);
const date = ref(null);

const customDateFormat = (dates) => {
    if (Array.isArray(dates) && dates.length === 2) {
        // Format both start and end date and join them with a hypen (-)
        const startDate = moment(dates[0]).format('MMMM D, YYYY');
        const endDate = moment(dates[1]).format('MMMM D, YYYY');
        return `${startDate} - ${endDate}`;
    } else if (dates) {
        // Format single date
        return moment(dates).format('MMMM D, YYYY');
    }
    return '';
};


watch(date, (newDate) => {
    if (Array.isArray(newDate) && newDate.length === 2) {
        const startDate = moment(newDate[0]).format('MMMM D, YYYY'); // Format the start date
        const endDate = moment(newDate[1]).format('MMMM D, YYYY'); // Format the end date
        emit('update:modelValue', [startDate, endDate]); 
    }
});

</script>
<template>
    <Datepicker v-model="date"  auto-position="top" :format="customDateFormat"
        @cleared="emit('cleared')" position="left" range :enable-time-picker="false"
    />
</template>
<style>
    .dp__menu {
        position: fixed !important;
    }
    .dp__input {
        color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity)) !important;
        background: rgb(var(--v-theme-surface));
    }
</style>
