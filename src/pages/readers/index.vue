<script setup>
import AddingModal from '@/components/AddingModal.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import { ref } from 'vue';
import datatable from './datatable.vue';

const dialogVisible = ref(false)
const datatableRef = ref(null);

const openDialog = () => {
    fetchReaderTypes();
    dialogVisible.value = true;
};

const form = ref({
    'name': null,
    'reader_type_id': null
});

const readerTypes = ref([]);
const isLoading = ref(false);
const toast = ref({
    message: 'New Reader Added!',
    color: 'success',
    show: false
});

const fetchReaderTypes = async () => {
    try {
        const response = await ApiService.get('readers/get-reader-types'); 
        readerTypes.value = response.data.map(item => ({
            value: item.id,
            title: item.name 
        }));
    } catch (error) {
        console.error('Error fetching reader types:', error);
    }
};

const submit = async () => {
    isLoading.value = true;
    try {
        const response = await ApiService.post('readers/store', form.value)
        if (datatableRef.value) {
            datatableRef.value.loadItems()
        }
        isLoading.value = false;
        dialogVisible.value = false
        toast.value.show = true;
        form.value.name = null;
        form.value.reader_type_id = null;
    } catch (error) {
        console.error('Error submitting:', error);
    }
}


</script>

<template>
    <VRow>
        <VCol md="10">
            <SearchInput />
        </VCol>
        <VCol md="2" class="d-flex justify-center align-center">
            <!-- Center the button -->
            <v-btn block @click="openDialog">Add Reader</v-btn>
        </VCol>
    </VRow>
    
    <VCard>
        <datatable ref="datatableRef"/>
    </VCard>

    <AddingModal @close="dialogVisible = false" :show="dialogVisible" :dialogTitle="'Add New Reader'">
        <template #default>
            <v-form @submit.prevent="submit">
                <v-select label="Select" density="compact"
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
                    <v-btn color="secondary" variant="plain" @click="dialogVisible = false" class="px-12">Cancel</v-btn>
                    <PrimaryButton class="px-12" type="submit" :loading="isLoading">
                        Save
                    </PrimaryButton>
                </div>
            </v-form>
        </template>
    </AddingModal>

    <Toast :show="toast.show" :message="toast.message"/>
</template>


