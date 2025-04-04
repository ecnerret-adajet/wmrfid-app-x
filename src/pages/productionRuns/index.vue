<script setup>
import { default as AddingModal } from '@/components/AddingModal.vue';
import DateTimePicker from '@/components/DateTimePicker.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import '@vuepic/vue-datepicker/dist/main.css';
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
const productionLinesOption = ref([])
const materialsOption = ref([])
const toast = ref({
    message: 'New production run successfully created!',
    color: 'success',
    show: false
});

onMounted(() => {
    fetchDropdownData();
})

const fetchDropdownData = async () => {
    try {
        const preReqData = await ApiService.get('production-runs/get-data-dropdown');
        const { materials, production_lines } = preReqData.data
        productionLinesOption.value = production_lines.map(item => ({
            value: item.id,
            title: item.name 
        }));
        materialsOption.value = materials.map(item => ({
            value: item.id,
            title: `${item.code} - ${item.description}`
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
    'material_id': null,
    'production_line_id': null,
    'start_date_time': null,
    'end_date_time': null,
});

const submit = async () => {
    isLoading.value = true;
    toast.value.show = false;
    try {
        const response = await ApiService.post('production-runs/store', form.value)
        if (datatableRef.value) {
            datatableRef.value.loadItems({ page: tablePage.value, itemsPerPage: tablePerPage.value, sortBy: [{key: 'created_at', 'order': 'desc'}], search: searchValue.value });
        }
        isLoading.value = false;
        dialogVisible.value = false
        toast.value.message = 'New production run successfully created!'
        toast.value.show = true;
        form.value.material_id = null;
        form.value.production_line_id = null;
        form.value.start_date_time = null;
        form.value.end_date_time = null;
        errorMessage.value = null;
    } catch (error) {
        errorMessage.value = error.response?.data?.message || 'An unexpected error occurred.';
        console.error('Error submitting:', error);
        isLoading.value = false;
    }
}

const date = ref()

</script>

<template>
    <VRow>
        <VCol md="10">
            <SearchInput @update:search="handleSearch"/>
        </VCol>
        <VCol md="2" class="d-flex justify-center align-center">
            <v-btn block @click="openDialog">Add New Production Run</v-btn>
        </VCol>
    </VRow>

    <VCard>
        <datatable ref="datatableRef" :materialsOption="materialsOption" :productionLinesOption="productionLinesOption" 
            @pagination-changed="onPaginationChanged" :search="searchValue"
        />
    </VCard>

    <AddingModal @close="dialogVisible = false" :show="dialogVisible" :dialogTitle="'Add New Production Run'" >
        <template #default>
            <v-form @submit.prevent="submit">
                <div>
                    <v-select label="Select Material" density="compact"
                        :items="materialsOption" v-model="form.material_id"
                        :rules="[value => !!value || 'Please select an item from the list']"
                    ></v-select>
                    <v-select class="mt-4" label="Select Production Line" density="compact"
                        :items="productionLinesOption" v-model="form.production_line_id"
                        :rules="[value => !!value || 'Please select an item from the list']"
                    ></v-select>
                    <div class="mt-4">
                        <DateTimePicker v-model="form.start_date_time" placeholder="Start Datetime" />
                    </div>
                    <div class="mt-4">
                        <DateTimePicker v-model="form.end_date_time" placeholder="End Datetime" />
                    </div>
                    <VAlert v-if="errorMessage" class="mt-4" color="error" variant="tonal">
                        {{ errorMessage }}
                    </VAlert>
                    <div class="d-flex justify-end align-center mt-8">
                        <v-btn color="secondary" variant="outlined" @click="dialogVisible = false" class="px-12 mr-3">Cancel</v-btn>
                        <PrimaryButton class="px-12" type="submit" :loading="isLoading">
                            Create
                        </PrimaryButton>
                    </div>
                </div>
            </v-form>
        </template>
    </AddingModal>
    <Toast :show="toast.show" :message="toast.message"/>
</template>
