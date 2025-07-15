<script setup>
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import JwtService from '@/services/JwtService';
import axios from 'axios';
import Moment from 'moment';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { VDataTableServer } from 'vuetify/components';
// import DeliveryItemData from './deliveryItemData.vue';

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
        title: 'BU Shipment',
        key: 'bu_shipment',
    },
    {
        title: 'ALC Shipment',
        key: 'alc_shipment',
    },
    {
        title: 'Plant',
        key: 'plant',
    },
    {
        title: 'Request for',
        key: 'request_for',
    },
    {
        title: 'Create Date',
        key: 'create_date',
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

    ApiService.query('application-request',{
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

    <template #item.bu_shipment="{ item }">
        {{ item.application_requestable.bu_shipment }}
    </template>

    <template #item.alc_shipment="{ item }">
        {{ item.application_requestable.alc_shipment }}
    </template>

    <template #item.plant="{ item }">
        {{ item.application_requestable.plant_code }}
    </template>

    <template #item.request_for="{ item }">
        {{ item.application_requestable.action_field }}
    </template>

    <template #item.create_date="{ item }">
        {{ item.created_at ? Moment(item.created_at).format('MMMM D, YYYY') : '' }}
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
