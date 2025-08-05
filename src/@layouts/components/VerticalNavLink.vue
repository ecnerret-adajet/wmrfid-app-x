<script setup>
import { useRoute } from 'vue-router'

const props = defineProps({
  item: {
    type: null,
    required: true,
  },
})

const route = useRoute()

// TODO:: Fix if rfid-monitoring
const isActive = computed(() => {
    if (!props.item.to) return false

    // Normalize route and current path for comparison
    const baseRoute = props.item.to.toString().replace(/\/$/, '')
    const currentRoute = route.path.toString().replace(/\/$/, '')
    if (currentRoute === '/rfid-monitoring') {
        return currentRoute === baseRoute 
    } else {
        return currentRoute.startsWith(baseRoute)
    }
  
})
</script>

<template>
    <li class="nav-link" :class="{ disabled: item.disable }">
        <Component
            :is="item.to ? 'RouterLink' : 'a'"
            :to="item.to"
            :href="item.href"
            :target="item.target"
            :class="{
                'router-link-active router-link-exact-active': isActive
            }"
        >
            <VIcon
                :icon="item.icon || 'ri-checkbox-blank-circle-line'"
                class="nav-item-icon"
            />
            <!-- 👉 Title -->
            <span class="nav-item-title">
                {{ item.title }}
            </span>
            <span
                class="nav-item-badge"
                :class="item.badgeClass"
            >
                {{ item.badgeContent }}
            </span>
        </Component>
    </li>
</template>

<style lang="scss">
.layout-vertical-nav {
  .nav-link a {
    display: flex;
    align-items: center;
    cursor: pointer;
  }
}
</style>
