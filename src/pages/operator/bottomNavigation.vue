<script setup>
import { ref, watch } from 'vue';

const emit = defineEmits(['update:nav'])

const value = ref(1)

// Watch for changes and emit to parent
watch(value, (newVal) => {
    emit('update:nav', newVal)
})

const handleNavChange = (val) => {
    value.value = val
}

</script>

<template>
    <v-layout class="overflow-visible" style="height: 10px;">
        <div>
            <v-bottom-navigation v-model="value" color="primary" active mode="shift" app fixed grow>
                <v-btn :value="0" @click="handleNavChange(0)">
                    <v-icon icon="ri-box-3-line" size="30"></v-icon>
                    <span>Movement</span>
                </v-btn>

                <v-btn :value="1" @click="handleNavChange(1)">
                    <v-icon icon="ri-map-pin-line" size="30"></v-icon>
                    <span>Warehouse Map</span>
                </v-btn>
                <v-btn>
                    <v-icon icon="ri-logout-box-line" size="30"></v-icon>
                    <span>Logout</span>
                </v-btn>
            </v-bottom-navigation>
        </div>
    </v-layout>
</template>
