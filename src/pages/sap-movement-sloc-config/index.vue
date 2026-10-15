<script setup>
import EditingModal from '@/components/EditingModal.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import { debounce } from 'lodash';
import Moment from 'moment';
import { computed, reactive, ref, watch } from 'vue';

const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref('transaction_type');
const searchValue = ref('');
const filters = reactive({ transaction_type: null, plant_code: null });

const options = reactive({
    transaction_types: [],
    statuses: [],
    movement_types: [],
    plants: [],
    storage_locations: [],
});

const toast = reactive({
    message: '',
    color: 'success',
    show: false,
});

const showToast = (message, color = 'success') => {
    toast.message = message;
    toast.color = color;
    toast.show = true;
};

const headers = [
    { title: 'TRANSACTION TYPE', key: 'transaction_type' },
    { title: 'PLANT', key: 'plant_code' },
    { title: 'STATUS', key: 'status' },
    { title: 'MVT', key: 'movement_type', align: 'center' },
    { title: 'ISSUING SLOC', key: 'issuing_sloc' },
    { title: 'RECEIVING', key: 'receiving_sloc' },
    { title: 'QC SAP USER', key: 'requires_qc_sap_user', align: 'center', sortable: false },
    { title: '913', key: 'with_alc_913', align: 'center', sortable: false },
    { title: 'ACTIVE', key: 'is_active', align: 'center' },
    { title: 'REMARKS', key: 'remarks', sortable: false },
    { title: 'LAST UPDATED', key: 'updated_at' },
    { title: 'ACTIONS', key: 'actions', align: 'center', sortable: false },
];

const plantOptions = computed(() =>
    options.plants.map(plant => ({ value: plant.plant_code, title: `${plant.plant_code} - ${plant.name}` }))
);

const titleOf = (list, value) => list.find(option => option.value === value)?.title ?? value;

const slocOptionsFor = (plantCode) =>
    options.storage_locations
        .filter(sloc => !plantCode || sloc.plant_code === plantCode)
        .map(sloc => ({ value: sloc.code, title: `${sloc.code} - ${sloc.name}` }));

const loadOptions = async () => {
    try {
        const response = await ApiService.get('sap-movement-sloc-configs/options');
        Object.assign(options, response.data);
    } catch (error) {
        showToast(error.response?.data?.message || 'Failed to load options.', 'error');
    }
};

onMounted(() => loadOptions());

const loadItems = ({ page: pageNumber, itemsPerPage: perPage, sortBy }) => {
    loading.value = true;
    page.value = pageNumber;

    if (sortBy && sortBy.length > 0) {
        const sort = sortBy[0];
        sortQuery.value = sort.order === 'desc' ? `-${sort.key}` : sort.key;
    } else {
        sortQuery.value = 'transaction_type';
    }

    ApiService.query('datatable/sap-movement-sloc-configs', {
        params: {
            page: pageNumber,
            itemsPerPage: perPage,
            sort: sortQuery.value,
            search: searchValue.value,
            filters,
        },
    })
        .then((response) => {
            totalItems.value = response.data.total;
            serverItems.value = response.data.data;
        })
        .catch((error) => {
            console.error(error);
            showToast(error.response?.data?.message || 'Failed to load SLOC mappings.', 'error');
        })
        .finally(() => {
            loading.value = false;
        });
};

const reload = () => loadItems({ page: page.value, itemsPerPage: itemsPerPage.value, sortBy: [] });

const handleSearch = debounce((search) => {
    searchValue.value = search;
}, 500);

watch(() => [filters.transaction_type, filters.plant_code], () => loadItems({ page: 1, itemsPerPage: itemsPerPage.value, sortBy: [] }));

// Create / edit
const formModal = ref(false);
const editingItem = ref(null);
const formLoading = ref(false);
const formError = ref(null);

const emptyForm = () => ({
    transaction_type: 'rdo-disposition',
    plant_code: null,
    status: null,
    movement_type: '313',
    issuing_sloc: null,
    receiving_plant_code: null,
    receiving_sloc: null,
    requires_qc_sap_user: false,
    with_alc_913: false,
    is_active: true,
    remarks: null,
});

const form = reactive(emptyForm());

// Receiving SLOCs come from the receiving plant when one is set, otherwise the issuing plant.
const issuingSlocOptions = computed(() => slocOptionsFor(form.plant_code));
const receivingSlocOptions = computed(() => slocOptionsFor(form.receiving_plant_code || form.plant_code));

const openCreate = () => {
    editingItem.value = null;
    Object.assign(form, emptyForm());
    formError.value = null;
    formModal.value = true;
};

const openEdit = (item) => {
    editingItem.value = item;
    Object.assign(form, {
        transaction_type: item.transaction_type,
        plant_code: item.plant_code,
        status: item.status,
        movement_type: item.movement_type,
        issuing_sloc: item.issuing_sloc,
        receiving_plant_code: item.receiving_plant_code,
        receiving_sloc: item.receiving_sloc,
        requires_qc_sap_user: !!item.requires_qc_sap_user,
        with_alc_913: !!item.with_alc_913,
        is_active: !!item.is_active,
        remarks: item.remarks,
    });
    formError.value = null;
    formModal.value = true;
};

// v-combobox returns the typed text or the selected value; keep only the code.
const slocCode = (value) => (typeof value === 'object' && value !== null ? value.value : value);

const submitForm = async () => {
    const payload = {
        ...form,
        issuing_sloc: slocCode(form.issuing_sloc),
        receiving_sloc: slocCode(form.receiving_sloc),
    };

    const missing = [
        ['transaction_type', 'Transaction type'],
        ['plant_code', 'Plant'],
        ['status', 'Status'],
        ['movement_type', 'Movement type'],
        ['issuing_sloc', 'Issuing SLOC'],
        ['receiving_sloc', 'Receiving SLOC'],
    ].filter(([key]) => !payload[key]).map(([, label]) => label);

    if (missing.length > 0) {
        formError.value = `Required: ${missing.join(', ')}.`;
        return;
    }

    formLoading.value = true;
    formError.value = null;
    try {
        if (editingItem.value) {
            await ApiService.put(`sap-movement-sloc-configs/${editingItem.value.id}`, payload);
            showToast('SLOC mapping updated successfully!');
        } else {
            await ApiService.post('sap-movement-sloc-configs', payload);
            showToast('SLOC mapping created successfully!');
        }
        formModal.value = false;
        reload();
    } catch (error) {
        const errors = error.response?.data?.errors;
        formError.value = errors
            ? Object.values(errors).flat().join(' ')
            : error.response?.data?.message || error.response?.data?.error || 'An unexpected error occurred.';
    } finally {
        formLoading.value = false;
    }
};

// Delete
const deleteModal = ref(false);
const deletingItem = ref(null);
const deleteLoading = ref(false);

const openDelete = (item) => {
    deletingItem.value = item;
    deleteModal.value = true;
};

const confirmDelete = async () => {
    deleteLoading.value = true;
    try {
        await ApiService.delete(`sap-movement-sloc-configs/${deletingItem.value.id}`);
        showToast('SLOC mapping deleted successfully!');
        deleteModal.value = false;
        reload();
    } catch (error) {
        showToast(error.response?.data?.message || 'Failed to delete SLOC mapping.', 'error');
    } finally {
        deleteLoading.value = false;
    }
};
</script>

<template>
    <div class="d-flex flex-wrap gap-4 align-center justify-center">
        <v-select
            v-model="filters.transaction_type"
            label="Transaction Type"
            density="compact"
            hide-details
            clearable
            :items="options.transaction_types"
            style="min-width: 200px; max-width: 240px;"
        />
        <v-autocomplete
            v-model="filters.plant_code"
            label="Plant"
            density="compact"
            hide-details
            clearable
            :items="plantOptions"
            style="min-width: 200px; max-width: 280px;"
        />
        <SearchInput class="flex-grow-1" @update:search="handleSearch" />
        <v-btn class="d-flex align-center" prepend-icon="ri-add-line" @click="openCreate">
            <template #prepend>
                <v-icon color="white"></v-icon>
            </template>
            Add Mapping
        </v-btn>
    </div>

    <v-card class="mt-4">
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
            <template #item.transaction_type="{ item }">
                <span class="font-weight-bold">{{ titleOf(options.transaction_types, item.transaction_type) }}</span>
            </template>

            <template #item.status="{ item }">
                {{ titleOf(options.statuses, item.status) }}
            </template>

            <template #item.receiving_sloc="{ item }">
                <span v-if="item.receiving_plant_code" class="text-medium-emphasis">{{ item.receiving_plant_code }} / </span>{{ item.receiving_sloc }}
            </template>

            <template #item.requires_qc_sap_user="{ item }">
                <VIcon v-if="item.requires_qc_sap_user" icon="ri-check-line" color="success" />
                <span v-else class="text-medium-emphasis">—</span>
            </template>

            <template #item.with_alc_913="{ item }">
                <VIcon v-if="item.with_alc_913" icon="ri-check-line" color="success" />
                <span v-else class="text-medium-emphasis">—</span>
            </template>

            <template #item.is_active="{ item }">
                <v-chip :color="item.is_active ? 'success' : 'secondary'" size="small" variant="tonal" class="font-weight-bold">
                    {{ item.is_active ? 'Active' : 'Inactive' }}
                </v-chip>
            </template>

            <template #item.remarks="{ item }">
                <span class="text-truncate d-inline-block" style="max-width: 240px;">{{ item.remarks || '—' }}</span>
            </template>

            <template #item.updated_at="{ item }">
                {{ item.updated_at ? Moment(item.updated_at).format('MMMM D, YYYY h:mm A') : '' }}
            </template>

            <template #item.actions="{ item }">
                <div class="d-flex gap-1 justify-center align-center">
                    <IconBtn size="small" @click="openEdit(item)">
                        <VIcon icon="ri-pencil-line" />
                    </IconBtn>
                    <IconBtn size="small" @click="openDelete(item)">
                        <VIcon icon="ri-delete-bin-line" />
                    </IconBtn>
                </div>
            </template>
        </VDataTableServer>
    </v-card>

    <EditingModal :show="formModal" max-width="700px" @close="formModal = false"
        :dialog-title="editingItem ? 'Update SLOC Mapping' : 'Add SLOC Mapping'">
        <template #default>
            <v-form @submit.prevent="submitForm">
                <VRow class="mt-4">
                    <VCol v-if="form.transaction_type === 'rdo-disposition'" cols="12">
                        <v-alert type="info" variant="tonal" density="compact">
                            For RDO Disposition, the 313 issues from the return delivery item's plant/SLOC, and the 913 runs when that SLOC has an ALC plant/SLOC mapping. Issuing SLOC and "Also post 913" below are not used.
                        </v-alert>
                    </VCol>
                    <VCol cols="12" md="6">
                        <v-select v-model="form.transaction_type" label="Transaction Type" density="compact" :items="options.transaction_types" />
                    </VCol>
                    <VCol cols="12" md="6">
                        <v-autocomplete v-model="form.plant_code" label="Plant" density="compact" :items="plantOptions" />
                    </VCol>
                    <VCol cols="12" md="6">
                        <v-select v-model="form.status" label="Status" density="compact" :items="options.statuses" />
                    </VCol>
                    <VCol cols="12" md="6">
                        <v-select v-model="form.movement_type" label="Movement Type" density="compact" :items="options.movement_types" />
                    </VCol>
                    <VCol cols="12" md="6">
                        <v-combobox
                            v-model="form.issuing_sloc"
                            label="Issuing SLOC"
                            density="compact"
                            :items="issuingSlocOptions"
                            :return-object="false"
                            hint="Pick from the list or type a SAP SLOC code"
                            persistent-hint
                        />
                    </VCol>
                    <VCol cols="12" md="6">
                        <v-autocomplete
                            v-model="form.receiving_plant_code"
                            label="Receiving Plant"
                            density="compact"
                            :items="plantOptions"
                            clearable
                            hint="Leave blank for the same plant"
                            persistent-hint
                        />
                    </VCol>
                    <VCol cols="12" md="6">
                        <v-combobox
                            v-model="form.receiving_sloc"
                            label="Receiving SLOC"
                            density="compact"
                            :items="receivingSlocOptions"
                            :return-object="false"
                            hint="Pick from the list or type a SAP SLOC code"
                            persistent-hint
                        />
                    </VCol>
                    <VCol cols="12" md="6" class="d-flex flex-column">
                        <v-switch v-model="form.requires_qc_sap_user" color="primary" inset hide-details label="Post with QC approver SAP user" />
                        <v-switch v-model="form.with_alc_913" color="primary" inset hide-details label="Also post 913 (ALC)" />
                        <v-switch v-model="form.is_active" color="success" inset hide-details label="Active" />
                    </VCol>
                    <VCol cols="12">
                        <v-textarea label="Remarks" rows="2" v-model="form.remarks" clearable clear-icon="ri-close-line" />
                    </VCol>
                </VRow>
            </v-form>
            <VAlert v-if="formError" class="mt-4" color="error" variant="tonal">{{ formError }}</VAlert>
            <div class="d-flex justify-end align-center mt-4">
                <v-btn color="secondary" variant="outlined" class="px-12 mr-3" @click="formModal = false">Cancel</v-btn>
                <PrimaryButton color="primary" class="px-12" :loading="formLoading" @click="submitForm">
                    {{ editingItem ? 'Update' : 'Save' }}
                </PrimaryButton>
            </div>
        </template>
    </EditingModal>

    <v-dialog v-model="deleteModal" max-width="500px">
        <v-card elevation="2">
            <v-card-title class="d-flex justify-space-between align-center px-6 pt-6 pb-2">
                <div class="d-flex align-center gap-2">
                    <i class="ri-error-warning-line text-error text-h4"></i>
                    <span class="text-h5 font-weight-bold">Delete SLOC Mapping</span>
                </div>
                <v-btn icon="ri-close-line" variant="text" @click="deleteModal = false" />
            </v-card-title>
            <v-card-text class="px-6 pt-4">
                Remove the <strong>{{ titleOf(options.transaction_types, deletingItem?.transaction_type) }}</strong> mapping for
                plant <strong>{{ deletingItem?.plant_code }}</strong> / <strong>{{ titleOf(options.statuses, deletingItem?.status) }}</strong>
                ({{ deletingItem?.movement_type }})?
                SAP postings for this combination will be blocked until a mapping is added again.
            </v-card-text>
            <v-divider />
            <v-card-actions class="justify-end px-6 py-3">
                <v-btn variant="outlined" class="mr-3" @click="deleteModal = false">Cancel</v-btn>
                <PrimaryButton color="error" :loading="deleteLoading" @click="confirmDelete">Delete</PrimaryButton>
            </v-card-actions>
        </v-card>
    </v-dialog>

    <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event" />
</template>
