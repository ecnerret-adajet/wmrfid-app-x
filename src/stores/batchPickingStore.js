import JwtService from '@/services/JwtService';
import axios from 'axios';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useBatchPickingStore = defineStore('batches', () => {
    const batchList = ref([]);
    const originalBatchList = ref([]);
    const deliveryDetails = ref({});
    const headerDetailsLoading = ref(false);
    const loadingAvailableStocks = ref(false);
    const loadingOtherStocks = ref(false)
    const selectedDeliveryItem = ref(null);
    const product_age = ref({ from: null, to: null }); 
    const availableStocks = ref([]); 
    const otherStocks = ref([])
    const activeTab = ref('available_stocks');

    function setBatches(batches) {
        batchList.value = batches;
    }

    function setOriginalBatchList(batches) {
        originalBatchList.value = batches
        batchList.value = batches // initial display
    }

    async function checkAgeRange(object) {
        const token = JwtService.getToken();
        try {
            const { data } = await axios.post(`deliveries/get-age-range`, {
                delivery_item_no: object.item_number,
                material_code: object.material_code,
                delivery_document: object.delivery_document
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            this.product_age.from = data.from;
            this.product_age.to = data.to;
            return data;
        } catch (error) {
            // Update formErrors with response errors if available
            if (error.response) {
                this.formErrors = error.response.data.errors;
            }
            throw error; // Re-throw to be handled by the calling component
        }
    }

    async function fetchOpenQuantity(params) {
        const token = JwtService.getToken();
        try {
            const { data } = await axios.post(`deliveries/get-open-quantity`, {
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
            });
            this.deliveryDetails.open_quantity = data;
            return data;
        } catch (error) {
            console.error('Failed to fetch open quantity:', error);
            throw error;
        } finally {
        }
    }

    // Action to fetch available commodities
    async function fetchAvailableCommodities(params) {
        const token = JwtService.getToken();
        this.loadingAvailableStocks = true;
        try {
            const { data } = await axios.post(`inventories/get-available-commodities-sap`, {
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
            });

            let remainingRequiredQty = parseInt(params.delivery_quantity) || 0;
            let splitQty = params.default_pallet_quantity || 40;
            
            this.availableStocks = data.map((item) => {
                let split_qty = 0;
                if (item.is_selected) {
                    split_qty = remainingRequiredQty < splitQty ? remainingRequiredQty : splitQty;
                    if (remainingRequiredQty >= splitQty) {
                        remainingRequiredQty -= splitQty;
                    }
                }
                return { ...item, split_qty };
            });

            return this.availableStocks;
        } catch (error) {
            if (error.response) {
                this.formErrors = error.response.data.errors;
            }
            throw error;
        } finally {
            this.loadingAvailableStocks = false
        }
    }

    // Action to fetch other available commodities
    async function fetchOtherAvailableCommodities(params) {
        const token = JwtService.getToken();
        try {
            const { data } = await axios.post(`inventories/get-other-commodities-sap`, {
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
            });

            let remainingRequiredQty = parseInt(params.delivery_quantity) || 0;
            let splitQty = params.default_pallet_quantity || 40;
            
            this.otherStocks = data.map((item) => {
                let split_qty = 0;
                if (item.is_selected) {
                    split_qty = remainingRequiredQty < splitQty ? remainingRequiredQty : splitQty;
                    if (remainingRequiredQty >= splitQty) {
                        remainingRequiredQty -= splitQty;
                    }
                }
                return { ...item, split_qty };
            });

            return this.otherStocks;
        } catch (error) {
            if (error.response) {
                this.formErrors = error.response.data.errors;
            }
            throw error;
        }
    }

    const fetchHeaderDetails = async (params) => {
        try {
            headerDetailsLoading.value = true
            const response = await axios.get(`batch-picking/get-details`, { params });
            if (response.data.success) {
                deliveryDetails.value = response.data.data;
            } else {
                console.error("API returned failure:", response.data);
            }
        } catch (error) {
            console.error("Error fetching header details:", error);
            if (error.response) {
                // this.formErrors = error.response.data.errors;
            }
            throw error; // Re-throw to be handled by the calling component
        } finally {
            headerDetailsLoading.value = false
        }
    }

    return { 
        batchList,
        originalBatchList,
        setOriginalBatchList,
        deliveryDetails,
        product_age,
        availableStocks,
        otherStocks,
        setBatches,
        checkAgeRange,
        fetchOpenQuantity,
        fetchAvailableCommodities,
        fetchOtherAvailableCommodities,
        fetchHeaderDetails,
        loadingAvailableStocks,
        headerDetailsLoading,
        selectedDeliveryItem,
        activeTab
    };
});
