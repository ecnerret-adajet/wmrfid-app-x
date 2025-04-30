<script setup>
import VerticalNavSectionTitle from '@/@layouts/components/VerticalNavSectionTitle.vue';
import AddingModal from '@/components/AddingModal.vue';
import { generateSlug } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import { useAuthStore } from '@/stores/auth';
import VerticalNavLink from '@layouts/components/VerticalNavLink.vue';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const showMappingModal = ref(false)

const openRfidRegistrationModal = (event) => {
    showRegistrationModal.value = true;
}

const authStore = useAuthStore();
const tagTypes = ref([]);
const storageLocations = ref([]);
const registrationModalForm = ref(null);
const mappingModalForm = ref(null);
const mappingLocation = ref(null)

const router = useRouter();

onMounted(() => {
    fetchRfidRegistrationData();
})

const form = ref({
    tag_type_id: null,
    storage_location_id: null
})

const fetchRfidRegistrationData = async () => {
    try {
        const response = await ApiService.get('registration/get-data-dropdown');

        const { rfid_types, storage_locations } = response.data

        tagTypes.value = rfid_types.map(item => ({
            value: item.id,
            title: item.name, 
            name: item.name 
        }));
  
        storageLocations.value = storage_locations.map(item => ({
            value: item.id,
            title: item.name,
            name: item.name 
        }));
   
    } catch (error) {
        console.error('Error fetching data:', error);
    }
};



const proceedMapping = () => {
    if (mappingModalForm.value.isValid) {
        let storageLocation = storageLocations.value.find(item => item.value === mappingLocation.value);
        router.push({
            path: `/warehouse-map/${generateSlug(storageLocation.name)}`,
        });
        showMappingModal.value = false;
    }
}

</script>

<template>
    <VerticalNavLink :item="{ title: 'Dashboard', icon: 'ri-dashboard-line', to: '/dashboard'}"/>
    
    <!-- Warehouse Section  -->
    <VerticalNavSectionTitle :item="{ heading: 'Warehouse'}" />
    <VerticalNavLink :item="{ title: 'Inventory', icon: 'ri-stack-line', to: '/inventories'}"/>
    <VerticalNavLink :item="{ title: 'Production Run', icon: 'ri-building-4-line', to: '/production-runs'}"/>
    <VerticalNavLink :item="{ title: 'Warehouse', icon: 'ri-home-gear-line', to: '/warehouse'}" />

    <!-- <VerticalNavLink :item="{ title: 'Warehouse', icon: 'ri-route-line'}" @click="showMappingModal = true"/> -->

    <!-- Shipments Section  -->
    <VerticalNavSectionTitle :item="{ heading: 'Transactions'}" />
    <VerticalNavLink :item="{ title: 'Shipments', icon: 'ri-truck-line', to: '/shipments'}"/>
    <VerticalNavLink :item="{ title: 'Deliveries', icon: 'ri-inbox-unarchive-line', to: '/deliveries'}"/>
    <VerticalNavLink :item="{ title: 'Transfer Orders', icon: 'ri-exchange-box-line', to: '/transfer-orders'}"/>
    <VerticalNavLink :item="{ title: 'Fumigations', icon: 'ri-shield-check-line', to: '/fumigations'}"/>

    <!-- <VerticalNavLink :item="{ title: 'Deliveries', icon: 'ri-truck-line', to: '/warehouse'}"/> -->
    <!-- <VerticalNavLink :item="{ title: 'Curtain', icon: 'ri-truck-line', to: '/warehouse'}"/> -->

    <!-- Stock Transfers Section  -->
    <!-- <VerticalNavSectionTitle :item="{ heading: 'Stock Transfers'}" /> -->
    <!-- <VerticalNavLink :item="{ title: 'Purchase Orders', icon: 'ri-shopping-cart-line', to: '/dashboard'}"/> -->
   
    <!-- Master Data Section  -->
    <VerticalNavSectionTitle :item="{ heading: 'Master Data'}" />
    <VerticalNavLink :item="{ title: 'Materials', icon: 'ri-stack-line', to: '/materials'}"/>
    <VerticalNavLink :item="{ title: 'Production Lines', icon: 'ri-function-line', to: '/production-lines'}"/>

    <!-- RFID Components Section  -->
    <VerticalNavSectionTitle :item="{ heading: 'RFID Components'}" />
    <!-- <VerticalNavLink :item="{ title: 'RFID Master', icon: 'ri-dashboard-2-line' }" @click="openRfidRegistrationModal"/> -->
    <VerticalNavLink :item="{ title: 'RFID Master', icon: 'ri-database-2-line', to: '/rfid'}"/>

    <VerticalNavLink :item="{ title: 'Readers', icon: 'ri-rfid-line', to: '/readers'}"/>

    <!-- Authentication Section  -->
    <VerticalNavSectionTitle v-if="authStore.user?.is_super_admin || authStore.user?.is_warehouse_admin"  :item="{ heading: 'Authentication'}" />
    <VerticalNavLink v-if="authStore.user?.is_super_admin || authStore.user?.is_warehouse_admin" :item="{ title: 'Users', icon: 'ri-user-line', to: '/users'}"/>
    <VerticalNavLink v-if="authStore.user?.is_super_admin" :item="{ title: 'Roles', icon: 'ri-group-line', to: '/roles'}"/>
    <VerticalNavLink v-if="authStore.user?.is_super_admin" :item="{ title: 'Permissions', icon: 'ri-shield-user-line', to: '/permissions'}"/>

    <!-- Warehouse Mapping  -->
    <AddingModal @close="showMappingModal = false" :show="showMappingModal" :dialogTitle="'Select Location'" >
        <template #default>
            <v-form @submit.prevent="proceedMapping" ref="mappingModalForm">
                <div>
                    <label class="font-weight-bold">Location</label>
                    <v-select class="mt-1" label="Select Location" density="compact"
                        :items="storageLocations" v-model="mappingLocation"
                        :rules="[value => !!value || 'Please select an item from the list']"
                    >
                    </v-select>
                </div>
                <div class="d-flex justify-end align-center mt-8">
                    <v-btn color="secondary" variant="outlined" @click="showMappingModal = false" class="px-12 mr-3">Cancel</v-btn>
                    <v-btn color="primary" type="submit" class="px-12">Proceed</v-btn>
                </div>
            </v-form>
        </template>
    </AddingModal>
</template>
