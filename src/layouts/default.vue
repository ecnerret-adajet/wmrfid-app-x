<script setup>
import NominatePasswordModal from '@/components/NominatePasswordModal.vue';
import SessionExpiredModal from '@/components/SessionExpiredModal.vue';
import { useAuthStore } from '@/stores/auth';
import DefaultLayoutWithVerticalNav from './components/DefaultLayoutWithVerticalNav.vue';

const authStore = useAuthStore();

</script>

<template>
  <DefaultLayoutWithVerticalNav>
    <NominatePasswordModal :show="authStore.isPasswordModalVisible" />
    <SessionExpiredModal :show="authStore.isSessionExpiredModalVisible"/>
    <RouterView />
  </DefaultLayoutWithVerticalNav>
</template>

<style lang="scss">
// As we are using `layouts` plugin we need its styles to be imported
@use "@layouts/styles/default-layout";
</style>
