<script setup>
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { VDataTableServer } from 'vuetify/components';

const route = useRoute();

const plantCode = route.params.plant_code;
const sloc = route.params.sloc;

const searchValue = ref('');

const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref('-created_at');
const pageLoading = ref(false);
const storageLocation = ref(null);

const detailDialog = ref(false);
const selectedLog = ref(null);

const toast = ref({
    message: '',
    color: 'success',
    show: false,
});

const cancelDialog = ref(false);
const cancelTarget = ref(null);
const cancelDate = ref(null);
const cancelSubmitting = ref(false);
const cancelErrors = ref([]);

const headers = [
    { title: 'MOVEMENT TYPE', key: 'movement_type', align: 'center' },
    { title: 'PLANT', key: 'plant', sortable: false },
    { title: 'ISSUING SLOC', key: 'issuing_sloc', sortable: false },
    { title: 'RECEIVING SLOC', key: 'receiving_sloc', sortable: false },
    { title: 'POSTING DATE', key: 'posting_date' },
    { title: 'DOCUMENT DATE', key: 'document_date', sortable: false },
    { title: 'MATERIAL DOC', key: 'material_document', sortable: false },
    { title: 'ITEMS', key: 'items_count', align: 'center', sortable: false },
    { title: '', key: 'actions', sortable: false, align: 'end' },
];

const itemHeaders = [
    { title: 'MATERIAL', key: 'material' },
    { title: 'BATCH', key: 'batch' },
    { title: 'MOVEMENT TYPE', key: 'movement_type', align: 'center' },
    { title: 'PLANT', key: 'plant' },
    { title: 'ISSUING SLOC', key: 'issuing_sloc' },
    { title: 'RECEIVING SLOC', key: 'receiving_sloc' },
    { title: 'QTY', key: 'entry_qty', align: 'center' },
    { title: 'UOM', key: 'entry_uom', align: 'center' },
    { title: 'CANCEL MAT DOC', key: 'cancel_material_document', align: 'center' },
    { title: 'CANCEL DATE', key: 'cancel_date', align: 'center', minWidth: '140px' },
];

onMounted(() => {
    fetchStorageLocationDetails();
})

const fetchStorageLocationDetails = async () => {
    pageLoading.value = true;
    try {
        const response = await ApiService.get(`quality-control/storage-location/${plantCode}/${sloc}`);
        storageLocation.value = response.data.storage_location;
    } catch (error) {
        console.log(error);
    } finally {
        pageLoading.value = false;
    }
};

const loadItems = ({ page: pageVal, itemsPerPage: perPage, sortBy }) => {
    loading.value = true;

    const plant_code = route.params.plant_code;
    const sloc = route.params.sloc;

    if (!plant_code || !sloc) {
        loading.value = false;
        return;
    }

    if (sortBy && sortBy.length > 0) {
        const sort = sortBy[0];
        sortQuery.value = sort.order === 'desc' ? `-${sort.key}` : sort.key;
    } else {
        sortQuery.value = '-created_at';
    }

    ApiService.query(`quality-control/goods-movement-logs/${plant_code}/${sloc}`, {
        params: {
            page: pageVal,
            itemsPerPage: perPage,
            sort: sortQuery.value,
            search: searchValue.value,
        }
    })
        .then((response) => {
            totalItems.value = response.data.total;
            serverItems.value = response.data.data;
            loading.value = false;
        })
        .catch((error) => {
            console.log(error);
            loading.value = false;
        });
};

const handleSearch = () => {
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [],
    });
};

const openDetailDialog = (log) => {
    selectedLog.value = log;
    detailDialog.value = true;
};

const isCancellable = (log) => {
    return log.movement_type === '313' && (log.items?.some(item => !item.cancel) ?? false);
};

const openCancelDialog = (log) => {
    cancelTarget.value = log;
    cancelDate.value = null;
    cancelErrors.value = [];
    cancelDialog.value = true;
};

const closeCancelDialog = () => {
    cancelDialog.value = false;
    cancelTarget.value = null;
    cancelDate.value = null;
    cancelErrors.value = [];
};

const confirmCancelGoodsMovement = () => {
    if (!cancelTarget.value) return;

    cancelSubmitting.value = true;
    cancelErrors.value = [];

    ApiService.post('quality-control/cancel-313', {
        id: cancelTarget.value.id,
        cancel_date: cancelDate.value,
    })
        .then((response) => {
            const { status, errors } = response.data;

            if (status === 'S') {
                toast.value = {
                    message: `Goods movement ${cancelTarget.value.material_document || ''} cancelled successfully.`,
                    color: 'success',
                    show: true,
                };
                closeCancelDialog();
                loadItems({ page: page.value, itemsPerPage: itemsPerPage.value, sortBy: [] });
            } else {
                cancelErrors.value = (errors && errors.length)
                    ? errors.map(e => e.MESSAGE || e.message).filter(Boolean)
                    : ['Failed to cancel the goods movement.'];
            }
        })
        .catch((error) => {
            cancelErrors.value = [error.response?.data?.message || 'Failed to cancel the goods movement.'];
        })
        .finally(() => {
            cancelSubmitting.value = false;
        });
};

const actionList = (log) => {
    const actions = [{ title: 'View', key: 'view' }];

    if (isCancellable(log)) {
        actions.push({ title: 'Cancel', key: 'cancel' });
    }

    return actions;
};

const handleAction = (item, action) => {
    if (action.key === 'view') {
        openDetailDialog(item);
    } else if (action.key === 'cancel') {
        openCancelDialog(item);
    }
};
</script>

<template>
    <div>
        <div class="pa-4">
            <h4 class="text-h5 font-weight-bold mb-2">Plant : <span class="font-bold text-primary">{{storageLocation?.plant?.plant_code}} - {{ storageLocation?.plant?.name }}</span></h4>
            <h4 class="text-h5 font-weight-bold mb-2">Storage Location : <span class="font-bold text-primary">{{storageLocation?.code}} - {{ storageLocation?.name }}</span></h4>
            <h4 class="text-h5 font-weight-bold mb-2">Total Goods Movement Logs : <span class="font-bold text-primary">{{ totalItems }}</span></h4>
        </div>
        <div class="d-flex gap-4 align-center justify-center px-4 mb-2">
            <VTextField
                v-model="searchValue"
                label="Search"
                placeholder="Search movement type, batch..."
                append-inner-icon="ri-search-line"
                single-line
                hide-details
                density="compact"
                class="flex-grow-1"
                @keyup.enter="handleSearch"
            />
            <v-btn
                class="d-flex align-center"
                prepend-icon="ri-search-eye-line"
                @click="handleSearch"
            >
                <template #prepend>
                    <v-icon color="white"></v-icon>
                </template>
                Search
            </v-btn>
        </div>

        <VDataTableServer
            v-model:items-per-page="itemsPerPage"
            :headers="headers"
            :items="serverItems"
            :items-length="totalItems"
            :loading="loading"
            item-value="id"
            :search="searchValue"
            @update:options="loadItems"
            class="text-no-wrap"
        >
            <template #item.movement_type="{ item }">
                <v-chip
                    :color="item.movement_type === '313' ? 'warning' : 'success'"
                    size="small"
                    label
                >
                    {{ item.movement_type }}
                </v-chip>
            </template>

            <template #item.issuing_sloc="{ item }">
                {{ item.issuing_sloc || '--' }}
            </template>

            <template #item.material_document="{ item }">
                {{ item.material_document || '--' }}
            </template>

            <template #item.items_count="{ item }">
                <div class="d-flex flex-column align-center gap-1">
                    <v-chip size="small" variant="tonal" color="secondary">
                        {{ item.items?.length ?? 0 }}
                    </v-chip>
                    <v-chip
                        v-if="item.items?.some(i => i.cancel_material_document)"
                        size="x-small"
                        variant="tonal"
                        color="error"
                    >
                        With Cancelled Item(s)
                    </v-chip>
                </div>
            </template>

            <template #item.actions="{ item }">
                <div class="d-flex justify-end">
                    <v-menu location="start">
                        <template #activator="{ props }">
                            <v-btn icon="ri-more-2-line" variant="text" v-bind="props" color="grey"></v-btn>
                        </template>
                        <v-list>
                            <v-list-item
                                v-for="(action, i) in actionList(item)"
                                :key="i"
                                :value="i"
                                @click="handleAction(item, action)"
                            >
                                <v-list-item-title>{{ action.title }}</v-list-item-title>
                            </v-list-item>
                        </v-list>
                    </v-menu>
                </div>
            </template>
        </VDataTableServer>

        <v-dialog
            v-model="detailDialog"
            max-width="800"
            scrollable
        >
            <v-card v-if="selectedLog">
                <v-card-title class="text-h6 font-weight-bold pa-4 d-flex align-center justify-space-between">
                    <span>Goods Movement Detail</span>
                    <v-btn icon variant="text" size="small" @click="detailDialog = false">
                        <v-icon icon="ri-close-line" />
                    </v-btn>
                </v-card-title>
                <v-divider />
                <v-card-text class="pa-4">
                    <div class="d-flex flex-wrap gap-3 mb-4">
                        <v-card variant="tonal" color="warning" rounded="lg" class="flex-1-1">
                            <v-card-text class="pa-3">
                                <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold mb-1">Movement Type</div>
                                <div class="text-h6 font-weight-bold">{{ selectedLog.movement_type }}</div>
                            </v-card-text>
                        </v-card>
                        <v-card variant="tonal" color="primary" rounded="lg" class="flex-1-1">
                            <v-card-text class="pa-3">
                                <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold mb-1">Status</div>
                                <div class="text-h6 font-weight-bold text-capitalize">{{ selectedLog.status_text }}</div>
                            </v-card-text>
                        </v-card>
                        <v-card variant="tonal" color="secondary" rounded="lg" class="flex-1-1">
                            <v-card-text class="pa-3">
                                <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold mb-1">Posting Date</div>
                                <div class="text-h6 font-weight-bold">{{ selectedLog.posting_date }}</div>
                            </v-card-text>
                        </v-card>
                    </div>

                    <v-row dense class="mb-4">
                        <v-col cols="6">
                            <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold">Plant</div>
                            <div class="text-body-1">{{ selectedLog.plant }}</div>
                        </v-col>
                        <v-col cols="6">
                            <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold">Document Date</div>
                            <div class="text-body-1">{{ selectedLog.document_date }}</div>
                        </v-col>
                        <v-col cols="6">
                            <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold">Issuing SLOC</div>
                            <div class="text-body-1">{{ selectedLog.issuing_sloc || '--' }}</div>
                        </v-col>
                        <v-col cols="6">
                            <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold">Receiving SLOC</div>
                            <div class="text-body-1">{{ selectedLog.receiving_sloc || '--' }}</div>
                        </v-col>
                        <v-col cols="6">
                            <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold">Material Document</div>
                            <div class="text-body-1">{{ selectedLog.material_document || '--' }}</div>
                        </v-col>
                        <v-col cols="6">
                            <div class="text-caption text-medium-emphasis text-uppercase font-weight-bold">Material Document Year</div>
                            <div class="text-body-1">{{ selectedLog.material_document_year || '--' }}</div>
                        </v-col>
                    </v-row>

                    <div class="text-subtitle-2 font-weight-bold mb-2">Items ({{ selectedLog.items?.length ?? 0 }})</div>
                    <v-table density="compact">
                        <thead>
                            <tr>
                                <th
                                    v-for="h in itemHeaders"
                                    :key="h.key"
                                    :class="h.align === 'center' ? 'text-center' : ''"
                                    :style="h.minWidth ? `min-width: ${h.minWidth}` : undefined"
                                >
                                    {{ h.title }}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="item in selectedLog.items" :key="item.id">
                                <td>{{ item.material }}</td>
                                <td>{{ item.batch }}</td>
                                <td class="text-center">
                                    <v-chip :color="item.movement_type === '313' ? 'warning' : 'success'" size="small" label>
                                        {{ item.movement_type }}
                                    </v-chip>
                                </td>
                                <td>{{ item.plant }}</td>
                                <td>{{ item.issuing_sloc || '--' }}</td>
                                <td>{{ item.receiving_sloc || '--' }}</td>
                                <td class="text-center">{{ item.entry_qty }}</td>
                                <td class="text-center">{{ item.entry_uom }}</td>
                                <td class="text-center">{{ item.cancel_material_document || '--' }}</td>
                                <td class="text-center text-no-wrap">{{ item.cancel_date || '--' }}</td>
                            </tr>
                        </tbody>
                    </v-table>
                </v-card-text>
            </v-card>
        </v-dialog>

        <v-dialog v-model="cancelDialog" max-width="480" persistent>
            <v-card>
                <v-card-title class="text-h6 font-weight-bold">
                    Cancel Goods Movement
                </v-card-title>
                <v-divider />
                <v-card-text>
                    <p class="mb-4">
                        This will reverse the SAP material document
                        <strong>{{ cancelTarget?.material_document || '--' }}</strong> (movement type 313).
                        This action cannot be undone.
                    </p>
                    <VTextField
                        v-model="cancelDate"
                        type="date"
                        label="Cancel Date (optional)"
                        density="compact"
                        hide-details
                    />
                    <v-alert v-if="cancelErrors.length" type="error" density="compact" class="mt-4">
                        <div v-for="(err, i) in cancelErrors" :key="i">{{ err }}</div>
                    </v-alert>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn variant="outlined" color="secondary" :disabled="cancelSubmitting" @click="closeCancelDialog">
                        Close
                    </v-btn>
                    <v-btn color="error" :loading="cancelSubmitting" @click="confirmCancelGoodsMovement">
                        Confirm Cancel
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <Toast v-model:show="toast.show" :message="toast.message" :color="toast.color" />
    </div>
</template>
