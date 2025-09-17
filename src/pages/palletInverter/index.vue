<script setup>
import { useAuthorization } from '@/composables/useAuthorization';
import ApiService from '@/services/ApiService';
import { debounce } from 'lodash';

const { authUserCan } = useAuthorization();

const headers = [
    {
        title: 'PLANT',
        key: 'plant_id',
    },
    {
        title: 'MATERIAL',
        key: 'material_id',
    },
    {
        title: 'BATCH',
        key: 'batch',
    },
    {
        title: 'MFG DATE',
        key: 'mfg_date',
    },
    {
        title: 'FROM PALLET #',
        key: 'from_pallet_id',
    },
    {
        title: 'TO PALLET #',
        key: 'to_pallet_id',
    },
    {
        title: 'TONNER BAG #',
        key: 'tonner_bag_no',
    },
    {
        title: 'ACTION',
        key: 'action',
        align: 'center',
        sortable: false,
    },
]

const serverItems = ref([]);
const plantsOption = ref([]);
const loading = ref(true);
const exportLoading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref('-created_at'); // Default sort
const searchValue = ref('');
const filters = reactive({
    start_date: null,
    end_date: null,
    plant_id: null,
});

const handleSearch = debounce((search) => {
    searchValue.value = search;
}, 500);

const toast = reactive({
    message: '',
    color: 'error',
    show: false
});

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

    ApiService.query('datatable/pallet-inverter-transactions',{
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
            loading.value = false

        })
        .catch((error) => {
            console.log(error);
        });
}

const exportData = () => {

}
</script>

<template>
    <VRow>
        <VCol md="7">
            <SearchInput @update:search="handleSearch"/>
        </VCol>
        <VCol md="3" class="d-flex justify-center align-center">
            <v-select
                class="mt-1"
                label="Filter by Plant"
                density="compact"
                :items="plantsOption.length > 1 ? [{ title: 'All', value: null }, ...plantsOption] : plantsOption"
                v-model="filters.plant_id"
                :rules="[value => value !== undefined || 'Please select an item from the list']"
            >
            </v-select>
        </VCol>
        <VCol md="2" class="d-flex justify-center align-center">
            <v-btn block
                :loading="exportLoading"
                class="d-flex align-center"
                prepend-icon="ri-download-line"
                @click="exportData"
            >
                <template #prepend>
                <v-icon color="white"></v-icon>
                </template>
                Export
            </v-btn>
        </VCol>
    </VRow>
  
    <VCard>
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

        </VDataTableServer>
    </VCard>

 
    <Toast :show="toast.show" :message="toast.message"  @update:show="toast.show = $event"/>
</template>
