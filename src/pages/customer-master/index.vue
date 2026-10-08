<script setup>
import EditingModal from '@/components/EditingModal.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import { useAuthorization } from '@/composables/useAuthorization';
import ApiService from '@/services/ApiService';
import { debounce } from 'lodash';
import Moment from 'moment';
import { reactive, ref, watch } from 'vue';

const { authUserCan } = useAuthorization();
const canManage = computed(() => authUserCan('manage.customer.masters'));

const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref('-updated_at');
const searchValue = ref('');
const sensitiveFilter = ref(null);

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
    { title: 'SOLD-TO CUSTOMER', key: 'sold_to_customer' },
    { title: 'SOLD-TO NAME', key: 'sold_to_name' },
    { title: 'SENSITIVE', key: 'is_sensitive', align: 'center' },
    { title: 'REMARKS', key: 'remarks', sortable: false },
    { title: 'LAST UPDATED', key: 'updated_at' },
    { title: 'ACTIONS', key: 'actions', align: 'center', sortable: false },
];

const sensitiveOptions = [
    { title: 'All', value: null },
    { title: 'Sensitive', value: 1 },
    { title: 'Not Sensitive', value: 0 },
];

const loadItems = ({ page: pageNumber, itemsPerPage: perPage, sortBy }) => {
    loading.value = true;
    page.value = pageNumber;

    if (sortBy && sortBy.length > 0) {
        const sort = sortBy[0];
        sortQuery.value = sort.order === 'desc' ? `-${sort.key}` : sort.key;
    } else {
        sortQuery.value = '-updated_at';
    }

    ApiService.query('datatable/customer-masters', {
        params: {
            page: pageNumber,
            itemsPerPage: perPage,
            sort: sortQuery.value,
            search: searchValue.value,
            filters: { is_sensitive: sensitiveFilter.value },
        },
    })
        .then((response) => {
            totalItems.value = response.data.total;
            serverItems.value = response.data.data;
        })
        .catch((error) => {
            console.error(error);
            showToast(error.response?.data?.message || 'Failed to load customer masters.', 'error');
        })
        .finally(() => {
            loading.value = false;
        });
};

const reload = () => loadItems({ page: page.value, itemsPerPage: itemsPerPage.value, sortBy: [] });

const handleSearch = debounce((search) => {
    searchValue.value = search;
}, 500);

watch(sensitiveFilter, () => loadItems({ page: 1, itemsPerPage: itemsPerPage.value, sortBy: [] }));

// Create / edit
const formModal = ref(false);
const editingItem = ref(null);
const formLoading = ref(false);
const formError = ref(null);
const form = reactive({
    sold_to_customer: null,
    sold_to_name: null,
    is_sensitive: true,
    remarks: null,
});

const sapCustomerSearch = ref('');
const sapCustomers = ref([]);
const sapCustomersLoading = ref(false);

const fetchSapCustomers = debounce(async (search) => {
    if (!search || search.length < 3 || editingItem.value) return;
    sapCustomersLoading.value = true;
    try {
        const response = await ApiService.query('customer-masters/sap-customers', { params: { search } });
        sapCustomers.value = response.data ?? [];
    } catch {
        sapCustomers.value = [];
    } finally {
        sapCustomersLoading.value = false;
    }
}, 400);

watch(sapCustomerSearch, (val) => fetchSapCustomers(val));

// Picking a SAP customer fills the name; typing a code that isn't in SAP is still allowed
const onSapCustomerSelected = (soldTo) => {
    const match = sapCustomers.value.find(customer => customer.sold_to_customer === soldTo);
    if (match) form.sold_to_name = match.sold_to_name;
};

const openCreate = () => {
    editingItem.value = null;
    Object.assign(form, { sold_to_customer: null, sold_to_name: null, is_sensitive: true, remarks: null });
    sapCustomers.value = [];
    formError.value = null;
    formModal.value = true;
};

const openEdit = (item) => {
    editingItem.value = item;
    Object.assign(form, {
        sold_to_customer: item.sold_to_customer,
        sold_to_name: item.sold_to_name,
        is_sensitive: !!item.is_sensitive,
        remarks: item.remarks,
    });
    formError.value = null;
    formModal.value = true;
};

const submitForm = async () => {
    if (!form.sold_to_customer) {
        formError.value = 'Sold-to customer is required.';
        return;
    }

    formLoading.value = true;
    formError.value = null;
    try {
        if (editingItem.value) {
            await ApiService.put(`customer-masters/${editingItem.value.id}`, form);
            showToast('Customer master updated successfully!');
        } else {
            await ApiService.post('customer-masters', form);
            showToast('Customer master created successfully!');
        }
        formModal.value = false;
        reload();
    } catch (error) {
        const errors = error.response?.data?.errors;
        formError.value = errors
            ? Object.values(errors).flat().join(' ')
            : error.response?.data?.error || error.response?.data?.message || 'An unexpected error occurred.';
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
        await ApiService.delete(`customer-masters/${deletingItem.value.id}`);
        showToast('Customer master deleted successfully!');
        deleteModal.value = false;
        reload();
    } catch (error) {
        showToast(error.response?.data?.error || 'Failed to delete customer master.', 'error');
    } finally {
        deleteLoading.value = false;
    }
};

// Import
const importModal = ref(false);
const importFile = ref(null);
const importLoading = ref(false);
const importError = ref(null);
const importResult = ref(null);

const openImport = () => {
    importFile.value = null;
    importError.value = null;
    importResult.value = null;
    importModal.value = true;
};

const submitImport = async () => {
    const file = Array.isArray(importFile.value) ? importFile.value[0] : importFile.value;
    if (!file) {
        importError.value = 'Please choose an Excel file.';
        return;
    }

    const payload = new FormData();
    payload.append('file', file);

    importLoading.value = true;
    importError.value = null;
    try {
        const response = await ApiService.post('customer-masters/import', payload, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        importResult.value = response.data.data;
        showToast(response.data.message);
        reload();
    } catch (error) {
        const errors = error.response?.data?.errors;
        importError.value = errors
            ? Object.values(errors).flat().join(' ')
            : error.response?.data?.error || 'Failed to import customer masters.';
    } finally {
        importLoading.value = false;
    }
};
</script>

<template>
    <div class="d-flex flex-wrap gap-4 align-center justify-center">
        <v-select
            v-model="sensitiveFilter"
            label="Sensitivity"
            density="compact"
            hide-details
            :items="sensitiveOptions"
            style="min-width: 180px; max-width: 220px;"
        />
        <SearchInput class="flex-grow-1" @update:search="handleSearch" />
        <v-btn v-if="canManage" class="d-flex align-center" prepend-icon="ri-upload-2-line" variant="outlined" @click="openImport">
            Import
        </v-btn>
        <v-btn v-if="canManage" class="d-flex align-center" prepend-icon="ri-add-line" @click="openCreate">
            <template #prepend>
                <v-icon color="white"></v-icon>
            </template>
            Add Customer
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
            <template #item.sold_to_customer="{ item }">
                <span class="font-weight-bold">{{ item.sold_to_customer }}</span>
            </template>

            <template #item.is_sensitive="{ item }">
                <v-chip :color="item.is_sensitive ? 'warning' : 'secondary'" size="small" variant="tonal" class="font-weight-bold">
                    {{ item.is_sensitive ? 'Sensitive' : 'Not Sensitive' }}
                </v-chip>
            </template>

            <template #item.remarks="{ item }">
                <span class="text-truncate d-inline-block" style="max-width: 240px;">{{ item.remarks || '—' }}</span>
            </template>

            <template #item.updated_at="{ item }">
                <div>{{ item.updated_at ? Moment(item.updated_at).format('MMMM D, YYYY h:mm A') : '' }}</div>
                <div v-if="item.updated_by?.name" class="text-caption text-medium-emphasis">{{ item.updated_by.name }}</div>
            </template>

            <template #item.actions="{ item }">
                <div v-if="canManage" class="d-flex gap-1 justify-center align-center">
                    <IconBtn size="small" @click="openEdit(item)">
                        <VIcon icon="ri-pencil-line" />
                    </IconBtn>
                    <IconBtn size="small" @click="openDelete(item)">
                        <VIcon icon="ri-delete-bin-line" />
                    </IconBtn>
                </div>
                <span v-else class="text-medium-emphasis">—</span>
            </template>
        </VDataTableServer>
    </v-card>

    <EditingModal :show="formModal" max-width="600px" @close="formModal = false"
        :dialog-title="editingItem ? `Update ${editingItem.sold_to_customer}` : 'Add Customer'">
        <template #default>
            <v-form @submit.prevent="submitForm">
                <v-text-field
                    v-if="editingItem"
                    class="mt-6"
                    density="compact"
                    label="Sold-To Customer"
                    :model-value="form.sold_to_customer"
                    disabled
                />
                <v-combobox
                    v-else
                    v-model="form.sold_to_customer"
                    v-model:search="sapCustomerSearch"
                    class="mt-6"
                    density="compact"
                    label="Sold-To Customer"
                    placeholder="Type a sold-to code or name (min. 3 characters)"
                    :items="sapCustomers"
                    :loading="sapCustomersLoading"
                    item-title="sold_to_customer"
                    item-value="sold_to_customer"
                    :return-object="false"
                    no-filter
                    @update:model-value="onSapCustomerSelected"
                >
                    <template #item="{ item, props: itemProps }">
                        <v-list-item v-bind="itemProps" :subtitle="item.raw.sold_to_name" />
                    </template>
                </v-combobox>
                <v-text-field class="mt-4" density="compact" label="Sold-To Name" v-model="form.sold_to_name" />
                <v-switch
                    v-model="form.is_sensitive"
                    class="mt-2"
                    color="warning"
                    inset
                    hide-details
                    :label="form.is_sensitive ? 'Sensitive — requires fumigation' : 'Not sensitive'"
                />
                <v-textarea class="mt-4" label="Remarks" rows="2" v-model="form.remarks" clearable clear-icon="ri-close-line" />
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
                    <span class="text-h5 font-weight-bold">Delete Customer</span>
                </div>
                <v-btn icon="ri-close-line" variant="text" @click="deleteModal = false" />
            </v-card-title>
            <v-card-text class="px-6 pt-4">
                Remove <strong>{{ deletingItem?.sold_to_customer }} — {{ deletingItem?.sold_to_name ?? '' }}</strong> from the customer master?
                Its delivery orders will no longer qualify for c/o Sales fumigation.
            </v-card-text>
            <v-divider />
            <v-card-actions class="justify-end px-6 py-3">
                <v-btn variant="outlined" class="mr-3" @click="deleteModal = false">Cancel</v-btn>
                <PrimaryButton color="error" :loading="deleteLoading" @click="confirmDelete">Delete</PrimaryButton>
            </v-card-actions>
        </v-card>
    </v-dialog>

    <EditingModal :show="importModal" max-width="600px" dialog-title="Import Customer Master" @close="importModal = false">
        <template #default>
            <p class="text-body-2 mt-4 mb-2">
                Excel/CSV with a heading row: <strong>sold_to_customer</strong>, <strong>sold_to_name</strong>,
                <strong>is_sensitive</strong> (Y/N; blank = Y), <strong>remarks</strong> (optional).
                Existing customers are updated by sold-to code.
            </p>
            <v-file-input
                v-model="importFile"
                label="Excel file"
                accept=".xlsx,.xls,.csv"
                density="compact"
                prepend-icon="ri-file-excel-2-line"
                show-size
            />
            <VAlert v-if="importError" class="mt-2" color="error" variant="tonal">{{ importError }}</VAlert>
            <VAlert v-if="importResult" class="mt-2" color="success" variant="tonal">
                {{ importResult.created }} created, {{ importResult.updated }} updated.
                <ul v-if="importResult.skipped?.length" class="mt-2">
                    <li v-for="skip in importResult.skipped" :key="skip">{{ skip }}</li>
                </ul>
            </VAlert>
            <div class="d-flex justify-end align-center mt-4">
                <v-btn color="secondary" variant="outlined" class="px-12 mr-3" @click="importModal = false">Close</v-btn>
                <PrimaryButton color="primary" class="px-12" :loading="importLoading" @click="submitImport">Import</PrimaryButton>
            </div>
        </template>
    </EditingModal>

    <Toast :show="toast.show" :color="toast.color" :message="toast.message" @update:show="toast.show = $event" />
</template>
