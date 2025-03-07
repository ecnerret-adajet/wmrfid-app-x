<script setup>

const props = defineProps({
    type: {
        type: String,
        default: 'button'
    },
    loading: {
        type: Boolean,
        default: false
    }
})
</script>

<template>
    <v-btn color="primary" variant="elevated" :type="type" class="px-12" :loading="loading">
        <template v-slot:loader>
            <v-progress-circular indeterminate color="white" size="24" />
        </template>
        <slot></slot>
    </v-btn>
</template>
