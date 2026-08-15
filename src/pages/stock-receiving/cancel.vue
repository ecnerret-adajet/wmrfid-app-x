<script setup>
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import Swal from 'sweetalert2';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const id = route.params.id;

const items = ref([]);
const stockTransfer = ref(null);
const movementType = ref(null);
const stockTransferMaterialDocument = ref([]);
const alcMaterialDocument = ref(null);
const pageLoading = ref(false);
const disableCancel = ref(false);

const toast = ref({
    message: '',
    color: 'success',
    show: false
});

const itemsPerPage = ref(15);

const headers = [
    { title: 'Line', key: 'line_id', align: 'center', sortable: false },
    { title: 'Material', key: 'material_code', sortable: false },
    { title: 'Entry Qty', key: 'qty', align: 'center', sortable: false },
    { title: 'Entry UOM', key: 'commercial_uom', align: 'center', sortable: false },
    { title: 'Batch', key: 'batch', align: 'center', sortable: false },
    { title: 'Production Date', key: 'production_date', align: 'center', sortable: false },
    { title: 'Plant', key: 'plant', sortable: false },
    { title: 'Storage Location', key: 'sloc', sortable: false },
    { title: 'Movement Type', key: 'movement_type', align: 'center', sortable: false },
    { title: 'Cancel Status', key: 'cancel', align: 'center', sortable: false },
];

const fetchDetails = async () => {
    pageLoading.value = true;
    try {
        const response = await ApiService.get('stock-transfer-receiving-cancellation', id);
        movementType.value = response.data.movement_type;
        stockTransfer.value = response.data.stock_transfer;
        stockTransferMaterialDocument.value = response.data.stock_transfer_material_document || [];
        alcMaterialDocument.value = response.data.alc_material_document;
        items.value = response.data.stock_transfer?.stock_transfer_items || [];
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

    disableCancel.value = true;
    try {
        const response = await ApiService.post('stock-transfer-receiving-cancel', { id });

        if (response.data.status === 'S') {
            toast.value = {
                message: 'Stock transfer receiving cancelled successfully.',
                color: 'success',
                show: true
            };
            await fetchDetails();
        } else {
            const errorMessage =
                response.data.errors?.[0]?.MESSAGE ||
                response.data.errors_917?.[0]?.MESSAGE ||
                'Failed to cancel stock transfer receiving.';
            toast.value = {
                message: errorMessage,
                color: 'error',
                show: true
            };
        }
    } catch (error) {
        console.error(error);
        toast.value = {
            message: 'Failed to cancel stock transfer receiving.',
            color: 'error',
            show: true
        };
    } finally {
        disableCancel.value = false;
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

                <!-- Event / Movement Type & Material Documents -->
                <div v-if="movementType || stockTransferMaterialDocument.length" class="px-4 mt-3">
                    <div v-if="movementType" class="text-body-1 font-weight-medium">
                        Movement Type: {{ movementType.code }} - {{ movementType.name }}
                    </div>
                    <div
                        v-for="(doc, i) in stockTransferMaterialDocument"
                        :key="i"
                        class="text-body-1 font-weight-medium"
                    >
                        {{ doc.stock_transfer_parent_id ? 'ALC' : 'BU' }} {{ doc.movement_type }} Material Document: {{ doc.material_document }}
                    </div>
                </div>

                <v-alert
                    v-if="alcMaterialDocument === 0"
                    type="error"
                    variant="tonal"
                    density="compact"
                    class="mx-4 mt-3"
                >
                    ALC is not yet posted. Please cancel this document and try again.
                </v-alert>

                <!-- General Info -->
                <v-card-text>
                    <v-row class="mt-4">
                        <v-col cols="12" md="6">
                            <v-text-field
                                label="Document Date"
                                :model-value="stockTransfer?.document_date || '-'"
                                variant="outlined"
                                readonly
                                density="compact"
                            />
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field
                                label="GR/GI Slip No."
                                :model-value="stockTransfer?.material_document || '-'"
                                variant="outlined"
                                readonly
                                density="compact"
                            />
                        </v-col>

                        <v-col cols="12" md="6">
                            <v-text-field
                                label="Posting Date"
                                :model-value="stockTransfer?.posting_date || '-'"
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
                            <span>{{ item.entry_quantity }}</span>
                        </template>

                        <template #item.commercial_uom="{ item }">
                            <span>{{ item.commercial_uom || item.entry_uom }}</span>
                        </template>

                        <template #item.production_date="{ item }">
                            <span>{{ item.manufacturing_date || '-' }}</span>
                        </template>

                        <template #item.plant="{ item }">
                            <span>{{ item.plant_code }} {{ item.plant_description }}</span>
                        </template>

                        <template #item.sloc="{ item }">
                            <span>{{ item.sloc_code }} {{ item.storage_location_description }}</span>
                        </template>

                        <template #item.cancel="{ item }">
                            <v-chip v-if="item.cancel" color="error" size="small" variant="tonal">
                                Cancelled
                            </v-chip>
                            <v-chip v-else color="success" size="small" variant="tonal">
                                Active
                            </v-chip>
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
