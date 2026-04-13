<script setup>
import NavItems from '@/layouts/components/NavItems.vue'
import alc_logo from '@images/alc.png'
import VerticalNavLayout from '@layouts/components/VerticalNavLayout.vue'

// Components
import Breadcrumbs from '@/components/Breadcrumbs.vue'
import QrScannerModal from '@/components/QrScannerModal.vue'
import Footer from '@/layouts/components/Footer.vue'
import NavbarThemeSwitcher from '@/layouts/components/NavbarThemeSwitcher.vue'
import UserProfile from '@/layouts/components/UserProfile.vue'
import { ref } from 'vue'

const showScanner = ref(false)

</script>

<template>
  <VerticalNavLayout>
    <!-- 👉 navbar -->
    <template #navbar="{ toggleVerticalOverlayNavActive }">
      <div class="d-flex h-100 align-center">
        <!-- 👉 Vertical nav toggle in overlay mode -->
        <IconBtn
          class="ms-n3 d-lg-none"
          @click="toggleVerticalOverlayNavActive(true)"
        >
          <VIcon icon="ri-menu-line" />
        </IconBtn>

        <Breadcrumbs />

        <VSpacer />

        <!-- QR Scanner trigger -->
        <IconBtn
          v-tooltip="'Scan QR Code'"
          class="me-1"
          @click="showScanner = true"
        >
          <VIcon icon="ri-qr-scan-2-line" />
        </IconBtn>

        <QrScannerModal
          v-if="showScanner"
          @close="showScanner = false"
        />

        <IconBtn>
          <VIcon icon="ri-notification-line" />
        </IconBtn>

        <NavbarThemeSwitcher class="me-2" />

        <UserProfile />
      </div>
    </template>

    <template #vertical-nav-header="{ toggleIsOverlayNavActive }">
      <RouterLink
        to="/"
        class="app-logo app-title-wrapper"
      >
        <!-- eslint-disable vue/no-v-html -->
        <!-- <div
          class="d-flex"
          v-html="logo"
        /> -->
        <img class="mx-auto" :src="alc_logo" alt="" srcset="" width="190">
        <!-- eslint-enable -->
      </RouterLink>

      <IconBtn
        class="d-block d-lg-none"
        @click="toggleIsOverlayNavActive(false)"
      >
        <VIcon icon="ri-close-line" />
      </IconBtn>
    </template>

    <template #vertical-nav-content>
      <NavItems />
    </template>

    <!-- 👉 Pages -->
    <slot />

    <!-- 👉 Footer -->
    <template #footer>
      <Footer />
    </template>
  </VerticalNavLayout>
</template>

<style lang="scss" scoped>
.meta-key {
  border: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 6px;
  block-size: 1.5625rem;
  line-height: 1.3125rem;
  padding-block: 0.125rem;
  padding-inline: 0.25rem;
}

.app-logo {
  display: flex;
  align-items: center;
  column-gap: 0.75rem;

  .app-logo-title {
    font-size: 1.25rem;
    font-weight: 500;
    line-height: 1.75rem;
    text-transform: uppercase;
  }
}
</style>
