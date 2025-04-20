<script setup>
import { ref } from 'vue';

const totalItems = ref(0);
const itemsPerPage = ref(5);
const serverItems = ref([]);
const page = ref(1);

const headers = [
    {
        title: 'RUN ID',
        key: 'production_run_id',
        sortable: false
    },
    {
        title: 'MATERIAL',
        key: 'material_id',
        sortable: false
    },
    {
        title: 'STATUS',
        key: 'status',
        sortable: false
    },
    {
        title: 'QUANTITY',
        key: 'quantity',
        sortable: false
    },
    
    {
        title: 'START DATE TIME',
        key: 'start_time',
        sortable: false
    },
    {
        title: 'END DATE TIME',
        key: 'end_time',
        sortable: false
    }
]

const loadItems = ({ page, itemsPerPage, sortBy, search }) => {
    
}

</script>
<template>
    <VDataTableServer 
            v-model:items-per-page="itemsPerPage"
            :headers="headers"
            :items="serverItems"
            :items-length="totalItems"
            item-value="id"
            @update:options="loadItems"
            class="text-no-wrap"
    ></VDataTableServer>
</template>
