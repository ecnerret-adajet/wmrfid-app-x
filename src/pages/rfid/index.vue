<script setup>
import AddingModal from '@/components/AddingModal.vue';
import DateTimePicker from '@/components/DateTimePicker.vue';
import DefaultModal from '@/components/DefaultModal.vue';
import EditingModal from '@/components/EditingModal.vue';
import FilteringModal from '@/components/FilteringModal.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import Toast from '@/components/Toast.vue';
import { useAuthorization } from '@/composables/useAuthorization';
import { exportExcel, generateSlug } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import JwtService from '@/services/JwtService';
import { useAuthStore } from '@/stores/auth';
import axios from 'axios';
import Moment from 'moment';
import { reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const { authUserCan } = useAuthorization();

const searchValue = ref('');
const serverItems = ref([]);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref('-created_at');
const allStorageLocations = ref([]); // all slocs
const storageLocations = ref([]); // filtered slocs based on plant_code
const plantsOption = ref([]);

const errorMessage = ref(null);
const registrationModalForm = ref(null);
const materialsOption = ref([]);
const selectedItems = ref([]);
const tagTypesOption = ref([]);
const pageLoading = ref(false);
const showEpcModal = ref(false);
const epcData = ref([])
const changeBatchModal = ref(false);
const manualBatchModal = ref(false);


const showRegistrationModal = ref(false);

const toast = ref({
    message: 'RFID success',
    color: 'success',
    show: false
});

const batchUpdateForm = reactive({
    material_id: null,
    mfg_date: null,
    quantity: null,
    reason: null,
    selectedRfid: [],
    bay_no: null,
    type: 'inventory',
    miller_name: null
});

const manualBatchUpdateForm = reactive({
    material_id: null,
    mfg_date: null,
    quantity: null,
    selectedRfid: [],
    bay_no: null,
    type: 'inventory'
});

const updateForm = reactive({
    quantity: null,
    rfid: null
})

const hasWrappingArea = computed(() => 
    authStore.user?.is_super_admin || 
    (authStore.user?.plants || []).some(plant => 
        plant.configuration?.has_wrapping_area
    )
);

const hasEmptyArea = computed(() => 
    authStore.user?.is_super_admin || 
    (authStore.user?.plants || []).some(plant => 
        plant.configuration?.has_empty_area
    )
);

const headers = computed(() => {
    const baseHeaders = [
        { title: 'PHYSICAL ID', key: 'physical_id' },
        { title: 'Plant', key: 'plant' },
        { title: 'EPC', key: 'epc', align: 'center', sortable: false },
        { title: 'TYPE', key: 'type', align: 'center', sortable: false },
        { title: 'BATCH', key: 'batch' },
        { title: 'MFG DATE', key: 'mfg_date', align: 'center' },
        { title: 'QUANTITY', key: 'quantity', align: 'center', sortable: false },
        // Wrapping column will be conditionally included
        { title: 'LOADING', key: 'is_loaded', align: 'center', sortable: false },
        { title: 'ACTIONS', key: 'actions', align: 'center', sortable: false },
    ];

    if (hasWrappingArea.value) {
        // Insert WRAPPING column after QUANTITY (index 6)
        // baseHeaders.splice(6, 0, {
        //     title: 'WRAPPING',
        //     key: 'is_wrapped',
        //     align: 'center',
        //     sortable: false
        // });
    }

    if (hasEmptyArea.value) {
        // If WRAPPING is present, EMPTY AREA should be after it (index 7), else after LOADING (index 6)
        const emptyAreaIndex = hasWrappingArea.value ? 7 : 6;
        // baseHeaders.splice(emptyAreaIndex, 0, {
        //     title: 'EMPTY AREA',
        //     key: 'is_empty',
        //     align: 'center',
        //     sortable: false
        // });
    }

  return baseHeaders;
});

const filterModalVisible = ref(false);

const handleSearch = () => {
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{ key: 'updated_at', order: 'desc' }],
        search: searchValue.value
    });
};

const handleRegister = () => {
    showRegistrationModal.value = true;
}

const filterModalOpen = () => {
    if (!filterModalVisible.value) {
        filterModalVisible.value = true;
    }
};

const filters = reactive({
    created_at: null,
    updated_at: null,
    tag_type_id: null,
    plant_code: null,
});

const form = reactive({
    tag_type_id: null,
    storage_location_id: null,
    plant_code: null
});

const isFiltersEmpty = computed(() => {
    return !filters.created_at &&
        !filters.updated_at &&
        !filters.tag_type_id &&
        !filters.plant_code
});

const applyFilter = () => {
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{ key: 'updated_at', order: 'desc' }],
        search: searchValue.value
    });
    filterModalVisible.value = false;
}

const resetFilter = () => {
    clearFilters();
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{ key: 'updated_at', order: 'desc' }],
        search: searchValue.value
    });
    filterModalVisible.value = false;
}

const clearFilters = () => {
    filters.created_at = null;
    filters.updated_at = null;
    filters.tag_type_id = null;
    filters.plant_code = null;
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

    try {
        const token = JwtService.getToken();

        const response = await axios.get('/rfid/get-data', {
            params: {
                page,
                itemsPerPage,
                sort: sortQuery.value,
                search: searchValue.value,
                filters: filters
            },
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const { table, statistics, tag_types, storage_locations, materials, plants } = response.data;
        totalItems.value = table.total;
        serverItems.value = table.data;

        // statisticsData.value = statistics;
        materialsOption.value = materials.map(item => ({
            value: item.id,
            title: `${item.plant_code} - ${item.code} - ${item.description}`,
            default_pallet_quantity: item.default_pallet_quantity
        }));

        tagTypesOption.value = tag_types.map(item => ({
            value: item.id,
            title: item.title,
            name: item.title
        }));

        allStorageLocations.value = storage_locations;

        // Apply initial filter (if any plant_code is already selected)
        updateFilteredStorageLocations();

        plantsOption.value = plants.map(item => ({
            value: item.plant_code,
            title: `${item.plant_code} - ${item.name}`,
            name: `${item.plant_code} - ${item.name}`
        }));

    } catch (error) {
        console.log(error);
    } finally {
        pageLoading.value = false;
    }
}

const handleViewRfid = (item) => {
    router.push(`/rfid/${item.type}/${item.name}`);
}

const viewEpc = (item) => {
    epcData.value = item.epc_data
    showEpcModal.value = true;
}

const changeBatch = () => {
    const hasNoBatch = selectedItems.value.some(item => !item.batch);

    if (hasNoBatch) {
        toast.value.message = 'All selected items must have a batch assigned to update batch.';
        toast.value.color = 'error';
        toast.value.show = true;
        return;
    }
    changeBatchModal.value = true;
}

const manualBatch = () => {
    const hasBatch = selectedItems.value.some(item => item.batch);

    if (hasBatch) {
        toast.value.message = 'All selected items must NOT have a batch assigned to perform this action.';
        toast.value.color = 'error';
        toast.value.show = true;
        return;
    }
    manualBatchModal.value = true;
}

const proceedRegister = () => {

    if (registrationModalForm.value.isValid) {

        if (!form.tag_type_id || !form.plant_code) {
            console.error("Tag Type and Plant is not selected.");
            return; // Return early if form values are not set
        }

        let tagType = tagTypesOption.value.find(item => item.value === form.tag_type_id);
        let storageLocation = storageLocations.value.find(item => item.value === form.storage_location_id);
        let plant = plantsOption.value.find(item => item.value === form.plant_code);

        if (!tagType || !plant) {
            console.error("Invalid Tag Type and Plant selected.");
            return;
        }

        const slugType = generateSlug(tagType.name);
        const slugPlant = generateSlug(plant.value);
        const slugLocation = storageLocation?.name ? generateSlug(storageLocation.name) : null;

        if (tagType.name && plant.value) {
            // Construct the path depending on whether location is set
            const path = slugLocation
                ? `/rfid-registration/${slugType}/${slugPlant}/${slugLocation}`
                : `/rfid-registration/${slugType}/${slugPlant}`;
            router.push({ path });
            showRegistrationModal.value = false;
        }
    }
}

const changeBatchLoading = ref(false);

const cancelChangeBatch = () => {
    clearChangeBatch()
    changeBatchModal.value = false;
}

const cancelManualBatch = () => {
    clearManualBatch()
    manualBatchModal.value = false;
}

const clearChangeBatch = () => {
    batchUpdateForm.material_id = null;
    batchUpdateForm.mfg_date = null;
    batchUpdateForm.batch = null;
    batchUpdateForm.reason = null;
    batchUpdateForm.miller_name = null;
    batchUpdateForm.selectedRfid = [];
    batchUpdateForm.bay_no = null;
    selectedItems.value = []
}

const clearManualBatch = () => {
    manualBatchUpdateForm.material_id = null;
    manualBatchUpdateForm.mfg_date = null;
    manualBatchUpdateForm.batch = null;
    manualBatchUpdateForm.selectedRfid = []
    manualBatchUpdateForm.bay_no = null;

    selectedItems.value = []
}

const handleChangeBatch = async () => {
    changeBatchLoading.value = true;
    toast.value.show = false;

    // Overwrite id with inventory_id
    selectedItems.value.forEach(item => {
        item.id = item.inventory_id;
    });

    batchUpdateForm.selectedRfid = selectedItems.value

    try {
        const response = await ApiService.post('inventories/batch-update', batchUpdateForm)
        changeBatchLoading.value = false;
        toast.value.message = 'Batch updated successfully!'
        toast.value.show = true;
        clearChangeBatch();
        loadItems({
            page: page.value,
            itemsPerPage: itemsPerPage.value,
            sortBy: [{ key: 'created_at', order: 'desc' }],
            search: searchValue.value
        });
        changeBatchModal.value = false;
        errorMessage.value = null;
    } catch (error) {
        errorMessage.value = error.response?.data?.message || 'An unexpected error occurred.';
        console.error('Error submitting:', error);
        changeBatchLoading.value = false;
    }
}

const manualBatchLoading = ref(false);
const handleManualBatch = async () => {
    manualBatchLoading.value = true;
    toast.value.show = false;

    manualBatchUpdateForm.selectedRfid = selectedItems.value

    try {
        const response = await ApiService.post('inventories/manual-batch-update', manualBatchUpdateForm)
        manualBatchLoading.value = false;
        toast.value.color = 'success';
        toast.value.message = 'Manual Batch updated successfully!'
        toast.value.show = true;
        clearManualBatch();
        loadItems({
            page: page.value,
            itemsPerPage: itemsPerPage.value,
            sortBy: [{ key: 'created_at', order: 'desc' }],
            search: searchValue.value
        });
        manualBatchModal.value = false;
        errorMessage.value = null;
    } catch (error) {
        errorMessage.value = error.response?.data?.message || 'An unexpected error occurred.';
        console.error('Error submitting:', error);
        manualBatchLoading.value = false;
    }
}

const updateFilteredStorageLocations = () => {
    if (form.plant_code) {
        storageLocations.value = allStorageLocations.value
            .filter(loc => loc.plant_code === form.plant_code)
            .map(loc => ({
                value: loc.id,
                title: loc.name,
                name: loc.name
            }));

        // Optionally reset invalid selection
        if (!storageLocations.value.some(loc => loc.value === form.storage_location_id)) {
            form.storage_location_id = null;
        }
    } else {
        storageLocations.value = allStorageLocations.value.map(loc => ({
            value: loc.id,
            title: loc.name,
            name: loc.name
        }));
    }
};

const taggingModal = ref(false);
const taggingLoading = ref(false);
const handleTagAsWeak = () => {
    taggingModal.value = true;
};

const looseTaggingModal = ref(false);
const looseTaggingLoading = ref(false);
const handleTagAsLoose = () => {
    looseTaggingModal.value = true;
};

const looseUpdateForm = reactive({
    selectedRfid: [],
});

const handleLooseTagging = async () => {
    looseTaggingLoading.value = true;
    toast.show = false;
    looseUpdateForm.selectedRfid = selectedItems.value
    try {
        const response = await ApiService.post('rfid/loose-tagging', looseUpdateForm)
        if (response.status !== 200) {
            throw new Error('Failed to tag as loose');
        }
        looseTaggingLoading.value = false;
        toast.value.message = 'RFID tagged as loose!'
        toast.value.color = 'success'
        toast.value.show = true;
        loadItems({
            page: page.value,
            itemsPerPage: itemsPerPage.value,
            sortBy: [{ key: 'created_at', order: 'desc' }],
            search: searchValue.value
        });
        selectedItems.value = [];
    } catch (error) {
        console.error('Error submitting:', error);
    } finally {
        looseTaggingLoading.value = false;
        looseTaggingModal.value = false;
    }
}

const tagUpdateForm = reactive({
    selectedRfid: [],
});

const handleTagging = async () => {
    taggingLoading.value = true;
    toast.show = false;
    tagUpdateForm.selectedRfid = selectedItems.value
    try {
        const response = await ApiService.post('rfid/toggle-weak-tag', tagUpdateForm)
        if (response.status !== 200) {
            throw new Error('Failed to tag as weak');
        }
        taggingLoading.value = false;
        toast.value.message = 'RFID tagged as weak!'
        toast.value.color = 'success'
        toast.value.show = true;
        loadItems({
            page: page.value,
            itemsPerPage: itemsPerPage.value,
            sortBy: [{ key: 'created_at', order: 'desc' }],
            search: searchValue.value
        });
        selectedItems.value = [];
    } catch (error) {
        console.error('Error submitting:', error);
    } finally {
        taggingLoading.value = false;
        taggingModal.value = false;
    }
}



const exportLoading = ref(false);
const exportData = async () => {
    try {
        exportLoading.value = true;
        await exportExcel({
            url: '/export/rfid/',
            params: {
                plant_code: filters.plant_code,
                search: searchValue.value,
            },
            filename: 'rfid-master-report.xlsx',
        });
    } catch (error) {
        console.error('Export error:', error);
    } finally {
        exportLoading.value = false;
    }
}

// Auto-update when plant_code changes
watch(() => form.plant_code, () => {
    updateFilteredStorageLocations();
});

const selectedItem = ref(null);
const updateLoading = ref(false);
const editDialog = ref(false);
const editItem = (item) => {
    if (item.batch == null) {
        toast.value.message = 'Cannot edit pallet without assigned inventory';
        toast.value.color = 'error';
        toast.value.show = true;
        return;
    }
    selectedItem.value = item;
    updateForm.rfid = item;
    updateForm.quantity = item.quantity;
    editDialog.value = true;
}

const handleUpdate = async () => {
    updateLoading.value = true;
    toast.value.show = false;

    try {
        const response = await ApiService.post(`rfid/${selectedItem.value.id}/update`, updateForm);
        if (response.status !== 200) {
            throw new Error('Failed to update RFID');
        }
        updateLoading.value = false;
        toast.value.message = 'Current quantity updated successfully!';
        toast.value.color = 'success';
        toast.value.show = true;
        loadItems({
            page: page.value,
            itemsPerPage: itemsPerPage.value,
            sortBy: [{ key: 'created_at', order: 'desc' }],
            search: searchValue.value
        });
    } catch (error) {
        console.error('Error updating:', error);
    } finally {
        updateLoading.value = false;
        editDialog.value = false;
    }
}

watch(
    () => manualBatchUpdateForm.material_id,
    (newMaterialId) => {
        if (!newMaterialId) return;
        // Find the selected material
        const selectedMaterial = materialsOption.value.find(m => m.value === newMaterialId);

        if (selectedMaterial && selectedMaterial.default_pallet_quantity !== undefined) {
            selectedItems.value.forEach(item => {
                // Only set if not already set
                if (!item.manual_quantity) {
                    item.manual_quantity = selectedMaterial.default_pallet_quantity;
                }
            });
        }
    }
);

watch(
    () => batchUpdateForm.material_id,
    (newMaterialId) => {
        if (!newMaterialId) return;
        // Find the selected material
        const selectedMaterial = materialsOption.value.find(m => m.value === newMaterialId);

        if (selectedMaterial && selectedMaterial.default_pallet_quantity !== undefined) {
            selectedItems.value.forEach(item => {
                // Only set if not already set
                if (!item.manual_quantity) {
                    item.manual_quantity = selectedMaterial.default_pallet_quantity;
                }
            });
        }
    }
);

const bayOptions = [
    { title: 'Not Loaded', value: null },
    { title: 'Bay 1', value: 1 },
    { title: 'Bay 2', value: 2 },
    { title: 'Bay 3', value: 3 },
    { title: 'Bay 4', value: 4 },
];

</script>

<template>
    <div class="d-flex gap-4 align-center justify-center mb-2">
        <VTextField v-model="searchValue" label="Search" placeholder="placeholder" append-inner-icon="ri-search-line"
            single-line hide-details density="compact" class="flex-grow-1" />
        <v-btn class="d-flex align-center" prepend-icon="ri-search-eye-line" @click="handleSearch">
            <template #prepend>
                <v-icon color="white"></v-icon>
            </template>
            Search
        </v-btn>
    </div>

    <div class="mb-2 d-flex flex-wrap align-center gap-2">

        <div v-if="selectedItems.length > 0" class="px-3 py-1 border">
            <span class="d-flex align-center text-h6 font-weight-medium text-high-emphasis">
                Selected items count: ({{ selectedItems.length }})

                <v-btn class="ml-2" @click="selectedItems = []" color="red-lighten-2" icon="ri-close-line"
                    variant="text"></v-btn>
            </span>
        </div>

        <div class="d-flex flex-wrap align-center gap-2 justify-end ml-auto">
            <v-btn class="d-flex align-center" prepend-icon="ri-equalizer-line" @click="filterModalOpen">
                <template #prepend>
                    <v-icon color="white"></v-icon>
                </template>
                Filter
            </v-btn>
            <v-btn @click="handleRegister">Register RFID</v-btn>

            <v-btn :loading="exportLoading" class="d-flex align-center" prepend-icon="ri-download-line"
                @click="exportData">
                <template #prepend>
                    <v-icon color="white"></v-icon>
                </template>
                Export
            </v-btn>

            <v-btn @click="manualBatch" v-if="authStore.user.is_super_admin || authStore.user.is_warehouse_admin || authUserCan('update.batch')"
                :disabled="selectedItems.length === 0 || selectedItems.every(item => item.batch !== null)" class="px-5"
                type="button" color="primary-light">
                Manual Batch
            </v-btn>

            <v-btn @click="changeBatch" v-if="authStore.user.is_super_admin || authStore.user.is_warehouse_admin || authUserCan('update.batch')"
                :disabled="selectedItems.length === 0 || selectedItems.every(item => item.batch === null)" class="px-5"
                type="button" color="primary-light">
                Update Batch
            </v-btn>

            <v-btn @click="handleTagAsWeak" :disabled="selectedItems.length === 0" class="px-5" type="button"
                color="warning">
                Tag as Weak
            </v-btn>

            <v-btn @click="handleTagAsLoose"
                :disabled="selectedItems.length === 0 || selectedItems.every(item => item.batch === null)" class="px-5"
                type="button" color="warning">
                Tag as Loose
            </v-btn>
        </div>
    </div>

    <VCard>

        <!-- TODO:: Update condition  -->
        <!-- v-bind="authStore.user.is_super_admin || authStore.user.is_warehouse_admin ? { showSelect: true, 'v-model': selectedItems, returnObject: true } : {}" -->
        <VDataTableServer v-model:items-per-page="itemsPerPage" v-model="selectedItems" :headers="headers" show-select
            return-object :items="serverItems" :items-length="totalItems" :loading="pageLoading" item-value="id"
            @update:options="loadItems" class="text-no-wrap">

            <template #item.plant="{ item }">
                {{ item.plant_name }}
            </template>

            <template #item.physical_id="{ item }">
                <span v-if="item.is_weak_signal">
                    <VTooltip location="top">
                        <template #activator="{ props }">
                            <span v-bind="props" class="font-weight-bold cursor-pointer text-error">{{ item.name
                            }}</span>
                        </template>
                        <span>Weak Signal</span>
                    </VTooltip>
                </span>
                <span v-else @click="handleViewRfid(item)"
                    class="text-primary font-weight-bold cursor-pointer hover-underline">
                    {{ item.name }}
                </span>
            </template>

            <!-- <template #item.physical_id="{ item }">
                {{ item.name }}
            </template> -->

            <!-- <template #item.weak_signal="{ item }">
                <v-badge v-if="item.is_weak_signal" color="error" content="Yes" class="text-uppercase" inline></v-badge>
            </template> -->

            <template #item.type="{ item }">
                <span class="text-uppercase">{{ item.type }}</span>
            </template>
            
            <template #item.epc="{ item }">
                <v-btn variant="outlined" @click="viewEpc(item)" color="info">
                    View EPC
                </v-btn>
            </template>

            <template #item.batch="{ item }">
                <span class="font-weight-bold">{{ item.batch }}</span><br/>
                <span v-if="item.material_name" class="text-subtitle-1">{{ item.material_name }}</span>
            </template>

            <template #item.mfg_date="{ item }">
                <span>{{ item.mfg_date ? Moment(item.mfg_date).format('MMMM D, YYYY') : '' }}</span>
            </template>

            <template #item.is_wrapped="{ item }">
                <div class="d-flex justify-center align-center">
                    <i v-if="item.is_wrapped" style="font-size: 30px; background-color: green;"
                        class="ri-checkbox-circle-line"></i>
                    <i v-else style="font-size: 30px; background-color: #FF4C51;" class="ri-close-circle-line"></i>
                </div>
            </template>

            <template #item.is_loaded="{ item }">
                <div class="d-flex justify-center align-center">
                    <i v-if="item.is_loaded" style="font-size: 30px; background-color: green;"
                        class="ri-checkbox-circle-line"></i>
                    <i v-else style="font-size: 30px; background-color: #FF4C51;" class="ri-close-circle-line"></i>
                </div>
            </template>

            <template #item.is_empty="{ item }">
                <div class="d-flex justify-center align-center">
                    <i v-if="item.is_empty" style="font-size: 30px; background-color: green;"
                        class="ri-checkbox-circle-line"></i>
                    <i v-else style="font-size: 30px; background-color: #FF4C51;" class="ri-close-circle-line"></i>
                </div>
            </template>

            <template #item.actions="{ item }">
                <div v-if="authUserCan('edit.rfid')" class="d-flex gap-1">
                    <IconBtn size="small" @click="editItem(item)">
                        <VIcon icon="ri-pencil-line" />
                    </IconBtn>
                </div>
            </template>

        </VDataTableServer>
    </VCard>

    <FilteringModal @close="filterModalVisible = false" :show="filterModalVisible" :dialogTitle="'Filter RFID'">
        <template #default>
            <v-form>
                <div>
                    <label class="font-weight-bold">Tag Type</label>
                    <v-select label="Filter by Type" density="compact" :items="tagTypesOption"
                        v-model="filters.tag_type_id">
                    </v-select>
                </div>
                <div class="mt-4">
                    <label class="font-weight-bold">Plant</label>
                    <v-select class="mt-1" label="Select Plant" density="compact" :items="plantsOption"
                        v-model="filters.plant_code"
                        :rules="[value => !!value || 'Please select an item from the list']">
                    </v-select>
                </div>
                <div class="mt-4">
                    <label class="font-weight-bold">Date Created</label>
                    <DateRangePicker class="mt-1" v-model="filters.created_at" placeholder="Select Date Created" />
                </div>

                <div class="mt-4">
                    <label class="font-weight-bold">Date Updated</label>
                    <DateRangePicker class="mt-1" v-model="filters.updated_at" placeholder="Select Date Updated" />
                </div>

                <div class="d-flex justify-end align-center mt-8">
                    <v-btn color="secondary" variant="outlined" :disabled="isFiltersEmpty" @click="resetFilter"
                        class="px-12 mr-3">Reset Filter</v-btn>
                    <PrimaryButton class="px-12" type="button" :disabled="isFiltersEmpty" @click="applyFilter">
                        Apply Filter
                    </PrimaryButton>
                </div>
            </v-form>
        </template>
    </FilteringModal>

    <DefaultModal :dialog-title="'EPCs'" :show="showEpcModal" @close="showEpcModal = false" min-height="auto">
        <v-table class="mt-4">
            <thead>
                <tr>
                    <th>Physical ID</th>
                    <th>EPC</th>
                    <th>TID</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="(item, index) in epcData" :key="index">
                    <td>{{ item.name }}</td>
                    <td>{{ item.epc }}</td>
                    <td>{{ item.tid }} </td>
                </tr>
            </tbody>
        </v-table>
    </DefaultModal>

    <!--  RFID Registration  -->
    <AddingModal @close="showRegistrationModal = false" :show="showRegistrationModal"
        :dialogTitle="'Select Type and Location'">
        <template #default>
            <v-form @submit.prevent="proceedRegister" ref="registrationModalForm">
                <div>
                    <label class="font-weight-bold">RFID Type<span class="text-error">*</span></label>
                    <v-select class="mt-1" label="Select Type" density="compact" :items="tagTypesOption"
                        v-model="form.tag_type_id" :rules="[value => !!value || 'Please select an item from the list']">
                    </v-select>
                </div>
                <div class="mt-4">
                    <label class="font-weight-bold">Plant<span class="text-error">*</span></label>
                    <v-select class="mt-1" label="Select Plant" density="compact" :items="plantsOption"
                        v-model="form.plant_code" :rules="[value => !!value || 'Please select an item from the list']">
                    </v-select>
                </div>
                <div class="mt-4">
                    <label class="font-weight-bold">Location</label>
                    <v-select class="mt-1" label="Select Location" density="compact" :items="storageLocations"
                        v-model="form.storage_location_id">
                    </v-select>
                </div>
                <div class="d-flex justify-end align-center mt-8">
                    <v-btn color="secondary" variant="outlined" @click="showRegistrationModal = false"
                        class="px-12 mr-3">Cancel</v-btn>
                    <v-btn color="primary" type="submit" class="px-12">Proceed</v-btn>
                </div>
            </v-form>
        </template>
    </AddingModal>

    <EditingModal @close="changeBatchModal = false" max-width="970px" :show="changeBatchModal"
        :dialog-title="`Change Batch Assignment`">
        <template #default>
            <v-form @submit.prevent="handleChangeBatch">
                <v-row>
                    <v-col cols="12" md="6">
                        <v-autocomplete label="Select Material" density="compact" item-title="title" item-value="value"
                            :items="materialsOption" v-model="batchUpdateForm.material_id"
                            :rules="[value => !!value || 'Please select an item from the list']" />
                    </v-col>
                    <v-col cols="12" md="6">
                        <DateTimePicker v-model="batchUpdateForm.mfg_date" placeholder="Select Manufacturing Date" />
                    </v-col>
                </v-row>

                <v-row>
                    <v-col cols="12" md="6">
                        <v-text-field density="compact" label="Miller Name" v-model="batchUpdateForm.miller_name" />
                    </v-col>
                    <v-col cols="12" md="6">
                        <v-autocomplete density="compact" item-title="title" item-value="value" :items="bayOptions"
                            v-model="batchUpdateForm.bay_no" />
                    </v-col>
                </v-row>

                <v-textarea class="mt-4" clear-icon="ri-close-line" label="Reason" v-model="batchUpdateForm.reason"
                    clearable></v-textarea>

            </v-form>
            <VAlert v-if="errorMessage" class="mt-4" color="error" variant="tonal">
                {{ errorMessage }}
            </VAlert>
            <v-table class="mt-4">
                <thead>
                    <tr>
                        <th>Physical ID</th>
                        <th>Material</th>
                        <th>Mfg Date</th>
                        <th>Quantity</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(item, index) in selectedItems" :key="index">
                        <td>{{ item.name }}</td>
                        <td>{{ item.material_name ?? 'N/A' }}</td>
                        <td>
                            {{ item.mfg_date ? Moment(item.mfg_date).format('MMMM D, YYYY') : '' }}
                        </td>
                        <td>
                            <v-text-field v-model="item.manual_quantity" density="compact" hide-details
                                placeholder="Quantity" type="number" :rules="[v => !!v || 'Quantity is required']" />
                        </td>
                    </tr>
                </tbody>
            </v-table>
            <div class="d-flex justify-end align-center mt-4">
                <v-btn color="secondary" variant="outlined" @click="cancelChangeBatch" class="px-12 mr-3">Cancel</v-btn>
                <PrimaryButton @click="handleChangeBatch" color="primary" class="px-12" type="submit"
                    :loading="changeBatchLoading">
                    Update
                </PrimaryButton>
            </div>
        </template>
    </EditingModal>

    <!-- manual batching  -->
    <EditingModal @close="manualBatchModal = false" max-width="970px" :show="manualBatchModal"
        :dialog-title="`Manual Batch Assignment`">
        <template #default>
            <v-form @submit.prevent="handleManualBatch">
                <v-row>
                    <v-col cols="12" md="6">
                        <v-autocomplete label="Select Material" density="compact" item-title="title" item-value="value"
                            :items="materialsOption" v-model="manualBatchUpdateForm.material_id"
                            :rules="[value => !!value || 'Please select an item from the list']" />
                    </v-col>
                    <v-col cols="12" md="6">
                        <DateTimePicker v-model="manualBatchUpdateForm.mfg_date" placeholder="Select Manufacturing Date" />
                    </v-col>
                </v-row>

                <v-row>
                    <v-col cols="12" md="6">
                        <v-autocomplete density="compact" item-title="title" item-value="value" :items="bayOptions"
                            v-model="manualBatchUpdateForm.bay_no" />
                    </v-col>
                </v-row>

            </v-form>
            <VAlert v-if="errorMessage" class="mt-4" color="error" variant="tonal">
                {{ errorMessage }}
            </VAlert>
            <v-table class="mt-4">
                <thead>
                    <tr>
                        <th>Physical ID</th>
                        <th>Group</th>
                        <th>Type</th>
                        <th>Quantity</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(item, index) in selectedItems" :key="item.rfid_code">
                        <td>{{ item.name }}</td>
                        <td>{{ item.group_no ?? 'N/A' }}</td>
                        <td class="text-uppercase">{{ item.type }}</td>
                        <td>
                            <v-text-field v-model="item.manual_quantity" density="compact" hide-details
                                placeholder="Quantity" type="number" :rules="[v => !!v || 'Quantity is required']" />
                        </td>
                    </tr>
                </tbody>
            </v-table>
            <div class="d-flex justify-end align-center mt-4">
                <v-btn color="secondary" variant="outlined" @click="cancelManualBatch" class="px-12 mr-3">Cancel</v-btn>
                <PrimaryButton @click="handleManualBatch" color="primary" class="px-12" type="submit"
                    :loading="manualBatchLoading">
                    Manual Batch Assign
                </PrimaryButton>
            </div>
        </template>
    </EditingModal>

    <EditingModal @close="taggingModal = false" max-width="900px" :show="taggingModal"
        :dialog-title="`Tag RFID as Weak`">
        <template #default>
            <div class="mx-4">
                <span class="text-h5 text-high-emphasis">
                    Do you want to tag the following {{ selectedItems.length > 1 ? `pallets` : 'pallet' }} as weak?
                </span>
            </div>
            <v-table class="mt-4">
                <thead>
                    <tr>
                        <th>Plant</th>
                        <th>Type</th>
                        <th>RFID Code</th>
                        <th>Physical ID</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(item, index) in selectedItems" :key="index">
                        <td>{{ item.plant_name }}</td>
                        <td class="text-uppercase">{{ item.type }}</td>
                        <td>{{ item.rfid_code }}</td>
                        <td>{{ item.name }}</td>
                    </tr>
                </tbody>
            </v-table>
            <div class="d-flex justify-end align-center mt-4">
                <v-btn color="secondary" variant="outlined" @click="taggingModal = false"
                    class="px-12 mr-3">Cancel</v-btn>
                <PrimaryButton @click="handleTagging" color="primary" class="px-12" type="submit"
                    :loading="taggingLoading">
                    Confirm
                </PrimaryButton>
            </div>
        </template>
    </EditingModal>

    <EditingModal @close="looseTaggingModal = false" max-width="1000px" :show="looseTaggingModal"
        :dialog-title="`Tag RFID as Loose`">
        <template #default>
            <div class="mx-4 font-">
                <span class="text-h5 text-high-emphasis">
                    Do you want to tag the following {{ selectedItems.length > 1 ? `pallets` : 'pallet' }} as loose?
                </span>
            </div>
            <v-table class="mt-4">
                <thead>
                    <tr>
                        <th>Plant</th>
                        <th>Type</th>
                        <th>Batch</th>
                        <th>Physical ID</th>
                        <th>Remaining Quantity</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(item, index) in selectedItems" :key="index">
                        <td>{{ item.plant_name }}</td>
                        <td class="text-uppercase">{{ item.type }}</td>
                        <td>{{ item.batch }}</td>
                        <td>{{ item.name }}</td>
                        <td>
                            <v-text-field v-model="item.quantity" density="compact" hide-details placeholder="Quantity"
                                type="number" :rules="[v => !!v || 'Quantity is required']" />
                        </td>
                    </tr>
                </tbody>
            </v-table>
            <div class="d-flex justify-end align-center mt-4">
                <v-btn color="secondary" variant="outlined" @click="looseTaggingModal = false"
                    class="px-12 mr-3">Cancel</v-btn>
                <PrimaryButton @click="handleLooseTagging" color="primary" class="px-12" type="submit"
                    :loading="looseTaggingLoading">
                    Confirm
                </PrimaryButton>
            </div>
        </template>
    </EditingModal>

    <EditingModal v-if="selectedItem" @close="editDialog = false" :show="editDialog"
        :dialog-title="`Update ${selectedItem.name}`">
        <template #default>
            <v-form @submit.prevent="handleUpdate">
                <v-text-field class="mt-6" density="compact" :rules="[value => !!value || 'Quantity is required']"
                    label="Current Quantity" v-model="updateForm.quantity" />
                <!-- <VAlert v-if="errorMessage" class="mt-4" color="error" variant="tonal">
                    {{ errorMessage }}
                </VAlert> -->
                <div class="d-flex justify-end align-center mt-4">
                    <v-btn color="secondary" variant="outlined" @click="editDialog = false"
                        class="px-12 mr-3">Cancel</v-btn>
                    <PrimaryButton color="primary" class="px-12" type="submit" :loading="updateLoading">
                        Update
                    </PrimaryButton>
                </div>
            </v-form>
        </template>
    </EditingModal>

    <Toast :show="toast.show" :color="toast.color" :message="toast.message" @update:show="toast.show = $event" />
</template>
