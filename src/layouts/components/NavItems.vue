<script setup>
import VerticalNavSectionTitle from '@/@layouts/components/VerticalNavSectionTitle.vue';
import AddingModal from '@/components/AddingModal.vue';
import { useAuthorization } from '@/composables/useAuthorization';
import { generateSlug } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import { useAuthStore } from '@/stores/auth';
import VerticalNavGroup from '@layouts/components/VerticalNavGroup.vue';
import VerticalNavLink from '@layouts/components/VerticalNavLink.vue';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const showMappingModal = ref(false)
const { authUserCan } = useAuthorization();


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
 

    <VerticalNavLink :item="{ title: 'Dashboard', icon: 'ri-dashboard-line', to: '/dashboard' }" />
    <!-- Warehouse Section  -->
    <VerticalNavSectionTitle :item="{ heading: 'Warehouse' }" />
    <VerticalNavLink v-if="authUserCan('view.inventories')"
        :item="{ title: 'Inventory', icon: 'ri-stack-line', to: '/inventories' }" />
    <VerticalNavLink v-if="authUserCan('view.production.runs') && authStore.user?.has_production"
        :item="{ title: 'Production Run', icon: 'ri-building-4-line', to: '/production-runs' }" />
    <VerticalNavLink v-if="authUserCan('view.warehouses')"
        :item="{ title: 'Warehouse', icon: 'ri-home-gear-line', to: '/warehouse' }" />
    <VerticalNavLink v-if="authUserCan('view.manual.repack')"
        :item="{ title: 'Repacking', icon: 'ri-user-settings-line', to: '/repacking' }" />

    <!-- <VerticalNavLink :item="{ title: 'Warehouse', icon: 'ri-route-line'}" @click="showMappingModal = true"/> -->

    <!-- Shipments Section  -->
    <VerticalNavSectionTitle v-if="authUserCan('view.shipments') ||
        authUserCan('view.deliveries') ||
        authUserCan('view.sto') ||
        authUserCan('view.sto.outbound') ||
        authUserCan('view.sto.inbound')" :item="{ heading: 'Transactions' }" />
    <VerticalNavLink v-if="authUserCan('view.shipments')"
        :item="{ title: 'Shipments', icon: 'ri-truck-line', to: '/shipments' }" />
    <VerticalNavLink 
        :item="{ title: 'Good Receipt List', icon: 'ri-file-list-line', to: '/goods-receipt' }" />
    <VerticalNavLink v-if="authUserCan('view.deliveries')"
        :item="{ title: 'Deliveries', icon: 'ri-inbox-unarchive-line', to: '/deliveries' }" />
    <VerticalNavLink v-if="authUserCan('view.sto')"
        :item="{ title: 'Transfer Orders', icon: 'ri-shuffle-line', to: '/transfer-orders' }" />
    <VerticalNavLink v-if="authUserCan('view.sto.outbound')"
        :item="{ title: 'STO Outbound', icon: 'ri-upload-2-line', to: '/sto-outbound' }" />
    <VerticalNavLink v-if="authUserCan('view.sto.inbound')"
        :item="{ title: 'STO Inbound', icon: 'ri-download-2-line', to: '/sto-inbound' }" />
    <VerticalNavLink v-if="authUserCan('view.fumigation.requests')"
        :item="{ title: 'Fumigations', icon: 'ri-shield-check-line', to: '/fumigations' }" />
    <VerticalNavLink :item="{ title: 'Service Requests', icon: 'ri-inbox-unarchive-line', to: '/application-requests' }" />

    <!-- <VerticalNavLink :item="{ title: 'Deliveries', icon: 'ri-truck-line', to: '/warehouse'}"/> -->
    <!-- <VerticalNavLink :item="{ title: 'Curtain', icon: 'ri-truck-line', to: '/warehouse'}"/> -->

    <!-- Stock Transfers Section  -->
    <!-- <VerticalNavSectionTitle :item="{ heading: 'Stock Transfers'}" /> -->
    <!-- <VerticalNavLink :item="{ title: 'Purchase Orders', icon: 'ri-shopping-cart-line', to: '/dashboard'}"/> -->

    <!-- Master Data Section  -->
    <VerticalNavSectionTitle v-if="authUserCan('view.materials') || authUserCan('view.production.lines')"
        :item="{ heading: 'Master Data' }" />
    <VerticalNavLink v-if="authUserCan('view.materials')"
        :item="{ title: 'Materials', icon: 'ri-stack-line', to: '/materials' }" />
    <VerticalNavLink v-if="authUserCan('view.production.lines')"
        :item="{ title: 'Production Lines', icon: 'ri-function-line', to: '/production-lines' }" />

    <!-- RFID Components Section  -->
    <VerticalNavSectionTitle v-if="authUserCan('view.rfid') || authUserCan('view.readers') || authUserCan('view.rfid.monitoring')"
        :item="{ heading: 'RFID Components' }" />

    <VerticalNavGroup v-if="authUserCan('view.rfid')" :item="{title: 'RFID Master', icon: 'ri-database-2-line'}">
        <VerticalNavLink v-if="authUserCan('view.rfid')"
            :item="{
                title: 'Pallets',
                href: '/rfid/pallets',
                to: '/rfid/pallets',
            }"
        />
        <VerticalNavLink v-if="authUserCan('view.rfid.tonner.bags')"
            :item="{
                title: 'Tonner Bags',
                href: '/rfid/tonner-bags',
                to: '/rfid/tonner-bags',
            }"
        />
    </VerticalNavGroup>

    <VerticalNavGroup v-if="authUserCan('monitor.rfid.pallets') || authUserCan('monitor.rfid.tonner.bags')" :item="{title: 'RFID Monitoring', icon: 'ri-stacked-view'}">
        <VerticalNavLink v-if="authUserCan('monitor.rfid.pallets')"
            :item="{
                title: 'Pallets',
                href: '/monitoring/pallets',
                to: '/monitoring/pallets',
            }"
        />
        <VerticalNavLink v-if="authUserCan('monitor.rfid.tonner.bags')"
            :item="{
                title: 'Tonner Bags',
                href: '/monitoring/tonner-bags',
                to: '/monitoring/tonner-bags',
            }"
        />
    </VerticalNavGroup>

    <VerticalNavLink v-if="authUserCan('view.readers')"
        :item="{ title: 'Readers', icon: 'ri-rfid-line', to: '/readers' }" />

    <VerticalNavGroup v-if="authUserCan('view.pallet.inverter')" :item="{title: 'Pallet Inverter', icon: 'ri-clockwise-line'}">
        <VerticalNavLink
            :item="{
                title: 'View Inversions',
                href: '/view-inversions',
            }"
        />
        <VerticalNavLink
            :item="{
                title: 'New Inversion',
                href: '/new-inversion',
            }"
        />
    </VerticalNavGroup>

    <VerticalNavGroup v-if="authUserCan('view.weak.pallets') || authUserCan('view.readers.report')" :item="{title: 'RFID Reports', icon: 'ri-file-chart-line'}">
        <VerticalNavLink v-if="authUserCan('view.weak.pallets')"
            :item="{
                title: 'Weak Pallets',
                href: '/reports/weak-pallets',
                to: '/reports/weak-pallets',
            }"
        />
        <VerticalNavLink v-if="authUserCan('view.readers.report')"
            :item="{
                title: 'Readers Report',
                href: '/reports/readers-report',
                to: '/reports/readers-report',
            }"
        />
    </VerticalNavGroup>
    

    <!-- <VerticalNavLink v-if="authUserCan('view.pallet.inverter')"
        :item="{ title: 'Pallet Inverter', icon: 'ri-clockwise-line', to: '/pallet-inverter' }" /> -->

    <!-- Authentication Section  -->
    <VerticalNavSectionTitle v-if="authStore.user?.is_super_admin || authStore.user?.is_warehouse_admin"
        :item="{ heading: 'Authentication' }" />
    <VerticalNavLink v-if="authStore.user?.is_super_admin || authStore.user?.is_warehouse_admin"
        :item="{ title: 'Users', icon: 'ri-user-line', to: '/users' }" />
    <VerticalNavLink v-if="authStore.user?.is_super_admin"
        :item="{ title: 'Roles', icon: 'ri-group-line', to: '/roles' }" />
    <VerticalNavLink v-if="authStore.user?.is_super_admin"
        :item="{ title: 'Permissions', icon: 'ri-shield-user-line', to: '/permissions' }" />

    <!-- Admin Components Section  -->
    <VerticalNavSectionTitle v-if="authUserCan('view.inventory.recon')" :item="{ heading: 'Admin' }" />
    <!-- <VerticalNavLink :item="{ title: 'RFID Master', icon: 'ri-dashboard-2-line' }" @click="openRfidRegistrationModal"/> -->
    <VerticalNavLink v-if="authUserCan('view.inventory.recon')"
        :item="{ title: 'Inventory Recon', icon: 'ri-database-2-line', to: '/inventory-recon' }" />

    <!-- Warehouse Mapping  -->
    <AddingModal @close="showMappingModal = false" :show="showMappingModal" :dialogTitle="'Select Location'">
        <template #default>
            <v-form @submit.prevent="proceedMapping" ref="mappingModalForm">
                <div>
                    <label class="font-weight-bold">Location</label>
                    <v-select class="mt-1" label="Select Location" density="compact" :items="storageLocations"
                        v-model="mappingLocation" :rules="[value => !!value || 'Please select an item from the list']">
                    </v-select>
                </div>
                <div class="d-flex justify-end align-center mt-8">
                    <v-btn color="secondary" variant="outlined" @click="showMappingModal = false"
                        class="px-12 mr-3">Cancel</v-btn>
                    <v-btn color="primary" type="submit" class="px-12">Proceed</v-btn>
                </div>
            </v-form>
        </template>
    </AddingModal>
</template>
