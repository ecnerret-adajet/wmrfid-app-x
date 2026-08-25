<script setup>
import Toast from '@/components/Toast.vue';
import { useAuthorization } from '@/composables/useAuthorization';
import ApiService from '@/services/ApiService';
import Swal from 'sweetalert2';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const id = route.params.id;

const { authUserCan } = useAuthorization();

const header = ref(null);
const items = ref([]);
const materialDocuments = ref([]);
const stockTransfer = ref(null);
const movementType = ref(null);
const stockTransferMaterialDocument = ref([]);
const alcStockTransfer = ref([]);
const pageLoading = ref(false);
const postResult = ref(null);
const disablePost = ref(false);
const documentHeaderText = ref('');

const toast = ref({
    message: '',
    color: 'success',
    show: false
});

const itemsPerPage = ref(15);

const headers = [
    { title: 'Material', key: 'material_code', sortable: false },
    { title: 'Entry Qty', key: 'qty', align: 'center', sortable: false },
    { title: 'Entry UOM', key: 'commercial_uom', align: 'center', sortable: false },
    { title: 'Batch', key: 'batch', align: 'center', sortable: false },
    { title: 'Production Date', key: 'production_date', align: 'center', sortable: false },
    { title: 'Receiving Plant', key: 'plant', sortable: false },
    { title: 'Receiving Storage Location', key: 'sloc', sortable: false },
];

const fetchDetails = async () => {
    pageLoading.value = true;
    try {
        const response = await ApiService.get('stock-transfer-receiving', id);
        header.value = response.data.header;
        items.value = response.data.items;
        stockTransfer.value = response.data.stock_transfer;
        movementType.value = response.data.movement_type;
        stockTransferMaterialDocument.value = response.data.stock_transfer_material_document;
        alcStockTransfer.value = response.data.alc_stock_transfer;

        // Set document header text from stock transfer if exists
        if (stockTransfer.value) {
            documentHeaderText.value = stockTransfer.value.document_header_text || '';
        }
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

const postStockTransferReceiving = async (method) => {
    disablePost.value = true;
    try {
        const payload = {
            method: method,
            stock_transfer_receiving_id: id,
            posting_date: header.value?.posting_date,
            document_date: header.value?.posting_date,
            gr_gi_slip_number: header.value?.material_document,
            document_header_text: documentHeaderText.value,
            ref_doc_number: '',
            items: items.value.map(item => ({
                material_code: item.material_code,
                batch: item.batch,
                entry_qty: item.qty,
                entry_uom: item.uom,
                commercial_uom: item.commercial_uom,
                plant: item.plant,
                sloc: item.sloc,
                production_date: item.production_date,
            })),
            sap_server: stockTransfer.value?.sap_server || header.value?.sap_server,
        };

        const { data } = await ApiService.post('stock-transfer-receiving-post', payload);
        postResult.value = data;

        if (data.status === 'S') {
            const label = method === 'simulate' ? 'Simulated' : 'Posted';
            await Swal.fire({
                text: `Stock Transfer Successfully ${label}`,
                icon: 'success',
                confirmButtonText: 'Ok, got it!',
                customClass: { confirmButton: 'btn btn-primary' },
            });
            if (method === 'post') {
                router.push({ name: 'stock-receiving' });
            }
        } else if (data.status === 'R') {
            await Swal.fire({
                text: 'Material Document is already reversed. You cannot process this document.',
                icon: 'error',
                confirmButtonText: 'Ok, got it!',
                customClass: { confirmButton: 'btn btn-primary' },
            });
        } else {
            await Swal.fire({
                text: 'Error encountered during processing',
                icon: 'error',
                confirmButtonText: 'Ok, got it!',
                customClass: { confirmButton: 'btn btn-primary' },
            });
        }
    } catch (error) {
        console.error(error);
        await Swal.fire({
            text: error.response?.data?.message || 'Failed to process stock transfer receiving.',
            icon: 'error',
            confirmButtonText: 'Ok, got it!',
            customClass: { confirmButton: 'btn btn-primary' },
        });
    } finally {
        disablePost.value = false;
    }
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
                <div v-if="stockTransfer && header?.status === 'Received' && stockTransferMaterialDocument.length" class="px-4 mt-3">
                    <h4 v-for="(doc, i) in stockTransferMaterialDocument" :key="i" class="mb-1">
                        {{ doc.stock_transfer_parent_id ? 'ALC' : 'BU' }} {{ doc.movement_type }} Material Document: {{ doc.material_document }}
                    </h4>
                </div>

                <!-- General Info -->
                <v-card-text>
                    <v-row class="mt-4">
                        <v-col cols="12" md="6">
                            <v-text-field
                                label="Document Date"
                                :model-value="stockTransfer?.document_date || header?.posting_date || '-'"
                                variant="outlined"
                                readonly
                                density="compact"
                            />
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field
                                label="GR/GI Slip No."
                                :model-value="header?.material_document || '-'"
                                variant="outlined"
                                readonly
                                density="compact"
                            />
                        </v-col>

                        <v-col cols="12" md="6">
                            <v-text-field
                                label="Posting Date"
                                :model-value="stockTransfer?.posting_date || header?.posting_date || '-'"
                                variant="outlined"
                                :readonly="!!header?.status"
                                density="compact"
                            />
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="documentHeaderText"
                                label="Doc. Header Text"
                                variant="outlined"
                                density="compact"
                                maxlength="25"
                                :disabled="!!stockTransfer"
                                hint="Max 25 characters"
                                persistent-hint
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
                            <div>
                                <span class="font-weight-bold">{{ removeLeadingZeros(item.material_code) }}</span>
                                <br />
                                <span class="text-caption">{{ item.material_description }}</span>
                            </div>
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
                            <span>{{ item.sloc }} {{ item.sloc_description }}</span>
                        </template>
                    </VDataTable>
                </div>
            </v-card-text>
        </v-card>

        <!-- Simulate / Post Actions -->
        <!-- <v-card v-if="authUserCan('receive.stock_transfer_receiving')" class="mt-2"> -->
        <v-card class="mt-2">
            <v-card-text class="d-flex justify-end gap-2">
                <template v-if="stockTransfer">
                    <template v-if="!header?.status">
                        <v-btn
                            color="primary"
                            size="small"
                            :loading="disablePost"
                            :disabled="disablePost"
                            @click="postStockTransferReceiving('simulate')"
                        >
                            Simulate
                        </v-btn>
                        <v-btn
                            v-if="postResult?.status === 'S'"
                            color="success"
                            size="small"
                            :loading="disablePost"
                            :disabled="disablePost"
                            @click="postStockTransferReceiving('post')"
                        >
                            Post
                        </v-btn>
                        <v-btn
                            color="secondary"
                            variant="outlined"
                            size="small"
                            @click="router.push({ name: 'stock-receiving' })"
                        >
                            Cancel
                        </v-btn>
                    </template>
                </template>
                <template v-else>
                    <v-btn
                        color="primary"
                        size="small"
                        :loading="disablePost"
                        :disabled="disablePost"
                        @click="postStockTransferReceiving('simulate')"
                    >
                        Simulate
                    </v-btn>
                    <v-btn
                        v-if="postResult?.status === 'S'"
                        color="success"
                        size="small"
                        :loading="disablePost"
                        :disabled="disablePost"
                        @click="postStockTransferReceiving('post')"
                    >
                        Post
                    </v-btn>
                    <v-btn
                        color="secondary"
                        variant="outlined"
                        size="small"
                        @click="router.push({ name: 'stock-receiving' })"
                    >
                        Cancel
                    </v-btn>
                </template>
            </v-card-text>
        </v-card>

        <!-- Error Messages -->
        <v-alert
            v-if="postResult?.returns?.length"
            type="error"
            variant="tonal"
            density="compact"
            class="mt-2"
        >
            <ul class="mb-0">
                <li v-for="(error, e) in postResult.returns" :key="e">{{ error.MESSAGE }}</li>
            </ul>
        </v-alert>

        <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event" />
    </div>
</template>
