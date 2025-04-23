<script setup>
import { default as AddingModal } from '@/components/AddingModal.vue';
import DateTimePicker from '@/components/DateTimePicker.vue';
import FilteringModal from '@/components/FilteringModal.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import JwtService from '@/services/JwtService';
import { useAuthStore } from '@/stores/auth';
import '@vuepic/vue-datepicker/dist/main.css';
import axios from 'axios';
import { debounce } from 'lodash';
import Moment from 'moment';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const dialogVisible = ref(false)
const searchValue = ref('');
const isLoading = ref(false);
const errorMessage = ref(null)
const productionLinesOption = ref([])
const materialsOption = ref([]);
const tagTypesOption = ref([]);
const filterModalVisible = ref(false);
const storageLocations = ref([]);
const statisticsData = ref(null);
const pageLoading = ref(false);
const authStore = useAuthStore();
const triggerEndDialog = ref(false);
const selectedProductionRun = ref(null);
const triggerEndLoading = ref(false);
const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref(null); // Default sort

onMounted(() => {
    fetchDropdownData();
})

const filterModalOpen = () => {
    if (!filterModalVisible.value) {
        filterModalVisible.value = true;
    }
};

const fetchDropdownData = async () => {
    pageLoading.value = true;
    try {
        const token = JwtService.getToken();
        const response = await axios.get(`/production-runs/get-data-dropdown`, {
            params: {
                filters: filters
            },
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const { materials, production_lines, tag_types, storage_locations, statistics } = response.data
        console.log(response.data);
        statisticsData.value = statistics
        productionLinesOption.value = production_lines.map(item => ({
            value: item.id,
            title: item.name 
        }));
        tagTypesOption.value = tag_types.map(item => ({
            value: item.id,
            title: item.name 
        }));
        materialsOption.value = materials.map(item => ({
            value: item.id,
            title: `${item.code} - ${item.description}`
        }));
        storageLocations.value = storage_locations.map(item => ({
            value: item.id,
            title: item.name,
            name: item.name
        }));
        
    } catch (error) {
        console.log(error);
    } finally {
        pageLoading.value = false;
    }
};

const handleSearch = debounce((search) => {
    searchValue.value = search;
}, 500);


const openDialog = () => {
    if (!dialogVisible.value) {
        dialogVisible.value = true;
    }
};

const form = ref({
    'material_id': null,
    'production_line_id': null,
    'start_date_time': null,
    'end_date_time': null,
});

const submit = async () => {
    isLoading.value = true;
    toast.value.show = false;
    try {
        const response = await ApiService.post('production-runs/store', form.value)
    
        loadItems({ page: page.value, itemsPerPage: itemsPerPage.value, sortBy: [{key: 'start_date_time', 'order': 'desc'}], search: searchValue.value });
        
        isLoading.value = false;
        dialogVisible.value = false
        toast.value.message = 'New production run successfully created!'
        toast.value.show = true;
        form.value.material_id = null;
        form.value.production_line_id = null;
        form.value.start_date_time = null;
        form.value.end_date_time = null;
        errorMessage.value = null;
    } catch (error) {
        errorMessage.value = error.response?.data?.message || 'An unexpected error occurred.';
        console.error('Error submitting:', error);
        isLoading.value = false;
    }
}

const filters = reactive({
    start_date_time: null,
    tag_type_id: null,
    storage_location_id: null,
});

const isFiltersEmpty = computed(() => {
    return !filters.start_date_time && 
           !filters.tag_type_id
});

const applyFilter = () => {
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{ key: sortQuery.value.replace('-', ''), 
        order: sortQuery.value.startsWith('-') ? 'desc' : 'asc' }]
    });
    filterModalVisible.value = false;
}

const resetFilter = () => {
    clearFilters();
    loadItems({ page: page.value, itemsPerPage: itemsPerPage.value, sortBy: [{key: 'start_date_time', 'order': 'desc'}], search: searchValue.value });
    filterModalVisible.value = false;
}

const clearFilters = () => {
    filters.start_date_time = null;
    filters.tag_type_id = null;
    filters.storage_location_id = null;
};

const headers = [
    {
        title: 'MATERIAL',
        key: 'material_id',
    },
    {
        title: 'BATCH',
        key: 'batch',
    },
    {
        title: 'MFG DATE',
        key: 'latest_mfg_date',
    },
    {
        title: 'QUANTITY',
        key: 'total_quantity',
        align: 'center',
    },
    {
        title: 'TYPE',
        key: 'rfid_type',
        align: 'center',
        sortable: false,
    },
    {
        title: 'START DATE',
        key: 'start_date_time',
    },
    {
        title: 'END DATE',
        key: 'end_date_time',
        align: 'center',
    },
]

const loadItems = ({ page, itemsPerPage, sortBy, search }) => {
    loading.value = true
    if (sortBy && sortBy.length > 0) {
        const sort = sortBy[0];  // Assuming single sort field
        sortQuery.value = `${sort.key}`;  // Default ascending order
        if (sort.order === 'desc') {
            sortQuery.value = `-${sort.key}`;  // Prefix with minus for descending order
        }
    } else {
        sortQuery.value = '-start_date_time';
    }

    ApiService.query('datatable/production-runs',{
        params: {
            page,
            itemsPerPage,
            sort: sortQuery.value,
            search: searchValue.value,
            filters: filters
        }
        })
        .then((response) => {
            console.log(response.data.data);
            totalItems.value = response.data.total;
            serverItems.value = response.data.data
            loading.value = false

        })
        .catch((error) => {
            console.log(error);
        });
}

watch(() => filters.storage_location_id, () => {
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{ key: sortQuery.value.replace('-', ''), 
        order: sortQuery.value.startsWith('-') ? 'desc' : 'asc' }]
    });

    fetchDropdownData()
});

const toast = ref({
    message: 'Production run trigger end successfully!',
    color: 'success',
    show: false
});

const handleEndProductionRun = async () => {
    triggerEndLoading.value = true
    try {
        const response = await axios.put(`production-runs/${selectedProductionRun.value.id}/trigger-end`);
        loadItems({
            page: page.value,
            itemsPerPage: itemsPerPage.value,
            sortBy: [{ key: sortQuery.value.replace('-', ''), 
            order: sortQuery.value.startsWith('-') ? 'desc' : 'asc' }]
        });
        fetchDropdownData() // Should reset the statistics data
        toast.value.message = 'Production run end trigger successfully!'
        toast.value.color = 'success';
        toast.value.show = true;
    } catch (error) {
        errorMessage.value = error.response?.data?.message || 'An unexpected error occurred.';
        console.error('Error updating:', error);
    } finally {
        triggerEndLoading.value = null;
        triggerEndDialog.value = false
    } 
}

const triggerEnd = (item) => {
    selectedProductionRun.value = item;
    triggerEndDialog.value = true;
}


const handleViewBatch = (item) => {
    router.push(`/production-runs/${item.generated_batch}`);
}

</script>

<template>
    <div class="d-flex flex-wrap gap-4 align-center justify-center">
        <SearchInput class="flex-grow-1" @update:search="handleSearch" />

        <v-btn
            class="d-flex align-center"
            prepend-icon="ri-equalizer-line"
            @click="filterModalOpen"
        >
            <template #prepend>
            <v-icon color="white"></v-icon>
            </template>
            Filter
        </v-btn>

        <v-select style="max-width: 300px;" class="flex-grow-1 align-center mt-1" label="Filter by Warehouse" density="compact"
            :items="[{ title: 'All', value: null }, ...storageLocations]" v-model="filters.storage_location_id"
            :rules="[value => value !== undefined || 'Please select an item from the list']"
        >
        </v-select>

        <v-btn
            v-if="authStore.user.is_super_admin || authStore.user.is_warehouse_admin "
            class="d-flex justify-center align-center"
            @click="openDialog"
        >
            Add New Production Run
        </v-btn>
    </div>

    <v-row class="match-height my-4">
        <v-col cols="3">
            <v-skeleton-loader  v-if="pageLoading" type="article"></v-skeleton-loader>
            <v-card v-else
                class="pa-4 bg-grey-50"
                elevation="2"
                style="border-radius: 4px;"
            >
                <div class="d-flex align-center justify-space-between">
                    <div class="d-flex align-center">
                        <div
                            class="d-flex align-center justify-center mr-4"
                            style="
                                width: 48px;
                                height: 48px;
                                background-color: #e8f5e9;
                                border-radius: 12px;
                            "
                        >
                            <v-icon
                                icon="ri-play-circle-line"
                                color="success"
                                size="24"
                            ></v-icon>
                        </div>
                        <div>
                            <span class="text-subtitle-1 font-weight-bold text-grey-700">
                                Active Runs
                            </span>
                            <div class="text-h4 font-weight-bold text-primary mt-1">
                                {{ statisticsData?.active_runs_data?.total_active_runs || 0 }}
                            </div>
                            <div>
                                <span class="text-subtitle-2 font-weight-thin text-grey-600">
                                    Out of {{ statisticsData?.active_runs_data?.total_runs || 0 }} production 
                                    {{ statisticsData?.active_runs_data?.total_runs > 1 ? 'runs' : 'run' }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Call to Action Button -->
                    <!-- <v-btn
                        color="primary"
                        variant="outlined"
                    >
                        View Items
                    </v-btn> -->
                </div>
            </v-card>
        </v-col>
        <v-col cols="3">
            <v-skeleton-loader  v-if="pageLoading" type="article"></v-skeleton-loader>
            <v-card v-else
                class="pa-4 bg-grey-50"
                elevation="2"
                style="border-radius: 4px;"
            >
                <div class="d-flex align-center justify-space-between">
                    <div class="d-flex align-center">
                        <div
                            class="d-flex align-center justify-center mr-4"
                            style="
                                width: 48px;
                                height: 48px;
                                background-color: #e8f5e9;
                                border-radius: 12px;
                            "
                        >
                            <v-icon
                                icon="ri-time-line"
                                color="success"
                                size="24"
                            ></v-icon>
                        </div>
                        <div>
                            <span class="text-subtitle-1 font-weight-bold text-grey-700">
                                Average Run Time
                            </span>
                            <div class="text-h4 font-weight-bold text-primary mt-1">
                                {{ statisticsData?.average_run_time_data?.formatted || 0 }}
                            </div>
                            <div>
                                <span class="text-subtitle-2 font-weight-thin text-grey-600">
                                    Based on {{ statisticsData?.average_run_time_data?.runs_considered.length || 0 }} production
                                    {{ statisticsData?.average_run_time_data?.runs_considered.length > 1 ? 'runs' : 'run' }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Call to Action Button -->
                    <!-- <v-btn
                        color="primary"
                        variant="outlined"
                    >
                        View Items
                    </v-btn> -->
                </div>
            </v-card>
        </v-col>
        <v-col cols="3">
            <v-skeleton-loader  v-if="pageLoading" type="article"></v-skeleton-loader>
            <v-card v-else
                class="pa-4 bg-grey-50"
                elevation="2"
                style="border-radius: 4px;"
            >
                <div class="d-flex align-center justify-space-between">
                    <div class="d-flex align-center">
                        <div
                            class="d-flex align-center justify-center mr-4"
                            style="
                                width: 48px;
                                height: 48px;
                                background-color: #e8f5e9;
                                border-radius: 12px;
                            "
                        >
                            <v-icon
                                icon="ri-box-3-line"
                                color="success"
                                size="24"
                            ></v-icon>
                        </div>
                        <div>
                            <span class="text-subtitle-1 font-weight-bold text-grey-700">
                                Today's Ouput
                            </span>
                            <div class="text-h4 font-weight-bold text-primary mt-1">
                                {{ statisticsData?.todays_output?.total_items_produced_today }}
                            </div>
                            <div>
                                <span class="text-subtitle-2 font-weight-thin text-grey-600">
                                    Across {{ statisticsData?.todays_output?.runs_considered.length || 0 }} production
                                    {{ statisticsData?.todays_output?.runs_considered.length > 1 ? 'runs' : 'run' }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Call to Action Button -->
                    <!-- <v-btn
                        color="primary"
                        variant="outlined"
                    >
                        View Items
                    </v-btn> -->
                </div>
            </v-card>
        </v-col>
        <v-col cols="3">
            <v-skeleton-loader  v-if="pageLoading" type="article"></v-skeleton-loader>
            <v-card v-else
                class="pa-4 bg-grey-50"
                elevation="2"
                style="border-radius: 4px;"
            >
                <div class="d-flex align-center justify-space-between">
                    <div class="d-flex align-center">
                        <div
                            class="d-flex align-center justify-center mr-4"
                            style="
                                width: 48px;
                                height: 48px;
                                background-color: #e8f5e9;
                                border-radius: 12px;
                            "
                        >
                            <v-icon
                                icon="ri-bar-chart-grouped-line"
                                color="success"
                                size="24"
                            ></v-icon>
                        </div>
                        <div>
                            <span class="text-subtitle-1 font-weight-bold text-grey-700">
                                Today's Most Produced
                            </span>
                            <div class="text-h4 font-weight-bold text-primary mt-1">
                                {{ statisticsData?.todays_most_produced?.total_count || 0 }}
                            </div>
                            <div>
                                <span v-if="statisticsData?.todays_most_produced?.material_description || statisticsData?.todays_most_produced?.bu_material" class="text-subtitle-2 font-weight-thin text-grey-600">
                                    {{ statisticsData?.todays_most_produced?.material_description }} - {{ statisticsData?.todays_most_produced?.bu_material }}
                                </span>
                                <span v-else class="text-subtitle-2 font-weight-thin text-grey-600">
                                    No material found
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Call to Action Button -->
                    <!-- <v-btn
                        color="primary"
                        variant="outlined"
                    >
                        View Items
                    </v-btn> -->
                </div>
            </v-card>
        </v-col>
    </v-row>

    <VCard>
        <VDataTableServer
            v-model:items-per-page="itemsPerPage"
            :headers="headers"
            :items="serverItems"
            :items-length="totalItems"
            :loading="loading"
            item-value="id"
            :search="searchValue"
            @update:options="loadItems"
            class="text-no-wrap"
        >

            <template #item.batch="{ item }">
                <span @click="handleViewBatch(item)" class="text-primary font-weight-bold cursor-pointer hover-underline">
                    {{ item.generated_batch }}
                </span>
            </template>

            <template #item.material_id="{ item }">
                {{ item.material?.description }}
            </template>

            <template #item.production_line_id="{ item }">
                {{ item.production_run?.production_line?.name }}
            </template>

            <template #item.latest_mfg_date="{ item }">
                <span v-if="item.latest_mfg_date">{{ item.latest_mfg_date ? Moment(item.latest_mfg_date).format('MMMM D, YYYY') : '' }}</span>
                <v-chip
                    v-else
                    color="warning"
                    size="small">
                    Pending
                </v-chip>
            </template>

            <template #item.rfid_type="{ item }">
                <span v-if="item.rfid_type !== 'Unknown'">{{ item.rfid_type }}</span>
                <v-chip
                    v-else
                    color="warning"
                    size="small">
                    Pending
                </v-chip>
            </template>

            <template #item.total_quantity="{ item }">
                {{ item.total_quantity }}
            </template>

            <template #item.start_date_time="{ item }">
                {{ item.start_date_time ? Moment(item.start_date_time).format('MMMM D, YYYY h:mm A') : '' }}
            </template>

            <template #item.end_date_time="{ item }">
                <div v-if="item.end_date_time">
                    {{ item.end_date_time ? Moment(item.end_date_time).format('MMMM D, YYYY h:mm A') : '' }}
                </div>
                <div v-else>
                    <v-btn class="px-2" @click="triggerEnd(item)" type="button" color="primary-light">
                        Trigger End
                    </v-btn>
                </div>
            </template>

        </VDataTableServer>
    </VCard>

    <AddingModal @close="dialogVisible = false" :show="dialogVisible" :dialogTitle="'Add New Production Run'" >
        <template #default>
            <v-form @submit.prevent="submit">
                <div>
                    <v-select label="Select Material" density="compact"
                        :items="materialsOption" v-model="form.material_id"
                        :rules="[value => !!value || 'Please select an item from the list']"
                    ></v-select>
                    <v-select class="mt-4" label="Select Production Line" density="compact"
                        :items="productionLinesOption" v-model="form.production_line_id"
                        :rules="[value => !!value || 'Please select an item from the list']"
                    ></v-select>
                    <div class="mt-4">
                        <DateTimePicker v-model="form.start_date_time" placeholder="Start Datetime" />
                    </div>
                    <VAlert v-if="errorMessage" class="mt-4" color="error" variant="tonal">
                        {{ errorMessage }}
                    </VAlert>
                    <div class="d-flex justify-end align-center mt-8">
                        <v-btn color="secondary" variant="outlined" @click="dialogVisible = false" class="px-12 mr-3">Cancel</v-btn>
                        <PrimaryButton class="px-12" type="submit" :loading="isLoading">
                            Create
                        </PrimaryButton>
                    </div>
                </div>
            </v-form>
        </template>
    </AddingModal>

    <FilteringModal @close="filterModalVisible = false" :show="filterModalVisible" :dialogTitle="'Filter Production Runs'">
        <template #default>
            <v-form>
                <v-select label="Filter by Type" density="compact"
                    :items="tagTypesOption" v-model="filters.tag_type_id"
                >
                </v-select>
                <div class="mt-4">
                    <label class="font-weight-bold">Date Started</label>
                    <DateRangePicker class="mt-1" v-model="filters.start_date_time" placeholder="Select Date Created"/>
                </div>

                <div class="d-flex justify-end align-center mt-8">
                    <v-btn color="secondary" variant="outlined" :disabled="isFiltersEmpty" @click="resetFilter" class="px-12 mr-3">Reset Filter</v-btn>
                    <PrimaryButton class="px-12" type="button" :disabled="isFiltersEmpty" @click="applyFilter" :loading="isLoading">
                        Apply Filter
                    </PrimaryButton>
                </div>
            </v-form>
        </template>
    </FilteringModal>

    <v-dialog v-model="triggerEndDialog" max-width="600px" persistent>
    
    <v-sheet class="px-4 pt-8 pb-4 text-center mx-auto" elevation="12" max-width="600" rounded="lg" width="100%">
            <v-icon
                class="mb-5"
                color="primary"
                icon="ri-information-line"
                size="112"
            ></v-icon>

            <h2 class="text-h4 mb-6">Do you want to end this production run?</h2>

            <div class="text-end">
                <v-btn color="secondary" variant="outlined" @click="triggerEndDialog = false" class="px-12 mr-3">Cancel</v-btn>
                <PrimaryButton @click="handleEndProductionRun" color="primary" class="px-12" :loading="triggerEndLoading">
                    Update
                </PrimaryButton>
            </div>
        </v-sheet>
    </v-dialog>

    <Toast :show="toast.show" :message="toast.message" @update:show="toast.show = $event"/>
</template>
