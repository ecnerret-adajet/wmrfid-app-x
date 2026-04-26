    
import ApiService from '@/services/ApiService'
import { defineStore } from 'pinia'

export const useTransferRequestsStore = defineStore('transferRequests', {
  state: () => ({
    items: [],
    loading: false,
    error: null,
    transferOrderResponse: null,
  }),
  actions: {
    async fetchTransferRequests(plant_code, sloc, forkliftId) {
      this.loading = true
      this.error = null
      try {
        ApiService.setHeader()
        const { data } = await ApiService.get(
          `rfid/pallet/${plant_code}/${sloc}/${forkliftId}/get-qr-transfer-requests`
        )
        this.items = data
      } catch (e) {
        this.error = e
      } finally {
        this.loading = false
      }
    },
    clear() {
      this.items = []
      this.error = null
      this.loading = false
    },

    async generateTransferOrder(plant_code, sloc, forkliftId, transferRequestId) {
      this.loading = true
      this.error = null
      try {
        ApiService.setHeader();
        const { data } = await ApiService.post(
          `rfid/pallet/${plant_code}/${sloc}/${forkliftId}/generate-transfer-order`,
          { transfer_request_id: transferRequestId }
        );
        this.transferOrderResponse = data;

        // Update only the affected transfer request in the items array
        if (data && data.transfer_request) {
          const idx = this.items?.transfer_requests?.findIndex(
            (tr) => tr.transfer_request_id === transferRequestId
          );
          if (idx !== -1) {
            this.items.transfer_requests[idx] = data.transfer_request;
          }

        }
        return data;
      } catch (e) {
        this.error = e;
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async confirmWrapping({ plant_code, sloc, forklift, physical_id, transfer_request_id, qr_text }) {
      this.loading = true;
      this.error = null;
      try {
        ApiService.setHeader();
        const url = `rfid/pallet/${encodeURIComponent(plant_code)}/${encodeURIComponent(sloc)}/${encodeURIComponent(forklift)}/confirm-wrapping`;
        const { data } = await ApiService.post(url, {
          physical_id,
          putaway_type: 'wrapping_area',
          transfer_request_id,
          qr_text
        });

        // Update only the affected transfer request in the items array
        if (data && data.transfer_request) {
          const idx = this.items?.transfer_requests?.findIndex(
            (tr) => tr.transfer_request_id === data.transfer_request.transfer_request_id
          );
          if (idx !== -1) {
            this.items.transfer_requests[idx] = data.transfer_request;
          }
        }
        return data;
      } catch (e) {
        this.error = e;
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async confirmPutaway({ plant_code, sloc, forklift, physical_id, transfer_request_id, qr_text }) {
      this.loading = true;
      this.error = null;
      try {
        ApiService.setHeader();
        const url = `rfid/pallet/${encodeURIComponent(plant_code)}/${encodeURIComponent(sloc)}/${encodeURIComponent(forklift)}/transfer-request-putaway`;
      
        const { data } = await ApiService.post(url, {
            physical_id,
            putaway_type: 'putaway',
            transfer_request_id,
            qr_text
        });

        // Update only the affected transfer request in the items array
        if (data && data.transfer_request) {
            const idx = this.items?.transfer_requests?.findIndex(
                (tr) => tr.transfer_request_id === data.transfer_request.transfer_request_id
            );
            if (idx !== -1) {
                this.items.transfer_requests[idx] = data.transfer_request;
            }
        }
        return data;
      } catch (e) {
        this.error = e;
        throw e;
      } finally {
        this.loading = false;
      }
    },
  }
})
