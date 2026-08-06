<script setup>
import PrimaryButton from '@/components/PrimaryButton.vue';
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import JwtService from '@/services/JwtService';
import axios from 'axios';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const pallets = ref([]);
const palletsLoading = ref(false);
const selectedPallets = ref([]);
const notes = ref('');
const searchQuery = ref('');
const submitLoading = ref(false);
const totalPallets = ref(0);
const page = ref(1);
const itemsPerPage = ref(50);

const plantsOption = ref([]);
const plantsLoaded = ref(false);
const selectedPlant = ref(null);

const toast = ref({
    message: '',
    color: 'success',
    show: false
});

let debounceTimeout = null;

const palletHeaders = [
    { title: '', key: 'data-table-select', sortable: false },
    { title: 'PHYSICAL ID', key: 'name', sortable: false },
    { title: 'PALLET CODE', key: 'pallet_code', sortable: false },
    { title: 'PLANT', key: 'plant_code', sortable: false },
    { title: 'EPC', key: 'epc', sortable: false },
    { title: 'WITH QR', key: 'with_qr', align: 'center', sortable: false },
];

const loadPlants = async () => {
    try {
        const response = await ApiService.get('managed-plant-storage-locations');
        plantsOption.value = (response.data.plants ?? [])
            .filter(item => item.name !== null)
            .map(item => ({ value: item.plant_code, title: item.name }));
        plantsLoaded.value = true;
        if (plantsOption.value.length > 0) {
            selectedPlant.value = plantsOption.value[0].value;
        }
    } catch (error) {
        console.error('Error fetching plants:', error);
        plantsLoaded.value = true;
    }
};

const fetchPallets = async (search = '') => {
    palletsLoading.value = true;
    try {
        const token = JwtService.getToken();
        const payload = {
            name: search, // change for backend compatibility
            page: page.value,
            per_page: itemsPerPage.value,
        };

        if (selectedPlant.value) {
            payload.plant_code = selectedPlant.value;
        }

        const response = await axios.post('/pallet-registration/get-list', payload, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        pallets.value = response.data.data || response.data;
        totalPallets.value = response.data.total || pallets.value.length;
    } catch (error) {
        console.error('Error fetching pallets:', error);
        toast.value = {
            message: 'Failed to load pallets.',
            color: 'error',
            show: true
        };
    } finally {
        palletsLoading.value = false;
    }
};

const handleSearchInput = (value) => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
        page.value = 1;
        fetchPallets(value);
    }, 300);
};

const loadMorePallets = async (options) => {
    page.value = options.page;
    await fetchPallets(searchQuery.value);
};

const handleSubmit = async () => {
    if (selectedPallets.value.length === 0) {
        toast.value = {
            message: 'Please select at least one pallet.',
            color: 'warning',
            show: true
        };
        return;
    }

    submitLoading.value = true;
    try {
        const payload = {
            pallet_ids: selectedPallets.value.map(p => p.id),
            notes: notes.value || null,
        };

        await ApiService.post('pallet-print-requests', payload);

        toast.value = {
            message: 'Print request created successfully!',
            color: 'success',
            show: true
        };

        setTimeout(() => {
            router.push('/pallet-print-requests');
        }, 1000);
    } catch (error) {
        console.error('Error creating print request:', error);
        toast.value = {
            message: error.response?.data?.message || 'Failed to create print request.',
            color: 'error',
            show: true
        };
    } finally {
        submitLoading.value = false;
    }
};

const goBack = () => {
    router.push('/pallet-print-requests');
};

watch(selectedPlant, () => {
    if (!plantsLoaded.value) return;
    page.value = 1;
    fetchPallets(searchQuery.value);
});

onMounted(async () => {
    await loadPlants();
    fetchPallets();
});
</script>

<template>
    <div>
        <!-- Page Header -->
        <div class="d-flex align-center mb-6">
            <v-btn
                icon
                variant="text"
                @click="goBack"
                class="mr-2"
            >
                <VIcon icon="ri-arrow-left-line" />
            </v-btn>
            <div>
                <h4 class="text-h4 font-weight-bold">Create Print Request</h4>
                <span class="text-subtitle-1 text-medium-emphasis">
                    Select pallets to generate QR codes for printing
                </span>
            </div>
        </div>

        <VCard class="mb-4">
            <VCardText>
                <!-- Search and Plant Filter -->
                <VRow>
                    <VCol cols="12" md="3">
                        <v-select
                            v-model="selectedPlant"
                            :items="plantsOption.length > 1 ? [{ title: 'All', value: null }, ...plantsOption] : plantsOption"
                            label="Filter by Plant"
                            density="compact"
                            hide-details
                            item-title="title"
                            item-value="value"
                        />
                    </VCol>
                    <VCol cols="12" md="9">
                        <VTextField
                            v-model="searchQuery"
                            label="Search Pallets"
                            placeholder="Search by physical ID, pallet code, or plant..."
                            append-inner-icon="ri-search-line"
                            density="compact"
                            hide-details
                            @update:model-value="handleSearchInput"
                        />
                    </VCol>
                </VRow>

                <!-- Selected Count -->
                <div v-if="selectedPallets.length > 0" class="mb-4 px-3 py-2 bg-grey-lighten-4 rounded">
                    <span class="font-weight-medium">
                        {{ selectedPallets.length }} pallet(s) selected
                    </span>
                    <v-btn
                        size="small"
                        variant="text"
                        color="error"
                        class="ml-2"
                        @click="selectedPallets = []"
                    >
                        Clear Selection
                    </v-btn>
                </div>

                <!-- Pallet Data Table -->
                <VDataTableServer
                    v-model="selectedPallets"
                    :headers="palletHeaders"
                    :items="pallets"
                    :items-length="totalPallets"
                    :loading="palletsLoading"
                    :items-per-page="itemsPerPage"
                    item-value="id"
                    show-select
                    return-object
                    @update:options="loadMorePallets"
                    class="text-no-wrap"
                    height="400"
                    fixed-header
                >
                    <template #item.name="{ item }">
                        <span class="font-weight-bold text-primary">
                            {{ item.name }}
                        </span>
                    </template>

                    <template #item.with_qr="{ item }">
                        <div class="d-flex justify-center align-center">
                            <i
                                v-if="item.with_qr"
                                style="font-size: 24px; color: green;"
                                class="ri-checkbox-circle-line"
                            ></i>
                            <i
                                v-else
                                style="font-size: 24px; color: #FF4C51;"
                                class="ri-close-circle-line"
                            ></i>
                        </div>
                    </template>
                </VDataTableServer>
            </VCardText>
        </VCard>

        <!-- Notes Section -->
        <VCard class="mb-4">
            <VCardText>
                <h5 class="text-h5 mb-3 font-weight-bold">Notes (Optional)</h5>
                <VTextarea
                    v-model="notes"
                    label="Add notes for this print request"
                    placeholder="e.g., Urgent print needed for warehouse section A"
                    density="compact"
                    hide-details
                    rows="3"
                    counter="1000"
                    :maxlength="1000"
                />
            </VCardText>
        </VCard>

        <!-- Action Buttons -->
        <div class="d-flex justify-end gap-3">
            <v-btn
                color="secondary"
                variant="outlined"
                @click="goBack"
                class="px-8"
            >
                Cancel
            </v-btn>
            <PrimaryButton
                @click="handleSubmit"
                :loading="submitLoading"
                :disabled="selectedPallets.length === 0"
                class="px-8"
                prepend-icon="ri-printer-line"
            >
                Create Print Request ({{ selectedPallets.length }} pallets)
            </PrimaryButton>
        </div>

        <Toast :show="toast.show" :color="toast.color" :message="toast.message" @update:show="toast.show = $event" />
    </div>
</template>
