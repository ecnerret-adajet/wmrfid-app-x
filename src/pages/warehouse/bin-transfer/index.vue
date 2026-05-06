<template>
    <div class="pa-8">
        <h4 class="text-h5 font-weight-bold mb-2">Plant : <span class="font-bold text-primary">{{storageLocation?.plant?.plant_code}} - {{ storageLocation?.plant?.name }}</span></h4>
        <h4 class="text-h5 font-weight-bold mb-2">Storage Location : <span class="font-bold text-primary">{{storageLocation?.code}} - {{ storageLocation?.name }}</span></h4>
        <h4 class="text-h5 font-weight-bold mb-2">Warehouse # : <span class="font-bold text-primary">{{ storageLocation?.warehouse_number }}</span></h4>
        <div class="d-flex gap-4 align-center justify-center mb-2">
            <VTextField v-model="searchValue" label="Search" placeholder="Search bin" append-inner-icon="ri-search-line"
                single-line hide-details density="compact" class="flex-grow-1" />

            <!-- <v-autocomplete
                style="max-width: 300px;"
                class="flex-grow-1 align-center"
                label="Filter by Lot"
                density="compact"
                :items="lotOptions"
                v-model="filters.lot_id"
                item-title="label"
                item-value="id"
                :rules="[value => value !== undefined || 'Please select an item from the list']"
                clearable
            /> -->
            <!-- <v-select style="max-width: 300px;" class="flex-grow-1 align-center" label="Filter by Availability"
                clearable
                density="compact" :items="availabilityOptions" v-model="filters.availability"
                :rules="[value => value !== undefined || 'Please select an item from the list']">
            </v-select> -->
            <v-btn class="d-flex align-center" color="info" prepend-icon="ri-add-line" @click="showModal = true">
                <template #prepend>
                    <v-icon color="white"></v-icon>
                </template>
                Create Transfer Request
            </v-btn>
            <v-btn class="d-flex align-center" prepend-icon="ri-search-eye-line" @click="handleSearch">
                <template #prepend>
                    <v-icon color="white"></v-icon>
                </template>
                Search
            </v-btn>
        </div>
        <VCard>
            <VDataTableServer
                :headers="headers"
                :items="serverItems"
                :items-length="totalItems"
                :loading="pageLoading"
                :items-per-page="itemsPerPage"
                :page="page"
                class="text-no-wrap"
                @update:options="loadItems"
                item-value="id"
            >
                <template #item.transfer_request_id="{ item }">
                    <span>{{ item.transfer_request_id }}</span><br />
                    <span v-if="item.transfer_request" class="text-subtitle-1">
                      {{ item.transfer_request ? moment(item.transfer_request.created_at).format('MMM D, YYYY h:mm A') : '-' }}
                    </span>
                </template>

                <template #item.transfer_order_id="{ item }">
                    <div v-if="item.transfer_request?.transfer_order">
                      <span>{{ item.transfer_request?.transfer_order?.transfer_order_id }}</span><br />
                      <span v-if="item.transfer_request?.transfer_order" class="text-subtitle-1">
                        {{ item.transfer_request?.transfer_order ? moment(item.transfer_request?.transfer_order.created_at).format('MMM D, YYYY h:mm A') : '-' }}
                      </span>
                    </div>
                    <div v-else>
                      <v-chip color="warning" size="small" dark>Pending TO</v-chip>
                    </div>
                </template>

                <template #item.block="{ item }">
                    {{ item.lot?.label}}-{{item.label }}
                </template>
                <template #item.lot="{ item }">
                    {{ item.lot?.label }}
                </template>

                <template #item.status="{ item }">
                    <v-chip v-if="item.status === 1 || item.status === '1'" size="small" dark color="warning">
                        Pending
                    </v-chip>
                    <v-chip v-else-if="item.status === 2 || item.status === '2'" size="small" dark color="success">
                        Approved
                    </v-chip>
                </template>

                <template #item.from_location="{ item }">
                    <span>{{ item.from_block?.lot?.label }}-{{ item.from_block?.label }}</span><br />
                    <span v-if="item.from_block" class="text-subtitle-1">
                      Layer {{ item.from_layer_position ?? '-'}}
                    </span>
                </template>
              
                <template #item.to_location="{ item }">
                    <span>{{ item.to_block?.lot?.label }}-{{ item.to_block?.label }}</span><br />
                    <span v-if="item.to_block" class="text-subtitle-1">
                      Layer {{ item.to_layer_position ?? '-'}}
                    </span>
                </template>

                <template #item.actions="{ item }">
                    <v-btn v-if="item.status === 1 || item.status === '1'" icon="ri-file-check-line" size="30" @click="approveRequest(item)" color="primary"></v-btn>
                </template>
            </VDataTableServer>
        </VCard>

        <v-dialog v-model="showModal" max-width="520">
          <v-card>
            
            <!-- Header -->
            <v-card-title class="text-h6 font-weight-medium">
              Transfer Pallet
            </v-card-title>

            <v-card-subtitle class="text-body-2 text-medium-emphasis">
              Move pallet from one bin to another empty bin
            </v-card-subtitle>

            <v-divider />

            <v-card-text class="py-6">

              <!-- FROM -->
              <div class="mb-2">
                <div class="text-caption text-medium-emphasis">FROM</div>

                <v-sheet class="pa-4 rounded-lg" color="grey-lighten-4">
                  <v-select
                    v-model="selectedSection"
                    :items="sectionsData"
                    label="Select Section"
                    item-title="label"
                    item-value="value"
                    variant="outlined"
                    density="comfortable"
                    class="mb-3"
                  />

                  <v-select
                    v-model="selectedBin"
                    :items="bins"
                    label="Select Bin"
                    item-title="label"
                    item-value="value"
                    :disabled="!selectedSection"
                    variant="outlined"
                    density="comfortable"
                    class="mb-3"
                  />

                  <v-select
                      v-model="selectedLayer"
                      :items="layers"
                      label="Select Layer"
                      item-title="label"
                      item-value="value"
                      :disabled="!selectedBin"
                      variant="outlined"
                      density="comfortable"
                  >
                      <!-- Custom dropdown item -->
                      <template v-slot:item="{ props: itemProps, item }">
                        <v-list-item v-bind="itemProps" :disabled="!item.raw.is_occupied">
                          
                          <template #title>
                            <div class="d-flex align-center justify-space-between w-100">
                              
                              <div>
                                <div class="font-weight-medium">
                                  Layer {{ item.raw.value }}
                                </div>

                                <div
                                  :class="item.raw.is_occupied ? 'text-success' : 'text-error'"
                                >
                                  {{ item.raw.is_occupied ? 'Occupied' : 'Available' }}
                                  <span v-if="item.raw.is_occupied">
                                    ({{ item.raw.assigned_inventory?.batch ?? '-' }})
                                  </span>
                                </div>

                                <div v-if="item.raw.is_occupied" >
                                  {{ item.raw.assigned_inventory?.physical_id ?? '-' }}
                                </div>
                              </div>

                              <!-- status dot -->
                              <!-- <v-icon
                                color="red"
                                icon="ri-circle-line"
                                size="18"
                              >
                              </v-icon> -->

                            </div>
                          </template>

                        </v-list-item>
                      </template>
                  </v-select>

                </v-sheet>
              </div>

              <!-- ARROW -->
              <div class="text-center">
                    <v-icon icon="ri-arrow-down-circle-line" size="34"/>
              </div>

              <!-- TO -->
              <div>
                <div class="text-caption text-medium-emphasis">TO</div>

                <v-sheet class="pa-4 rounded-lg" color="grey-lighten-4">
                    <v-select
                        v-model="destinationSection"
                        :items="destinationSections"
                        label="Select Destination Section"
                        item-title="label"
                        item-value="value"
                        variant="outlined"
                        density="comfortable"
                        class="mb-3"
                    />

                    <v-select
                        v-model="destinationBin"
                        :items="destinationBins"
                        label="Select Destination Bin"
                        item-title="label"
                        item-value="value"
                        :disabled="!destinationSection"
                        variant="outlined"
                        density="comfortable"
                        class="mb-3"
                    />

                    <v-select
                      v-model="destinationLayer"
                      :items="(destinationBins.find(b => b.id === destinationBin || b.value === destinationBin)?.layers || []).map(l => ({
                        label: l.layer_name,
                        value: l.layer_position,
                        ...l
                      }))"
                      label="Select Destination Layer"
                      item-title="label"
                      item-value="value"
                      :disabled="!destinationBin"
                      variant="outlined"
                      density="comfortable"
                    >
                      <template v-slot:item="{ props: itemProps, item }">
                        <v-list-item v-bind="itemProps" :disabled="!!item.raw.assigned_inventory || !!item.raw.transfer_order">
                          
                          <template #title>
                            <div class="d-flex align-center justify-space-between w-100">

                              <div>

                                <!-- Layer title -->
                                <div class="font-weight-medium">
                                  Layer {{ item.raw.layer_position }}
                                </div>

                                <!-- STATUS LINE -->
                                <div
                                  v-if="item.raw.assigned_inventory"
                                  class="text-error"
                                >
                                  Occupied ({{ item.raw.assigned_inventory?.batch ?? '-' }})
                                </div>

                                <div
                                  v-else-if="item.raw.transfer_order"
                                  class="text-warning"
                                >
                                  Reserved ({{ item.raw.transfer_order?.batch ?? '-' }})
                                </div>

                                <div
                                  v-else
                                  class="text-success"
                                >
                                  Available
                                </div>

                                <!-- DETAIL LINE -->
                                <div v-if="item.raw.assigned_inventory">
                                  {{ item.raw.assigned_inventory?.physical_id ?? '-' }}
                                </div>

                                <div v-else-if="item.raw.transfer_order">
                                  {{ item.raw.transfer_order?.physical_id ?? '-' }}
                                </div>

                              </div>

                            </div>
                          </template>

                        </v-list-item>
                      </template>
                  </v-select>

                </v-sheet>
              </div>

            </v-card-text>

            <v-divider />

            <!-- Actions -->
            <v-card-actions class="pa-4">
              <v-spacer />
              <v-btn
                variant="outlined"
                color="secondary"
                @click="closeCreateModal()"
              >
                Cancel
              </v-btn>

              <v-btn
                variant="flat"
                color="primary"
                class="px-6"
                @click="submitTransfer"
              >
                Submit Transfer Request
              </v-btn>
            </v-card-actions>

          </v-card>
        </v-dialog>

        <v-dialog v-model="showApproveModal" max-width="500px">
          <v-card>
            <v-card-title class="text-h6 font-weight-medium">Approve Bin Transfer Request</v-card-title>
            <v-divider />
            <v-card-text class="py-6">
              <div class="mb-4">
                <div class="text-caption text-medium-emphasis mb-1">TR Reference #</div>
                <div class="font-weight-bold text-h6">{{ approveItem?.transfer_request_id || '-' }}</div>
              </div>
              <div class="mb-4">
                <div class="text-caption text-medium-emphasis mb-1">From Location</div>
                <div class="font-weight-bold">{{ approveItem?.from_block?.lot?.label }}-{{ approveItem?.from_block?.label }} (Layer {{ approveItem?.from_layer_position ?? '-' }})</div>
                <div>Batch: <span class="font-weight-medium">{{ approveItem?.batch ?? '-' }}</span></div>
                <div>Physical ID: <span class="font-weight-medium">{{ approveItem?.physical_id ?? '-' }}</span></div>
              </div>
              <div class="mb-4">
                <div class="text-caption text-medium-emphasis mb-1">To Location</div>
                <div class="font-weight-bold">{{ approveItem?.to_block?.lot?.label }}-{{ approveItem?.to_block?.label }} (Layer {{ approveItem?.to_layer_position ?? '-' }})</div>
              </div>
            </v-card-text>
            <v-divider />
            <v-card-actions class="pa-4">
              <v-spacer />
              <v-btn variant="outlined" color="secondary" @click="closeApproveModal">Close</v-btn>
              <v-btn variant="flat" color="primary" class="px-6" @click="approveTransfer">Approve</v-btn>
            </v-card-actions>
          </v-card>
      </v-dialog>
        
    </div>
    <Loader :show="pageLoading" />
    <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event"/>

</template>

<script setup>
import Loader from '@/components/Loader.vue';
import Toast from '@/components/Toast.vue';
import { useAuthorization } from '@/composables/useAuthorization';
import ApiService from '@/services/ApiService';
import JwtService from '@/services/JwtService';
import axios from 'axios';
import moment from 'moment';
import { watch } from 'vue';
import { useRoute } from 'vue-router';
import { VDataTableServer } from 'vuetify/components';

const props = defineProps({
    plant_code: String,
    sloc: String,
});

const plantCode = props.plant_code || useRoute().params.plant_code;
const sloc = props.sloc || useRoute().params.sloc;
const { authUserCan } = useAuthorization();

const searchValue = ref('');
const serverItems = ref([]);
const itemsPerPage = ref(20);
const page = ref(1);
const totalItems = ref(0);
const pageLoading = ref(false);
const sortQuery = ref('-created_at');
const totalRequests = ref(0);
const totalApprovedRequests = ref(0);
const totalPendingRequests = ref(0);

const filters = reactive({
});

const toast = reactive({
    message: 'Success!',
    color: 'success',
    show: false
});

onMounted(() => {
    fetchDropdownData();
})

const showModal = ref(false);

const selectedSection = ref(null);
const selectedBin = ref(null);
const selectedLayer = ref(null);

// Watch for section change to fetch bins
watch(selectedSection, (newVal) => {
    if (newVal && newVal.id) {
        fetchSectionBin(newVal.id);
    } else if (newVal) {
        // fallback if newVal is just an id
        fetchSectionBin(newVal);
    }
    selectedBin.value = null;
    selectedLayer.value = null;
});


const destinationSection = ref(null);
const destinationBin = ref(null);
const destinationLayer = ref(null);

// Watch for destinationSection change to fetch destinationBins
watch(destinationSection, async (newVal) => {
  destinationBin.value = null;
  if (!newVal) {
    destinationBins.value = [];
    return;
  }
  // Get block_id and lot_id from selectedBin and destinationSection
  let blockId = null;
  let lotId = null;
  // selectedBin can be object or id
  let binObj = null;
  if (selectedBin.value && typeof selectedBin.value === 'object') {
    binObj = selectedBin.value;
  } else if (selectedBin.value && Array.isArray(bins.value)) {
    binObj = bins.value.find(b => b.id === selectedBin.value || b.value === selectedBin.value);
  }
  if (binObj) {
    blockId = binObj.id;
  }
  lotId = newVal.id || newVal;
  if (blockId && lotId) {
    pageLoading.value = true;
    try {
      const token = JwtService.getToken();
      const response = await axios.get(`/warehouse/bin-transfer/get-destination-bins/${blockId}/${lotId}/`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      destinationBins.value = response.data.blocks || [];
    } catch (error) {
      destinationBins.value = [];
      console.log(error);
    } finally {
      pageLoading.value = false;
    }
  } else {
    destinationBins.value = [];
  }
});

function closeCreateModal() {
    showModal.value = false;
    selectedSection.value = null;
    selectedBin.value = null;
    selectedLayer.value = null;
    destinationSection.value = null;
    destinationBin.value = null;
    destinationLayer.value = null;
}


const sectionsData = ref([]);
const bins = ref([]);
const layers = ref([]);

// Watch for bin change to update layers
watch(selectedBin, (newVal) => {
    let binObj = null;
    let binId = null;
    if (newVal && typeof newVal === 'object' && Array.isArray(newVal.layers)) {
      binObj = newVal;
      binId = newVal.id;
    } else if (newVal && Array.isArray(bins.value)) {
      binObj = bins.value.find(b => b.id === newVal || b.value === newVal);
      binId = newVal;
    }
    if (binObj && Array.isArray(binObj.layers)) {
      layers.value = binObj.layers.map(l => ({
        label: l.layer_name,
        value: l.layer_position,
        ...l
      }));
    } else {
      layers.value = [];
    }
    // Fetch destination sections when a bin is selected
    if (binId) {
      fetchDestinationSections(binId);
    }
});

async function submitTransfer() {
    try {
        pageLoading.value = true;

        const response = await ApiService.post(
            `/warehouse/bin-transfer/store-request`,
            {
                from_section_id: selectedSection.value.id || selectedSection.value,
                from_block_id: selectedBin.value.id || selectedBin.value,
                inventory_id: layers.value.find(l => l.value === selectedLayer.value)?.assigned_inventory?.id,
                from_layer_position: selectedLayer.value,
                to_section_id: destinationSection.value.id || destinationSection.value,
                to_block_id: destinationBin.value.id || destinationBin.value,
                to_layer_position: destinationLayer.value,
                plant_code: plantCode,
                sloc: sloc
            }
        );

        if (response.data?.result === 'S') {
            toast.message = response.data?.message || 'Bin transfer request submitted!';
            toast.color = 'success';
            toast.show = true;
            // Optionally reload items
            await loadItems({
                page: page.value,
                itemsPerPage: itemsPerPage.value,
                sortBy: [{ key: 'updated_at', order: 'desc' }],
                search: searchValue.value
            });
            closeCreateModal();
        } else {
            toast.message = response.data?.message || 'Failed to submit bin transfer request.';
            toast.color = 'error';
            toast.show = true;
        }
    } catch (e) {
        toast.message = 'Failed to submit bin transfer request.';
        toast.color = 'error';
        toast.show = true;
        console.error(e);
    } finally {
        pageLoading.value = false;
    }
}

const storageLocation = ref(null);
const fetchDropdownData = async () => {
    pageLoading.value = true;
    try {
        const token = JwtService.getToken();
        const response = await axios.get(`/warehouse/bin-transfer/get-data-dropdown/${plantCode}/${sloc}`, {
            params: {
                filters: filters
            },
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const { total_requests, total_approved_requests, total_pending_requests, storage_location, sections } = response.data;
        storageLocation.value = storage_location;
        sectionsData.value = sections;
        totalRequests.value = total_requests;
        totalApprovedRequests.value = total_approved_requests;
        totalPendingRequests.value = total_pending_requests;
  
    } catch (error) {
        console.log(error);
    } finally {
        pageLoading.value = false;
    }
};

const fetchSectionBin = async (sectionId) => {
    pageLoading.value = true;
    try {
        const token = JwtService.getToken();
        const response = await axios.get(`/warehouse/bin-transfer/get-bin-options/${sectionId}`, {
            params: {
                filters: filters
            },
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const { blocks } = response.data;
        bins.value = blocks;
        console.log(bins.value);
    } catch (error) {
        console.log(error);
    } finally {
        pageLoading.value = false;
    }
};

const destinationSections = ref([]);
const destinationBins = ref([]);

const fetchDestinationSections = async (binId) => {
    pageLoading.value = true;
    try {
        const token = JwtService.getToken();
        const response = await axios.get(`/warehouse/bin-transfer/get-destination-sections/${binId}`, {
            params: {
                filters: filters
            },
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const { sections } = response.data;
        destinationSections.value = sections;
        console.log(destinationSections.value);
    } catch (error) {
        console.log(error);
    } finally {
        pageLoading.value = false;
    }
};


const headers = computed(() => {
    const baseHeaders = [
      { title: 'TR Ref #', key: 'transfer_request_id', align: 'start', sortable: false },
      { title: 'TO Ref #', key: 'transfer_order_id', align: 'start', sortable: false },
      { title: 'Physical', key: 'physical_id', align: 'start', sortable: false },
      { title: 'Batch', key: 'batch', align: 'start', sortable: false },
      { title: 'Status', key: 'status', align: 'start', sortable: false },
      { title: 'From Location', key: 'from_location', align: 'start', sortable: false },
      { title: 'To Location', key: 'to_location', align: 'start', sortable: false },
    ];

    if (authUserCan('can.approve.bin.transfer.requests')) {
        baseHeaders.splice(7, 0, {
            title: 'Actions',
            key: 'actions',
            align: 'center',
            sortable: false
        });
    }
  
    return baseHeaders;
});

const tableLoading = ref(false)
const loadItems = async ({ page, itemsPerPage, sortBy, search }) => {
    tableLoading.value = true
    if (sortBy && sortBy.length > 0) {
        const sort = sortBy[0];  // Assuming single sort field
        sortQuery.value = `${sort.key}`;  // Default ascending order
        if (sort.order === 'desc') {
            sortQuery.value = `-${sort.key}`;  // Prefix with minus for descending order
        }
    } else {
        sortQuery.value = '-created_at';
    }

    // Prepare filters for API
    let apiFilters = { ...filters };

    try {
        const token = JwtService.getToken();
        const response = await axios.get(`/warehouse/bin-transfer/get-datatable/${plantCode}/${sloc}`, {
            params: {
                page,
                itemsPerPage,
                sort: sortQuery.value,
                search: searchValue.value,
                filters: apiFilters
            },
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const { table } = response.data;
        console.log(table);
        totalItems.value = table.total;
        serverItems.value = table.data;

    } catch (error) {
        console.log(error);
    } finally {
        tableLoading.value = false;
    }
}

const handleSearch = () => {
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{ key: 'updated_at', order: 'desc' }],
        search: searchValue.value
    });
};

const showApproveModal = ref(false);
const approveItem = ref(null);

function approveRequest(item) {
    approveItem.value = item;
    showApproveModal.value = true;
}

async function approveTransfer() {
    try {
        pageLoading.value = true;

        const response = await ApiService.post(
            `/warehouse/bin-transfer/approve-request`,
            {
                request_id: approveItem.value?.id,
            }
        );

        if (response.data?.result === 'S') {
            toast.message = response.data?.message || 'Bin transfer request approved!';
            toast.color = 'success';
            toast.show = true;
            // Optionally reload items
            await loadItems({
                page: page.value,
                itemsPerPage: itemsPerPage.value,
                sortBy: [{ key: 'updated_at', order: 'desc' }],
                search: searchValue.value
            });
            closeApproveModal();
        } else {
            toast.message = response.data?.message || 'Failed to approve bin transfer request.';
            toast.color = 'error';
            toast.show = true;
        }
    } catch (e) {
        toast.message = 'Failed to approve bin transfer request.';
        toast.color = 'error';
        toast.show = true;
        console.error(e);
    } finally {
        pageLoading.value = false;
    }
}

function closeApproveModal() {
    showApproveModal.value = false;
    approveItem.value = null;
}
</script>
