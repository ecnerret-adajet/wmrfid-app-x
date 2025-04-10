<script setup>

const props = defineProps({
    type: {
        type: String,
        default: 'button'
    },
    loading: {
        type: Boolean,
        default: false
    },
    color: {
        type: String,
        default: 'primary'
    },
    block: {
        type: Boolean,
        default: false
    },
})
</script>

<template>
    <v-btn :color="color" variant="elevated" :block="block" :type="type" class="px-12" :loading="loading">
        <template v-slot:loader>
            <v-progress-circular indeterminate color="white" size="24" />
        </template>
        <slot></slot>
    </v-btn>
</template>
