<script setup>
import PrimaryButton from '@/components/PrimaryButton.vue';
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import { useAuthorization } from '@/composables/useAuthorization';
import ApiService from '@/services/ApiService';
import { debounce } from 'lodash';
import Moment from 'moment';
import { reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const { authUserCan } = useAuthorization();

const props = defineProps({
    productionRun: Object
})

const route = useRoute();
const searchValue = ref('');
const pageLoading = ref(false);
const tagTypesOption = ref([]);
const materialsOption = ref([]);
const statisticsData = ref(null);
const palletStats = ref({});
const labelStats = ref({});
const tonnerBagStats = ref({});
const selectedTagType = ref(null);
const changeBatchModal = ref(false);
const changeBatchLoading = ref(false);
const errorMessage = ref(null);

const serverItems = ref([]);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref('-created_at');
const selectedItems = ref([])
const filters = reactive({
    tag_type_id: null,
    plant_id: null
})

const form = reactive({
    production_run: props.productionRun,
    items: []
})

const headers = [
    {
        title: 'RFID CODE',
        key: 'rfid_code',
    },
    {
        title: 'PHYSICAL ID',
        key: 'physical_id',
    },
    {
        title: 'Group',
        key: 'group',
    },
    {
        title: 'TYPE',
        key: 'type',
        align: 'center',
        sortable: false
    },
    {
        title: 'Weak Signal',
        key: 'weak_signal',
        align: 'center',
        sortable: false
    },
    {
        title: 'CREATED AT',
        key: 'created_at',
    }, {
        title: 'UPDATED AT',
        key: 'updated_at',
    },
]

const router = useRouter();

const lastOptions = ref({});
const currentOptions = ref({});
const loadItems = ({ page, itemsPerPage, sortBy, search }) => {
    const options = { page, itemsPerPage, sortBy, search: searchValue.value };

    // Check if the options are the same as the last call
    const isSame = JSON.stringify(lastOptions.value) === JSON.stringify(options);
    if (isSame) return;

    // Store the current options
    lastOptions.value = options;
    currentOptions.value = options;

    pageLoading.value = true
    if (sortBy && sortBy.length > 0) {
        const sort = sortBy[0];  // Assuming single sort field
        sortQuery.value = `${sort.key}`;  // Default ascending order
        if (sort.order === 'desc') {
            sortQuery.value = `-${sort.key}`;  // Prefix with minus for descending order
        }
    } else {
        sortQuery.value = '-created_at';
    }

    ApiService.query(`production-runs/get-available-rfid/${props.productionRun.plant?.plant_code}`, {
        params: {
            page,
            itemsPerPage,
            sort: sortQuery.value,
            search: searchValue.value,
            filters: filters
        }
    })
        .then((response) => {
            const { table, tag_types } = response.data
            totalItems.value = table.total;
            serverItems.value = table.data

            tagTypesOption.value = [
                { value: null, title: 'All' },
                ...tag_types.map(item => ({
                    value: item.id,
                    title: item.title
                }))
            ];

            pageLoading.value = false
        })
        .catch((error) => {
            console.log(error);
            pageLoading.value = false
        });
}

watch(selectedTagType, async (newVal) => {
    pageLoading.value = true;
    filters.tag_type_id = newVal
    try {
        const response = await ApiService.query(`production-runs/get-available-rfid/${props.productionRun.plant?.plant_code}`, {
            params: {
                page: page.value,
                itemsPerPage: itemsPerPage.value,
                sortBy: [{ key: 'created_at', order: 'desc' }],
                search: searchValue.value,
                filters: filters
            }
        });

        const { table } = response.data

        totalItems.value = table.total;
        serverItems.value = table.data

        pageLoading.value = false
    } catch (error) {
        console.error("Error fetching filtered data:", error);
        pageLoading.value = false;
    } finally {
        pageLoading.value = false;
    }
});

const handleSearch = debounce((search) => {
    searchValue.value = search;
}, 500);

const handleViewRfid = (item) => {
    router.push(`/rfid/${item.type}/${item.name}`);
}

const assignLoading = ref(false);
const showAssignConfirm = ref(false);
const assignConfirm = async () => {
    assignLoading.value = true;
    toast.value.show = false;
    form.items = selectedItems.value
    try {
        const response = await ApiService.post('production-runs/assign-to-pallets', form)
        assignLoading.value = false;
        toast.value.color = 'success'
        toast.value.message = 'Batch assigned to pallets successfully!'
        toast.value.show = true;
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
        assignLoading.value = false;
        showAssignConfirm.value = false;
        selectedItems.value = []
        form.items = [];
    }
}

const toast = ref({
    message: 'Batch assigned to pallets successfully!',
    color: 'success',
    show: false
});

const handleAssign = () => {
    showAssignConfirm.value = true;
}

</script>

<template>
    <div>
        <VList lines="one" density="compact" class="border mx-4 mb-4">
            <VListItem>
                <VRow class="table-row" no-gutters>
                    <VCol md="6" class="table-cell d-inline-flex">
                        <VRow class="table-row">
                            <VCol cols="4" class="d-inline-flex align-start">
                                <span class="text-h6 text-uppercase font-weight-bold text-grey-700"
                                    style="margin-top: 1px;">Plant</span>
                            </VCol>
                            <VCol class="d-flex flex-column">
                                <span class="text-medium-emphasis font-weight-medium">{{
                                    productionRun?.plant?.plant_code }}</span>
                                <div class="text-subtitle-1 font-weight-thin">{{ productionRun?.plant?.name }}</div>
                            </VCol>
                        </VRow>
                    </VCol>
                    <VCol md="6" class="table-cell d-inline-flex">
                        <VRow class="table-row">
                            <VCol cols="4" class="d-inline-flex align-start">
                                <span class="text-h6 text-uppercase font-weight-bold text-grey-700"
                                    style="margin-top: 1px;">Storage Location</span>
                            </VCol>
                            <VCol class="d-flex flex-column">
                                <span class="text-medium-emphasis font-weight-medium">{{
                                    productionRun?.reader?.default_storage_location?.code }}</span>
                                <div class="text-subtitle-1 font-weight-thin">{{
                                    productionRun?.reader?.default_storage_location?.name }}</div>
                            </VCol>
                        </VRow>
                    </VCol>
                </VRow>
            </VListItem>
            <VListItem>
                <VRow class="table-row" no-gutters>
                    <VCol md="6" class="table-cell d-inline-flex">
                        <VRow class="table-row">
                            <VCol cols="4" class="d-inline-flex align-center">
                                <span class="text-h6 text-uppercase font-weight-bold text-grey-700"
                                    style="margin-top: 1px;">Batch</span>
                            </VCol>
                            <VCol class="d-inline-flex align-center">
                                <span class="font-weight-medium text-grey-700">{{ productionRun?.COMMODITY
                                }}</span>
                            </VCol>
                        </VRow>
                    </VCol>
                    <VCol md="6" class="table-cell d-inline-flex">
                        <VRow class="table-row">
                            <VCol cols="4" class="d-inline-flex align-center">
                                <span class="text-h6 text-uppercase font-weight-bold text-grey-700"
                                    style="margin-top: 1px;">Material</span>
                            </VCol>
                            <VCol class="d-inline-flex align-center">
                                <span class="font-weight-medium text-grey-700">{{ productionRun?.material?.description
                                }}</span>
                            </VCol>
                        </VRow>
                    </VCol>
                </VRow>
            </VListItem>
        </VList>
        <div class="mt-4 mx-4">
            <v-card elevation="0" class="border">
                <VRow class="mx-4">
                    <VCol md="10">
                        <SearchInput @update:search="handleSearch" />
                    </VCol>
                    <VCol md="2" class="d-flex justify-center align-center">
                        <v-select class="mt-1" label="Filter by Type" density="compact" :items="tagTypesOption"
                            v-model="selectedTagType">
                        </v-select>
                    </VCol>
                </VRow>
                <v-divider class="border-opacity-25" style="border-color: #cbcfc8;"></v-divider>
                <v-card-text class="mx-2">
                    <div>
                        <div class="mb-4 d-flex justify-between align-center">
                            <h4 class="text-h4 font-weight-semibold text-primary">Available RFID</h4>
                            <v-spacer></v-spacer>
                            <v-btn @click="handleAssign" :disabled="selectedItems.length === 0" class="px-5"
                                type="button" color="primary-light">
                                Assign
                            </v-btn>
                        </div>

                        <div class="mb-2" v-if="selectedItems.length > 0">
                            <span class="text-h6 font-weight-medium text-high-emphasis">
                                Selected items count: ({{ selectedItems.length }})
                            </span>
                        </div>

                        <VDataTableServer v-model:items-per-page="itemsPerPage" v-model="selectedItems"
                            :headers="headers" :items="serverItems" :items-length="totalItems" :loading="pageLoading"
                            item-value="id" :search="searchValue" @update:options="loadItems" show-select return-object
                            class="text-no-wrap">

                            <template #item.rfid_code="{ item }">
                                <span @click="handleViewRfid(item)"
                                    class="text-primary font-weight-bold cursor-pointer hover-underline">
                                    {{ item.rfid_code }}
                                </span>
                            </template>

                            <template #item.physical_id="{ item }">
                                {{ item.name }}
                            </template>

                            <template #item.group="{ item }">
                                {{ item.group_no }}
                            </template>

                            <template #item.weak_signal="{ item }">
                                <v-badge v-if="item.is_weak_signal" color="error" content="Yes" class="text-uppercase"
                                    inline></v-badge>
                            </template>

                            <template #item.type="{ item }">
                                <span class="text-uppercase">{{ item.type }}</span>
                            </template>

                            <template #item.created_at="{ item }">
                                {{ item.created_at ? Moment(item.created_at).format('MMMM D, YYYY') : ''
                                }}
                            </template>

                            <template #item.updated_at="{ item }">
                                {{ item.updated_at ? Moment(item.updated_at).format('MMMM D, YYYY') : '' }}
                            </template>

                        </VDataTableServer>
                    </div>
                </v-card-text>
            </v-card>
        </div>
    </div>
    <v-dialog v-model="showAssignConfirm" max-width="600px" persistent>
        <v-sheet class="px-4 pt-8 pb-4 text-center mx-auto" elevation="12" max-width="600" rounded="lg" width="100%">
            <v-icon class="mb-5" color="primary" icon="ri-information-line" size="112"></v-icon>

            <h2 class="text-h4 mb-6">Assign batch <strong>{{ productionRun?.COMMODITY }}</strong> to the selected
                pallets?
            </h2>

            <div class="text-end">
                <v-btn color="secondary" variant="outlined" @click="showAssignConfirm = false"
                    class="px-12 mr-3">Cancel</v-btn>
                <PrimaryButton @click="assignConfirm" color="primary" class="px-12" :loading="assignLoading">
                    Assign
                </PrimaryButton>
            </div>
        </v-sheet>
    </v-dialog>
    <Toast :show="toast.show" :color="toast.color" :message="toast.message" @update:show="toast.show = $event" />
</template>
