<script setup>
import { ref, watch } from 'vue';

const emit = defineEmits(['update:nav'])

const value = ref(0)

// Watch for changes and emit to parent
watch(value, (newVal) => {
    emit('update:nav', newVal)
})

const handleNavChange = (val) => {
    value.value = val
}

</script>

<template>
    <v-bottom-navigation v-model="value" color="primary" active mode="shift" app fixed grow>
        <v-btn :value="0" @click="handleNavChange(0)">
            <v-icon icon="ri-exchange-line" size="30"></v-icon>
            <span>Quality Inspection</span>
        </v-btn>

        <v-btn :value="2" @click="handleNavChange(1)">
            <v-icon icon="ri-map-pin-line" size="30"></v-icon>
            <span>Warehouse Map</span>
        </v-btn>

        <v-btn :value="3" @click="handleNavChange(2)">
            <v-icon icon="ri-file-list-3-line" size="30"></v-icon>
            <span>Goods Movement</span>
        </v-btn>

    </v-bottom-navigation>
</template>
