<script setup>
import AddingModal from '@/components/AddingModal.vue';
import Loader from '@/components/Loader.vue';
import { useRfidPalletStore } from '@/stores/RfidPalletStore';
import PrimaryButton from '@/components/PrimaryButton.vue';
import ResponseModal from '@/components/ResponseModal.vue';
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';


import { echo } from '@/utils/echo';
import axios from 'axios';
import { onMounted, computed, reactive, nextTick, watch, ref } from 'vue';
import { useRoute } from 'vue-router';


let palletStore = useRfidPalletStore();

const route = useRoute();
const isLoading = ref(false);
const addingLoading = ref(false);
const formRef = ref(null);
const errorMessage = ref(null);
const showLoader = ref(false);
const addExistingModal = ref(false);
const addToExisitingModal = ref(false);
const tags = ref([]);
const handheldTags = ref([]);
const handheldReaders = ref([]);
const readTag = ref(null);
const readerType = ref('antenna');
const unregisteredTags = ref([]);
const unregisteredIdTags = ref([]);
const registeredTags = ref([]);
const responseModal = ref(false);
const tagTypesOption = ref([]);
const responseMessage = ref('Not all unregistered EPC values are the same. Please ensure that all tags you are processing share the same EPC.');

// Get values from the URL
const tagType = route.params.type;
const storageLocation = route.params.location ?? null;
const plantCode = route.params.plant;

palletStore.filter.plant_code = plantCode;
palletStore.filter.storage_location = storageLocation;

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
    epc_exists: true,
    tag_value: null
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
        return response.data;
    } catch (error) {
        return null;
    }
};

const seenKeys = new Set()

const onHandheldReaderTrigger = async (data) => {
    // Extract incoming reads
    // Check different possible data structures
    let tagValue = null;
    
    if (data && data.tag) {
        // Direct tag property
        tagValue = data.tag;
    } else if (data && data.data && data.data.tag) {
        // Nested tag in data property
        tagValue = data.data.tag;
    } else if (data && typeof data === 'string') {
        // Direct string value
        tagValue = data;
    } else {
        return;
    }
    
    if (tagValue) {
        // For broadcast events, directly add the tag without duplicate checking
        await addBroadcastTag(tagValue);
    }
}

// Handle client-side events (manually entered tags from other clients)
// This handles the same format as the HandheldReaderEvent
const onClientTagWhisper = async (data) => {
    if (data && data.tag) {
        // Process broadcast tags without duplicate checking
        await addBroadcastTag(data.tag);
    }
}

// Track recently added tags to prevent duplicates from broadcasts
const recentlyAddedTags = new Set();

// Function to add tags received from broadcasts without duplicate checking
const addBroadcastTag = async (tagValue) => {
    if (!tagValue || tagValue.trim() === '') {
        return;
    }
    
    // Check if this tag was recently added locally
    // This prevents double-adding on the originating page
    if (recentlyAddedTags.has(tagValue)) {
        return;
    }
    
    // Check if the tag already exists in the handheldTags array
    const tagExists = handheldTags.value.some(tag => tag.epc === tagValue);
    if (tagExists) {
        return;
    }
    
    // Create a new tag object
    const newTag = {
        epc: tagValue,
        tid: null,
        status: 'Unregistered',
        isRegistered: false,
        pallet_name: null,
        pallet_id: null,
    };
    
    // Add the tag
    handheldTags.value.push(newTag);
    
    // Update tag arrays and UI
    updateTagArrays();
    
    // Check if this tag is registered in the pallet store
    checkTagRegistration(tagValue);
}

// Check if a tag is registered in the pallet store
const checkTagRegistration = async (tagValue) => {
    try {
        // Find the tag in the handheldTags array
        const tagIndex = handheldTags.value.findIndex(tag => tag.epc === tagValue);
        if (tagIndex === -1) return;
        
        // Set status to checking while API call is in progress
        handheldTags.value[tagIndex].status = 'Checking...';
        
        // Check if the tag is registered using the pallet store
        const isRegistered = await palletStore.checkTagRegistration(tagValue, plantCode);
        
        // Update the tag status based on the API response
        if (isRegistered && (isRegistered.status === true || isRegistered.status === 'true')) {
            handheldTags.value[tagIndex].status = 'Registered';
            handheldTags.value[tagIndex].isRegistered = true;
            handheldTags.value[tagIndex].pallet_name = isRegistered.data?.name || 'Unknown';
            handheldTags.value[tagIndex].pallet_id = isRegistered.data?.id;
        } else {
            handheldTags.value[tagIndex].status = 'Unregistered';
            handheldTags.value[tagIndex].isRegistered = false;
            handheldTags.value[tagIndex].pallet_name = null;
            handheldTags.value[tagIndex].pallet_id = null;
        }
    } catch (error) {
        console.error('Error checking tag registration:', error);
        // Find the tag again in case the array has changed
        const tagIndex = handheldTags.value.findIndex(tag => tag.epc === tagValue);
        if (tagIndex !== -1) {
            handheldTags.value[tagIndex].status = 'Error checking';
        }
    }
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
    // This function can be triggered both by manual input and by the handheld reader event
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
        status: 'Unregistered',
        isRegistered: false,
        pallet_name: null,
        pallet_id: null,
    };

    // Add the new tag to the handheldTags array
    handheldTags.value.push(newTag);
    
    // Add this tag to the recently added set to prevent double-adding when broadcast comes back
    recentlyAddedTags.add(newTag.epc);
    
    // Remove from the set after a short delay (after broadcast should have been received)
    setTimeout(() => {
        recentlyAddedTags.delete(newTag.epc);
    }, 2000);
    
    // Broadcast the tag to all clients if we have a selected reader
    // This will ensure all clients viewing this page with the same reader get the tag
    if (form.reader_name) {
        try {
            const selectedReader = handheldReaders.value.find(reader => reader.name === form.reader_name);
            if (selectedReader) {
                // Since public channels don't support client events directly,
                // we'll use a backend endpoint to broadcast the event
                try {
                    // Use the backend API endpoint that you've created
                    await axios.post('handheld-readers/boardcast', {
                        reader_id: selectedReader.id,
                        tag: newTag.epc,
                        // Include additional data that might be needed by the HandheldReaderEvent
                        data: {
                            tag: newTag.epc,
                            reader_name: selectedReader.name
                        }
                    });
                } catch (broadcastError) {
                    // Handle broadcast error silently
                }
            }
        } catch (error) {
            // Handle error silently
        }
    }
    
    // Store the tag value before clearing the input field
    const addedTagValue = newTag.epc;
    
    // Clear the input field
    readTag.value = null;
    
    // Update tag arrays and UI
    updateTagArrays();
    
    // Check if this tag is registered in the pallet store
    await checkTagRegistration(addedTagValue);
    
    // Focus the input field again
    nextTick(() => {
        const inputElement = document.getElementById('rfidTagInput');
        if (inputElement) {
            inputElement.focus();
        }
    });
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
    // Clear the readTag field when reader selection changes
    readTag.value = null;
    
    if (newReaderName) {
        // Find the selected reader to get its event_name
        const selectedReader = handheldReaders.value.find(reader => reader.name === newReaderName);
        
        if (selectedReader && selectedReader.event_name) {
            // Unsubscribe from any existing channels first
            echo.leaveAllChannels();
            
            // Subscribe to the public channel for the selected handheld reader
            // Using a public channel that doesn't require authentication
            const channel = echo.channel(`handheld-reader.${selectedReader.id}`);
            
            // Listen for server-side events
            channel.listen('HandheldReaderEvent', onHandheldReaderTrigger);
            
            // Listen for client-side events
            channel.listen('client-handheld-tag', onClientTagWhisper);
            
            // Channel subscription complete
            
            // Focus the input field now that a reader is selected
            nextTick(() => {
                const inputElement = document.getElementById('rfidTagInput');
                if (inputElement) {
                    inputElement.focus();
                }
            });
        }
    }
}, { immediate: true });


onMounted(async () => {
    // fetch pallets
    await palletStore.fetchExistingPallets();

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
            const channel = echo.channel(`handheld-reader.${selectedReader.id}`);
            
            // Listen for server-side events
            channel.listen('HandheldReaderEvent', onHandheldReaderTrigger);
            
            // Listen for client-side events
            channel.listen('client-handheld-tag', onClientTagWhisper);
            
            // Channel subscription complete
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
    palletStore.pallets = []
    handheldTags.value = []

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
                                :disabled="!form.reader_name"
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

    <v-card class="mx-8 mb-8">
        <VRow class="pa-4">
            <VCol cols="4" class="d-flex align-start">
                <div class="text-h5 font-weight-black ps-2">
                    {{ getTableLabel }} ({{ handheldTags.length }})
                </div>
            </VCol>
            <VCol cols="2" offset="5">
                <div>
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
            <VCol cols="1">
                <v-btn color="secondary" block  @click="handleClear" class="px-12">
                        Clear
                    </v-btn>
            </VCol>
        </VRow>
        
        <!-- Handheld Reader Table -->
        <v-table>
            <thead>
                <tr> 
                    <th colspan="2" class="text-left text-uppercase bg-primary px-6 py-2 font-weight-black"
                        style="background-color: #00833c !important; color: white !important; width: 90%;">TID tags</th>
                    <th class="text-center text-uppercase bg-primary px-6 py-2 font-weight-black"
                        style="background-color: #00833c !important; color: white !important; border-left: 1px solid #fff; border-right: 1px solid #fff; width: 10%;">
                        Status</th>
                </tr>
            </thead>
            <tbody>
                <tr v-if="handheldTags.length === 0">
                    <td colspan="3" class="text-center">No data available</td>
                </tr>
                <tr v-for="(item, index) in handheldTags" :key="item.epc" >
                    <td width="5%">
                        <v-menu> 
                            <template v-slot:activator="{ props }">
                                <v-btn icon="ri-more-2-line" variant="text" v-bind="props" color="gray"></v-btn>
                            </template>
                            <v-list>
                                <v-list-item @click="addExistingModal = true">
                                    <v-list-item-title>Add to existing</v-list-item-title>
                                </v-list-item>
                            </v-list>
                        </v-menu>
                    </td>
                    <td>{{ item.epc }}</td>
                    <td>
                        <v-badge v-if="!item.isRegistered"
                            :color="item.isRegistered ? 'success' : 'danger'"
                            :content="item.status"
                            class="text-uppercase"
                            inline
                            ></v-badge>
                        <v-badge v-if="item.isRegistered" color="primary" inline  :content="item.pallet_name" class="text-uppercase">
                        </v-badge>
                    </td>
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

    <AddingModal @close="cancelAdd" :show="addExistingModal" max-width="700px" :dialogTitle="'Add to Existing'">
        <template #default>
            <v-form @submit.prevent="addToExistingTag" ref="registrationModalForm">
                <div>
                    <v-autocomplete 
                        label="Select Pallet" 
                        density="compact" 
                        item-title="title" 
                        item-value="value"
                        :items="palletStore.palletOption" 
                        v-model="palletStore.form.selected_pallet_id"
                        :rules="[value => !!value || 'Please select a pallet from the list']"
                        :loading="palletStore.loading"
                    />
                </div>
                
                <div class="d-flex justify-end align-center mt-8">
                    <v-btn color="secondary" variant="outlined" @click="addExisitingModal = false"
                        class="px-12 mr-3">Cancel</v-btn>
                    <v-btn color="primary" type="submit" class="px-12">Proceed</v-btn>
                </div>
            </v-form>
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
