<script setup>
// Use this component if date only is required
import Datepicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import moment from 'moment';
import { ref } from 'vue';

const props = defineProps({
    minDate: [Date, String, null],
    maxDate: [Date, String, null],
});

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

const onClear = () => {
    date.value = null;              // Clear internal date ref
    emit('update:modelValue', null); // Notify parent to clear bound model
    emit('cleared');                // Emit cleared event if needed
};

</script>
<template>
    <Datepicker v-model="date" :format="customDateFormat" auto-position="bottom" 
        :enable-time-picker="false" @cleared="onClear" :is-24="false" position="left"
        :min-date="minDate ? new Date(minDate) : null"
        :max-date="maxDate ? new Date(maxDate) : null"
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
