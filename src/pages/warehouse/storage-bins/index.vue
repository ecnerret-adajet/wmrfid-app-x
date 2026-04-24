
<template>
  <div class="pa-8">
    <h1 class="text-h4 font-weight-bold mb-2">Storage Bins in {{plantCode}} - {{ sloc }}</h1>
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

        <v-select style="max-width: 250px;" class="flex-grow-1 align-center" label="Filter by Storage Section"
            clearable
            density="compact" :items="storageSectionOptions" v-model="filters.storage_section_id"
            item-title="name"
            item-value="id"
            :rules="[value => value !== undefined || 'Please select an item from the list']">
        </v-select>

        <v-btn class="d-flex align-center" prepend-icon="ri-search-eye-line" @click="handleSearch">
            <template #prepend>
                <v-icon color="white"></v-icon>
            </template>
            Search
        </v-btn>
    </div>
    <div class="my-2">
        <v-btn v-if="selectedBlocks.length > 0" color="success" @click="assignDialog = true">
            <!-- {{ hasAnyStorageSection ? 'Update Storage Section' : 'Assign To Storage Section' }} -->
            Assign To Storage Section
        </v-btn>
    </div>

    <v-dialog v-model="assignDialog" max-width="600">
        <v-card>
            <v-card-title class="text-h6 font-weight-bold">Assign to Storage Section</v-card-title>
            <v-card-text>
                <v-select
                    v-model="assignSectionId"
                    :items="storageSectionOptions.filter(s => s.id !== 'no-section')"
                    item-title="name"
                    item-value="id"
                    label="Select Storage Section"
                    required
                    class="mb-4"
                />
                <v-table density="compact">
                    <thead>
                        <tr>
                            <th>Block</th>
                            <th>Lot</th>
                            <th>Storage Section</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="block in selectedBlocks" :key="block.id">
                            <td>{{ block.lot?.label}}-{{ block.label }}</td>
                            <td>{{ block.lot?.label }}</td>
                            <td>
                                <span v-if="block.storage_section">
                                    <v-chip color="primary" text-color="white" size="small">{{ block.storage_section.name }}</v-chip>
                                </span>
                                <span v-else>
                                    <v-chip color="warning" text-color="white" size="small">No Storage Section</v-chip>
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </v-table>
            </v-card-text>
            <v-card-actions class="pa-4">
                <v-spacer />
                <v-btn color="secondary" text @click="assignDialog = false">Cancel</v-btn>
                <v-btn color="primary" :disabled="!assignSectionId || selectedBlocks.length === 0" @click="confirmAssignBlocks">Assign</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
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
                {{ item.lot?.label}}-{{ item.label }}
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
            <template #item.storage_section="{ item }">
                <v-chip v-if="item.storage_section"
                    color="primary"
                    text-color="white"
                    class="text-h6 font-weight-bold px-6 mb-2 mt-1"
                    size="large"
                    variant="outlined"
                >
                    <span>{{ item.storage_section?.name }}</span>
                </v-chip>
                <v-chip v-else
                    color="warning"
                    text-color="white"
                    class="text-h6 font-weight-bold px-6 mb-2 mt-1"
                    size="large"
                    variant="outlined"
                >
                    No Storage Section
                </v-chip>
            </template>
            <template #item.priority="{ item }">
                <div v-if="item.storage_section && item.storage_section?.storage_section_material_types.length > 0">
                    <v-chip
                        v-for="(matType, index) in item.storage_section.storage_section_material_types"
                        :key="index"
                        :color="
                            matType.priority_level === 1 || matType.priority_level === '1' ? 'primary' :
                            matType.priority_level === 2 || matType.priority_level === '2' ? 'warning' :
                            matType.priority_level === 3 || matType.priority_level === '3' ? 'error' : 'primary'"
                        text-color="white"
                        class="text-h6 font-weight-bold px-4 mb-2 mt-1 mr-1"
                        size="large"
                        variant="outlined"
                    >
                        <span>{{ matType.material_type?.name }}</span>
                    </v-chip>
                </div>
            </template>
            <template #item.actions="{ item }">
                <v-btn icon="ri-qr-code-line" @click="() => handleQr(item)" color="primary"></v-btn>
            </template>
        </VDataTableServer>
    </VCard>
    <!-- <QrCodeModal
        v-model="qrModal"
        :physical-id="qrTarget.qr"
        :has-existing-qr="true"
    /> -->
    <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event"/>
  </div>
</template>

<script setup>
import Toast from '@/components/Toast.vue';
import JwtService from '@/services/JwtService';
import axios from 'axios';
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { VDataTableServer } from 'vuetify/components';

const route = useRoute();
const plantCode = route.params.plant_code;
const sloc = route.params.sloc;

const searchValue = ref('');
const serverItems = ref([]);
const itemsPerPage = ref(20);
const page = ref(1);
const totalItems = ref(0);
const pageLoading = ref(false);
const qrModal = ref(false);
const qrTarget = ref({ qr: null });
const sortQuery = ref('-created_at');

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
    { title: 'Availability', key: 'availability', align: 'center', sortable: false },
    { title: 'Storage Section', key: 'storage_section', align: 'center', sortable: false },
    { title: 'Priority', key: 'priority', align: 'start', sortable: false },
    { title: 'Actions', key: 'actions', align: 'center', sortable: false },
]);

onMounted(() => {
    fetchDropdownData();
})

const storageSectionOptions = ref([]);
const fetchDropdownData = async () => {
    pageLoading.value = true;
    try {
        const token = JwtService.getToken();
        const response = await axios.get(`/warehouse/storage-bins/get-data-dropdown/${plantCode}/${sloc}`, {
            params: {
                filters: filters
            },
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const { lots, storage_sections } = response.data;
        lotOptions.value = lots;
        // Add 'No Storage Section' option
        storageSectionOptions.value = [
            { id: 'no-section', name: 'No Storage Section' },
            ...storage_sections
        ];
        console.log(lotOptions.value);
        console.log(storageSectionOptions.value);
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
    qrTarget.value = { qr: bin.qr };
    qrModal.value = true;
    
};

// For multi-select and assignment
const selectedBlocks = ref([]);

// Dialog state for assigning blocks
const assignDialog = ref(false);
const assignSectionId = ref(null);

const confirmAssignBlocks = async () => {
    if (!assignSectionId.value || !selectedBlocks.value.length) return;

    // Show toast error if any selected block already has a storage section
    if (selectedBlocks.value.some(b => b.storage_section_id)) {
        console.log('One or more selected blocks already have a storage section assigned.');
        toast.message = 'Error: One or more selected blocks already have a storage section assigned.';
        toast.color = 'error';
        toast.show = true;
        return;
    }

    try {
        pageLoading.value = true;
        const token = JwtService.getToken();
        await axios.post('/warehouse/storage-bins/assign-section-bulk', {
            block_ids: selectedBlocks.value.map(b => b.id),
            storage_section_id: assignSectionId.value,
            sloc: sloc,
            plant_code: plantCode,
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        assignDialog.value = false;
        assignSectionId.value = null;
        selectedBlocks.value = [];
        await loadItems({
            page: page.value,
            itemsPerPage: itemsPerPage.value,
            sortBy: [{ key: 'updated_at', order: 'desc' }],
            search: searchValue.value
        });
    } catch (e) {
        console.error(e);
    } finally {
        pageLoading.value = false;
    }
};

// Computed property to check if any selected block has a storage section
const hasAnyStorageSection = computed(() => {
    return selectedBlocks.value && selectedBlocks.value.some(b => b.storage_section_id);
});

// Only allow selection if all selected blocks have the same storage_section_id (including null)
const isSelectable = (item) => {
    return false;
    // if (!selectedBlocks.value || selectedBlocks.value.length === 0) return true;
    // const sectionId = selectedBlocks.value[0]?.storage_section_id || null;
    // return (item.storage_section_id || null) === sectionId;
};
</script>
