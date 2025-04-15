<script setup>
import Toast from '@/components/Toast.vue';
import ApiService from '@/services/ApiService';
import JwtService from '@/services/JwtService';
import { useAuthStore } from '@/stores/auth';
import { ref, watch } from 'vue';

const emit = defineEmits(['close']);

const props = defineProps({
    show: {
        type: Boolean,
        default: false
    },
});

const dialogVisible = ref(props.show);
const isPasswordVisible = ref(false)
const isConfirmPasswordVisible = ref(false)
const isLoading = ref(false)
const errorMessage = ref(null);

const requiredValidator = (value) => !!value || 'This field is required'
const matchPasswordValidator = (value) => {
    return value === form.value.password ? true : 'Passwords do not match';
};

const allowedSymbolsValidator = (value) => {
  // Regex to allow alphanumeric and common symbols, including curly braces
  const regex = /^[a-zA-Z0-9!@#$%^&*()_+={}\[\]:;"'<>,.?/|\\~-]+$/;
  return regex.test(value) || 'Password can only contain alphanumeric characters and symbols (!, @, #, $, %, {, })';
};

watch(
  () => props.show,
  (newVal) => {
    dialogVisible.value = newVal;
  }
)

watch(
    () => dialogVisible.value,
    (newVal) => {
        if (!newVal) {
            emit('close')
        }
    }
)

const form = ref({
  password: '',
  confirmPassword: '',
})

const toast = ref({
    message: 'You have successfully updated your password',
    color: 'success',
    show: false
});

const authStore = useAuthStore();

const handleUpdate = async () => {
    isLoading.value = true;
    errorMessage.value = null;
    toast.value.show = false
    try {
        const token = JwtService.getToken(); // Get the token manually
        const response = await ApiService.vueInstance.axios.post('update-password', form.value, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        toast.value.message = 'You have successfully updated your password';
        toast.value.show = true;
        isLoading.value = false;
        authStore.verifyAuth()
        authStore.hidePasswordModal();
    } catch (error) {
        isLoading.value = false;
        errorMessage.value = error.response?.data?.message || 'An unexpected error occurred.';
    }
}

</script>
<template>
    <v-dialog v-model="dialogVisible" max-width="600px" persistent>
      <VCard class="auth-card pa-4 pt-7">
            <VCardItem class="justify-center">
                    <!-- <div class="d-flex" v-html="logo" /> -->
            </VCardItem>
            <VCardText class="pt-2">
                <h4 class="text-h4 mb-1">
                    Please create your password
                </h4>
                <p class="mb-0">
                    Create a password you'll remember and keep it secure
                </p>
            </VCardText>

            <VCardText>
                <VForm @submit.prevent="handleUpdate"  ref="refForm">
                    <VRow>
                    
                        <VCol cols="12">
                            <VTextField
                                v-model="form.password"
                                label="Password"
                                placeholder="············"
                                :type="isPasswordVisible ? 'text' : 'password'"
                                autocomplete="password"
                                :rules="[requiredValidator, allowedSymbolsValidator]"
                                :append-inner-icon="isPasswordVisible ? 'ri-eye-off-line' : 'ri-eye-line'"
                                @click:append-inner="isPasswordVisible = !isPasswordVisible"
                            />

                            <VTextField
                                v-model="form.confirmPassword"
                                label="Confirm Password"
                                placeholder="············"
                                class="mt-4"
                                :rules="[requiredValidator, matchPasswordValidator]"
                                :type="isConfirmPasswordVisible ? 'text' : 'password'"
                                autocomplete="password"
                                :append-inner-icon="isConfirmPasswordVisible ? 'ri-eye-off-line' : 'ri-eye-line'"
                                @click:append-inner="isConfirmPasswordVisible = !isConfirmPasswordVisible"
                            />
                        </VCol>
                        <VAlert v-if="errorMessage" class="mt-4" color="error" variant="tonal">
                            {{ errorMessage }}
                        </VAlert>
                        <VBtn block type="submit" class="mt-6" :loading="isLoading" @click="refForm?.validate()">
                            Update
                        </VBtn>
                    </VRow>
                </VForm>
            </VCardText>
        </VCard>
    </v-dialog>
    <Toast :show="toast.show" :message="toast.message"/>

  </template>
  
 
  