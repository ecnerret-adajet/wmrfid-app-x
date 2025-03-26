<script setup>
import SearchInput from '@/components/SearchInput.vue';
import Toast from '@/components/Toast.vue';
import { debounce } from 'lodash';
import { ref } from 'vue';
import datatable from './datatable.vue';

const searchValue = ref('');
const datatableRef = ref(null);
const tablePerPage = ref(10);
const tablePage = ref(1);
const tableSort = ref('-created_at')
const toast = ref({
    message: 'New production line successfully created!',
    color: 'success',
    show: false
});

onMounted(() => {
})

const handleSearch = debounce((search) => {
    searchValue.value = search;
}, 500);

const onPaginationChanged = ({ page, itemsPerPage, sortBy, search }) => {
    tableSort.value = sortBy
    tablePage.value = page
    tablePerPage.value = itemsPerPage
    searchValue.value = search
}

</script>

<template>
    <VRow>
        <VCol md="12">
            <SearchInput @update:search="handleSearch"/>
        </VCol>
        <!-- Prepare button for filter -->
        <!-- <VCol md="2" class="d-flex justify-center align-center">
            <v-btn block @click="openDialog">Add New Production Line</v-btn>
        </VCol> -->
    </VRow>

    <VCard>
        <datatable ref="datatableRef" @pagination-changed="onPaginationChanged" 
            :search="searchValue"
        />
    </VCard>
 
    <Toast :show="toast.show" :message="toast.message"/>
</template>
