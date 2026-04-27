
<template>
  <div class="pa-8">
    <h4 class="text-h5 font-weight-bold mb-2">Plant : <span class="font-bold text-primary">{{storageLocation?.plant?.plant_code}} - {{ storageLocation?.plant?.name }}</span></h4>
    <h4 class="text-h5 font-weight-bold mb-2">Storage Location : <span class="font-bold text-primary">{{storageLocation?.code}} - {{ storageLocation?.name }}</span></h4>
    <h4 class="text-h5 font-weight-bold mb-2">Warehouse # : <span class="font-bold text-primary">{{ storageLocation?.warehouse_number }}</span></h4>
    <h4 class="text-h5 font-weight-bold mb-2">Storage Section : <span class="font-bold text-primary">{{ storageSection?.name }}</span></h4>
    <div class="d-flex gap-4 align-center justify-center mb-2">
        <VTextField v-model="searchValue" label="Search" placeholder="Search bin" append-inner-icon="ri-search-line"
            single-line hide-details density="compact" class="flex-grow-1" />

        <v-autocomplete
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
        />

        <v-select style="max-width: 300px;" class="flex-grow-1 align-center" label="Filter by Availability"
            clearable
            density="compact" :items="availabilityOptions" v-model="filters.availability"
            :rules="[value => value !== undefined || 'Please select an item from the list']">
        </v-select>

        <!-- <v-select style="max-width: 250px;" class="flex-grow-1 align-center" label="Filter by Storage Section"
            clearable
            density="compact" :items="storageSectionOptions" v-model="filters.storage_section_id"
            item-title="name"
            item-value="id"
            :rules="[value => value !== undefined || 'Please select an item from the list']">
        </v-select> -->

        <v-btn class="d-flex align-center" prepend-icon="ri-search-eye-line" @click="handleSearch">
            <template #prepend>
                <v-icon color="white"></v-icon>
            </template>
            Search
        </v-btn>
    </div>

        <!-- KPI Cards and Assign Button Row -->
        <div class="d-flex justify-between align-center mb-6 mt-2 gap-4">
            <div class="d-flex gap-4 py-2 align-center">
                <v-card class="text-center pt-3" color="#F5F7FA" elevation="2" style="min-width: 220px; height: 56px; display: flex; flex-direction: column; justify-content: center;">
                    <div class="text-h6 font-weight-bold mb-1">Total Bins</div>
                    <div class="text-h4 font-weight-bold" style="margin-top: -10px">{{totalBlock || 0}}</div>
                </v-card>
                <v-card class="pt-3 text-center" color="#F5F7FA" elevation="2" style="min-width: 220px; height: 56px; display: flex; flex-direction: column; justify-content: center;">
                    <div class="text-h6 font-weight-bold mb-1">Available Bins</div>
                    <div class="text-h4 font-weight-bold" style="color: #43A047; margin-top: -10px">{{ availableCount || 0 }}</div>
                </v-card>
                <v-card class="pt-3 text-center" color="#F5F7FA" elevation="2" style="min-width: 220px; height: 56px; display: flex; flex-direction: column; justify-content: center;">
                    <div class="text-h6 font-weight-bold mb-1">Occupied Bins</div>
                    <div class="text-h4 font-weight-bold" style="color: #E53935; margin-top: -10px;">{{ occupiedCount || 0 }}</div>
                </v-card>
            </div>
            <v-btn v-if="selectedBlocks.length > 0" color="primary" class="ml-2" @click="showPriority1Dialog = true" style="height: 56px; min-width: 180px;">
                Update Priority 1
            </v-btn>
            <v-btn v-if="selectedBlocks.length > 0" color="warning" class="ml-2" @click="showPriority2Dialog = true" style="height: 56px; min-width: 180px;">
                Update Priority 2
            </v-btn>
                <!-- Priority 1 Dialog -->
                <v-dialog v-model="showPriority1Dialog" max-width="500">
                    <v-card class="pa-4">
                        <v-card-title class="text-h6 font-weight-bold">Update Priority 1</v-card-title>
                        <v-card-text>
                            <v-select class="flex-grow-1 align-center" label="Select Priority 1"
                                clearable
                                density="compact"
                                :items="storageSection?.material_types || []"
                                v-model="selectedPriority1"
                                item-title="name"
                                item-value="id"
                                :rules="[value => value !== undefined || 'Please select an item from the list']">
                            </v-select>
                        </v-card-text>
                        <v-card-actions class="pa-4">
                            <v-spacer />
                            <v-btn color="secondary" text @click="showPriority1Dialog = false">Cancel</v-btn>
                            <v-btn color="primary" :disabled="!selectedPriority1" @click="updatePriority1">Update</v-btn>
                        </v-card-actions>
                    </v-card>
                </v-dialog>

                <!-- Priority 2 Dialog -->
                <v-dialog v-model="showPriority2Dialog" max-width="500">
                    <v-card class="pa-4">
                        <v-card-title class="text-h6 font-weight-bold">Update Priority 2</v-card-title>
                        <v-card-text>
                             <v-select class="flex-grow-1 align-center" label="Select Priority 2"
                                clearable
                                density="compact"
                                :items="storageSection?.material_types || []"
                                v-model="selectedPriority2"
                                item-title="name"
                                item-value="id"
                                :rules="[value => value !== undefined || 'Please select an item from the list']">
                            </v-select>
                        </v-card-text>
                        <v-card-actions class="pa-4">
                            <v-spacer />
                            <v-btn color="secondary" text @click="showPriority2Dialog = false">Cancel</v-btn>
                            <v-btn color="primary" :disabled="!selectedPriority2" @click="updatePriority2">Update</v-btn>
                        </v-card-actions>
                    </v-card>
                </v-dialog>
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
            v-model="selectedBlocks"
            show-select
            return-object
            item-value="id"
        >
            <!-- Removed custom checkbox to allow native selection to work -->
            <template #item.block="{ item }">
                {{ item.lot?.label}}-{{item.label }}
            </template>
            <template #item.lot="{ item }">
                {{ item.lot?.label }}
            </template>
            <template #item.availability="{ item }">
                <div class="d-flex align-center justify-center py-1">
                    <v-progress-circular
                    :model-value="(item.inventory_count / item.max_layer) * 100"
                    :color="item.inventory_count === 0 ? 'grey' : item.inventory_count === item.max_layer ? 'success' : 'warning'"
                    size="50"
                    width="4"
                    >
                    <span v-if="item.inventory_count === 0" style="font-size: 13px;">Empty</span>
                    <span v-else>{{ item.inventory_count }}/{{ item.max_layer }}</span>
                    </v-progress-circular>
                </div>
            </template>

            <template #item.priority_1="{ item }">
                <v-chip v-if="item.priority1" size="small" color="primary" text-color="white">{{ item.priority1?.name }}</v-chip>
                <span v-else>-</span>
            </template>
            <template #item.priority_2="{ item }">
                <v-chip v-if="item.priority2" size="small" color="warning" text-color="dark">{{ item.priority2?.name }}</v-chip>
                <span v-else>-</span>
            </template>
            <template #item.actions="{ item }">
                <v-btn icon="ri-qr-code-line" @click="() => openQrModal(item)" color="primary"></v-btn>
            </template>
        </VDataTableServer>
    </VCard>

    <BlockQrCodeModal
        v-model="qrModal"
        :block-id="qrTarget.blockId"
        :has-existing-qr="qrTarget.hasExistingQr"
        :block-label="`${selectedQrBlock?.lot?.label} - ${selectedQrBlock?.label}`"
        @generated="onQrGenerated"
    />
    <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event"/>
  </div>
</template>

<script setup>
import BlockQrCodeModal from '@/components/BlockQrCodeModal.vue';
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import JwtService from '@/services/JwtService';
import axios from 'axios';
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { VDataTableServer } from 'vuetify/components';

const route = useRoute();
const plantCode = route.params.plant_code;
const sloc = route.params.sloc;
const s_section = route.params.storage_section;

const searchValue = ref('');
const serverItems = ref([]);
const itemsPerPage = ref(20);
const page = ref(1);
const totalItems = ref(0);
const pageLoading = ref(false);
const sortQuery = ref('-created_at');
const totalBlock = ref(0);
const occupiedCount = ref(0);
const availableCount = ref(0);

const lotOptions = ref([]);

const availabilityOptions = [
    { title: 'Empty', value: 'empty' },
    { title: 'Occupied', value: 'occupied' },
];

const filters = reactive({
    lot_id: null,
    availability: null,
    storage_section_id: null,
});

const toast = reactive({
    message: 'Success!',
    color: 'success',
    show: false
});

const handleSearch = () => {
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{ key: 'updated_at', order: 'desc' }],
        search: searchValue.value
    });
};

const headers = computed(() => [
    { title: 'Block', key: 'block', align: 'center', sortable: false },
    { title: 'Lot', key: 'lot', align: 'center', sortable: false },
    { title: 'Priority 1', key: 'priority_1', align: 'center', sortable: false },
    { title: 'Priority 2', key: 'priority_2', align: 'center', sortable: false },
    { title: 'Availability', key: 'availability', align: 'center', sortable: false },
    { title: 'Actions', key: 'actions', align: 'center', sortable: false },
]);

onMounted(() => {
    fetchDropdownData();
})

const storageSection = ref(null);
const storageLocation = ref(null);

const fetchDropdownData = async () => {
    pageLoading.value = true;
    try {
        const token = JwtService.getToken();
        const response = await axios.get(`/warehouse/storage-bins/get-data-dropdown/${plantCode}/${sloc}/${s_section}`, {
            params: {
                filters: filters
            },
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const { lots, storage_section, storage_location } = response.data;
        lotOptions.value = lots;
        storageSection.value = storage_section;
        storageLocation.value = storage_location;
        totalBlock.value = response.data.total_blocks;
        occupiedCount.value = response.data.occupied_blocks;
        availableCount.value = response.data.available_blocks;
  
    } catch (error) {
        console.log(error);
    } finally {
        pageLoading.value = false;
    }
};

const loadItems = async ({ page, itemsPerPage, sortBy, search }) => {
    pageLoading.value = true
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
    if (apiFilters.storage_section_id === 'no-section') {
        apiFilters.storage_section_id = null;
        apiFilters.no_storage_section = true;
    } else {
        delete apiFilters.no_storage_section;
    }

    try {
        const token = JwtService.getToken();

        const response = await axios.get(`warehouse/storage-bins/get-datatable/${plantCode}/${sloc}`, {
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
        pageLoading.value = false;
    }
}
const handleQr = (bin) => {
    qrTarget.value = { qr: bin.qr_code_path };
    qrModal.value = true;
    console.log(bin);
};

// For multi-select and assignment
const selectedBlocks = ref([]);

// Dialog state for assigning blocks
const assignDialog = ref(false);
const assignSectionId = ref(null);


 // Priority dialog state and logic
const showPriority1Dialog = ref(false);
const showPriority2Dialog = ref(false);
const selectedPriority1 = ref(null);
const selectedPriority2 = ref(null);

async function updatePriority1() {
    if (!selectedPriority1.value || !selectedBlocks.value.length) return;

    try {
        pageLoading.value = true;
        // Use ApiService to call the update priority endpoint, passing the full object
        await ApiService.post(
            `/warehouse/storage-bins/priority_1/update-priority`,
            {
                block_ids: selectedBlocks.value.map(b => b.id),
                storage_section: storageSection.value ? storageSection.value.id : null,
                selected_priority: selectedPriority1.value,
            }
        );
        toast.message = 'Priority 1 updated!';
        toast.color = 'success';
        toast.show = true;
        showPriority1Dialog.value = false;
        selectedPriority1.value = null;
        selectedBlocks.value = [];
        // Optionally reload items
        await loadItems({
            page: page.value,
            itemsPerPage: itemsPerPage.value,
            sortBy: [{ key: 'updated_at', order: 'desc' }],
            search: searchValue.value
        });
    } catch (e) {
        toast.message = 'Failed to update Priority 1.';
        toast.color = 'error';
        toast.show = true;
        console.error(e);
    } finally {
        pageLoading.value = false;

    }
}


async function updatePriority2() {
    if (!selectedPriority2.value || !selectedBlocks.value.length) return;

    try {
        pageLoading.value = true;
        // Use ApiService to call the update priority 2 endpoint, passing the full object
        await ApiService.post(
            `/warehouse/storage-bins/priority_2/update-priority`,
            {
                block_ids: selectedBlocks.value.map(b => b.id),
                storage_section: storageSection.value ? storageSection.value.id : null,
                selected_priority: selectedPriority2.value,
            }
        );
        toast.message = 'Priority 2 updated!';
        toast.color = 'success';
        toast.show = true;
        showPriority2Dialog.value = false;
        selectedPriority2.value = null;
          selectedBlocks.value = [];
        // Optionally reload items
        await loadItems({
            page: page.value,
            itemsPerPage: itemsPerPage.value,
            sortBy: [{ key: 'updated_at', order: 'desc' }],
            search: searchValue.value
        });
    } catch (e) {
        toast.message = 'Failed to update Priority 2.';
        toast.color = 'error';
        toast.show = true;
        console.error(e);
    } finally {
        pageLoading.value = false;
    }
}

const qrModal = ref(false);
const qrTarget = ref({ blockId: null, hasExistingQr: false });

const selectedQrBlock = ref(null);
function openQrModal(bin) {
    selectedQrBlock.value = bin;
    qrTarget.value = {
        blockId: bin.id,
        hasExistingQr: !!bin.qr_code_path,
    };
    console.log(qrTarget.value)
    qrModal.value = true;
}

function onQrGenerated({ block_id, qr_code_path }) {
    if (selectedQrBlock.value) {
        selectedQrBlock.value.qr_code_path = qr_code_path;
    }
}

</script>
