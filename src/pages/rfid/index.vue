<script setup>
import AddingModal from '@/components/AddingModal.vue';
import DefaultModal from '@/components/DefaultModal.vue';
import FilteringModal from '@/components/FilteringModal.vue';
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import { generateSlug } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import { debounce } from 'lodash';
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const searchValue = ref('');
const serverItems = ref([]);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref('-created_at');
const storageLocations = ref([]);

const registrationModalForm = ref(null);

const selectedItems = ref([]);
const tagTypesOption = ref([]);
const pageLoading = ref(false);
const showEpcModal = ref(false);
const epcData = ref([])

const showRegistrationModal = ref(false);

const toast = ref({
    message: 'RFID success',
    color: 'success',
    show: false
});

const headers = [
    {
        title: 'RFID CODE',
        key: 'rfid_code',
    },
    {
        title: 'PHYSICAL ID',
        key: 'physical_id',
    },
    {
        title: 'EPC',
        key: 'epc',
        align: 'center',
        sortable: false
    },
    {
        title: 'BATCH',
        key: 'batch',
    },
    {
        title: 'QUANTITY',
        key: 'quantity',
        align: 'center',
        sortable: false
    },
    {
        title: 'WRAPPING',
        key: 'is_wrapped',
        align: 'center',
        sortable: false
    },
    {
        title: 'LOADING',
        key: 'is_loaded',
        align: 'center',
        sortable: false
    },
    {
        title: 'EMPTY AREA',
        key: 'is_empty',
        align: 'center',
        sortable: false
    },
]

const filterModalVisible = ref(false);

const handleSearch = debounce((search) => {
    searchValue.value = search;
}, 500);

const handleRegister = () => {
    showRegistrationModal.value = true;
}

const filterModalOpen = () => {
    if (!filterModalVisible.value) {
        filterModalVisible.value = true;
    }
};

const filters = reactive({
    created_at: null,
    updated_at: null,
    tag_type_id: null,
});

const form = reactive({
    tag_type_id: null,
    storage_location_id: null,
});

const isFiltersEmpty = computed(() => {
    return !filters.created_at && 
           !filters.updated_at &&
           !filters.tag_type_id
});

const applyFilter = () => {
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{key: 'updated_at', order: 'desc'}],
        search: searchValue.value
    });
    filterModalVisible.value = false;
}

const resetFilter = () => {
    clearFilters();
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{key: 'updated_at', order: 'desc'}],
        search: searchValue.value
    });
    filterModalVisible.value = false;
}

const clearFilters = () => {
    filters.created_at = null;
    filters.updated_at = null;
    filters.tag_type_id = null;
};

const loadItems = ({ page, itemsPerPage, sortBy, search }) => {
    pageLoading.value = true
    if (sortBy && sortBy.length > 0) {
        const sort = sortBy[0];  // Assuming single sort field
        sortQuery.value = `${sort.key}`;  // Default ascending order
        if (sort.order === 'desc') {
            sortQuery.value = `-${sort.key}`;  // Prefix with minus for descending order
        }
    } else {
        sortQuery.value = '-created_at';
    }

    ApiService.query(`rfid/get-data`,{
        params: {
            page,
            itemsPerPage,
            sort: sortQuery.value,
            search: searchValue.value,
            filters: filters
        }
        })
        .then((response) => {
            const { table, statistics, tag_types, storage_locations } = response.data
            
            totalItems.value = table.total;
            serverItems.value = table.data
            
            // statisticsData.value = statistics

            tagTypesOption.value = tag_types.map(item => ({
                value: item.id,
                title: item.title,
                name: item.title 
            }));

            storageLocations.value = storage_locations.map(item => ({
                value: item.id,
                title: item.name,
                name: item.name 
            }));

            pageLoading.value = false
        })
        .catch((error) => {
            console.log(error);
            pageLoading.value = false
        });
}

const handleViewRfid = (item) => {
    router.push(`/rfid/${item.type}/${item.name}`);
}

const viewEpc = (item) => {
    epcData.value = item.epc_data
    showEpcModal.value = true;
}

const proceedRegister = () => {
    if (registrationModalForm.value.isValid) {
        if (!form.tag_type_id || !form.storage_location_id) {
            console.error("Tag Type or Storage Location is not selected.");
            return; // Return early if form values are not set
        }

        let tagType = tagTypesOption.value.find(item => item.value === form.tag_type_id);
        let storageLocation = storageLocations.value.find(item => item.value === form.storage_location_id);

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

</script>

<template>
    <VRow>
        <VCol md="9">
            <SearchInput @update:search="handleSearch"/>
        </VCol>
        <VCol md="1" class="d-flex justify-center align-center">
            <v-btn block prepend-icon="ri-equalizer-line" class="w-full" @click="filterModalOpen">
                <template v-slot:prepend>
                    <v-icon color="white"></v-icon>
                </template>
                Filter
            </v-btn>
        </VCol>
        <VCol md="2" class="d-flex justify-center align-center">
            <v-btn block @click="handleRegister">Register RFID</v-btn>
        </VCol>
    </VRow>

    <VCard>
        <VDataTableServer
            v-model:items-per-page="itemsPerPage"
            v-model="selectedItems"
            :headers="headers"
            :items="serverItems"
            :items-length="totalItems"
            :loading="pageLoading"
            item-value="id"
            :search="searchValue"
            @update:options="loadItems"
            class="text-no-wrap"
        >
        <template #item.physical_id="{ item }">
            {{ item.name }}
        </template>

        <template #item.rfid_code="{ item }">
            <span @click="handleViewRfid(item)" class="text-primary font-weight-bold cursor-pointer hover-underline">
                {{ item.rfid_code }}
            </span>
        </template>

        <template #item.epc="{ item }">
            <v-btn variant="outlined" @click="viewEpc(item)" color="info">
                View EPC
            </v-btn>
        </template>

        <template #item.is_wrapped="{ item }">
            <div class="d-flex justify-center align-center">
                <i v-if="item.is_wrapped" style="font-size: 30px; background-color: green;" class="ri-checkbox-circle-line"></i>
                <i v-else style="font-size: 30px; background-color: #FF4C51;"  class="ri-close-circle-line"></i>
            </div>
        </template>

        <template #item.is_loaded="{ item }">
            <div class="d-flex justify-center align-center">
                <i v-if="item.is_loaded" style="font-size: 30px; background-color: green;" class="ri-checkbox-circle-line"></i>
                <i v-else style="font-size: 30px; background-color: #FF4C51;"  class="ri-close-circle-line"></i>
            </div>
        </template>

        <template #item.is_empty="{ item }">
            <div class="d-flex justify-center align-center">
                <i v-if="item.is_empty" style="font-size: 30px; background-color: green;" class="ri-checkbox-circle-line"></i>
                <i v-else style="font-size: 30px; background-color: #FF4C51;"  class="ri-close-circle-line"></i>
            </div>
        </template>

        </VDataTableServer>
    </VCard>

    <FilteringModal @close="filterModalVisible = false" :show="filterModalVisible" :dialogTitle="'Filter RFID'">
        <template #default>
            <v-form>
                <v-select label="Filter by Type" density="compact"
                    :items="tagTypesOption" v-model="filters.tag_type_id"
                >
                </v-select>
                <div class="mt-4">
                    <label class="font-weight-bold">Date Created</label>
                    <DateRangePicker class="mt-1" v-model="filters.created_at" placeholder="Select Date Created"/>
                </div>
                 
                <div class="mt-4">
                    <label class="font-weight-bold">Date Updated</label>
                    <DateRangePicker class="mt-1" v-model="filters.updated_at" placeholder="Select Date Updated"/>
                </div>

                <div class="d-flex justify-end align-center mt-8">
                    <v-btn color="secondary" variant="outlined" :disabled="isFiltersEmpty" @click="resetFilter" class="px-12 mr-3">Reset Filter</v-btn>
                    <PrimaryButton class="px-12" type="button" :disabled="isFiltersEmpty" @click="applyFilter">
                        Apply Filter
                    </PrimaryButton>
                </div>
            </v-form>
        </template>
    </FilteringModal>

    <DefaultModal :dialog-title="'EPCs'" :show="showEpcModal" @close="showEpcModal = false" min-height="auto">
        <v-table class="mt-4">
                <thead>
                    <tr>
                        <th>RFID Code</th>
                        <th>Physical ID</th>
                        <th>EPC</th>
                        <th>TID</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(item, index) in epcData" :key="index">
                        <td>{{ item.rfid_code }}</td>
                        <td>{{ item.name }}</td>
                        <td>{{ item.epc }}</td>
                        <td>{{ item.tid }} </td>
                    </tr>
                </tbody>
            </v-table>
    </DefaultModal>

    <!--  RFID Registration  -->
    <AddingModal @close="showRegistrationModal = false" :show="showRegistrationModal" :dialogTitle="'Select Type and Location'" >
        <template #default>
            <v-form @submit.prevent="proceedRegister" ref="registrationModalForm">
                <div>
                    <label class="font-weight-bold">RFID Type</label>
                    <v-select class="mt-1" label="Select Type" density="compact"
                        :items="tagTypesOption" v-model="form.tag_type_id" 
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
 
    <Toast :show="toast.show" :message="toast.message"/>
</template>
