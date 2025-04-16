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
                    <v-icon icon="ri-home-4-line" class="fs-4" color="grey-700"></v-icon>
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
                <router-link :to="breadcrumb.link" class="breadcrumb-link text-grey-700">
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

/* .breadcrumb-link {
    text-decoration: none !important; 
    transition: color 0.3s ease;
}

.breadcrumb-link:hover {
    text-decoration: none !important; 
}

.breadcrumb-link.router-link-exact-active {
    font-weight: bold;
}  */
</style>
