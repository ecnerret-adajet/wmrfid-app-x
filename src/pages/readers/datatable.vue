<script setup>
import DeleteModal from '@/components/DeleteModal.vue';
import EditingModal from '@/components/EditingModal.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import Toast from '@/components/Toast.vue';
import { READER_STATUS } from '@/composables/useEnums';
import ApiService from '@/services/ApiService';
import { useAuthStore } from '@/stores/auth';
import Moment from 'moment';
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { VDataTableServer } from 'vuetify/components';

const emits = defineEmits(['pagination-changed']);

const props = defineProps({
    search: {
        type: String,
        default: ''
    },
    readerTypes: {
        type: Array,
        default: () => []
    },
    plants: {
        type: Array,
        default: () => []
    },
});

const authStore = useAuthStore();
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
const filters = ref(null);

const route = useRoute();
const router = useRouter();

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
        title: 'Plant',
        key: 'plant_code',
    },
    {
        title: 'Last Log',
        key: 'last_log',
    },
    {
        title: 'STATUS',
        key: 'status',
        sortable: false,
        align: 'center'
    },
    {
        title: 'IP ADDRESS',
        key: 'ip_address',
        align: 'center'
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

    ApiService.query('datatable/readers', {
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
    message: 'Reader deleted!',
    color: 'success',
    show: false
});

const editItem = (item) => {
    selectedReader.value = item;
    form.value.name = item.name;
    form.value.reader_type_id = item.reader_type?.id;
    form.value.plant_code = item.plant?.plant_code
    form.value.ip_address = item.ip_address
    editDialog.value = true;
}

const deleteItem = (item) => {
    selectedReader.value = item;
    deleteDialog.value = true;
}

const handleDelete = async () => {
    isLoading.value = true;
    toast.value.show = false
    try {
        const response = await ApiService.delete(`readers/${selectedReader.value.id}/delete`)
        isLoading.value = false;
        deleteDialog.value = false
        loadItems({
            page: page.value,
            itemsPerPage: itemsPerPage.value,
            sortBy: [{ key: 'created_at', order: 'desc' }],
            search: props.search
        });
        toast.value.message = 'Reader deleted successfully!'
        toast.value.show = true;
    } catch (error) {
        console.error('Error deleting:', error);
    }
}

const handleUpdate = async () => {
    isLoading.value = true;
    toast.value.show = false
    try {
        const response = await ApiService.put(`readers/${selectedReader.value.id}/update`, form.value)
        isLoading.value = false;
        editDialog.value = false
        loadItems({
            page: page.value,
            itemsPerPage: itemsPerPage.value,
            sortBy: [{ key: 'created_at', order: 'desc' }],
            search: props.search
        });
        toast.value.message = 'Reader updated successfully!'
        toast.value.show = true;
    } catch (error) {
        console.error('Error updating:', error);
    }
}

const applyFilters = (data) => {
    filters.value = data;
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{ key: 'created_at', order: 'desc' }],
        search: props.search
    });
}

const form = ref({
    'name': null,
    'reader_type_id': null,
    'plant_code': null,
    'ip_address': null
});

const showReaderLastTap = (reader, bay) => {
    let url = ''
    if (reader.plant?.is_warehouse_depot) {
        url = `/reader/depot-picklist/${reader.id}/${bay}`;
    } else {
        url = `/reader/picklist/${reader.id}/${bay}`;
    }
    window.open(url, '_blank');
}

const showCurtainScreen = (reader, bay) => {
    const url = `/loading-latest/${reader.id}/${bay}`;
    window.open(url, '_blank');
}

defineExpose({
    loadItems,
    applyFilters
})

</script>

<template>
    <VDataTableServer v-model:items-per-page="itemsPerPage" :headers="headers" :items="serverItems"
        :items-length="totalItems" :loading="loading" item-value="id" :search="search" @update:options="loadItems"
        class="text-no-wrap">

        <template #item.reader_type_id="{ item }">
            <!-- Use the reader_type_name instead of reader_type_id -->
            {{ item.reader_type?.name }}
        </template>

        <!-- Get plant object and name -->
        <template #item.plant_code="{ item }">
            {{ item.plant?.name }}
        </template>

        <template #item.last_log="{ item }">
            <span v-if="item.last_log?.created_at">
                {{ item.last_log?.created_at ? Moment(item.last_log?.created_at).format('MMMM D, YYYY h:mm A') : '' }}
            </span>
        </template>

        <template #item.status="{ item }">
            <div class="d-flex gap-1 ml-3">
                <VBadge v-if="item.status == READER_STATUS.ACTIVE" content="ACTIVE" color="success pa-3 px-8" />
                <VBadge v-else-if="item.status == READER_STATUS.INACTIVE" content="INACTIVE"
                    color="primary-2 pa-3 px-6 text-grey-100" />
                <VBadge v-else-if="item.status == READER_STATUS.UNREACHABLE" content="UNREACHABLE" color="error pa-3" />
                <VBadge v-else-if="item.status == READER_STATUS.DEACTIVATED" content="DEACTIVATED"
                    color="warning pa-3 px-6 text-grey-100" />
            </div>
        </template>

        <!-- Actions -->
        <template #item.actions="{ item }">
            <div class="d-flex gap-1 justify-center">
                <!-- Picklist  -->
                <template v-if="item.antennas?.some(antenna => antenna.bay_location) && item.is_tapping">
                    <v-menu location="start">
                        <template v-slot:activator="{ props: menuProps }">
                            <v-tooltip location="top">
                                <template v-slot:activator="{ props: tooltipProps }">
                                    <v-btn icon="ri-truck-line" variant="text" color="grey"
                                        v-bind="{ ...menuProps, ...tooltipProps }"></v-btn>
                                </template>
                                <span>View Picklist Screen</span>
                            </v-tooltip>
                        </template>
                        <v-list>
                            <v-list-item v-for="(antenna, i) in item.antennas.filter(a => a.bay_location)" :key="i"
                                :value="i">
                                <v-list-item-title @click="showReaderLastTap(item, antenna.bay_location.bay_no)"
                                    class="px-4">
                                    Bay No. {{ antenna.bay_location.bay_no }}
                                </v-list-item-title>
                            </v-list-item>
                        </v-list>
                    </v-menu>
                </template>
                <!-- Loading Curtain -->
                <template v-if="item.antennas?.some(antenna => antenna.bay_location) && item.is_tapping && !item.plant?.is_warehouse_depot">
                    <v-menu location="start">
                        <template v-slot:activator="{ props: menuProps }">
                            <v-tooltip location="top">
                                <template v-slot:activator="{ props: tooltipProps }">
                                    <v-btn icon="ri-computer-line" variant="text" color="grey"
                                        v-bind="{ ...menuProps, ...tooltipProps }"></v-btn>
                                </template>
                                <span>View Loading Curtain Screen</span>
                            </v-tooltip>
                        </template>
                        <v-list>
                            <v-list-item v-for="(antenna, i) in item.antennas.filter(a => a.bay_location)" :key="i"
                                :value="i">
                                <v-list-item-title @click="showCurtainScreen(item, antenna.bay_location.bay_no)"
                                    class="px-4">
                                    Bay No. {{ antenna.bay_location.bay_no }}
                                </v-list-item-title>
                            </v-list-item>
                        </v-list>
                    </v-menu>
                </template>

                <IconBtn v-if="authStore.user.is_super_admin || authStore.user.is_warehouse_admin" size="small"
                    @click="editItem(item)">
                    <VIcon icon="ri-pencil-line" />
                </IconBtn>
            </div>
        </template>
    </VDataTableServer>

    <!-- Not used, but prepared just incase -->
    <DeleteModal @close="deleteDialog = false" :show="deleteDialog" dialog-title="Delete Reader">
        <template #default>
            <VCardText>
                <p class="text-h5 text-bold-emphasis ps-2">Are you sure you want to delete this reader? This action is
                    irreversible</p>
            </VCardText>

            <div class="d-flex justify-end align-center mt-4">
                <v-btn color="secondary" variant="outlined" @click="deleteDialog = false"
                    class="px-12 mr-3">Cancel</v-btn>
                <PrimaryButton @click="handleDelete" color="error" class="px-12" type="submit" :loading="isLoading">
                    Delete
                </PrimaryButton>
            </div>
        </template>
    </DeleteModal>

    <EditingModal v-if="form.name && form.reader_type_id && form.plant_code" @close="editDialog = false"
        :show="editDialog" :dialog-title="`Update ${selectedReader.name}`">
        <template #default>
            <v-form @submit.prevent="handleUpdate">
                <v-select label="Select Plant" density="compact" :items="plants" v-model="form.plant_code"
                    :rules="[value => !!value || 'Please select an item from the list']">
                </v-select>
                <v-select class="mt-6" label="Select Reader Type" density="compact" :items="readerTypes"
                    v-model="form.reader_type_id" :rules="[value => !!value || 'Please select an item from the list']">
                </v-select>
                <v-text-field class="mt-6" density="compact" label="Reader Name" v-model="form.name"
                    :rules="[value => !!value || 'Reader name is required']" />
                <v-text-field class="mt-6" density="compact" label="IP Address" v-model="form.ip_address" />
            </v-form>
            <div class="d-flex justify-end align-center mt-4">
                <v-btn color="secondary" variant="outlined" @click="editDialog = false"
                    class="px-12 mr-3">Cancel</v-btn>
                <PrimaryButton @click="handleUpdate" color="primary" class="px-12" type="submit" :loading="isLoading">
                    Update
                </PrimaryButton>
            </div>
        </template>
    </EditingModal>
    <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event" />
</template>
