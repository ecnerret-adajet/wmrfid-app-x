<script setup>
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const id = route.params.id;

const header = ref(null);
const items = ref([]);
const materialDocuments = ref([]);
const stockTransfer = ref(null);
const pageLoading = ref(false);

const toast = ref({
    message: '',
    color: 'success',
    show: false
});

const itemsPerPage = ref(15);

const headers = [
    { title: 'Material', key: 'material_code', sortable: false },
    { title: 'Description', key: 'material_description', sortable: false },
    { title: 'Batch', key: 'batch', sortable: false },
    { title: 'Qty', key: 'qty', align: 'center', sortable: false },
    { title: 'UOM', key: 'commercial_uom', align: 'center', sortable: false },
    { title: 'Production Date', key: 'production_date', sortable: false },
    { title: 'Receiving Plant', key: 'plant', sortable: false },
    { title: 'Receiving SLoc', key: 'sloc', sortable: false },
];

const fetchDetails = async () => {
    pageLoading.value = true;
    try {
        const response = await ApiService.get('stock-transfer-receiving', id);
        header.value = response.data.header;
        items.value = response.data.items;
        materialDocuments.value = response.data.material_documents;
        stockTransfer.value = response.data.stock_transfer;
    } catch (error) {
        console.error(error);
        toast.value = {
            message: 'Failed to load stock transfer receiving details.',
            color: 'error',
            show: true
        };
    } finally {
        pageLoading.value = false;
    }
};

const removeLeadingZeros = (value) => {
    if (!value) return '';
    return String(value).replace(/^0+/, '');
};

onMounted(() => {
    fetchDetails();
});
</script>

<template>
    <div>
        <!-- Header Card -->
        <v-card>
            <v-card-title>
                <div class="d-flex justify-space-between align-center px-4 mt-4">
                    <h4 class="text-h4 font-weight-black text-primary">Stock Transfer Receiving Details</h4>
                    <v-btn
                        color="secondary"
                        variant="outlined"
                        size="small"
                        @click="router.push({ name: 'stock-receiving' })"
                    >
                        Back to List
                    </v-btn>
                </div>

                <!-- Material Documents -->
                <div v-if="header?.status === 'Received' && materialDocuments.length" class="px-4 mt-3">
                    <v-alert
                        v-for="(doc, i) in materialDocuments"
                        :key="i"
                        type="info"
                        variant="tonal"
                        density="compact"
                        class="mb-1"
                    >
                        {{ doc.is_alc ? 'ALC' : 'BU' }} {{ doc.movement_type }} Material Document: {{ doc.material_document }}
                    </v-alert>
                </div>

                <!-- General Info -->
                <v-card-text>
                    <v-row class="mt-4">
                        <v-col cols="12" md="4">
                            <v-text-field
                                label="Posting Date"
                                :model-value="header?.posting_date || '-'"
                                variant="outlined"
                                readonly
                                density="compact"
                            />
                        </v-col>
                        <v-col cols="12" md="4">
                            <v-text-field
                                label="Material Document"
                                :model-value="header?.material_document || '-'"
                                variant="outlined"
                                readonly
                                density="compact"
                            />
                        </v-col>
                        <v-col cols="12" md="4">
                            <v-text-field
                                label="Material Doc. Year"
                                :model-value="header?.year || '-'"
                                variant="outlined"
                                readonly
                                density="compact"
                            />
                        </v-col>

                        <v-col cols="12" md="4">
                            <v-text-field
                                label="Status"
                                variant="outlined"
                                readonly
                                density="compact"
                            >
                                <template #default>
                                    <v-chip
                                        v-if="header?.status === 'Received'"
                                        size="small"
                                        color="success"
                                        text-color="white"
                                    >
                                        Received
                                    </v-chip>
                                    <v-chip
                                        v-else-if="header?.status === 'Reversed'"
                                        size="small"
                                        color="error"
                                        text-color="white"
                                    >
                                        Reversed
                                    </v-chip>
                                    <v-chip
                                        v-else
                                        size="small"
                                        color="warning"
                                        text-color="white"
                                    >
                                        For Receiving
                                    </v-chip>
                                </template>
                            </v-text-field>
                        </v-col>

                        <v-col cols="12" md="4">
                            <v-text-field
                                label="Issuing Plant"
                                :model-value="header?.stock_transfer_313_sap_downloads?.[0]
                                    ? `${header.stock_transfer_313_sap_downloads[0].plant} ${header.stock_transfer_313_sap_downloads[0].plant_detail?.name || ''}`
                                    : '-'"
                                variant="outlined"
                                readonly
                                density="compact"
                            />
                        </v-col>
                        <v-col cols="12" md="4">
                            <v-text-field
                                label="Receiving SLoc"
                                :model-value="header?.stock_transfer_313_sap_downloads?.[0]?.sloc || '-'"
                                variant="outlined"
                                readonly
                                density="compact"
                            />
                        </v-col>
                    </v-row>
                </v-card-text>
            </v-card-title>
        </v-card>

        <!-- Details Table -->
        <v-card class="mt-2">
            <v-card-text class="mx-2">
                <div class="mt-2">
                    <VDataTable
                        v-model:items-per-page="itemsPerPage"
                        :headers="headers"
                        :items="items"
                        :loading="pageLoading"
                        item-value="id"
                        class="text-no-wrap"
                    >
                        <template #item.material_code="{ item }">
                            <span class="font-weight-bold">{{ removeLeadingZeros(item.material_code) }}</span>
                        </template>

                        <template #item.qty="{ item }">
                            <span>{{ item.qty }}</span>
                        </template>

                        <template #item.commercial_uom="{ item }">
                            <span>{{ item.commercial_uom || item.uom }}</span>
                        </template>

                        <template #item.plant="{ item }">
                            <span>{{ item.plant }} {{ item.plant_description }}</span>
                        </template>

                        <template #item.sloc="{ item }">
                            <span>{{ item.sloc }}</span>
                        </template>
                    </VDataTable>
                </div>
            </v-card-text>
        </v-card>

        <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event" />
    </div>
</template>
