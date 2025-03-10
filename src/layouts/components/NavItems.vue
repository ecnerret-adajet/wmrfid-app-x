<script setup>
import VerticalNavSectionTitle from '@/@layouts/components/VerticalNavSectionTitle.vue';
import VerticalNavLink from '@layouts/components/VerticalNavLink.vue';
</script>

<template>
    <VerticalNavLink :item="{ title: 'Dashboard', icon: 'ri-home-smile-line', to: '/dashboard'}"/>
    
    <!-- Warehouse Section  -->
    <VerticalNavSectionTitle :item="{ heading: 'Warehouse'}" />
    <VerticalNavLink :item="{ title: 'Invetory', icon: 'ri-home-smile-line', to: '/warehouse'}"/>
    <VerticalNavLink :item="{ title: 'Production Run', icon: 'ri-home-smile-line', to: '/warehouse'}"/>
    <VerticalNavLink :item="{ title: 'Warehouse Map', icon: 'ri-home-smile-line', to: '/warehouse'}"/>

    <!-- Shipments Section  -->
    <VerticalNavSectionTitle :item="{ heading: 'Shipments'}" />
    <VerticalNavLink :item="{ title: 'Deliveries', icon: 'ri-home-smile-line', to: '/warehouse'}"/>

    <!-- Stock Transfers Section  -->
    <VerticalNavSectionTitle :item="{ heading: 'Stock Transfers'}" />
    <VerticalNavLink :item="{ title: 'Purchase Orders', icon: 'ri-home-smile-line', to: '/warehouse'}"/>

    <!-- Master Data Section  -->
    <VerticalNavSectionTitle :item="{ heading: 'Master Data'}" />
    <VerticalNavLink :item="{ title: 'Materials', icon: 'ri-home-smile-line', to: '/warehouse'}"/>
    <VerticalNavLink :item="{ title: 'Batch Maintenance', icon: 'ri-home-smile-line', to: '/warehouse'}"/>

    <!-- RFID Components Section  -->
    <VerticalNavSectionTitle :item="{ heading: 'RFID Components'}" />
    <VerticalNavLink :item="{ title: 'RFID Master', icon: 'ri-home-smile-line', to: '/warehouse'}"/>
    <VerticalNavLink :item="{ title: 'RFID Logs', icon: 'ri-home-smile-line', to: '/warehouse'}"/>
    <VerticalNavLink :item="{ title: 'Readers', icon: 'ri-home-smile-line', to: '/readers'}"/>

    <!-- Authentication Section  -->
    <VerticalNavSectionTitle :item="{ heading: 'Authentication'}" />
    <VerticalNavLink :item="{ title: 'Users', icon: 'ri-home-smile-line', to: '/users'}"/>
    <VerticalNavLink :item="{ title: 'Roles', icon: 'ri-home-smile-line', to: '/warehouse'}"/>
    <VerticalNavLink :item="{ title: 'Permissions', icon: 'ri-home-smile-line', to: '/warehouse'}"/>

</template>
