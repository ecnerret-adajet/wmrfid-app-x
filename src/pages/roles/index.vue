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

const dialogVisible = ref(false)
const searchValue = ref('');
const datatableRef = ref(null);
const tablePerPage = ref(10);
const tablePage = ref(1);
const tableSort = ref('-created_at');
const isLoading = ref(false);
const errorMessage = ref(null);
const permissions = ref([]);
const toast = ref({
    message: 'New role successfully created!',
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

const isFiltersEmpty = computed(() => {
    return !filters.created_at && 
           !filters.updated_at
});

onMounted(() => {
    fetchPermissions();
})

const fetchPermissions = async () => {
    try {
        const response = await ApiService.get('roles/get-permissions');
        permissions.value = response.data;
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
    'description': null,
    'permissions': []
});

const submit = async () => {
    isLoading.value = true;
    toast.value.show = false;
    try {
        const response = await ApiService.post('roles/store', form.value)
        if (datatableRef.value) {
            datatableRef.value.loadItems({ page: tablePage.value, itemsPerPage: tablePerPage.value, sortBy: [{key: 'created_at', 'order': 'desc'}], search: searchValue.value });
        }
        isLoading.value = false;
        dialogVisible.value = false
        toast.value.message = 'New role successfully created!'
        toast.value.show = true;
        form.value.name = null;
        form.value.description = null;
        form.value.permissions = [];
        errorMessage.value = null;
    } catch (error) {
        errorMessage.value = error.response?.data?.message || 'An unexpected error occurred.';
        console.error('Error submitting:', error);
        isLoading.value = false;
    }
}

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
            <v-btn block @click="openDialog">Add New Role</v-btn>
        </VCol>
    </VRow>

    <VCard>
        <datatable ref="datatableRef" :permissions="permissions" @pagination-changed="onPaginationChanged" 
            :search="searchValue"
        />
    </VCard>

    <AddingModal @close="dialogVisible = false" :show="dialogVisible" :dialogTitle="'Add New Role'" >
        <template #default>
            <v-form @submit.prevent="submit">
                <v-text-field class="mt-6" density="compact" 
                    label="Role Name"
                    v-model="form.name" 
                    :rules="[value => !!value || 'Role Name is required']"
                />
                <v-text-field class="mt-6" density="compact" 
                    label="Description"
                    v-model="form.description"
                />

                <v-select class="mt-6"
                    v-model="form.permissions"
                    :items="permissions"
                    item-title="name"
                    item-value="id"
                    placeholder="Select Permissions"
                    label="Select Permissions"
                    chips
                    multiple
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
    <FilteringModal @close="filterModalVisible = false" :show="filterModalVisible" :dialogTitle="'Filter Roles'">
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
