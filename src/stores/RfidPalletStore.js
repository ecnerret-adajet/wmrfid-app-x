import { defineStore } from "pinia";
import ApiService from '@/services/ApiService';

export const useRfidPalletStore = defineStore("rfidPallet", {
    state: () => ({
        pallets: [],
        palletOption: [],
        pallet: {},
        loading: false, 
        searchTimeout: null,
        form: {
            errors: [],
            selected_pallet_id: null,
            search: '',
        },
        filter: {
            plant_code: null,
            pallet_name: null,
            storage_location: null,
            selected_pallet_id: null,
        }
    }),
    actions: {
        fetchExistingPallets(search = null) {
            this.loading = true;
            
            // Create a copy of the filter and add search parameter if provided
            if (search) {
                this.filter.pallet_name = search;
            }
            
            ApiService.post('pallet-registration/get-existing', this.filter)
            .then(({ data }) => {
                this.palletOption = data.map(item => ({
                    value: item.id,
                    title: item.name,
                    name: item.name
                }));
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
                    if(data.status == 'true' && data.tag_type == tagType) {
                        resolve(data);
                    } else {
                        resolve(false);
                    }
                    resolve(data);
                })
                .catch((error) => {
                    this.loading = false;
                    // If there's an error, assume the tag is not registered
                    resolve(false);
                });
            });
        },
        // add TID or EPC reading to exisiting pallet
        addTagToPallet(tid, plantCode) {
            return new Promise((resolve, reject) => {
                this.loading = true;
                ApiService.post('pallet-registration/add-tag', { 
                    plant_code: plantCode,
                    tid: tid,
                    pallet_id: this.form.selected_pallet_id
                })
                .then(({ data }) => {
                    this.loading = false;
                    resolve(data);
                })
                .catch((error) => {
                    this.loading = false;
                    reject(error);
                });
            });
        }
    },
    getters: {
      
    }
});
