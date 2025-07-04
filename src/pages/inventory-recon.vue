<script setup>
import DatePicker from '@/components/DatePicker.vue';
import Loader from '@/components/Loader.vue';
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import JwtService from '@/services/JwtService';
import { echo } from '@/utils/echo';
import axios from 'axios';
import { onMounted, reactive } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const materialsOption = ref([]);
const plantData = ref(null);
const pageLoading = ref(false);
const errorMessage = ref(null);
const tagType = route.params.type;
const plantCode = route.params.plant;
const storageLocation = route.params.location ?? null;

const toast = ref({
    message: 'Success',
    color: 'success',
    show: false
});

onMounted(() => {
    loadData();
})

onMounted(() => {
    echo.channel('inventory-recon')
        .listen('InventoryReconEvent', onInventoryRecon);
})

const loadData = async () => {
    pageLoading.value = true;
    try {
        const token = JwtService.getToken();
        const response = await axios.get(`/admin/get-data-dropdown/${plantCode}`, {
            params: {
            },
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const { materials, plant } = response.data;

        materialsOption.value = materials.map(item => ({
            value: item.id,
            title: `${item.code} - ${item.description}`,
            numerator: item.numerator,
            denominator: item.denominator,
        }));

        plantData.value = plant;
        console.log(response.data);


    } catch (error) {
        console.log(error);
    } finally {
        pageLoading.value = false;
    }
}

const uniqueTags = ref([]);

const seenKeys = new Set()

async function onInventoryRecon(data) {
    // Extract incoming reads
    console.log(data);

    const incomingReads = data.inventoryRecon.tag_reads || [];
    const newTags = [];

    // Collect new tags (not seen before)
    for (const tag of incomingReads) {
        const key = `${tag.epc}`;
        if (!seenKeys.has(key)) {
            newTags.push(tag);
        }
    }

    // If nothing new was added, skip showing loader & processing
    if (newTags.length === 0) {
        return;
    }

    pageLoading.value = true;

    // Check each new tag for batch assignment before pushing
    for (const tag of newTags) {
        const result = await checkIfExists(tag.epc, null, tagType);
        if (result?.batch && result.batch !== 'No Assigned yet') {
            assignedBatchInfo.value = result.batch;
            showBatchAssignedModal.value = true;
            // Do NOT add this tag, and stop further processing
            pageLoading.value = false;
            return;
        } else {
            // Mark as seen and add to uniqueTags
            seenKeys.add(tag.epc);
            uniqueTags.value.push(tag);
        }
    }

    // Only process tags if at least one was added
    if (newTags.length > 0) {
        await processTags();
    }

    pageLoading.value = false;
}

const unregisteredTags = ref([]);
const registeredTags = ref([]);
const showBatchAssignedModal = ref(false);
const assignedBatchInfo = ref('');
const processTags = async () => {

    // Step 2: Call API for each unique tag to assign status
    for (const tag of uniqueTags.value) {
        const result = await checkIfExists(tag.epc, null, tagType)
        if (result?.found) {
            tag.status = result.name
            tag.batch = result.batch

            if (result.batch && result.batch !== 'No Assigned yet') {
                assignedBatchInfo.value = result.batch;
                showBatchAssignedModal.value = true;
                return; // Stop processing further tags
            }
        } else {
            tag.status = 'Unregistered'
        }
    }

    registeredTags.value = uniqueTags.value.filter(
        t => t.status !== 'Unregistered'
    )
    unregisteredTags.value = uniqueTags.value.filter(
        t => t.status === 'Unregistered'
    )

    // Show modal if any unregistered tags found
    if (unregisteredTags.value.length > 0) {
        showUnregisteredModal.value = true;
    }

}

const checkIfExists = async (epc = null, tid = null, tagType) => {
    try {
        const response = await axios.get('admin/inventory-recon/check-reference', {
            params: { epc: epc, tid: tid, tag_type: tagType }
        });
        return response.data; // adjust based on your actual API response
    } catch (error) {
        console.error('CheckIfExists API error:', error);
        return null;
    }
};

const showUnregisteredModal = ref(false);

const goToRfidRegistration = () => {
    uniqueTags.value = []
    let url = `/rfid-registration/${tagType}/${plantCode}`;
    if (storageLocation) {
        url += `/${storageLocation}`;
    }
    // Open in a new tab
    handleClear()
    window.open(url, '_blank');
}

const handleClear = () => {
    clearForm();
    // Clear tags and re-fetch
    uniqueTags.value = []
    seenKeys.clear();
    unregisteredTags.value = []
    registeredTags.value = []
}

const clearForm = () => {
    form.material_id = null;
    form.manufacture_date = null;
}

const form = reactive({
    material_id: null,
    manufacture_date: null
})

const closeBatchAssigned = () => {
    showBatchAssignedModal.value = false;
}

const assignLoading = ref(false);
const assignBatch = async () => {
    try {
        form.tags = registeredTags.value;
        const response = await ApiService.post('admin/inventory-recon', form)
        toast.value.message = 'Batch assigned to palllet successfully!'
        toast.value.show = true;
        handleClear();
    } catch (error) {
        errorMessage.value = error.response?.data?.message || 'An unexpected error occurred.';
        console.error('Error submitting:', error);
    } finally {
        assignLoading.value = false;

    }
}

</script>

<template>
    <v-card class="ma-4 pa-4 elevation-2 rounded-lg">

        <div class="d-flex align-center justify-space-between mb-4">
            <span class="text-h4 text-primary font-weight-semibold">Inventory Recon</span>
            <v-btn color="secondary" variant="outlined" @click="handleClear" class="ml-auto">
                <v-icon start icon="ri-close-circle-line"></v-icon>
                Clear
            </v-btn>
        </div>

        <!-- Plant & Storage Location Info -->
        <v-row class="mb-6 mt-3" align="center" justify="space-between">
            <v-col cols="12" md="6">
                <div class="d-flex align-center">
                    <v-avatar color="primary" size="36" class="mr-3">
                        <v-icon class="mb-1" color="white" icon="ri-building-3-line"></v-icon>
                    </v-avatar>
                    <div>
                        <div class="text-caption text-grey-600 font-weight-bold">Plant</div>
                        <div class="text-h6 font-weight-bold">{{ plantData?.plant_code }}</div>
                        <div class="text-body-2 text-grey-700">{{ plantData?.name }}</div>
                    </div>
                </div>
            </v-col>
            <v-col cols="12" md="6">
                <div class="d-flex align-center">
                    <v-avatar color="primary" size="36" class="mr-3">
                        <v-icon class="mb-1" color="white" icon="ri-database-line"></v-icon>
                    </v-avatar>
                    <div>
                        <div class="text-caption text-grey-600 font-weight-bold">Storage Location</div>
                        <div class="text-h6 font-weight-bold">{{ plantData?.default_storage_location?.code }}</div>
                        <div class="text-body-2 text-grey-700">{{ plantData?.default_storage_location?.name }}</div>
                    </div>
                </div>
            </v-col>
        </v-row>

        <!-- Form Section -->
        <v-form class="mb-6">
            <v-row>
                <v-col cols="12" md="6">
                    <v-autocomplete class="mt-1" id="from_material" density="compact" item-title="title"
                        item-value="value" :items="materialsOption" v-model="form.material_id"
                        :rules="[value => !!value || 'Please select an item from the list']" label="From Material"
                        variant="outlined" color="primary" clearable />
                </v-col>
                <v-col cols="12" md="6">
                    <DatePicker class="mt-1" id="manufacture_date" v-model="form.manufacture_date"
                        placeholder="Select Manufacturing Date" label="Manufacture Date" variant="outlined"
                        color="primary" />
                </v-col>
            </v-row>
        </v-form>

        <!-- Table Section -->
        <v-card class="pa-0" flat>
            <v-table class="rounded-lg elevation-1">
                <thead>
                    <tr>
                        <th class="text-left text-uppercase font-weight-black" style="background:#00833c; color:white;">
                            EPC</th>
                        <th class="text-center text-uppercase font-weight-black"
                            style="background:#00833c; color:white;">Batch</th>
                        <th class="text-center text-uppercase font-weight-black"
                            style="background:#00833c; color:white;">Reader</th>
                        <th class="text-center text-uppercase font-weight-black"
                            style="background:#00833c; color:white;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-if="uniqueTags.length === 0">
                        <td colspan="4" class="text-center py-6 text-grey-500">No data available</td>
                    </tr>
                    <tr v-for="(item, index) in uniqueTags" :key="item.tid" :class="{
                        'light-green': item.status !== 'Unregistered' && item.status !== 'Unregistered TID'
                    }">
                        <td class="py-3 px-4">{{ item.epc }}</td>
                        <td class="py-3 px-4 text-center">{{ item.batch }}</td>
                        <td class="py-3 px-4 text-center">{{ form.reader_name }}</td>
                        <td class="py-3 px-4 text-center">
                            <v-chip :color="item.status === 'Unregistered' ? 'primary-2' : 'primary'" variant="flat"
                                class="text-uppercase text-grey-100 font-weight-bold"
                                :class="item.status === 'Unregistered' ? 'px-5' : 'px-10'">
                                {{ item.status }}
                            </v-chip>
                        </td>
                    </tr>
                </tbody>
            </v-table>
            <div class="d-flex justify-end mt-4 mb-2">
                <v-btn :loading="assignLoading"
                    :disabled="registeredTags.length === 0 || form.manufacture_date === null || form.material_id === null"
                    color="primary px-8" variant="flat" @click="assignBatch">
                    Assign Batch
                </v-btn>
            </div>
        </v-card>

        <v-dialog v-model="showUnregisteredModal" persistent max-width="500">
            <v-card class="pa-4">
                <v-card-title class="text-h6 font-weight-bold">
                    Unregistered RFID Tags Found
                </v-card-title>
                <v-card-text>
                    Some tags are not registered. Would you like to go to the RFID registration page?
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn color="secondary" variant="text" @click="showUnregisteredModal = false">Cancel</v-btn>
                    <v-btn color="primary" variant="flat" @click="goToRfidRegistration">Go to Registration</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-dialog v-model="showBatchAssignedModal" persistent max-width="420">
            <v-card class="pa-6 rounded-lg elevation-10">
                <div class="d-flex flex-column align-center mb-2">
                    <v-avatar color="primary" size="56" class="mb-3">
                        <v-icon size="32" color="white" icon="ri-error-warning-line"></v-icon>
                    </v-avatar>
                    <div class="text-h6 font-weight-bold text-center mb-1">
                        Pallet Already Has Assigned Batch
                    </div>
                    <div class="text-body-1 text-center mb-2">
                        This pallet already has assigned inventory batch:<br>
                        <span class="font-weight-bold text-primary text-h5">{{ assignedBatchInfo }}</span>
                    </div>
                    <div class="text-body-2 text-center text-grey-darken-1 mb-2">
                        Please proceed to another pallet.
                    </div>
                </div>
                <v-card-actions class="justify-end mt-2">
                    <v-btn color="primary px-6" variant="flat" @click="closeBatchAssigned">OK</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <Loader :show="pageLoading" />
    </v-card>
    <Toast :show="toast.show" :message="toast.message" :color="toast.color" @update:show="toast.show = $event" />

</template>


<style scoped>
.light-green {
    background-color: #cce6d8 !important;
}

.error-epc {
    background-color: #f3d1d1 !important;
    /* a light red/pink background */
}
</style>
