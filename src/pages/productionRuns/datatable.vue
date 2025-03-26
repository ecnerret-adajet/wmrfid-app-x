<script setup>
import DeleteModal from '@/components/DeleteModal.vue';
import EditingModal from '@/components/EditingModal.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import Moment from "moment";
import { ref } from 'vue';
import { VDataTableServer } from 'vuetify/components';

const emits = defineEmits(['pagination-changed']);

const props = defineProps({
    search: {
        type: String,
        default: ''
    },
    materialsOption: {
        type: Array,
        default: () => []
    },
    productionLinesOption: {
        type: Array,
        default: () => []
    }
});

const editDialog = ref(false);
const deleteDialog = ref(false);
const selectedProductionRun = ref(null);
const isLoading = ref(false);
const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref('-created_at'); // Default sort
const errorMessage = ref(null)

const headers = [
    {
        title: 'MATERIAL',
        key: 'material_id',
    },
    {
        title: 'PRODUCTION LINE',
        key: 'production_line_id',
    },
    {
        title: 'START DATE',
        key: 'start_date_time',
    },
    {
        title: 'END DATE',
        key: 'end_date_time',
    },
    {
        title: 'CREATED AT',
        key: 'created_at',
    },
    {
        title: 'LAST UPDATED AT',
        key: 'updated_at',
    },
    {
        title: 'ACTIONS',
        key: 'actions',
        sortable: false,
    },
]

const loadItems = ({ page, itemsPerPage, sortBy, search }) => {
    
    loading.value = true
    if (sortBy && sortBy.length > 0) {
        const sort = sortBy[0];  // Assuming single sort field
        sortQuery.value = `${sort.key}`;  // Default ascending order
        if (sort.order === 'desc') {
            sortQuery.value = `-${sort.key}`;  // Prefix with minus for descending order
        }
    } else {
        sortQuery.value = '-created_at';
    }

    ApiService.query('datatable/production-runs',{
        params: {
            page,
            itemsPerPage,
            sort: sortQuery.value,
            search: props.search
        }
        })
        .then((response) => {
            totalItems.value = response.data.total;
            serverItems.value = response.data.data
            loading.value = false

            emits('pagination-changed', { page, itemsPerPage, sortBy: sortQuery.value, search: props.search });
        })
        .catch((error) => {
            console.log(error);
        });
}

const toast = ref({
    message: 'Production run deleted successfully!',
    color: 'success',
    show: false
});

const editItem = (item) => {
    selectedProductionRun.value = item;
    form.value.material_id = item.material_id;
    form.value.production_line_id = item.production_line_id;
    form.value.start_date_time = item.start_date_time;
    form.value.end_date_time = item.end_date_time;
    errorMessage.value = '';
    editDialog.value = true;
}  

const deleteItem = (item) => {
    selectedProductionRun.value = item;
    deleteDialog.value = true;
}

const handleDelete = async () => {
    isLoading.value = true;
    toast.value.show = false
    try {
        const response = await ApiService.delete(`production-runs/${selectedProductionRun.value.id}/delete`)
        isLoading.value = false;
        deleteDialog.value = false
        loadItems({
            page: page.value,
            itemsPerPage: itemsPerPage.value,
            sortBy: [{key: 'created_at', order: 'desc'}],
            search: props.search
        });
        toast.value.message = 'Production run deleted successfully!'
        toast.value.show = true;
    } catch (error) {
        console.error('Error deleting:', error);
    }
}

const handleUpdate = async () => {
    isLoading.value = true;
    toast.value.show = false
    try {
        const response = await ApiService.put(`production-runs/${selectedProductionRun.value.id}/update`, form.value)
        isLoading.value = false;
        editDialog.value = false
        loadItems({
            page: page.value,
            itemsPerPage: itemsPerPage.value,
            sortBy: [{key: 'created_at', order: 'desc'}],
            search: props.search
        });
        toast.value.message = 'Production run updated successfully!'
        toast.value.show = true;
    } catch (error) {
        errorMessage.value = error.response?.data?.message || 'An unexpected error occurred.';
        console.error('Error updating:', error);
        isLoading.value = false;
    }
}

const form = ref({
    'production_line_id': null,
    'material_id': null,
    'start_date_time': null,
    'end_date_time': null
});

const clearStartDate = () => {
    form.value.start_date_time = null
}

const clearEndDate = () => {
    form.value.end_date_time = null
}

defineExpose({
    loadItems
})

</script>

<template>
    <VDataTableServer
        v-model:items-per-page="itemsPerPage"
        :headers="headers"
        :items="serverItems"
        :items-length="totalItems"
        :loading="loading"
        item-value="id"
        :search="search"
        @update:options="loadItems"
        class="text-no-wrap"
    >

    <template #item.material_id="{ item }">
        {{ item.material?.description }}
    </template>

    <template #item.production_line_id="{ item }">
        {{ item.production_line?.name }}
    </template>

    <template #item.start_date_time="{ item }">
        {{ item.start_date_time ? Moment(item.start_date_time).format('MMMM D, YYYY h:mm A') : '' }}
    </template>

    <template #item.end_date_time="{ item }">
        {{ item.end_date_time ? Moment(item.end_date_time).format('MMMM D, YYYY h:mm A') : '' }}
    </template>

    <template #item.created_at="{ item }">
        {{ item.created_at ? Moment(item.created_at).format('MMMM D, YYYY') : '' }}
    </template>

    <template #item.updated_at="{ item }">
        {{ item.updated_at ? Moment(item.updated_at).format('MMMM D, YYYY') : '' }}
    </template>

    <!-- Actions -->
    <template #item.actions="{ item }">
      <div class="d-flex gap-1">
        <IconBtn
          size="small"
          @click="editItem(item)"
        >
          <VIcon icon="ri-pencil-line" />
        </IconBtn>
        <IconBtn
          size="small"
          @click="deleteItem(item)"
        >
          <VIcon icon="ri-delete-bin-line" />
        </IconBtn>
      </div>
    </template>
    </VDataTableServer>

    <DeleteModal @close="deleteDialog = false" :show="deleteDialog" dialog-title="Delete Production Run">
        <template #default>
            <VCardText>
                <p class="text-h5 text-bold-emphasis ps-2">Are you sure you want to delete this production run? 
                </p>
                <span class="text-subtitle-1 ps-2 text-error">Warning: This action is irreversible</span>
            </VCardText>

            <div class="d-flex justify-end align-center mt-4">
                <v-btn color="secondary" variant="outlined" @click="deleteDialog = false" class="px-12 mr-3">Cancel</v-btn>
                <PrimaryButton @click="handleDelete" color="error" class="px-12" type="submit" :loading="isLoading">
                    Delete
                </PrimaryButton>
            </div>
        </template>
    </DeleteModal>

    <EditingModal v-if="form.material_id && form.production_line_id" @close="editDialog = false" 
        :show="editDialog" :dialog-title="`Update ${selectedProductionRun.name}`">
        <template #default>
            <v-form @submit.prevent="handleUpdate">
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
                        <DateTimePicker @cleared="clearStartDate" v-model="form.start_date_time" placeholder="Start Datetime" />
                    </div>
                    <div class="mt-4">
                        <DateTimePicker @cleared="clearEndDate" v-model="form.end_date_time" placeholder="End Datetime" />
                    </div>
                    <VAlert v-if="errorMessage" class="mt-4" color="error" variant="tonal">
                        {{ errorMessage }}
                    </VAlert>
                </div>
            </v-form>
            <VAlert v-if="errorMessage" class="mt-4" color="error" variant="tonal">
                {{ errorMessage }}
            </VAlert>
            <div class="d-flex justify-end align-center mt-4">
                <v-btn color="secondary" variant="outlined" @click="editDialog = false" class="px-12 mr-3">Cancel</v-btn>
                <PrimaryButton @click="handleUpdate" color="primary" class="px-12" type="submit" :loading="isLoading">
                    Update
                </PrimaryButton>
            </div>
        </template>
    </EditingModal>

    <Toast :show="toast.show" :message="toast.message"/>

</template>
