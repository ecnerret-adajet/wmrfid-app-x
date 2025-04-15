<script setup>
import AddingModal from '@/components/AddingModal.vue';
import DateRangePicker from '@/components/DateRangePicker.vue';
import FilteringModal from '@/components/FilteringModal.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import { useAuthStore } from '@/stores/auth';
import { debounce } from 'lodash';
import { computed, onMounted, ref } from 'vue';
import datatable from './datatable.vue';

const authStore = useAuthStore();

const dialogVisible = ref(false)
const datatableRef = ref(null);
const searchValue = ref('');
const filterModalVisible = ref(false);

const openDialog = () => {
    if (!dialogVisible.value) {
        dialogVisible.value = true;
    }
};

const filterModalOpen = () => {
    if (!filterModalVisible.value) {
        filterModalVisible.value = true;
    }
};

const form = ref({
    'name': null,
    'reader_type_id': null,
    'storage_location_id': null,
    'ip_address': null
});

onMounted(() => {
    fetchReaderTypesAndStorageLocations();
})

const readerTypes = ref([]);
const storageLocations = ref([]);
const isLoading = ref(false);
const toast = ref({
    message: 'New Reader Added!',
    color: 'success',
    show: false
});

const filters = reactive({
    created_at: null,
    updated_at: null,
    storage_location_id: null,
    reader_type_id: null
});

const isFiltersEmpty = computed(() => {
    return !filters.created_at && 
           !filters.updated_at && 
           !filters.storage_location_id && 
           !filters.reader_type_id;
});

const tablePerPage = ref(10);
const tablePage = ref(1);
const tableSort = ref('-created_at')

const fetchReaderTypesAndStorageLocations = async () => {
    try {
        const preReqData = await ApiService.get('readers/get-data-dropdown');
        const { reader_types, storage_locations, reader_status } = preReqData.data
        readerTypes.value = reader_types.map(item => ({
            value: item.id,
            title: item.name 
        }));
  
        storageLocations.value = storage_locations.map(item => ({
            value: item.id,
            title: item.name
        }));


    } catch (error) {
        console.error('Error fetching data:', error);
    }
};

const submit = async () => {
    
    isLoading.value = true;
    try {
        const response = await ApiService.post('readers/store', form.value)
        if (datatableRef.value) {
            datatableRef.value.loadItems({ page: tablePage.value, itemsPerPage: tablePerPage.value, sortBy: [{key: 'created_at', 'order': 'desc'}], search: searchValue.value });
        }
        isLoading.value = false;
        dialogVisible.value = false
        toast.value.show = true;
        form.value.name = null;
        form.value.reader_type_id = null;
        form.value.storage_location_id = null;
        form.value.ip_address = null;
    } catch (error) {
        console.error('Error submitting:', error);
    }
}

const onPaginationChanged = ({ page, itemsPerPage, sortBy, search }) => {
    tableSort.value = sortBy
    tablePage.value = page
    tablePerPage.value = itemsPerPage
    searchValue.value = search
}

const handleSearch = debounce((search) => {
    searchValue.value = search;
}, 500);

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
    filters.storage_location_id = null;
    filters.reader_type_id = null;
};

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
            Add Reader
        </v-btn>
    </div>
    
    <VCard>
        <datatable ref="datatableRef" @pagination-changed="onPaginationChanged" 
            :search="searchValue" :storage-locations="storageLocations" :reader-types="readerTypes"
        />
    </VCard>

    <AddingModal @close="dialogVisible = false" :show="dialogVisible" :dialogTitle="'Add New Reader'" >
        <template #default>
            <v-form @submit.prevent="submit">
                <v-select label="Select Storage Location" density="compact"
                    :items="storageLocations" v-model="form.storage_location_id"
                    :rules="[value => !!value || 'Please select an item from the list']"
                >
                </v-select>
                <v-select class="mt-6" label="Select Reader Type" density="compact"
                    :items="readerTypes" v-model="form.reader_type_id"
                    :rules="[value => !!value || 'Please select an item from the list']"
                >
                </v-select>
                <v-text-field class="mt-6" density="compact" 
                    label="Reader Name"
                    v-model="form.name" 
                    :rules="[value => !!value || 'Reader name is required']"
                />
                <v-text-field class="mt-6" density="compact" 
                    label="IP Address"
                    v-model="form.ip_address" 
                />
                <div class="d-flex justify-end align-center mt-8">
                    <v-btn color="secondary" variant="outlined" @click="dialogVisible = false" class="px-12 mr-3">Cancel</v-btn>
                    <PrimaryButton class="px-12" type="submit" :loading="isLoading">
                        Save
                    </PrimaryButton>
                </div>
            </v-form>
        </template>
    </AddingModal>

    <FilteringModal @close="filterModalVisible = false" :show="filterModalVisible" :dialogTitle="'Filter Readers'">
        <template #default>
            <v-form>
                <div class="mt-6">
                    <label class="font-weight-bold">Storage Location</label>
                    <v-select class="mt-1" label="Select Storage Location" density="compact"
                        :items="storageLocations" v-model="filters.storage_location_id"
                    >
                    </v-select>
                </div>

                <div class="mt-6">
                    <label class="font-weight-bold">Reader Type</label>
                    <v-select class="mt-1" label="Select Reader Type" density="compact"
                        :items="readerTypes" v-model="filters.reader_type_id"
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


