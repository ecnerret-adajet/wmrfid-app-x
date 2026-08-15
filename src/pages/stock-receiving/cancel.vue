<script setup>
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import Swal from 'sweetalert2';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const id = route.params.id;

const header = ref(null);
const items = ref([]);
const stockTransfer = ref(null);
const pageLoading = ref(false);
const disableCancel = ref(false);

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
        const response = await ApiService.get('stock-transfer-receiving-cancellation', id);
        header.value = response.data.header;
        items.value = response.data.items;
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

const cancelReceiving = async () => {
    const confirm = await Swal.fire({
        title: 'Are you sure?',
        text: 'You want to cancel this document?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes',
    });

    if (!confirm.isConfirmed) return;

    // TODO: wire up the actual cancellation endpoint once the backend route is finalized.
    disableCancel.value = true;
    console.log('TODO: submit cancellation for stock transfer receiving', id, items.value);
    disableCancel.value = false;

    toast.value = {
        message: 'Cancellation endpoint is not implemented yet.',
        color: 'warning',
        show: true
    };
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
                    <h4 class="text-h4 font-weight-black text-primary">Stock Transfer Receiving Cancellation</h4>
                    <v-btn
                        color="secondary"
                        variant="outlined"
                        size="small"
                        @click="router.push({ name: 'stock-receiving' })"
                    >
                        Back to List
                    </v-btn>
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
                                readonly
                                density="compact"
                            />
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field
                                label="Doc. Header Text"
                                :model-value="stockTransfer?.document_header_text || '-'"
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

        <!-- Cancel Action -->
        <v-card class="mt-2">
            <v-card-text class="d-flex justify-end gap-2">
                <v-btn
                    color="error"
                    size="small"
                    :loading="disableCancel"
                    :disabled="disableCancel || !items.length"
                    @click="cancelReceiving"
                >
                    Cancel Item
                </v-btn>
                <v-btn
                    color="secondary"
                    variant="outlined"
                    size="small"
                    @click="router.push({ name: 'stock-receiving' })"
                >
                    Back
                </v-btn>
            </v-card-text>
        </v-card>

        <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event" />
    </div>
</template>
