<script setup>
import DateRangePicker from '@/components/DateRangePicker.vue';
import FilteringModal from '@/components/FilteringModal.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import SearchInput from '@/components/SearchInput.vue';
import ApiService from '@/services/ApiService';
import { debounce } from 'lodash';
import { computed, ref } from 'vue';
import datatable from './datatable.vue';

const searchValue = ref('');
const datatableRef = ref(null);
const tableSort = ref('-created_at');
const isLoading = ref(false);
const filterModalVisible = ref(false);

const plantsOption = ref([]);
const plantsLoaded = ref(false);

const loadPlants = async () => {
    try {
        const response = await ApiService.get('managed-plant-storage-locations');
        plantsOption.value = (response.data.plants ?? [])
            .filter(item => item.name !== null)
            .map(item => ({ value: item.plant_code, title: item.name }));
        plantsLoaded.value = true;
        if (plantsOption.value.length > 0) {
            filters.plant_code = plantsOption.value[0].value;
        } else {
            if (datatableRef.value) {
                datatableRef.value.applyFilters(filters);
            }
        }
    } catch (error) {
        console.error(error);
        plantsLoaded.value = true;
    }
};

onMounted(() => loadPlants());

const filterModalOpen = () => {
    if (!filterModalVisible.value) {
        filterModalVisible.value = true;
    }
};

const filters = reactive({
    plant_code: null,
    created_at: null,
    updated_at: null,
});

watch(() => filters.plant_code, () => {
    if (!plantsLoaded.value) return;
    if (datatableRef.value) {
        datatableRef.value.applyFilters(filters);
    }
});

const isFiltersEmpty = computed(() => {
    return !filters.created_at && !filters.updated_at;
});

const applyFilter = () => {
    if (datatableRef.value) {
        datatableRef.value.applyFilters(filters);
    }
    filterModalVisible.value = false;
};

const resetFilter = () => {
    filters.created_at = null;
    filters.updated_at = null;
    if (datatableRef.value) {
        datatableRef.value.applyFilters(filters);
    }
    filterModalVisible.value = false;
};

const handleSearch = debounce((search) => {
    searchValue.value = search;
}, 500);

const onPaginationChanged = ({ page, itemsPerPage, sortBy, search }) => {
    tableSort.value = sortBy;
};
</script>

<template>
    <VRow align="center">
        <VCol cols="12" md="3">
            <v-select
                label="Filter by Plant"
                density="compact"
                hide-details
                :items="plantsOption.length > 1 ? [{ title: 'All', value: null }, ...plantsOption] : plantsOption"
                v-model="filters.plant_code"
            />
        </VCol>
        <VCol md="7">
            <SearchInput @update:search="handleSearch" />
        </VCol>
        <VCol md="2" class="d-flex justify-center align-center">
            <v-btn block prepend-icon="ri-equalizer-line" class="w-full" @click="filterModalOpen">
                <template v-slot:prepend>
                    <v-icon color="white"></v-icon>
                </template>
                Filter
            </v-btn>
        </VCol>
    </VRow>

    <VCard>
        <datatable ref="datatableRef" @pagination-changed="onPaginationChanged" :search="searchValue" />
    </VCard>

    <FilteringModal @close="filterModalVisible = false" :show="filterModalVisible" :dialogTitle="'Filter Reserved Delivery Orders'">
        <template #default>
            <v-form>
                <div class="mt-4">
                    <label class="font-weight-bold">Date Created</label>
                    <DateRangePicker class="mt-1" v-model="filters.created_at" placeholder="Select Date Created" />
                </div>

                <div class="mt-4">
                    <label class="font-weight-bold">Date Updated</label>
                    <DateRangePicker class="mt-1" v-model="filters.updated_at" placeholder="Select Date Updated" />
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
</template>
