<script setup>
import SearchInput from '@/components/SearchInput.vue';
import ApiService from '@/services/ApiService';
import { debounce } from 'lodash';
import Moment from 'moment';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref('-created_at'); // Default sort
const filterModalVisible = ref(false)
const searchValue = ref('');
const filters = reactive({
    start_date: null,
    end_date: null
});

const headers = [
    {
        title: 'MATERIAL',
        key: 'material_id',
    },
    {
        title: 'BATCH',
        key: 'batch',
    },
    {
        title: 'RFID COUNT',
        key: 'inventory_log_count',
        align: 'center',
        sortable: false,
    },
    {
        title: 'TYPE',
        key: 'rfid_type',
        align: 'center',
        sortable: false,
    },
    {
        title: 'Current Age',
        key: 'current_age',
        align: 'center',
        sortable: false,
    },
    {
        title: 'START DATE',
        key: 'start_date',
    },
    {
        title: 'END DATE',
        key: 'end_date',
        align: 'center',
    },
    {
        title: 'Fumigation Age',
        key: 'fumigation_age',
        align: 'center',
        sortable: false,
    },
    {
        title: '',
        key: 'action',
        align: 'center',
        sortable: false,
    },
]

const filterModalOpen = () => {
    if (!filterModalVisible.value) {
        filterModalVisible.value = true;
    }
};

const handleSearch = debounce((search) => {
    searchValue.value = search;
}, 500);

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

    ApiService.query('datatable/fumigation-requests',{
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

const handleViewBatch = (item) => {
    router.push(`/production-runs/${item.batch}`);
}

</script>
<template>
    <div class="d-flex flex-wrap gap-4 align-center justify-center">
        <SearchInput class="flex-grow-1" @update:search="handleSearch" />

        <v-btn
            class="d-flex align-center"
            prepend-icon="ri-equalizer-line"
            @click="filterModalOpen"
        >
            <template #prepend>
            <v-icon color="white"></v-icon>
            </template>
            Filter
        </v-btn>
    </div>
    <v-card>
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
            <template #item.material_id="{ item }">
                {{ item.material?.description }}
            </template>

            <template #item.batch="{ item }">
                <span @click="handleViewBatch(item)" class="text-primary font-weight-bold cursor-pointer hover-underline">
                    {{ item.batch }}
                </span>
            </template>

            <template #item.inventory_log_count="{ item }">
                {{ item.inventory_logs.length }}
            </template>

            <template #item.start_date="{ item }">
                <span v-if="item.start_date">{{ item.start_date ? Moment(item.start_date).format('MMMM D, YYYY') : '' }}</span>
            </template>

            <template #item.end_date="{ item }">
                <span v-if="item.end_date">{{ item.end_date ? Moment(item.end_date).format('MMMM D, YYYY') : '' }}</span>
            </template>

            <template #item.action="{ item }">
                <v-btn
                    :to="`/fumigations/${item.id}`"
                    color="primary-light"
                    variant="outlined"
                    size="small"
                >
                    Details
                </v-btn>
            </template>

        </VDataTableServer>
    </v-card>
</template>
