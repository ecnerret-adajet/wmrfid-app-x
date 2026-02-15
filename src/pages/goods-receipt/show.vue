<script setup>
import DefaultModal from '@/components/DefaultModal.vue';
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';


import PalletAssignModal from '@/components/PalletAssignModal.vue';

const route = useRoute();
const router = useRouter();
const goodsReceiptData = ref(null); // Renamed from shipmentData
const pageLoading = ref(false);
const id = route.params.id; // Get the ID from URL

// 14
// Delivery table variables - kept structure
// Delivery table variables - kept structure
const serverItems = ref([]);
const loading = ref(false); // Default to false since we aren't loading yet
const itemsPerPage = ref(10);
const deliveryItemsModalOpen = ref(false);
const selectedDelivery = ref(null);
const searchValue = ref('');

const palletModalOpen = ref(false);
const selectedItemForPallet = ref(null);

const headers = [
    { title: 'Line', key: 'MATDOC_ITM' },
    { title: 'Material', key: 'MATERIAL' },
    { title: 'Purchase Order', key: 'PO_NUMBER' },
    { title: 'Item', key: 'PO_ITEM' },
    { title: 'Ref. Doc.', key: 'REF_DOC_NO' },
    { title: 'Quantity', key: 'ENTRY_QNT' },
    { title: 'Base Unit', key: 'ENTRY_UOM' },
    { title: 'Text', key: 'ITEM_TEXT' },
    { title: 'Plant', key: 'PLANT' },
    { title: 'Storage Location', key: 'STGE_LOC' },
    { title: 'Batch', key: 'BATCH' },
    { title: 'Movement Type', key: 'MOVE_TYPE' },
    { title: 'Actions', key: 'actions', sortable: false },
]

const toast = ref({
    message: '',
    color: 'success',
    show: false
});

const formatNumber = (value) => {
    if (!value) return '0';
    return new Intl.NumberFormat('en-US').format(value);
};

const openPalletModal = (item) => {
    selectedItemForPallet.value = item;
    palletModalOpen.value = true;
};

const closePalletModal = () => {
    palletModalOpen.value = false;
    selectedItemForPallet.value = null;
};

const savePalletAssignment = async ({ pallets, block_id, storage_location_id }) => {
    if (!selectedItemForPallet.value) return;

    // Construct Payload
    const payload = {
        pallets: pallets.map(p => ({ id: p.id })),
        material_code: parseInt(selectedItemForPallet.value.MATERIAL),
        batch: selectedItemForPallet.value.BATCH,
        quantity: parseFloat(selectedItemForPallet.value.ENTRY_QNT),
        storage_location_id: storage_location_id,
        block_id: block_id
    };
    
    try {
        await ApiService.post('/stock-transfers/assign-pallets', payload);

        toast.value = {
            message: 'Pallets assigned successfully',
            color: 'success',
            show: true
        };
        closePalletModal();
        await fetchStockTransferDetails(); // Refresh to update UI if necessary
    } catch (error) {
        console.error(error);
        toast.value = {
            message: error.response?.data?.message || 'Failed to assign pallets',
            color: 'error',
            show: true
        };
    }
};

const fetchStockTransferDetails = async () => {
    pageLoading.value = true;
    try {
        const response = await ApiService.get('stock-transfers', id);
        goodsReceiptData.value = response.data.header;
        serverItems.value = response.data.items;
    } catch (error) {
        console.error(error);
        toast.value = {
            message: 'Failed to fetch details',
            color: 'error',
            show: true
        };
    } finally {
        pageLoading.value = false;
    }
}

onMounted(async () => {
    await fetchStockTransferDetails();
});

const handleViewDelivery = (item) => {
    // selectedDelivery.value = item
    // deliveryItemsModalOpen.value = true;
}

const closeModal = () => {
    deliveryItemsModalOpen.value = false;
}

</script>

<template>
  
    <div>
        <v-card>
            <v-card-title>
                <div class="d-flex justify-space-between align-center px-4 mt-4">
                    <h4 class="text-h4 font-weight-black text-primary">Good Receipt Details</h4>
                </div>
                
                <v-card-text>
                    <v-row class="mt-4">
                        <v-col cols="12" md="4">
                             <v-text-field
                                label="Material Document"
                                :model-value="goodsReceiptData?.MAT_DOC || '4901390545'"
                                variant="outlined"
                                readonly
                                density="compact"
                            ></v-text-field>
                        </v-col>
                        <v-col cols="12" md="4">
                             <v-text-field
                                label="Entry Date"
                                :model-value="goodsReceiptData?.ENTRY_DATE || '2026-02-13'"
                                variant="outlined"
                                readonly
                                density="compact"
                            ></v-text-field>
                        </v-col>
                        <v-col cols="12" md="4">
                             <v-text-field
                                label="Document Date"
                                :model-value="goodsReceiptData?.DOC_DATE || '2026-02-13'"
                                variant="outlined"
                                readonly
                                density="compact"
                            ></v-text-field>
                        </v-col>

                        <v-col cols="12" md="4">
                             <v-text-field
                                label="Posting Date"
                                :model-value="goodsReceiptData?.PSTNG_DATE || '2026-02-13'"
                                variant="outlined"
                                readonly
                                density="compact"
                            ></v-text-field>
                        </v-col>
                        <v-col cols="12" md="4">
                             <v-text-field
                                label="Header Text"
                                :model-value="goodsReceiptData?.HEADER_TXT || 'transfer to w118'"
                                variant="outlined"
                                readonly
                                density="compact"
                            ></v-text-field>
                        </v-col>
                        <v-col cols="12" md="4">
                             <v-text-field
                                label="GR/GI Slip No."
                                :model-value="goodsReceiptData?.VER_GR_GI_SLIP || '02/13/2026'"
                                variant="outlined"
                                readonly
                                density="compact"
                            ></v-text-field>
                        </v-col>

                        <v-col cols="12" md="4">
                             <v-text-field
                                label="Vendor"
                                :model-value="goodsReceiptData?.vendor || ''"
                                variant="outlined"
                                readonly
                                density="compact"
                            ></v-text-field>
                        </v-col>
                        <v-col cols="12" md="4">
                             <v-text-field
                                label="Username"
                                :model-value="goodsReceiptData?.USERNAME || 'APP_USER'"
                                variant="outlined"
                                readonly
                                density="compact"
                            ></v-text-field>
                        </v-col>
                    </v-row>
                </v-card-text>
            </v-card-title>
        </v-card>
        <div >
            <v-card class="mt-2">
                <v-card-text class="mx-2">
                    <div class="mt-2">
                        <VDataTable
                            v-model:items-per-page="itemsPerPage"
                            :headers="headers"
                            :items="serverItems"
                            :loading="pageLoading"
                            item-value="id"
                            :search="searchValue"
                            class="text-no-wrap"
                        >

                            <template #item="{ item }">
                                <tr @click="handleViewDelivery(item)" class="clickable-row">
                                    <td>{{ item.MATDOC_ITM || '0001' }}</td>
                                    <td>{{ item.MATERIAL || '510000195' }}</td>
                                    <td>{{ item.PO_NUMBER }}</td>
                                    <td>{{ item.PO_ITEM }}</td>
                                    <td>{{ item.REF_DOC_NO }}</td>
                                    <td>{{ formatNumber(item.ENTRY_QNT) }}</td>
                                    <td>{{ item.ENTRY_UOM }}</td>
                                    <td>{{ item.ITEM_TEXT }}</td>
                                    <td>{{ item.PLANT || '2115' }}</td>
                                    <td>{{ item.STGE_LOC || 'W105' }}</td>
                                    <td>{{ item.BATCH }}</td>
                                    <td>{{ item.MOVE_TYPE || '313' }}</td>
                                    <td>
                                        <v-btn
                                            v-if="item.ENTRY_QNT > 0"
                                            color="primary"
                                            size="small"
                                            @click.stop="openPalletModal(item)"
                                        >
                                            Add Pallet
                                        </v-btn>
                                    </td>
                                </tr>
                            </template>

                        </VDataTable>
                    </div>
                </v-card-text>
            </v-card>
        </div>

    </div>
    <DefaultModal :dialog-title="'Item Details'" :show="deliveryItemsModalOpen" @close="closeModal">
        <!-- Content for modal if needed -->
    </DefaultModal>

    <PalletAssignModal 
        :show="palletModalOpen" 
        :item="selectedItemForPallet"
        @close="closePalletModal"
        @save="savePalletAssignment"
    />

<Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event" />
</template>

<style scoped>

.clickable-row {
    cursor: pointer;
    transition: background-color 0.2s ease-in-out;
}

.clickable-row:hover {
    background-color: rgba(173,215,192, 0.3); 
}
</style>
