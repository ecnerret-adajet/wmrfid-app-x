import { defineStore } from "pinia";
import { ref } from "vue";

export const useGoodsReceiptStore = defineStore("goodsReceipt", () => {
    const filters = ref({
        plant: null, // Stores the full plant object or at least { id, title/code }
        storageLocation: null, // Stores the full sloc object
        posting_date: null,
        pallet_status: null
    });

    const setFilters = (newFilters: any) => {
        filters.value = { ...filters.value, ...newFilters };
    };

    const clearFilters = () => {
        filters.value = {
            plant: null,
            storageLocation: null,
            posting_date: null,
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
