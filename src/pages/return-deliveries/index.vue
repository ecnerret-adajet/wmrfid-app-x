<script setup>
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import { useAuthStore } from '@/stores/auth';
import { onMounted, ref } from 'vue';
import datatable from './datatable.vue';

const authStore = useAuthStore();

const plantsOption = ref([]);
const plantsLoaded = ref(false);

const SUPER_ADMIN_DEFAULT_PLANT_CODE = '2110';

const loadPlants = async () => {
    try {
        const response = await ApiService.get('/users/get-data-dropdown');
        plantsOption.value = (response.data.plants ?? [])
            .filter(item => item.name !== null)
            .map(item => ({ value: item.plant_code, title: item.name }));
        plantsLoaded.value = true;

        if (authStore.user?.is_super_admin) {
            filters.plant = SUPER_ADMIN_DEFAULT_PLANT_CODE;
        } else if (plantsOption.value.length > 0) {
            filters.plant = plantsOption.value[0].value;
        }

        if (filters.plant) {
            applyFilter();
        }
    } catch (error) {
        console.error(error);
        plantsLoaded.value = true;
    }
};

onMounted(() => {
    loadPlants();
});

const searchInput = ref('');
const searchValue = ref('');
const datatableRef = ref(null);
const tablePerPage = ref(10);
const tablePage = ref(1);
const tableSort = ref('-created_at')
const isLoading = ref(false);
const toast = ref({
    message: 'Success message',
    color: 'success',
    show: false
});

const filters = reactive({
    plant: null,
});

const applyFilter = () => {
    if(datatableRef.value) {
        datatableRef.value.applyFilters(filters);
    }
}

const onPlantChange = () => {
    applyFilter();
}

const handleSearch = () => {
    searchValue.value = searchInput.value;
};

const onPaginationChanged = ({ page, itemsPerPage, sortBy, search }) => {
    tableSort.value = sortBy
    tablePage.value = page
    tablePerPage.value = itemsPerPage
    searchValue.value = search

    loadStatusCounts();
}

const statusCounts = ref({
    total: 0,
    without_assigned_pallets: 0,
});
const statusCountsLoading = ref(false);

const loadStatusCounts = async () => {
    statusCountsLoading.value = true;
    try {
        const response = await ApiService.query('return-deliveries/status-counts', {
            params: {
                search: searchValue.value,
                filters,
            },
        });
        statusCounts.value = {
            total: response.data.total ?? 0,
            without_assigned_pallets: response.data.without_assigned_pallets ?? 0,
        };
    } catch (error) {
        console.error(error);
    } finally {
        statusCountsLoading.value = false;
    }
};

</script>

<template>
    <VRow>
        <VCol cols="12" sm="6" md="4">
            <VCard variant="outlined" class="bg-grey-50">
                <VCardText class="d-flex align-center justify-space-between">
                    <div>
                        <div class="text-body-2 text-medium-emphasis">
                            Total Entries
                        </div>
                        <div class="text-h4 font-weight-bold">
                            <VProgressCircular v-if="statusCountsLoading" indeterminate size="20" width="2" color="primary"/>
                            <span v-else>{{ statusCounts.total }}</span>
                        </div>
                    </div>
                    <VAvatar color="primary" variant="tonal" size="48" rounded>
                        <VIcon icon="ri-file-list-3-line" size="24"/>
                    </VAvatar>
                </VCardText>
            </VCard>
        </VCol>
        <VCol cols="12" sm="6" md="4">
            <VCard variant="outlined" class="bg-grey-50">
                <VCardText class="d-flex align-center justify-space-between">
                    <div>
                        <div class="text-body-2 text-medium-emphasis">
                            Without Assigned Pallets
                        </div>
                        <div class="text-h4 font-weight-bold">
                            <VProgressCircular v-if="statusCountsLoading" indeterminate size="20" width="2" color="warning"/>
                            <span v-else>{{ statusCounts.without_assigned_pallets }}</span>
                        </div>
                    </div>
                    <VAvatar color="warning" variant="tonal" size="48" rounded>
                        <VIcon icon="ri-stack-line" size="24"/>
                    </VAvatar>
                </VCardText>
            </VCard>
        </VCol>
    </VRow>

    <VRow align="center" class="mt-1">
        <VCol md="7">
            <VTextField
                v-model="searchInput"
                placeholder="Search ..."
                append-inner-icon="ri-search-line"
                single-line
                hide-details
                density="compact"
                @keyup.enter="handleSearch"
            />
        </VCol>
        <VCol md="3">
            <v-select
                density="compact"
                label="Filter by Plant"
                variant="outlined"
                :items="plantsOption"
                :loading="!plantsLoaded"
                v-model="filters.plant"
                clearable
                hide-details
                @update:model-value="onPlantChange"
            />
        </VCol>
        <VCol md="2" class="d-flex justify-center align-center">
            <v-btn block prepend-icon="ri-search-line" class="w-full" @click="handleSearch">
                Search
            </v-btn>
        </VCol>
    </VRow>

    <VCard class="mt-4">
        <datatable ref="datatableRef" @pagination-changed="onPaginationChanged"
            :search="searchValue"
        />
    </VCard>

    <Toast :show="toast.show" :message="toast.message"/>
</template>
