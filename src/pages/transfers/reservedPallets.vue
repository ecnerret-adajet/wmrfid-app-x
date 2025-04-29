<script setup>
import DefaultModal from '@/components/DefaultModal.vue';
import { ref } from 'vue';

const props = defineProps({
    show: {
        type: Boolean,
        default: false
    },
    deliveryData: {
        type: Object,
        default: () => ({})
    }
});

const emit = defineEmits(['close']);

const handleClose = () => {
    emit('close');
};

const activeTab = ref('available');

// Sample data for Available Stocks
const availableStocks = ref([
    {
        batch_code: 'WGRCJD25',
        mfg_date: '2025-04-25',
        expiration_date: '2025-06-24',
        age: '3 DAY(S)',
        avail_qty: '2,280 BAG',
        avail_pallets: '55 PALLET',
        split_qty: '600 BAG(S)',
        min_pallet: '15 PALLET',
        min_qty: '600 BAG',
        selected: true
    }
]);

// Sample data for Other Stocks
const otherStocks = ref([
    {
        batch_code: 'WGRCJD26',
        mfg_date: '2025-04-26',
        expiration_date: '2025-06-25',
        age: '2 DAY(S)',
        avail_qty: '3,720 BAG',
        avail_pallets: '87 PALLET',
        split_qty: '0 BAG(S)',
        min_pallet: '0 PALLET',
        min_qty: '3480 BAG',
        selected: false
    }
]);
</script>

<template>
    <DefaultModal 
        :dialog-title="`${deliveryData?.delivery_document} - Reserved Pallets`" 
        :show="show" 
        @close="handleClose" 
        min-height="auto"
        class="position-absolute d-flex align-center justify-center" 
        :fullscreen="true"
    >
        <!-- Delivery Information Section -->
        <div class="delivery-info-section pa-4">
            <div class="d-flex flex-wrap">
                <div class="mr-8 mb-2">
                    <div><strong>ALC Delivery:</strong> {{ deliveryData?.delivery_document || '0080029054' }}</div>
                    <div><strong>BU Delivery:</strong> {{ deliveryData?.bu_delivery || '1080022633' }}</div>
                    <div class="mt-2">
                        <strong>Ship-to-Party:</strong> 
                        <div>{{ deliveryData?.ship_to_name || 'GRACIOUS MAJESTY DISTRIBUTION INC.' }}</div>
                        <div>{{ deliveryData?.ship_to_code || '0011004585' }}</div>
                    </div>
                    <div class="mt-2">
                        <strong>Ship-to-Address:</strong>
                        <div>{{ deliveryData?.ship_to_address || 'B6 L4 SOUTH SUSANA HOMES BACOOR 4102' }}</div>
                    </div>
                    <div class="mt-2">
                        <strong>Delivery Date:</strong> {{ deliveryData?.delivery_date || '2025-04-30' }}
                    </div>
                    <div class="mt-2">
                        <strong>Age:</strong> {{ deliveryData?.age || '1 - 60 Days' }}
                    </div>
                </div>
                <div>
                    <div><strong>Delivery Item No:</strong> {{ deliveryData?.item_no || '000010' }}</div>
                    <div><strong>Material:</strong> {{ deliveryData?.material || '1100000144' }}</div>
                    <div><strong>Material Description:</strong> {{ deliveryData?.material_desc || 'FL WAS Gold Flour C' }}</div>
                    <div class="mt-2">
                        <strong>Plant / Sloc:</strong>
                        <div>{{ deliveryData?.plant_name || '2111 - PFMC Mariveles (Flour) Plant' }}</div>
                        <div>{{ deliveryData?.storage_location || 'W107 - FG WAREHOUSE' }}</div>
                    </div>
                    <div class="mt-2">
                        <strong>Required Quantity:</strong> {{ deliveryData?.required_qty || '600 BAG' }}
                    </div>
                    <div class="mt-2">
                        <strong>Open Quantity:</strong> {{ deliveryData?.open_qty || '600 BAG' }}
                    </div>
                </div>
            </div>
        </div>

        <!-- Tabs Section -->
        <div class="tabs-section mt-4">
            <v-tabs v-model="activeTab" bg-color="#f0f0f0" class="mb-2">
                <v-tab value="available" class="text-primary" :class="{ 'active-tab': activeTab === 'available' }">
                    Available Stocks
                </v-tab>
                <v-tab value="other" class="text-primary" :class="{ 'active-tab': activeTab === 'other' }">
                    Other Stocks
                </v-tab>
            </v-tabs>

            <v-window v-model="activeTab">
                <!-- Available Stocks Tab -->
                <v-window-item value="available">
                    <v-table density="compact" class="stock-table">
                        <thead>
                            <tr>
                                <th>Batch Code</th>
                                <th>Mfg Date</th>
                                <th>Expiration Date</th>
                                <th>Age</th>
                                <th>Avail. Qty</th>
                                <th>Avail Pallets</th>
                                <th>Split Qty</th>
                                <th>Min. Pallet</th>
                                <th>Min. Qty</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(item, index) in availableStocks" :key="index" :class="{ 'selected-row': item.selected }">
                                <td>{{ item.batch_code }}</td>
                                <td>{{ item.mfg_date }}</td>
                                <td>{{ item.expiration_date }}</td>
                                <td>{{ item.age }}</td>
                                <td>{{ item.avail_qty }}</td>
                                <td>{{ item.avail_pallets }}</td>
                                <td>{{ item.split_qty }}</td>
                                <td>{{ item.min_pallet }}</td>
                                <td>{{ item.min_qty }}</td>
                                <td>
                                    <v-checkbox v-model="item.selected" hide-details density="compact"></v-checkbox>
                                </td>
                            </tr>
                        </tbody>
                    </v-table>
                </v-window-item>

                <!-- Other Stocks Tab -->
                <v-window-item value="other">
                    <v-table density="compact" class="stock-table">
                        <thead>
                            <tr>
                                <th>Batch Code</th>
                                <th>Mfg Date</th>
                                <th>Expiration Date</th>
                                <th>Age</th>
                                <th>Avail. Qty</th>
                                <th>Avail Pallets</th>
                                <th>Split Qty</th>
                                <th>Min. Pallet</th>
                                <th>Min. Qty</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(item, index) in otherStocks" :key="index" :class="{ 'selected-row': item.selected }">
                                <td>{{ item.batch_code }}</td>
                                <td>{{ item.mfg_date }}</td>
                                <td>{{ item.expiration_date }}</td>
                                <td>{{ item.age }}</td>
                                <td>{{ item.avail_qty }}</td>
                                <td>{{ item.avail_pallets }}</td>
                                <td>{{ item.split_qty }}</td>
                                <td>{{ item.min_pallet }}</td>
                                <td>{{ item.min_qty }}</td>
                                <td>
                                    <v-checkbox v-model="item.selected" hide-details density="compact"></v-checkbox>
                                </td>
                            </tr>
                        </tbody>
                    </v-table>
                </v-window-item>
            </v-window>
        </div>

        <!-- Action Buttons -->
        <div class="d-flex justify-end mt-4 pa-4">
            <v-btn variant="text" color="grey" class="mr-2" @click="handleClose">Back to Delivery Items</v-btn>
            <v-btn color="primary">Reserve Available Pallets</v-btn>
        </div>
    </DefaultModal>
</template>

<style scoped>
.active-tab {
    font-weight: bold;
    border-bottom: 2px solid #1976d2;
}

.stock-table {
    border: 1px solid #e0e0e0;
}

.selected-row {
    background-color: #e3f2fd;
}
</style>
