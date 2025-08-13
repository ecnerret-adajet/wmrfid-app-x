<script setup>
import EditingModal from '@/components/EditingModal.vue';
import FilteringModal from '@/components/FilteringModal.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import Toast from '@/components/Toast.vue';
import { useAuthorization } from '@/composables/useAuthorization';
import { exportExcel } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import JwtService from '@/services/JwtService';
import { useAuthStore } from '@/stores/auth';
import axios from 'axios';
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
const showEpcModal = ref(false);
const errorMessage = ref(null);
const materialsOption = ref([]);
const selectedItems = ref([]);
const tagTypesOption = ref([]);
const pageLoading = ref(false);
const epcData = ref([])

const toast = ref({
    message: 'RFID success',
    color: 'success',
    show: false
});




const headers = computed(() => {
    const baseHeaders = [
        { title: 'PHYSICAL ID', key: 'physical_id' },
        { title: 'Plant', key: 'plant' },
        { title: 'EPC', key: 'epc', align: 'center', sortable: false },
        { title: 'TYPE', key: 'type', align: 'center', sortable: false },
        { title: 'CURRENT BATCH', key: 'batch' },
        // { title: 'DATE TAGGED AS WEAK', key: 'date_tagged_as_weak' },
        // Wrapping column will be conditionally included
        // { title: 'ACTIONS', key: 'actions', align: 'center', sortable: false },
    ];

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
    is_weak_signal: true 
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

const viewEpc = (item) => {
    epcData.value = item.epc_data
    showEpcModal.value = true;
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

        <v-btn class="d-flex align-center" prepend-icon="ri-equalizer-line" @click="filterModalOpen">
            <template #prepend>
                <v-icon color="white"></v-icon>
            </template>
            Filter
        </v-btn>

        <v-btn :loading="exportLoading" class="d-flex align-center" prepend-icon="ri-download-line"
            @click="exportData">
            <template #prepend>
                <v-icon color="white"></v-icon>
            </template>
            Export
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
    </div>

    <VCard>

        <!-- TODO:: Update condition  -->
        <!-- v-bind="authStore.user.is_super_admin || authStore.user.is_warehouse_admin ? { showSelect: true, 'v-model': selectedItems, returnObject: true } : {}" -->
        <VDataTableServer v-model:items-per-page="itemsPerPage" v-model="selectedItems" :headers="headers" 
             :items="serverItems" :items-length="totalItems" :loading="pageLoading" item-value="id"
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

            <template #item.type="{ item }">
                <span class="text-uppercase">{{ item.type }}</span>
            </template>

            <template #item.epc="{ item }">
                <v-btn variant="outlined" @click="viewEpc(item)" color="info">
                    View EPC
                </v-btn>
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

    <Toast :show="toast.show" :color="toast.color" :message="toast.message" @update:show="toast.show = $event" />
</template>
