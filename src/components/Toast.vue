<script setup>
import { ref } from 'vue';


const props = defineProps({
    color: {
        type: String,
        default: 'primary'
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

const emit = defineEmits(['update:show']);


const snackbarVisible = ref(props.show)

watch(
  () => props.show,
  (newVal) => {
    snackbarVisible.value = newVal;
  }, {immediate: true}
)

const onSnackbarHidden = () => {
  emit('update:show', false);
};

</script>


<template>
    <v-snackbar
        v-model="snackbarVisible"
        location="top end"
        :color="color"
        timeout="3000"
        @update:modelValue="onSnackbarHidden"
    >
        {{ message }}
    </v-snackbar>

</template>
