<script setup>
import EditingModal from '@/components/EditingModal.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import Toast from '@/components/Toast.vue';
import { generateSlug } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import Moment from "moment";
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { VDataTableServer } from 'vuetify/components';

import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

const emits = defineEmits(['pagination-changed']);

const props = defineProps({
    search: {
        type: String,
        default: ''
    },
    plantsOption: Array
});

const editDialog = ref(false);
const selectedWarehouse = ref(null);
const isLoading = ref(false);
const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref('-created_at'); // Default sort
const errorMessage = ref(null)
const filters = ref(null);
const router = useRouter();

const headers = [
    {
        title: 'WAREHOUSE',
        key: 'name',
    },
    {
        title: 'CODE',
        key: 'code',
    },
    {
        title: 'PLANT',
        key: 'plant_id',
    },
    {
        title: 'STORAGE LAYERS',
        key: 'layer_count',
        align: 'center',
        sortable: false,
    },
    {
        title: 'LAST UPDATED AT',
        key: 'updated_at',
    },
    {
        title: 'ACTIONS',
        key: 'actions',
        sortable: false,
        align: 'center'
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

    ApiService.query('datatable/warehouse',{
        params: {
            page,
            itemsPerPage,
            sort: sortQuery.value,
            search: props.search,
            filters: filters.value
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
    message: 'Warehouse updated successfully!',
    color: 'success',
    show: false
});

const editItem = (item) => {
    selectedWarehouse.value = item;
    form.value.name = item.name;
    form.value.code = item.code;
    form.value.plant_id = item.plant_id;
    form.value.layer_count = item.layer_count;
    errorMessage.value = '';
    editDialog.value = true;
}  


const handleUpdate = async () => {
    isLoading.value = true;
    toast.value.show = false
    try {
        const response = await ApiService.put(`warehouse/${selectedWarehouse.value.id}/update`, form.value)
        isLoading.value = false;
        editDialog.value = false
        loadItems({
            page: page.value,
            itemsPerPage: itemsPerPage.value,
            sortBy: [{key: 'created_at', order: 'desc'}],
            search: props.search
        });
        toast.value.message = 'Warehouse updated successfully!'
        toast.value.show = true;
    } catch (error) {
        errorMessage.value = error.response?.data?.message || 'An unexpected error occurred.';
        console.error('Error updating:', error);
        isLoading.value = false;
    }
}

const applyFilters = (data) => {
    filters.value = data;
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{key: 'created_at', order: 'desc'}],
        search: props.search
    });
}

const form = ref({
    'name': null,
    'code': null,
    'plant_id': null,
    'layer_count': null,
});

const viewMap = (item) => {
    router.push({
        path: `/warehouse-map/${generateSlug(item.name)}`,
    });
}

defineExpose({
    loadItems,
    applyFilters
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

    <template #item.plant_id="{ item }">
        {{ item.plant?.name }}
    </template>

    <template #item.created_at="{ item }">
        {{ item.created_at ? Moment(item.created_at).format('MMMM D, YYYY') : '' }}
    </template>

    <template #item.updated_at="{ item }">
        {{ item.updated_at ? Moment(item.updated_at).format('MMMM D, YYYY') : '' }}
    </template>

    <!-- Actions -->
    <template #item.actions="{ item }">
      <div class="d-flex gap-1 justify-center align-center">

        <IconBtn v-if="authStore.user?.is_super_admin || authStore.user?.is_warehouse_admin"
          size="small"
          @click="editItem(item)"
        >
          <VIcon icon="ri-pencil-line" />
        </IconBtn>
        <IconBtn
          size="small"
          @click="viewMap(item)"
        >
          <VIcon icon="ri-map-2-line" />
        </IconBtn>
      </div>
    </template>
    </VDataTableServer>
    <EditingModal v-if="form.name && form.code" @close="editDialog = false" 
        :show="editDialog" :dialog-title="`Update ${selectedWarehouse.name}`">
        <template #default>
            <v-form @submit.prevent="handleUpdate">
                <v-select class="mt-4" label="Select Plant" density="compact"
                    :items="plantsOption" v-model="form.plant_id"
                    :rules="[value => !!value || 'Plant is required']"
                >
                </v-select>
                <div class="mt-4">
                    <v-text-field class="mt-6" density="compact" 
                        label="Layer Count"
                        v-model="form.layer_count" 
                        type="number"
                        :min="1"
                        :max="10"
                        hint="This sets the level of layer in the warehouse"
                        :rules="[value => !!value || 'Storage layer count is required']"
                    />
                </div>
                <v-text-field class="mt-6" density="compact" 
                    label="Name"
                    v-model="form.name" 
                    :rules="[value => !!value || 'Name is required']"
                />
                <v-text-field class="mt-6" density="compact" 
                    label="Code"
                    v-model="form.code" 
                    :rules="[value => !!value || 'Code is required']"
                />
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
