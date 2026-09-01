<script setup>
import DefaultModal from '@/components/DefaultModal.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import { useAuthStore } from '@/stores/auth';
import Moment from "moment";
import { ref } from 'vue';
import { VDataTableServer } from 'vuetify/components';

const emits = defineEmits(['pagination-changed']);

const authStore = useAuthStore();

const props = defineProps({
    search: {
        type: String,
        default: ''
    },
    readersOption: {
        type: Array,
        default: () => []
    },
    tagTypesOption: {
        type: Array,
        default: () => []
    }
});

const editDialog = ref(false);
const deleteDialog = ref(false);
const selectedProductionLine = ref(null);
const isLoading = ref(false);
const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref('-created_at'); // Default sort
const errorMessage = ref(null)
const filters = ref(null);

const headers = [
    {
        title: 'NAME',
        key: 'name',
    },
    {
        title: 'PLANT',
        key: 'plant_id',
    },
    {
        title: 'EPC',
        key: 'epc',
    },
    {
        title: 'CURRENT BATCH',
        key: 'batch',
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
        title: 'WEAK PALLET COUNT',
        key: 'weak_pallet_logs_count',
        sortable: false,
    },
    {
        title: 'INSTALLATION STATUS',
        key: 'installation_status',
        sortable: false,
    },
    {
        title: 'ACTION',
        key: 'actions',
        sortable: false,
        align: 'end',
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

    ApiService.query('reports/datatable/weak-pallets',{
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
    message: 'Production line deleted successfully!',
    color: 'success',
    show: false
});

const confirmPalletDialog = ref(false);
const selectedPallet = ref(null);
const selectedInstallStatus = ref(null);
const confirmLoading = ref(false);

const openConfirmPallet = item => {
    selectedPallet.value = item;
    selectedInstallStatus.value = item.latest_weak_pallet_log?.status === 'pending'
        ? null
        : item.latest_weak_pallet_log?.status ?? null;
    confirmPalletDialog.value = true;
};

const submitConfirmPallet = async () => {
    if (!selectedPallet.value?.latest_weak_pallet_log?.id || !selectedInstallStatus.value) return;

    confirmLoading.value = true;
    try {
        const response = await ApiService.post(
            `reports/weak-pallets/${selectedPallet.value.latest_weak_pallet_log.id}/confirm`,
            { status: selectedInstallStatus.value }
        );

        selectedPallet.value.latest_weak_pallet_log = response.data.data;

        toast.value = { message: 'Pallet installation status updated successfully!', color: 'success', show: true };
        confirmPalletDialog.value = false;
        loadItems({
            page: page.value,
            itemsPerPage: itemsPerPage.value,
            sortBy: [{ key: 'created_at', order: 'desc' }],
            search: props.search
        });
    } catch (error) {
        toast.value = { message: error?.response?.data?.message || 'Failed to update pallet status.', color: 'error', show: true };
    } finally {
        confirmLoading.value = false;
    }
};

const applyFilters = (data) => {
    filters.value = data;
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{key: 'created_at', order: 'desc'}],
        search: props.search
    });
}

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

        <template #item.reader_id="{ item }">
            <!-- Use the reader name instead of reader_id -->
            {{ item.reader?.name }}
        </template>

        <template #item.plant_id="{ item }">
            {{ item.plant?.name }}
        </template>

        <template #item.batch="{ item }">
            {{ item.inventory?.batch }}
        </template>

        <template #item.created_at="{ item }">
            {{ item.created_at ? Moment(item.created_at).format('MMMM D, YYYY') : '' }}
        </template>

        <template #item.updated_at="{ item }">
            {{ item.updated_at ? Moment(item.updated_at).format('MMMM D, YYYY') : '' }}
        </template>

        <template #item.weak_pallet_logs_count="{ item }">
            {{ item.weak_pallet_logs_count ?? 0 }}
        </template>

        <template #item.installation_status="{ item }">
            <v-tooltip v-if="item.latest_weak_pallet_log?.confirmed_by" location="top">
                <template #activator="{ props: tooltipProps }">
                    <v-chip
                        v-bind="tooltipProps"
                        size="small"
                        :color="item.latest_weak_pallet_log?.status === 'installed' ? 'success' : 'error'"
                    >
                        {{ item.latest_weak_pallet_log?.status === 'installed' ? 'Installed' : 'Not Installed' }}
                    </v-chip>
                </template>
                Confirmed by {{ item.latest_weak_pallet_log.confirmed_by.name }}
                on {{ Moment(item.latest_weak_pallet_log.confirmed_at).format('MMMM D, YYYY h:mm A') }}
            </v-tooltip>
            <v-chip v-else size="small" color="grey">
                Pending
            </v-chip>
        </template>

        <template #item.actions="{ item }">
            <v-menu location="start">
                <template v-slot:activator="{ props: menuProps }">
                    <v-btn icon="ri-more-2-fill" variant="text" color="grey" v-bind="menuProps"></v-btn>
                </template>
                <v-list>
                    <v-list-item @click="openConfirmPallet(item)">
                        <v-list-item-title class="px-4">
                            Confirm Pallet
                        </v-list-item-title>
                    </v-list-item>
                </v-list>
            </v-menu>
        </template>

    </VDataTableServer>

    <DefaultModal :show="confirmPalletDialog" dialogTitle="Confirm Pallet" @close="confirmPalletDialog = false">
        <template #default>
            <v-row v-if="selectedPallet">
                <v-col cols="6">
                    <div class="text-caption text-grey-700">Name</div>
                    <div class="font-weight-medium">{{ selectedPallet.name }}</div>
                </v-col>
                <v-col cols="6">
                    <div class="text-caption text-grey-700">Plant</div>
                    <div class="font-weight-medium">{{ selectedPallet.plant?.name }}</div>
                </v-col>
                <v-col cols="6">
                    <div class="text-caption text-grey-700">EPC</div>
                    <div class="font-weight-medium">{{ selectedPallet.epc }}</div>
                </v-col>
                <v-col cols="6">
                    <div class="text-caption text-grey-700">Current Batch</div>
                    <div class="font-weight-medium">{{ selectedPallet.inventory?.batch }}</div>
                </v-col>
                <v-col cols="6">
                    <div class="text-caption text-grey-700">Weak Pallet Count</div>
                    <div class="font-weight-medium">{{ selectedPallet.weak_pallet_logs_count ?? 0 }}</div>
                </v-col>
                <v-col cols="6">
                    <div class="text-caption text-grey-700">Date Created</div>
                    <div class="font-weight-medium">
                        {{ selectedPallet.created_at ? Moment(selectedPallet.created_at).format('MMMM D, YYYY') : '' }}
                    </div>
                </v-col>
                <v-col cols="6">
                    <div class="text-caption text-grey-700">Last Updated At</div>
                    <div class="font-weight-medium">
                        {{ selectedPallet.updated_at ? Moment(selectedPallet.updated_at).format('MMMM D, YYYY') : '' }}
                    </div>
                </v-col>
            </v-row>

            <div class="mt-6">
                <label class="font-weight-bold">Installation Status</label>

                <div v-if="!selectedPallet?.latest_weak_pallet_log?.id" class="text-caption text-error mt-1">
                    No weak pallet log found to confirm.
                </div>
                <template v-else>
                    <v-radio-group v-model="selectedInstallStatus" inline class="mt-1">
                        <v-radio label="Installed" value="installed"></v-radio>
                        <v-radio label="Not Installed" value="not_installed"></v-radio>
                    </v-radio-group>

                    <div v-if="selectedPallet?.latest_weak_pallet_log?.confirmed_by" class="text-caption text-grey-700 mt-1">
                        Confirmed by <strong>{{ selectedPallet.latest_weak_pallet_log.confirmed_by.name }}</strong>
                        on {{ Moment(selectedPallet.latest_weak_pallet_log.confirmed_at).format('MMMM D, YYYY h:mm A') }}
                    </div>
                </template>
            </div>

            <div class="d-flex justify-end align-center mt-8">
                <v-btn color="secondary" variant="outlined" class="px-12 mr-3" @click="confirmPalletDialog = false">
                    Close
                </v-btn>
                <PrimaryButton
                    class="px-12"
                    :disabled="!selectedInstallStatus || !selectedPallet?.latest_weak_pallet_log?.id"
                    :loading="confirmLoading"
                    @click="submitConfirmPallet"
                >
                    Confirm
                </PrimaryButton>
            </div>
        </template>
    </DefaultModal>

    <Toast :show="toast.show" :message="toast.message" :color="toast.color"/>

</template>
