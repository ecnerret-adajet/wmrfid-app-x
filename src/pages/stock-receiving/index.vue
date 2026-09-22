<script setup>
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import { useAuthStore } from '@/stores/auth';
import { useStockReceivingStore } from '@/stores/stockReceivingStore';
import Moment from 'moment';
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const authStore = useAuthStore();
const stockReceivingStore = useStockReceivingStore();
const todayStr = Moment().format('YYYY-MM-DD');
const searchValue = ref('');
const itemsPerPage = ref(50);
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
    plant_code: null,
    dateFrom: todayStr,
    dateTo: todayStr,
});


const form = reactive({
    loading: false,
    refresh: false,
    posting_date_from: null,
    posting_date_to: null,
});

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

const fetchDataDropdown = async () => {
    pageLoading.value = true;
    try {
        const response = await ApiService.get('/users/get-data-dropdown');
        const { plants } = response.data;
        plantsOption.value = plants;

        // Default to the user's assigned plant
        const assignedPlantId = authStore.user?.assigned_plant?.id;
        const defaultPlant = assignedPlantId ? plantsOption.value.find(p => p.id === assignedPlantId) : null;
        const defaultStorageLocation = defaultPlant?.storage_locations?.[0] || null;

        if (defaultPlant) {
            filters.plant = defaultPlant;
            // Re-fetch since the datatable's initial load already ran before the default plant/storage location resolved
            // applyFilter();
        }

    } catch (error) {
        console.error('Error fetching dropdown data:', error);
    } finally {
        pageLoading.value = false;
    }
};

const loadItems = async ({ page: pageNum, itemsPerPage: perPage }) => {
    if (!filters.plant) {
        pageLoading.value = false;
        return;
    }
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
        if (filters.dateFrom) {
            params.start_date = filters.dateFrom;
        }
        if (filters.dateTo) {
            params.end_date = filters.dateTo;
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
    loadItems({
        page: 1,
        itemsPerPage: itemsPerPage.value,
    });
};

const refreshList = () => {
    // Sync date range to form
    if (dateRange.value && dateRange.value.length === 2) {
        form.posting_date_from = dateRange.value[0];
        form.posting_date_to = dateRange.value[1];
    } else {
        form.posting_date_from = null;
        form.posting_date_to = null;
    }

    form.loading = true;
    form.refresh = true;
    ApiService.query('download-313?from_date=' + form.posting_date_from + '&to_date=' + form.posting_date_to)
        .then(({ data }) => {
            form.refresh = false;
            loadItems({
                page: 1,
                itemsPerPage: itemsPerPage.value,
            });
        })
        .catch((error) => {
            console.error('Error refreshing stock receiving:', error);
            form.refresh = false;
            form.loading = false;
            toast.value = {
                message: 'Failed to refresh stock receiving data.',
                color: 'error',
                show: true
            };
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
        params: { id: item.id }
    });
};

const cancelReceiving = (item) => {
    router.push({
        name: 'apps-stock-transfer-receiving-cancel',
        params: { id: item.stock_transfer_id }
    });
};

const actionList = (item) => {
    const actions = [
        { title: 'View', key: 'view' },
        { title: 'Cancel', key: 'cancel' },
    ];

    // if (item.status == 'Received' || item.status == 'Reversed') {
    //     actions.push({ title: 'Cancel', key: 'cancel' });
    // }

    return actions;
};

const handleAction = (item, action) => {
    if (action.key == 'view') {
        viewReceiving(item);
    } else if (action.key == 'cancel') {
        cancelReceiving(item);
    }
};

onMounted(() => {
    fetchDataDropdown();
});
</script>

<template>
    <div>
        <!-- Filter Row -->
        <div class="d-flex flex-wrap gap-4 align-center justify-center">

            <SearchInput class="flex-grow-1" placeholder="Search material document.." @update:search="handleSearch"/>

            <!-- Plant Filter -->
            <v-select
                style="max-width: 350px;"
                class="flex-grow-1 align-center"
                label="Filter by Plant"
                density="compact"
                :items="plantsOption"
                v-model="filters.plant"
                clearable
            />

            <VCol md="2" cols="12" >
                <v-text-field v-model="filters.dateFrom" label="Posting Date From" type="date" density="compact" variant="outlined" hide-details />
            </VCol>
            <VCol md="2" cols="12" >
                <v-text-field v-model="filters.dateTo" label="Posting Date To" type="date" density="compact" variant="outlined" hide-details />
            </VCol>

            <!-- Search Button -->
            <v-btn class="d-flex align-center" prepend-icon="ri-search-eye-line" @click="handleSearch">
                <template #prepend>
                    <v-icon color="white"></v-icon>
                </template>
                Search
            </v-btn>

            <!-- Get Receiving Button -->
            <v-btn
                class="d-flex align-center"
                prepend-icon="ri-refresh-line"
                color="primary"
                :loading="form.refresh"
                :disabled="form.refresh"
                @click="refreshList"
            >
                <template #prepend>
                    <v-icon color="white"></v-icon>
                </template>
                Get Receiving
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
                    <span>{{ Moment(item.posting_date).format('YYYY-MM-DD') }}</span>
                </template>

                <template #item.material_document="{ item }">
                    <span class="font-weight-bold">{{ item.material_document }}</span>
                </template>

                <template #item.year="{ item }">
                    <span>{{ item.year }}</span>
                </template>

                <template #item.issuing="{ item }">
                    <span v-if="item.stock_transfer313_sap_downloads">
                        {{ item.stock_transfer313_sap_downloads[0]?.plant }}
                        {{ plantDescription(item.stock_transfer313_sap_downloads[0]?.plant) }}
                    </span>
                </template>

                <template #item.receiving="{ item }">
                    <span v-if="item.stock_transfer313_sap_downloads">
                        {{ item.stock_transfer313_sap_downloads[0]?.plant }}
                        {{ plantDescription(item.stock_transfer313_sap_downloads[0]?.plant) }}
                        <br>
                        {{ item.stock_transfer313_sap_downloads[0]?.sloc }}
                        {{ slocDescription(item.stock_transfer313_sap_downloads[0]?.sloc, item.stock_transfer313_sap_downloads[0]?.plant) }}
                    </span>
                </template>

                <template #item.items_count="{ item }">
                    <v-chip size="small" color="info">
                        {{ item.stock_transfer313_sap_downloads_count || 0 }}
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
                    <div v-else class="d-flex flex-column align-center ga-1">
                        <v-chip size="small" color="warning" text-color="white">
                            <v-icon start size="small">ri-alert-line</v-icon>
                            For Receiving
                        </v-chip>
                        <v-chip v-if="item?.stock_transfer?.cancelled_stock_transfer_items.length > 0" size="small" color="error" text-color="white">
                            <v-icon start size="small">ri-close-circle-line</v-icon>
                            With Cancelled Item(s)
                        </v-chip>
                    </div>
                </template>

                <template #item.actions="{ item }">
                    <div class="d-flex justify-center">
                        <v-menu location="start">
                            <template #activator="{ props }">
                                <v-btn icon="ri-more-2-line" variant="text" v-bind="props" color="grey"></v-btn>
                            </template>
                            <v-list>
                                <v-list-item
                                    v-for="(action, i) in actionList(item)"
                                    :key="i"
                                    :value="i"
                                    @click="handleAction(item, action)"
                                >
                                    <v-list-item-title>{{ action.title }}</v-list-item-title>
                                </v-list-item>
                            </v-list>
                        </v-menu>
                    </div>
                </template>
            </VDataTableServer>
        </VCard>

        <Toast :show="toast.show" :color="toast.color" :message="toast.message" @update:show="toast.show = $event" />
    </div>
</template>
