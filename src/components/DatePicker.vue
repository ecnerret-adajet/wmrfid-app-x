<script setup>
// Use this component if date only is required
import Datepicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import moment from 'moment';
import { ref } from 'vue';

const emit = defineEmits(['update:modelValue', 'cleared']);
const date = ref(null);

const customDateFormat = (dates) => {
    if (Array.isArray(dates)) {
        return dates.map(date => {
            // Format date using Moment.js (e.g., "March 3, 2025")
            return moment(date).format('MMMM D, YYYY');
        });
    } else {
        // Format date using Moment.js (e.g., "March 3, 2025")
        return moment(dates).format('MMMM D, YYYY');
    }
};

watch(date, (newDate) => {
    const formattedDate = moment(newDate).format('MMMM D, YYYY');
    emit('update:modelValue', formattedDate); 
});

</script>
<template>
    <Datepicker v-model="date" :format="customDateFormat" auto-position="top"  @cleared="emit('cleared')" :is-24="false" position="left"/>
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
