<script setup>
import { useRoute } from 'vue-router';
import { VIcon } from 'vuetify/components';

const route = useRoute();

</script>
<template>
    <div class="d-flex align-center">
        
        <v-breadcrumbs v-if="route.meta.breadcrumbs.length > 0">
            <v-breadcrumbs-item 
                class="fs-5"
                v-for="(breadcrumb, index) in route.meta.breadcrumbs"
                :key="index"
                :to="breadcrumb.to"
                :class="{ 'font-weight-bold': route.path === breadcrumb.link }"
            >
            <router-link to="/" class="breadcrumb-link">
                <v-icon v-if="route.meta.breadcrumbs.length == 1" icon="ri-home-4-line" class="fs-4 "></v-icon>
            </router-link>
            
            <router-link :to="breadcrumb.link" class="breadcrumb-link">
                <v-icon icon="ri-arrow-right-s-line" class="fs-4 clickable-icon"></v-icon>
                    {{ breadcrumb.label }}
            </router-link>
            
            </v-breadcrumbs-item>
        </v-breadcrumbs>
    </div>
</template>

<style scoped>
.v-icon--size-default {
    font-size: 
    1.5rem !important;
}

.breadcrumb-link {
    color: rgb(105, 104, 104, 0.8); 
    text-decoration: none; 
    transition: color 0.3s ease;
}

.breadcrumb-link:hover {
    color: black; 
}

.breadcrumb-link.router-link-exact-active {
    color: rgb(39, 35, 35, 0.9);
    font-weight: bold;
}
</style>
