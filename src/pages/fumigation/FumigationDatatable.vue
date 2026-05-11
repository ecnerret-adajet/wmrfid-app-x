<script setup>
import DatePicker from '@/components/DatePicker.vue';
import ApiService from '@/services/ApiService';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { VDataTableServer } from 'vuetify/components';

const emits = defineEmits(['pagination-changed', 'update:selected']);

const route = useRoute();

const plantCode = route.params.plant_code;
const sloc = route.params.sloc;

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
    { title: 'PALLET ID', key: 'physical_id' },
    { title: 'QUANTITY', key: 'quantity', align: 'center', sortable: false },
    { title: 'BATCH', key: 'batch' },
    { title: 'MATERIAL', key: 'material', sortable: false },
    { title: 'BIN LOCATION', key: 'bin_location', sortable: false },
    { title: 'LAYER', key: 'position_in_block', align: 'center', sortable: false },
    { title: 'STATUS', key: 'commodity_status', align: 'center', sortable: false },
];

onMounted(() => {
    fetchStorageLocationDetails();
})

const fetchStorageLocationDetails = async () => {
    pageLoading.value = true;
    try {
        const response = await ApiService.get(`warehouse/storage-location/${plantCode}/${sloc}`);
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

    if (!plant_code || !sloc) {
        loading.value = false;
        return;
    }

    if (sortBy && sortBy.length > 0) {
        const sort = sortBy[0];
        sortQuery.value = sort.order === 'desc' ? `-${sort.key}` : sort.key;
    } else {
        sortQuery.value = '-created_at';
    }

    ApiService.query('inventories/fetch-inventories', {
        params: {
            page: pageVal,
            itemsPerPage: perPage,
            sort: sortQuery.value,
            search: searchValue.value,
            plant_code,
            sloc,
            commodity_status_id: 1,
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
    selectedItems.value = val.map(item => ({ ...item, inventory_id: item.id }));
    emits('update:selected', selectedItems.value);
};

const inspectionDialog = ref(false);
const fumigateLoading = ref(false);
const errorMessage = ref(null);

const createFumigateForm = reactive({
    startDate: null,
    endDate: null,
    remarks: null,
    plant_code: route.params.plant_code,
    sloc: route.params.sloc,
});

const totalSelectedQuantity = computed(() =>
    selectedItems.value.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
);

const openInspectionDialog = () => {
    createFumigateForm.startDate = null;
    createFumigateForm.endDate = null;
    createFumigateForm.remarks = null;
    errorMessage.value = null;
    inspectionDialog.value = true;
};

const handleCreateFumigate = async () => {
    fumigateLoading.value = true;
    errorMessage.value = null;

    if (!createFumigateForm.startDate || !createFumigateForm.endDate || !createFumigateForm.remarks) {
        errorMessage.value = 'Start Date, End Date, and Remarks are required.';
        fumigateLoading.value = false;
        return;
    }

    const start = new Date(createFumigateForm.startDate);
    const end = new Date(createFumigateForm.endDate);

    if (start.getTime() > end.getTime()) {
        errorMessage.value = 'Start Date cannot be later than End Date.';
        fumigateLoading.value = false;
        return;
    }

    if (selectedItems.value.length === 0) {
        errorMessage.value = 'Please select at least one pallet for fumigation.';
        fumigateLoading.value = false;
        return;
    }

    try {
        await ApiService.post('fumigations/create', {
            ...createFumigateForm,
            items: selectedItems.value,
        });
        inspectionDialog.value = false;
        selectedItems.value = [];
        emits('update:selected', []);
        loadItems({ page: page.value, itemsPerPage: itemsPerPage.value, sortBy: [] });
    } catch (error) {
        errorMessage.value = error.response?.data?.message || 'An unexpected error occurred.';
    } finally {
        fumigateLoading.value = false;
    }
};

defineExpose({ loadItems, selectedItems });
</script>

<template>
    <div>
        <div class="pa-4">
            <h4 class="text-h5 font-weight-bold mb-2">Plant : <span class="font-bold text-primary">{{storageLocation?.plant?.plant_code}} - {{ storageLocation?.plant?.name }}</span></h4>
            <h4 class="text-h5 font-weight-bold mb-2">Storage Location : <span class="font-bold text-primary">{{storageLocation?.code}} - {{ storageLocation?.name }}</span></h4>
            <h4 class="text-h5 font-weight-bold mb-2">Total for Fumigation : <span class="font-bold text-primary">{{ totalItems }}</span></h4>
        </div>
        <div class="d-flex gap-4 align-center justify-center px-4 mb-2">
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
                Fumigate
            </v-btn>
        </div>

        <v-dialog
            v-model="inspectionDialog"
            max-width="700"
            persistent
        >
            <v-card>
                <v-card-title class="text-h6 font-weight-bold pa-4">
                    Fumigation Request
                </v-card-title>
                <v-divider />
                <v-card-text class="pa-4">
                    <VAlert
                        v-if="errorMessage"
                        color="error"
                        variant="tonal"
                        class="mb-4"
                    >
                        {{ errorMessage }}
                    </VAlert>
                    <v-row>
                        <v-col
                            cols="12"
                            md="6"
                        >
                            <DatePicker
                                v-model="createFumigateForm.startDate"
                                placeholder="Select Start Date"
                            />
                        </v-col>
                        <v-col
                            cols="12"
                            md="6"
                        >
                            <DatePicker
                                v-model="createFumigateForm.endDate"
                                :min-date="createFumigateForm.startDate"
                                placeholder="Select End Date"
                            />
                        </v-col>
                    </v-row>
                    <v-textarea
                        v-model="createFumigateForm.remarks"
                        class="mt-4 mb-4"
                        clear-icon="ri-close-line"
                        label="Remarks"
                        lines="1"
                        variant="outlined"
                        density="compact"
                        clearable
                    />
                    <v-divider class="mb-4" />
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
                                <th>Pallet ID</th>
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
                        :disabled="fumigateLoading"
                        @click="inspectionDialog = false"
                    >
                        Cancel
                    </v-btn>
                    <v-spacer />
                    <v-btn
                        color="primary"
                        :loading="fumigateLoading"
                        @click="handleCreateFumigate"
                    >
                        Create
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-card>
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

            <template #item.commodity_status="{ item }">
                <v-chip
                    v-if="item.commodity_status?.name"
                    color="success"
                    variant="tonal"
                    size="small"
                    class="text-uppercase font-weight-bold"
                >
                    {{ item.commodity_status.name }}
                </v-chip>
                <span v-else>--</span>
            </template>
        </VDataTableServer>
        </v-card>
    </div>
</template>
