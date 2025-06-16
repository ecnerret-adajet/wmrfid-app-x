<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const emit = defineEmits(['close'])

const props = defineProps({
    show: {
        type: Boolean,
        default: false
    },
});

const dialogVisible = ref(props.show);
const router = useRouter();
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
    <v-dialog v-model="dialogVisible" max-width="600px" persistent>

        <v-sheet class="pa-4 text-center mx-auto" elevation="12" max-width="600" rounded="lg" width="100%">
            <v-icon class="mb-5" color="error" icon="ri-error-warning-line" size="112"></v-icon>

            <h2 class="text-h5 mb-6">Unauthorized Request</h2>

            <p class="mb-4 text-medium-emphasis text-body-2">
                You don't have permission to access this page. Please contact administrator
            </p>

            <v-divider class="mb-4"></v-divider>

            <div class="text-end">
                <v-btn class="text-none" color="primary" variant="flat" width="90" @click="emit('close')">
                    Got it
                </v-btn>
            </div>
        </v-sheet>
    </v-dialog>
</template>
