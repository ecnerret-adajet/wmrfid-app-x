<script setup>
import EditingModal from '@/components/EditingModal.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import Toast from '@/components/Toast.vue';
import { generateSlug } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import Moment from "moment";
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { VDataTableServer } from 'vuetify/components';

import JwtService from '@/services/JwtService';
import { useAuthStore } from '@/stores/auth';
import axios from 'axios';

const authStore = useAuthStore();

const emits = defineEmits(['pagination-changed']);

const props = defineProps({
    search: {
        type: String,
        default: ''
    },
    plantsOption: Array
});

const editDialog = ref(false);
const selectedWarehouse = ref(null);
const isLoading = ref(false);
const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref('-created_at'); // Default sort
const errorMessage = ref(null)
const filters = ref(null);
const router = useRouter();
const multipleMaterialModal = reactive({
    show: false,
    title: 'Allow Multiple Materials in Blocks?',
    message: 'Enabling this allows multiple materials to be placed in warehouse block.',
    warehouse: null,
    loading: false,
    value: false,
});

const headers = computed(() => {
    const baseHeaders = [
        { title: 'WAREHOUSE', key: 'name' },
        { title: 'CODE', key: 'code' },
        { title: 'PLANT', key: 'plant_id' },
        { title: 'STORAGE LAYERS', key: 'layer_count', align: 'center', sortable: false },
        { title: 'LAST UPDATED AT', key: 'updated_at' },
    ];
    if (authStore.user?.is_super_admin) {
        baseHeaders.splice(4, 0, {
            title: 'Allow Multiple Materials',
            key: 'blocks_allow_multiple_materials',
            sortable: false,
        align: 'center',
        });
    }

    baseHeaders.push({
        title: 'ACTIONS',
        key: 'actions',
        sortable: false,
        align: 'center',
    });

    return baseHeaders;
});

const loadItems = ({ page, itemsPerPage, sortBy, search }) => {
    
    loading.value = true
    if (sortBy && sortBy.length > 0) {
        const sort = sortBy[0];  // Assuming single sort field
        sortQuery.value = `${sort.key}`;  // Default ascending order
        if (sort.order === 'desc') {
            sortQuery.value = `-${sort.key}`;  // Prefix with minus for descending order
        }
    } else {
        sortQuery.value = '-created_at';
    }

    ApiService.query('datatable/warehouse',{
        params: {
            page,
            itemsPerPage,
            sort: sortQuery.value,
            search: props.search,
            filters: filters.value
        }
        })
        .then((response) => {
            totalItems.value = response.data.total;
            serverItems.value = response.data.data.map(item => ({
                ...item,
                blocks_allow_multiple_materials_bool: !!item.blocks_allow_multiple_materials
            }));
            loading.value = false

            emits('pagination-changed', { page, itemsPerPage, sortBy: sortQuery.value, search: props.search });
        })
        .catch((error) => {
            console.log(error);
        });
}

const toast = ref({
    message: 'Warehouse updated successfully!',
    color: 'success',
    show: false
});

const editItem = (item) => {
    selectedWarehouse.value = item;
    form.value.name = item.name;
    form.value.code = item.code;
    form.value.plant_id = item.plant_id;
    form.value.layer_count = item.layer_count;
    errorMessage.value = '';
    editDialog.value = true;
}  


const handleUpdate = async () => {
    isLoading.value = true;
    toast.value.show = false
    try {
        const response = await ApiService.put(`warehouse/${selectedWarehouse.value.id}/update`, form.value)
        isLoading.value = false;
        editDialog.value = false
        loadItems({
            page: page.value,
            itemsPerPage: itemsPerPage.value,
            sortBy: [{key: 'created_at', order: 'desc'}],
            search: props.search
        });
        toast.value.message = 'Warehouse updated successfully!'
        toast.value.show = true;
    } catch (error) {
        errorMessage.value = error.response?.data?.message || 'An unexpected error occurred.';
        console.error('Error updating:', error);
        isLoading.value = false;
    }
}

const applyFilters = (data) => {
    filters.value = data;
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{key: 'created_at', order: 'desc'}],
        search: props.search
    });
}

const form = ref({
    'name': null,
    'code': null,
    'plant_id': null,
    'layer_count': null,
});

const viewMap = (item) => {
    if (authStore.user?.is_warehouse_operator) {
        router.push({
            path: `operator/${generateSlug(item.name)}/movement`,
        });
    } else {
        router.push({
            path: `/warehouse-map/${generateSlug(item.name)}`,
        });
    }
    
}

const handleAllowMultiple = async () => {
    multipleMaterialModal.loading = true
    try {
        const token = JwtService.getToken();
        const flag = multipleMaterialModal.warehouse?.blocks_allow_multiple_materials == false ? true : false;

        const response = await axios.patch(
            `warehouse/${multipleMaterialModal.warehouse?.id}/update-multiple-materials-flag`,
            {
                blocks_allow_multiple_materials: flag
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (response.data) {
            toast.value.message = 'Warehouse updated successfully!';
            toast.value.show = true;
            loadItems({
                page: page.value,
                itemsPerPage: itemsPerPage.value,
                sortBy: [{key: 'created_at', order: 'desc'}],
                search: props.search
            });
        }
    } catch (error) {
        console.error('Error updating warehouse:', error);
    } finally {
        multipleMaterialModal.loading = false;
        multipleMaterialModal.show = false;
    }
}

const onToggleSwitch = (warehouse) => {
    if (warehouse) {
        multipleMaterialModal.warehouse = warehouse;
        multipleMaterialModal.title = warehouse.blocks_allow_multiple_materials == false ?
            `Allow Multiple Materials` : `Disallow Multiple Materials`;
        multipleMaterialModal.message = warehouse.blocks_allow_multiple_materials == false ?
            `Enabling this will allow multiple materials in <strong>${warehouse.name}</strong> to be placed in a warehouse block.` : 
            `Disabling this will prevent multiple materials from being placed in the warehouse block at <strong>${warehouse.name}</strong>`;
        multipleMaterialModal.show = true;
    }
}

const handleViewWarehouse = (item) => {
    router.push({
        path: `/warehouse/${generateSlug(item.name)}/overview`,
    });
}

defineExpose({
    loadItems,
    applyFilters
})


</script>

<template>
    <VDataTableServer
        v-model:items-per-page="itemsPerPage"
        :headers="headers"
        :items="serverItems"
        :items-length="totalItems"
        :loading="loading"
        item-value="id"
        :search="search"
        @update:options="loadItems"
        class="text-no-wrap"
    >

    <template v-slot:headers="{ columns, isSorted, getSortIcon, toggleSort }">
      <tr>
        <template v-for="column in columns" :key="column.key">
          <th>
            <div class="d-flex justify-center align-center">
              <span
                class="me-2 cursor-pointer"
                @click="column.sortable && toggleSort(column)"
                v-text="column.title"
              ></span>

              <v-icon
                v-if="isSorted(column)"
                :icon="getSortIcon(column)"
                color="medium-emphasis"
              ></v-icon>

                <v-tooltip v-if="column.key == 'blocks_allow_multiple_materials'" 
                    text="Enabling this allows multiple materials to be placed in warehouse block.">
                    <template v-slot:activator="{ props }">
                        <i v-bind="props" class="ri-question-line text-xl"></i>
                    </template>
                </v-tooltip>
            </div>
          </th>
        </template>
      </tr>
    </template>

    <template #item.name="{ item }">
        <span @click="handleViewWarehouse(item)" class="text-primary font-weight-bold cursor-pointer hover-underline">
            {{ item.name }}
        </span>
    </template>

    <template #item.blocks_allow_multiple_materials="{ item }">
        <v-switch
            class="d-flex justify-center" readonly
            :model-value="item.blocks_allow_multiple_materials_bool"
            @change="onToggleSwitch(item)" 
            color="primary"
        ></v-switch>
    </template>

    <template #item.plant_id="{ item }">
        {{ item.plant?.name }}
    </template>

    <template #item.created_at="{ item }">
        {{ item.created_at ? Moment(item.created_at).format('MMMM D, YYYY') : '' }}
    </template>

    <template #item.updated_at="{ item }">
        {{ item.updated_at ? Moment(item.updated_at).format('MMMM D, YYYY') : '' }}
    </template>

    <!-- Actions -->
    <template #item.actions="{ item }">
      <div class="d-flex gap-1 justify-center align-center">

        <IconBtn v-if="authStore.user?.is_super_admin || authStore.user?.is_warehouse_admin"
          size="small"
          @click="editItem(item)"
        >
          <VIcon icon="ri-pencil-line" />
        </IconBtn>
        <IconBtn
          size="small"
          @click="viewMap(item)"
        >
          <VIcon icon="ri-map-2-line" />
        </IconBtn>
      </div>
    </template>
    </VDataTableServer>
    <EditingModal v-if="form.name && form.code" @close="editDialog = false" 
        :show="editDialog" :dialog-title="`Update ${selectedWarehouse.name}`">
        <template #default>
            <v-form @submit.prevent="handleUpdate">
                <v-select class="mt-4" label="Select Plant" density="compact"
                    :items="plantsOption" v-model="form.plant_id"
                    :rules="[value => !!value || 'Plant is required']"
                >
                </v-select>
                <div class="mt-4">
                    <v-text-field class="mt-6" density="compact" 
                        label="Layer Count"
                        v-model="form.layer_count" 
                        type="number"
                        :min="1"
                        :max="10"
                        hint="This sets the level of layer in the warehouse"
                        :rules="[value => !!value || 'Storage layer count is required']"
                    />
                </div>
                <v-text-field class="mt-6" density="compact" 
                    label="Name"
                    v-model="form.name" 
                    :rules="[value => !!value || 'Name is required']"
                />
                <v-text-field class="mt-6" density="compact" 
                    label="Code"
                    v-model="form.code" 
                    :rules="[value => !!value || 'Code is required']"
                />
            </v-form>
            <VAlert v-if="errorMessage" class="mt-4" color="error" variant="tonal">
                {{ errorMessage }}
            </VAlert>
            <div class="d-flex justify-end align-center mt-4">
                <v-btn color="secondary" variant="outlined" @click="editDialog = false" class="px-12 mr-3">Cancel</v-btn>
                <PrimaryButton @click="handleUpdate" color="primary" class="px-12" type="submit" :loading="isLoading">
                    Update
                </PrimaryButton>
            </div>
        </template>
    </EditingModal>

    <v-dialog v-model="multipleMaterialModal.show" max-width="600px" persistent>
    
        <v-sheet class="px-4 pt-8 pb-4 text-center mx-auto" elevation="12" max-width="600" rounded="lg" width="100%">
            <v-icon
                class="mb-5"
                color="primary"
                icon="ri-information-line"
                size="112"
            ></v-icon>

            <h2 class="text-h4">{{ multipleMaterialModal.title }}</h2>
            <p class="text-subtitle text-grey-700 font-weight-medium mb-6 mt-4" v-html="multipleMaterialModal.message">
            </p>
            <div class="text-end">
                <v-btn color="secondary" variant="outlined" @click="multipleMaterialModal.show = false" class="px-12 mr-3">Cancel</v-btn>
                <PrimaryButton @click="handleAllowMultiple" color="primary" class="px-12" :loading="multipleMaterialModal.loading">
                    Confirm
                </PrimaryButton>
            </div>
        </v-sheet>
    </v-dialog>

    <Toast :show="toast.show" :message="toast.message" color="success" @update:show="toast.show = $event"/>

</template>
