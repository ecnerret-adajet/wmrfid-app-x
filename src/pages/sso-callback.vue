<script setup>
import { useAuthStore } from '@/stores/auth';
import axios from 'axios';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const store = useAuthStore();
const route = useRoute();
const router = useRouter();
const showOverlay = ref(true);
const dialogVisible = ref(false)
const errorMessage = ref('Token is invalid or expired. Please try again.');

onMounted(async () => {
    dialogVisible.value = false;
    const email = route.query.email;
    const signature = route.query.signature;
    const expires = route.query.expires;

    try {
        const response = await axios.get(`sso-login`, {
            params: {
                email,
                signature,
                expires,
            },
        });
        store.setAuth(response.data);
        store.verifyAuth();
        router.push({ name: 'dashboard' });
    } catch (error) {
        if (error.response.data.success == false) {
            errorMessage.value = error.response.data.message || errorMessage.value;
            dialogVisible.value = true;
        }
    } finally {
        showOverlay.value = false; // Hide overlay when done, regardless of outcome
    }
});

function closeWindow() {
    window.close();
}

</script>
<template>
    <!-- The v-overlay will cover the whole page -->
    <v-overlay :model-value="showOverlay" class="align-center justify-center">
        <v-progress-circular color="primary" size="64" indeterminate></v-progress-circular>
    </v-overlay>
    <v-dialog v-model="dialogVisible" max-width="600px" persistent>
        <v-sheet class="pa-4 text-center mx-auto" elevation="12" max-width="600" rounded="lg" width="100%">
            <v-icon class="mb-5" color="error" icon="ri-error-warning-line" size="112"></v-icon>

            <h2 class="text-h5 mb-6">Login failed</h2>

            <p class="mb-4 text-medium-emphasis">
                {{ errorMessage }}
            </p>

            <v-divider class="mb-4"></v-divider>

            <div class="text-end">
                <v-btn class="text-none" color="primary" variant="flat" width="90" @click="closeWindow">
                    Close
                </v-btn>
            </div>
        </v-sheet>
    </v-dialog>
</template>
