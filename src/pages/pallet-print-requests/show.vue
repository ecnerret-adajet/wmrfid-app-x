<script setup>
import DeleteModal from '@/components/DeleteModal.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import JwtService from '@/services/JwtService';
import axios from 'axios';
import Moment from 'moment';
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const requestId = route.params.id;
const request = ref(null);
const loading = ref(true);
const markAsPrintedLoading = ref(false);
const deleteLoading = ref(false);
const deleteModalVisible = ref(false);

const toast = ref({
    message: '',
    color: 'success',
    show: false
});

const palletHeaders = [
    { title: 'PHYSICAL ID', key: 'name', sortable: false },
    { title: 'PALLET CODE', key: 'pallet_code', sortable: false },
    { title: 'PLANT', key: 'plant_code', sortable: false },
    { title: 'EPC', key: 'epc', sortable: false },
    { title: 'WITH QR', key: 'with_qr', align: 'center', sortable: false },
    // { title: 'QR PREVIEW', key: 'qr_preview', align: 'center', sortable: false },
];

const fetchRequest = async () => {
    loading.value = true;
    try {
        const response = await ApiService.get('pallet-print-requests', requestId);
        request.value = response.data.data;
    } catch (error) {
        console.error('Error fetching print request:', error);
        toast.value = {
            message: 'Failed to load print request details.',
            color: 'error',
            show: true
        };
    } finally {
        loading.value = false;
    }
};

const handleMarkAsPrinted = async () => {
    markAsPrintedLoading.value = true;
    try {
        const response = await ApiService.post(`pallet-print-requests/${requestId}/mark-as-printed`);
        toast.value = {
            message: 'Print request marked as printed. QR codes generated.',
            color: 'success',
            show: true
        };
        await fetchRequest();
    } catch (error) {
        console.error('Error marking as printed:', error);
        toast.value = {
            message: error.response?.data?.message || 'Failed to mark as printed.',
            color: 'error',
            show: true
        };
    } finally {
        markAsPrintedLoading.value = false;
    }
};

const handleDownload = async () => {
    try {
        const token = JwtService.getToken();
        const response = await axios.get(`pallet-print-requests/${requestId}/download`, {
            responseType: 'blob',
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `pallet_qrcodes_${requestId}.zip`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error downloading:', error);
        toast.value = {
            message: 'Failed to download QR codes.',
            color: 'error',
            show: true
        };
    }
};

const openDeleteModal = () => {
    deleteModalVisible.value = true;
};

const handleDelete = async () => {
    deleteLoading.value = true;
    try {
        await ApiService.delete(`pallet-print-requests/${requestId}`);
        toast.value = {
            message: 'Print request deleted successfully!',
            color: 'success',
            show: true
        };
        setTimeout(() => {
            router.push('/pallet-print-requests');
        }, 1000);
    } catch (error) {
        console.error('Error deleting print request:', error);
        toast.value = {
            message: error.response?.data?.message || 'Failed to delete print request.',
            color: 'error',
            show: true
        };
    } finally {
        deleteLoading.value = false;
        deleteModalVisible.value = false;
    }
};

const goBack = () => {
    router.push('/pallet-print-requests');
};

onMounted(() => {
    fetchRequest();
});
</script>

<template>
    <div>
        <!-- Loading State -->
        <div v-if="loading" class="d-flex justify-center align-center" style="min-height: 400px;">
            <VProgressCircular indeterminate color="primary" size="64" />
        </div>

        <template v-else-if="request">
            <!-- Page Header -->
            <div class="d-flex align-center justify-space-between mb-6">
                <div class="d-flex align-center">
                    <v-btn icon variant="text" @click="goBack" class="mr-2">
                        <VIcon icon="ri-arrow-left-line" />
                    </v-btn>
                    <div>
                        <h4 class="text-h4 font-weight-bold">
                            Print Request #{{ request.id }}
                        </h4>
                        <span class="text-subtitle-1 text-medium-emphasis">
                            Created by {{ request.requester?.name }} on {{ Moment(request.created_at).format('MMMM D, YYYY h:mm A') }}
                        </span>
                    </div>
                </div>

                <div class="d-flex gap-2">
                    <v-btn
                        v-if="request.status === 'pending'"
                        color="success"
                        prepend-icon="ri-printer-line"
                        :loading="markAsPrintedLoading"
                        @click="handleMarkAsPrinted"
                    >
                        Mark as Printed
                    </v-btn>

                    <v-btn
                        v-if="request.status === 'printed'"
                        color="info"
                        prepend-icon="ri-download-line"
                        @click="handleDownload"
                    >
                        Download QR Codes
                    </v-btn>

                    <v-btn
                        color="error"
                        variant="outlined"
                        prepend-icon="ri-delete-bin-line"
                        @click="openDeleteModal"
                    >
                        Delete
                    </v-btn>
                </div>
            </div>

            <!-- Request Info Cards -->
            <VRow class="mb-4">
                <VCol cols="12" md="3">
                    <VCard>
                        <VCardText class="text-center">
                            <VIcon icon="ri-user-line" size="40" class="mb-2 text-primary" />
                            <h5 class="text-h5 font-weight-bold">Requester</h5>
                            <p class="text-medium-emphasis mb-0">{{ request.requester?.name || 'N/A' }}</p>
                        </VCardText>
                    </VCard>
                </VCol>

                <VCol cols="12" md="3">
                    <VCard>
                        <VCardText class="text-center">
                            <VIcon icon="ri-stack-line" size="40" class="mb-2 text-info" />
                            <h5 class="text-h5 font-weight-bold">Pallets</h5>
                            <p class="text-medium-emphasis mb-0">{{ request.pallets?.length || 0 }} pallet(s)</p>
                        </VCardText>
                    </VCard>
                </VCol>

                <VCol cols="12" md="3">
                    <VCard>
                        <VCardText class="text-center">
                            <VIcon
                                :icon="request.status === 'pending' ? 'ri-time-line' : 'ri-checkbox-circle-line'"
                                size="40"
                                class="mb-2"
                                :class="request.status === 'pending' ? 'text-warning' : 'text-success'"
                            />
                            <h5 class="text-h5 font-weight-bold">Status</h5>
                            <v-chip
                                :color="request.status === 'pending' ? 'warning' : 'success'"
                                text-color="white"
                                size="small"
                            >
                                {{ request.status === 'pending' ? 'Pending' : 'Printed' }}
                            </v-chip>
                        </VCardText>
                    </VCard>
                </VCol>

                <VCol cols="12" md="3">
                    <VCard>
                        <VCardText class="text-center">
                            <VIcon icon="ri-calendar-line" size="40" class="mb-2 text-secondary" />
                            <h5 class="text-h5 font-weight-bold">Printed At</h5>
                            <p class="text-medium-emphasis mb-0">
                                {{ request.printed_at ? Moment(request.printed_at).format('MMM D, YYYY h:mm A') : 'Not yet printed' }}
                            </p>
                        </VCardText>
                    </VCard>
                </VCol>
            </VRow>

            <!-- Notes Section -->
            <VCard v-if="request.notes" class="mb-4">
                <VCardText>
                    <h5 class="text-h5 font-weight-bold mb-2">
                        <VIcon icon="ri-file-text-line" class="mr-1" />
                        Notes
                    </h5>
                    <p class="text-medium-emphasis mb-0">{{ request.notes }}</p>
                </VCardText>
            </VCard>

            <!-- Pallets Table -->
            <VCard>
                <VCardText>
                    <h5 class="text-h5 font-weight-bold mb-4">
                        <VIcon icon="ri-stack-line" class="mr-1" />
                        Pallets in this Request
                    </h5>

                    <VDataTable
                        :headers="palletHeaders"
                        :items="request.pallets || []"
                        :items-per-page="-1"
                        class="text-no-wrap"
                    >
                        <template #item.name="{ item }">
                            <span class="font-weight-bold text-primary">
                                {{ item.name }}
                            </span>
                        </template>

                        <template #item.with_qr="{ item }">
                            <div class="d-flex justify-center align-center">
                                <i
                                    v-if="item.with_qr"
                                    style="font-size: 24px; color: green;"
                                    class="ri-checkbox-circle-line"
                                ></i>
                                <i
                                    v-else
                                    style="font-size: 24px; color: #FF4C51;"
                                    class="ri-close-circle-line"
                                ></i>
                            </div>
                        </template>

                        <!-- <template #item.qr_preview="{ item }">
                            <div class="d-flex justify-center align-center">
                                <v-img
                                    v-if="item.qr_code_path"
                                    :src="`/storage/${item.qr_code_path}`"
                                    width="48"
                                    height="48"
                                    contain
                                    class="cursor-pointer"
                                >
                                    <template #placeholder>
                                        <div class="d-flex align-center justify-center" style="height: 100%;">
                                            <VProgressCircular indeterminate size="24" />
                                        </div>
                                    </template>
                                </v-img>
                                <span v-else class="text-medium-emphasis">No QR</span>
                            </div>
                        </template> -->
                    </VDataTable>
                </VCardText>
            </VCard>
        </template>

        <!-- Delete Confirmation Modal -->
        <DeleteModal
            :show="deleteModalVisible"
            @close="deleteModalVisible = false"
            :dialogTitle="'Delete Print Request'"
        >
            <template #default>
                <div class="mx-4">
                    <span class="text-h5 text-high-emphasis">
                        Are you sure you want to delete print request #{{ request?.id }}?
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
