<script setup>
import DateRangePicker from '@/components/DateRangePicker.vue';
import FilteringModal from '@/components/FilteringModal.vue';
import ApiService from '@/services/ApiService';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { VDataTableServer } from 'vuetify/components';

const emits = defineEmits(['pagination-changed', 'update:selected']);

const route = useRoute();

const plantCode = route.params.plant_code;
const sloc = route.params.sloc;
const s_section = route.params.storage_section;

const searchValue = ref('');

const filterModalVisible = ref(false);
const batchOptions = ref([]);

const filters = reactive({
    date_range: null,
    batch: null,
});

const dateFilter = ref(null);

const isFiltersEmpty = computed(() => {
    return !filters.date_range && !filters.batch;
});

const dateFilterOptions = [
    { title: 'Today', value: 'today' },
    { title: 'Yesterday', value: 'yesterday' },
    { title: 'Last 7 Days', value: 'last_7_days' },
];

const selectedItems = ref([]);
const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref('-created_at');
const pageLoading = ref(false);
const storageLocation = ref(null);

const headers = [
    { title: 'PALLET PHYSICAL ID', key: 'physical_id' },
    { title: 'QUANTITY', key: 'quantity', align: 'center', sortable: false },
    { title: 'BATCH', key: 'batch' },
    { title: 'MATERIAL', key: 'material', sortable: false },
    { title: 'BIN LOCATION', key: 'bin_location', sortable: false },
    { title: 'LAYER', key: 'position_in_block', align: 'center', sortable: false },
];


onMounted(() => {
    fetchStorageLocationDetails();
    // fetchBatches();
})

const fetchStorageLocationDetails = async () => {
    pageLoading.value = true;
    try {
        const response = await ApiService.get(`quality-control/storage-location/${plantCode}/${sloc}`);
        storageLocation.value = response.data.storage_location;
    } catch (error) {
        console.log(error);
    } finally {
        pageLoading.value = false;
    }
};

// const fetchBatches = async () => {
//     try {
//         const response = await ApiService.get(`quality-control/batches/${plantCode}/${sloc}`);
//         batchOptions.value = response.data.map(item => ({
//             value: item.batch,
//             title: item.batch,
//         }));
//     } catch (error) {
//         console.log(error);
//     }
// };

const filterModalOpen = () => {
    if (!filterModalVisible.value) {
        filterModalVisible.value = true;
    }
};

const applyFilter = () => {
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [],
    });
    filterModalVisible.value = false;
};

const resetFilter = () => {
    clearFilters();
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [],
    });
    filterModalVisible.value = false;
};

const clearFilters = () => {
    filters.date_range = null;
    filters.batch = null;
};

watch(() => dateFilter.value, () => {
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [],
    });
});

watch(() => filters.batch, () => {
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [],
    });
});

const loadItems = ({ page: pageVal, itemsPerPage: perPage, sortBy }) => {
    loading.value = true;

    const plant_code = route.params.plant_code;
    const sloc = route.params.sloc;
    const forklift = route.params.forklift;

    if (!plant_code || !sloc || !forklift) {
        loading.value = false;
        return Promise.resolve();
    }

    if (sortBy && sortBy.length > 0) {
        const sort = sortBy[0];
        sortQuery.value = sort.order === 'desc' ? `-${sort.key}` : sort.key;
    } else {
        sortQuery.value = '-created_at';
    }

    return ApiService.query(`for-quality-inspection/${plant_code}/${sloc}/${forklift}`, {
        params: {
            page: pageVal,
            itemsPerPage: perPage,
            sort: sortQuery.value,
            search: searchValue.value,
            filters: filters,
            date_filter: dateFilter.value,
        }
    })
        .then((response) => {
            totalItems.value = response.data.total;
            serverItems.value = response.data.data;
            loading.value = false;
            emits('pagination-changed', { page: pageVal, itemsPerPage: perPage, sortBy: sortQuery.value });
        })
        .catch((error) => {
            console.log(error);
            loading.value = false;
        });
};

const handleSearch = () => {
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [],
    });
};

const handleSelectionChange = (val) => {
    selectedItems.value = val;
    emits('update:selected', val);
};

const inspectionDialog = ref(false);
const grGiSlipNumber = ref('');
const refDocNumber = ref('');
const postingDate = ref(new Date().toISOString().split('T')[0]);
const qualityInspectionStatus = ref(null);
const ticketRange = ref('');
const qualityInspectionStatusOptions = [
    { title: 'Good', value: 'good' },
    { title: 'For RTM', value: 'for-rtm' },
];
const qualityInspectionLoading = ref(false);
const simulateCompleted = ref(false);
const simulationErrors = ref([]);
const dialogAlert = ref({ show: false, type: 'info', message: '' });
const chunkResults = ref([]);

const totalSelectedQuantity = computed(() =>
    selectedItems.value.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
);

const openInspectionDialog = () => {
    grGiSlipNumber.value = '';
    refDocNumber.value = '';
    postingDate.value = new Date().toISOString().split('T')[0];
    qualityInspectionStatus.value = null;
    ticketRange.value = '';
    simulateCompleted.value = false;
    simulationErrors.value = [];
    chunkResults.value = [];
    dialogAlert.value = { show: false, type: 'info', message: '' };
    inspectionDialog.value = true;
};

const confirmQualityInspection = async (method) => {
    qualityInspectionLoading.value = true;
    simulationErrors.value = [];
    chunkResults.value = [];
    dialogAlert.value = { show: false, type: 'info', message: '' };
    try {
        const response = await ApiService.post('inventories/quality-inspection', {
            status: qualityInspectionStatus.value,
            method,
            gr_gi_slip_number: grGiSlipNumber.value,
            ref_doc_number: refDocNumber.value,
            posting_date: postingDate.value,
            plant_code: storageLocation.value?.plant?.plant_code,
            storage_location_id: storageLocation.value?.id,
            type: 'qc-inspection',
            ticket_range: ticketRange.value,
            items: selectedItems.value.map(item => ({
                physical_id: item.physical_id,
                rfid_code: item.rfid_code,
                rfid_type: item.type,
                type_slug: item.type_slug,
                batch: item.batch,
                material_code: item.material?.bu_material,
                entry_qty: item.quantity,
                designated_block_id: item.block_id,
                layer_position: item.position_in_block,
            })),
        }, { timeout: 300000 });

        const data = response.data;

        // Handle new synchronous chunked response format
        if (data.results && Array.isArray(data.results)) {
            chunkResults.value = data.results;
            const failedChunks = data.results.filter(r => r.status === 'E' || r.status === 'failed');
            const succeededChunks = data.results.filter(r => r.status === 'S');

            if (failedChunks.length > 0) {
                simulationErrors.value = failedChunks.flatMap(r => (r.errors ?? []).map(e => e.MESSAGE));

                if (method === 'simulate') {
                    simulateCompleted.value = false;
                    dialogAlert.value = { show: true, type: 'error', message: `Simulation completed with errors. ${succeededChunks.length} of ${data.results.length} chunk(s) succeeded.` };
                } else {
                    const totalSuccess = succeededChunks.reduce((sum, r) => sum + (r.item_count || 0), 0);
                    dialogAlert.value = { show: true, type: 'warning', message: `QC Inspection completed with errors. ${totalSuccess} of ${data.total_items} items processed.` };
                }
                return;
            }

            // All chunks succeeded
            const docNumbers = succeededChunks
                .filter(r => r.material_document_313 || r.material_document_315)
                .map(r => [r.material_document_313, r.material_document_315].filter(Boolean).join(', '))
                .join(' | ');

            if (method === 'simulate') {
                simulateCompleted.value = true;
                dialogAlert.value = { show: true, type: 'info', message: 'Simulation completed. You may now confirm the quality inspection.' };
            } else {
                const docInfo = docNumbers ? ` Material Doc(s): ${docNumbers}` : '';
                dialogAlert.value = { show: true, type: 'success', message: `QC Inspection completed successfully! ${data.total_items} items processed across ${data.total_chunks} chunk(s).${docInfo}` };
                simulateCompleted.value = false;
                inspectionDialog.value = false;
                await loadItems({ page: page.value, itemsPerPage: itemsPerPage.value, sortBy: [] });
                selectedItems.value = [];
                emits('update:selected', []);
            }
            return;
        }

        // Legacy response format fallback
        let hasError = false;
        const errorMessages = [];

        if (data.goods_movement_313?.status === 'E') {
            hasError = true;
            errorMessages.push(...(data.goods_movement_313.returns ?? []).filter(r => r.MESSAGE).map(r => r.MESSAGE));
        }
        if (data.goods_movement_315?.status === 'E') {
            hasError = true;
            errorMessages.push(...(data.goods_movement_315.returns ?? []).filter(r => r.MESSAGE).map(r => r.MESSAGE));
        }

        if (hasError) {
            simulationErrors.value = errorMessages;
            simulateCompleted.value = false;
            dialogAlert.value = { show: true, type: 'error', message: 'Simulation failed. Please check the errors below.' };
            return;
        }

        if (method === 'simulate') {
            simulateCompleted.value = true;
            dialogAlert.value = { show: true, type: 'info', message: 'Simulation completed. You may now confirm the quality inspection.' };
        } else {
            dialogAlert.value = { show: true, type: 'success', message: 'Quality inspection confirmed successfully!' };
            simulateCompleted.value = false;
            inspectionDialog.value = false;
            await loadItems({ page: page.value, itemsPerPage: itemsPerPage.value, sortBy: [] });
            selectedItems.value = [];
            emits('update:selected', []);
        }
    } catch (error) {
        dialogAlert.value = {
            show: true,
            type: 'error',
            message: error.response?.data?.message || 'An error occurred during quality inspection.',
        };
    } finally {
        qualityInspectionLoading.value = false;
    }
};

defineExpose({ loadItems, selectedItems });
</script>

<template>
    <div>
        <div class="pa-4">
            <h4 class="text-h5 font-weight-bold mb-2">Plant : <span class="font-bold text-primary">{{storageLocation?.plant?.plant_code}} - {{ storageLocation?.plant?.name }}</span></h4>
            <h4 class="text-h5 font-weight-bold mb-2">Storage Location : <span class="font-bold text-primary">{{storageLocation?.code}} - {{ storageLocation?.name }}</span></h4>
            <h4 class="text-h5 font-weight-bold mb-2">Total for Quality Inspection : <span class="font-bold text-primary">{{ totalItems }}</span></h4>
        </div>
        <div class="d-flex flex-wrap gap-4 align-center justify-center mb-2">
            <VTextField
                v-model="searchValue"
                label="Search"
                placeholder="Search Batch, Pallet"
                append-inner-icon="ri-search-line"
                single-line
                hide-details
                density="compact"
                class="flex-grow-1"
                @keyup.enter="handleSearch"
            />

            <!-- <v-select
                style="max-width: 200px;"
                class="flex-grow-1 align-center"
                density="compact"
                :items="dateFilterOptions"
                v-model="dateFilter"
                label="Date Filter"
                clearable
            /> -->

            <!-- <v-select
                style="max-width: 250px;"
                class="flex-grow-1 align-center"
                density="compact"
                :items="batchOptions"
                v-model="filters.batch"
                label="Batch"
                clearable
            /> -->

            <!-- <v-btn
                class="d-flex align-center"
                prepend-icon="ri-equalizer-line"
                @click="filterModalOpen"
            >
                <template #prepend>
                    <v-icon color="white"></v-icon>
                </template>
                Filter
            </v-btn> -->

            <v-btn
                class="d-flex align-center"
                prepend-icon="ri-search-eye-line"
                @click="handleSearch"
            >
                <template #prepend>
                    <v-icon color="white"></v-icon>
                </template>
                Search
            </v-btn>
            <v-btn
                color="warning"
                prepend-icon="ri-microscope-line"
                :disabled="selectedItems.length === 0"
                @click="openInspectionDialog"
            >
                Quality Inspection
            </v-btn>
        </div>

        <v-dialog
            v-model="inspectionDialog"
            max-width="700"
            persistent
        >
            <v-card>
                <v-card-title class="text-h6 font-weight-bold pa-4">
                    Quality Inspection
                </v-card-title>
                <v-divider />
                <v-card-text class="pa-4">
                    <v-alert
                        v-if="dialogAlert.show"
                        :type="dialogAlert.type"
                        variant="tonal"
                        class="mb-4"
                        closable
                        @click:close="dialogAlert.show = false"
                    >
                        <div>{{ dialogAlert.message }}</div>
                        <ul v-if="simulationErrors.length > 0" class="ml-4 mt-1">
                            <li v-for="(err, i) in simulationErrors" :key="i">{{ err }}</li>
                        </ul>
                    </v-alert>

                    <div v-if="chunkResults.length > 0" class="mb-4">
                        <v-card
                            v-for="chunk in chunkResults"
                            :key="chunk.chunk_index"
                            variant="tonal"
                            :color="chunk.status === 'S' ? 'success' : 'error'"
                            class="mb-2"
                            rounded="lg"
                        >
                            <v-card-text class="pa-3">
                                <div class="d-flex justify-space-between align-center mb-1">
                                    <span class="font-weight-bold">
                                        Chunk {{ chunk.chunk_index + 1 }}
                                        <span class="text-medium-emphasis">({{ chunk.item_count }} items)</span>
                                    </span>
                                    <v-badge
                                        :color="chunk.status === 'S' ? 'success' : 'error'"
                                        :content="chunk.status === 'S' ? 'Success' : 'Failed'"
                                        inline
                                    />
                                </div>
                                <div v-if="chunk.status === 'S' && (chunk.material_document_313 || chunk.material_document_315)" class="text-body-2">
                                    <span v-if="chunk.material_document_313">Material Doc 313: <strong>{{ chunk.material_document_313 }}</strong></span>
                                    <span v-if="chunk.material_document_315" class="ml-4">Material Doc 315: <strong>{{ chunk.material_document_315 }}</strong></span>
                                </div>
                                <div v-if="chunk.item_physical_ids && chunk.item_physical_ids.length > 0" class="text-body-2 text-medium-emphasis mt-1">
                                    Physical IDs: {{ chunk.item_physical_ids.join(', ') }}
                                </div>
                                <ul v-if="chunk.errors && chunk.errors.length > 0" class="ml-4 mt-1">
                                    <li v-for="(err, i) in chunk.errors" :key="i" class="text-body-2">{{ err.MESSAGE }}</li>
                                </ul>
                            </v-card-text>
                        </v-card>
                    </div>
                    <VTextField
                        v-model="grGiSlipNumber"
                        label="GR GI Slip Number"
                        placeholder="Enter GR GI Slip Number"
                        density="compact"
                        variant="outlined"
                        class="mb-3"
                        hide-details="auto"
                    />
                    <VTextField
                        v-model="refDocNumber"
                        label="Ref Doc Number"
                        placeholder="Enter Ref Doc Number"
                        density="compact"
                        variant="outlined"
                        class="mb-3"
                        hide-details="auto"
                    />
                    <VTextField
                        v-model="postingDate"
                        label="Posting Date"
                        type="date"
                        density="compact"
                        variant="outlined"
                        class="mb-3"
                        hide-details="auto"
                    />
                    <v-select
                        v-model="qualityInspectionStatus"
                        label="Select Status"
                        :items="qualityInspectionStatusOptions"
                        item-title="title"
                        item-value="value"
                        density="compact"
                        variant="outlined"
                        class="mb-4"
                        hide-details="auto"
                    />
                    <VTextField
                        v-model="ticketRange"
                        label="Ticket Range"
                        placeholder="Enter Ticket Range"
                        density="compact"
                        variant="outlined"
                        class="mb-4"
                        hide-details="auto"
                    />
                    <div class="d-flex gap-3 mb-4">
                        <v-card
                            variant="tonal"
                            color="primary"
                            rounded="lg"
                            class="flex-1-1"
                        >
                            <v-card-text class="pa-3">
                                <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold mb-1">Total Pallets</div>
                                <div class="text-h5 font-weight-bold">{{ selectedItems.length }}</div>
                            </v-card-text>
                        </v-card>
                        <v-card
                            variant="tonal"
                            color="success"
                            rounded="lg"
                            class="flex-1-1"
                        >
                            <v-card-text class="pa-3">
                                <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold mb-1">Total Quantity</div>
                                <div class="text-h5 font-weight-bold">{{ totalSelectedQuantity }}</div>
                            </v-card-text>
                        </v-card>
                    </div>
                    <v-table density="compact">
                        <thead>
                            <tr>
                                <th>Pallet Physical ID</th>
                                <th class="text-center">Quantity</th>
                                <th>Batch</th>
                                <th>Bin Location</th>
                                <th class="text-center">Layer</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="item in selectedItems"
                                :key="item.id"
                            >
                                <td>{{ item.physical_id }}</td>
                                <td class="text-center">{{ item.quantity }}</td>
                                <td>{{ item.batch }}</td>
                                <td>{{ item.block?.lot?.label ?? '--' }} - {{ item.block?.label ?? '--' }}</td>
                                <td class="text-center">Layer {{ item.position_in_block ?? '--' }}</td>
                            </tr>
                        </tbody>
                    </v-table>
                </v-card-text>
                <v-divider />
                <v-card-actions class="pa-4">
                    <v-btn
                        color="error"
                        variant="outlined"
                        :disabled="qualityInspectionLoading"
                        @click="inspectionDialog = false"
                    >
                        Cancel
                    </v-btn>
                    <v-spacer />
                    <v-btn
                        color="secondary"
                        :disabled="!qualityInspectionStatus || qualityInspectionLoading"
                        :loading="qualityInspectionLoading && !simulateCompleted"
                        @click="confirmQualityInspection('simulate')"
                    >
                        Simulate
                    </v-btn>
                    <v-btn
                        v-if="simulateCompleted"
                        color="primary"
                        :loading="qualityInspectionLoading && simulateCompleted"
                        @click="confirmQualityInspection('')"
                    >
                        Confirm
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <FilteringModal @close="filterModalVisible = false" :show="filterModalVisible" :dialogTitle="'Filter Quality Inspection'">
            <template #default>
                <v-form>
                    <div class="mt-4">
                        <label class="font-weight-bold">Date Range</label>
                        <DateRangePicker class="mt-1" v-model="filters.date_range" placeholder="Select Date Range" />
                    </div>

                    <div class="d-flex justify-end align-center mt-8">
                        <v-btn color="secondary" variant="outlined" :disabled="isFiltersEmpty" @click="resetFilter" class="px-12 mr-3">Reset Filter</v-btn>
                        <v-btn class="px-12" type="button" color="primary" :disabled="isFiltersEmpty" @click="applyFilter">
                            Apply Filter
                        </v-btn>
                    </div>
                </v-form>
            </template>
        </FilteringModal>

        <VCard>
            <VDataTableServer
                v-model:items-per-page="itemsPerPage"
                :model-value="selectedItems"
                :headers="headers"
                :items="serverItems"
                :items-length="totalItems"
                :loading="loading"
                item-value="id"
                show-select
                return-object
                @update:options="loadItems"
                @update:model-value="handleSelectionChange"
                class="text-no-wrap"
            >
                <template #item.material="{ item }">
                    <span class="font-weight-bold">{{ item.material?.description }}</span><br />
                    <span class="text-subtitle-1 text-medium-emphasis">{{ item.material?.bu_material }}</span>
                </template>

                <template #item.bin_location="{ item }">
                    {{ item.block?.lot?.label ?? '--' }} - {{ item.block?.label ?? '--' }}
                </template>

                <template #item.position_in_block="{ item }">
                    Layer {{ item.position_in_block ?? '--' }}
                </template>
            </VDataTableServer>
        </VCard>
    </div>
</template>
