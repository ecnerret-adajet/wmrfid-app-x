<script setup>
import Loader from '@/components/Loader.vue';
import ApiService from '@/services/ApiService';
import { debounce } from 'lodash';
import { onMounted } from 'vue';
import logsDataTable from './logsDataTable.vue';

const props = defineProps({
    plant: Object,
    storageLocation: Object
})

const readers = ref([]);
const selectedReader = ref(null);
const selectedReaderName = ref(null);
const errorMessage = ref(null);
const loading = ref(false);
const searchValue = ref('');

onMounted(() => {
    fetchReaders()
})

const fetchReaders = async () => {
    loading.value = true;
    try {
        const response = await ApiService.get(`data/get-readers-by-location/${props.plant.plant_code}/${props.storageLocation.slug}`);
        readers.value = response.data

        if (readers.value.length > 0) {
            selectedReader.value = readers.value[0].id; // Set default selected tab
            selectedReaderName.value = readers.value[0].name;
        } else {
            errorMessage.value = 'No readers found for this location.';
        }
        console.log(readers.value);

    } catch (error) {
        console.error('Error fetching data:', error);
    } finally {
        loading.value = false
    }
};

const handleSearch = debounce((search) => {
    searchValue.value = search;
}, 500);

</script>

<template>
    <div>
        <v-tabs v-if="readers.length > 0" v-model="selectedReader" bg-color="transparent" class="mt-3 mb-1">
            <v-tab class="text-h5 font-weight-black d-flex align-center" v-for="reader in readers" :key="reader.id"
                :value="reader.id">
                {{ reader.name }}
                <template v-slot:append>
                    <v-badge style="margin-top: -7px; margin-left: 10px;" color="error" :content="reader.pending_count"
                        inline>
                    </v-badge>
                </template>
            </v-tab>
        </v-tabs>
        <div class="mx-4">
            <SearchInput v-if="readers.length > 0" @update:search="handleSearch" class="mt-1" />
            <div v-if="!loading && readers.length > 0" class="mt-1 border">
                <logsDataTable :storage-location="storageLocation.slug" :key="selectedReader.id"
                    :plant-code="plant.plant_code" :search="searchValue" @refreshReader="fetchReaders"
                    :reader-name="selectedReaderName" />
            </div>
        </div>
    </div>
    <Loader :show="loading" />
</template>
