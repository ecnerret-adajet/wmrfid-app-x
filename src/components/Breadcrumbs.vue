<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

// Compute breadcrumbs dynamically (handle function in meta)
const breadcrumbs = computed(() => {
    return typeof route.meta.breadcrumbs === 'function' 
        ? route.meta.breadcrumbs(route) 
        : route.meta.breadcrumbs || [];
});
</script>

<template>
    <div class="d-flex align-center">
        <v-breadcrumbs v-if="breadcrumbs.length > 0">
            <!-- Home breadcrumb -->
            <v-breadcrumbs-item>
                <router-link to="/" class="breadcrumb-link">
                    <v-icon icon="ri-home-4-line" class="fs-4"></v-icon>
                </router-link>
            </v-breadcrumbs-item>

            <!-- Dynamic Breadcrumbs -->
            <v-breadcrumbs-item 
                v-for="(breadcrumb, index) in breadcrumbs"
                :key="index"
                :to="breadcrumb.link"
                :class="{ 'font-weight-bold': route.path === breadcrumb.link }"
            >
                <v-icon icon="ri-arrow-right-s-line" class="fs-4"></v-icon>
                <router-link :to="breadcrumb.link" class="breadcrumb-link">
                    {{ breadcrumb.label }}
                </router-link>
            </v-breadcrumbs-item>
        </v-breadcrumbs>
    </div>
</template>

<style scoped>
.v-icon--size-default {
    font-size: 1.5rem !important;
}

.breadcrumb-link {
    color: rgba(105, 104, 104, 0.8); 
    text-decoration: none !important; 
    transition: color 0.3s ease;
}

.breadcrumb-link:hover {
    color: rgb(100, 99, 99); 
    text-decoration: none !important; 
}

.breadcrumb-link.router-link-exact-active {
    color: rgba(39, 35, 35, 0.9);
    font-weight: bold;
}
</style>
