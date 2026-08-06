<script setup>
import DeleteModal from '@/components/DeleteModal.vue';
import FilteringModal from '@/components/FilteringModal.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import Toast from '@/components/Toast.vue';
import { useAuthorization } from '@/composables/useAuthorization';
import ApiService from '@/services/ApiService';
import Moment from 'moment';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const { authUserCan } = useAuthorization();

const searchValue = ref('');
const serverItems = ref([]);
const totalItems = ref(0);
const itemsPerPage = ref(15);
const page = ref(1);
const pageLoading = ref(false);

const filterModalVisible = ref(false);
const deleteModalVisible = ref(false);
const selectedRequest = ref(null);
const deleteLoading = ref(false);

const toast = ref({
    message: '',
    color: 'success',
    show: false
});

const filters = ref({
    status: null,
});

const statusOptions = [
    { title: 'All', value: null },
    { title: 'Pending', value: 'pending' },
    { title: 'Printed', value: 'printed' },
];

const headers = [
    { title: 'ID', key: 'id', align: 'center', sortable: true },
    { title: 'REQUESTER', key: 'requester.name', sortable: false },
    { title: 'PALLETS', key: 'pallets_count', align: 'center', sortable: false },
    { title: 'STATUS', key: 'status', align: 'center', sortable: false },
    { title: 'NOTES', key: 'notes', sortable: false },
    { title: 'CREATED AT', key: 'created_at', sortable: true },
    { title: 'ACTIONS', key: 'actions', align: 'center', sortable: false },
];

const loadItems = async ({ page: pageNum, itemsPerPage: perPage, sortBy, search }) => {
    pageLoading.value = true;
    page.value = pageNum;

    let sortQuery = '-created_at';
    if (sortBy && sortBy.length > 0) {
        sortQuery = sortBy[0].order === 'desc' ? `-${sortBy[0].key}` : sortBy[0].key;
    }

    try {
        const params = {
            page: pageNum,
            per_page: perPage,
            search: searchValue.value,
        };

        if (filters.value.status) {
            params.status = filters.value.status;
        }

        const response = await ApiService.query('pallet-print-requests', { params });
        serverItems.value = response.data.data;
        totalItems.value = response.data.total;
    } catch (error) {
        console.error('Error loading print requests:', error);
        toast.value = {
            message: 'Failed to load print requests.',
            color: 'error',
            show: true
        };
    } finally {
        pageLoading.value = false;
    }
};

const handleSearch = () => {
    loadItems({
        page: 1,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{ key: 'created_at', order: 'desc' }],
        search: searchValue.value
    });
};

const filterModalOpen = () => {
    filterModalVisible.value = true;
};

const applyFilter = () => {
    loadItems({
        page: 1,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{ key: 'created_at', order: 'desc' }],
        search: searchValue.value
    });
    filterModalVisible.value = false;
};

const resetFilter = () => {
    filters.value.status = null;
    loadItems({
        page: 1,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{ key: 'created_at', order: 'desc' }],
        search: searchValue.value
    });
    filterModalVisible.value = false;
};

const isFiltersEmpty = computed(() => {
    return !filters.value.status;
});

const viewRequest = (item) => {
    router.push(`/pallet-print-requests/${item.id}`);
};

const createRequest = () => {
    router.push('/pallet-print-requests/create');
};

const openDeleteModal = (item) => {
    selectedRequest.value = item;
    deleteModalVisible.value = true;
};

const handleDelete = async () => {
    if (!selectedRequest.value) return;
    deleteLoading.value = true;

    try {
        await ApiService.delete(`pallet-print-requests/${selectedRequest.value.id}`);
        toast.value = {
            message: 'Print request deleted successfully!',
            color: 'success',
            show: true
        };
        deleteModalVisible.value = false;
        selectedRequest.value = null;
        loadItems({
            page: page.value,
            itemsPerPage: itemsPerPage.value,
            sortBy: [{ key: 'created_at', order: 'desc' }],
            search: searchValue.value
        });
    } catch (error) {
        console.error('Error deleting print request:', error);
        toast.value = {
            message: error.response?.data?.message || 'Failed to delete print request.',
            color: 'error',
            show: true
        };
    } finally {
        deleteLoading.value = false;
    }
};

const handleMarkAsPrinted = async (item) => {
    try {
        const response = await ApiService.post(`pallet-print-requests/${item.id}/mark-as-printed`);
        toast.value = {
            message: 'Print request marked as printed. QR codes generated.',
            color: 'success',
            show: true
        };
        loadItems({
            page: page.value,
            itemsPerPage: itemsPerPage.value,
            sortBy: [{ key: 'created_at', order: 'desc' }],
            search: searchValue.value
        });
    } catch (error) {
        console.error('Error marking as printed:', error);
        toast.value = {
            message: error.response?.data?.message || 'Failed to mark as printed.',
            color: 'error',
            show: true
        };
    }
};

const handleDownload = async (item) => {
    try {
        const response = await ApiService.get(
            `pallet-print-requests/${item.id}/download`,
            '',
            {
                responseType: 'blob'
            }
        );

        // Create download URL from the blob response
        const url = window.URL.createObjectURL(response.data);

        const link = document.createElement('a');
        link.href = url;
        link.download = `pallet_qrcodes_${item.id}.zip`;

        document.body.appendChild(link);
        link.click();

        // Cleanup
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

    } catch (error) {
        console.error('Error downloading QR codes:', error);

        toast.value = {
            message: 'Failed to download QR codes.',
            color: 'error',
            show: true
        };
    }
};

// const handleDownload = async (item) => {
//     try {
//         const response = await ApiService.get(`pallet-print-requests/${item.id}/download`, '', {
//             responseType: 'blob'
//         });
//         const url = window.URL.createObjectURL(new Blob([response.data]));
//         const link = document.createElement('a');
//         link.href = url;
//         link.setAttribute('download', `pallet_qrcodes_${item.id}.zip`);
//         document.body.appendChild(link);
//         link.click();
//         link.remove();
//         window.URL.revokeObjectURL(url);
//     } catch (error) {
//         console.error('Error downloading:', error);
//         toast.value = {
//             message: 'Failed to download QR codes.',
//             color: 'error',
//             show: true
//         };
//     }
// };
</script>

<template>
    <div>
        <!-- Header -->
        <div class="d-flex gap-4 align-center justify-center mb-2">
            <VTextField
                v-model="searchValue"
                label="Search"
                placeholder="Search by notes or requester..."
                append-inner-icon="ri-search-line"
                single-line
                hide-details
                density="compact"
                class="flex-grow-1"
                @keyup.enter="handleSearch"
            />
            <v-btn class="d-flex align-center" prepend-icon="ri-search-eye-line" @click="handleSearch">
                Search
            </v-btn>
        </div>

        <!-- Action Buttons -->
        <div class="mb-2 d-flex flex-wrap align-center gap-2 justify-end">
            <v-btn class="d-flex align-center" prepend-icon="ri-equalizer-line" @click="filterModalOpen">
                Filter
            </v-btn>
            <v-btn class="d-flex align-center" prepend-icon="ri-add-line" color="primary" @click="createRequest">
                New Print Request
            </v-btn>
        </div>

        <!-- Data Table -->
        <VCard>
            <VDataTableServer
                v-model:items-per-page="itemsPerPage"
                :headers="headers"
                :items="serverItems"
                :items-length="totalItems"
                :loading="pageLoading"
                item-value="id"
                @update:options="loadItems"
                class="text-no-wrap"
            >
                <template #item.id="{ item }">
                    <span class="font-weight-bold text-primary cursor-pointer" @click="viewRequest(item)">
                        #{{ item.id }}
                    </span>
                </template>

                <template #item.requester.name="{ item }">
                    <span>{{ item.requester?.name || 'N/A' }}</span>
                </template>

                <template #item.pallets_count="{ item }">
                    <v-chip size="small" color="info">
                        {{ item.pallets?.length || 0 }} pallets
                    </v-chip>
                </template>

                <template #item.status="{ item }">
                    <v-chip
                        size="small"
                        :color="item.status === 'pending' ? 'warning' : 'success'"
                        text-color="white"
                    >
                        {{ item.status === 'pending' ? 'Pending' : 'Printed' }}
                    </v-chip>
                </template>

                <template #item.notes="{ item }">
                    <span class="text-truncate d-inline-block" style="max-width: 200px;">
                        {{ item.notes || '-' }}
                    </span>
                </template>

                <template #item.created_at="{ item }">
                    <span>{{ Moment(item.created_at).format('MMM D, YYYY h:mm A') }}</span>
                </template>

                <template #item.actions="{ item }">
                    <div class="d-flex justify-center align-center gap-1">
                        <IconBtn size="small" title="View" @click="viewRequest(item)">
                            <VIcon icon="ri-eye-line" />
                        </IconBtn>

                        <IconBtn
                            v-if="item.status === 'pending'"
                            size="small"
                            title="Mark as Printed"
                            color="success"
                            @click="handleMarkAsPrinted(item)"
                        >
                            <VIcon icon="ri-printer-line" />
                        </IconBtn>

                        <IconBtn
                            v-if="item.status === 'printed'"
                            size="small"
                            title="Download QR Codes"
                            color="info"
                            @click="handleDownload(item)"
                        >
                            <VIcon icon="ri-download-line" />
                        </IconBtn>

                        <IconBtn
                            size="small"
                            title="Delete"
                            color="error"
                            @click="openDeleteModal(item)"
                        >
                            <VIcon icon="ri-delete-bin-line" />
                        </IconBtn>
                    </div>
                </template>
            </VDataTableServer>
        </VCard>

        <!-- Filter Modal -->
        <FilteringModal
            @close="filterModalVisible = false"
            :show="filterModalVisible"
            :dialogTitle="'Filter Print Requests'"
        >
            <template #default>
                <v-form>
                    <div class="mt-4">
                        <label class="font-weight-bold">Status</label>
                        <v-select
                            class="mt-1"
                            label="Select Status"
                            density="compact"
                            :items="statusOptions"
                            v-model="filters.status"
                            item-title="title"
                            item-value="value"
                        />
                    </div>

                    <div class="d-flex justify-end align-center mt-8">
                        <v-btn
                            color="secondary"
                            variant="outlined"
                            :disabled="isFiltersEmpty"
                            @click="resetFilter"
                            class="px-12 mr-3"
                        >
                            Reset Filter
                        </v-btn>
                        <PrimaryButton class="px-12" type="button" @click="applyFilter">
                            Apply Filter
                        </PrimaryButton>
                    </div>
                </v-form>
            </template>
        </FilteringModal>

        <!-- Delete Confirmation Modal -->
        <DeleteModal
            :show="deleteModalVisible"
            @close="deleteModalVisible = false"
            :dialogTitle="'Delete Print Request'"
        >
            <template #default>
                <div class="mx-4">
                    <span class="text-h5 text-high-emphasis">
                        Are you sure you want to delete print request #{{ selectedRequest?.id }}?
                    </span>
                    <p class="mt-2 text-medium-emphasis">
                        This action cannot be undone. All pallet associations will be removed.
                    </p>
                </div>
                <div class="d-flex justify-end align-center mt-6 mx-4">
                    <v-btn
                        color="secondary"
                        variant="outlined"
                        @click="deleteModalVisible = false"
                        class="px-12 mr-3"
                    >
                        Cancel
                    </v-btn>
                    <PrimaryButton
                        @click="handleDelete"
                        color="error"
                        class="px-12"
                        :loading="deleteLoading"
                    >
                        Delete
                    </PrimaryButton>
                </div>
            </template>
        </DeleteModal>

        <Toast :show="toast.show" :color="toast.color" :message="toast.message" @update:show="toast.show = $event" />
    </div>
</template>
