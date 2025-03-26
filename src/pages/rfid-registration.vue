<script setup>
import AddingModal from '@/components/AddingModal.vue';
import Loader from '@/components/Loader.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import ResponseModal from '@/components/ResponseModal.vue';
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import { computed, reactive, watch } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const isLoading = ref(false);
const addingLoading = ref(false);
const formRef = ref(null);
const errorMessage = ref(null);
const showLoader = ref(false);
const addExistingModal = ref(false);
const tags = ref([]);
const unregisteredTags = ref([]);
const unregisteredIdTags = ref([]);
const registeredTags = ref([]);
const responseModal = ref(false);
const responseMessage = ref('Not all unregistered EPC values are the same. Please ensure that all tags you are processing share the same EPC.');

// Get values from the URL
const tagType = route.params.type;
const storageLocation = route.params.location;

const form = reactive({
    storage_location: null,
    group_no: null,
    name: null,
    is_defective: 'no',
    tag_type: null,
    to_be_added_tags: [],
})

// Dev implementation: This will mimic the process of reading tags from the RFID reader
const getTags = async () => {
    showLoader.value = true;
    const url = `registration/get-dummy-tags?tag_type=${tagType}`;
    try {
        const response = await ApiService.get(url);
        tags.value = response.data
        registeredTags.value = response.data.filter(tag => tag.status !== 'unregistered' && tag.status !== 'unregistered TID');
        unregisteredTags.value = response.data.filter(tag => tag.status === 'unregistered');
        unregisteredIdTags.value = response.data.filter(tag => tag.status === 'unregistered TID')
        showLoader.value = false;
    } catch (error) {
        showLoader.value = false;
    }
};

const getUniqueEpc = (tags) => {
    // Run only if not single entry since no comparison needed
    
    const filteredTags = tags.filter(tag => tag.status === 'unregistered' || tag.status === 'unregistered TID');

    // Get unique EPCs
    const uniqueEpcs = new Set(filteredTags.map(tag => tag.epc));
    
    // If all EPCs are the same (Set size is 1), return the EPC
    if (uniqueEpcs.size === 1) {
        return [...uniqueEpcs][0];  // Return single EPC from the Set
    } else {
        return null;  // Return null if EPCs are not the same
    }
    
};

const removeItem = (index) => {
    tags.value.splice(index , 1)
    let epc = getUniqueEpc(tags.value);
    if (epc) {
        getLastItem(epc);
    } 
}

watch(tags, (newTags) => {
    if (newTags.length > 0) {
        let epc = getUniqueEpc(tags.value);
        // Show modal if mismatched EPCs
        if (!epc && newTags.length > 1) {
            responseModal.value = true
        } 
        getLastItem(epc);
    }
});

onMounted(() => {
    if (tagType) {
        getTags();
    }
})

const getLastItem = async (epc) => {
    showLoader.value = true;
    const url = `registration/get-last-tag?tag_type=${tagType}&epc=${epc}`; 
    try {
        const response = await ApiService.get(url);
        const { group_no, name, epc_exists } = response.data
        form.group_no = group_no;
        form.name = name;
        form.epc_exists = epc_exists;
        showLoader.value = false;
    } catch (error) {
        showLoader.value = false;
        console.error('Error fetching data from get-last-tag:', error);
    }
};

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
        if (tags.value.length === 0 ) {
            responseMessage.value = 'Tags seems to be empty. Please try again'
            responseModal.value = true
        } else {
            form.to_be_added_tags = tags.value.filter(tag => tag.status === 'unregistered' || tag.status === 'unregistered TID')
            form.storage_location = storageLocation;
            form.tag_type = tagType
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
}

const handleAddExisting = () => {
    const filteredTags = tags.value.filter(tag => tag.status === 'unregistered' || tag.status === 'unregistered TID');
    // Check for duplicate EPC values by using a Set
    const uniqueEpcs = new Set(filteredTags.map(tag => tag.epc));
    
    // // If the size of the Set is different from the length of the combined array, open the modal
    if (uniqueEpcs.size > 1) {
        responseModal.value = true
    } else {
        // Proceed
        addExistingModal.value = true;
    }

}

const cancelAdd = () => {
    addExistingModal.value = false;
}

const addToExistingTag = async () => {
    form.to_be_added_tags = tags.value.filter(tag => tag.status === 'unregistered' || tag.status === 'unregistered TID')
    form.storage_location = storageLocation;
    form.tag_type = tagType
    addingLoading.value = true;
    
    try {
        const response = await ApiService.post('/registration/add-to-existing', form)
        addingLoading.value = false;
        toast.value.message = 'Tags successfully added to existing group'
        toast.value.show = true;
        addExistingModal.value = false;
        getTags();
        clearForm();
    } catch (error) {
        errorMessage.value = error.response?.data?.message || 'An unexpected error occurred.';
        console.error('Error submitting:', error);
        addingLoading.value = false;
    }
}

const clearForm = () => {
    form.storage_location = null;
    form.group_no = null;
    form.name = null;
    form.is_defective = 'no'; // Reset to no
    form.tag_type = null;
    form.to_be_added_tags = []
}

const handleClear = () => {
    clearForm();
    
    // Clear tags and re-fetch
    tags.value = []
    unregisteredIdTags.value = []
    unregisteredTags.value = []

    getTags();
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
                <VCol cols="2" offset="4" class="d-flex align-center justify-end">
                    <v-btn color="primary" block variant="outlined" @click="handleClear" class="px-12" >
                        Clear
                    </v-btn>
                </VCol>
                <VCol cols="2" class="d-flex align-center">
                    <PrimaryButton block form="registerForm" :disabled="form.epc_exists || (unregisteredIdTags.length === 0 && unregisteredTags.length === 0)"
                        type="submit" :loading="isLoading"
                    >
                        Submit
                    </PrimaryButton>
                </VCol>
            </VRow>
        </v-card-title>
        <v-card-text class="mt-4">
            <v-form @submit.prevent="submit" id="registerForm" ref="formRef">
                <VRow>
                    <VCol md="3">
                        <div class="mt-4">
                            <label class="font-weight-bold">Group No.</label>
                            <!-- Always disable group no since it is generated from backend -->
                            <v-text-field class="mt-1" label="" :disabled="true"
                             density="compact" v-model="form.group_no"/>
                        </div>
                        <div class="mt-4">
                            <label class="font-weight-bold">Physical ID</label> 
                            <v-text-field class="mt-1" label="" :disabled="form.epc_exists" :rules="[value => !!value || 'This field is required']" 
                                density="compact" v-model="form.name"/>
                        </div>
                    </VCol>
                    <VCol md="3" class="ml-4">
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
                  
                    <VCol md="2" offset="3" class="d-flex flex-column justify-center align-center text-center">
                         
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
                <!-- Enable add to existing if there's atleast 1 registered tag  -->
                <v-btn block color="primary-2" :disabled="!form.epc_exists" @click="handleAddExisting"  style="color: #fefaeb !important;">
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
                    <th class="text-center text-uppercase bg-primary px-6 py-2 font-weight-black" style="background-color: #00833c !important; color: white !important; border-right: 1px solid #fff">action</th>
                    <th class="text-center text-uppercase bg-primary px-6 py-2 font-weight-black" style="background-color: #00833c !important; color: white !important;">status</th>
                </tr>
            </thead>
            <tbody>
                <tr v-if="tags.length === 0">
                    <td colspan="7" class="text-center">No data available</td>
                </tr>
                <tr v-for="(item, index) in tags" :key="item.tid" :class="{'light-green' : item.status !== 'unregistered' && item.status !== 'unregistered TID'}">
                    <td>{{ item.epc }}</td>
                    <td>{{ item.tid }}</td>
                    <td>{{ item.rssi }}</td>
                    <td>{{ item.reader }}</td>
                    <td class="text-center">{{ item.antenna }}</td>
                    <td class="text-center">
                            <v-btn v-if="item.status == 'unregistered' || item.status == 'unregistered TID'" 
                                class="ma-2"
                                color="error"
                                @click="removeItem(index)"
                                icon="ri-delete-bin-6-line"
                            ></v-btn>
                    </td>
                    <td class="text-center">
                        <template v-if="item.status === 'unregistered'">
                            <v-chip color="primary-2" variant="flat" class="text-uppercase text-grey-100">
                                <span class="px-5 font-weight-bold">{{item.status}}</span>
                            </v-chip>
                        </template>
                        <template v-else-if="item.status === 'unregistered TID'">
                            <v-chip :color="'#af922b'" variant="flat" class="text-uppercase text-grey-100">
                                <span class="px-1 font-weight-bold">{{item.status}}</span>
                            </v-chip>
                        </template>
                        <template v-else>
                            <v-chip color="primary" variant="flat" class="text-uppercase text-grey-100">
                                <span class="px-10 font-weight-bold">{{item.status}}</span>
                            </v-chip>
                        </template>
                    </td>
                </tr>
            </tbody>
        </v-table>
    </v-card>
    <AddingModal @close="cancelAdd" :show="addExistingModal" >
        <template #default>
            <div class="text-h4 text-grey-800 mb-4 font-weight-medium">
                Are you sure you want to add unregistered tags to an existing tag with physical ID of 
                <strong class="text-primary font-weight-black">{{ form.name }}</strong>?
            </div>
            <div class="d-flex justify-end align-center mt-8">
                <v-btn color="secondary" variant="outlined" @click="cancelAdd" class="px-12 mr-3">Cancel</v-btn>
                <v-btn @click="addToExistingTag" color="primary" class="px-12" type="submit" :loading="addingLoading">
                    Update
                </v-btn>
            </div>
        </template>
    </AddingModal>

    <ResponseModal :show="responseModal" @close="responseModal = false">
        <template #default>
            <div class="py-4 text-center">
                <v-icon
                    class="mb-2"
                    color="primary"
                    icon="ri-information-line"
                    size="128"
                ></v-icon>

                <div class="text-h5 font-weight-bold"> 
                    {{ responseMessage }}
                </div>
            </div>
            <div class="d-flex justify-end align-center mt-8">
                <v-btn color="primary" class="px-12" type="button" @click="responseModal = false">
                    Okay
                </v-btn>
            </div>
        </template>
    </ResponseModal>

    <Loader :show="showLoader"/>
    <Toast :show="toast.show" :message="toast.message"/>
</template>

<style src="vue-multiselect/dist/vue-multiselect.css"></style>

<style scoped>

.light-green {
    background-color: #cce6d8 !important;
}

</style>
