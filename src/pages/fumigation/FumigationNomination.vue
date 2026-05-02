
<template>
	<div v-if="navigation === 0">
		<FumigationDatatable :plant_code="plant_code" :sloc="sloc"/>
	</div>
	<div v-else-if="navigation === 1">
		<FumigationEntriesDataTable :plant_code="plant_code" :sloc="sloc"/>
	</div>
	<fumigation-bottom-navigation @update:nav="handleNavChange" />
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import FumigationBottomNavigation from './FumigationBottomNavigation.vue'
import FumigationDatatable from './FumigationDatatable.vue'
import FumigationEntriesDataTable from './FumigationEntriesDataTable.vue'

const route = useRoute()
const plant_code = computed(() => route.params.plant_code)
const sloc = computed(() => route.params.sloc)
const forklift = computed(() => route.params.forklift)

const navigation = ref(0)

const handleNavChange = (val) => {
    navigation.value = val
}
</script>
