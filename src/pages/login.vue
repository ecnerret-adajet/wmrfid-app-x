<script setup>
import Loader from '@/components/Loader.vue';
import { useAuthStore } from '@/stores/auth';
import alc_logo from '@images/alc.png';
import { useRouter } from "vue-router";
import { VForm } from 'vuetify/components/VForm';

const form = ref({
  email: '',
  password: '',
  remember: false,
})

const refForm = ref()
const isPasswordVisible = ref(false)
const store = useAuthStore();
const router = useRouter()
const submitDisabled = ref(false)

// Define custom validation rules
const requiredValidator = (value) => !!value || 'This field is required'

const loginSuccess = ref(false)

const handleLogin = async (values) => {
    if (!values.email || !values.password) {
        return;
    }
    submitDisabled.value = true
    store.logout(true);
    await store.login(values);
    const error = Object.values(store.errors);

    if (error.length === 0) {
        submitDisabled.value = false
        loginSuccess.value = true
        store.errors = {}
        router.push({ name: 'dashboard' });
     } else {
        submitDisabled.value = false
     }
}

</script>

<template>
    <div class="auth-wrapper d-flex align-center justify-center pa-4">
        <VCard class="auth-card pa-4 pt-7" max-width="448">
            <VCardItem class="justify-center">
                <RouterLink to="/" class="d-flex align-center gap-3">
                    <img class="mx-auto" :src="alc_logo" alt="" srcset="" width="190">
                </RouterLink>
            </VCardItem>
            <VCardText class="pt-2">
                <p class="mb-0">
                    Please sign-in to your account
                </p>
            </VCardText>

            <VCardText>
                <VForm @submit.prevent="handleLogin(form)"  ref="refForm">
                    <VRow>
                        <!-- email -->
                        <VCol cols="12">
                            <VTextField v-model="form.email" label="Email" type="email" 
                                :rules="[requiredValidator]"
                            />
                        </VCol>

                        <!-- password -->
                        <VCol cols="12">
                            <VTextField
                                v-model="form.password"
                                label="Password"
                                placeholder="············"
                                :type="isPasswordVisible ? 'text' : 'password'"
                                autocomplete="password"
                                :append-inner-icon="isPasswordVisible ? 'ri-eye-off-line' : 'ri-eye-line'"
                                @click:append-inner="isPasswordVisible = !isPasswordVisible"
                            />

                            <VAlert v-if="store.errors.email" class="mt-4"
                                color="error"
                                variant="tonal"
                            >
                                {{ store.errors.email[0] }}
                            </VAlert>

                            <VAlert v-if="loginSuccess" class="mt-4" color="success">
                                You have successfully login
                            </VAlert>

                            <div class="d-flex align-center justify-space-between flex-wrap my-6">
                                <VCheckbox
                                    v-model="form.remember"
                                    label="Remember me"
                                />
                                <a class="text-primary" href="javascript:void(0)">
                                    Forgot Password?
                                </a>
                            </div>

                            <VBtn block type="submit" :disabled="submitDisabled" @click="refForm?.validate()">
                                Login
                            </VBtn>
                        </VCol>
                    </VRow>
                </VForm>
            </VCardText>
        </VCard>
        <Loader :show="submitDisabled"/>
    </div>
</template>

