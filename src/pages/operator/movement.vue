<script setup>
import SearchInput from '@/components/SearchInput.vue';
import { convertSlugToOriginal } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import { debounce } from 'lodash';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import logsDataTable from './logsDataTable.vue';
import WarehouseMap from './warehouseMap.vue';

const route = useRoute();
const router = useRouter();
const storageLocation = route.params.location;

const isWarehouseMap = ref(false);
const selectedReader = ref(null);
const selectedReaderName = ref(null);
const readers = ref([]);
const loading = ref(true);

const searchValue = ref('');
const tablePerPage = ref(10);
const tablePage = ref(1);

const errorMessage = ref(null);

const toggleButton = () => {
    isWarehouseMap.value = !isWarehouseMap.value;
};


onMounted(() => {
    fetchReaders();  
})

const fetchReaders = async () => {
    loading.value = true;
    try {
        const response = await ApiService.get(`data/get-readers-by-location/${storageLocation}`);
        readers.value = response.data
        
        if (readers.value.length > 0) {
            selectedReader.value = readers.value[0].id; // Set default selected tab
            selectedReaderName.value = readers.value[0].name; 
        } else {
            errorMessage.value = 'No readers found for this location.';
        }
    } catch (error) {
        console.error('Error fetching data:', error);
    } finally {
        loading.value = false
    }
};

// Watch for changes in `selectedReader`
watch(selectedReader, (newReaderId) => {
    
    const reader = readers.value.find(r => r.id === newReaderId);
    selectedReaderName.value = reader ? reader.name : null;
    tablePage.value = 1; // Reset page if switched reader
    searchValue.value = '' // reset search query if switched reader
});

const onPaginationChanged = ({ page, itemsPerPage, search }) => {
    tablePage.value = page
    tablePerPage.value = itemsPerPage
    searchValue.value = search
}

const handleSearch = debounce((search) => {
    searchValue.value = search;
}, 500);

const handleBack = () => {
    router.push({
        path: `/warehouse`,
    });
}

</script>

<template>
    <div class="mx-8 my-6">
        <v-card elevation="1">
            <div>
                <v-btn @click="handleBack()"
                    class="ma-2"
                    color="grey-700"
                    icon="ri-arrow-left-line"
                    variant="text"
                ></v-btn>
            </div>
            <div class="d-flex justify-between align-center px-6 pb-4">
                <h4 class="text-h3 font-weight-black text-primary">
                    {{ isWarehouseMap ? convertSlugToOriginal(storageLocation) + ' Map' : convertSlugToOriginal(storageLocation) + ' Operator Screen' }}
                </h4>
                <v-btn class="bg-primary-light ml-auto" @click="toggleButton">
                    {{ isWarehouseMap ? `Operator's Screen` : 'Warehouse Map' }}
                </v-btn>
            </div>
        </v-card>
        <v-card v-if="isWarehouseMap" elevation="1" class="mt-4 px-6 py-4">
            <WarehouseMap :storageLocation="storageLocation"></WarehouseMap>
        </v-card>
        <v-card v-else elevation="1" class="mt-4 px-6 py-4">
            <v-progress-linear v-if="loading" indeterminate color="primary"></v-progress-linear>
            <div v-if="readers.length === 0 && !loading" class="text-center">
                <p class="text-h5 font-weight-black text-grey">No readers found for this location.</p>
            </div>
            <v-tabs v-if="readers.length > 0" v-model="selectedReader" bg-color="transparent" class="mb-4 mt-4">
              
                <v-tab class="text-h4 font-weight-black d-flex align-center" v-for="reader in readers" :key="reader.id" :value="reader.id">
                    {{ reader.name }}
                    <template v-slot:append>
                        <v-badge style="margin-top: -7px; margin-left: 10px;"
                                color="error"
                                :content="reader.pending_count"
                                inline>
                        </v-badge>
                    </template>
                </v-tab>
            </v-tabs>
            <SearchInput v-if="readers.length > 0" @update:search="handleSearch" class="mt-4"/>

            <div v-if="!loading && readers.length > 0" class="mt-4">
                <logsDataTable :storage-location="storageLocation"
                    :key="selectedReader.id"
                    :search="searchValue" :page="tablePage"
                    :items-per-page="tablePerPage"
                    @pagination-changed="onPaginationChanged"
                    @refreshReader="fetchReaders"
                    :reader-name="selectedReaderName"
                />
            </div>
        </v-card>
    </div>
</template>
