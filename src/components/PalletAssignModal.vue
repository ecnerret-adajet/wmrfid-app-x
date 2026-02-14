<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
    show: {
        type: Boolean,
        default: false
    },
    item: {
        type: Object,
        default: null
    }
});

const emit = defineEmits(['close', 'save']);

const dialogVisible = ref(props.show);
const selectedPallet = ref(null);
const addedPallets = ref([]);

// Dummy data for dropdown search
const availablePallets = ref([
    { id: 1, code: 'PLT-001', type: 'Standard' },
    { id: 2, code: 'PLT-002', type: 'Standard' },
    { id: 3, code: 'PLT-003', type: 'Euro' },
    { id: 4, code: 'PLT-004', type: 'Plastic' },
    { id: 5, code: 'PLT-005', type: 'Standard' },
]);

const headers = [
    { title: 'Pallet Code', key: 'code' },
    { title: 'Type', key: 'type' },
    { title: 'Actions', key: 'actions', sortable: false }
];

watch(() => props.show, (newVal) => {
    dialogVisible.value = newVal;
    if (newVal) {
        // Reset state when opening
        selectedPallet.value = null;
        addedPallets.value = []; 
    }
});

watch(() => dialogVisible.value, (newVal) => {
    if (!newVal) {
        emit('close');
    }
});

const addPallet = () => {
    if (selectedPallet.value) {
        // Check if already added
        const exists = addedPallets.value.find(p => p.id === selectedPallet.value.id);
        if (!exists) {
            addedPallets.value.push(selectedPallet.value);
            selectedPallet.value = null; // Reset selection
        }
    }
};

const removePallet = (item) => {
    addedPallets.value = addedPallets.value.filter(p => p.id !== item.id);
};

const handleSave = () => {
    emit('save', addedPallets.value);
    dialogVisible.value = false;
};

</script>

<template>
    <v-dialog v-model="dialogVisible" max-width="900px" scrollable>
        <v-card class="d-flex flex-column" height="600px">
            <v-card-title class="d-flex justify-space-between align-center pa-4">
                <span class="text-h5">Assign Pallets</span>
                <v-btn icon="ri-close-line" variant="text" @click="dialogVisible = false"></v-btn>
            </v-card-title>

            <v-divider></v-divider>

            <v-card-text class="flex-grow-1 overflow-y-auto">
                <div v-if="item" class="mb-4 pa-3 bg-grey-lighten-4 rounded">
                   <div class="d-flex justify-space-between">
                        <div><strong>Material:</strong> {{ item.MATERIAL }}</div>
                        <div><strong>Batch:</strong> {{ item.BATCH }}</div>
                        <div><strong>Qty:</strong> {{ item.ENTRY_QNT }} {{ item.ENTRY_UOM }}</div>
                   </div>
                </div>

                <v-row align="center" class="mb-2">
                    <v-col cols="12" md="8">
                        <v-autocomplete
                            v-model="selectedPallet"
                            :items="availablePallets"
                            item-title="code"
                            item-value="id"
                            label="Search Pallet"
                            return-object
                            variant="outlined"
                            density="compact"
                            hide-details
                            placeholder="Type to search..."
                        ></v-autocomplete>
                    </v-col>
                    <v-col cols="12" md="4">
                        <v-btn color="primary" block @click="addPallet" :disabled="!selectedPallet">
                            Add Pallet
                        </v-btn>
                    </v-col>
                </v-row>

                <v-data-table
                    :headers="headers"
                    :items="addedPallets"
                    class="elevation-1 border rounded"
                    density="compact"
                >
                    <template #item.actions="{ item }">
                        <v-btn 
                            icon="ri-delete-bin-line" 
                            size="small" 
                            color="error" 
                            variant="text" 
                            @click="removePallet(item)"
                        ></v-btn>
                    </template>
                    <template #no-data>
                        <div class="pa-4 text-center text-grey">
                            No pallets assigned. Search and add pallets above.
                        </div>
                    </template>
                </v-data-table>
            </v-card-text>

            <v-divider></v-divider>

            <v-card-actions class="pa-4">
                <v-spacer></v-spacer>
                <v-btn variant="outlined" @click="dialogVisible = false">Cancel</v-btn>
                <v-btn color="primary" variant="elevated" @click="handleSave">Save Changes</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<style scoped>
/* Custom styles if needed */
</style>
