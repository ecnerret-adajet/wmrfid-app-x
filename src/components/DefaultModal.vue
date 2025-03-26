<script setup>
import { ref, watch } from 'vue';

const emit = defineEmits(['close', 'submit']);

const props = defineProps({
    show: {
        type: Boolean,
        default: false
    },
    dialogTitle: {
        type: String,
        default: ''
    },
});

const dialogVisible = ref(props.show);

watch(
  () => props.show,
  (newVal) => {
    dialogVisible.value = newVal;
  }
)

watch(
    () => dialogVisible.value,
    (newVal) => {
        if (!newVal) {
            emit('close')
        }
    }
)

</script>
<template>
    <v-dialog v-model="dialogVisible" max-width="1000px" min-height="400px">
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
            <div class="text-h5 text-bold-emphasis ps-2">
                {{ dialogTitle }}
            </div>
            <v-btn
                icon="ri-close-line"
                variant="text"
                @click="emit('close')"
            ></v-btn>
        </v-card-title>
  
        <v-card-text class="mt-4">
            <slot></slot>
        </v-card-text>
      </v-card>
    </v-dialog>
  </template>
  
 
  