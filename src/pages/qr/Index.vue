<template>
	<div v-if="navigation === 1">
		<QrPage :forklift="forklift" :plant_code="plant_code" :sloc="sloc" />
	</div>

	<qr-bottom-navigation @update:nav="handleNavChange" />
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import qrBottomNavigation from './qrBottomNavigation.vue'
import QrPage from './QrPage.vue'

const route = useRoute()
const plant_code = computed(() => route.params.plant_code)
const sloc = computed(() => route.params.sloc)
const forklift = computed(() => route.params.forklift)

const dummyData = [
	{ id: 1, label: 'Putaway Task #1' },
	{ id: 2, label: 'Putaway Task #2' },
	{ id: 3, label: 'Putaway Task #3' },
]

const navigation = ref(1)

const handleNavChange = (val) => {
    navigation.value = val
}
</script>
