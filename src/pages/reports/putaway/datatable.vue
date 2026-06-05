<script setup>
import Toast from '@/components/Toast.vue';
import { useAuthStore } from '@/stores/auth';
import { ref } from 'vue';

const emits = defineEmits(['pagination-changed']);

const authStore = useAuthStore();

const props = defineProps({
    search: {
        type: String,
        default: ''
    },
    readersOption: {
        type: Array,
        default: () => []
    },
    tagTypesOption: {
        type: Array,
        default: () => []
    }
});

const editDialog = ref(false);
const deleteDialog = ref(false);
const selectedProductionLine = ref(null);
const isLoading = ref(false);
const serverItems = ref([]);
const loading = ref(true);
const totalItems = ref(0);
const itemsPerPage = ref(10);
const page = ref(1);
const sortQuery = ref('-created_at'); // Default sort
const errorMessage = ref(null)
const filters = ref(null);



const toast = ref({
    message: 'Production line deleted successfully!',
    color: 'success',
    show: false
});

const applyFilters = (data) => {
    filters.value = data;
    loadItems({
        page: page.value,
        itemsPerPage: itemsPerPage.value,
        sortBy: [{key: 'created_at', order: 'desc'}],
        search: props.search
    });
}

defineExpose({
    loadItems,
    applyFilters
})

</script>

<template>
    

    <Toast :show="toast.show" :message="toast.message"/>

</template>
