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
const toast = ref({
    message: 'User successfully created!',
    color: 'success',
    show: false
});


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
            <v-btn block @click="openDialog">Add New User</v-btn>
        </VCol>
    </VRow>

    <VCard>
        <datatable ref="datatableRef" @pagination-changed="onPaginationChanged" 
            :search="searchValue"
        />
    </VCard>

    <AddingModal @close="dialogVisible = false" :show="dialogVisible" :dialogTitle="'Add New User'" >
        <template #default>
            <v-form @submit.prevent="submit">
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
