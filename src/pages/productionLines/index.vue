<script setup>
import AddingModal from '@/components/AddingModal.vue';
import DateRangePicker from '@/components/DateRangePicker.vue';
import FilteringModal from '@/components/FilteringModal.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import { debounce } from 'lodash';
import { ref } from 'vue';
import datatable from './datatable.vue';

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
const readersOption = ref([])
const tagTypesOption = ref([])

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
    reader_id: null,
    tag_type_id: null
});

const isFiltersEmpty = computed(() => {
    return !filters.created_at && 
           !filters.updated_at && 
           !filters.reader_id && 
           !filters.tag_type_id;
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
    filters.reader_id = null;
    filters.tag_type_id = null;
};

onMounted(() => {
    fetchReadersAndTagTypes();
})

const fetchReadersAndTagTypes = async () => {
    try {
        const preReqData = await ApiService.get('production-lines/get-data-dropdown');
        const { readers, tag_types } = preReqData.data
        readersOption.value = readers.map(item => ({
            value: item.id,
            title: item.name 
        }));

        tagTypesOption.value = tag_types.map(item => ({
            value: item.id,
            title: item.name 
        }));

    } catch (error) {
        console.error('Error fetching data:', error);
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

const form = ref({
    'name': null,
    'reader_id': null,
    'tag_type_id' : null
});

const submit = async () => {
    isLoading.value = true;
    toast.value.show = false;
    try {
        const response = await ApiService.post('production-lines/store', form.value)
        if (datatableRef.value) {
            datatableRef.value.loadItems({ page: tablePage.value, itemsPerPage: tablePerPage.value, sortBy: [{key: 'created_at', 'order': 'desc'}], search: searchValue.value });
        }
        isLoading.value = false;
        dialogVisible.value = false
        toast.value.message = 'New production line successfully created!'
        toast.value.show = true;
        form.value.name = null;
        form.value.reader_id = null;
        errorMessage.value = null;
    } catch (error) {
        errorMessage.value = error.response?.data?.message || 'An unexpected error occurred.';
        console.error('Error submitting:', error);
        isLoading.value = false;
    }
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

        <v-btn
            v-if="authStore.user.is_super_admin || authStore.user.is_warehouse_admin"
            class="d-flex justify-center align-center"
            @click="openDialog"
        >
            Add New Production Line
        </v-btn>
    </div>

    <VCard>
        <datatable ref="datatableRef" :readersOption="readersOption" :tagTypesOption="tagTypesOption" @pagination-changed="onPaginationChanged" 
            :search="searchValue"
        />
    </VCard>

    <AddingModal @close="dialogVisible = false" :show="dialogVisible" :dialogTitle="'Add New Production Line'" >
        <template #default>
            <v-form @submit.prevent="submit">
                <v-select label="Select Reader" density="compact"
                    :items="readersOption" v-model="form.reader_id"
                    :rules="[value => !!value || 'Please select an item from the list']"
                ></v-select>
                <v-select class="mt-6" label="Select Type" density="compact"
                    :items="tagTypesOption" v-model="form.tag_type_id"
                    :rules="[value => !!value || 'Please select an item from the list']"
                ></v-select>
                <v-text-field class="mt-6" density="compact" 
                    label="Name"
                    v-model="form.name" 
                    :rules="[value => !!value || 'Production line name is required']"
                />
                <VAlert v-if="errorMessage" class="mt-4" color="error" variant="tonal">
                    {{ errorMessage }}
                </VAlert>
                <div class="d-flex justify-end align-center mt-8">
                    <v-btn color="secondary" variant="outlined" @click="dialogVisible = false" class="px-12 mr-3">Cancel</v-btn>
                    <PrimaryButton class="px-12" type="submit" :loading="isLoading">
                        Create
                    </PrimaryButton>
                </div>
            </v-form>
        </template>
    </AddingModal>

    <FilteringModal @close="filterModalVisible = false" :show="filterModalVisible" :dialogTitle="'Filter Readers'">
        <template #default>
            <v-form>
                <div class="mt-6">
                    <label class="font-weight-bold">Reader</label>
                    <v-select class="mt-1" label="Select Reader" density="compact"
                        :items="readersOption" v-model="filters.reader_id"
                    >
                    </v-select>
                </div>

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
