<script setup>
import { useAuthStore } from '@/stores/auth';
import { computed, ref, watchEffect } from 'vue';
import { useRouter } from 'vue-router';
import bottomNavigation from './bottomNavigation.vue';
import movementOperator from './movementOperator.vue';
import warehouseOperator from './warehouseOperator.vue';

const store = useAuthStore();
const router = useRouter();

const navigation = ref(1)

const handleNavChange = (val) => {
    if (val === 2) {
        handleLogoutClick();
        return;
    }
    navigation.value = val
}

const showLogoutDialog = ref(false)

const handleLogoutClick = () => {
    showLogoutDialog.value = true
}

const confirmLogout = () => {
    // Your logout logic here
    showLogoutDialog.value = false

    store.logout();
    router.push({ name: 'login' });
}

watchEffect(() => {
    if (!store.user || !store.user.id) {
        store.logout();
        router.push({ name: 'login' });
    }
});

// Get assigned plant_code and default_storage_location.slug
const plant = computed(() => store.user?.assigned_plant || null);
const storageLocation = computed(() => store.user?.assigned_plant?.default_storage_location || null);

</script>

<template>
    <div v-if="plant && storageLocation" class="mx-4">
        <movementOperator :plant="plant" :storage-location="storageLocation" v-if="navigation === 0" />
        <warehouseOperator :plant="plant" :storage-location="storageLocation" v-if="navigation === 1" />
    </div>
    <bottom-navigation @update:nav="handleNavChange" />

    <v-dialog v-model="showLogoutDialog" max-width="500">
        <v-card class="py-4 px-2">
            <v-card-title class="text-h6">Confirm Logout</v-card-title>
            <v-card-text>Are you sure you want to logout?</v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn color="primary" variant="text" @click="showLogoutDialog = false">Cancel</v-btn>
                <v-btn color="error" variant="flat" @click="confirmLogout">Logout</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>
