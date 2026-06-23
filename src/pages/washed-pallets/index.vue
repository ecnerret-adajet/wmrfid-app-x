<script setup>
import DateRangePicker from '@/components/DateRangePicker.vue';
import FilteringModal from '@/components/FilteringModal.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import { debounce } from 'lodash';
import moment from 'moment';
import { computed, reactive, ref } from 'vue';
import datatable from './datatable.vue';

const searchValue = ref('');
const datatableRef = ref(null);
const toast = ref({
    message: 'Success message',
    color: 'success',
    show: false
});
const filterModalVisible = ref(false);
const isLoading = ref(false);

const summary = ref({
    total_cleaned: 0,
    date_from: null,
    date_to: null,
});

const onSummaryUpdated = data => {
    summary.value = data;
};

const dateFilters = reactive({
    created_at: null,
});

const appliedFilters = reactive({
    date_from: null,
    date_to: null,
});

const filterModalOpen = () => {
    if (!filterModalVisible.value) {
        filterModalVisible.value = true;
    }
};

const isFiltersEmpty = computed(() => {
    return !dateFilters.created_at || dateFilters.created_at.length === 0;
});

const applyFilter = () => {
    if (dateFilters.created_at && dateFilters.created_at.length === 2) {
        appliedFilters.date_from = moment(dateFilters.created_at[0]).format('YYYY-MM-DD');
        appliedFilters.date_to = moment(dateFilters.created_at[1]).format('YYYY-MM-DD');
    } else {
        appliedFilters.date_from = null;
        appliedFilters.date_to = null;
    }
    if (datatableRef.value) {
        datatableRef.value.applyFilters(appliedFilters);
    }
    filterModalVisible.value = false;
};

const resetFilter = () => {
    dateFilters.created_at = null;
    appliedFilters.date_from = null;
    appliedFilters.date_to = null;
    if (datatableRef.value) {
        datatableRef.value.applyFilters(appliedFilters);
    }
    filterModalVisible.value = false;
};

const handleSearch = debounce((search) => {
    searchValue.value = search;
}, 500);

</script>

<template>
    <VRow class="match-height mb-2">
        <VCol cols="12" md="3">
            <v-card class="pa-4 bg-grey-50" elevation="2" style="border-radius: 4px;">
                <div class="d-flex align-center">
                    <div class="d-flex align-center justify-center mr-4" style="
                            width: 48px;
                            height: 48px;
                            background-color: #e8f5e9;
                            border-radius: 12px;
                        ">
                        <v-icon icon="ri-rfid-line" color="success" size="24"></v-icon>
                    </div>
                    <div>
                        <span class="text-subtitle-1 font-weight-bold text-grey-700">
                            Total Cleaned
                        </span>
                        <div class="text-h4 font-weight-bold text-primary mt-1">
                            {{ summary.total_cleaned ?? 0 }}
                        </div>
                        <span class="text-caption text-medium-emphasis" v-if="summary.date_from && summary.date_to">
                            {{ moment(summary.date_from).format('MMM D, YYYY') }} - {{ moment(summary.date_to).format('MMM D, YYYY') }}
                        </span>
                    </div>
                </div>
            </v-card>
        </VCol>
    </VRow>

    <VRow align="center">
        <VCol md="10">
            <SearchInput @update:search="handleSearch"/>
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
        <datatable ref="datatableRef" :search="searchValue" @summary-updated="onSummaryUpdated"/>
    </VCard>

    <FilteringModal @close="filterModalVisible = false" :show="filterModalVisible" :dialogTitle="'Filter Washed Pallets'">
        <template #default>
            <v-form>
                <div class="mt-4">
                    <label class="font-weight-bold">Date Created</label>
                    <DateRangePicker class="mt-1" v-model="dateFilters.created_at" placeholder="Select Date Created"/>
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
