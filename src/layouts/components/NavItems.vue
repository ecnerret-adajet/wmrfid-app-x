<script setup>
import VerticalNavSectionTitle from '@/@layouts/components/VerticalNavSectionTitle.vue';
import VerticalNavLink from '@layouts/components/VerticalNavLink.vue';
</script>

<template>
    <VerticalNavLink :item="{ title: 'Dashboard', icon: 'ri-home-smile-line', to: '/dashboard'}"/>
    
    <!-- Warehouse Section  -->
    <VerticalNavSectionTitle :item="{ heading: 'Warehouse'}" />
    <VerticalNavLink :item="{ title: 'Invetory', icon: 'ri-stack-line', to: '/warehouse'}"/>
    <VerticalNavLink :item="{ title: 'Production Run', icon: 'ri-picture-in-picture-line', to: '/production-runs'}"/>
    <VerticalNavLink :item="{ title: 'Warehouse Map', icon: 'ri-route-line', to: '/warehouse'}"/>

    <!-- Shipments Section  -->
    <VerticalNavSectionTitle :item="{ heading: 'Shipments'}" />
    <VerticalNavLink :item="{ title: 'Deliveries', icon: 'ri-truck-line', to: '/warehouse'}"/>

    <!-- Stock Transfers Section  -->
    <VerticalNavSectionTitle :item="{ heading: 'Stock Transfers'}" />
    <VerticalNavLink :item="{ title: 'Purchase Orders', icon: 'ri-shopping-cart-line', to: '/warehouse'}"/>
   
    <!-- Master Data Section  -->
    <VerticalNavSectionTitle :item="{ heading: 'Master Data'}" />
    <VerticalNavLink :item="{ title: 'Materials', icon: 'ri-folder-open-line', to: '/materials'}"/>
    <VerticalNavLink :item="{ title: 'Batch Maintenance', icon: 'ri-home-gear-line', to: '/warehouse'}"/>
    <VerticalNavLink :item="{ title: 'Production Lines', icon: 'ri-database-line', to: '/production-lines'}"/>

    <!-- RFID Components Section  -->
    <VerticalNavSectionTitle :item="{ heading: 'RFID Components'}" />
    <VerticalNavLink :item="{ title: 'RFID Master', icon: 'ri-dashboard-2-line', to: '/warehouse'}"/>
    <VerticalNavLink :item="{ title: 'RFID Logs', icon: 'ri-file-text-line', to: '/warehouse'}"/>
    <VerticalNavLink :item="{ title: 'Readers', icon: 'ri-rfid-line', to: '/readers'}"/>

    <!-- Authentication Section  -->
    <VerticalNavSectionTitle :item="{ heading: 'Authentication'}" />
    <VerticalNavLink :item="{ title: 'Users', icon: 'ri-user-line', to: '/users'}"/>
    <VerticalNavLink :item="{ title: 'Roles', icon: 'ri-group-line', to: '/roles'}"/>
    <VerticalNavLink :item="{ title: 'Permissions', icon: 'ri-shield-user-line', to: '/permissions'}"/>

</template>
