<script setup>
import DateRangePicker from '@/components/DateRangePicker.vue';
import FilteringModal from '@/components/FilteringModal.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import SearchInput from '@/components/SearchInput.vue';
import { exportExcel } from '@/composables/useHelpers';
import JwtService from '@/services/JwtService';
import axios from 'axios';
import { debounce } from 'lodash';
import { onMounted, ref } from 'vue';
import datatable from './datatable.vue';

const searchValue = ref('');
const datatableRef = ref(null);
const tablePerPage = ref(10);
const tablePage = ref(1);
const tableSort = ref('-created_at')

const filterModalVisible = ref(false);

const filterModalOpen = () => {
    if (!filterModalVisible.value) {
        filterModalVisible.value = true;
    }
};

const filters = reactive({
    created_at: null,
    updated_at: null,
    plant_code: null,
});

const isFiltersEmpty = computed(() => {
    return !filters.created_at &&
        !filters.updated_at && !filters.plant_code
});

const applyFilter = () => {
    if (datatableRef.value) {
        datatableRef.value.applyFilters(filters);
    }
    filterModalVisible.value = false;
}

const resetFilter = () => {
    clearFilters();
    if (datatableRef.value) {
        datatableRef.value.applyFilters([]);
    }
    filterModalVisible.value = false;
}

const clearFilters = () => {
    filters.created_at = null;
    filters.updated_at = null;
    filters.plant_code = null;
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

const plantsOption = ref([]);
const pageLoading = ref(false);

onMounted(() => {
    fetchDropdownData()
})

const fetchDropdownData = async () => {
    pageLoading.value = true;
    try {
        const token = JwtService.getToken();
        const response = await axios.get(`/materials/get-data-dropdown`, {
            params: {
                filters: filters
            },
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const { plants } = response.data

        plantsOption.value = plants.map(item => ({
            value: item.plant_code,
            title: item.name,
            name: item.name
        }));

    } catch (error) {
        console.log(error);
    } finally {
        pageLoading.value = false;
    }
};

const exportLoading = ref(false);
const exportData = async () => {
    try {
        exportLoading.value = true;
        await exportExcel({
            url: `/export/materials`,
            params: {
                plant_code: filters.plant_code,
                created_at: filters.created_at,
                updated_at: filters.updated_at,
            },
            filename: 'materials.xlsx',
        });
    } catch (error) {
        console.error('Export error:', error);
    } finally {
        exportLoading.value = false;
    }
}

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

        <v-btn :loading="exportLoading" class="d-flex align-center" prepend-icon="ri-download-line" @click="exportData">
            <template #prepend>
                <v-icon color="white"></v-icon>
            </template>
            Export
        </v-btn>
    </div>

    <VCard>
        <datatable ref="datatableRef" @pagination-changed="onPaginationChanged" :search="searchValue" />
    </VCard>

    <FilteringModal @close="filterModalVisible = false" :show="filterModalVisible" :dialogTitle="'Filter Materials'">
        <template #default>
            <v-form>
                <div>
                    <v-select label="Select Plant" density="compact" :items="plantsOption"
                        v-model="filters.plant_code"></v-select>
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

</template>
