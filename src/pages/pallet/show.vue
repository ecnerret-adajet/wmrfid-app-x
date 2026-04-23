<template>
  <div class="pallet-info-page">
    <v-container
      fluid
      class="pa-4"
      style="max-width: 640px;"
    >
      <!-- App bar / header -->
      <div class="d-flex align-center justify-space-between mb-4">
        <div class="d-flex align-center">
          <v-icon
            icon="ri-qr-code-line"
            color="primary"
            size="28"
            class="me-2"
          />
          <span class="text-h6 font-weight-bold">Pallet Info</span>
        </div>

        <!-- QR Scanner trigger -->
        <IconBtn
          v-tooltip="'Scan QR Code'"
          @click="showScanner = true"
        >
          <VIcon icon="ri-qr-scan-2-line" />
        </IconBtn>
      </div>

      <QrScannerModal
        v-if="showScanner"
        @close="showScanner = false"
      />

      <!-- Loading state -->
      <v-card
        v-if="loading"
        elevation="2"
        rounded="lg"
      >
        <v-card-text class="d-flex flex-column align-center py-10">
          <v-progress-circular
            indeterminate
            color="primary"
            size="48"
          />
          <p class="text-body-2 text-medium-emphasis mt-4">
            Loading pallet information...
          </p>
        </v-card-text>
      </v-card>

      <!-- Error state -->
      <v-alert
        v-else-if="errorMessage"
        type="error"
        variant="tonal"
        rounded="lg"
        class="mb-4"
      >
        {{ errorMessage }}
      </v-alert>

      <!-- Data state -->
      <template v-else-if="pallet">
        <!-- Defective warning -->
        <v-alert
          v-if="pallet.is_defective"
          type="warning"
          variant="tonal"
          rounded="lg"
          class="mb-3"
          prepend-icon="ri-alert-line"
        >
          This pallet is marked as <strong>Defective</strong>.
        </v-alert>

        <!-- Weak signal warning -->
        <v-alert
          v-if="pallet.is_weak_signal"
          type="warning"
          variant="tonal"
          rounded="lg"
          class="mb-3"
          prepend-icon="ri-signal-wifi-error-line"
        >
          This pallet has a <strong>Weak Signal</strong>.
        </v-alert>

        <!-- Main info card -->
        <v-card
          elevation="2"
          rounded="lg"
        >
          <!-- Heading -->
          <v-card-title class="pa-4 pb-2">
            <div class="d-flex align-center justify-space-between flex-wrap gap-2">
              <span class="text-h5 font-weight-black text-primary">{{ pallet.physical_id }}</span>
              <!-- <v-chip
                :color="statusColor"
                variant="flat"
                size="small"
                class="text-uppercase font-weight-bold"
              >
                {{ pallet.status ?? 'Unknown' }}
              </v-chip> -->
            </div>
          </v-card-title>

          <v-divider />

          <!-- Detail rows -->
          <v-list density="compact" lines="two" class="py-0">
            <v-list-item>
              <template #prepend>
                <v-icon
                  icon="ri-barcode-line"
                  size="20"
                  class="me-3 text-medium-emphasis"
                />
              </template>
              <v-list-item-title class="text-caption text-medium-emphasis text-uppercase font-weight-bold">
                Pallet Code
              </v-list-item-title>
              <v-list-item-subtitle class="text-body-1 font-weight-medium">
                {{ pallet.pallet_code ?? '—' }}
              </v-list-item-subtitle>
            </v-list-item>

            <v-divider inset />

            <v-list-item>
              <template #prepend>
                <v-icon
                  icon="ri-building-line"
                  size="20"
                  class="me-3 text-medium-emphasis"
                />
              </template>
              <v-list-item-title class="text-caption text-medium-emphasis text-uppercase font-weight-bold">
                Plant
              </v-list-item-title>
              <v-list-item-subtitle class="text-body-1 font-weight-medium">
                {{ pallet.plant_code ?? '—' }}
              </v-list-item-subtitle>
            </v-list-item>

            <v-divider inset />

            <v-list-item>
              <template #prepend>
                <v-icon
                  icon="ri-map-pin-line"
                  size="20"
                  class="me-3 text-medium-emphasis"
                />
              </template>
              <v-list-item-title class="text-caption text-medium-emphasis text-uppercase font-weight-bold">
                Storage Location
              </v-list-item-title>
              <v-list-item-subtitle class="text-body-1 font-weight-medium">
                {{ pallet.sloc }} - {{ pallet.storage_location ?? '—' }}
              </v-list-item-subtitle>
            </v-list-item>

            <v-divider inset />

            <v-list-item>
              <template #prepend>
                <v-icon
                  icon="ri-time-line"
                  size="20"
                  class="me-3 text-medium-emphasis"
                />
              </template>
              <v-list-item-title class="text-caption text-medium-emphasis text-uppercase font-weight-bold">
                Last Loaded
              </v-list-item-title>
              <v-list-item-subtitle class="text-body-1 font-weight-medium">
                {{ formattedLastLoadedAt }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>

          <!-- QR Code image -->
          <template v-if="pallet.qr_code_url">
            <v-divider />
            <v-card-text class="d-flex flex-column align-center pa-4">
              <p class="text-caption text-medium-emphasis text-uppercase font-weight-bold mb-3">
                QR Code
              </p>
              <v-img
                :src="pallet.qr_code_url"
                width="200"
                height="200"
                contain
                rounded="lg"
              />
            </v-card-text>
          </template>
            <!-- Suggested Bin Location -->
            <v-divider />
            <v-card-text class="d-flex flex-column align-center pa-4">
              <v-chip
                color="primary"
                text-color="white"
                class="text-h5 font-weight-bold px-6 py-3 mb-0"
                size="large"
                variant="outlined"
              >
                Suggested Bin Location: F18-4
              </v-chip>
            </v-card-text>
        </v-card>
      </template>
    </v-container>
  </div>
</template>

<script setup>
import ApiService from '@/services/ApiService'
import Moment from 'moment'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import QrScannerModal from '@/components/QrScannerModal.vue'

const route = useRoute()

const loading = ref(true)
const pallet = ref(null)
const errorMessage = ref(null)
const showScanner = ref(false)

onMounted(async () => {
  await fetchPalletInfo()
})

async function fetchPalletInfo() {
  loading.value = true
  errorMessage.value = null
  pallet.value = null
  try {
    const physicalId = route.params.physicalId
    const res = await ApiService.query(`rfid/pallet/${encodeURIComponent(physicalId)}/info`, {})
    pallet.value = res.data.data
  } catch (err) {
    const status = err?.response?.status
    errorMessage.value = status === 404
      ? 'Pallet not found.'
      : 'Failed to load pallet information.'
  } finally {
    loading.value = false
  }
}

const statusColor = computed(() => {
  if (pallet.value?.status === 'active') return 'success'
  if (pallet.value?.status === 'inactive') return 'error'
  return 'default'
})

const formattedLastLoadedAt = computed(() => {
  if (!pallet.value?.last_loaded_at) return '—'
  return Moment(pallet.value.last_loaded_at).format('MMMM D, YYYY h:mm A')
})
</script>

<style scoped>
.pallet-info-page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  background-color: rgb(var(--v-theme-background));
}
</style>
