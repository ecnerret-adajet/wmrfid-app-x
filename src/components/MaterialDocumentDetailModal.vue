<template>
  <v-dialog v-model="dialog" max-width="1200" scrollable>
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center pa-4">
        <span class="text-h5 font-weight-bold text-primary">
          <template v-if="detail">
            {{ detail.type }} {{ detail.movement_type }} Material Document: {{ detail.material_document }}
          </template>
          <template v-else>Material Document</template>
        </span>
        <v-btn icon="ri-close-line" variant="text" size="small" @click="close" />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-4">
        <!-- Loading -->
        <div v-if="loading" class="d-flex justify-center my-8">
          <v-progress-circular indeterminate color="primary" size="56" />
        </div>

        <!-- Request failed -->
        <v-alert v-else-if="errorMessage" type="error" variant="tonal" density="compact">
          {{ errorMessage }}
        </v-alert>

        <template v-else-if="detail">
          <!-- SAP returned errors -->
          <v-alert
            v-if="detail.status === 'E'"
            type="error"
            variant="tonal"
            density="compact"
            class="mb-4"
          >
            <ul class="mb-0">
              <li v-for="(error, e) in detail.errors" :key="e">{{ error.MESSAGE }}</li>
            </ul>
          </v-alert>

          <template v-if="detail.header">
            <!-- General -->
            <h5 class="text-h5 mb-4">General</h5>
            <v-row dense>
              <v-col v-for="field in generalFields" :key="field.label" cols="12" md="4">
                <v-text-field
                  :label="field.label"
                  :model-value="field.value || ''"
                  variant="outlined"
                  density="compact"
                  readonly
                  hide-details
                />
              </v-col>
            </v-row>

            <!-- Items -->
            <VDataTable
              :headers="itemHeaders"
              :items="detail.items"
              :items-per-page="-1"
              item-value="line"
              class="text-no-wrap mt-6"
              density="compact"
              hide-default-footer
            >
              <template #item.material="{ item }">
                <div>
                  <span class="font-weight-bold">{{ item.material }}</span>
                  <br />
                  <span class="text-caption">{{ item.material_description }}</span>
                </div>
              </template>

              <template #item.plant="{ item }">
                <span>{{ item.plant }} {{ item.plant_description }}</span>
              </template>

              <template #item.sloc="{ item }">
                <span>{{ item.sloc }} {{ item.sloc_description }}</span>
              </template>
            </VDataTable>
          </template>
        </template>
      </v-card-text>

      <v-card-actions class="px-4 pb-4 justify-end">
        <v-btn color="secondary" variant="outlined" size="small" @click="close">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import ApiService from '@/services/ApiService'
import { computed, ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  // Local StockTransfer id (BU 315 or ALC 917) — the API resolves matdoc/year/server from it
  stockTransferId: {
    type: [Number, String],
    default: null,
  },
})

const emit = defineEmits(['update:modelValue'])

const dialog = ref(false)
const loading = ref(false)
const detail = ref(null)
const errorMessage = ref('')

const itemHeaders = [
  { title: 'Line', key: 'line', sortable: false },
  { title: 'Material', key: 'material', sortable: false },
  { title: 'Purchase Order', key: 'po_number', sortable: false },
  { title: 'Item', key: 'po_item', sortable: false },
  { title: 'Ref. Doc.', key: 'ref_doc', sortable: false },
  { title: 'Quantity', key: 'quantity', align: 'end', sortable: false },
  { title: 'Base Unit', key: 'uom', align: 'center', sortable: false },
  { title: 'Text', key: 'item_text', sortable: false },
  { title: 'Plant', key: 'plant', sortable: false },
  { title: 'Storage Location', key: 'sloc', sortable: false },
  { title: 'Batch', key: 'batch', sortable: false },
  { title: 'Movement Type', key: 'movement_type', align: 'center', sortable: false },
]

const generalFields = computed(() => {
  const header = detail.value?.header || {}
  return [
    { label: 'Material Document', value: header.MAT_DOC },
    { label: 'Entry Date', value: header.ENTRY_DATE },
    { label: 'Document Date', value: header.DOC_DATE },
    { label: 'Posting Date', value: header.PSTNG_DATE },
    { label: 'Header Text', value: header.HEADER_TXT },
    { label: 'GR/GI Slip No.', value: detail.value?.gr_gi_slip_number },
    { label: 'Vendor', value: detail.value?.items?.[0]?.vendor },
    { label: 'Username', value: header.USERNAME },
  ]
})

// Sync v-model; refetch on every open so a previous document never shows stale
watch(() => props.modelValue, (val) => {
  dialog.value = val
  if (val && props.stockTransferId) {
    fetchDetail()
  } else if (!val) {
    detail.value = null
    errorMessage.value = ''
  }
}, { immediate: true })

watch(dialog, (val) => {
  if (!val) emit('update:modelValue', false)
})

async function fetchDetail() {
  loading.value = true
  detail.value = null
  errorMessage.value = ''
  try {
    const { data } = await ApiService.get('stock-transfer-receiving-material-document', String(props.stockTransferId))
    detail.value = data.data
  } catch (err) {
    errorMessage.value = err?.response?.data?.message || 'Failed to load material document.'
  } finally {
    loading.value = false
  }
}

function close() {
  dialog.value = false
}
</script>
