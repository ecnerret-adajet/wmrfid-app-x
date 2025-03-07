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
    closeBtnText: {
        type: String,
        default: 'Close'
    },
    submitBtnText: {
        type: String,
        default: 'Submit'
    }
});

const dialogVisible = ref(props.show);

// Close the dialog
const closeDialog = () => {
    dialogVisible.value = false;
};

const saveData = () => {
    emit('submit');
};

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
    <v-dialog v-model="dialogVisible" max-width="600px">
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
            <!-- This is where the form content will be injected via slot -->
            <slot></slot>
        </v-card-text>
  
        <!-- <v-card-actions class="mt-8">
            <v-btn color="secondary" variant="plain" @click="closeDialog" class="px-12">{{ closeBtnText }}</v-btn>
            <v-btn color="primary" variant="tonal" @click="saveData" class="px-12">{{ submitBtnText }}</v-btn>
        </v-card-actions> -->
      </v-card>
    </v-dialog>
  </template>
  
 
  