<script setup>
import AddingModal from '@/components/AddingModal.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import { debounce } from 'lodash';
import { ref } from 'vue';
import datatable from './datatable.vue';

const dialogVisible = ref(false)
const datatableRef = ref(null);
const searchValue = ref('');

const openDialog = () => {
    if (!dialogVisible.value) {
        fetchReaderTypesAndStorageLocations();
        dialogVisible.value = true;
    }
};

const form = ref({
    'name': null,
    'reader_type_id': null,
    'storage_location_id': null,
});

const readerTypes = ref([]);
const storageLocations = ref([]);
const isLoading = ref(false);
const toast = ref({
    message: 'New Reader Added!',
    color: 'success',
    show: false
});

const tablePerPage = ref(10);
const tablePage = ref(1);
const tableSort = ref('-created_at')

const fetchReaderTypesAndStorageLocations = async () => {
    try {
        const preReqData = await ApiService.get('readers/get-data-dropdown');
        const { reader_types, storage_locations } = preReqData.data

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

</script>

<template>
    <VRow>
        <VCol md="10">
            <SearchInput @update:search="handleSearch"/>
        </VCol>
        <VCol md="2" class="d-flex justify-center align-center">
            <!-- Center the button -->
            <v-btn block @click="openDialog">Add Reader</v-btn>
        </VCol>
    </VRow>
    
    <VCard>
        <datatable ref="datatableRef" @pagination-changed="onPaginationChanged" :search="searchValue"/>
    </VCard>

    <AddingModal @close="dialogVisible = false" :show="dialogVisible" :dialogTitle="'Add New Reader'">
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
                <div class="d-flex justify-end align-center mt-8">
                    <v-btn color="secondary" variant="outlined" @click="dialogVisible = false" class="px-12 mr-3">Cancel</v-btn>
                    <PrimaryButton class="px-12" type="submit" :loading="isLoading">
                        Save
                    </PrimaryButton>
                </div>
            </v-form>
        </template>
    </AddingModal>

    <Toast :show="toast.show" :message="toast.message"/>
</template>


