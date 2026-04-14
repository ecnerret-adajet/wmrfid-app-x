
<template>
  <div class="pa-8">
    <h1 class="text-h4 font-weight-bold mb-2">Storage Bins in {{plantCode}} - {{ sloc }}</h1>
    <div class="d-flex gap-4 align-center justify-center mb-2">
        <VTextField v-model="searchValue" label="Search" placeholder="placeholder" append-inner-icon="ri-search-line"
            single-line hide-details density="compact" class="flex-grow-1" />

        <v-autocomplete
            style="max-width: 300px;"
            class="flex-grow-1 align-center"
            label="Filter by Lot"
            density="compact"
            :items="lotOptions"
            v-model="filters.lot_id"
            item-title="label"
            item-value="id"
            :rules="[value => value !== undefined || 'Please select an item from the list']"
            clearable
        />

        <v-select style="max-width: 300px;" class="flex-grow-1 align-center" label="Filter by Availability"
            clearable
            density="compact" :items="availabilityOptions" v-model="filters.availability"
            :rules="[value => value !== undefined || 'Please select an item from the list']">
        </v-select>

        <v-btn class="d-flex align-center" prepend-icon="ri-search-eye-line" @click="handleSearch">
            <template #prepend>
                <v-icon color="white"></v-icon>
            </template>
            Search
        </v-btn>
    </div>
   
    <VCard>
        <VDataTableServer
            :headers="headers"
            :items="serverItems"
            :items-length="totalItems"
            :loading="pageLoading"
            :items-per-page="itemsPerPage"
            :page="page"
            class="text-no-wrap"
            @update:options="loadItems"
        >
            <template #item.block="{ item }">
                {{ item.lot?.label}}-{{ item.label }}
            </template>
            <template #item.lot="{ item }">
                {{ item.lot?.label }}
            </template>
            <template #item.availability="{ item }">
                <div class="d-flex align-center justify-center py-1">
                    <v-progress-circular
                    :model-value="(item.inventory_count / item.max_layer) * 100"
                    
                    :color="item.inventory_count === 0 ? 'grey' : item.inventory_count === item.max_layer ? 'success' : 'warning'"
                    size="50"
                    width="4"
                    >
                    <span v-if="item.inventory_count === 0" style="font-size: 13px;">Empty</span>
                    <span v-else>{{ item.inventory_count }}/{{ item.max_layer }}</span>
                    </v-progress-circular>
                </div>
            </template>
            <template #item.actions="{ item }">
                <v-btn icon="ri-qr-code-line" @click="() => handleQr(item)" color="primary"></v-btn>
            </template>
        </VDataTableServer>
    </VCard>
    <QrCodeModal
        v-model="qrModal"
        :physical-id="qrTarget.qr"
        :has-existing-qr="true"
    />
  </div>
</template>

<script setup>
import QrCodeModal from '@/components/QrCodeModal.vue';
import JwtService from '@/services/JwtService';
import axios from 'axios';
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { VDataTableServer } from 'vuetify/components';

const route = useRoute();
const plantCode = route.params.plant_code;
const sloc = route.params.sloc;

const searchValue = ref('');
const serverItems = ref([]);
const itemsPerPage = ref(10);
const page = ref(1);
const totalItems = ref(0);
const pageLoading = ref(false);
const qrModal = ref(false);
const qrTarget = ref({ qr: null });
const sortQuery = ref('-created_at');

const lotOptions = ref([]);

const availabilityOptions = [
    { title: 'Empty', value: 'empty' },
    { title: 'Occupied', value: 'occupied' },
];

const filters = reactive({
    lot_id: null,
    availability: null,
});

const handleSearch = () => {
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{ key: 'updated_at', order: 'desc' }],
        search: searchValue.value
    });
};

const headers = computed(() => [
    { title: 'Block', key: 'block', align: 'center', sortable: false },
    { title: 'Lot', key: 'lot', align: 'center', sortable: false },
    { title: 'Availability', key: 'availability', align: 'center', sortable: false },
    { title: 'Actions', key: 'actions', align: 'center', sortable: false },
]);

onMounted(() => {
    fetchDropdownData();
})


const fetchDropdownData = async () => {
    pageLoading.value = true;
    try {
        const token = JwtService.getToken();
        const response = await axios.get(`/warehouse/storage-bins/get-data-dropdown/${plantCode}/${sloc}`, {
            params: {
                filters: filters
            },
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const { lots } = response.data;
        lotOptions.value = lots;
        console.log(lotOptions.value);
    } catch (error) {
        console.log(error);
    } finally {
        pageLoading.value = false;
    }
};

const loadItems = async ({ page, itemsPerPage, sortBy, search }) => {
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

    try {
        const token = JwtService.getToken();

        const response = await axios.get(`warehouse/storage-bins/get-datatable/${plantCode}/${sloc}`, {
            params: {
                page,
                itemsPerPage,
                sort: sortQuery.value,
                search: searchValue.value,
                filters: filters
            },
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const { table } = response.data;
        console.log(table);
        totalItems.value = table.total;
        serverItems.value = table.data;

    } catch (error) {
        console.log(error);
    } finally {
        pageLoading.value = false;
    }
}
const handleQr = (bin) => {
    qrTarget.value = { qr: bin.qr };
    qrModal.value = true;
    
};
</script>
