<script setup>
import EditingModal from '@/components/EditingModal.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import Toast from '@/components/Toast.vue';
import { useAuthorization } from '@/composables/useAuthorization';
import ApiService from '@/services/ApiService';
import { useAuthStore } from '@/stores/auth';
import Moment from "moment";
import { computed, ref } from 'vue';
import { VDataTableServer } from 'vuetify/components';

const emits = defineEmits(['pagination-changed']);

const props = defineProps({
    search: {
        type: String,
        default: ''
    },
    storageSectionsOption: Array,
});


const { authUserCan } = useAuthorization();
const authStore = useAuthStore();
const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref('-created_at'); // Default sort
const filters = ref(null);

const toast = ref({
    message: 'Warehouse updated successfully!',
    color: 'success',
    show: false
});


const headers = [
    {
        title: 'BU MATERIAL',
        key: 'bu_material',
    },
    {
        title: 'DESCRIPTION',
        key: 'description',
    },
    {
        title: 'PLANT',
        key: 'plant',
    },
    {
        title: 'CODE',
        key: 'code',
    },
    {
        title: 'MAX STORAGE PERIOD',
        key: 'max_storage_period',
        align: 'center',
    },
    {
        title: 'STORAGE SECTION',
        key: 'storage_section',
        align: 'center',
        sortable: false
    },
    // {
    //     title: 'MAX STORAGE PERIOD',
    //     key: 'max_storage_period',
    //     align: 'center',
    //     sortable: false
    // },
    {
        title: 'LAST UPDATED AT',
        key: 'updated_at',
    },
    {
        title: 'ACTIONS',
        key: 'actions',
        align: 'center',
        sortable: false
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

    ApiService.query('datatable/materials',{
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

const applyFilters = (data) => {
    filters.value = data;
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{key: 'created_at', order: 'desc'}],
        search: props.search
    });
}

const selectedMaterial = ref(null);
const form = ref({
    storage_section_id: null,
    storage_section_value_id: null,
});
const errorMessage = ref('');
const editDialog = ref(false);
const editItem = (item) => {
    selectedMaterial.value = item;
    form.value.storage_section_id = item.storage_section_id;
    form.value.storage_section_value_id = item.storage_section_value_id || null; 
    errorMessage.value = '';
    editDialog.value = true;
}

const isLoading = ref(false);
const handleUpdate = async () => {
    isLoading.value = true;
    toast.value.show = false
    try {
        const response = await ApiService.put(`materials/${selectedMaterial.value.id}/update`, form.value)

        isLoading.value = false;
        editDialog.value = false
        loadItems({
            page: page.value,
            itemsPerPage: itemsPerPage.value,
            sortBy: [{ key: 'updated_at', order: 'asc' }],
            search: props.search
        });
        toast.value.message = 'Material updated successfully!'
        toast.value.show = true;

    } catch (error) {
        console.log(error?.response?.data)
        if (error?.response?.data?.message === 'Unable to update storage section.') {
            errorMessage.value = error?.response?.data?.error || 'An unexpected error occurred.'
            isLoading.value = false;
        } else {
            errorMessage.value = error.response?.data?.message || 'An unexpected error occurred.';
            console.error('Error updating:', error);
            isLoading.value = false;
        }
    } finally { 
        
    }
}

const materialTypes = computed(() => {
    if (!form.value.storage_section_id || !props.storageSectionsOption) {
        return [];
    }
    
    // Find the storage section object matching the selected ID
    const selectedSection = props.storageSectionsOption.find(
        section => section.id === form.value.storage_section_id
    );

    // Return its nested material types array, fallback to empty array
    return selectedSection?.material_types || [];
});

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

    <template #item.plant="{ item }">
        <span class="font-weight-bold">{{ item.plant?.plant_code }}</span><br />
        <span v-if="item.plant" class="text-subtitle-1">{{ item.plant?.name }}</span>
    </template>

    <template #item.storage_section="{ item }">
        <span v-if="item.storage_section_id" class="font-weight-bold">{{ item.storage_section?.name }}</span><br />
        <span v-if="item.storage_section_value_id" class="text-subtitle-1">{{ item.storage_section_value?.name }}</span>
    </template>

    <template #item.created_at="{ item }">
        {{ item.created_at ? Moment(item.created_at).format('MMMM D, YYYY') : '' }}
    </template>

    <template #item.updated_at="{ item }">
        {{ item.updated_at ? Moment(item.updated_at).format('MMMM D, YYYY') : '' }}
    </template>
    <template #item.actions="{ item }">
        <div class="d-flex gap-1 justify-center align-center">

            <!-- <IconBtn  size="small"
                @click="editItem(item)">
                <VIcon icon="ri-pencil-line" />
            </IconBtn> -->
            <IconBtn v-if="authStore.user?.is_super_admin || authUserCan('edit.materials')" size="small"
                @click="editItem(item)">
                <VIcon icon="ri-pencil-line" />
            </IconBtn>
        </div>
    </template>

    </VDataTableServer>
    <EditingModal v-if="selectedMaterial"  @close="editDialog = false" :show="editDialog"
        :dialog-title="`Update ${selectedMaterial.bu_material} - ${selectedMaterial.description}`">
        <template #default>
            <v-form @submit.prevent="handleUpdate">
                <v-text-field class="mt-6" density="compact" label="Material" disabled v-model="selectedMaterial.description"
                    :rules="[value => !!value || 'Name is required']" />
                <v-text-field class="mt-6" density="compact" label="Material Code" disabled v-model="selectedMaterial.bu_material"
                    :rules="[value => !!value || 'Code is required']" />
                <v-select
                    class="mt-6"
                    label="Storage Section"
                    density="compact"
                    :items="storageSectionsOption"
                    item-title="name"
                    item-value="id"
                    v-model="form.storage_section_id"
                    clearable
                />
                <v-select
                    class="mt-6"
                    label="Storage Section Value"
                    density="compact"
                    :items="materialTypes"
                    item-title="name"
                    item-value="id"
                    v-model="form.storage_section_value_id"
                    clearable
                />
            </v-form>
            <VAlert v-if="errorMessage" class="mt-4" color="error" variant="tonal">
                {{ errorMessage }}
            </VAlert>
            <div class="d-flex justify-end align-center mt-4">
                <v-btn color="secondary" variant="outlined" @click="editDialog = false"
                    class="px-12 mr-3">Cancel</v-btn>
                <PrimaryButton @click="handleUpdate" color="primary" class="px-12" type="submit" :loading="isLoading">
                    Update
                </PrimaryButton>
            </div>
        </template>
    </EditingModal>
    <Toast :show="toast.show" :message="toast.message" color="success" @update:show="toast.show = $event" />
</template>
