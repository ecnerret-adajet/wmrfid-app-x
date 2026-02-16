<script setup>
import { watch } from 'vue';
import { VCardText, VTextField } from 'vuetify/components';

const emits = defineEmits(['update:search']);

const props = defineProps({
    placeholder: {
        type: String,
        default: 'Search ...'
    },
});


const search = ref('')

watch(search, (newValue) => {
    emits('update:search', newValue);
});

</script>
<template>
    <VCardText>
        <VTextField
            v-model="search"
            persistent-placeholder
            :placeholder="placeholder"
            append-inner-icon="ri-search-line"
            single-line
            hide-details
            density="compact"
            class="custom-text-field"
        />
    </VCardText>
</template>

<style scoped>
    .v-card-text {
        padding-top: 1rem !important;
        padding-bottom: 1rem !important;
        padding-left: 0rem !important;
        padding-right: 0rem !important;
    }
</style>
