<script setup>
import DeleteModal from '@/components/DeleteModal.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import Toast from '@/components/Toast.vue';
import { READER_STATUS } from '@/composables/useEnums';
import ApiService from '@/services/ApiService';
import { ref } from 'vue';
import { VDataTableServer } from 'vuetify/components';

const emits = defineEmits(['pagination-changed']);

const props = defineProps({
    search: {
        type: String,
        default: ''
    }
});

const editDialog = ref(false);
const deleteDialog = ref(false);
const selectedReader = ref(null);
const isLoading = ref(false);
const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref('-created_at'); // Default sort

const headers = [
    {
        title: 'READER NAME',
        key: 'name',
    },
    {
        title: 'READER TYPE',
        key: 'reader_type_id',
    },
    {
        title: 'STORAGE LOCATION',
        key: 'storage_location_id',
    },
    {
        title: 'STATUS',
        key: 'status',
        sortable: false,
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

    ApiService.query('datatable/readers',{
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
    message: 'Reader deleted!',
    color: 'success',
    show: false
});

const editItem = (item) => {

}

const deleteItem = (item) => {
    selectedReader.value = item
    deleteDialog.value = true
}

const handleDelete = async () => {

    isLoading.value = true;
    try {
        const response = await ApiService.delete(`readers/${selectedReader.value.id}/delete`)
        toast.value.show = true;
        isLoading.value = false;
        deleteDialog.value = false
        loadItems({
            page: page.value,
            itemsPerPage: itemsPerPage.value,
            sortBy: [{key: 'created_at', order: 'desc'}],
            search: props.search
        });
    } catch (error) {
        console.error('Error deleting:', error);
    }
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

    <template #item.reader_type_id="{ item }">
        <!-- Use the reader_type_name instead of reader_type_id -->
        {{ item.reader_type?.name }}
    </template>

    <template #item.storage_location_id="{ item }">
        {{ item.storage_location?.name }}
    </template>

    <template #item.status="{ item }">
        <div class="d-flex gap-1 ml-3">
            <VBadge v-if="item.status == READER_STATUS.ACTIVE" content="ACTIVE" color="success pa-3 "  />
            <VBadge v-else content="INACTIVE" color="error pa-3"  />
        </div>
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

    <DeleteModal @close="deleteDialog = false" :show="deleteDialog" dialog-title="Delete Reader">
        <template #default>
            <VCardText>
                <p class="text-h5 text-bold-emphasis ps-2">Are you sure you want to delete this reader? This action is irreversible</p>
            </VCardText>

            <div class="d-flex justify-end align-center mt-4">
                <v-btn color="secondary" variant="outlined" @click="deleteDialog = false" class="px-12 mr-3">Cancel</v-btn>
                <PrimaryButton @click="handleDelete" color="error" class="px-12" type="submit" :loading="isLoading">
                    Delete
                </PrimaryButton>
            </div>
        </template>
    </DeleteModal>

    <Toast :show="toast.show" :message="toast.message"/>

</template>
