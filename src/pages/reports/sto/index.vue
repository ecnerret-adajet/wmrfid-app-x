<script setup>
import { numberWithComma } from '@/composables/useHelpers';
import ApiService from '@/services/ApiService';
import { useAuthStore } from '@/stores/auth';
import Moment from 'moment';
import { computed, onMounted, reactive, ref } from 'vue';

const authStore = useAuthStore();
const todayStr = Moment().format('YYYY-MM-DD');

const filters = reactive({
	search: '',
	dateFrom: todayStr,
	dateTo: todayStr,
	plant_code: authStore.user?.assigned_plant?.plant_code || null,
	direction: 'inbound',
	mode: null,
	status_type: null,
});

const summary_count = reactive({
	total_items: 0,
	complete_assign: 0,
	partial_assign: 0,
	no_assigned: 0,
});

const selectedKpiStatus = ref(filters.status_type);

const kpiCards = computed(() => [
	{
		label: 'Total Items',
		value: summary_count.total_items,
		statusType: 'total_items',
		caption: 'Total STO items',
		color: 'info',
		icon: 'ri-file-list-line',
	},
	{
		label: 'Complete Assign',
		value: summary_count.complete_assign,
		statusType: 'complete_assign',
		caption: 'Fully assigned pallets',
		color: 'primary',
		icon: 'ri-checkbox-circle-line',
	},
	{
		label: 'Partial Assign',
		value: summary_count.partial_assign,
		statusType: 'partial_assign',
		caption: 'Partially assigned pallets',
		color: 'warning',
		icon: 'ri-flashlight-line',
	},
	{
		label: 'No Assigned',
		value: summary_count.no_assigned,
		statusType: 'no_assigned',
		caption: 'No pallets assigned',
		color: 'error',
		icon: 'ri-error-warning-line',
	},
]);

const handleKpiClick = (kpi) => {
	selectedKpiStatus.value = kpi.statusType;
	filters.status_type = kpi.statusType;
	page.value = 1;
	handleSearch();
};

const isLoading = ref(false);
const plantsOption = ref([]);
const fetchDropdownData = async () => {
    isLoading.value = true;
    try {
        let endpoint = 'application-requests/get-data-dropdown';

        // Check if filters.plant_code is a valid, non-null value
        if (filters.plant_code) {
            endpoint += `/${filters.plant_code}`;
        }

        const preReqData = await ApiService.get(endpoint);
        const { plants, types } = preReqData.data;

        plantsOption.value = plants.map(item => ({
            value: item.plant_code,
            title: `${item.plant_code} - ${item.name}`,
            name: item.name
        }));

    } catch (error) {
        console.error('Error fetching data:', error);
    } finally {
        isLoading.value = false;
    }
};

const appliedFilters = ref({ ...filters });

const directions = [
	{ title: 'Inbound', value: 'inbound' },
	{ title: 'Outbound', value: 'outbound' },
];

const modes = [
	{ title: 'All', value: null },
	{ title: 'Palletized', value: 'pallet_inbound' },
	{ title: 'Bags to Pallet', value: 'bags_to_pallet' },
];

const headers = computed(() => [
	{ title: 'STO NO.', key: 'sto_number' },
	{ title: 'MATERIAL DOCUMENT', key: 'material_document' },
	{ title: 'MATERIAL', key: 'material' },
	...(filters.direction === 'outbound' ? [] : [{ title: 'BATCH', key: 'batch' }]),
	{ title: 'ISSUING PLANT', key: 'issuing_plant' },
	{ title: 'RECEIVING PLANT', key: 'receiving_plant' },
	{ title: 'DIRECTION', key: 'direction' },
	...(filters.direction === 'outbound' ? [] : [{ title: 'MODE', key: 'mode' }]),
	{ title: 'ENTRY QTY', key: 'entry_qty' },
	{ title: 'PALLETS REQUIRED', key: 'required_pallets', align: 'center' },
	{ title: 'PALLETS ASSIGNED', key: 'pallets_assigned', align: 'center' },
	{ title: 'STATUS', key: 'status', align: 'center' },
	{ title: 'PO CREATED AT', key: 'created_at' },
	{ title: 'PROCESSED BY', key: 'processed_by' },
	{ title: 'PROCESSED AT', key: 'processed_at' },
]);

const handleSearch = () => {
	loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{ key: 'created_at', order: 'desc' }],
        filters: filters,
        search: searchValue.value
    });
};

const statusColor = status => ({
	Completed: 'success',
	'In Progress': 'warning',
	Pending: 'secondary',
}[status]);

const loading = ref(true);
const serverItems = ref([]);
const totalItems = ref(0);
const itemsPerPage = ref(50);
const page = ref(1);
const sortQuery = ref('-created_at'); // Default sort
const searchValue = ref('');

const loadItems = ({ page, itemsPerPage, sortBy }) => {
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

    ApiService.query(`reports/sto/${filters.direction}`, {
        params: {
            page,
            itemsPerPage,
            sort: sortQuery.value,
            search: searchValue.value,
            filters: filters
        }
    })
        .then((response) => {
            const payload = response.data;
			console.log(payload)
            if (payload.table?.original) {
                serverItems.value = payload.table?.original?.data;   // Current page raw line records array
                totalItems.value = payload.table?.original?.total;   // Total absolute matched lines for footer
                summary_count.total_items = payload.table?.original?.kpi_summary?.total_items || 0;
				summary_count.complete_assign = payload.table?.original?.kpi_summary?.complete_assign || 0;
				summary_count.partial_assign = payload.table?.original?.kpi_summary?.partial_assign || 0;
				summary_count.no_assigned = payload.table?.original?.kpi_summary?.no_assigned || 0;
            }

            loading.value = false;
        })
        .catch((error) => {
            console.log(error);
        });
}

function removeLeadingZeros(value) {
    if (!value) return '';
    return value.replace(/^0+/, '');
}

onMounted(() => {
    fetchDropdownData();
})

function getQuantityColor(item) {
    const assigned = parseInt(item.total_assigned_pallets) || 0;
    const required = parseInt(item.required_pallets) || 0;
    
    if (assigned === required && required > 0) return 'primary'; // Perfectly matches SAP
    if (assigned > required) return 'error'; // Over-assigned alert!
    if (assigned > 0 && assigned < required) return 'warning'; // Partial progress
    return 'grey'; 
}

function getStatusColor(status) {
    const colors = {
      complete_assign: 'primary',     // Or explicit Hex: '#4CAF50'
      partial_assign: 'warning',     // Or explicit Hex: '#FF9800'
      no_assigned: 'error'      // Or explicit Hex: '#607D8B'
    };
    return colors[status] || 'grey';
}

function formatStatusText(status) {
	return (status || '').replace('_', ' ');
}

</script>

<template>
	<VRow align="center" >
		<VCol cols="12" md="3">
			<v-text-field
				v-model="filters.search"
				label="Search"
				placeholder="STO number, material document, or user"
				prepend-inner-icon="ri-search-line"
				density="compact"
				hide-details
				@keyup.enter="handleSearch"
			/>
		</VCol>
		<VCol cols="12" sm="6" md="2">
			<v-text-field v-model="filters.dateFrom" label="Date From" type="date" density="compact" hide-details />
		</VCol>
		<VCol cols="12" sm="6" md="2">
			<v-text-field v-model="filters.dateTo" label="Date To" type="date" density="compact" hide-details />
		</VCol>
		<VCol cols="12" sm="6" md="3">
			<v-select class=" align-center mt-1" label="Filter by Plant"
				density="compact"
				:items="plantsOption.length > 1 ? [{ title: 'All', value: null }, ...plantsOption] : plantsOption"
				v-model="filters.plant_code"
				:rules="[value => value !== undefined || 'Please select an item from the list']">
			</v-select>
		</VCol>
	
		<VCol cols="12" sm="6" md="2">
			<v-select v-model="filters.direction" label="Direction" :items="directions" density="compact" hide-details />
		</VCol>
	</VRow>

	<VRow align="center" class="mb-2">
		<VCol cols="12" sm="6" md="2">
			<v-select v-model="filters.mode" label="Mode" :items="modes" density="compact" hide-details />
		</VCol>
		<VCol cols="12" md="1" class="d-flex align-center">
			<v-btn block prepend-icon="ri-search-eye-line" @click="handleSearch">
				Search
			</v-btn>
		</VCol>
	</VRow>

	<VRow class="processing-kpis my-2" aria-live="polite">
		<VCol
			v-for="(kpi, kpiIndex) in kpiCards"
			:key="kpi.label"
			cols="12"
			sm="6"
			md="3"
			lg="3"
		>
			<v-card class="processing-kpi-card h-100 cursor-pointer processing-kpi-card-hover"
				:class="[
					`processing-kpi-card--${kpi.color}`,
					selectedKpiStatus === kpi.statusType ? 'processing-kpi-card--selected' : '',
				]"
				@click="handleKpiClick(kpi)"
				variant="tonal"
			>
				<div class="d-flex align-start justify-space-between ga-3">
					<div>
						<div class="text-body-2 text-medium-emphasis">{{ kpi.label }}</div>
						<div class="text-h4 font-weight-bold mt-1">{{ numberWithComma(kpi.value) }}</div>
						<div class="text-caption text-medium-emphasis mt-1">{{ kpi.caption }}</div>
					</div>
					<v-icon size="28" :color="kpi.color">{{ kpi.icon }}</v-icon>
				</div>
			</v-card>
		</VCol>
	</VRow>

	<VCard>
		<VCardItem>
			<VCardTitle>STO Transactions</VCardTitle>
			<!-- <VCardSubtitle>{{ filteredTransactions.length }} processed transaction{{ filteredTransactions.length === 1 ? '' : 's' }}</VCardSubtitle> -->
		</VCardItem>

		<VDataTableServer v-model:items-per-page="itemsPerPage" :items-per-page-options="[10, 25, 50, 100]" :headers="headers" :items="serverItems"
            :items-length="totalItems" :loading="loading" item-value="id" @update:options="loadItems"
            class="text-no-wrap fixed-column-table">

			<template #header.material_document="{ column }">
				<span>MATERIAL</span><br />
				<span>DOCUMENT</span>
			</template>

			<template #header.issuing_plant="{ column }">
				<span>ISSUING</span><br />
				<span>PLANT</span>
			</template>

			<template #header.receiving_plant="{ column }">
				<span>RECEIVING</span><br />
				<span>PLANT</span>
			</template>

			<template #header.required_pallets="{ column }">
				<span>REQUIRED</span><br />
				<span>PALLETS</span>
			</template>

			<template #header.pallets_assigned="{ column }">
				<span>PALLETS</span><br />
				<span>ASSIGNED</span>
			</template>

			<template #item.sto_number="{ item }">
				<span class="font-weight-bold">{{ item.purchase_order_line }}</span><br />
                <span>{{ item?.purchase_order_number || item?.po_number }}</span><br />
            </template>

			<template #item.material_document="{ item }">
                <span> {{ item.stock_transfer?.material_document || '—' }}</span>
            </template>

			<template #item.entry_qty="{ item }">
                <span>{{ numberWithComma(item.entry_quantity || 0) }} {{ item.entry_uom || '' }}</span>
            </template>

			<template #item.mode="{ item }">
                <span v-if="item.pallet_assignment_logs?.at(0)?.mode === 'pallet_inbound'">PALLETIZED</span>
				<span v-else-if="item.pallet_assignment_logs?.at(0)?.mode === 'bags_to_pallet'">BAGS TO PALLET</span>
            </template>

			<template #item.batch="{ item }">
                <span>{{ item?.batch }}</span>
            </template>

			<template #item.material="{ item }">
				<span class="font-weight-bold">{{ removeLeadingZeros(item?.material_code) }}</span><br />
                <span>{{ item.material?.material_description || '—' }}</span>
            </template>

            <template #item.issuing_plant="{ item }">
				<span>{{ item.stock_transfer?.purchase_order?.items?.at(0)?.supplying_plant || '—' }}</span> - 
                <span>{{ item.stock_transfer?.purchase_order?.items?.at(0)?.issuing_sloc_sto || '—' }}</span>
            </template>

			<template #item.receiving_plant="{ item }">
				<span>{{ item.stock_transfer?.purchase_order?.items?.at(0)?.plant || '—' }}</span> - 
                <span>{{ item.stock_transfer?.purchase_order?.items?.at(0)?.storage_location || '—' }}</span>
            </template>

			<template #item.required_pallets="{ item }">
				<span class="font-weight-bold text-body-1 grey--text text--darken-2">
					{{ item.required_pallets || 0 }}
				</span>
			</template>

			 <template #item.pallets_assigned="{ item }">
				<v-chip
				:color="getQuantityColor(item)"
				label
				outlined
				class="font-weight-black"
				>
				{{ item.total_assigned_pallets }}
				</v-chip>
			</template>

			<template #item.status="{ item }">
				<v-chip
				:color="getStatusColor(item.computed_status)"
				text-color="white"
				small
				class="text-uppercase font-weight-bold shadow-sm"
				>
				{{ formatStatusText(item.computed_status) }}
				</v-chip>
			</template>
    
            <template #item.processed_by="{ item }">
                {{ item.user?.name || '' }}
            </template>

            <template #item.processed_at="{ item }">
                {{ item.processed_at ? Moment(item.processed_at).format('MM/DD/YYYY hh:mm A') : '' }}
            </template>

			<template #item.created_at="{ item }">
                {{ item.created_at ? Moment(item.created_at).format('MM/DD/YYYY hh:mm A') : '' }}
            </template>
            
        </VDataTableServer>
	</VCard>
</template>
<style scoped>
.processing-kpis {
    margin-top: 1px;
    margin-bottom: 16px;
}

.processing-kpi-card-hover {
    transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.processing-kpi-card-hover:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
}

.processing-kpi-card {
    padding: 18px;
    border-left: 5px solid currentColor;
}

.processing-kpi-card--primary {
    color: rgb(var(--v-theme-primary));
}

.processing-kpi-card--success {
    color: rgb(var(--v-theme-success));
}

.processing-kpi-card--warning {
    color: rgb(var(--v-theme-warning));
}

.processing-kpi-card--secondary {
    color: rgb(var(--v-theme-secondary));
}

.processing-kpi-card--error {
    color: rgb(var(--v-theme-error));
}

.processing-kpi-card--info {
    color: rgb(var(--v-theme-info));
}

.processing-kpi-card--selected {
    border: 2px solid rgb(var(--v-theme-primary));
    box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.14), 0 8px 22px rgba(0, 0, 0, 0.08);
    background-color: rgba(var(--v-theme-primary), 0.08);
    transform: translateY(-1px);
}
</style>
