<script setup>
import Loader from '@/components/Loader.vue';
import MapBlockAssignModal from '@/components/MapBlockAssignModal.vue';
import SearchInput from '@/components/SearchInput.vue';
import SmartAssignModal from '@/components/SmartAssignModal.vue';
import Toast from '@/components/Toast.vue';
import { useAuthorization } from '@/composables/useAuthorization';
import ApiService from '@/services/ApiService';
import { useAuthStore } from '@/stores/auth';
import axios from 'axios';
import { debounce } from 'lodash';
import Moment from 'moment';
import { computed, onMounted, reactive, ref } from 'vue';
import { GridItem, GridLayout } from 'vue-grid-layout-v3';
import { useRoute, useRouter } from 'vue-router';

const { authUserCan } = useAuthorization();
const authStore = useAuthStore();
const props = defineProps({
});

const state = reactive({
    layout: [],
    draggable: true,
    resizable: true,
    colNum: 12,
    index: 0,
    inventories: null,
    inventoriesCount: 0,
    layers: [],
    lot: null,
    id: null,
    max_layer_count: 3,
    legend_only: false
});

const route = useRoute();
const router = useRouter();
const storageLocation = route.params.location;
const plantCode = route.params.plant;
const searchValue = ref(route.query.search || '');
const loading = ref(true);
const mapLoading = ref(true);
const layersData = ref(null);
const isFiltered = ref(false);
const openAssignModal = ref(false);
const storageLocationModel = ref(null);
const smartAssignModal = ref(false);
const selectedBlock = reactive({
    layers: [],
    data: null
})
const selectedStatus = ref(null);
const pageLoading = ref(false);

const floatingPalletDialog = ref(false);
const floatingPalletLoading = ref(false);
const floatingPalletItems = ref([]);
const floatingPalletTotal = ref(0);
const floatingPalletItemsPerPage = ref(10);
const floatingPalletPage = ref(1);
const floatingPalletSortQuery = ref('-created_at');
const floatingPalletSearchValue = ref('');
const floatingPalletFilters = reactive({
    plant_code: plantCode || null,
    storage_location: storageLocation || null,
    location: storageLocation || null,
});
const floatingPalletHeaders = [
    { title: 'Pallet ID', key: 'physical_id', align: 'start', sortable: false },
    { title: 'Batch', key: 'batch', sortable: false },
    { title: 'Quantity', key: 'quantity', sortable: false, align: 'center' },
    { title: 'Mfg Date', key: 'mfg_date', sortable: false },
    { title: 'Pallet Status', key: 'commodity_status_id', sortable: false, align: 'center' },
];

const toast = ref({
    message: '',
    color: 'success',
    show: false
});

const handleSearch = debounce((search) => {
    searchValue.value = search;
}, 500);

const isFiltering = computed(() => searchValue.value.trim() !== '');

// Evaluates text match state
const matchesSearchText = (item) => {
    if (!searchValue.value || searchValue.value.trim() === '') return true;

    const search = searchValue.value.toLowerCase().trim();

    if (item.type === 'block') {
        return (item.inventories || []).some(inventory => {
            const matchesPhysicalId = String(inventory?.physical_id || '').toLowerCase().includes(search);
            const matchesBatch = String(inventory?.batch || '').toLowerCase().includes(search);
            
            return matchesPhysicalId || matchesBatch;
        });
    }

    return false;
};

// Evaluates status match state
const matchesStatusFilter = (item) => {
    if (selectedStatus.value === null || selectedStatus.value === undefined) return true;
    
    // Always keep structural Lot headers matching to preserve top-level map grid canvas layout context
    if (item.type === 'lot') return true; 

    const targetStatus = selectedStatus.value;
    const isFumigation = item.under_fumigation === true || 
                         item.under_fumigation === 1 || 
                         item.under_fumigation === '1' ||
                         item.under_fumigation === 'true';

    const isInspection = item.for_quality_inspection === true || 
                         item.for_quality_inspection === 1 || 
                         item.for_quality_inspection === '1' ||
                         item.for_quality_inspection === 'true';

    if (targetStatus === 7) {
        return isFumigation; // Under Fumigation
    } else if (targetStatus === 3) {
        return isInspection; // For Quality Inspection
    } else if (targetStatus === 1) {
        return !isFumigation && !isInspection; // Good: Neither condition is active
    }

    return false;
};

// Unified computed tracking property
const filteredLayout = computed(() => {
    const hasSearchText = searchValue.value && searchValue.value.trim() !== '';
    const hasStatusFilter = selectedStatus.value !== null && selectedStatus.value !== undefined;
    const isAnyFilterActive = hasSearchText || hasStatusFilter;

    return state.layout.map(item => {
        // Must clear both text AND status checks to stay highlighted
        const textMatched = matchesSearchText(item);
        const statusMatched = matchesStatusFilter(item);
        const fullyMatched = textMatched && statusMatched;

        return {
            ...item,
            dimmed: isAnyFilterActive && !fullyMatched,
            clickable: fullyMatched || !isAnyFilterActive
        };
    });
});

onMounted(() => {
    state.index = state.layout.length;
    // Check for search query in the route params and set the search value
    if (route.query.search) {
        searchValue.value = route.query.search;
    }
    fetchStorageLocationInformation()
})

const statisticsData = ref(null);
const fetchStorageLocationInformation = async () => {
    state.layout = [];
    loading.value = true;
    try {
        const response = await axios.get(`warehouse/get-storage-location-information/${plantCode}/${storageLocation}`);
        const { details, statistics } = response.data

        statisticsData.value = statistics;
        storageLocationModel.value = details.storage_location
        layersData.value = details.layers_data;

        state.layout = details.blocks?.map((item, index) => ({
            i: String(index),
            x: item.x || 0, // Default to 0 if x is not provided
            y: item.y || 0, // Default to 0 if y is not provided
            w: item.w || 3, // Default width
            h: item.h || 2, // Default height
            label: item.label || 'Unnamed', // Use name from API
            type: item.type || 'unknown',
            isResizable: item.is_resizable || item.is_resizable == 1 ? true : false,
            inventories: item.inventories || null,
            inventoriesCount: item.inventories_count || 0,
            layers: item.layers || [],
            lot: item.lot || null,
            id: item.id || null,
            under_fumigation: item.under_fumigation,
            for_quality_inspection: item.for_quality_inspection,
            allowMultipleMaterials: item.storage_location?.blocks_allow_multiple_materials == 1 ? true : false,
            // for_quality_inspection: item.for_quality_inspection,
            max_layer_count: item.max_layer_count || 3,
            legend_only: item.legend_only == 1 ? true : false,
            qr_code_path: item.qr_code_path || null,
        }));

        state.index = state.layout.length;
    } catch (error) {
        console.error('Error fetching data:', error);
    } finally {
        loading.value = false;
        mapLoading.value = false;
    }
};

const handleBlockClick = async (item) => {
    console.log(item)
    selectedBlock.data = item;
    pageLoading.value = true
    try {
        const lotLabel = item?.lot?.label || '';
        const shouldForceEmptyLayers = /(wrapping|rtm|bay)/i.test(lotLabel);

        if (shouldForceEmptyLayers) {
            selectedBlock.layers = [];
            return;
        }

        const blockId = item.id || item.block_id;
        if (!blockId) {
            selectedBlock.layers = item.layers || [];
        } else {
            const response = await axios.get(`warehouse/${blockId}/get-block-layers`);
            const endpointLayers = response.data?.layers || response.data?.details?.layers || response.data?.data;
            selectedBlock.layers = Array.isArray(endpointLayers) ? endpointLayers : (item.layers || []);
        }
    } catch (error) {
        console.error('Error fetching block layers:', error);
        selectedBlock.layers = item.layers || [];
    } finally {
        pageLoading.value = false;
        openAssignModal.value = true;
    }
}

const onAssignSuccess = () => {
    fetchStorageLocationInformation()
    openAssignModal.value = false;
    searchValue.value = '';
    isFiltered.value = false;
    toast.value.message = 'Inventory assigned successfully!';
    toast.value.color = 'success';
    toast.value.show = true;
}

const actionSuccess = (type) => {
    // Set toast message and color based on action type
    const isReturnToMill = type === 'Return to Mill';
    toast.value.message = isReturnToMill
        ? 'Returned to mill successfully!'
        : 'Bin transferred successfully!';
    toast.value.color = 'success';
    toast.value.show = true;

    fetchStorageLocationInformation();

    openAssignModal.value = false;
};

const handleBack = () => {
    router.push({
        path: `/warehouse`,
    });
}

const handleEditMap = () => {
    router.push({
        path: `/warehouse-map/${plantCode}/${storageLocation}/edit`,
    });
}

const statusOption = [
    { title: 'Good', label: 'Good', value: 1 },
    { title: 'Under Fumigation', label: 'Under Fumigation', value: 7 },
    { title: 'For Quality Inspection', label: 'For Quality Inspection', value: 3 },
];

const handleFilterStatus = (statusValue) => {
    selectedStatus.value = statusValue;
    isFiltered.value = statusValue !== null && statusValue !== undefined;
};

const loadFloatingPalletItems = ({ page, itemsPerPage, sortBy }) => {
    floatingPalletLoading.value = true;

    if (sortBy && sortBy.length > 0) {
        const sort = sortBy[0];
        floatingPalletSortQuery.value = `${sort.key}`;
        if (sort.order === 'desc') {
            floatingPalletSortQuery.value = `-${sort.key}`;
        }
    } else {
        floatingPalletSortQuery.value = '-created_at';
    }

    ApiService.query('reports/datatable/floating-pallets', {
        params: {
            page,
            itemsPerPage,
            sort: floatingPalletSortQuery.value,
            search: floatingPalletSearchValue.value,
            filters: floatingPalletFilters,
        },
    })
        .then((response) => {
            const payload = response.data;

            if (payload.table) {
                floatingPalletItems.value = payload.table.data || [];
                floatingPalletTotal.value = payload.table.total || 0;
            }
        })
        .catch((error) => {
            console.error('Error loading floating pallets:', error);
        })
        .finally(() => {
            floatingPalletLoading.value = false;
        });
};

const openFloatingPalletDialog = () => {
    if ((statisticsData.value?.floating_pallets ?? 0) === 0) return;

    floatingPalletDialog.value = true;
    loadFloatingPalletItems({
        page: floatingPalletPage.value,
        itemsPerPage: floatingPalletItemsPerPage.value,
        sortBy: [{ key: 'created_at', order: 'desc' }],
    });
};

</script>

<template>
    <v-skeleton-loader v-if="mapLoading" type="article"></v-skeleton-loader>
    <v-card v-else elevation="2" class="mx-4 mt-4 px-3 sticky-top-card" style="border-radius: 0px !important;">
        <v-card-title  class="d-flex justify-space-between align-center">
            <div class="d-inline-flex align-center">
                <v-btn @click="handleBack()" color="grey-700" icon="ri-arrow-left-line"
                    variant="text"></v-btn>
                <h4 class="font-weight-black text-uppercase text-primary">
                    {{ storageLocationModel?.plant?.plant_code }} - 
                    {{ storageLocationModel?.plant?.name }} / 
                    {{ storageLocationModel?.code ??''  }} - 
                    {{ storageLocationModel?.name ??'' }}
                    Map
                </h4>
            </div>
            <div class="d-flex justify-end">
                <v-btn color="primary-light" v-if="authUserCan('edit.warehouses')"  @click="handleEditMap"
                    class="px-12 mr-2 text-grey-100">
                    Edit Map
                </v-btn>
            </div>
        </v-card-title>

        <v-card-text>
            <v-row no-gutters class="align-center">
                
                <v-col cols="12" md="auto" class="mb-4 mb-md-0">
                    <div class="d-flex align-center flex-wrap ga-2">
                        <v-chip size="default" variant="elevated" color="grey-300">Empty: {{ statisticsData?.available_space ?? 0 }}</v-chip>
                        <v-chip size="default" variant="elevated" color="#ebc965">1-Pallet High: {{ statisticsData?.pallet_high_1 ?? 0 }}</v-chip>
                        <v-chip size="default" variant="elevated" color="#4877f7">2-Pallet High: {{ statisticsData?.pallet_high_2 ?? 0 }}</v-chip>
                        <v-chip size="default" variant="elevated" color="primary">3-Pallet High: {{ statisticsData?.pallet_high_3 ?? 0 }}</v-chip>
                        <v-chip size="default" variant="elevated" color="#a06ee2">4-Pallet High: {{ statisticsData?.pallet_high_4 ?? 0 }}</v-chip>
                        <v-chip size="default" variant="elevated">Total Pallets: {{ statisticsData?.total_pallets ?? 0 }}</v-chip>
                    </div>
                </v-col>

                <v-spacer class="d-none d-md-block" />
                <v-row dense class="align-center">
                    <v-col cols="12" md="6" class="d-flex align-center">
                        <v-select 
                            style="min-width: 250px; width: 100%;" 
                            clearable 
                            label="Filter by Status" 
                            density="compact"
                            hide-details
                            :items="statusOption" 
                            v-model="selectedStatus" 
                            @update:model-value="handleFilterStatus" 
                        />
                    </v-col>

                    <v-col cols="12" md="6">
                        <SearchInput 
                            style="min-width: 250px; width: 100%;" 
                            placeholder="Filter by physical ID or batch" 
                            hide-details
                            @update:search="handleSearch" 
                        />
                    </v-col>
                </v-row>
            </v-row>

            <v-row dense>
                <v-col cols="12" sm="6" md="3">
                    <v-card variant="outlined" class="px-4 py-1 text-center">
                        <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold">Total Pallet Capacity</div>
                        <div class="text-h4 font-weight-black text-primary mt-1">{{ statisticsData?.total_blocks ?? 0 }}</div>
                    </v-card>
                </v-col>

                <v-col cols="12" sm="6" md="3">
                    <v-card variant="outlined" class="px-4 py-1 text-center">
                        <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold">Occupied Positions</div>
                        <div class="text-h4 font-weight-black text-warning mt-1">{{ statisticsData?.taken_space ?? 0 }}</div>
                    </v-card>
                </v-col>

                <v-col cols="12" sm="6" md="3">
                    <v-card variant="outlined" class="px-4 py-1 text-center">
                        <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold">Available Positions</div>
                        <div class="text-h4 font-weight-black text-success mt-1">{{ statisticsData?.available_space ?? 0 }}</div>
                    </v-card>
                </v-col>

                <v-col cols="12" sm="6" md="3">
                    <v-card
                        variant="outlined"
                        class="px-4 py-1 text-center floating-pallet-card"
                        :class="{ 'floating-pallet-card--clickable': (statisticsData?.floating_pallets ?? 0) > 0 }"
                        @click="(statisticsData?.floating_pallets ?? 0) > 0 && openFloatingPalletDialog()"
                    >
                        <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold">Floating Pallets</div>
                        <div class="text-h4 font-weight-black text-error mt-1">{{ statisticsData?.floating_pallets ?? 0 }}</div>
                    </v-card>
                </v-col>
            </v-row>
        </v-card-text>

        <div class="d-flex justify-end">
            <!-- <v-btn color="primary-light" @click="smartAssignModal = true" class="px-8 mr-6 text-grey-100">
                Smart Assign
            </v-btn> -->
        </div>
    </v-card>
    
    <v-progress-linear v-if="mapLoading" indeterminate color="primary"></v-progress-linear>
    <div v-else>
        <v-card elevation="2" class="mx-4 mt-2">
            


            <!-- Map area  -->
            <div class="grid-scroll-wrapper">
                <v-progress-linear v-if="loading" indeterminate color="primary"></v-progress-linear>
                <GridLayout class="border mt-2 grid-layout" v-model:layout="filteredLayout"
                    v-else-if="state.layout.length > 0" :col-num="130" :row-height="25" style="min-height: 200px;"
                    :is-draggable="false" :is-resizable="false" :responsive="false" :vertical-compact="false"
                    :prevent-collision="true" :use-css-transforms="true" :margin="[2, 0]">
                    <GridItem v-for="item in filteredLayout" :key="item.i" :static="item.static" :x="item.x" :y="item.y"
                        :w="item.w" :h="item.h" :i="item.i" :min-w="2.5" :min-h="2" :class="{
                            'cursor-pointer': item.type !== 'lot' && item.clickable,
                            'bg-legend': item.type === 'lot' && (item.legend_only === true),
                            'bg-primary-light': item.type === 'lot' && !item.legend_only,
                            'under-fumigation': item.under_fumigation,
                            'layer-1': item.type !== 'lot' && item.inventoriesCount === 1,
                            'layer-2': item.type !== 'lot' && item.inventoriesCount === 2,
                            'layer-3': item.type !== 'lot' && item.inventoriesCount === 3,
                            'layer-4': item.type !== 'lot' && item.inventoriesCount === 4,
                            'empty-layer': item.type !== 'lot' && item.inventoriesCount === 0,
                            'dimmed-block': item.dimmed,
                            'highlighted-block': !item.dimmed
                        }" @click="item.type !== 'lot' && item.clickable && handleBlockClick(item)"
                        :is-resizable="false">

                        <div v-if="item.type === 'lot' && (item.legend_only || item.legend_only === true)"
                            class="legend-text">
                            {{ item.label }}
                        </div>

                        <div v-else class="text" :class="{
                            'dimmed-block': item.dimmed,
                            'highlighted-block': !item.dimmed
                        }">
                            {{ item.label }}
                        </div>
                    </GridItem>
                </GridLayout>
                <div v-else class="border mt-2"
                    style="min-height: 200px; display: flex; align-items: center; justify-content: center;">
                    <p class="text-center mt-4 text-h4 font-weight-bold">No results found</p>
                </div>
            </div>
        </v-card>
    </div>


    <MapBlockAssignModal :storage-location="storageLocation" :plant="plantCode" :block="selectedBlock"
        @assign-success="onAssignSuccess" @action-success="actionSuccess" :show="openAssignModal"
        @close="openAssignModal = false" />

    <SmartAssignModal :storage-location="storageLocation" :plant="plantCode" :show="smartAssignModal"
        @assign-success="onAssignSuccess" @close="smartAssignModal = false" />

    <v-dialog v-model="floatingPalletDialog" max-width="1100" persistent scrollable>
        <v-card>
            <v-card-title class="d-flex justify-space-between align-center">
                <div>
                    <span class="text-h5 font-weight-bold">Floating Pallets</span><br/>
                    <span class="text-subtitle-1 text-medium-emphasis">List of pallets that are not assigned to any bin.</span>
                </div>
                <v-btn icon variant="text" @click="floatingPalletDialog = false">
                    <v-icon>ri-close-line</v-icon>
                </v-btn>
            </v-card-title>

            <v-card-text class="pt-2">
                <div class="d-flex justify-end mb-4">
                    <SearchInput
                        class="w-100"
                        placeholder="Search pallet"
                        @update:search="(val) => { floatingPalletSearchValue = val; loadFloatingPalletItems({ page: floatingPalletPage, itemsPerPage: floatingPalletItemsPerPage, sortBy: [{ key: 'created_at', order: 'desc' }] }); }"
                    />
                </div>

                <VDataTableServer
                    v-model:items-per-page="floatingPalletItemsPerPage"
                    :headers="floatingPalletHeaders"
                    :items="floatingPalletItems"
                    :items-length="floatingPalletTotal"
                    :loading="floatingPalletLoading"
                    item-value="id"
                    @update:options="loadFloatingPalletItems"
                    class="floating-pallet-table"
                >
                    <template #item.pallet_id="{ item }">
                        {{ item.pallet_id ?? item.id ?? item.pallet?.id ?? 'N/A' }}
                    </template>

                    <template #item.batch="{ item }">
                        {{ item.batch ?? item.inventory?.batch ?? 'N/A' }}
                    </template>

                    <template #item.commodity_status_id="{ item }">
                        <v-chip
                            :color="item.commodity_status_id == '1' ? 'primary' : item.commodity_status_id == '3' ? 'warning' : 'secondary'"
                            size="small"
                            class="px-2"
                        >
                            {{ item.commodity_status_id ? (item.commodity_status_id == '1' ? 'Good' : item.commodity_status_id == '3' ? 'For QI' : 'Pending') : 'N/A' }}
                        </v-chip>
                    </template>

                    <template #item.quantity="{ item }">
                        {{ item.quantity ?? item.qty ?? item.inventory?.quantity ?? 0 }}
                    </template>

                    <template #item.mfg_date="{ item }">
                        {{ item.mfg_date ? Moment(item.mfg_date).format('MMM D, YYYY') : 'N/A' }}
                    </template>
                </VDataTableServer>
            </v-card-text>
        </v-card>
    </v-dialog>

    <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event" />
    <Loader :show="pageLoading" />

</template>

<style scoped>
.grid-scroll-wrapper {
    overflow-x: auto;
    overflow-y: hidden;
    min-width: 100%;
    min-height: 250px;
}

.grid-layout {
    width: max-content;
    min-width: 2500px;
    /* ensure grid has a minimum visible width */
    min-height: 250px;
}

.dimmed-block {
    opacity: 0.1;
    pointer-events: none;
    transition: opacity 0.6s ease;
}

.bg-legend {
    background-color: white !important;
}

.vue-grid-item .legend-text {
    font-size: 16px;
    color:black;
    position: absolute;
    top: 0px;
    bottom: 0;
    left: 0;
    right: 0;
    height: 100%;
    width: 100%;
    display: flex;
    align-items: center;
    /* Vertically center */
    justify-content: center;
    /* Horizontally center */
    text-align: center;
}

.highlighted-block {
    opacity: 1;
    pointer-events: auto;
    transition: opacity 0.6s ease;
}

.layer-1 {
    background-color: #ebc965;
    color: white;
}

.layer-2 {
    background-color: #4877f7;
    color: white;
}

.layer-3 {
    background-color: #48a348;
    color: white;
}

.layer-4 {
    background-color: #a06ee2;
    color: white;
}

.empty-layer {
    background-color: #f0edf2;
}

.vue-grid-layout {
    margin: 0;
    padding: 5px;
}

.vue-grid-item {
    margin-left: 0 !important;
    /* Remove left margin */
    margin-right: 0 !important;
    /* Remove right margin */
    padding: 0 !important;
}

.vue-grid-item:not(.vue-grid-placeholder) {
    border: 1px solid black;
}

.floating-pallet-card {
    transition: all 0.2s ease;
}

.floating-pallet-card--clickable {
    cursor: pointer;
}

.floating-pallet-card--clickable:hover {
    background-color: rgba(255, 76, 81, 0.04);
}

.floating-pallet-table :deep(.v-data-table__td),
.floating-pallet-table :deep(.v-data-table__th) {
    white-space: nowrap;
}



.vue-grid-item {
    /* min-height: 40px; */
    /* min-width: 40px; */
}

.vue-grid-item .text {
    font-size: 12px;
    text-align: center;
    position: absolute;
    top: 10px !important;
    bottom: 0;
    left: 0;
    right: 0;
    height: 100%;
    width: 100%;
}

.vue-grid-item .remove {
    position: absolute;
    top: 0;
    cursor: pointer;
}

.layoutJSON {
    width: 1200px !important;
    background: #ddd;
    border: 1px solid black;
    margin-top: 10px;
    padding: 1px;
}

.sticky-top-card {
    position: sticky;
    top: 0;
    z-index: 100; /* Keeps info header above warehouse grid layers */
    background-color: white !important;
    border-radius: 0px !important;
    box-shadow: 0 4px 20px 0 rgba(0, 0, 0, 0.1) !important;
}
</style>
