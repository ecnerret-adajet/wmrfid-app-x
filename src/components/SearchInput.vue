<script setup>
import { VCardText, VTextField } from 'vuetify/components';

const search = ref('')

</script>
<template>
    <VCardText>
        <VTextField
            v-model="search"
            label="Search"
            placeholder="Search ..."
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
