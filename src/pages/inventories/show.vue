<script setup>
import SearchInput from '@/components/SearchInput.vue';
import axios from 'axios';
import { debounce } from 'lodash';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import batchDataTable from './batchDataTable.vue';

const route = useRoute();
const router = useRouter();
const shipment = ref(null);
const isLoading = ref(false);
const batch = route.params.batch; // Get the shipment number from URL
const searchValue = ref('');
const pageLoading = ref(false);
const tagTypesOption = ref([]);
const sequenceOption = ref([]);
const statisticsData = ref(null);

onMounted(async () => {
    pageLoading.value = true;
    try {
        // Fetch shipment details from API
        const response = await axios.get(`inventories/get-data-dropdown/${batch}`);
        const { tag_types, sequence, statistics } = response.data; 
      
        tagTypesOption.value = tag_types.map(item => ({
            value: item.id,
            title: item.name 
        }));
        sequenceOption.value = sequence
        statisticsData.value = statistics
      console.log(statisticsData.value);
      
        pageLoading.value = false; // Stop loading
    } catch (error) {
        console.error("Batch not found:", error);
    } finally {
        pageLoading.value = false; // Stop loading
    }
});

const handleSearch = debounce((search) => {
    searchValue.value = search;
}, 500);

</script>

<template>
    <v-progress-linear v-if="pageLoading" indeterminate color="primary" class="mt-5"></v-progress-linear>
    <div v-else>
        <div>
            <v-row>
                <v-col cols="3">
                    <v-card
                        class="pa-4"
                        elevation="2"
                        style="border-radius: 4px; background-color: #f9fafb;"
                    >
                        <div class="d-flex align-center">
                        <div
                            class="d-flex align-center justify-center mr-4"
                            style="
                            width: 48px;
                            height: 48px;
                            background-color: #cae2fa;
                            border-radius: 12px;
                            "
                        >
                            <v-icon
                            icon="ri-box-3-line"
                            color="primary-light"
                            size="24"
                            ></v-icon>
                        </div>
                        <div>
                            <span class="text-subtitle-1 font-weight-bold text-grey-700">
                            Total Quantity
                            </span>
                            <div class="text-h4 font-weight-bold text-primary mt-1">
                            {{ statisticsData?.total_quantity }}
                            </div>
                        </div>
                        </div>
                    </v-card>
                </v-col>
                <v-col cols="3">
                    <v-card
                        class="pa-4"
                        elevation="2"
                        style="border-radius: 4px; background-color: #f9fafb;"
                    >
                        <div class="d-flex align-center">
                        <div
                            class="d-flex align-center justify-center mr-4"
                            style="
                            width: 48px;
                            height: 48px;
                            background-color: #fdecea;
                            border-radius: 12px;
                            "
                        >
                            <v-icon
                            icon="ri-error-warning-line"
                            color="error"
                            size="24"
                            ></v-icon>
                        </div>
                        <div>
                            <span class="text-subtitle-1 font-weight-bold text-grey-700">
                            Near Expiry
                            </span>
                            <div class="text-h4 font-weight-bold text-primary mt-1">
                            {{ statisticsData?.near_expiry }}
                            </div>
                        </div>
                        </div>
                    </v-card>
                </v-col>
            
                <v-col cols="3">
                    <v-card
                        class="pa-4"
                        elevation="2"
                        style="border-radius: 4px; background-color: #f9fafb;"
                    >
                        <div class="d-flex align-center">
                        <div
                            class="d-flex align-center justify-center mr-4"
                            style="
                            width: 48px;
                            height: 48px;
                            background-color: #e0f2fe;
                            border-radius: 12px;
                            "
                        >
                            <v-icon
                            icon="ri-folder-5-line"
                            color="primary"
                            size="24"
                            ></v-icon>
                        </div>
                        <div>
                            <span class="text-subtitle-1 font-weight-bold text-grey-700">
                            Wrapped Items
                            </span>
                            <div class="text-h4 font-weight-bold text-primary mt-1">
                            {{ statisticsData?.wrapped_items }}
                            </div>
                        </div>
                        </div>
                    </v-card>
                </v-col>
                <v-col cols="3">
                    <v-card
                        class="pa-4"
                        elevation="2"
                        style="border-radius: 4px; background-color: #f9fafb;"
                    >
                        <div class="d-flex align-center">
                        <div
                            class="d-flex align-center justify-center mr-4"
                            style="
                            width: 48px;
                            height: 48px;
                            background-color: #e8f5e9;
                            border-radius: 12px;
                            "
                        >
                            <v-icon
                            icon="ri-thumb-up-line"
                            color="primary"
                            size="24"
                            ></v-icon>
                        </div>
                        <div>
                            <span class="text-subtitle-1 font-weight-bold text-grey-700">
                            Available Items
                            </span>
                            <div class="text-h4 font-weight-bold text-primary mt-1">
                            {{ statisticsData?.available_items }}
                            </div>
                        </div>
                        </div>
                    </v-card>
                </v-col>
            </v-row>
        </div>
        <div class="mt-4">
            <v-card>
                <VRow class="mx-4">
                    <VCol md="8">
                        <SearchInput @update:search="handleSearch"/>
                    </VCol>
                    
                    <VCol md="2" class="d-flex justify-center align-center">
                        <v-select class="mt-1" label="Filter by Type" density="compact"
                            :items="tagTypesOption" 
                        >
                        </v-select>
                    </VCol>
                    <VCol md="2" class="d-flex justify-center align-center">
                        <v-select class="mt-1" label="Filter by Sequence" density="compact"
                            :items="sequenceOption" 
                        >
                        </v-select>
                    </VCol>
                </VRow>
                <v-divider class="border-opacity-25" style="border-color: #cbcfc8;"></v-divider>

                <v-card-text class="mx-2">
                    <h4 class="text-h4 font-weight-black text-primary">Batch Details</h4>
                    <div class="mt-2">
                        <batch-data-table :batch="batch" :search="searchValue"/>
                    </div>
                </v-card-text>
            </v-card>
        </div>
    </div>
</template>
