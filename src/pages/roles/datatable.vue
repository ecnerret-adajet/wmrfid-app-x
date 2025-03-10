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
    permissions: {
        type: Array,
        default: () => []
    }
});

const editDialog = ref(false);
const deleteDialog = ref(false);
const selectedRole = ref(null);
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
        title: 'NAME',
        key: 'name',
    },
    {
        title: 'DESCRIPTION',
        key: 'description',
    },
    {
        title: 'NO. OF PERMISSIONS',
        key: 'no_of_permissions',
        sortable: false,
    },
    {
        title: 'DATE CREATED',
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

    ApiService.query('datatable/roles',{
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
    message: 'Role deleted successfully!',
    color: 'success',
    show: false
});

const editItem = (item) => {
    selectedRole.value = item;
    form.value.name = item.name;
    form.value.description = item.description;
    form.value.permissions = item.permissions;
    errorMessage.value = '';
    editDialog.value = true;
}  

const deleteItem = (item) => {
    selectedRole.value = item;
    deleteDialog.value = true;
}

const handleDelete = async () => {
    isLoading.value = true;
    toast.value.show = false
    try {
        const response = await ApiService.delete(`roles/${selectedRole.value.id}/delete`)
        isLoading.value = false;
        deleteDialog.value = false
        loadItems({
            page: page.value,
            itemsPerPage: itemsPerPage.value,
            sortBy: [{key: 'created_at', order: 'desc'}],
            search: props.search
        });
        toast.value.message = 'Role deleted successfully!'
        toast.value.show = true;
    } catch (error) {
        console.error('Error deleting:', error);
    }
}

const handleUpdate = async () => {
    isLoading.value = true;
    toast.value.show = false
    try {
        const response = await ApiService.put(`roles/${selectedRole.value.id}/update`, form.value)
        isLoading.value = false;
        editDialog.value = false
        loadItems({
            page: page.value,
            itemsPerPage: itemsPerPage.value,
            sortBy: [{key: 'created_at', order: 'desc'}],
            search: props.search
        });
        toast.value.message = 'Role updated successfully!'
        toast.value.show = true;
    } catch (error) {
        errorMessage.value = error.response?.data?.message || 'An unexpected error occurred.';
        console.error('Error updating:', error);
        isLoading.value = false;
    }
}

const form = ref({
    'name': null,
    'description': null,
    'permissions': []
});

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

    <template #item.created_at="{ item }">
        {{ item.created_at ? Moment(item.created_at).format('MMMM D, YYYY') : '' }}
    </template>

    <template #item.no_of_permissions="{ item }">
        
        <span class="ml-4">{{ item.permissions.length }}</span>
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

    <DeleteModal @close="deleteDialog = false" :show="deleteDialog" dialog-title="Delete Role">
        <template #default>
            <VCardText>
                <p class="text-h5 text-bold-emphasis ps-2">Are you sure you want to delete this role? This action is irreversible</p>
            </VCardText>

            <div class="d-flex justify-end align-center mt-4">
                <v-btn color="secondary" variant="outlined" @click="deleteDialog = false" class="px-12 mr-3">Cancel</v-btn>
                <PrimaryButton @click="handleDelete" color="error" class="px-12" type="submit" :loading="isLoading">
                    Delete
                </PrimaryButton>
            </div>
        </template>
    </DeleteModal>

    <EditingModal v-if="form.name && form.description" @close="editDialog = false" 
        :show="editDialog" :dialog-title="`Update ${selectedRole.name}`">
        <template #default>
            <v-form @submit.prevent="handleUpdate">
                <v-text-field class="mt-6" density="compact" 
                    label="Role Name"
                    v-model="form.name" 
                    :rules="[value => !!value || 'Role name is required']"
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
