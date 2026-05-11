<script setup>
import ApiService from '@/services/ApiService';
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { VDataTableServer } from 'vuetify/components';

const emits = defineEmits(['pagination-changed', 'update:selected']);

const route = useRoute();

const plantCode = route.params.plant_code;
const sloc = route.params.sloc;
const s_section = route.params.storage_section;

const searchValue = ref('');

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

const loadItems = ({ page: pageVal, itemsPerPage: perPage, sortBy }) => {
    loading.value = true;

    const plant_code = route.params.plant_code;
    const sloc = route.params.sloc;
    const forklift = route.params.forklift;

    if (!plant_code || !sloc || !forklift) {
        loading.value = false;
        return;
    }

    if (sortBy && sortBy.length > 0) {
        const sort = sortBy[0];
        sortQuery.value = sort.order === 'desc' ? `-${sort.key}` : sort.key;
    } else {
        sortQuery.value = '-created_at';
    }

    ApiService.query(`for-quality-inspection/${plant_code}/${sloc}/${forklift}`, {
        params: {
            page: pageVal,
            itemsPerPage: perPage,
            sort: sortQuery.value,
            search: searchValue.value,
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
const qualityInspectionStatusOptions = [
    { title: 'Good', value: 'good' },
    { title: 'For RTM', value: 'for-rtm' },
];
const qualityInspectionLoading = ref(false);
const simulateCompleted = ref(false);
const simulationErrors = ref([]);
const dialogAlert = ref({ show: false, type: 'info', message: '' });

const totalSelectedQuantity = computed(() =>
    selectedItems.value.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
);

const openInspectionDialog = () => {
    grGiSlipNumber.value = '';
    refDocNumber.value = '';
    postingDate.value = new Date().toISOString().split('T')[0];
    qualityInspectionStatus.value = null;
    simulateCompleted.value = false;
    simulationErrors.value = [];
    dialogAlert.value = { show: false, type: 'info', message: '' };
    inspectionDialog.value = true;
};

const confirmQualityInspection = async (method) => {
    qualityInspectionLoading.value = true;
    simulationErrors.value = [];
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
        });

        const data = response.data;
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
            loadItems({ page: page.value, itemsPerPage: itemsPerPage.value, sortBy: [] });
            selectedItems.value = [];
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
        <div class="d-flex gap-4 align-center justify-center mb-2">
            <VTextField
                v-model="searchValue"
                label="Search"
                placeholder="Search pallet, batch..."
                append-inner-icon="ri-search-line"
                single-line
                hide-details
                density="compact"
                class="flex-grow-1"
                @keyup.enter="handleSearch"
            />
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
