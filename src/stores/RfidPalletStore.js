import { defineStore } from "pinia";
import ApiService from '@/services/ApiService';

export const useRfidPalletStore = defineStore("rfidPallet", {
    state: () => ({
        pallets: [],
        pallet: {},
        loading: false, 
        form: {
            errors: []
        },
        filter: {
            plant_code: null,
            pallet_name: null,
            storage_location: null,
        }
    }),
    actions: {
        fetchPallets() {
            this.loading = true;
            ApiService.post('pallet-registration/get-list', this.filter)
            .then(({ data }) => {
                this.pallets = data;
                this.loading = false;
            })
            .catch(({ response }) => {
                this.loading = false;
                this.form.errors = response.data.errors;
                console.log(response);
            })
        },
        getPalletByTid() {
            this.loading = true;
            ApiService.post('pallet-registration/get-by-tid', { 
                plant_code: this.filter.plant_code,
                storage_location: this.filter.storage_location,
                pallet_name: this.filter.pallet_name
            })
            .then(({ data }) => {
                this.pallet = data;
                this.loading = false;
            })
            .catch(({ response }) => {
                this.loading = false;
                this.form.errors = response.data.errors;
                console.log(response);
            })
        },
        
        // Check if a tag is registered by its TID (tag value) and plant code
        checkTagRegistration(tid, plantCode) {
            return new Promise((resolve, reject) => {
                this.loading = true;
                ApiService.post('pallet-registration/get-by-tid', { 
                    plant_code: plantCode,
                    tid: tid
                })
                .then(({ data }) => {
                    this.loading = false;
                    // If data exists and has properties, the tag is registered
                    resolve(data && Object.keys(data).length > 0);
                })
                .catch((error) => {
                    this.loading = false;
                    // If there's an error, assume the tag is not registered
                    resolve(false);
                });
            });
        }
    },
    getters: {
      
    }
});
