<script setup>
import DefaultModal from '@/components/DefaultModal.vue';
import Loader from '@/components/Loader.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import axios from 'axios';
import { debounce } from 'lodash';
import { computed, nextTick, reactive } from 'vue';
import VueMultiselect from 'vue-multiselect';

const tagTypes = ref([]);
const storageLocations = ref([]);
const isLoading = ref(false);
const isFetching = ref(false); // Used in multiselect
const addToExistingLoading = ref(false);
const formRef = ref(null);
const addExistingForm = ref(null);
const errorMessage = ref(null);
const showLoader = ref(false);
const addExistingModal = ref(false);
const tags = ref([]);
const unregisteredTags = ref([])
const tagsOption = ref([])

const form = reactive({
    storage_location_id: null,
    group_no: null,
    name: null,
    is_defective: 'no',
    tag_type_id: null,
    existing_tag: null,
    to_be_added_tags: [],
})

// Dev implementation: This will mimic the process of reading tags from the RFID reader
const getTags = async () => {
    const url = `registration/get-dummy-tags?tag_type_id=${form.tag_type_id}`;
    try {
        const response = await ApiService.get(url);
        tags.value = response.data
        unregisteredTags.value = response.data.filter(tag => tag.status === 'unregistered');
    } catch (error) {
    }
};

onMounted(() => {
    fetchTagTypes();
})

const fetchTagTypes = async () => {
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
            title: item.name
        }));
   
    } catch (error) {
        console.error('Error fetching data:', error);
    }
};

const getLastItem = async () => {
    showLoader.value = true;
    const url = `registration/get-last-tag?tag_type_id=${form.tag_type_id}`;
    try {
        const response = await ApiService.get(url);
        form.group_no = response.data;
        showLoader.value = false;
    } catch (error) {
        showLoader.value = false;
        console.error('Error fetching data from get-last-tag:', error);
    }
};


watch(() => form.tag_type_id, async (newTagTypeId) => {
    if (newTagTypeId) {
        tags.value = []
        unregisteredTags.value = []
        getTags();
        getLastItem();
        
        if (tags.length > 0) {
            // Get the first tag and assign epc to form.epc
            form.epc = tags[0].epc;
            const url = `registration/check-reference?epc=${form.epc}&tag_type_id=${form.tag_type_id}`;
            try {
                const response = await ApiService.get(url);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        }
    }
});

const getTableLabel = computed(() => {
    return 'Tags'; // TODO:: Implement dynamic label, depending on the selected tag type (e.g Pallet Tags)
});

const toast = ref({
    message: 'RFID successfully registered!',
    color: 'success',
    show: false
});

const submit = async () => {
    // Allow only if form is valid (without validation issue)
    if (formRef.value.isValid) {
        form.to_be_added_tags = unregisteredTags.value
        isLoading.value = true;
        toast.value.show = false;
        try {
            const response = await ApiService.post('register-rfid', form)
            isLoading.value = false;
            toast.value.message = 'RFID successfully created!'
            toast.value.show = true;
            errorMessage.value = ''
            getTags();
            clearForm();
        } catch (error) {
            errorMessage.value = error.response?.data?.message || 'An unexpected error occurred.';
            console.error('Error submitting:', error);
            isLoading.value = false;
        }
    }
}

const handleAddExisting = () => {
    addExistingModal.value = true;
}

const fetchExistingTag = debounce((query) => {
    if (query) {
        isFetching.value = true;
        axios.get('/registration/search', {
            params: {
                query: query,
                tag_type_id: form.tag_type_id
            }
        }).then(response => {
            tagsOption.value = response.data;
            nextTick(() => {
                isFetching.value = false;
            });
        }).catch(error => {
            console.error(error);
            nextTick(() => {
                isFetching.value = false;
            });
        });
    }
}, 500);

const cancelAdd = () => {
    addExistingModal.value = false;
    form.existing_tag = null;
    form.to_be_added_tags = []
    tagsOption.value = [];
}

const addToExistingTag = async () => {
    form.to_be_added_tags = unregisteredTags.value
    addToExistingLoading.value = true;
    try {
        const response = await ApiService.post('/registration/add-to-existing', form)
        addToExistingLoading.value = false;
        toast.value.message = 'Tags successfully added to existing group'
        toast.value.show = true;
        addExistingModal.value = false;
        getTags();
        clearForm();
    } catch (error) {
        errorMessage.value = error.response?.data?.message || 'An unexpected error occurred.';
        console.error('Error submitting:', error);
        addToExistingLoading.value = false;
    }
        
}

const clearForm = () => {
    form.storage_location_id = null;
    form.group_no = null;
    form.name = null;
    form.is_defective = 'no'; // Reset to no
    form.tag_type_id = null;
    form.existing_tag = null;
    form.to_be_added_tags = []
}

</script>

<template>
    <v-card class="ma-8">
        <v-card-title class="d-flex justify-space-between align-center">
            <VRow>
                <VCol cols="4" class="d-flex align-start">
                    <div class="text-h2 font-weight-black ps-2">
                    RFID Registration
                    </div>
                </VCol>
                <VCol cols="2" offset="6" class="d-flex align-center">
                    <PrimaryButton form="registerForm" :disabled="unregisteredTags.length === 0" class="px-12" type="submit" :loading="isLoading">
                        Submit
                    </PrimaryButton>
                </VCol>
            </VRow>
        </v-card-title>
        <v-card-text class="mt-4">
            <v-form @submit.prevent="submit" id="registerForm" ref="formRef">
                <VRow>
                    <VCol md="3">
                        <div>
                            <label class="font-weight-bold">RFID Type</label>
                            <v-select class="mt-1" label="Select Type" density="compact"
                                :items="tagTypes" v-model="form.tag_type_id" 
                                :rules="[value => !!value || 'Please select an item from the list']"
                            >
                            </v-select>
                        </div>
                        <div class="mt-4">
                            <label class="font-weight-bold">Group No.</label>
                            <v-text-field class="mt-1 opacity-50" label="" readonly density="compact" v-model="form.group_no"/>
                        </div>
                    </VCol>
                    <VCol md="3">
                        <div>
                            <label class="font-weight-bold">Physical ID</label>
                            <v-text-field class="mt-1" label="" :rules="[value => !!value || 'This field is required']" density="compact" v-model="form.name"/>
                        </div>
                        <div class="mt-4">
                            <v-radio-group inline v-model="form.is_defective">
                                <template v-slot:label>
                                    <label class="font-weight-bold">Is Defective?</label>
                                </template>
                                <v-radio
                                    label="Yes"
                                    value="yes"
                                ></v-radio>
                                <v-radio
                                    label="No"
                                    value="no"
                                ></v-radio>
                            </v-radio-group>
                        </div>
                    </VCol>

                    <VCol md="3">
                        <div>
                            <label class="font-weight-bold">Location</label>
                            <v-select class="mt-1" label="Select Location" density="compact"
                                :items="storageLocations" v-model="form.storage_location_id"
                                :rules="[value => !!value || 'Please select an item from the list']"
                            >
                            </v-select>
                        </div>
                        
                    </VCol>
                  
                    <VCol md="2" class="d-flex flex-column justify-center align-center text-center">
                         
                        <div class="font-weight-black text-h1 text-primary mt-auto px-4" style="border-bottom: 1px thin #00833c;">
                            {{ tags.length }}
                        </div>
                        
                        <!-- Pallet tag count label at the bottom -->
                        <div class="font-weight-black text-h4 mt-auto">
                            Pallet Tag Count
                        </div>
                    </VCol>
                    
                </VRow>
            </v-form>
            <VAlert v-if="errorMessage" class="mt-4" color="error" variant="tonal">
                {{ errorMessage }}
            </VAlert>
        </v-card-text>
    </v-card>
    <v-card class="mx-8">
        <VRow class="pa-4">
            <VCol cols="4" class="d-flex align-start">
                <div class="text-h4 font-weight-black ps-2">
                    {{ getTableLabel }}
                </div>
            </VCol>
            <VCol cols="2" offset="6">
                <v-btn block color="primary-2" @click="handleAddExisting" :disabled="!form.existing_tag" class="text-grey-100">
                    Add To Existing
                </v-btn>
            </VCol>
        </VRow>
        <v-table>
            <thead>
                <tr>
                    <th class="text-left text-uppercase bg-primary px-6 py-2 font-weight-black" style="background-color: #00833c !important; color: white !important;">epc</th>
                    <th class="text-left text-uppercase bg-primary px-6 py-2 font-weight-black" style="background-color: #00833c !important; color: white !important; border-left: 1px solid #fff; border-right: 1px solid #fff;">tid</th>
                    <th class="text-left text-uppercase bg-primary px-6 py-2 font-weight-black" style="background-color: #00833c !important; color: white !important;">rssi</th>
                    <th class="text-left text-uppercase bg-primary px-6 py-2 font-weight-black" style="background-color: #00833c !important; color: white !important; border-left: 1px solid #fff; border-right: 1px solid #fff;">reader</th>
                    <th class="text-center text-uppercase bg-primary px-6 py-2 font-weight-black" style="background-color: #00833c !important; color: white !important; border-right: 1px solid #fff">antenna</th>
                    <th class="text-center text-uppercase bg-primary px-6 py-2 font-weight-black" style="background-color: #00833c !important; color: white !important;">status</th>
                </tr>
            </thead>
            <tbody>
                <tr v-if="tags.length === 0">
                    <td colspan="6" class="text-center">No data available</td>
                </tr>
                <tr v-for="item in tags" :key="item.tid">
                    <td>{{ item.epc }}</td>
                    <td>{{ item.tid }}</td>
                    <td>{{ item.rssi }}</td>
                    <td>{{ item.reader }}</td>
                    <td class="text-center">{{ item.antenna }}</td>
                    <td class="text-center">
                        <template v-if="item.status === 'unregistered'">
                            <v-chip color="primary-2" variant="flat" class="text-uppercase text-grey-100">
                                {{item.status}}
                            </v-chip>
                        </template>
                        <template v-else>
                            <v-chip color="primary" variant="flat" class="text-uppercase text-grey-100">
                                <span class="px-7">{{item.status}}</span>
                            </v-chip>
                        </template>
                    </td>
                </tr>
            </tbody>
        </v-table>
    </v-card>
    <DefaultModal @close="cancelAdd" :show="addExistingModal" :dialogTitle="'Add to Existing'" >
        <template #default>
            <v-form @submit.prevent="addToExistingTag" ref="addExistingForm" id="addExistingForm">
                <VRow>
                    <VCol md="12">
                        <VueMultiselect label="name" v-model="form.existing_tag" track-by="id" placeholder="Search by name"
                            open-direction="bottom" :options="tagsOption" :searchable="true" :loading="isFetching"
                            :internal-search="false" :clear-on-select="false" :close-on-select="true" :options-limit="8"
                            :limit="8" :max-height="600" :show-no-results="true" 
                            @search-change="fetchExistingTag" required>
                        </VueMultiselect>
                    </VCol>
                </VRow>
                <v-table class="mt-4">
                    <thead>
                        <tr>
                            <th class="text-left text-uppercase bg-primary px-6 py-2 font-weight-black" 
                                style="background-color: #00833c !important; color: white !important;
                                width: 350px !important;">code</th>
                            <th class="text-left text-uppercase bg-primary py-2 font-weight-black" 
                                style="background-color: #00833c !important; color: white !important; 
                                width: 250px !important;">group no.</th>

                            <th class="text-left text-uppercase bg-primary px-6 py-2 font-weight-black" style="background-color: #00833c !important; color: white !important;">name</th>
                        </tr>
                    </thead>
                    <tbody v-if="form.existing_tag?.name && form.existing_tag?.tid && form.existing_tag?.epc && form.existing_tag?.group_no">
                        <tr>
                            <td style="width: 250px !important;">{{ form.existing_tag.epc }}</td>
                            <td style="width: 250px !important;" class="text-left px-8">{{ form.existing_tag.group_no }}</td>
                            <td class="text-left">{{ form.existing_tag.name }}</td>
                        </tr>
                    </tbody>
                </v-table>
                
                <v-table class="mt-4">
                    <thead>
                        <tr>
                            <th class="text-left text-uppercase bg-primary px-6 py-2 font-weight-black" 
                            style="background-color: #00833c !important; color: white !important;
                            width: 350px !important;">epc</th>
                            <th class="text-left text-uppercase bg-primary py-2 font-weight-black" 
                                style="background-color: #00833c !important; color: white !important;
                                width: 250px !important;">tid</th>
                            <th class="text-left text-uppercase bg-primary px-6 py-2 font-weight-black" style="background-color: #00833c !important; color: white !important;">name</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="unregisteredTags.length === 0">
                            <td colspan="6" class="text-center">No data available</td>
                        </tr>
                        <tr v-for="item in unregisteredTags" :key="item.tid">
                            <td style="width: 350px !important;">{{ item.epc }}</td>
                            <td style="width: 250px !important;" class="text-left">{{ item.tid }}</td>
                            <td class="text-left">{{ item.name }}</td>
                        </tr>
                    </tbody>
                </v-table>
                <div class="d-flex justify-end align-center mt-8">
                    <v-btn color="secondary" variant="outlined" @click="cancelAdd" class="px-12 mr-3">Cancel</v-btn>
                    <v-btn color="primary" form="addExistingForm" type="submit" :loading="addToExistingLoading" class="text-grey-100 px-8">
                        Add To Existing
                    </v-btn>
                </div>
            </v-form>
        </template>
    </DefaultModal>
    <Loader :show="showLoader"/>
    <Toast :show="toast.show" :message="toast.message"/>
</template>

<style src="vue-multiselect/dist/vue-multiselect.css"></style>
