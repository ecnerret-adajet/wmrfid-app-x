<script setup>
import { READER_STATUS } from '@/composables/useEnums';
import ApiService from '@/services/ApiService';
import { ref } from 'vue';
import { VDataTableServer } from 'vuetify/components';

const editDialog = ref(false)
const deleteDialog = ref(false)

const serverItems = ref([])
const loading = ref(true)
const totalItems = ref(0)
const itemsPerPage = ref(10)

const headers = [
    {
        title: 'READER NAME',
        key: 'name',
    },
    {
        title: 'READER TYPE',
        key: 'reader_type_id',
    },
    {
        title: 'STATUS',
        key: 'status',
    },
    {
        title: 'ACTIONS',
        key: 'actions',
    },
]

const loadItems = () => {
    loading.value = true
    ApiService.query('datatable/readers')
        .then((response) => {
            totalItems.value = response.data.total;
            serverItems.value = response.data.data
            loading.value = false
        })
        .catch((error) => {
            console.log(error);
        });
}


const editItem = (item) => {

}

const deleteItem = (item) => {

}

defineExpose({
    loadItems
})

</script>

<template>
    <VDataTableServer
        v-model:items-per-page="itemsPerPage"
        :headers="headers"
        :items="serverItems"
        :items-length="totalItems"
        :loading="loading"
        item-value="name"
        @update:options="loadItems"
        class="text-no-wrap"
    >

    <template #item.reader_type_id="{ item }">
        <!-- Use the reader_type_name instead of reader_type_id -->
        {{ item.reader_type?.name }}
    </template>

    <template #item.status="{ item }">
        <div class="d-flex gap-1 ml-3">
            <VBadge v-if="item.status == READER_STATUS.ACTIVE" content="ACTIVE" color="success pa-3 "  />
            <VBadge v-else content="INACTIVE" color="error pa-3"  />
        </div>
    </template>
    
    <!-- Actions -->
    <template #item.actions="{ item }">
      <div class="d-flex gap-1">
        <IconBtn
          size="small"
          @click="editItem(item)"
        >
          <VIcon icon="ri-pencil-line" />
        </IconBtn>
        <IconBtn
          size="small"
          @click="deleteItem(item)"
        >
          <VIcon icon="ri-delete-bin-line" />
        </IconBtn>
      </div>
    </template>
  </VDataTableServer>
</template>
