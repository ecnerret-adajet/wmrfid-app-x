<template>
    <v-container fluid>
        <v-card class="pa-3 mb-2" elevation="1" rounded="lg">
  <div class="d-flex align-center justify-space-between">
    
    <div class="text-subtitle-2 font-weight-medium">
      Transfer Requests
    </div>

    <v-select
      v-model="selectedStatus"
      :items="statusOptions"
      label="Status"
      clearable
      density="compact"
      variant="outlined"
      hide-details
      style="max-width: 200px"
    />
    
  </div>
</v-card>
        <v-row>
            <v-col
                v-for="item in filteredItems"
                :key="item.transRequestId"
                cols="12"
            >
            <v-card class="pa-3" rounded="lg" elevation="2">

                <!-- Header -->
                <div class="d-flex justify-space-between align-center mb-2">
                <div class="text-subtitle-2 font-weight-bold">
                    {{ item.transRequestId }}
                </div>
                <v-chip
                    size="small"
                    :color="getStatusColor(item.status)"
                    dark
                >
                    {{ item.status }}
                </v-chip>
                </div>

                <!-- Body -->
                <div class="mb-2">
                <div class="font-weight-bold">{{ item.physicalId }}</div>
                <div v-if="item.batch" class="text-caption text-grey">
                    {{ item.batch }}
                </div>
                </div>

                <!-- TO Section -->
                <div v-if="item.toNumber" class="d-flex justify-space-between align-center">
                <div>
                    <div class="text-caption text-grey">TO Number</div>
                    <div class="font-weight-medium">{{ item.toNumber }}</div>
                </div>

                <v-chip
                    size="small"
                    :color="getStatusColor(item.toStatus)"
                    dark
                >
                    {{ item.toStatus }}
                </v-chip>
                </div>

                <!-- If no TO yet -->
                <div v-else class="d-flex justify-space-between align-center">
                <div class="text-caption text-grey">No TO yet</div>

                <v-chip
                    size="small"
                    :color="getStatusColor(item.toStatus)"
                    dark
                >
                    {{ item.toStatus }}
                </v-chip>
                </div>

            </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script setup>
import { computed, ref } from 'vue';

const headers = [
  { text: 'Trans Request ID', value: 'transRequestId' },
  { text: 'Physical ID', value: 'physicalId' },
  { text: 'Status', value: 'status' },
  { text: 'TO Number', value: 'toNumber' },
]

const statusOptions = ['Pending', 'For Putaway', 'Completed']
const selectedStatus = ref(null)

const items = ref([
  { transRequestId: 'TR-001', physicalId: '2513-17', batch: 'EHGPJK20', status: 'For Putaway', toStatus: 'Pending', toNumber: 'TO-001' },
  { transRequestId: 'TR-002', physicalId: '9934-18', batch: 'EHGPJK20', status: 'Completed', toStatus: 'Completed', toNumber: 'TO-002' },
  { transRequestId: 'TR-003', physicalId: '2245-18', batch: 'EHGPJK20', status: 'Pending', toStatus: 'Pending', toNumber: null },
  { transRequestId: 'TR-004', physicalId: '3321-18', batch: 'EHGPJK20', status: 'For Putaway', toStatus: 'Pending', toNumber: 'TO-003' },
  { transRequestId: 'TR-005', physicalId: '4442-26', batch: 'EHGPJK20', status: 'Completed', toStatus: 'Completed', toNumber: 'TO-004' },
  { transRequestId: 'TR-006', physicalId: '2342-25', batch: 'EHGPJK20', status: 'Pending', toStatus: 'Pending', toNumber: null },
  { transRequestId: 'TR-007', physicalId: '2345-25', batch: 'EHGPJK20', status: 'For Putaway', toStatus: 'Pending', toNumber: 'TO-005' },
])

const getStatusColor = (status) => {
  switch (status) {
    case 'Completed': return 'success'
    case 'For Putaway': return 'warning'
    case 'Pending': return 'orange'
    default: return 'grey'
  }
}

const filteredItems = computed(() => {
  if (!selectedStatus.value) return items.value
  return items.value.filter(item => item.status === selectedStatus.value)
})
</script>

<style scoped>
.pending-color {
    background-color: #2196F3; /* Blue for pending */
}
</style>
