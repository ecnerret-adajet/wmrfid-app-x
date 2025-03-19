<script setup>
import { VDialog, VProgressCircular } from 'vuetify/components';

const props = defineProps({
    show: {
        type: Boolean,
        default: false
    }
})

const isLoading = ref(false);

watch(
    () => props.show,
    (newVal) => {
        isLoading.value = newVal;
    }
);

</script>

<template>
    <VDialog v-model="isLoading" persistent max-width="none">
            <VCardTitle class="d-flex justify-center align-center">
            <VProgressCircular indeterminate color="primary" size="64" />
            </VCardTitle>
            <VCardText class="d-flex justify-center align-center">
            </VCardText>
    </VDialog>
</template>

<style scoped>

/* Full-page overlay style */
.v-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5); /* Semi-transparent background */
  z-index: 9999;
}

.v-dialog__content {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
  background-color: transparent !important;
}

.v-progress-circular {
  margin-top: 10px;
}

</style>
