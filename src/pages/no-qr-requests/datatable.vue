<script setup>
import ApiService from '@/services/ApiService';
import Moment from 'moment';
import { ref } from 'vue';
import { VDataTableServer } from 'vuetify/components';

const emits = defineEmits(['summary-updated']);

const props = defineProps({
    search: {
        type: String,
        default: '',
    },
});

const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const filters = ref({ date_from: null, date_to: null });

const previewDialog = ref(false);
const previewImageUrl = ref(null);

const headers = [
    { title: 'PHYSICAL ID', key: 'physical_id', sortable: false },
    { title: 'BATCH', key: 'batch', sortable: false },
    { title: 'PLANT', key: 'plant_code', sortable: false },
    { title: 'SLOC', key: 'sloc', sortable: false },
    { title: 'PREVIOUS QR STATUS', key: 'previous_with_qr', sortable: false },
    { title: 'REQUESTED BY', key: 'user', sortable: false },
    { title: 'IMAGE', key: 'image_url', sortable: false },
    { title: 'REQUESTED AT', key: 'created_at', sortable: false },
];

const loadItems = ({ page: requestedPage, itemsPerPage: requestedPerPage, search }) => {
    loading.value = true;

    ApiService.query('no-qr-tag-logs', {
        params: {
            page: requestedPage,
            per_page: requestedPerPage,
            search: search || props.search,
            date_from: filters.value?.date_from,
            date_to: filters.value?.date_to,
        },
    })
        .then(response => {
            const { summary, logs } = response.data.data;

            totalItems.value = logs.total;
            serverItems.value = logs.data;
            page.value = logs.current_page;
            itemsPerPage.value = logs.per_page;
            loading.value = false;

            emits('summary-updated', summary);
        })
        .catch(error => console.error(error));
};

const applyFilters = data => {
    filters.value = data;
    loadItems({
        page: 1,
        itemsPerPage: itemsPerPage.value,
        search: props.search,
    });
};

const openPreview = imageUrl => {
    previewImageUrl.value = imageUrl;
    previewDialog.value = true;
};

defineExpose({ loadItems, applyFilters });
</script>

<template>
    <VDataTableServer
        v-model:items-per-page="itemsPerPage"
        v-model:page="page"
        :headers="headers"
        :items="serverItems"
        :items-length="totalItems"
        :loading="loading"
        item-value="id"
        :search="search"
        @update:options="loadItems"
        class="text-no-wrap"
    >
        <template #item.previous_with_qr="{ item }">
            <v-chip size="small" :color="item.previous_with_qr ? 'success' : 'error'" variant="tonal" class="text-uppercase">
                {{ item.previous_with_qr ? 'With QR' : 'No QR' }}
            </v-chip>
        </template>

        <template #item.user="{ item }">
            {{ item.user?.name ?? '—' }}
        </template>

        <template #item.image_url="{ item }">
            <v-avatar
                v-if="item.image_url"
                size="40"
                rounded="lg"
                class="cursor-pointer"
                @click="openPreview(item.image_url)"
            >
                <v-img :src="item.image_url" cover />
            </v-avatar>
            <span v-else>—</span>
        </template>

        <template #item.created_at="{ item }">
            {{ item.created_at ? Moment(item.created_at).format('MMMM D, YYYY h:mm A') : '' }}
        </template>
    </VDataTableServer>

    <v-dialog v-model="previewDialog" max-width="500">
        <v-card>
            <v-img :src="previewImageUrl" />
            <v-card-actions>
                <v-spacer />
                <v-btn variant="text" @click="previewDialog = false">Close</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>
