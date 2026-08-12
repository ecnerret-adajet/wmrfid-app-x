<script setup>
import DateRangePicker from '@/components/DateRangePicker.vue';
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import { useStockReceivingStore } from '@/stores/stockReceivingStore';
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const stockReceivingStore = useStockReceivingStore();

const searchValue = ref('');
const itemsPerPage = ref(15);
const page = ref(1);
const pageLoading = ref(false);

const toast = ref({
    message: '',
    color: 'success',
    show: false
});

// Plant options
const plantsOption = ref([]);
const plantsLoaded = ref(false);

// Storage location options
const storageLocationsOption = ref([]);

const filters = reactive({
    plant: null,
    start_date: null,
    end_date: null,
});

const dateRange = ref(null);

const headers = [
    { title: 'Posting Date', key: 'posting_date', sortable: true },
    { title: 'Material Document', key: 'material_document', sortable: true },
    { title: 'Material Doc. Year', key: 'year', sortable: true },
    { title: 'Issuing', key: 'issuing', sortable: false },
    { title: 'Receiving', key: 'receiving', sortable: false },
    { title: 'Items', key: 'items_count', align: 'center', sortable: false },
    { title: 'Received', key: 'status', align: 'center', sortable: false },
    { title: 'Action', key: 'actions', align: 'center', sortable: false },
];

const loadPlants = async () => {
    try {
        const response = await ApiService.get('managed-plant-storage-locations');
        plantsOption.value = (response.data.plants ?? [])
            .filter(item => item.name !== null)
            .map(item => ({ value: item.plant_code, title: item.name }));
        storageLocationsOption.value = (response.data.storage_locations ?? [])
            .map(item => ({ value: item.code, title: item.name, plant_id: item.plant_id }));
        plantsLoaded.value = true;
    } catch (error) {
        console.error(error);
        plantsLoaded.value = true;
    }
};

const loadItems = async ({ page: pageNum, itemsPerPage: perPage }) => {
    pageLoading.value = true;
    page.value = pageNum;

    try {
        const params = {
            page: pageNum,
            itemsPerPage: perPage,
        };

        if (searchValue.value) {
            params.search = searchValue.value;
        }
        if (filters.plant) {
            params.plant = filters.plant;
        }
        if (filters.start_date) {
            params.start_date = filters.start_date;
        }
        if (filters.end_date) {
            params.end_date = filters.end_date;
        }

        await stockReceivingStore.fetchStockReceiving(params);
    } catch (error) {
        console.error('Error loading stock receiving:', error);
        toast.value = {
            message: 'Failed to load stock receiving data.',
            color: 'error',
            show: true
        };
    } finally {
        pageLoading.value = false;
    }
};

const handleSearch = () => {
    // Sync date range to filters
    if (dateRange.value && dateRange.value.length === 2) {
        filters.start_date = dateRange.value[0];
        filters.end_date = dateRange.value[1];
    } else {
        filters.start_date = null;
        filters.end_date = null;
    }

    loadItems({
        page: 1,
        itemsPerPage: itemsPerPage.value,
    });
};

const plantDescription = (plantCode) => {
    const plant = plantsOption.value.find(p => p.value === plantCode);
    return plant ? plant.title : '';
};

const slocDescription = (slocCode, plantCode) => {
    if (!slocCode) return '';
    const plant = plantsOption.value.find(p => p.value === plantCode);
    const sloc = storageLocationsOption.value.find(s => s.value === slocCode && s.plant_id === plant?.id);
    return sloc ? sloc.title : '';
};

const viewReceiving = (item) => {
    router.push({
        name: 'apps-stock-transfer-receiving-view',
        params: { stock_transfer_receiving_id: item.id }
    });
};

onMounted(() => {
    loadPlants();
});
</script>

<template>
    <div>
        <!-- Filter Row -->
        <div class="d-flex flex-wrap gap-4 align-center justify-center">

             <SearchInput class="flex-grow-1" @update:search="(val) => { searchValue = val; handleSearch(); }" />
                
            <!-- Search by Material Code -->
            <!-- <VTextField
                v-model="searchValue"
                label="Search"
                placeholder="Search by material code..."
                append-inner-icon="ri-search-line"
                single-line
                hide-details
                density="compact"
                class="flex-grow-1"
                style="max-width: 300px;"
                @keyup.enter="handleSearch"
            /> -->

            <!-- Plant Filter -->
            <v-select
                style="max-width: 350px;"
                class="flex-grow-1 align-center mt-1"
                label="Filter by Plant"
                density="compact"
                :items="plantsOption.length > 1 ? [{ title: 'All', value: null }, ...plantsOption] : plantsOption"
                v-model="filters.plant"
                clearable
            />

            <!-- Date Range Picker -->
            <div style="max-width: 350px;" class="flex-grow-1">
               <!-- <label class="font-weight-bold text-caption">Date Range</label>  -->
                <DateRangePicker v-model="dateRange" />
            </div>

            <!-- Search Button -->
            <v-btn class="d-flex align-center" prepend-icon="ri-search-eye-line" @click="handleSearch">
                <template #prepend>
                    <v-icon color="white"></v-icon>
                </template>
                Search
            </v-btn>
        </div>

        <!-- Data Table -->
        <VCard>
            <VDataTableServer
                v-model:items-per-page="itemsPerPage"
                :headers="headers"
                :items="stockReceivingStore.items"
                :items-length="stockReceivingStore.totalItems"
                :loading="pageLoading"
                item-value="id"
                @update:options="loadItems"
                class="text-no-wrap"
            >
                <template #item.posting_date="{ item }">
                    <span>{{ item.posting_date }}</span>
                </template>

                <template #item.material_document="{ item }">
                    <span class="font-weight-bold">{{ item.material_document }}</span>
                </template>

                <template #item.year="{ item }">
                    <span>{{ item.year }}</span>
                </template>

                <template #item.issuing="{ item }">
                    <span v-if="item.stock_transfer_313_sap_downloads">
                        {{ item.stock_transfer_313_sap_downloads[0]?.plant }}
                        {{ plantDescription(item.stock_transfer_313_sap_downloads[0]?.plant) }}
                    </span>
                </template>

                <template #item.receiving="{ item }">
                    <span v-if="item.stock_transfer_313_sap_downloads">
                        {{ item.stock_transfer_313_sap_downloads[0]?.plant }}
                        {{ plantDescription(item.stock_transfer_313_sap_downloads[0]?.plant) }}
                        <br>
                        {{ item.stock_transfer_313_sap_downloads[0]?.sloc }}
                        {{ slocDescription(item.stock_transfer_313_sap_downloads[0]?.sloc, item.stock_transfer_313_sap_downloads[0]?.plant) }}
                    </span>
                </template>

                <template #item.items_count="{ item }">
                    <v-chip size="small" color="info">
                        {{ item.stock_transfer_313_sap_downloads_count || 0 }}
                    </v-chip>
                </template>

                <template #item.status="{ item }">
                    <div v-if="item.status == 'Received'">
                        <v-chip size="small" color="success" text-color="white">
                            <v-icon start size="small">ri-checkbox-circle-line</v-icon>
                            Received
                        </v-chip>
                    </div>
                    <div v-else-if="item.status == 'Reversed'">
                        <v-chip size="small" color="error" text-color="white">
                            <v-icon start size="small">ri-error-warning-line</v-icon>
                            Reversed
                        </v-chip>
                    </div>
                    <div v-else>
                        <v-chip size="small" color="warning" text-color="white">
                            <v-icon start size="small">ri-alert-line</v-icon>
                            For Receiving
                        </v-chip>
                    </div>
                </template>

                <template #item.actions="{ item }">
                    <div class="d-flex justify-center align-center gap-1">
                        <IconBtn size="small" title="View" @click="viewReceiving(item)">
                            <VIcon icon="ri-eye-line" />
                        </IconBtn>
                    </div>
                </template>
            </VDataTableServer>
        </VCard>

        <Toast :show="toast.show" :color="toast.color" :message="toast.message" @update:show="toast.show = $event" />
    </div>
</template>
