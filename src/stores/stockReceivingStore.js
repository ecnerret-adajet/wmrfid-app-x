import ApiService from '@/services/ApiService'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useStockReceivingStore = defineStore('stockReceiving', () => {
    const items = ref([])
    const totalItems = ref(0)
    const loading = ref(false)
    const error = ref(null)

    const fetchStockReceiving = async (params = {}) => {
        loading.value = true
        error.value = null
        try {
            ApiService.setHeader()
            const queryParams = {}

            if (params.search) {
                queryParams.search = params.search
            }
            if (params.plant) {
                queryParams.plant = params.plant
            }
            if (params.start_date) {
                queryParams.start_date = params.start_date
            }
            if (params.end_date) {
                queryParams.end_date = params.end_date
            }
            if (params.page) {
                queryParams.page = params.page
            }
            if (params.per_page) {
                queryParams.per_page = params.per_page
            }

            const { data } = await ApiService.query('stock-transfer-receiving', { params: queryParams })
            items.value = data.data
            totalItems.value = data.total
            return data
        } catch (e) {
            error.value = e
            throw e
        } finally {
            loading.value = false
        }
    }

    const clear = () => {
        items.value = []
        totalItems.value = 0
        error.value = null
        loading.value = false
    }

    return {
        items,
        totalItems,
        loading,
        error,
        fetchStockReceiving,
        clear,
    }
})
