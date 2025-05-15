<script setup>
import Toast from '@/components/Toast.vue';
import { numberWithComma } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import JwtService from '@/services/JwtService';
import axios from 'axios';
import moment from 'moment';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { VDataTableServer } from 'vuetify/components';
import HeaderDetails from './headerDetails.vue';
const emits = defineEmits(['pagination-changed']);

const props = defineProps({
    search: {
        type: String,
        default: ''
    },
});

const router = useRouter();

const isLoading = ref(false);
const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref('-created_at'); // Default sort
const filters = ref(null);
const showReservePallets = ref(false);
const transferData = ref([]);
const activeTab = ref('available_stocks');
const availableStocks = ref([])

const headers = [
    {
        title: '',
        key: 'action',
        align: 'center',
        sortable: false,
    },
    {
        title: 'Status',
        key: 'overall_status',
    },
    {
        title: 'Transport No.',
        key: 'transport_number',
    },
    {
        title: 'PO Number',
        key: 'po_number',
    },
    {
        title: 'Plate Number',
        key: 'plate_number',
        align: 'center',
        sortable: false,
    },
    {
        title: 'Driver Name',
        key: 'driver_name',
        sortable: false,
    },
    {
        title: 'Vendor Name',
        key: 'vendor_name',
    },
    {
        title: 'Transport Qty',
        key: 'transport_qty',
    },
    {
        title: 'Check In',
        key: 'check_in',
    },
    {
        title: 'Load Start',
        key: 'loadstart',
    },
    {
        title: 'Load End',
        key: 'loadend',
    },
    {
        title: 'Issuing',
        key: 'issuing',
    },
    {
        title: 'Receiving',
        key: 'receiving',
    },
]

const loadItems = ({ page, itemsPerPage, sortBy, search }) => {
    
    loading.value = true
    if (sortBy && sortBy.length > 0) {
        const sort = sortBy[0];  // Assuming single sort field
        sortQuery.value = `${sort.key}`;  // Default ascending order
        if (sort.order === 'desc') {
            sortQuery.value = `-${sort.key}`;  // Prefix with minus for descending order
        }
    } else {
        sortQuery.value = '-created_at';
    }

    ApiService.query('datatable/transfer-orders-outbound',{
        params: {
            page,
            itemsPerPage,
            sort: sortQuery.value,
            search: props.search,
            filters: filters.value
        }
        })
        .then((response) => {
            totalItems.value = response.data.total;
            serverItems.value = response.data.data
            console.log(serverItems.value);
            loading.value = false

            emits('pagination-changed', { page, itemsPerPage, sortBy: sortQuery.value, search: props.search });
        })
        .catch((error) => {
            console.log(error);
        });
}

const toast = ref({
    message: 'Toast message!',
    color: 'success',
    show: false
});

const applyFilters = (data) => {
    filters.value = data;
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{key: 'created_at', order: 'desc'}],
        search: props.search
    });
}

const actionList = [
    { title: 'Reserve Pallet', key: 'reserve_pallet' },
]

const handleAction = (data, action) => {
    transferData.value = data;
    if(action.key == 'reserve_pallet') {
        fetchAvailableCommodities(transferData.value?.purchase_order_items[0] ?? null)
        fetchOpenQuantity()
        showReservePallets.value = true;
    }
}

const closeModal = () => {
    // showStocks.value = false
    availableStocks.value = []
    // otherStocks.value = []
    showReservePallets.value = false
}

const fetchOpenQuantity = async() => {
    let purchaseOrderItem = transferData.value?.purchase_order_items[0];
    const transferQuantity = transferData.value?.transport_load?.qty || 0;
    const token = JwtService.getToken();
    return axios.post(`transfer-orders/get-open-quantity`, {
        po_number: purchaseOrderItem?.po_number,
        po_item: purchaseOrderItem?.po_item,
        transfer_quantity: transferQuantity,
    }, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(({ data }) => {
        transferData.value.open_quantity = data;
        return data;
    })
    .catch(({ response }) => {
        this.form.errors = response.data.errors;
    });
}

const fetchAvailableCommodities = (purchase_order_item) => {
    if (purchase_order_item) {
        isLoading.value = true;
        const transferQuantity = transferData.value?.transport_load?.qty || 0;

        const payload = {
            ...purchase_order_item,
            transfer_quantity: transferQuantity, 
        };

        const token = JwtService.getToken();
        return axios.post(`transfer-orders/get-available-commodities-sap`, payload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(({ data }) => {
            console.log(data);
            availableStocks.value = data;
            let remainingRequiredQty = parseInt(purchase_order_item.delivery_quantity) || 0;
            let splitQty = params.default_pallet_quantity || 40; // fallback to 40 

            // availableStocks.value = data.map((item, index) => {
            //     console.log(item);
                
            //     if (item.is_selected) {
            //         const split_qty = remainingRequiredQty < splitQty ? remainingRequiredQty : splitQty;
                    
            //         if (remainingRequiredQty >= splitQty) {
            //             remainingRequiredQty -= splitQty;
            //         }

            //         return {
            //             ...item,
            //             split_qty,
            //         };
            //     }

            //     return {
            //         ...item,
            //         split_qty: 0,
            //     };
            // });
            
        })
        .catch(({ response }) => {
        }).finally(() => {
            isLoading.value = false;
        });
    }
}

const expirationChecking = (date) => {
    const currentDate = moment();
    const comparisonDate = moment(date).format('YYYY-MM-DD');
    return currentDate.isAfter(comparisonDate);
};

const otherStocks = ref([]); // Prepared implem

const selectedAvailableBatches = computed(() => {
    return availableStocks.value.filter(item => item.is_selected);
});

const selectedOtherBatches = computed(() => {
    return otherStocks.value.filter(item => item.is_selected);
});

const reserveLoading = ref(false);
const reservePallets = async () => {
    try {
        reserveLoading.value = true;
        let purchaseOrderItem = transferData.value?.purchase_order_items[0];
        const transferQuantity = transferData.value?.transport_load?.qty || 0;

        let formData = new FormData();
        // formData.append('material_name', this.po_item_details?.material_description);
        formData.append('material_code', purchaseOrderItem?.material_code);
        formData.append('po_number', purchaseOrderItem?.po_number);
        formData.append('po_item', purchaseOrderItem?.po_item);
        formData.append('transfer_quantity', transferQuantity);
        // formData.append('numerator', this.po_item_details?.numerator);
        formData.append('denominator', purchaseOrderItem?.denominator);
        formData.append('issuing_sloc_sto', purchaseOrderItem?.issuing_sloc_sto);
        formData.append('plant', purchaseOrderItem?.supplying_plant);
        formData.append('uom', purchaseOrderItem?.uom);
        formData.append('item_category', purchaseOrderItem?.item_category);
        // formData.append('stock_exception', stock_exception);

        const selectedBatches = activeTab.value === 'available_stocks'
            ? selectedAvailableBatches.value
            : selectedOtherBatches.value;

        formData.append(`batches`, JSON.stringify(selectedBatches));

        const token = JwtService.getToken();
        const { data } = await axios.post(
            `transfer-orders/transfer-order-proposed`,
            formData,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            }
        );

        console.log(data);
        
        if (!data.success) {
            console.log(data.errors)
            // Handle validation errors
            // const errorMsg = data.errors?.customer_approval_document?.[0] 
            const batchPickError = data.errors?.length > 0 ? data.errors?.[0] : null
            
            if (batchPickError) {
                toast.value.color = 'error';
                toast.value.message = batchPickError;
                toast.value.show = true;
                // loadItems({
                //     page: page.value,
                //     itemsPerPage: itemsPerPage.value,
                //     sortBy: [{key: 'created_at', order: 'desc'}],
                //     search: props.search
                // });
                closeModal()
            }

            return;
        } 

        // Proceed normally if successful
        if (data.success) {
            toast.value.color = 'success';
            toast.value.message = "Successfully reserved";
            toast.value.show = true;
            loadItems({
                page: page.value,
                itemsPerPage: itemsPerPage.value,
                sortBy: [{key: 'created_at', order: 'desc'}],
                search: props.search
            });
            closeModal()
        }
        
    } catch (response) {
        console.log(response);
    } finally {
        reserveLoading.value = false;
    }
}

defineExpose({
    loadItems,
    applyFilters
})
</script>

<template>

    <VDataTableServer
        v-model:items-per-page="itemsPerPage"
        :headers="headers"
        :items="serverItems"
        :items-length="totalItems"
        :loading="loading"
        item-value="id"
        :search="search"
        @update:options="loadItems"
        class="text-no-wrap"
    >

    <template #item.overall_status="{ item }">
        {{ item.transport_tracking.overall_status }}
    </template>

    <template #item.po_number="{ item }">
        {{ item.purchase_order.po_number }}
    </template>
    
    <template #item.plate_number="{ item }">
        {{ item.transport_tracking.plate_number }}
    </template> 
    
    <template #item.driver_name="{ item }">
        {{ item.transport_tracking.driver_name }}
    </template>
    
    <template #item.vendor_name="{ item }">
        {{ item.transport_tracking.vendor_name }}
    </template>
    
    <template #item.check_in="{ item }">
        {{ item.transport_tracking?.check_in ? moment(item.transport_tracking?.check_in).format('MMM D, YYYY h:mm A') : '' }}
    </template>
    
    <template #item.transport_qty="{ item }">
        {{ item.transport_load.qty }}
    </template>
    
    <template #item.loadstart="{ item }">
        {{ item.transport_tracking?.loadstart ? moment(item.transport_tracking?.loadstart).format('MMM D, YYYY h:mm A') : '' }}
    </template>
    
    <template #item.loadend="{ item }">
        {{ item.transport_tracking?.loadend ? moment(item.transport_tracking?.loadend).format('MMM D, YYYY h:mm A') : '' }}
    </template>
    
    <template #item.issuing="{ item }">
        <div class="d-flex flex-column py-3">
            <span>{{ item.purchase_order.plant?.name }}</span>
            <span class="font-weight-bold">{{ item.purchase_order.plant?.plant_code }}</span>
        </div>
    </template>
    
    <template #item.receiving="{ item }">
        <div class="d-flex flex-column py-3">
            <span>{{ item.purchase_order.receiving_plant?.name }}</span>
            <span class="font-weight-bold">{{ item.purchase_order.receiving_plant?.plant_code }}</span>
        </div>
    </template>

    <!-- Actions -->
    <template #item.action="{ item }">
        <div class="d-flex justify-center gap-1">
            <v-menu location="end"> 
                <template v-slot:activator="{ props }">
                    <v-btn icon="ri-more-2-line" variant="text" v-bind="props" color="grey"></v-btn>
                </template>
                <v-list>
                <v-list-item
                    @click="handleAction(item, action)"
                    v-for="(action, i) in actionList"
                        :key="i"
                        :value="i"
                    >
                    <v-list-item-title>{{ action.title }}</v-list-item-title>
                </v-list-item>
                </v-list>
            </v-menu>
        </div>
    </template>
    </VDataTableServer>

    <!-- Delivery items modal -->
    <v-dialog v-model="showReservePallets" max-width="1500px">
        <v-card elevation="2">
            <v-card-title class="d-flex justify-space-between align-center mx-4 px-4 mt-6">
                <div class="text-h4 font-weight-bold ps-2 text-primary">
                    Stock Transfer Order - Batch Picking
                </div>
                <v-btn
                    icon="ri-close-line"
                    variant="text"
                    @click="closeModal"
                ></v-btn>
                
            </v-card-title>
            <v-card-text>
                <v-skeleton-loader v-if="!transferData" type="article"></v-skeleton-loader>
                <div v-else>
                    <HeaderDetails :transfer-order-data="transferData" />
                </div>

                <v-divider class="my-4 mx-5"></v-divider>
          
                <v-card-text>
                    <!-- <v-skeleton-loader v-if="deliveryOrder.filter.loading_available_stocks" type="article"></v-skeleton-loader> -->
                    <div>
                        <!-- TODO:: Update condition  -->
                        <div v-if="true === true">
                            <v-tabs v-model="activeTab" bg-color="transparent" variant="tonal" class="custom-tabs">
                                <v-tab value="available_stocks" class="text-h5">
                                    Available Stocks
                                </v-tab>
                                <!-- <v-tab value="other_stocks" class="text-h5">
                                    Other Stocks
                                </v-tab> -->
                            </v-tabs>

                            <v-skeleton-loader  v-if="isLoading" type="article"></v-skeleton-loader>
                            <v-tabs-window v-else v-model="activeTab" class="mt-4" >
                                <v-tabs-window-item value="available_stocks">
                                    <v-table density="compact" class="stock-table elevation-0">
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
                                            <tr v-for="(item, index) in availableStocks" :key="index" 
                                                :class="{ 
                                                    'selected-row': item.is_selected, 
                                                    'bg-grey-100 opacity-20': item.inventory.length === 0 || item.split_qty_bag === 0
                                                }
                                            ">
                                                <td>{{ item.BATCH }}</td>
                                                <td>
                                                    {{ item.MANUF_DATE ? moment(item.MANUF_DATE).format('MMMM D, YYYY') : '' }}
                                                </td>
                                                <td :class="{ 'text-error font-weight-bold' : expirationChecking(item.SLED_STR) }">
                                                    {{ item.SLED_STR }} 
                                                </td>
                                                <td>{{ numberWithComma(item.AGE) }} DAY(S)</td>
                                                <!-- Avail Quantity  -->
                                                <td>
                                                    {{ numberWithComma(item.available_quantity) }}
                                                    {{ transferData?.purchase_order_items?.[0].uom }}
                                                </td>

                                                <!-- AVAIL PALLETS  -->
                                                <td>
                                                    {{ item.inventory.length }} PALLET
                                                </td>
                                                <!-- Split QTY  -->
                                                <td> {{ numberWithComma(item.split_qty_bag) }} {{ transferData?.purchase_order_items?.[0].uom }}</td>

                                                <td
                                                    class="text-uppercase"
                                                    :class="{ 'text-error': item.saved_reserved != null }"
                                                >
                                                    {{ item.split_qty_pallets }}
                                                    Pallet
                                                    
                                                </td>
                                                <td>{{ item.inventory_qty }} {{ transferData?.purchase_order_items?.[0].uom }}</td>
                                                <td >
                                                    <v-checkbox v-model="item.is_selected"
                                                        hide-details 
                                                        :disabled="item.inventory.length === 0 || expirationChecking(item.SLED_STR) || item.split_qty_bag === 0"
                                                        density="compact">
                                                    </v-checkbox>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </v-table>
                                </v-tabs-window-item>
                            </v-tabs-window>
                        </div>
                        <div v-else style="display: flex; justify-content: center; align-items: center; height: 100px;">
                            <span class="text-h3 text-primary">Reserved</span>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <!-- <v-skeleton-loader  v-if="deliveryOrder.filter.loading_available_stocks" type="article"></v-skeleton-loader> -->
                    <div class="d-flex justify-end mt-4 py-4">
                        <v-btn variant="outlined" color="grey" class="mr-2" @click="closeModal">Back To Delivery Items</v-btn>
                        <!-- <v-btn v-if="selectedDeliveryItem?.delivery_reserved_orders?.length > 0" variant="outlined" color="warning" class="mr-2" @click="handleCancelProposal">
                            Cancel Reserved Pallets
                        </v-btn> -->
                        <v-btn color="success" type="submit" @click="reservePallets()" 
                            elevation="0" :loading="reserveLoading">Reserve Available Pallets</v-btn>
                    </div>
                </v-card-text>
            </v-card-text>
        </v-card>
    </v-dialog>
    <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event"/>

</template>

<style scoped>

.hover-underline {
    position: relative;
    text-decoration: none;
}

.hover-underline:hover::after {
    content: "";
    position: absolute;
    left: 0;
    bottom: 1px; 
    width: 100%;
    height: 1px; 
    background-color: #00833c; 
}
</style>
