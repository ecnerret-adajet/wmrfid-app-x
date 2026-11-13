<script setup>
import Loader from '@/components/Loader.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import { useAuthStore } from '@/stores/auth';
import { debounce } from 'lodash';
import Moment from 'moment';
import { computed, onMounted, ref, watch } from 'vue';
import alcDatatable from './alcDatatable.vue';
import datatable from './datatable.vue';

const authStore = useAuthStore();
const todayStr = Moment().format('YYYY-MM-DD');

const defaultFilters = () => ({
    plant: null, // Stores the full plant object or at least { id, title/code }
    storageLocation: null, // Stores the full sloc object
    dateFrom: todayStr,
    dateTo: todayStr,
    pallet_assignment: 1,
    batch_pick: authStore.user?.is_warehouse === true ? 2 : 1,
    final_weight: 1,
});

const filters = ref(defaultFilters());

const searchInput = ref(''); // committed search term, only updated when Search is clicked
const searchValue = ref(''); // committed search term, only updated when Search is clicked
const datatableRef = ref(null);
const tablePerPage = ref(50);
const tablePage = ref(1);
const tableSort = ref('-created_at')
const totalItems = ref(0);
const isLoading = ref(false);
const pageLoading = ref(false);
const toast = ref({
    message: 'Success message',
    color: 'success',
    show: false
});

const plantsOption = ref([]);
const storageLocationsOption = ref([]);
const floorscaleRequestDialog = ref(false);
const floorscaleRequestSaving = ref(false);
const floorscaleRequestError = ref('');
const floorscalePoNumber = ref(null);
const floorscaleFormSubmitted = ref(false);
const floorscalePlant = ref(null);
const floorscaleSloc = ref(null);
const floorscaleStorageLocations = computed(() => floorscalePlant.value?.storage_locations || []);
const floorscalePoSearch = ref('');
const availableFloorscalePoNumbers = ref([]);
const availableFloorscalePoLoading = ref(false);
const availableFloorscalePoError = ref('');
let availableFloorscalePoRequest = 0;
const selectedFloorscalePo = computed(() =>
    availableFloorscalePoNumbers.value.find(option => option.po_number === floorscalePoNumber.value) || null
);
const floorscalePoLineItemHeaders = [
    { title: 'LINE ITEM', key: 'po_item' },
    { title: 'MATERIAL', key: 'material_code' },
    { title: 'DESCRIPTION', key: 'material_description' },
    { title: 'QUANTITY', key: 'qty', align: 'end' },
    { title: 'UOM', key: 'uom' },
];

const fetchAvailableFloorscalePoNumbers = async (search = '') => {
    const requestId = ++availableFloorscalePoRequest;
    const plantCode = floorscalePlant.value?.plant_code;
    const sloc = floorscaleSloc.value?.code;
    if (!floorscaleRequestDialog.value || !plantCode || !sloc) return;

    availableFloorscalePoLoading.value = true;
    availableFloorscalePoError.value = '';
    try {
        const response = await ApiService.query(
            `transfer-orders/get-available-po/${encodeURIComponent(plantCode)}/${encodeURIComponent(sloc)}`,
            { params: { search: String(search || '').trim(), limit: 10 } }
        );
        if (requestId !== availableFloorscalePoRequest) return;
        if (!Array.isArray(response.data)) {
            throw new Error('Unexpected response while loading available purchase orders.');
        }
        availableFloorscalePoNumbers.value = response.data
            .filter(option => option && option.po_number != null)
            .map(option => ({
                ...option,
                po_number: String(option.po_number),
                purchase_order_items: Array.isArray(option.purchase_order_items) ? option.purchase_order_items : [],
            }));
    } catch (error) {
        if (requestId !== availableFloorscalePoRequest) return;
        console.error('Failed to load available floorscale purchase orders:', error);
        availableFloorscalePoError.value = error.response?.data?.message || error.message || 'Could not load available purchase orders.';
    } finally {
        if (requestId === availableFloorscalePoRequest) availableFloorscalePoLoading.value = false;
    }
};

const debouncedFetchAvailableFloorscalePoNumbers = debounce(fetchAvailableFloorscalePoNumbers, 3000);

const onFloorscalePoSearch = search => {
    if (!floorscalePlant.value?.plant_code || !floorscaleSloc.value?.code || search === floorscalePoNumber.value) return;
    floorscalePoNumber.value = null;
    availableFloorscalePoRequest++;
    availableFloorscalePoLoading.value = true;
    availableFloorscalePoNumbers.value = [];
    debouncedFetchAvailableFloorscalePoNumbers(search);
};

watch(
    [floorscaleRequestDialog, () => floorscalePlant.value?.plant_code, () => floorscaleSloc.value?.code],
    ([isOpen, plantCode, sloc]) => {
        debouncedFetchAvailableFloorscalePoNumbers.cancel();
        availableFloorscalePoRequest++;
        floorscalePoSearch.value = '';
        availableFloorscalePoNumbers.value = [];
        availableFloorscalePoError.value = '';
        floorscalePoNumber.value = null;

        if (isOpen && plantCode && sloc) {
            fetchAvailableFloorscalePoNumbers();
        } else {
            availableFloorscalePoLoading.value = false;
        }
    },
    { flush: 'sync' }
);

const openFloorscaleRequest = () => {
    floorscalePoNumber.value = null;
    const assignedPlant = authStore.user?.assigned_plant;
    floorscalePlant.value = plantsOption.value.find(plant => plant.id === assignedPlant?.id) || null;
    const assignedSlocCode = assignedPlant?.default_storage_location?.code;
    floorscaleSloc.value = assignedSlocCode != null
        ? floorscaleStorageLocations.value.find(sloc => sloc.code === assignedSlocCode) || null
        : null;
    floorscaleRequestError.value = '';
    floorscaleFormSubmitted.value = false;
    floorscaleRequestDialog.value = true;
};

const submitFloorscaleRequest = async () => {
    if (floorscaleRequestSaving.value) return;
    floorscaleFormSubmitted.value = true;
    floorscaleRequestError.value = '';
    console.log('Submitting floorscale request with:', {
        po_number: floorscalePoNumber.value,
        plant_code: floorscalePlant.value?.plant_code,
        sloc: floorscaleSloc.value?.code
    });
    const plantCode = String(floorscalePlant.value?.plant_code ?? '').trim();
    const sloc = String(floorscaleSloc.value?.code ?? '').trim();
    if (!plantCode || !sloc) {
        floorscaleRequestError.value = 'Select a plant and storage location with valid codes.';
        return;
    }
    if (!floorscaleStorageLocations.value.some(location => location.id === floorscaleSloc.value.id)) {
        floorscaleRequestError.value = 'Select a storage location belonging to the selected plant.';
        return;
    }
    if (!floorscalePoNumber.value) return;

    floorscaleRequestSaving.value = true;
    try {
        await ApiService.post('transfer-orders/floorscale-requests', {
            po_number: floorscalePoNumber.value,
            plant_code: plantCode,
            sloc,
        });
        floorscaleRequestDialog.value = false;
        toast.value = { message: 'Floorscale request created successfully.', color: 'success', show: true };
    } catch (error) {
        console.error('Failed to create floorscale request:', error);
        floorscaleRequestError.value = error.response?.data?.message || 'Could not create the floorscale request. Please try again.';
    } finally {
        floorscaleRequestSaving.value = false;
    }
};

onMounted(() => {
    fetchDataDropdown();
});

const fetchDataDropdown = async () => {
    try {
        pageLoading.value = true;
        const response = await ApiService.get('/users/get-data-dropdown');
        const { plants } = response.data;
        plantsOption.value = plants;

        // Default to the user's assigned plant
        const assignedPlantId = authStore.user?.assigned_plant?.id;
        const defaultPlant = assignedPlantId ? plantsOption.value.find(p => p.id === assignedPlantId) : null;
        const defaultStorageLocation = defaultPlant?.storage_locations?.[0] || null;

        if (defaultPlant) {
            filters.value.plant = defaultPlant;
            storageLocationsOption.value = defaultPlant.storage_locations;
            if (defaultStorageLocation) {
                filters.value.storageLocation = defaultStorageLocation;
            }

            // Re-fetch since the datatable's initial load already ran before the default plant/storage location resolved
            applyFilter();
        }

    } catch (error) {
        console.error('Error fetching dropdown data:', error);
    } finally {
        pageLoading.value = false;
    }
};

// Watch for plant changes to update storage locations list
watch(
    () => filters.value.plant,
    (newPlant) => {
        
        if (newPlant) {
             const selectedPlant = plantsOption.value.find(p => p.id === newPlant.id);
             storageLocationsOption.value = selectedPlant ? selectedPlant.storage_locations : [];

             // If the current sloc doesn't belong to the new plant, clear it
             if (filters.value.storageLocation && (!selectedPlant?.storage_locations.find(sl => sl.id === filters.value.storageLocation.id))) {
                 filters.value.storageLocation = null;
             }
        } else {
            storageLocationsOption.value = [];
            filters.value.storageLocation = null;
        }
    }
);

const applyFilter = () => {
    searchValue.value = searchInput.value;
    if (datatableRef.value) {
        datatableRef.value.applyFilters({
            search: searchValue.value,
            dateFrom: filters.value.dateFrom,
            dateTo: filters.value.dateTo,
            plant_id: filters.value.plant?.id,
            storage_location_id: filters.value.storageLocation?.id,
            plant_code: filters.value.plant?.plant_code,
            sloc: filters.value.storageLocation?.code,
            batch_pick: filters.value.batch_pick,
            final_weight: filters.value.final_weight,
            valid_material_only: true,
        });
    }
}

const resetFilter = () => {
    filters.value = defaultFilters();
    searchInput.value = '';
    searchValue.value = '';
    if (datatableRef.value) {
        datatableRef.value.applyFilters([]);
    }
}

const onPaginationChanged = ({ page, itemsPerPage, sortBy, search, totalItems: itemCount }) => {
    tableSort.value = sortBy
    tablePage.value = page
    tablePerPage.value = itemsPerPage
    searchValue.value = search
    totalItems.value = itemCount ?? 0
}

</script>

<template>
    <VCard variant="flat" border class="mb-5 position-relative bg-grey-75" 
        style="border-left: 4px solid rgb(var(--v-theme-primary)) !important;
        background-color: rgb(var(--v-table-header-color));">
        <VCardText class="pa-4 pa-sm-6">
            <VRow align="center" justify="space-between" class="ga-3">
                <VCol cols="12" sm="8">
                    <div class="d-flex align-center ga-4">
                        <VAvatar color="primary" variant="tonal" rounded="lg" size="52">
                            <VIcon icon="ri-truck-line" size="28" />
                        </VAvatar>
                        <div>
                            <div class="text-h4 font-weight-bold">STO Issuance</div>
                            <div class="text-body-2 text-medium-emphasis mt-1">
                                Batch and pallet reservation for STO line items
                            </div>
                        </div>
                    </div>
                </VCol>
                <VCol cols="12" sm="auto" class="d-flex justify-sm-end">
                    <VChip color="primary" variant="tonal" size="large" prepend-icon="ri-file-list-3-line">
                        {{ totalItems.toLocaleString('en-US') }} {{ totalItems === 1 ? 'item' : 'items' }}
                    </VChip>
                </VCol>
            </VRow>
        </VCardText>
    </VCard>
    <VRow no-gutters align="center">
        <VCol md="6" cols="12" class="pe-md-2 pb-2 pb-md-0">
            <VTextField
                v-model="searchInput"
                persistent-placeholder
                placeholder="Search PO Number"
                append-inner-icon="ri-search-line"
                single-line
                hide-details
                density="compact"
            />
        </VCol>
        <VCol md="3" cols="12" class="pe-md-2 pb-2 pb-md-0">
            <v-select
                label="Plant"
                density="compact"
                :items="plantsOption"
                item-title="title"
                item-value="id"
                v-model="filters.plant"
                clearable
                variant="outlined"
                return-object
                hide-details
            ></v-select>
        </VCol>
        <VCol md="3" cols="12" class="pb-2 pb-md-0">
            <v-select
                label="Storage Location"
                density="compact"
                :items="storageLocationsOption"
                item-title="name"
                item-value="id"
                v-model="filters.storageLocation"
                clearable
                variant="outlined"
                :disabled="!filters.plant"
                return-object
                hide-details
            ></v-select>
        </VCol>
    </VRow>

    <VRow no-gutters align="center" class="mb-4 mt-4">
        <VCol md="2" cols="12" class="pe-md-2 pb-2 pb-md-0">
            <v-text-field v-model="filters.dateFrom" label="Date From" type="date" density="compact" variant="outlined" hide-details />
        </VCol>
        <VCol md="2" cols="12" class="pe-md-2 pb-2 pb-md-0">
            <v-text-field v-model="filters.dateTo" label="Date To" type="date" density="compact" variant="outlined" hide-details />
        </VCol>
        <!-- <VCol md="2" cols="12" class="pe-md-2 pb-2 pb-md-0">
            <v-select label="Pallet Assignment"
                density="compact" :items="[
                    { title: 'All', value: null },
                    { title: 'Pending', value: 1 },
                    { title: 'Partial', value: 2 },
                    { title: 'Completed', value: 3 }
                ]" v-model="filters.pallet_assignment">
            </v-select>
        </VCol> -->
        <VCol md="2" cols="12" class="pe-md-2 pb-2 pb-md-0">
            <v-select label="Batch Pick"
                density="compact" :items="[
                    { title: 'All', value: null },
                    { title: 'No Batch Picked', value: 1 },
                    { title: 'Batch Picked', value: 2 }
                ]" v-model="filters.batch_pick">
            </v-select>
        </VCol>
        <VCol v-if="authStore.user?.is_warehouse === true" md="2" cols="12" class="pe-md-2 pb-2 pb-md-0">
            <v-select label="Final Weight"
                density="compact" :items="[
                    { title: 'All', value: null },
                    { title: 'No Final Weight', value: 1 },
                    { title: 'Final Weight', value: 2 }
                ]" v-model="filters.final_weight">
            </v-select>
        </VCol>
        <VCol :md="authStore.user?.is_warehouse === true ? 4 : 6" cols="12" class="d-flex justify-md-end flex-wrap ga-2 pb-2 pb-md-0">
            <PrimaryButton type="button" @click="applyFilter" :loading="isLoading">
                <i class="ri-search-eye-line mr-2"></i>
                Search
            </PrimaryButton>
            <VBtn v-if="authStore.user?.is_warehouse === true" color="primary" variant="tonal" prepend-icon="ri-add-line" @click="openFloorscaleRequest">
                New Floorscale Request
            </VBtn>
        </VCol>

    </VRow>

    <VCard>
        <component :is="authStore.user?.is_warehouse === true ? alcDatatable : datatable"
            ref="datatableRef" @pagination-changed="onPaginationChanged"
            :initial-filters="{
                dateFrom: filters.dateFrom,
                dateTo: filters.dateTo,
                plant_id: filters.plant?.id,
                storage_location_id: filters.storageLocation?.id,
                plant_code: filters.plant?.plant_code,
                sloc: filters.storageLocation?.code,
                batch_pick: filters.batch_pick,
                final_weight: filters.final_weight,
                valid_material_only: true,
            }"
        />
    </VCard>

    <VDialog v-model="floorscaleRequestDialog" max-width="900" scrollable :persistent="floorscaleRequestSaving">
        <VCard rounded="lg">
            <VCardTitle class="floorscale-request__header pa-5 pa-sm-6">
                <div class="d-flex align-start ga-3">
                    <VAvatar color="primary" variant="tonal" rounded="lg" size="48" class="flex-shrink-0">
                        <VIcon icon="ri-scales-3-line" size="24" />
                    </VAvatar>
                    <div class="flex-grow-1 text-wrap">
                        <div class="text-h5 font-weight-bold">New Floorscale Request</div>
                        <div class="text-body-2 text-medium-emphasis mt-1">Select a purchase order to request floorscale processing.</div>
                    </div>
                    <VBtn icon="ri-close-line" variant="text" size="small" aria-label="Close dialog" :disabled="floorscaleRequestSaving" @click="floorscaleRequestDialog = false" />
                </div>
            </VCardTitle>

            <VCardText class="pa-5 pa-sm-6">
                <VAlert v-if="floorscaleRequestError" type="error" variant="tonal" class="mb-4">
                    {{ floorscaleRequestError }}
                </VAlert>
                <div class="text-subtitle-1 font-weight-bold mb-1">Request location</div>
                <div class="text-body-2 text-medium-emphasis mb-4">Select the plant and storage location for this request.</div>
                <VRow dense class="mb-4">
                    <VCol cols="12" sm="6">
                        <VSelect
                            v-model="floorscalePlant"
                            :items="plantsOption"
                            item-title="title"
                            item-value="id"
                            label="Plant"
                            prepend-inner-icon="ri-building-line"
                            variant="outlined"
                            return-object
                            clearable
                            :disabled="floorscaleRequestSaving"
                            :error-messages="floorscaleFormSubmitted && !floorscalePlant ? 'Select a plant.' : []"
                            @update:model-value="floorscaleSloc = null"
                        />
                    </VCol>
                    <VCol cols="12" sm="6">
                        <VSelect
                            v-model="floorscaleSloc"
                            :items="floorscaleStorageLocations"
                            item-title="name"
                            item-value="code"
                            label="Storage Location"
                            prepend-inner-icon="ri-map-pin-line"
                            variant="outlined"
                            return-object
                            clearable
                            :disabled="!floorscalePlant || floorscaleRequestSaving"
                            :error-messages="floorscaleFormSubmitted && !floorscaleSloc ? 'Select a storage location.' : []"
                        />
                    </VCol>
                </VRow>
                <VAutocomplete
                    v-model="floorscalePoNumber"
                    v-model:search="floorscalePoSearch"
                    :items="availableFloorscalePoNumbers"
                    item-title="po_number"
                    item-value="po_number"
                    label="PO Number"
                    placeholder="Select a PO number"
                    prepend-inner-icon="ri-file-list-3-line"
                    variant="outlined"
                    no-filter
                    @update:search="onFloorscalePoSearch"
                    :loading="availableFloorscalePoLoading"
                    :disabled="floorscaleRequestSaving || !floorscalePlant || !floorscaleSloc"
                    :no-data-text="availableFloorscalePoError ? 'Could not load purchase orders' : 'No available POs for this plant and storage location'"
                    :error-messages="floorscaleFormSubmitted && !floorscalePoNumber ? 'Select an available PO number.' : []"
                />
                <VAlert v-if="availableFloorscalePoError" type="error" variant="tonal" density="comfortable" class="mt-3">
                    {{ availableFloorscalePoError }}
                </VAlert>
                <div v-if="selectedFloorscalePo" class="mt-5">
                    <div class="text-subtitle-1 font-weight-bold mb-2">Line Items</div>
                    <VTable density="comfortable" class="border rounded">
                        <thead>
                            <tr>
                                <th v-for="header in floorscalePoLineItemHeaders" :key="header.key" :class="header.align === 'end' ? 'text-end' : ''">
                                    {{ header.title }}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(lineItem, index) in selectedFloorscalePo.purchase_order_items" :key="lineItem.id ?? `${lineItem.po_item}-${index}`">
                                <td>{{ lineItem.po_item || '-' }}</td>
                                <td>{{ lineItem.material_code || '-' }}</td>
                                <td>{{ lineItem.material_description || '-' }}</td>
                                <td class="text-end">{{ lineItem.qty ?? '-' }}</td>
                                <td>{{ lineItem.uom || '-' }}</td>
                            </tr>
                            <tr v-if="!selectedFloorscalePo.purchase_order_items.length">
                                <td :colspan="floorscalePoLineItemHeaders.length" class="text-center text-medium-emphasis py-4">
                                    No line items returned for this purchase order.
                                </td>
                            </tr>
                        </tbody>
                    </VTable>
                </div>
            </VCardText>
            <VDivider />
            <VCardActions class="px-5 px-sm-6 py-4">
                <VSpacer />
                <VBtn color="secondary" variant="outlined" :disabled="floorscaleRequestSaving" @click="floorscaleRequestDialog = false">Cancel</VBtn>
                <VBtn color="primary" variant="flat" type="button" @click="submitFloorscaleRequest" prepend-icon="ri-send-plane-line" :loading="floorscaleRequestSaving">Submit Request</VBtn>
            </VCardActions>
    
        </VCard>
    </VDialog>

    <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event"/>
    <Loader :show="pageLoading" />

</template>

<style scoped>
.floorscale-request__header {
    background: rgba(var(--v-theme-primary), 0.06);
}
</style>
