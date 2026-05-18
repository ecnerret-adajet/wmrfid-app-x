import JwtService from '@/services/JwtService'
import axios from 'axios'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSapDeliveryStore = defineStore('sap-delivery', () => {
    const deliveryData = ref(null)
    const selectedDeliveryItem = ref(null)
    const product_age = ref({ from: null, to: null })
    const availableStocks = ref([])
    const otherStocks = ref([])
    const batchList = ref([])
    const originalBatchList = ref([])
    const activeTab = ref('available_stocks')
    const customerApprovalFile = ref(null)
    const customerApprovalRemarks = ref('')
    const loadingStocks = ref(false)

    function setBatches(batches) {
        batchList.value = batches
    }

    function setOriginalBatchList(batches) {
        originalBatchList.value = batches
        batchList.value = batches
    }

    function resetActiveTab() {
        activeTab.value = 'available_stocks'
    }

    function reset() {
        availableStocks.value = []
        otherStocks.value = []
        batchList.value = []
        originalBatchList.value = []
        product_age.value = { from: null, to: null }
        selectedDeliveryItem.value = null
        activeTab.value = 'available_stocks'
        customerApprovalFile.value = null
        customerApprovalRemarks.value = ''
    }

    async function checkAgeRange(params) {
        const token = JwtService.getToken()
        const { data } = await axios.post('deliveries/get-age-range', {
            delivery_item_no: params.item_number,
            material_code: params.material_code,
            delivery_id: params.delivery_id,
            delivery_document: params.delivery_document,
        }, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        })
        product_age.value = data
        if (deliveryData.value) deliveryData.value.age = data
        return data
    }

    async function fetchAvailableCommodities(params) {
        const token = JwtService.getToken()
        loadingStocks.value = true
        try {
            const { data } = await axios.post('inventories/get-available-commodities-sap', {
                material_code: params.material_code,
                delivery_document: params.delivery_document,
                item_number: params.item_number,
                delivery_quantity: params.delivery_quantity,
                open_quantity: params.open_quantity, // fixed: previously sent delivery_quantity
                sales_unit: params.sales_unit,
                from: product_age.value.from,
                to: product_age.value.to,
                sloc: params.storage_location,
                plant_code: params.plant,
            }, {
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            })

            let remaining = parseInt(params.open_quantity) || 0
            const splitQty = params.default_pallet_quantity || 40

            availableStocks.value = data.map(item => {
                let split_qty = 0
                if (item.is_selected) {
                    split_qty = remaining < splitQty ? remaining : splitQty
                    if (remaining >= splitQty) remaining -= splitQty
                }
                return { ...item, split_qty }
            })

            return availableStocks.value
        } finally {
            loadingStocks.value = false
        }
    }

    async function fetchOtherAvailableCommodities(params) {
        const token = JwtService.getToken()
        const { data } = await axios.post('inventories/get-other-commodities-sap', {
            material_code: params.material_code,
            delivery_document: params.delivery_document,
            item_number: params.item_number,
            delivery_quantity: params.delivery_quantity,
            open_quantity: params.open_quantity, // fixed: previously sent delivery_quantity
            sales_unit: params.sales_unit,
            from: product_age.value.from,
            to: product_age.value.to,
            sloc: params.storage_location,
            plant_code: params.plant,
        }, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        })

        let remaining = parseInt(params.open_quantity) || 0
        const splitQty = params.default_pallet_quantity || 40

        otherStocks.value = data.map(item => {
            let split_qty = 0
            if (item.is_selected) {
                split_qty = remaining < splitQty ? remaining : splitQty
                if (remaining >= splitQty) remaining -= splitQty
            }
            return { ...item, split_qty }
        })

        return otherStocks.value
    }

    async function fetchOpenQuantity(params) {
        const token = JwtService.getToken()
        const { data } = await axios.post('deliveries/get-open-quantity', {
            delivery_document: params.delivery_document,
            delivery_item_number: params.item_number,
            delivery_quantity: params.delivery_quantity,
            sloc: params.storage_location,
            plant_code: params.plant,
        }, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        })
        if (deliveryData.value) deliveryData.value.open_quantity = data
        if (selectedDeliveryItem.value) selectedDeliveryItem.value.open_quantity = data
        return data
    }

    return {
        deliveryData,
        selectedDeliveryItem,
        product_age,
        availableStocks,
        otherStocks,
        batchList,
        originalBatchList,
        activeTab,
        customerApprovalFile,
        customerApprovalRemarks,
        loadingStocks,
        setBatches,
        setOriginalBatchList,
        resetActiveTab,
        reset,
        checkAgeRange,
        fetchAvailableCommodities,
        fetchOtherAvailableCommodities,
        fetchOpenQuantity,
    }
})
