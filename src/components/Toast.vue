<script setup>
import { ref } from 'vue';


const props = defineProps({
    color: {
        type: String,
        default: 'success'
    },
    show: {
        type: Boolean,
        default: false
    },
    message: {
        type: String,
        default: ''
    }
})



const snackbarVisible = ref(props.show)

watch(
  () => props.show,
  (newVal) => {
    snackbarVisible.value = newVal;
  }, {immediate: true}
)

</script>


<template>
    <v-snackbar
        v-model="snackbarVisible"
        location="top end"
        :color="color"
        timeout="3000"
    >
        {{ message }}
    </v-snackbar>

</template>
