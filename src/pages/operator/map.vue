<script setup>
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const storageLocation = route.params.location;

</script>

<template>
    <h1>Test</h1>
</template>
