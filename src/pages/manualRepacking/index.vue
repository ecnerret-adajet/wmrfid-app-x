<script setup>
import AddingModal from '@/components/AddingModal.vue';
import DatePicker from '@/components/DatePicker.vue';
import DateTimePicker from '@/components/DateTimePicker.vue';
import FilteringModal from '@/components/FilteringModal.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import { useAuthorization } from '@/composables/useAuthorization';
import { exportExcel } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import JwtService from '@/services/JwtService';
import axios from 'axios';
import { debounce } from 'lodash';
import Moment from 'moment';
import { reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import assignPallets from './assignPallets.vue';
import RepackingDetails from './repackingDetails.vue';

const { authUserCan } = useAuthorization();

const pageLoading = ref(false);
const storageLocations = ref([]);
const materialsOption = ref([]);
const plantsOptions = ref([]);
const repackingOpen = ref(false);
const errorMessage = ref(null);
const filterModalOpen = ref(false);
const filtersLoading = ref(false);

const toast = ref({
    message: 'Repacking created successfully',
    color: 'success',
    show: false
});
const filters = reactive({
    created_at: null,
    updated_at: null
})

onMounted(() => {
    loadData();
})

const loadData = async () => {
    pageLoading.value = true;
    try {
        const token = JwtService.getToken();
        const response = await axios.get(`/repackings/get-data-dropdown`, {
            params: {
                filters: filters
            },
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const { materials, plants } = response.data;

        materialsOption.value = materials.map(item => ({
            value: item.id,
            title: `${item.plant_code} - ${item.code} - ${item.description}`,
            numerator: item.numerator,
            denominator: item.denominator,
        }));

        plantsOptions.value = plants
            .filter(item => item.name !== null)
            .map(item => ({
                value: item.id,
                title: item.name
            }));

    } catch (error) {
        console.log(error);
    } finally {
        pageLoading.value = false;
    }
}

const handleSearch = debounce((search) => {
    searchValue.value = search;
}, 500);

const searchValue = ref('');
const router = useRouter();
const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref('-created_at'); // Default sort
const changeBatchModal = ref(false);
const repackLoading = ref(false);

const headers = [
    {
        title: '',
        key: 'action',
        align: 'center',
        sortable: false,
    },
    {
        title: 'PLANT',
        key: 'plant_id',
        sortable: false
    },
    {
        title: 'BATCH',
        key: 'batch',
    },
    {
        title: 'FROM MATERIAL',
        key: 'from_material_id',
    },
    {
        title: 'TO MATERIAL',
        key: 'to_material_id',
    },
    {
        title: 'MFG DATE',
        key: 'manufacture_date',
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

    ApiService.query('datatable/repackings', {
        params: {
            page,
            itemsPerPage,
            sort: sortQuery.value,
            search: searchValue.value,
            filters: filters
        }
    })
        .then((response) => {
            totalItems.value = response.data.total;
            serverItems.value = response.data.data
            console.log(serverItems.value);
            loading.value = false
        })
        .catch((error) => {
            loading.value = false
            console.log(error);
        });
}

watch(() => filters.plant_id, () => {
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{
            key: sortQuery.value.replace('-', ''),
            order: sortQuery.value.startsWith('-') ? 'desc' : 'asc'
        }]
    });
    // loadData()
});

const actionList = [
    { title: 'View Details', key: 'view_details' },
]

const selectedRepackingRun = ref(null);
const showInventoryDetails = ref(false);
const showAssign = ref(false);
const showDetails = ref(false);
const handleAction = (repacking, action) => {
    selectedRepackingRun.value = repacking;

    if (action.key == 'view_details') {
        showDetails.value = true;
    }

    if (action.key == 'assign_pallets') {
        showAssign.value = true;
    }

}

const exportLoading = ref(false);
const exportData = async () => {

    try {
        exportLoading.value = true;
        await exportExcel({
            url: '/export/inventories/',
            params: {
                plant_id: filters.plant_id,
                search: searchValue.value,
            },
            filename: 'inventories.xlsx',
        });
    } catch (error) {
        console.error('Export error:', error);
    } finally {
        exportLoading.value = false;
    }
}

const form = reactive({
    manufacture_date: null,
    from_material_id: null,
    to_material_id: null,
    start_date_time: null,
})

const handleRepack = async () => {
    repackLoading.value = true;
    toast.value.show = false;
    try {
        const response = await ApiService.post('repackings/store', form)
        repackLoading.value = false;
        toast.value.message = 'Repacking run created successfully!'
        toast.value.show = true;
        clearRepack();
        loadItems({
            page: page.value,
            itemsPerPage: itemsPerPage.value,
            sortBy: [{ key: 'created_at', order: 'desc' }],
            search: searchValue.value
        });
        errorMessage.value = null;

    } catch (error) {
        errorMessage.value = error.response?.data?.message || 'An unexpected error occurred.';
        console.error('Error submitting:', error);
    } finally {
        repackingOpen.value = false;
        repackLoading.value = false;
    }
}

const fromMaterialOptions = computed(() =>
    materialsOption.value.filter(item => item.value !== form.to_material_id)
)

const toMaterialOptions = computed(() =>
    materialsOption.value.filter(item => item.value !== form.from_material_id)
)

const clearRepack = () => {
    form.manufacture_date = null;
    form.from_material_id = null;
    form.to_material_id = null;
    form.start_date_time = null;
}


</script>

<template>

    <div class="d-flex flex-wrap gap-4 align-center justify-center">
        <SearchInput class="flex-grow-1" @update:search="handleSearch" />

        <v-btn class="d-flex align-center" prepend-icon="ri-equalizer-line" @click="filterModalOpen">
            <template #prepend>
                <v-icon color="white"></v-icon>
            </template>
            Filter
        </v-btn>

        <!-- <v-select style="max-width: 300px;" class="flex-grow-1 align-center mt-1" label="Filter by Plant"
            density="compact"
            :items="plantsOption.length > 1 ? [{ title: 'All', value: null }, ...plantsOption] : plantsOption"
            v-model="filters.plant_code"
            :rules="[value => value !== undefined || 'Please select an item from the list']">
        </v-select>

        <v-btn v-if="authUserCan('export.production.runs')" :loading="exportLoading" class="d-flex align-center"
            prepend-icon="ri-download-line" @click="exportData">
            <template #prepend>
                <v-icon color="white"></v-icon>
            </template>
            Export
        </v-btn> -->

        <v-btn v-if="authUserCan('create.manual.repack')" class="d-flex align-center" prepend-icon="ri-add-line"
            @click="repackingOpen = true">
            <template #prepend>
                <v-icon color="white"></v-icon>
            </template>
            Add New Repacking
        </v-btn>
    </div>

    <VCard>
        <VDataTableServer v-model:items-per-page="itemsPerPage" :headers="headers" :items="serverItems"
            :items-length="totalItems" :loading="loading" item-value="id" :search="searchValue"
            @update:options="loadItems" class="text-no-wrap">
            <template #item.action="{ item }">
                <div class="d-flex justify-center gap-1">
                    <v-menu location="end">
                        <template v-slot:activator="{ props }">
                            <v-btn icon="ri-more-2-line" variant="text" v-bind="props" color="grey"></v-btn>
                        </template>
                        <v-list>
                            <v-list-item @click="handleAction(item, { key: 'view_details', title: 'View Details' })">
                                <v-list-item-title>View Details</v-list-item-title>
                            </v-list-item>
                            <v-list-item
                                @click="handleAction(item, { key: 'assign_pallets', title: 'Assign Pallets' })">
                                <v-list-item-title>Assign Pallets</v-list-item-title>
                            </v-list-item>
                        </v-list>
                    </v-menu>
                </div>
            </template>
            <template #item.batch="{ item }">
                {{ item.batch }}
            </template>

            <template #item.to_material_id="{ item }">
                {{ item.to_material?.description }}
            </template>

            <template #item.from_material_id="{ item }">
                {{ item.from_material?.description }}
            </template>

            <template #item.plant_id="{ item }">
                {{ item.to_material?.plant?.name }}
            </template>

            <template #item.material_id="{ item }">
                {{ item.material?.description }}
            </template>

            <template #item.manufacture_date="{ item }">
                <span>{{ item.manufacture_date_time ?
                    Moment(item.manufacture_date_time).format('MMMM D, YYYY') : '' }}</span>
            </template>

            <template #item.latest_mfg_date="{ item }">
                {{ item.latest_mfg_date ? Moment(item.latest_mfg_date).format('MMMM D, YYYY') : '' }}
            </template>

            <template #item.latest_created_at="{ item }">
                {{ item.latest_created_at ? Moment(item.latest_created_at).format('MMMM D, YYYY') : '' }}
            </template>

            <template #item.updated_at="{ item }">
                {{ item.updated_at ? Moment(item.updated_at).format('MMMM D, YYYY') : '' }}
            </template>

        </VDataTableServer>
    </VCard>

    <AddingModal @close="repackingOpen = false" max-width="600px" :show="repackingOpen"
        :dialog-title="`Create New Repacking`">
        <template #default>
            <v-form @submit.prevent="handleRepack">
                <v-row>
                    <v-col cols="12">
                        <label for="from_material">From Material</label>
                        <v-autocomplete class="mt-1" id="from_material" density="compact" item-title="title"
                            item-value="value" :items="fromMaterialOptions" v-model="form.from_material_id"
                            :rules="[value => !!value || 'Please select an item from the list']" />
                    </v-col>

                </v-row>
                <v-row>
                    <v-col cols="12">
                        <label for="to_material">To Material</label>
                        <v-autocomplete class="mt-1" id="to_material" density="compact" item-title="title"
                            item-value="value" :items="toMaterialOptions" v-model="form.to_material_id"
                            :rules="[value => !!value || 'Please select an item from the list']" />
                    </v-col>
                </v-row>

                <v-row>
                    <v-col cols="12">
                        <label for="manufacture_date">Manufacture Date</label>
                        <DatePicker class="mt-1" id="manufacture_date" v-model="form.manufacture_date"
                            placeholder="Select Manufacturing Date" />
                    </v-col>
                </v-row>

                <v-row>
                    <v-col cols="12">
                        <label for="start_date">Start Date</label>
                        <DateTimePicker class="mt-1" id="start_date" v-model="form.start_date_time"
                            placeholder="Select Start Date" />
                    </v-col>
                </v-row>

            </v-form>

            <div class="d-flex justify-end align-center mt-4">
                <v-btn color="secondary" variant="outlined" @click="repackingOpen = false"
                    class="px-12 mr-3">Cancel</v-btn>
                <PrimaryButton @click="handleRepack" color="primary" class="px-12" type="submit"
                    :loading="repackLoading">
                    Create
                </PrimaryButton>
            </div>
        </template>
    </AddingModal>


    <!-- Repacking Details Modal -->
    <v-dialog v-if="selectedRepackingRun" v-model="showDetails" max-width="1500px">
        <v-card elevation="2">
            <v-card-title class="d-flex justify-space-between align-center mx-4 px-4 mt-6">
                <div class="text-h4 font-semibold ps-2 text-primary d-flex align-center">
                    <i class="ri-database-2-line text-primary text-h4 mr-2" style="margin-top: -1px;"></i>
                    Repacking - Batch Details
                </div>
                <v-btn icon="ri-close-line" variant="text" @click="showDetails = false"></v-btn>
            </v-card-title>
            <v-card-text>
                <repacking-details :repacking="selectedRepackingRun" />
            </v-card-text>
        </v-card>
    </v-dialog>

    <FilteringModal @close="filterModalOpen = false" :show="filterModalOpen" :dialogTitle="'Filter Readers'">
        <template #default>
            <v-form>

                <div class="mt-4">
                    <label class="font-weight-bold">Date Created</label>
                    <DateRangePicker class="mt-1" v-model="filters.created_at" placeholder="Select Date Created" />
                </div>

                <div class="mt-4">
                    <label class="font-weight-bold">Date Updated</label>
                    <DateRangePicker class="mt-1" v-model="filters.updated_at" placeholder="Select Date Updated" />
                </div>

                <div class="d-flex justify-end align-center mt-8">
                    <v-btn color="secondary" variant="outlined" :disabled="isFiltersEmpty" @click="resetFilter"
                        class="px-12 mr-3">Reset Filter</v-btn>
                    <PrimaryButton class="px-12" type="button" :disabled="isFiltersEmpty" @click="applyFilter"
                        :loading="filtersLoading">
                        Apply Filter
                    </PrimaryButton>
                </div>
            </v-form>
        </template>
    </FilteringModal>

    <!-- Assign Pallets Modal -->
    <v-dialog v-if="selectedRepackingRun" v-model="showAssign" max-width="1500px">
        <v-card elevation="2">
            <v-card-title class="d-flex justify-space-between align-center mx-4 px-4 mt-6">
                <div class="text-h4 font-weight-black ps-2 text-primary d-flex align-center">
                    <i class="ri-user-settings-line text-primary text-h4 mr-2" style="margin-top: -1px;"></i>
                    Repacking - Assign Pallets
                </div>
                <v-btn icon="ri-close-line" variant="text" @click="showAssign = false"></v-btn>
            </v-card-title>
            <v-card-text>
                <assign-pallets :repacking="selectedRepackingRun" />
            </v-card-text>
        </v-card>
    </v-dialog>

    <Toast :show="toast.show" :message="toast.message" @update:show="toast.show = $event" />
</template>
