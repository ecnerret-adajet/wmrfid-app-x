<script setup>
import DeleteModal from '@/components/DeleteModal.vue';
import EditingModal from '@/components/EditingModal.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import { useAuthStore } from '@/stores/auth';
import Moment from "moment";
import { ref } from 'vue';
import { VDataTableServer } from 'vuetify/components';


const emits = defineEmits(['pagination-changed']);

const props = defineProps({
    search: {
        type: String,
        default: ''
    },
    plantsOption: {
        type: Array,
        default: () => []
    },
    rolesOption: {
        type: Array,
        default: () => []
    },
});

const authStore = useAuthStore();
const editDialog = ref(false);
const deleteDialog = ref(false);
const selectedUser = ref(null);
const isLoading = ref(false);
const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref('-created_at'); // Default sort
const errorMessage = ref(null)
const filters = ref(null);
const storageLocations = ref([]);

const headers = [
    {
        title: 'NAME',
        key: 'name',
    },
    {
        title: 'EMAIL',
        key: 'email',
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

    ApiService.query('datatable/users',{
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
    message: 'User deleted successfully!',
    color: 'success',
    show: false
});

const editItem = (item) => {
    selectedUser.value = item;
    form.value.name = item.name;
    form.value.email = item.email;
    form.value.storage_location_ids = item.storage_locations
    form.value.role_id = item.roles.length > 0 ? item.roles[0].id : 1;
    form.value.plant_ids = item.plants.map(plant => plant.id);
    errorMessage.value = '';
    editDialog.value = true;
}  

const deleteItem = (item) => {
    selectedUser.value = item;
    deleteDialog.value = true;
}

const handleDelete = async () => {
    isLoading.value = true;
    toast.value.show = false
    try {
        const response = await ApiService.delete(`users/${selectedUser.value.id}/delete`)
        isLoading.value = false;
        deleteDialog.value = false
        loadItems({
            page: page.value,
            itemsPerPage: itemsPerPage.value,
            sortBy: [{key: 'created_at', order: 'desc'}],
            search: props.search
        });
        toast.value.message = 'User deleted successfully!'
        toast.value.show = true;
    } catch (error) {
        console.error('Error deleting:', error);
    }
}

const handleUpdate = async () => {
    if (Array.isArray(form.value.storage_location_ids) && form.value.storage_location_ids.length === 0) {
        toast.value.color = "error"
        toast.value.message = "Please select atleast 1 storage location"
        toast.value.show = true;
        return;
    }

    isLoading.value = true;
    toast.value.show = false
    try {
        const response = await ApiService.put(`users/${selectedUser.value.id}/update`, form.value)
        isLoading.value = false;
        editDialog.value = false
        loadItems({
            page: page.value,
            itemsPerPage: itemsPerPage.value,
            sortBy: [{key: 'created_at', order: 'desc'}],
            search: props.search
        });
        toast.value.message = 'User updated successfully!'
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
    'email': null,
    'storage_location_ids': [],
    'role_id': null,
    'plant_ids': [],
});

watch(
    () => form.value.plant_ids,
    (selectedPlantIds) => {

        const matchedPlants = props.plantsOption.filter(plant =>
            selectedPlantIds.includes(plant.id)
        );

        // Collect and flatten storage_locations from matched plants
        const locations = matchedPlants.flatMap(plant => plant.storage_locations || []);

        const uniqueLocations = locations.filter(
            (loc, index, self) => index === self.findIndex(l => l.id === loc.id)
        );

        storageLocations.value = uniqueLocations;

    },
    { immediate: true, deep: true } // This will ensure it runs immediately when the component mounts
);

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

    <template #item.created_at="{ item }">
        {{ item.created_at ? Moment(item.created_at).format('MMMM D, YYYY') : '' }}
    </template>

    <template #item.updated_at="{ item }">
        {{ item.updated_at ? Moment(item.updated_at).format('MMMM D, YYYY') : '' }}
    </template>

    <!-- Actions -->
    <template #item.actions="{ item }">
      <div v-if="authStore.user?.is_super_admin" class="d-flex gap-1">
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

    <DeleteModal @close="deleteDialog = false" :show="deleteDialog" dialog-title="Delete User">
        <template #default>
            <VCardText>
                <p class="text-h5 text-bold-emphasis ps-2">Are you sure you want to delete this user? This action is irreversible</p>
            </VCardText>

            <div class="d-flex justify-end align-center mt-4">
                <v-btn color="secondary" variant="outlined" @click="deleteDialog = false" class="px-12 mr-3">Cancel</v-btn>
                <PrimaryButton @click="handleDelete" color="error" class="px-12" type="submit" :loading="isLoading">
                    Delete
                </PrimaryButton>
            </div>
        </template>
    </DeleteModal>

    <EditingModal v-if="form.name && form.email" @close="editDialog = false" 
        :show="editDialog" :dialog-title="`Update ${selectedUser.name}`">
        <template #default>
            <v-form @submit.prevent="handleUpdate">
                <v-select class="mt-4" label="Select Role" density="compact"
                    :items="rolesOption" v-model="form.role_id"
                    :rules="[value => !!value || 'Role is required']"
                >
                </v-select>
                <v-text-field class="mt-6" density="compact" 
                    label="Name"
                    v-model="form.name" 
                    :rules="[value => !!value || 'User name is required']"
                />
                <v-text-field class="mt-6" density="compact" 
                    label="Email address"
                    v-model="form.email" 
                    :rules="[value => !!value || 'Email address is required']"
                />
                <v-select class="mt-4" v-if="form.role_id !== 1"
                    v-model="form.plant_ids"
                    :items="plantsOption"
                    label="Select Plants"
                    chips
                    multiple
                    closable-chips
                    :rules="[
                        value => (Array.isArray(value) && value.length > 0) || 'Please select an item from the list'
                    ]"
                />
                <v-select class="mt-4" 
                    v-model="form.storage_location_ids"
                    :items="storageLocations"
                    v-if="form.role_id !== 1"
                    item-title="name"
                    item-value="id"
                    label="Select Storage Locations"
                    chips
                    multiple
                    return-object
                    closable-chips
                    :rules="[
                        value => (Array.isArray(value) && value.length > 0) || 'Please select at least one storage location'
                    ]"
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

    <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event"/>
</template>
