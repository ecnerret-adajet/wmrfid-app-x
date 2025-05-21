<script setup>
import Toast from '@/components/Toast.vue';
import { numberWithComma } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import JwtService from '@/services/JwtService';
import axios from 'axios';
import Moment from 'moment';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { VDataTableServer } from 'vuetify/components';
import DeliveryItemData from './deliveryItemData.vue';
import ShipmentData from './shipmentData.vue';

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
const showDeliveryItems = ref(false);
const showReservedPallets = ref(false);
const deliveryData = ref([]);

const headers = [
    {
        title: 'DELIVERY NUMBER',
        key: 'delivery_document',
    },
    {
        title: 'PLANT',
        key: 'plant_name',
    },
    {
        title: 'CUSTOMER',
        key: 'ship_to_customer',
    },
    {
        title: 'SHIPMENT',
        key: 'shipment_number',
    },
    {
        title: 'ITEMS',
        key: 'items',
        align: 'center',
        sortable: false
    },
    {
        title: 'ACTION',
        key: 'action',
        align: 'center',
        sortable: false,
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

    ApiService.query('datatable/deliveries',{
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
    { title: 'View Delivery Items', key: 'view_delivery_items' },
]

const handleViewDelivery = (delivery) => {
    router.push(`/deliveries/${delivery.delivery_document}`);
}

const handleAction = (delivery, action) => {
    deliveryData.value = delivery;
    
    if(action.key == 'view_delivery_items') {
        showDeliveryItems.value = true;
    } 
}

const showStocks = ref(false);
const selectedDeliveryItem = ref(null);

const deliveryOrder = reactive({
    selected_delivery_item: null,

    filter: {
        loading_available_stocks: false
    },

    product_age: null,

    form: {
        errors: {}
    },

    async checkAgeRange(object) {
        const token = JwtService.getToken();
        return axios.post(`deliveries/get-age-range`, {
            delivery_item_no: object.item_number,
            material_code: object.material_code,
            delivery_id: object.delivery_id
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(({ data }) => {
            this.product_age = data;
            deliveryData.value.age = data;
            return data;
        })
        .catch(({ response }) => {
            this.form.errors = response.data.errors;
        });
    },

    async fetchAvailableCommodities(params) {
        const token = JwtService.getToken();
        return axios.post(`inventories/get-available-commodities-sap`, {
            material_code: params.material_code,
            delivery_document: params.delivery_document,
            item_number: params.item_number,
            delivery_quantity: params.delivery_quantity,
            sales_unit: params.sales_unit,
            from: this.product_age.from,
            to: this.product_age.to,
            sloc: params.storage_location,
            plant_code: params.plant

        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(({ data }) => {
            let remainingRequiredQty = parseInt(params.delivery_quantity) || 0;
            let splitQty = params.default_pallet_quantity || 40; // fallback to 40 
            availableStocks.value = data.map((item, index) => {
                if (item.is_selected) {
                    const split_qty = remainingRequiredQty < splitQty ? remainingRequiredQty : splitQty;
                    
                    if (remainingRequiredQty >= splitQty) {
                        remainingRequiredQty -= splitQty;
                    }

                    return {
                        ...item,
                        split_qty,
                    };
                }

                return {
                    ...item,
                    split_qty: 0,
                };
            });
        })
        .catch(({ response }) => {
            this.form.errors = response.data.errors;
        });
    },

    async fetchOtherAvailableCommodities(params) {
        const token = JwtService.getToken();
        return axios.post(`inventories/get-other-commodities-sap`, {
            material_code: params.material_code,
            delivery_document: params.delivery_document,
            item_number: params.item_number,
            delivery_quantity: params.delivery_quantity,
            sales_unit: params.sales_unit,
            from: this.product_age.from,
            to: this.product_age.to,
            sloc: params.storage_location,
            plant_code: params.plant

        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(({ data }) => {
            let remainingRequiredQty = parseInt(params.delivery_quantity) || 0;
            let splitQty = params.default_pallet_quantity || 40; // fallback to 40 
            otherStocks.value = data.map((item, index) => {
                if (item.is_selected) {
                    const split_qty = remainingRequiredQty < splitQty ? remainingRequiredQty : splitQty;
                    
                    if (remainingRequiredQty >= splitQty) {
                        remainingRequiredQty -= splitQty;
                    }

                    return {
                        ...item,
                        split_qty,
                    };
                }

                return {
                    ...item,
                    split_qty: 0,
                };
            });
        })
        .catch(({ response }) => {
            this.form.errors = response.data.errors;
        });
    },

    async fetchOpenQuantity(params) {
        const token = JwtService.getToken();
        return axios.post(`deliveries/get-open-quantity`, {
            delivery_document: params.delivery_document,
            delivery_item_number: params.item_number,
            delivery_quantity: params.delivery_quantity,
            sloc: params.storage_location,
            plant_code: params.plant
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(({ data }) => {
            deliveryData.value.open_quantity = data;
            return data;
        })
        .catch(({ response }) => {
            this.form.errors = response.data.errors;
        });
    },

});

const assignPallet = (item) => {
    selectedDeliveryItem.value = item;
    console.log(selectedDeliveryItem.value);
    return new Promise(async (resolve, reject) => {
        try {
            showStocks.value = !showStocks.value;

            selectedDeliveryItem.value = item;
            deliveryOrder.selected_delivery_item = item;

            if (showStocks.value === true) {
                const delParams = {
                    delivery_id: deliveryData.value.id,
                    material_code: selectedDeliveryItem.value.material,
                    delivery_document: deliveryData.value.delivery_document,
                    item_number: selectedDeliveryItem.value.item_number,
                    delivery_quantity: selectedDeliveryItem.value.quantity,
                    sales_unit: selectedDeliveryItem.value.sales_unit,
                    storage_location: selectedDeliveryItem.value.storage_location?.code,
                    plant: selectedDeliveryItem.value.plant?.plant_code,
                    default_pallet_quantity: selectedDeliveryItem.value.material_model?.default_pallet_quantity
                };

                deliveryOrder.filter.loading_available_stocks = true;

                await deliveryOrder.checkAgeRange(delParams);
                await deliveryOrder.fetchAvailableCommodities(delParams);
                await deliveryOrder.fetchOtherAvailableCommodities(delParams);
                await deliveryOrder.fetchOpenQuantity(delParams);
            }

            resolve();
        } catch (error) {
            reject(error);
        } finally {
            deliveryOrder.filter.loading_available_stocks = false;
        }
    });
} 

const closeModal = () => {
    showStocks.value = false
    availableStocks.value = []
    otherStocks.value = []
    showDeliveryItems.value = false
}

const activeTab = ref('available_stocks');
const availableStocks = ref([]);
const otherStocks = ref([]);
const submitProposalLoading = ref(false);
const customerApprovalRemarks = ref(null);
const customerApprovalFile = ref(null);

const refForm = ref(null);

const selectedAvailableBatches = computed(() => {
    return availableStocks.value.filter(item => item.is_selected);
});

const selectedOtherBatches = computed(() => {
    return otherStocks.value.filter(item => item.is_selected);
});

const expirationChecking = (date) => {
    const currentDate = Moment();
    const comparisonDate = Moment(date).format('YYYY-MM-DD');
    return currentDate.isAfter(comparisonDate);
};

const submitProposal = async () => {
    if (activeTab.value !== 'available_stocks') {
        if (!customerApprovalFile.value) {
            toast.value.color = 'error';
            toast.value.message = 'Please choose a file';
            toast.value.show = true;
            return; 
        }

        if (!customerApprovalRemarks.value) {
            toast.value.color = 'error';
            toast.value.message = 'Please input remarks';
            toast.value.show = true;
            return; 
        }
    }
 
    let formData = new FormData();
    formData.append('delivery_id', deliveryData.value.id);
    formData.append('delivery_item_id', selectedDeliveryItem.value.id);
    formData.append('material_name', selectedDeliveryItem.value.material_desc);
    formData.append('material_code', parseInt(selectedDeliveryItem.value.material));
    formData.append('delivery_document', deliveryData.value.delivery_document);
    formData.append('item_number', selectedDeliveryItem.value.item_number);
    formData.append('delivery_quantity', selectedDeliveryItem.value.quantity);
    formData.append('numerator', selectedDeliveryItem.value.numerator);
    formData.append('denominator', selectedDeliveryItem.value.denominator);
    formData.append('plant', selectedDeliveryItem.value.plant?.plant_code);
    formData.append('sloc', selectedDeliveryItem.value.storage_location?.code);
    formData.append('mode', activeTab.value);
    formData.append('stock_exception', activeTab.value !== 'available_stocks');

    if (activeTab.value !== 'available_stocks') {
        formData.append('customer_approval_document', customerApprovalFile.value);
        formData.append('customer_approval_remarks', customerApprovalRemarks.value);
    }

    const selectedBatches = activeTab.value === 'available_stocks'
        ? selectedAvailableBatches.value
        : selectedOtherBatches.value;

    formData.append(`batches`, JSON.stringify(selectedBatches));

    // If available stocks and no selected batch (pre-selected has been deselected)
    if (activeTab.value === 'available_stocks' && selectedAvailableBatches.value.length === 0) {
        toast.value.color = 'error';
        toast.value.message = 'Please select batch';
        toast.value.show = true;
        return;
    }

    // If other stocks and no selected batch
    if (activeTab.value !== 'available_stocks' && selectedOtherBatches.value.length === 0) {
        toast.value.color = 'error';
        toast.value.message = 'Please select batch';
        toast.value.show = true;
        return;
    }
    
    try {
        submitProposalLoading.value = true;
        const token = JwtService.getToken();
        const { data } = await axios.post(
            `deliveries/delivery-order-proposed`,
            formData,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            }
        );
        if (!data.success) {
            console.log(data.errors)
            // Handle validation errors
            // const errorMsg = data.errors?.customer_approval_document?.[0] 
            const batchPickError = data.errors?.length > 0 ? data.errors?.[0] : null
            
            if (batchPickError) {
                toast.value.color = 'error';
                toast.value.message = batchPickError;
                toast.value.show = true;
                loadItems({
                    page: page.value,
                    itemsPerPage: itemsPerPage.value,
                    sortBy: [{key: 'created_at', order: 'desc'}],
                    search: props.search
                });
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
        submitProposalLoading.value = false;
        customerApprovalFile.value = null;
        customerApprovalRemarks.value = null;
    }
    
}

const cancelProposalLoading = ref(false);
const cancelConfirmationModal = ref(false);

const cancelProposal = async () => {
    try {
        cancelProposalLoading.value = true;
        const token = JwtService.getToken();
        const { data } = await axios.post(
            `deliveries/delivery-order-remove`,
            {
                delivery_id: deliveryData.value.id,
                delivery_document: deliveryData.value.delivery_document,
                delivery_item_number: selectedDeliveryItem.value.item_number,
                plant: selectedDeliveryItem.value.plant?.plant_code,
                storage_location: selectedDeliveryItem.value.storage_location?.code
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        
        if (!data.success) {
            // Handle validation errors
            const cancelBatchError = data.errors?.length > 0 ? data.errors?.[0] : null
            
            if (cancelBatchError) {
                toast.value.color = 'error';
                toast.value.message = cancelBatchError;
                toast.value.show = true;
                loadItems({
                    page: page.value,
                    itemsPerPage: itemsPerPage.value,
                    sortBy: [{key: 'created_at', order: 'desc'}],
                    search: props.search
                });
                // closeModal()
            }

        } 

        // Proceed normally if successful
        if (data.success) {
            toast.value.color = 'success';
            toast.value.message = "Successfully cancelled reserved pallets";
            toast.value.show = true;
            // closeModal()
        }
        
    } catch (response) {
        console.log(response);
    } finally {
        cancelProposalLoading.value = false;
        cancelConfirmationModal.value = false
        customerApprovalFile.value = null;
        customerApprovalRemarks.value = null;
    }
}

const handleCancelProposal = () => {
    cancelConfirmationModal.value = true;
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

    <template #item.delivery_document="{ item }">
        {{ item.delivery_document }}
    </template>

    <template #item.plant_name="{ item }">
        {{ item?.plant?.name }}
    </template>

    <template #item.ship_to_customer="{ item }">
        {{ item.ship_to_customer }}
    </template>

    <template #item.shipment_number="{ item }">
        {{ item.shipment_number }}
    </template>

    <template #item.items="{ item }">
        {{ item.items.length }}
    </template>

    <!-- Actions -->
    <template #item.action="{ item }">
        <div class="d-flex justify-center gap-1">
            <v-menu location="start"> 
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

    <v-dialog v-model="showDeliveryItems" max-width="1500px">
        <v-card elevation="2">
            <v-card-title class="d-flex justify-space-between align-center mx-4 px-4 mt-6">
                <div class="text-h4 font-weight-bold ps-2 text-primary">
                    Delivery Details
                </div>
                <v-btn
                    icon="ri-close-line"
                    variant="text"
                    @click="closeModal"
                ></v-btn>
                
            </v-card-title>
            <v-card-text>
                <v-skeleton-loader  v-if="deliveryOrder.filter.loading_available_stocks" type="article"></v-skeleton-loader>
                <div v-else>
                    <DeliveryItemData v-if="showStocks" :delivery-data="deliveryData" :selected-delivery-item="selectedDeliveryItem"/>
                    <ShipmentData v-else :delivery-data="deliveryData"/>
                </div>

                <v-divider class="my-4 mx-5"></v-divider>
                <v-card-text v-if="!showStocks">

                    <v-table class="mt-4 striped">
                        <thead>
                            <tr>
                                <th>Item No.</th>
                                <th>Material</th>
                                <th class="text-center">Quantity</th>
                                <th class="text-center">Storage Location</th>
                                <th class="text-center">Picking</th>
                                <th class="text-center">GI</th>
                                <th class="text-center">Pallet Status</th>
                                <th class="text-center"></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(item, index) in deliveryData?.items" :key="index">
                                <td>{{ item.item_number }}</td>
                                <td>
                                    <div class="d-flex flex-column py-3">
                                        <span class="font-weight-bold">{{ item.material }}</span>
                                        <span>{{ item.material_desc }}</span>
                                    </div>
                                </td>
                                <td class="text-center">{{ item.quantity }}</td>
                                <td class="text-center">
                                    <div class="d-flex flex-column py-3">
                                        <span class="font-weight-bold">{{ item?.storage_location?.plant_code }}</span>
                                        <span>{{ item?.storage_location?.code }} - {{ item?.storage_location?.name }}</span>
                                    </div>
                                </td>
                                <td class="text-center">{{ deliveryData?.picking_status }}</td>
                                <td class="text-center">{{ deliveryData?.goods_issue_status }}</td>
                                <td class="text-center">
                                    <!-- If no reservation yet -->
                                    <v-badge v-if="item.delivery_reserved_orders.length === 0"
                                        color="warning"
                                        content="No Pallet"
                                        class="text-uppercase"
                                        inline
                                    ></v-badge>
                                    <!-- if reserved full quantity  -->
                                    <v-badge v-else-if="item.delivery_reserved_orders.length > 0 && (parseInt(item.total_reserved_pallets) === parseInt(item.quantity))"
                                        color="success"
                                        content="Reserved"
                                        class="text-uppercase"
                                        inline
                                    ></v-badge>
                                    <!-- If partially reserved  -->
                                    <div v-else class="d-flex flex-column py-3">
                                        <v-badge 
                                            color="info"
                                            content="Partially Reserved"
                                            class="text-uppercase"
                                            inline
                                        ></v-badge>
                                        <span class="mt-1">{{ item.total_reserved_pallets }} out of {{ item.quantity }} {{ item.sales_unit }}(S)</span>
                                    </div>
                                </td>
                                <td class="text-center">
                                    <v-btn
                                        @click="assignPallet(item)"
                                        color="primary-light"
                                        variant="outlined"
                                        size="small"
                                    >
                                        Details
                                    </v-btn>
                                </td>
                            </tr>
                        </tbody>
                    </v-table>
                </v-card-text>
                <v-card-text v-else>
                    <v-skeleton-loader v-if="deliveryOrder.filter.loading_available_stocks" type="article"></v-skeleton-loader>
                    <div v-else>
                        <div v-if="parseInt(selectedDeliveryItem.quantity) !== parseInt(selectedDeliveryItem.total_reserved_pallets)">

                            <v-tabs v-model="activeTab" bg-color="transparent" variant="tonal" class="custom-tabs">
                                <v-tab value="available_stocks" class="text-h5">
                                    Available Stocks
                                </v-tab>
                                <v-tab value="other_stocks" class="text-h5">
                                    Other Stocks
                                </v-tab>
                            </v-tabs>

                            <v-skeleton-loader  v-if="deliveryOrder.filter.loading_available_stocks" type="article"></v-skeleton-loader>
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
                                                    {{ item.MANUF_DATE ? Moment(item.MANUF_DATE).format('MMMM D, YYYY') : '' }}
                                                </td>
                                                <td :class="{ 'text-error font-weight-bold' : expirationChecking(item.SLED_STR) }">
                                                    {{ item.SLED_STR }} 
                                                </td>
                                                <td>{{ numberWithComma(item.AGE) }} DAY(S)</td>
                                                <!-- Avail Quantity  -->
                                                <td>
                                                    {{ numberWithComma(item.BAG) }}
                                                    {{ selectedDeliveryItem?.sales_unit }}
                                                </td>

                                                <!-- AVAIL PALLETS  -->
                                                <td>
                                                    {{ item.inventory.length }} PALLET
                                                </td>
                                                <!-- Split QTY  -->
                                                <td> {{ numberWithComma(item.split_qty_bag) }} {{ selectedDeliveryItem?.sales_unit }}</td>

                                                <td
                                                    class="text-uppercase"
                                                    :class="{ 'text-error': item.saved_reserved != null }"
                                                >
                                                    {{ item.split_qty_pallets }}
                                                    Pallet
                                                    
                                                </td>
                                                <td>{{ item.inventory_qty }} {{ selectedDeliveryItem?.sales_unit }}</td>
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

                                <v-tabs-window-item value="other_stocks">
                                    <div class="my-4 border pa-4">
                                        <div class="text-subtitle-1 font-weight-medium mb-2">Customer Approval Document</div>
                                        <v-file-input
                                            accept="image/*,application/pdf"
                                            v-model="customerApprovalFile"
                                            density="compact"
                                            prepend-icon=""
                                            label="Choose file"
                                        ></v-file-input>
                                        <div class="text-subtitle-1 font-weight-medium mt-4">Remarks</div>
                                        <v-textarea class="mt-1"
                                            clear-icon="ri-close-line"
                                            placeholder="Remarks/Comments"
                                            v-model="customerApprovalRemarks"
                                            clearable
                                        ></v-textarea>
                                    </div>
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
                                            <tr v-for="(item, index) in otherStocks" :key="index" 
                                                :class="{ 
                                                    'selected-row': item.is_selected, 
                                                    'bg-grey-100 opacity-20': item.inventory.length === 0 || item.split_qty_bag === 0
                                                }
                                            ">
                                                <td>{{ item.BATCH }}</td>
                                                <td>
                                                    {{ item.MANUF_DATE ? Moment(item.MANUF_DATE).format('MMMM D, YYYY') : '' }}
                                                </td>
                                                <td :class="{ 'text-error font-weight-bold' : expirationChecking(item.SLED_STR) }">
                                                    {{ item.SLED_STR }} 
                                                </td>
                                                <td>{{ numberWithComma(item.AGE) }} DAY(S)</td>
                                                <!-- Avail Quantity  -->
                                                <td>
                                                    {{ numberWithComma(item.BAG) }}
                                                    {{ selectedDeliveryItem?.sales_unit }}
                                                </td>

                                                <!-- AVAIL PALLETS  -->
                                                <td>
                                                    {{ item.inventory.length }} PALLET
                                                </td>
                                                <!-- Split QTY  -->
                                                <td> {{ numberWithComma(item.split_qty_bag) }} {{ selectedDeliveryItem?.sales_unit }}</td>

                                                <td
                                                    class="text-uppercase"
                                                    :class="{ 'text-error': item.saved_reserved != null }"
                                                >
                                                    {{ item.split_qty_pallets }}
                                                    Pallet
                                                    
                                                </td>
                                                <td>{{ item.inventory_qty }} {{ selectedDeliveryItem?.sales_unit }}</td>
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
                    <v-skeleton-loader  v-if="deliveryOrder.filter.loading_available_stocks" type="article"></v-skeleton-loader>
                    <div v-else class="d-flex justify-end mt-4 py-4">
                        <v-btn variant="outlined" color="grey" class="mr-2" @click="closeModal">Back To Delivery Items</v-btn>
                        <v-btn v-if="selectedDeliveryItem?.delivery_reserved_orders?.length > 0" variant="outlined" color="warning" class="mr-2" @click="handleCancelProposal">
                            Cancel Reserved Pallets
                        </v-btn>
                        <v-btn color="success" type="submit"  
                            v-if="parseInt(selectedDeliveryItem.quantity) !== parseInt(selectedDeliveryItem.total_reserved_pallets)"
                            elevation="0" @click="submitProposal" :loading="submitProposalLoading">Reserve Available Pallets</v-btn>
                    </div>
                </v-card-text>
            </v-card-text>
        </v-card>
    </v-dialog>

    <v-dialog v-model="cancelConfirmationModal" min-width="400px" max-width="600px">
        <v-card class="pa-4">
            <div class="text-center">
                <v-icon
                    class="mb-5"
                    color="error"
                    icon="ri-close-circle-line"
                    size="112"
                ></v-icon>
                <p class="mb-6 text-h5">Are you sure you want to cancel reserved pallets?</p>
                <p class="font-weight-medium text-medium-emphasis">
                    This will cancel {{ selectedDeliveryItem.total_reserved_pallets }} reserved {{selectedDeliveryItem.sales_unit}}(s), 
                    initially held for {{ selectedDeliveryItem.quantity }} required {{ selectedDeliveryItem.sales_unit }}(s).
                </p>
                <div class="d-flex justify-end align-center mt-8">
                    <v-btn color="secondary" variant="outlined" @click="cancelConfirmationModal = false" class="px-8 mr-3">Cancel</v-btn>
                    <v-btn color="primary" @click="cancelProposal" :loading="cancelProposalLoading" class="px-8">Proceed</v-btn>
                </div>
            </div>
        </v-card>
    </v-dialog>


    <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event"/>

</template>

<style scoped>
.custom-tabs {
  border-bottom: none !important;
  box-shadow: none !important; 
}

.selected-row {
    background-color: #e8f5e9;
}

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
