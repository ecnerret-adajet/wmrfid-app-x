<script setup>
import DefaultModal from '@/components/DefaultModal.vue';
import Toast from '@/components/Toast.vue';
import UnauthorizedPage from '@/components/UnauthorizedPage.vue';
import ApiService from '@/services/ApiService';
import Moment from "moment";
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { VDataTableServer } from 'vuetify/components';

const emits = defineEmits(['pagination-changed']);

const props = defineProps({
    search: {
        type: String,
        default: ''
    },
});

const router = useRouter();

const isLoading = ref(false);
const shipmentData = ref([]);
const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref('-created_at'); // Default sort
const filters = ref(null);
const showShipmentServiceModal = ref(false);
const applictionRequestTypes = ref([]);
const form = reactive({
    application_request_type: '',
    remarks: '',
    bu_shipment: ''
});

const headers = [
    {
        title: 'ACTION',
        key: 'action',
        align: 'center',
        sortable: false,
    },
    // {
    //     title: 'Details',
    //     key: 'details',
    //     align: 'center',
    //     sortable: false,
    // },
    {
        title: 'SHIPMENT NUMBER',
        key: 'shipment_number',
    },
    {
        title: 'BAY NO',
        key: 'bay_no',
        align: 'center',
        sortable: false,
    },
    {
        title: 'HAULER',
        key: 'hauler_name',
    },
    {
        title: 'DRIVER',
        key: 'driver_name',
    },
    {
        title: 'PLATE NUMBER',
        key: 'plate_number',
    },
    // {
    //     title: 'LOAD END',
    //     key: 'load_end_date',
    // },
    {
        title: 'STATUS',
        key: 'status',
        align: 'center',
        sortable: false,
    },
    // {
    //     title: 'ACTION',
    //     key: 'action',
    //     align: 'center',
    //     sortable: false,
    // },
]

const unauthorizedFlag = ref(false);
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

    ApiService.query('datatable/shipments', {
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
            serverItems.value = response.data.data
            console.log(serverItems.value);
            
            loading.value = false

            emits('pagination-changed', { page, itemsPerPage, sortBy: sortQuery.value, search: props.search });
        })
        .catch((error) => {
            if (error.response && error.response.status === 403) {
                unauthorizedFlag.value = true;
            } else {
                toast.value.message = 'An error occurred while loading data.';
                toast.value.color = 'error';
                toast.value.show = true;
            }

            loading.value = false
        });
}

const toast = ref({
    message: 'Toast message!',
    color: 'success',
    show: false
});

const applyFilters = (data) => {
    filters.value = data;
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{ key: 'created_at', order: 'desc' }],
        search: props.search
    });
}

const items = [
    { title: 'View Picklist' },
    { title: 'View Curtain Screen' },
]

const handleViewShipment = (shipment) => {
    router.push(`/shipments/${shipment.shipment_number}`);
}

const handleViewPicklist = (shipment) => {
    router.push(`/shipment-picklist/${shipment.shipment_number}`);
}

const actionList = [
    // { title: 'Service Request', key: 'service_request' },
    { title: 'View Details', key: 'view_details' },
    { title: 'View Checker Screen', key: 'view_checker_screen' },
]

const handleAction = (shipment, action) => {
    shipmentData.value = shipment;
    
    if(action.key == 'service_request') {
        showShipmentServiceModal.value = true;
    } else if (action.key == 'view_checker_screen') {
        const params = new URLSearchParams();
        if (shipment.reader_id !== undefined && shipment.reader_id !== null) {
            params.append('reader_id', shipment.reader_id);
        }
        if (shipment.bay_no !== undefined && shipment.bay_no !== null) {
            params.append('bay_no', shipment.bay_no);
        }

        const qs = params.toString();
        const url = `/shipment-picklist/${encodeURIComponent(shipment.shipment_number)}${qs ? `?${qs}` : ''}`;

        window.open(url, '_blank', 'noopener');
        return;
    } else if (action.key == 'view_details') {
        window.open(`/shipments/${shipment.shipment_number}`, '_blank', 'noopener');
    }

}

const closeModal = () => {
    showShipmentServiceModal.value = false;
}

const saveShipmentService = () => {

    form.bu_shipment = shipmentData.value.shipment_number;

    ApiService.post('application-request/shipment-service-request', form)
        .then((response) => {
            toast.value.message = 'Application request created successfully.';
            toast.value.color = 'success';
            toast.value.show = true;
            showShipmentServiceModal.value = false;
        })
        .catch((error) => {
            console.error('Error creating application request:', error);
            toast.value.message = 'An error occurred while creating application request.';
            toast.value.color = 'error';
            toast.value.show = true;
        });
}

const fetchApplicationRequestType = () => {
    ApiService.get('application-request/types')
        .then((response) => {
            applictionRequestTypes.value = response.data.map(item => ({
                value: item.id,
                title: item.name
            }));
        })
        .catch((error) => {
            console.error('Error fetching application request types:', error);
        });
}

const formatDateTime = (date, time) => {
    // Pad time to 6 digits if needed (for 'HHmmss' format)
    let formattedDate = Moment(date).format('YYYY-MM-DD');
    
    return Moment(`${formattedDate} ${time}`, 'YYYY-MM-DD HH:mm:ss').format('MMMM D, YYYY hh:mm:ss A');
};


onMounted(() => {
    fetchApplicationRequestType();
});


defineExpose({
    loadItems,
    applyFilters
})


</script>

<template>

    <VDataTableServer v-model:items-per-page="itemsPerPage" :headers="headers" :items="serverItems"
        :items-length="totalItems" :loading="loading" item-value="id" :search="search" @update:options="loadItems"
        class="text-no-wrap">

         <!-- Actions -->
         <template #item.action="{ item }">
            <div class="d-flex justify-center gap-1">
                <v-menu location="end"> 
                    <template v-slot:activator="{ props }">
                        <v-btn icon="ri-more-2-line" variant="text" v-bind="props" color="grey"></v-btn>
                    </template>
                    <v-list>
                        <v-list-item
                            @click="handleAction(item, action)"
                            v-for="(action, i) in actionList"
                                :key="i"
                                :value="i"
                            >
                            <v-list-item-title>{{ action.title }}</v-list-item-title>
                        </v-list-item>
                    </v-list>
                </v-menu>
            </div>
        </template>

        <!-- <template #item.details="{ item }">
            <v-btn v-if="item.load_end_date === null" :to="{
                        path: `/shipment-picklist/${item.shipment_number}`,
                        query: { reader_id: item.reader_id, bay_no: item.bay_no  }
                    }"
                    color="primary-2"
                    variant="outlined"
                    size="small"
                >
                    View Picklist
            </v-btn>
            <v-btn v-else :to="{
                        path: `/shipments/${item.shipment_number}`,
                        query: { reader_id: item.reader_id, bay_no: item.bay_no  }
                    }"
                    color="primary"
                    variant="outlined"
                    size="small"
                >
                    View Details
            </v-btn>
        </template> -->
        

        <template #item.shipment_number="{ item }">
            {{ item.shipment_number }}
        </template>

         <template #item.plate_number="{ item }">
            {{ item.plate_number_1 || item.plate_number_2 || item.plate_number_3 || ''  }}
        </template>

        <template #item.bay_no="{ item }">
            <span v-if="item.bay_no">{{ item.bay_no }}</span>
            <v-chip v-else class="ma-2" color="warning" outlined label>
                Pending
            </v-chip>
        </template>


        <template #item.load_start_date="{ item }">
            {{ formatDateTime(item.load_start_date, item.load_start_time) }}
        </template>

        <template #item.load_end_date="{ item }">
            <span v-if="item.load_end_date">
                {{ formatDateTime(item.load_end_date, item.load_end_time) }}
            </span>
            <span v-else>
                <v-chip  class="ma-2" color="warning" outlined label>
                    Pending
                </v-chip>
            </span>
        </template>

        <template #item.updated_at="{ item }">
            {{ item.updated_at ? Moment(item.updated_at).format('MMMM D, YYYY') : '' }}
        </template>
        <template #item.status="{ item }">
            <v-chip v-if="item.load_end_date === null"  class="ma-2" color="warning" outlined label>
                Pending
            </v-chip>
            <v-chip v-else class="ma-2" color="success" outlined label>
                Completed
            </v-chip>
        </template>

    </VDataTableServer>

    <DefaultModal :show="showShipmentServiceModal" :dialogTitle="'Shipment Service Request - ' + shipmentData.shipment_number"
        @close="closeModal">
        <template #default>
            <v-form>
                <div>
                    <v-select class="mt-1" label="Request Type" density="compact" :items="applictionRequestTypes"
                        v-model="form.application_request_type"></v-select>
                </div>
                <div class="mt-4">
                    <v-textarea class="mt-1" label="Remarks" density="compact" v-model="form.remarks"></v-textarea>
                </div>
                <div class="d-flex justify-end align-center mt-8">
                    <v-btn color="secondary" variant="outlined" @click="closeModal" class="px-8 mr-3">Cancel</v-btn>
                    <v-btn color="primary" @click="saveShipmentService" class="px-8">Proceed</v-btn>
                </div>
            </v-form>
        </template>
    </DefaultModal>

    <Toast :show="toast.show" :message="toast.message" />
    <UnauthorizedPage :show="unauthorizedFlag" @close="unauthorizedFlag = false" />
</template>

<style scoped>
.hover-underline {
    position: relative;
    text-decoration: none;
}

.hover-underline:hover::after {
    content: "";
    position: absolute;
    left: 0;
    bottom: 1px;
    width: 100%;
    height: 1px;
    background-color: #00833c;
}
</style>
