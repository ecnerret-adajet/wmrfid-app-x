
<template>
	<div v-if="navigation === 0">
		<QcDatatable :plant_code="plant_code" :sloc="sloc"/>
	</div>
	<div v-else-if="navigation === 1">
		<WarehouseBin :plant_code="plant_code" :sloc="sloc"/>
	</div>
	<div v-else-if="navigation === 2">
		<QcGoodMovementDatatable :plant_code="plant_code" :sloc="sloc"/>
	</div>
	<qr-bottom-navigation @update:nav="handleNavChange" />
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import QcDatatable from './QcDatatable.vue'
import qrBottomNavigation from './qrBottomNavigation.vue'
import WarehouseBin from './WarehouseBin.vue'
import QcGoodMovementDatatable from './QcGoodMovementDatatable.vue'

const route = useRoute()
const plant_code = computed(() => route.params.plant_code)
const sloc = computed(() => route.params.sloc)
const forklift = computed(() => route.params.forklift)

const navigation = ref(0)

const handleNavChange = (val) => {
    navigation.value = val
}
</script>
