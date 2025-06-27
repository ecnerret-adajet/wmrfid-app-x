<script setup>
import AddingModal from '@/components/AddingModal.vue';
import Loader from '@/components/Loader.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import ResponseModal from '@/components/ResponseModal.vue';
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import { echo } from '@/utils/echo';
import axios from 'axios';
import { onMounted, computed, reactive, nextTick, watch, ref } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const isLoading = ref(false);
const addingLoading = ref(false);
const formRef = ref(null);
const errorMessage = ref(null);
const showLoader = ref(false);
const addExistingModal = ref(false);
const tags = ref([]);
const handheldTags = ref([]);
const handheldReaders = ref([]);
const readTag = ref(null);
const readerType = ref('antenna');
const unregisteredTags = ref([]);
const unregisteredIdTags = ref([]);
const registeredTags = ref([]);
const responseModal = ref(false);
const responseMessage = ref('Not all unregistered EPC values are the same. Please ensure that all tags you are processing share the same EPC.');

// Get values from the URL
const tagType = route.params.type;
const storageLocation = route.params.location ?? null;
const plantCode = route.params.plant;

const form = reactive({
    reader_name: null,
    storage_location: null,
    plant_code: plantCode,
    group_no: null,
    name: null,
    is_defective: 'no',
    reader_type: 'handheld',
    tag_type: null,
    to_be_added_tags: [],
    epc_exists: true
})

const removeItem = (index) => {

    const [removedTag] = uniqueTags.value.splice(index, 1)

    if (!removedTag) {
        return;
    }

    const removedKey = `${removedTag.epc}_${removedTag.tid}`
    seenKeys.delete(removedKey)

    const epc = getUniqueEpc(uniqueTags.value)
    if (epc) {
        getLastItem(epc)
    }
}

const getUniqueEpc = (tags) => {

    if (!Array.isArray(tags) || uniqueTags.value.length === 0) return null;

    const uniqueEpcs = new Set(uniqueTags.value.map(tag => tag.epc));
    return uniqueEpcs.size === 1 ? [...uniqueEpcs][0] : null;

};

const checkIfExists = async (epc = null, tid = null, tagType) => {
    try {
        const response = await axios.get('registration/check-reference', {
            params: { epc: epc, tid: tid, tag_type: tagType }
        });
        return response.data; // adjust based on your actual API response
    } catch (error) {
        console.error('CheckIfExists API error:', error);
        return null;
    }
};

const seenKeys = new Set()

const onHandheldReaderTrigger = async (data) => {
    // Extract incoming reads
    const incomingReads = data.tag_reads || []
    const justAdded = []  // will hold any tags we actually add

    // Collect new tags
    for (const tag of incomingReads) {
        const key = `${tag.epc}_${tag.tid}`
        if (!seenKeys.has(key)) {
            seenKeys.add(key)
            uniqueTags.value.push(tag)
            justAdded.push(tag)
        }
    }

    // If nothing new was added, skip showing loader & processing
    if (justAdded.length === 0) {
        return
    }

    // Only now do we show the loader and process the new tags
    showLoader.value = true

    await processTags()
    showLoader.value = false
}


async function onPalletRegistration(data) {
    // Extract incoming reads
    const incomingReads = data.palletRegistration.tag_reads || []
    const justAdded = []  // will hold any tags we actually add

    // Collect new tags
    for (const tag of incomingReads) {
        const key = `${tag.epc}_${tag.tid}`
        if (!seenKeys.has(key)) {
            seenKeys.add(key)
            uniqueTags.value.push(tag)
            justAdded.push(tag)
        }
    }

    // If nothing new was added, skip showing loader & processing
    if (justAdded.length === 0) {
        return
    }

    // Only now do we show the loader and process the new tags
    showLoader.value = true
    form.reader_name = data.palletRegistration.reader_name || null

    await processTags()
    showLoader.value = false
}

const uniqueTags = ref([]);
const processTags = async () => {
    // uniqueTags.value already contains only distinct (epc, tid) entries
    if (!Array.isArray(uniqueTags.value) || uniqueTags.value.length === 0) {
        return
    }

    // (Optional) Mismatch‐EPC check on the deduped list
    if (uniqueTags.value.length > 1 && !getUniqueEpc(uniqueTags.value)) {
        responseModal.value = true
    }

    getLastItem(uniqueTags.value[0]?.epc)

    // Step 2: Call API for each unique tag to assign status
    for (const tag of uniqueTags.value) {
        const result = await checkIfExists(tag.epc, tag.tid, tagType)
        if (result?.found) {
            tag.status = result.name
        } else if (result?.epc_exists) {
            tag.status = 'Unregistered TID'
        } else {
            tag.status = 'Unregistered'
        }
    }

    // Step 3: Split into registered / unregistered categories
    registeredTags.value = uniqueTags.value.filter(
        t => t.status !== 'Unregistered' && t.status !== 'Unregistered TID'
    )
    unregisteredTags.value = uniqueTags.value.filter(
        t => t.status === 'Unregistered'
    )
    unregisteredIdTags.value = uniqueTags.value.filter(
        t => t.status === 'Unregistered TID'
    )
}

const addHandheldTag = async () => {
    if (!readTag.value || readTag.value.trim() === '') {
        return;
    }

    // Check if the tag already exists in the handheldTags array
    const tagExists = handheldTags.value.some(tag => tag.epc === readTag.value);
    if (tagExists) {
        // Tag already exists, show a message or handle as needed
        errorMessage.value = 'This tag has already been added.';
        setTimeout(() => {
            errorMessage.value = null;
        }, 3000);
        readTag.value = null;
        return;
    }

    // Create a new tag object
    const newTag = {
        epc: readTag.value,
        tid: null, // Handheld readers might not provide TID
        status: null,
    };

    // Add the new tag to the handheldTags array
    handheldTags.value.push(newTag);
    
    // Clear the input field
    readTag.value = null;
    
    // Process the tag to check its status
    // const result = await checkIfExists(newTag.epc, newTag.tid, tagType);
    // if (result?.found) {
    //     newTag.status = result.name;
    // } else if (result?.epc_exists) {
    //     newTag.status = 'Unregistered TID';
    // } else {
    //     newTag.status = 'Unregistered';
    // }

    // Update the registered/unregistered tag arrays
    updateTagArrays();
}

const updateTagArrays = () => {
    // Update registered/unregistered tag arrays based on handheldTags
    registeredTags.value = handheldTags.value.filter(
        t => t.status !== 'Unregistered' && t.status !== 'Unregistered TID'
    );
    unregisteredTags.value = handheldTags.value.filter(
        t => t.status === 'Unregistered'
    );
    unregisteredIdTags.value = handheldTags.value.filter(
        t => t.status === 'Unregistered TID'
    );
}

const processHandheldTags = async () => {
    // uniqueTags.value already contains only distinct (epc, tid) entries
    if (!Array.isArray(handheldTags.value) || handheldTags.value.length === 0) {
        return
    }

    //check if the tags is existing, if true push new object else do not add

    for (const tag of handheldTags.value) {
        const result = await checkIfExists(tag.epc, tag.tid, tagType)
        if (result?.found) {
            tag.status = result.name
        } else if (result?.epc_exists) {
            tag.status = 'Unregistered TID'
        } else {
            tag.status = 'Unregistered'
        }
    }
    
    // Update the registered/unregistered tag arrays
    updateTagArrays();
}

const getHandheldReaders = async () => {
    showLoader.value = true;
    try {
        const response = await ApiService.post('handheld-readers', { plant_code: plantCode })
        .then((response) => {
            let data = response.data;
             // Transform the data to match the expected format for the dropdown
            handheldReaders.value = Array.isArray(data) ? data.map(reader => ({
                value: reader.name,
                name: reader.name,
                reader_name: reader.name,
                event_name: reader.event_name,
                id: reader.id
            })) : [];
            showLoader.value = false;
        })
        .catch((error) => {
            console.error('Error fetching data from handheld-readers:', error);
            showLoader.value = false;
        });
        
    } catch (error) {
        showLoader.value = false;
        console.error('Error fetching data from handheld-readers:', error);
    }
}

// Initialize readerType with form value
readerType.value = form.reader_type;

// Watch for changes in readerType and sync with form
watch(readerType, (newValue) => {
    form.reader_type = newValue;
    
    if (newValue === 'handheld') {
        nextTick(() => {
            const inputElement = document.getElementById('rfidTagInput');
            if (inputElement) {
                inputElement.focus();
            }
        });
    }
});

// Watch for changes in selected handheld reader and subscribe to the appropriate channel
watch(() => form.reader_name, (newReaderName) => {
    if (newReaderName) {
        // Find the selected reader to get its event_name
        const selectedReader = handheldReaders.value.find(reader => reader.name === newReaderName);
        
        if (selectedReader && selectedReader.event_name) {
            // Unsubscribe from any existing channels first
            echo.leaveAllChannels();
            
            // Subscribe to the public channel for the selected handheld reader
            // Using a public channel that doesn't require authentication
            echo.channel(`handheld-reader.${selectedReader.id}`)
                .listen(selectedReader.event_name, onHandheldReaderTrigger);
            
            console.log(`Subscribed to public channel: handheld-reader.${selectedReader.id} for event: ${selectedReader.event_name}`);
        }
    }
}, { immediate: true });

onMounted(async () => {
    await getHandheldReaders();
    // Focus the input field if reader type is handheld
    if (form.reader_type === 'handheld') {
        nextTick(() => {
            const inputElement = document.getElementById('rfidTagInput');
            if (inputElement) {
                inputElement.focus();
            }
        });
    }
    
    // If a reader is already selected, subscribe to its channel
    if (form.reader_name) {
        const selectedReader = handheldReaders.value.find(reader => reader.name === form.reader_name);
        if (selectedReader && selectedReader.event_name) {
            echo.channel(`handheld-reader.${selectedReader.id}`)
                .listen(selectedReader.event_name, onHandheldReaderTrigger);
            console.log(`Subscribed to public channel: handheld-reader.${selectedReader.id} for event: ${selectedReader.event_name}`);
        }
    }
})

const getLastItem = async (epc) => {
    showLoader.value = true;
    const url = `registration/get-last-tag?plant_code=${plantCode}&tag_type=${tagType}&epc=${epc}`;
    try {
        const response = await ApiService.query(url);
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
        if (uniqueTags.value.length === 0) {
            responseMessage.value = 'Tags seems to be empty. Please try again'
            responseModal.value = true
        } else {
            form.to_be_added_tags = uniqueTags.value.filter(tag => tag.status === 'Unregistered' || tag.status === 'Unregistered TID')
            form.storage_location = storageLocation;
            form.tag_type = tagType
            form.plant_code = plantCode;
            isLoading.value = true;
            toast.value.show = false;
            try {
                const response = await ApiService.post('register-rfid', form)
                isLoading.value = false;
                toast.value.message = 'RFID successfully registered!'
                toast.value.show = true;
                errorMessage.value = ''

                handleClear();
            } catch (error) {
                errorMessage.value = error.response?.data?.message || 'An unexpected error occurred.';
                console.error('Error submitting:', error);
                isLoading.value = false;
            }
        }

    }
}

const handleAddExisting = () => {
    const filteredTags = uniqueTags.value.filter(tag => tag.status === 'Unregistered' || tag.status === 'Unregistered TID');
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
    form.to_be_added_tags = uniqueTags.value.filter(tag => tag.status === 'Unregistered' || tag.status === 'Unregistered TID')
    form.storage_location = storageLocation;
    form.tag_type = tagType
    form.plant_code = plantCode

    addingLoading.value = true;

    try {
        const response = await ApiService.post('/registration/add-to-existing', form)
        addingLoading.value = false;
        toast.value.message = 'Tags successfully added to existing group'
        toast.value.show = true;
        addExistingModal.value = false;
        handleClear();
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
    form.plant_code = null;
}

const handleClear = () => {
    clearForm();

    // Clear tags and re-fetch
    uniqueTags.value = []
    seenKeys.clear();
    unregisteredIdTags.value = []
    unregisteredTags.value = []
    registeredTags.value = []

}

// Compute “commonEpc”: if all tags share the same epc, return that string; otherwise null
const commonEpc = computed(() => {
    if (!Array.isArray(uniqueTags.value) || uniqueTags.value.length === 0) {
        return null
    }
    const epcSet = new Set(uniqueTags.value.map((t) => t.epc))
    return epcSet.size === 1 ? [...epcSet][0] : null
})




</script>

<template>
    <v-card class="ma-8">
        <v-card-title class="d-flex justify-space-between align-center">
            <VRow>
                <VCol cols="6" class="d-flex align-start">
                    <v-btn :to="{
                        path: `/rfid`,
                    }" class="ma-2" color="grey-700" icon="ri-arrow-left-line" variant="text">
                    </v-btn>
                    <!-- <div class="text-h6 font-weight-black ps-2">
                        RFID Handheld Registration
                    </div> -->
                </VCol>
                <VCol cols="2" offset="4" class="d-flex align-center justify-end">
                    <v-btn color="primary" block variant="outlined" @click="handleClear" class="px-12">
                        Clear
                    </v-btn>
                </VCol>
            </VRow>
        </v-card-title>
        <v-card-text>
            <v-form @submit.prevent="submit" id="registerForm" ref="formRef">
                <VRow>
                    <VCol md="12">
                        <div class="mt-4">
                            <label class="font-weight-bold">Read Tag</label>
                            <v-text-field 
                                id="rfidTagInput"
                                class="mt-1" 
                                label="Read tag" 
                                density="compact"
                                v-model="readTag" 
                                ref="rfidTagInput"
                                @input="addHandheldTag"
                            />
                        </div>
                    </VCol>                    

                </VRow>
                <VRow>
                    <VCol md="12">
                        <div>
                            <label class="font-weight-bold">Handheld Readers</label>
                            <v-select
                                v-model="form.reader_name"
                                :items="handheldReaders"
                                item-title="name"
                                item-value="name"
                                density="compact"
                                variant="outlined"
                            >
                                <template v-slot:item="{ props, item }">
                                    <v-list-item v-bind="props" :title="item.raw.name" :subtitle="item.raw.event_name"></v-list-item>
                                </template>
                            </v-select>
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
                <div class="text-h5 font-weight-black ps-2">
                    {{ getTableLabel }}
                </div>
            </VCol>
            <!-- <VCol cols="2" offset="6">
                <v-btn block color="primary-2" :disabled="unregisteredIdTags.length === 0" @click="handleAddExisting"
                    style="color: #fefaeb !important;">
                    Add To Existing
                </v-btn>
            </VCol> -->
        </VRow>
        
        <!-- Handheld Reader Table -->
        <v-table>
            <thead>
                <tr>
                    <th class="text-left text-uppercase bg-primary px-6 py-2 font-weight-black"
                        style="background-color: #00833c !important; color: white !important;">epc tags</th>
                    <!-- <th class="text-center text-uppercase bg-primary px-6 py-2 font-weight-black"
                        style="background-color: #00833c !important; color: white !important; border-left: 1px solid #fff; border-right: 1px solid #fff">
                        action</th>
                    <th class="text-center text-uppercase bg-primary px-6 py-2 font-weight-black"
                        style="background-color: #00833c !important; color: white !important;">status</th> -->
                </tr>
            </thead>
            <tbody>
                <tr v-if="handheldTags.length === 0">
                    <td colspan="3" class="text-center">No data available</td>
                </tr>
                <tr v-for="(item, index) in handheldTags" :key="item.epc" >
                    <td>{{ item.epc }}</td>
                    <!-- <td class="text-center">
                        <v-btn v-if="item.status == 'Unregistered' || item.status == 'Unregistered TID'" class="ma-2"
                            color="error" @click="removeItem(index)" icon="ri-delete-bin-6-line"></v-btn>
                    </td>
                    <td class="text-center">
                        <template v-if="item.status === 'Unregistered'">
                            <v-chip color="primary-2" variant="flat" class="text-uppercase text-grey-100">
                                <span class="px-5 font-weight-bold">{{ item.status }}</span>
                            </v-chip>
                        </template>
                        <template v-else-if="item.status === 'Unregistered TID'">
                            <v-chip :color="'#af922b'" variant="flat" class="text-uppercase text-grey-100">
                                <span class="px-1 font-weight-bold">{{ item.status }}</span>
                            </v-chip>
                        </template>
                        <template v-else>
                            <v-chip color="primary" variant="flat" class="text-uppercase text-grey-100">
                                <span class="px-10 font-weight-bold">{{ item.status }}</span>
                            </v-chip>
                        </template>
                    </td> -->
                </tr>
            </tbody>
        </v-table>
    </v-card>
    <AddingModal @close="cancelAdd" :show="addExistingModal" max-width="700px">
        <template #default>
            <div class="text-center mx-auto">
                <v-icon class="mb-5" color="primary" icon="ri-function-add-line" size="64"></v-icon>
            </div>
            <div class="text-h4 text-center mb-4 text-medium-emphasis">
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
                <v-icon class="mb-2" color="primary" icon="ri-information-line" size="128"></v-icon>

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

    <Loader :show="showLoader" />
    <Toast :show="toast.show" :message="toast.message" />
</template>

<style src="vue-multiselect/dist/vue-multiselect.css"></style>

<style scoped>
.light-green {
    background-color: #cce6d8 !important;
}

.error-epc {
    background-color: #f3d1d1 !important;
    /* a light red/pink background */
}
</style>
