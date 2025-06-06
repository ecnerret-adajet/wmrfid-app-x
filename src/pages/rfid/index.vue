<script setup>
import AddingModal from '@/components/AddingModal.vue';
import DefaultModal from '@/components/DefaultModal.vue';
import EditingModal from '@/components/EditingModal.vue';
import FilteringModal from '@/components/FilteringModal.vue';
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import { exportExcel, generateSlug } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import JwtService from '@/services/JwtService';
import { useAuthStore } from '@/stores/auth';
import axios from 'axios';
import { debounce } from 'lodash';
import Moment from 'moment';
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

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

const showRegistrationModal = ref(false);

const toast = ref({
    message: 'RFID success',
    color: 'success',
    show: false
});

const batchUpdateForm = reactive({
    material_id: null,
    mfg_date: null,
    reason: null,
    selectedRfid: [],
    type: 'inventory'
});

const headers = [
    {
        title: 'RFID CODE',
        key: 'rfid_code',
    },
    {
        title: 'Weak Signal',
        key: 'weak_signal',
        align: 'center',
        sortable: false
    },
    {
        title: 'Plant',
        key: 'plant',
    },
    {
        title: 'PHYSICAL ID',
        key: 'physical_id',
    },
    {
        title: 'EPC',
        key: 'epc',
        align: 'center',
        sortable: false
    },
    {
        title: 'TYPE',
        key: 'type',
        align: 'center',
        sortable: false
    },
    {
        title: 'BATCH',
        key: 'batch',
    },
    {
        title: 'QUANTITY',
        key: 'quantity',
        align: 'center',
        sortable: false
    },
    {
        title: 'WRAPPING',
        key: 'is_wrapped',
        align: 'center',
        sortable: false
    },
    {
        title: 'LOADING',
        key: 'is_loaded',
        align: 'center',
        sortable: false
    },
    {
        title: 'EMPTY AREA',
        key: 'is_empty',
        align: 'center',
        sortable: false
    },
]

const filterModalVisible = ref(false);

const handleSearch = debounce((search) => {
    searchValue.value = search;
}, 500);

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
        materialsOption.value = materials

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
    changeBatchModal.value = true;
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

const clearChangeBatch = () => {
    batchUpdateForm.material_id = null;
    batchUpdateForm.mfg_date = null;
    batchUpdateForm.batch = null;
    batchUpdateForm.reason = null;
    batchUpdateForm.miller_name = null;
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
    <div class="d-flex flex-wrap gap-4 align-center justify-center">
        <SearchInput class="flex-grow-1" @update:search="handleSearch" />

        <v-btn class="d-flex align-center" prepend-icon="ri-equalizer-line" @click="filterModalOpen">
            <template #prepend>
                <v-icon color="white"></v-icon>
            </template>
            Filter
        </v-btn>
        <v-btn @click="handleRegister">Register RFID
        </v-btn>

        <v-btn :loading="exportLoading" class="d-flex align-center" prepend-icon="ri-download-line" @click="exportData">
            <template #prepend>
                <v-icon color="white"></v-icon>
            </template>
            Export
        </v-btn>

        <!-- Disable if no selected items or selected items has no batch yet -->
        <v-btn @click="changeBatch" v-if="authStore.user.is_super_admin || authStore.user.is_warehouse_admin"
            :disabled="selectedItems.length === 0 || selectedItems.every(item => item.batch === null)" class="px-5"
            type="button" color="primary-light">
            Change Batch
        </v-btn>

        <v-btn @click="handleTagAsWeak" :disabled="selectedItems.length === 0" class="px-5" type="button"
            color="warning">
            Tag as Weak
        </v-btn>
    </div>
    <div class="mb-2" v-if="selectedItems.length > 0">
        <span class="text-h6 font-weight-medium text-high-emphasis">
            Selected items count: ({{ selectedItems.length }})
        </span>
    </div>
    <VCard>

        <!-- TODO:: Update condition  -->
        <!-- v-bind="authStore.user.is_super_admin || authStore.user.is_warehouse_admin ? { showSelect: true, 'v-model': selectedItems, returnObject: true } : {}" -->
        <VDataTableServer v-model:items-per-page="itemsPerPage" v-model="selectedItems" :headers="headers" show-select
            return-object :items="serverItems" :items-length="totalItems" :loading="pageLoading" item-value="id"
            :search="searchValue" @update:options="loadItems" class="text-no-wrap">

            <template #item.plant="{ item }">
                {{ item.plant_name }}
            </template>

            <template #item.physical_id="{ item }">
                {{ item.name }}
            </template>

            <template #item.weak_signal="{ item }">
                <v-badge v-if="item.is_weak_signal" color="error" content="Yes" class="text-uppercase" inline></v-badge>
            </template>

            <template #item.type="{ item }">
                <span class="text-uppercase">{{ item.type }}</span>
            </template>

            <template #item.rfid_code="{ item }">
                <span @click="handleViewRfid(item)"
                    class="text-primary font-weight-bold cursor-pointer hover-underline">
                    {{ item.rfid_code }}
                </span>
            </template>

            <template #item.epc="{ item }">
                <v-btn variant="outlined" @click="viewEpc(item)" color="info">
                    View EPC
                </v-btn>
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
                    <th>RFID Code</th>
                    <th>Physical ID</th>
                    <th>EPC</th>
                    <th>TID</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="(item, index) in epcData" :key="index">
                    <td>{{ item.rfid_code }}</td>
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

    <EditingModal @close="changeBatchModal = false" max-width="900px" :show="changeBatchModal"
        :dialog-title="`Change Batch Assignment`">
        <template #default>
            <v-form @submit.prevent="handleChangeBatch">
                <v-row>
                    <v-col cols="12" md="6">
                        <v-select label="Select Material" density="compact" :items="materialsOption"
                            v-model="batchUpdateForm.material_id"
                            :rules="[value => !!value || 'Please select an item from the list']" />
                    </v-col>
                    <v-col cols="12" md="6">
                        <DatePicker v-model="batchUpdateForm.mfg_date" placeholder="Select Manufacturing Date" />
                    </v-col>
                </v-row>
                <v-text-field class="mt-4" density="compact" label="Miller Name"
                    v-model="batchUpdateForm.miller_name" />
                <v-textarea class="mt-4" clear-icon="ri-close-line" label="Reason" v-model="batchUpdateForm.reason"
                    clearable></v-textarea>

            </v-form>
            <VAlert v-if="errorMessage" class="mt-4" color="error" variant="tonal">
                {{ errorMessage }}
            </VAlert>
            <v-table class="mt-4">
                <thead>
                    <tr>
                        <th>RFID Code</th>
                        <th>Physical ID</th>
                        <th>Material</th>
                        <th>Receipt Date</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(item, index) in selectedItems" :key="index">
                        <td>{{ item.rfid_code }}</td>
                        <td>{{ item.name }}</td>
                        <td>{{ item.material_name ?? 'N/A' }}</td>
                        <td>
                            {{ item.mfg_date ? Moment(item.mfg_date).format('MMMM D, YYYY') : '' }}
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

    <EditingModal @close="taggingModal = false" max-width="900px" :show="taggingModal"
        :dialog-title="`Tag RFID as Weak`">
        <template #default>
            <div class="mx-4 font-">
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
