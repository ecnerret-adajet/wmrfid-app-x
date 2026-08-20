<script setup>
import { useAuthorization } from '@/composables/useAuthorization';
import ApiService from '@/services/ApiService';
import Moment from 'moment';
import { ref } from 'vue';
import { VDataTableServer } from 'vuetify/components';

const emits = defineEmits(['summary-updated']);

const props = defineProps({
    search: {
        type: String,
        default: '',
    },
});

const { authUserCan } = useAuthorization();
const canReview = authUserCan('review.no.qr.requests');

const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const filters = ref({ date_from: null, date_to: null });

const previewDialog = ref(false);
const previewImageUrl = ref(null);

const reviewDialog = ref(false);
const reviewAction = ref(null);
const reviewRemarks = ref('');
const reviewTarget = ref(null);
const reviewSubmitting = ref(false);
const reviewError = ref('');

const statusMeta = {
    pending: { label: 'Pending', color: 'warning' },
    confirmed: { label: 'Confirmed', color: 'success' },
    discrepancy: { label: 'Discrepancy', color: 'error' },
};

const headers = [
    { title: 'PHYSICAL ID', key: 'physical_id', sortable: false },
    { title: 'BATCH', key: 'batch', sortable: false },
    { title: 'PLANT', key: 'plant_code', sortable: false },
    { title: 'SLOC', key: 'sloc', sortable: false },
    { title: 'PREVIOUS QR STATUS', key: 'previous_with_qr', sortable: false },
    { title: 'REQUESTED BY', key: 'user', sortable: false },
    { title: 'IMAGE', key: 'image_url', sortable: false },
    { title: 'REQUESTED AT', key: 'created_at', sortable: false },
    { title: 'REVIEW STATUS', key: 'status', sortable: false },
    ...(canReview ? [{ title: 'ACTIONS', key: 'actions', sortable: false }] : []),
];

const loadItems = ({ page: requestedPage, itemsPerPage: requestedPerPage, search }) => {
    loading.value = true;

    ApiService.query('no-qr-tag-logs', {
        params: {
            page: requestedPage,
            per_page: requestedPerPage,
            search: search || props.search,
            date_from: filters.value?.date_from,
            date_to: filters.value?.date_to,
        },
    })
        .then(response => {
            const { summary, logs } = response.data.data;

            totalItems.value = logs.total;
            serverItems.value = logs.data;
            page.value = logs.current_page;
            itemsPerPage.value = logs.per_page;
            loading.value = false;

            emits('summary-updated', summary);
        })
        .catch(error => console.error(error));
};

const applyFilters = data => {
    filters.value = data;
    loadItems({
        page: 1,
        itemsPerPage: itemsPerPage.value,
        search: props.search,
    });
};

const openPreview = imageUrl => {
    previewImageUrl.value = imageUrl;
    previewDialog.value = true;
};

const openReviewDialog = (item, action) => {
    reviewTarget.value = item;
    reviewAction.value = action;
    reviewRemarks.value = '';
    reviewError.value = '';
    reviewDialog.value = true;
};

const closeReviewDialog = () => {
    reviewDialog.value = false;
    reviewTarget.value = null;
    reviewAction.value = null;
    reviewRemarks.value = '';
    reviewError.value = '';
};

const submitReview = () => {
    if (!reviewTarget.value || !reviewAction.value) return;

    reviewSubmitting.value = true;
    reviewError.value = '';

    ApiService.put(`no-qr-tag-logs/${reviewTarget.value.id}/status`, {
        status: reviewAction.value,
        remarks: reviewRemarks.value || null,
    })
        .then(response => {
            const updated = response.data.data;
            const index = serverItems.value.findIndex(row => row.id === updated.id);
            if (index !== -1) {
                serverItems.value[index] = { ...serverItems.value[index], ...updated };
            }
            closeReviewDialog();
        })
        .catch(error => {
            reviewError.value = error.response?.data?.message || 'Failed to update request status.';
        })
        .finally(() => {
            reviewSubmitting.value = false;
        });
};

defineExpose({ loadItems, applyFilters });
</script>

<template>
    <VDataTableServer
        v-model:items-per-page="itemsPerPage"
        v-model:page="page"
        :headers="headers"
        :items="serverItems"
        :items-length="totalItems"
        :loading="loading"
        item-value="id"
        :search="search"
        @update:options="loadItems"
        class="text-no-wrap"
    >
        <template #item.previous_with_qr="{ item }">
            <v-chip size="small" :color="item.previous_with_qr ? 'success' : 'error'" variant="tonal" class="text-uppercase">
                {{ item.previous_with_qr ? 'With QR' : 'No QR' }}
            </v-chip>
        </template>

        <template #item.user="{ item }">
            {{ item.user?.name ?? '—' }}
        </template>

        <template #item.image_url="{ item }">
            <v-avatar
                v-if="item.image_url"
                size="40"
                rounded="lg"
                class="cursor-pointer"
                @click="openPreview(item.image_url)"
            >
                <v-img :src="item.image_url" cover />
            </v-avatar>
            <span v-else>—</span>
        </template>

        <template #item.created_at="{ item }">
            {{ item.created_at ? Moment(item.created_at).format('MMMM D, YYYY h:mm A') : '' }}
        </template>

        <template #item.status="{ item }">
            <div>
                <v-chip
                    size="small"
                    :color="statusMeta[item.status]?.color ?? 'secondary'"
                    variant="tonal"
                    class="text-uppercase"
                >
                    {{ statusMeta[item.status]?.label ?? item.status }}
                </v-chip>
                <div v-if="item.status !== 'pending'" class="text-caption text-medium-emphasis mt-1">
                    {{ item.reviewed_by?.name ?? '—' }}
                    <span v-if="item.reviewed_at"> · {{ Moment(item.reviewed_at).format('MMM D, YYYY h:mm A') }}</span>
                </div>
            </div>
        </template>

        <template v-if="canReview" #item.actions="{ item }">
            <div class="d-flex ga-2" v-if="item.status === 'pending'">
                <v-btn size="small" color="success" variant="tonal" @click="openReviewDialog(item, 'confirmed')">
                    Confirm
                </v-btn>
                <v-btn size="small" color="error" variant="tonal" @click="openReviewDialog(item, 'discrepancy')">
                    Discrepancy
                </v-btn>
            </div>
            <span v-else>—</span>
        </template>
    </VDataTableServer>

    <v-dialog v-model="previewDialog" max-width="500">
        <v-card>
            <v-img :src="previewImageUrl" />
            <v-card-actions>
                <v-spacer />
                <v-btn variant="text" @click="previewDialog = false">Close</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>

    <v-dialog v-model="reviewDialog" max-width="480" persistent>
        <v-card>
            <v-card-title>
                Tag as {{ reviewAction === 'confirmed' ? 'Confirmed' : 'Discrepancy' }}
            </v-card-title>
            <v-card-text>
                <p class="mb-4">
                    Physical ID: <strong>{{ reviewTarget?.physical_id }}</strong>
                </p>
                <v-textarea
                    v-model="reviewRemarks"
                    label="Remarks (optional)"
                    :placeholder="reviewAction === 'discrepancy' ? 'Describe the discrepancy found' : 'Add any notes'"
                    rows="3"
                    density="compact"
                />
                <v-alert v-if="reviewError" type="error" density="compact" class="mt-2">
                    {{ reviewError }}
                </v-alert>
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn variant="outlined" color="secondary" :disabled="reviewSubmitting" @click="closeReviewDialog">
                    Cancel
                </v-btn>
                <v-btn
                    :color="reviewAction === 'confirmed' ? 'success' : 'error'"
                    :loading="reviewSubmitting"
                    @click="submitReview"
                >
                    {{ reviewAction === 'confirmed' ? 'Confirm' : 'Mark Discrepancy' }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>
