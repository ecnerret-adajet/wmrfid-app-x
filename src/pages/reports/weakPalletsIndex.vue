<script setup>
import DateRangePicker from '@/components/DateRangePicker.vue';
import FilteringModal from '@/components/FilteringModal.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import { exportExcel } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import { debounce } from 'lodash';
import { ref, watch } from 'vue';
import datatable from './weakPalletsDatatable.vue';

import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

const dialogVisible = ref(false)
const searchValue = ref('');
const datatableRef = ref(null);
const tablePerPage = ref(10);
const tablePage = ref(1);
const tableSort = ref('-created_at')
const isLoading = ref(false);
const errorMessage = ref(null)
const plantsOption = ref([])
const statisticsData = ref(null)

const toast = ref({
    message: 'New production line successfully created!',
    color: 'success',
    show: false
});

const filterModalVisible = ref(false);

const filterModalOpen = () => {
    if (!filterModalVisible.value) {
        filterModalVisible.value = true;
    }
};

const filters = reactive({
    created_at: null,
    updated_at: null,
    plant_code: null
});

const isFiltersEmpty = computed(() => {
    return !filters.created_at && 
           !filters.updated_at && 
           !filters.plant_code;
});

const applyFilter = () => {
    if(datatableRef.value) {
        datatableRef.value.applyFilters(filters);
    }
    filterModalVisible.value = false;
}

const resetFilter = () => {
    clearFilters();
    if(datatableRef.value) {
        datatableRef.value.applyFilters([]);
    }
    filterModalVisible.value = false;
}

const clearFilters = () => {
    filters.created_at = null;
    filters.updated_at = null;
    filters.plant_code = null;
};

onMounted(() => {
    fetchDropdownData();
})

const fetchDropdownData = async () => {
    isLoading.value = true;
    try {
        let endpoint = 'reports/weak-pallets';
        
        // Check if filters.plant_code is a valid, non-null value
        if (filters.plant_code) {
            endpoint += `/${filters.plant_code}`;
        }

        const preReqData = await ApiService.get(endpoint);
        const { plants, statistics } = preReqData.data;

        statisticsData.value = statistics;
        plantsOption.value = plants.map(item => ({
            value: item.plant_code,
            title: item.name,
            name: item.name
        }));
    } catch (error) {
        console.error('Error fetching data:', error);
    } finally {
        isLoading.value = false;
    }
};

const handleSearch = debounce((search) => {
    searchValue.value = search;
}, 500);

const onPaginationChanged = ({ page, itemsPerPage, sortBy, search }) => {
    tableSort.value = sortBy
    tablePage.value = page
    tablePerPage.value = itemsPerPage
    searchValue.value = search
}

const openDialog = () => {
    if (!dialogVisible.value) {
        dialogVisible.value = true;
    }
};

const exportLoading = ref(false);
const exportData = async () => {
    try {
        exportLoading.value = true;
        await exportExcel({
            url: `/export/production-lines`,
            params: {
                plant_code: filters.plant_code,
                created_at: filters.created_at,
                updated_at: filters.updated_at,
            },
            filename: 'production-lines.xlsx',
        });
    } catch (error) {
        console.error('Export error:', error);
    } finally {
        exportLoading.value = false;
    }
}

watch(() => filters.plant_code, () => {
    if(datatableRef.value) {
        datatableRef.value.applyFilters(filters);
    }
    fetchDropdownData(filters.plant_code)
});

</script>

<template>
    <div class="d-flex flex-wrap gap-4 align-center justify-center">
        <SearchInput class="flex-grow-1" @update:search="handleSearch" />
        <v-select style="max-width: 300px;" class="flex-grow-1 align-center mt-1" label="Filter by Plant"
            density="compact" :items="plantsOption.length > 1 ? [{ title: 'All', value: null }, ...plantsOption] : plantsOption" v-model="filters.plant_code"
            :rules="[value => value !== undefined || 'Please select an item from the list']">
        </v-select>
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

        <v-btn :loading="exportLoading" class="d-flex align-center" prepend-icon="ri-download-line" @click="exportData">
            <template #prepend>
                <v-icon color="white"></v-icon>
            </template>
            Export
        </v-btn>
    </div>

    <v-row class="match-height mb-2">
        <v-col cols="3">
            <v-skeleton-loader v-if="isLoading" type="article"></v-skeleton-loader>
            <v-card v-else class="pa-4 bg-grey-50" elevation="2" style="border-radius: 4px;">
                <div class="d-flex align-center justify-space-between">
                    <div class="d-flex align-center">
                        <div class="d-flex align-center justify-center mr-4" style="
                                width: 48px;
                                height: 48px;
                                background-color: #f5e9e8;
                                border-radius: 12px;
                            ">
                            <v-icon icon="ri-signal-wifi-error-line" color="error" size="24"></v-icon>
                        </div>
                        <div>
                            <span class="text-subtitle-1 font-weight-bold text-grey-700">
                                Total Weak Pallets
                            </span>
                            <div class="text-h4 font-weight-bold text-primary mt-1">
                                {{ statisticsData?.total_weak_pallets || 0 }}
                            </div>
                        </div>
                    </div>

                </div>
            </v-card>
        </v-col>
        <v-col cols="3">
            <v-skeleton-loader v-if="isLoading" type="article"></v-skeleton-loader>
            <v-card v-else class="pa-4 bg-grey-50" elevation="2" style="border-radius: 4px;">
                <div class="d-flex align-center justify-space-between">
                    <div class="d-flex align-center">
                        <div class="d-flex align-center justify-center mr-4" style="
                                width: 48px;
                                height: 48px;
                                background-color: #e8f5e9;
                                border-radius: 12px;
                            ">
                            <v-icon icon="ri-percent-line" color="success" size="24"></v-icon>
                        </div>
                        <div>
                            <span class="text-subtitle-1 font-weight-bold text-grey-700">
                                Weak Pallet Percentage
                            </span>
                            <div class="text-h4 font-weight-bold text-primary mt-1">
                               {{ statisticsData?.weak_pallet_percentage }}
                            </div>
                        </div>
                    </div>
                </div>
            </v-card>
        </v-col>
    </v-row>

    <VCard>
        <datatable ref="datatableRef" @pagination-changed="onPaginationChanged" 
            :search="searchValue"
        />
    </VCard>

    <FilteringModal @close="filterModalVisible = false" :show="filterModalVisible" :dialogTitle="'Filter Weak Pallets Report'">
        <template #default>
            <v-form>

                <div class="mt-4">
                    <label class="font-weight-bold">Date Created</label>
                    <DateRangePicker class="mt-1" v-model="filters.created_at" placeholder="Select Date Created"/>
                </div>
                 
                <div class="mt-4">
                    <label class="font-weight-bold">Date Updated</label>
                    <DateRangePicker class="mt-1" v-model="filters.updated_at" placeholder="Select Date Updated"/>
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

    <Toast :show="toast.show" :message="toast.message"/>
</template>
