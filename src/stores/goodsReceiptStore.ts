import Moment from "moment";
import { defineStore } from "pinia";
import { ref } from "vue";

export const useGoodsReceiptStore = defineStore("goodsReceipt", () => {
    const todayStr = Moment().format('YYYY-MM-DD');

    const filters = ref({
        plant: null, // Stores the full plant object or at least { id, title/code }
        storageLocation: null, // Stores the full sloc object
        dateFrom: todayStr,
        dateTo: todayStr,
        pallet_status: null
    });

    const setFilters = (newFilters: any) => {
        filters.value = { ...filters.value, ...newFilters };
    };

    const clearFilters = () => {
        filters.value = {
            plant: null,
            storageLocation: null,
            dateFrom: todayStr,
            dateTo: todayStr,
            pallet_status: null
        };
    };

    return {
        filters,
        setFilters,
        clearFilters
    };
}, {
    persist: true
});
