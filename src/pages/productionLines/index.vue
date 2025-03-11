<script setup>
import AddingModal from '@/components/AddingModal.vue';
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
const tableSort = ref('-created_at')
const isLoading = ref(false);
const errorMessage = ref(null)
const readersOption = ref([])
const toast = ref({
    message: 'New production line successfully created!',
    color: 'success',
    show: false
});

onMounted(() => {
    fetchReaders();
})

const fetchReaders = async () => {
    try {
        const preReqData = await ApiService.get('production-lines/get-data-dropdown');
        const { readers } = preReqData.data
        readersOption.value = readers.map(item => ({
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
    <VRow>
        <VCol md="10">
            <SearchInput @update:search="handleSearch"/>
        </VCol>
        <VCol md="2" class="d-flex justify-center align-center">
            <v-btn block @click="openDialog">Add New Production Line</v-btn>
        </VCol>
    </VRow>

    <VCard>
        <datatable ref="datatableRef" :readersOption="readersOption" @pagination-changed="onPaginationChanged" 
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
    <Toast :show="toast.show" :message="toast.message"/>
</template>
