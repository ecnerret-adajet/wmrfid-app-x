<script setup>
import AddingModal from '@/components/AddingModal.vue';
import DateRangePicker from '@/components/DateRangePicker.vue';
import FilteringModal from '@/components/FilteringModal.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import { debounce } from 'lodash';
import { computed, onMounted, ref } from 'vue';
import datatable from './datatable.vue';

const dialogVisible = ref(false)
const searchValue = ref('');
const datatableRef = ref(null);
const tablePerPage = ref(10);
const tablePage = ref(1);
const tableSort = ref('-created_at')
const isLoading = ref(false);
const errorMessage = ref(null)
const storageLocations = ref([])
const rolesOption = ref([]);
const toast = ref({
    message: 'User successfully created!',
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
});

onMounted(() => {
    fetchDataDropdown();
})

const fetchDataDropdown = async () => {
    try {
        const preReqData = await ApiService.get('users/get-data-dropdown');
        const { storage_locations, roles } = preReqData.data
        console.log(preReqData.data);
        
        storageLocations.value = storage_locations.map(item => ({
            id: item.id,
            value: item.id,
            title: item.name,
            label: item.name,
            name: item.name
        }));

        rolesOption.value = roles.map(item => ({
            id: item.id,
            value: item.id,
            title: item.title,
            label: item.title,
            name: item.title
        }));
    } catch (error) {
        console.error('Error fetching data:', error);
    }
};

const isFiltersEmpty = computed(() => {
    return !filters.created_at && 
           !filters.updated_at 
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
    'email': null,
    'storage_location_ids': [],
    'role_id': null,
});

const submit = async () => {
    isLoading.value = true;
    toast.value.show = false;
    try {
        const response = await ApiService.post('users/store', form.value)
        if (datatableRef.value) {
            datatableRef.value.loadItems({ page: tablePage.value, itemsPerPage: tablePerPage.value, sortBy: [{key: 'created_at', 'order': 'desc'}], search: searchValue.value });
        }
        isLoading.value = false;
        dialogVisible.value = false
        toast.value.message = 'User successfully created!'
        toast.value.show = true;
        form.value.name = null;
        form.value.email = null;
        form.value.storage_location_ids = []
        form.value.role_id = null;
        errorMessage.value = ''
    } catch (error) {
        errorMessage.value = error.response?.data?.message || 'An unexpected error occurred.';
        console.error('Error submitting:', error);
        isLoading.value = false;
    }
}

</script>

<template>
    <VRow>
        <VCol md="9">
            <SearchInput @update:search="handleSearch"/>
        </VCol>
        <VCol md="1" class="d-flex justify-center align-center">
                <v-btn block prepend-icon="ri-equalizer-line" class="w-full" @click="filterModalOpen">
                    <template v-slot:prepend>
                        <v-icon color="white"></v-icon>
                    </template>
                    Filter
                </v-btn>
        </VCol>
        <VCol md="2" class="d-flex justify-center align-center">
            <v-btn block @click="openDialog">Add User</v-btn>
        </VCol>
    </VRow>

    <VCard>
        <datatable ref="datatableRef" :storage-locations="storageLocations" :roles-option="rolesOption" @pagination-changed="onPaginationChanged" 
            :search="searchValue"
        />
    </VCard>

    <AddingModal @close="dialogVisible = false" :show="dialogVisible" :dialogTitle="'Add New User'" >
        <template #default>
            <v-form @submit.prevent="submit">
                <v-select class="mt-4" label="Select Role" density="compact"
                    :items="rolesOption" v-model="form.role_id"
                    :rules="[value => !!value || 'Role is required']"
                >
                </v-select>
                <v-text-field class="mt-6" density="compact" 
                    label="Full Name"
                    v-model="form.name" 
                    :rules="[value => !!value || 'Name is required']"
                />
                <v-text-field class="mt-6" density="compact" 
                    label="Email Address"
                    v-model="form.email" 
                    :rules="[value => !!value || 'Email address is required']"
                />
                <v-select class="mt-4"
                    v-model="form.storage_location_ids"
                    :items="storageLocations"
                    item-title="name"
                    item-value="id"
                    label="Select Storage Locations"
                    chips
                    multiple
                    return-object
                    :rules="[value => !!value || 'Please select an item from the list']"
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

    <FilteringModal @close="filterModalVisible = false" :show="filterModalVisible" :dialogTitle="'Filter Users'">
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
