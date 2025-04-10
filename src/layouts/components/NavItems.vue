<script setup>
import VerticalNavSectionTitle from '@/@layouts/components/VerticalNavSectionTitle.vue';
import AddingModal from '@/components/AddingModal.vue';
import { generateSlug } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import VerticalNavLink from '@layouts/components/VerticalNavLink.vue';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const showRegistrationModal = ref(false);
const showMappingModal = ref(false)

const openRfidRegistrationModal = (event) => {
    showRegistrationModal.value = true;
}

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

const proceedRegister = () => {
    if (registrationModalForm.value.isValid) {
        if (!form.value.tag_type_id || !form.value.storage_location_id) {
            console.error("Tag Type or Storage Location is not selected.");
            return; // Return early if form values are not set
        }

        let tagType = tagTypes.value.find(item => item.value === form.value.tag_type_id);
        let storageLocation = storageLocations.value.find(item => item.value === form.value.storage_location_id);

        if (!tagType || !storageLocation) {
            console.error("Invalid Tag Type or Storage Location selected.");
            return;
        }

        if (tagType.name && storageLocation.name) {
            // Construct the dynamic path
            router.push({
                path: `/rfid-registration/${generateSlug(tagType.name)}/${generateSlug(storageLocation.name)}`,
            });
            showRegistrationModal.value = false;
        }
    }
}

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
    <VerticalNavLink :item="{ title: 'Dashboard', icon: 'ri-home-smile-line', to: '/dashboard'}"/>
    
    <!-- Warehouse Section  -->
    <VerticalNavSectionTitle :item="{ heading: 'Warehouse'}" />
    <VerticalNavLink :item="{ title: 'Inventory', icon: 'ri-stack-line', to: '/inventories'}"/>
    <VerticalNavLink :item="{ title: 'Production Run', icon: 'ri-picture-in-picture-line', to: '/production-runs'}"/>
    <VerticalNavLink :item="{ title: 'Warehouse', icon: 'ri-route-line', to: '/warehouse'}" />

    <!-- <VerticalNavLink :item="{ title: 'Warehouse', icon: 'ri-route-line'}" @click="showMappingModal = true"/> -->

    <!-- Shipments Section  -->
    <VerticalNavSectionTitle :item="{ heading: 'Test Label Here'}" />
    <VerticalNavLink :item="{ title: 'Shipments', icon: 'ri-truck-line', to: '/shipments'}"/>
    <!-- <VerticalNavLink :item="{ title: 'Deliveries', icon: 'ri-truck-line', to: '/warehouse'}"/> -->
    <!-- <VerticalNavLink :item="{ title: 'Curtain', icon: 'ri-truck-line', to: '/warehouse'}"/> -->

    <!-- Stock Transfers Section  -->
    <!-- <VerticalNavSectionTitle :item="{ heading: 'Stock Transfers'}" /> -->
    <!-- <VerticalNavLink :item="{ title: 'Purchase Orders', icon: 'ri-shopping-cart-line', to: '/dashboard'}"/> -->
   
    <!-- Master Data Section  -->
    <VerticalNavSectionTitle :item="{ heading: 'Master Data'}" />
    <VerticalNavLink :item="{ title: 'Materials', icon: 'ri-folder-open-line', to: '/materials'}"/>
    <VerticalNavLink :item="{ title: 'Production Lines', icon: 'ri-database-line', to: '/production-lines'}"/>

    <!-- RFID Components Section  -->
    <VerticalNavSectionTitle :item="{ heading: 'RFID Components'}" />
    <VerticalNavLink :item="{ title: 'RFID Master', icon: 'ri-dashboard-2-line' }" @click="openRfidRegistrationModal"/>
    <VerticalNavLink :item="{ title: 'Readers', icon: 'ri-rfid-line', to: '/readers'}"/>

    <!-- Authentication Section  -->
    <VerticalNavSectionTitle :item="{ heading: 'Authentication'}" />
    <VerticalNavLink :item="{ title: 'Users', icon: 'ri-user-line', to: '/users'}"/>
    <VerticalNavLink :item="{ title: 'Roles', icon: 'ri-group-line', to: '/roles'}"/>
    <VerticalNavLink :item="{ title: 'Permissions', icon: 'ri-shield-user-line', to: '/permissions'}"/>

    <!--  RFID Registration  -->
    <AddingModal @close="showRegistrationModal = false" :show="showRegistrationModal" :dialogTitle="'Select Type and Location'" >
        <template #default>
            <v-form @submit.prevent="proceedRegister" ref="registrationModalForm">
                <div>
                    <label class="font-weight-bold">RFID Type</label>
                    <v-select class="mt-1" label="Select Type" density="compact"
                        :items="tagTypes" v-model="form.tag_type_id" 
                        :rules="[value => !!value || 'Please select an item from the list']"
                    >
                    </v-select>
                </div>
                <div class="mt-4">
                    <label class="font-weight-bold">Location</label>
                    <v-select class="mt-1" label="Select Location" density="compact"
                        :items="storageLocations" v-model="form.storage_location_id"
                        :rules="[value => !!value || 'Please select an item from the list']"
                    >
                    </v-select>
                </div>
                <div class="d-flex justify-end align-center mt-8">
                    <v-btn color="secondary" variant="outlined" @click="showRegistrationModal = false" class="px-12 mr-3">Cancel</v-btn>
                    <v-btn color="primary" type="submit" class="px-12">Proceed</v-btn>
                </div>
            </v-form>
        </template>
    </AddingModal>

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
