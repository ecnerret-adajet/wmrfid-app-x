<script setup>
import ApiService from '@/services/ApiService';
import JwtService from '@/services/JwtService';
import { useAuthStore } from '@/stores/auth';
import avatar1 from '@images/avatars/avatar-1.png';
import axios from 'axios';
import { reactive } from 'vue';
import { useRouter } from 'vue-router';

const store = useAuthStore();
const router = useRouter();
const dialogVisible = ref(false);
const isCurrentPasswordVisible = ref(false)
const isPasswordVisible = ref(false)
const isConfirmPasswordVisible = ref(false)
const isLoading = ref(false)
const errorMessage = ref(null);
const updateSuccess = ref(false);
const changePasswordForm = ref(null);
const countdown = ref(3);

const handleLogout = () => {
    store.logout(); 
    router.push({ name: 'login' }); 
};

const handleChangePassword = () => {
    dialogVisible.value = true;
}

const requiredValidator = (value) => !!value || 'This field is required'
const matchPasswordValidator = (value) => {
    return value === form.password ? true : 'Passwords do not match';
};

const form = reactive({
    currentPassword: '',
    password: '',
    confirmPassword: '',
})

const allowedSymbolsValidator = (value) => {
  // Regex to allow alphanumeric and common symbols, including curly braces
  const regex = /^[a-zA-Z0-9!@#$%^&*()_+={}\[\]:;"'<>,.?/|\\~-]+$/;
  return regex.test(value) || 'Password can only contain alphanumeric characters and symbols (!, @, #, $, %, {, })';
};

const handleUpdate = async () => {
    if (changePasswordForm.value.isValid) {
        isLoading.value = true;
        updateSuccess.value = false;
        errorMessage.value = null;
        try {
            const token = JwtService.getToken(); // Get the token manually
            const response = await axios.post('change-current-password', form, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (response.status == 200) {
                updateSuccess.value = true;
                startCountdown();
            }
        } catch (error) {
            errorMessage.value = error.response?.data?.message || 'An unexpected error occurred.';
        } finally {
            isLoading.value = false;
        }
    } 
}

const sapDialogVisible = ref(false);
const isSapLoading = ref(false);
const sapErrorMessage = ref(null);
const sapSuccess = ref(false);
const sapAccountForm = ref(null);

const sapForm = reactive({
    username: '',
    password: '',
    loading: false,
})

const getSAPCredential = () => {
    sapForm.loading = true
    ApiService.get('user/sap-credentials')
        .then(({ data }) => {
            sapForm.username = data.username
            sapForm.loading = false
        })
}

const handleSapAccount = () => {
    sapDialogVisible.value = true;
}

onMounted(() => {
    getSAPCredential()
})

const handleSapSubmit = async () => {
    const { valid } = await sapAccountForm.value.validate();
    if (valid) {
        isSapLoading.value = true;
        sapSuccess.value = false;
        sapErrorMessage.value = null;
        try {
            await ApiService.post('user/sap-credentials', sapForm);
            sapSuccess.value = true;
        } catch (error) {
            sapErrorMessage.value = error.response?.data?.message || 'An unexpected error occurred.';
        } finally {
            isSapLoading.value = false;
        }
    }
}

// Countdown logic
const startCountdown = () => {
    const interval = setInterval(() => {
        if (countdown.value <= 0) {
            clearInterval(interval);
            dialogVisible.value = false;
            handleLogout();
        } else {
            countdown.value--; // Decrease the countdown
        }
    }, 1000); // 1 second interval
};

</script>

<template>
    <VBadge
        dot
        location="bottom right"
        offset-x="3"
        offset-y="3"
        color="success"
        bordered
    >
        <VAvatar
        class="cursor-pointer"
        color="primary"
        variant="tonal"
        >
        <VImg :src="avatar1" />

        <!-- SECTION Menu -->
        <VMenu
            activator="parent"
            width="230"
            location="bottom end"
            offset="14px"
        >
            <VList>
            <!-- 👉 User Avatar & Name -->
            <VListItem>
                <template #prepend>
                <VListItemAction start>
                    <VBadge
                    dot
                    location="bottom right"
                    offset-x="3"
                    offset-y="3"
                    color="success"
                    >
                    <VAvatar
                        color="primary"
                        variant="tonal"
                    >
                        <VImg :src="avatar1" />
                    </VAvatar>
                    </VBadge>
                </VListItemAction>
                </template>

                <VListItemTitle class="font-weight-semibold">
                {{ store.user.name || 'User' }}
                </VListItemTitle>
                <!-- <VListItemSubtitle>Admin</VListItemSubtitle> -->
            </VListItem>
            <VDivider class="my-2" />

            <!-- 👉 Profile -->
            <!-- <VListItem link>
                <template #prepend>
                <VIcon
                    class="me-2"
                    icon="ri-user-line"
                    size="22"
                />
                </template>

                <VListItemTitle>Profile</VListItemTitle>
            </VListItem> -->

            <!-- 👉 Settings -->
            <!-- <VListItem link>
                <template #prepend>
                <VIcon
                    class="me-2"
                    icon="ri-settings-4-line"
                    size="22"
                />
                </template>

                <VListItemTitle>Settings</VListItemTitle>
            </VListItem> -->
            <VListItem @click="handleChangePassword">
                <template #prepend>
                <VIcon
                    class="me-2"
                    icon="ri-settings-4-line"
                    size="22"
                />
                </template>

                <VListItemTitle>Change Password</VListItemTitle>
            </VListItem>

            <VListItem @click="handleSapAccount">
                <template #prepend>
                <VIcon
                    class="me-2"
                    icon="ri-login-circle-line"
                    size="22"
                />
                </template>

                <VListItemTitle>SAP Account</VListItemTitle>
            </VListItem>

            <!-- 👉 Pricing -->
            <!-- <VListItem link>
                <template #prepend>
                <VIcon
                    class="me-2"
                    icon="ri-money-dollar-circle-line"
                    size="22"
                />
                </template>

                <VListItemTitle>Pricing</VListItemTitle>
            </VListItem> -->

            <!-- 👉 FAQ -->
            <VListItem link>
                <template #prepend>
                <VIcon
                    class="me-2"
                    icon="ri-question-line"
                    size="22"
                />
                </template>

                <VListItemTitle>FAQ</VListItemTitle>
            </VListItem>

            <!-- Divider -->
            <VDivider class="my-2" />

            <!-- 👉 Logout -->
            <VListItem @click="handleLogout">
                <template #prepend>
                <VIcon
                    class="me-2"
                    icon="ri-logout-box-r-line"
                    size="22"
                />
                </template>

                <VListItemTitle>Logout</VListItemTitle>
            </VListItem>
            </VList>
        </VMenu>
        <!-- !SECTION -->
        </VAvatar>
    </VBadge>

    <v-dialog v-model="dialogVisible" max-width="550px" persistent>
      <VCard class="auth-card pa-4 pt-4">
            <VCardItem class="justify-center">
                <v-icon
                    class="text-center mx-auto"
                    color="grey-700"
                    icon="ri-lock-2-line"
                    size="56"
                ></v-icon>
            </VCardItem>
            <VCardText class="pt-2">
                <h4 class="text-h4 mb-1 text-center">
                    Update password
                </h4>
                <p class="mb-0 text-center">
                    For your account’s security, choose a strong password and keep it confidential. 
                        Make sure it's something unique and memorable.
                </p>
            </VCardText>

            <VCardText>
                <VForm @submit.prevent="handleUpdate" ref="changePasswordForm">
                    <VRow>
                    
                        <VCol cols="12">
                            <VTextField
                                v-model="form.currentPassword"
                                label="Current Password"
                                placeholder="············"
                                :type="isCurrentPasswordVisible ? 'text' : 'password'"
                                autocomplete="password"
                                :rules="[requiredValidator]"
                                :append-inner-icon="isCurrentPasswordVisible ? 'ri-eye-off-line' : 'ri-eye-line'"
                                @click:append-inner="isCurrentPasswordVisible = !isCurrentPasswordVisible"
                            />

                            <VTextField
                                v-model="form.password"
                                label="Password"
                                class="mt-4"
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
                        <VAlert v-if="updateSuccess" class="mt-4 text-center" color="primary" variant="tonal">
                            Password changed successfully. You will be redirected to the login page in {{ countdown }} seconds.
                        </VAlert>
                        <VAlert v-if="errorMessage" class="mt-4" color="error" variant="tonal">
                            {{ errorMessage }}
                        </VAlert>
                        <VBtn block type="submit" class="mt-6" :loading="isLoading" @click="changePasswordForm?.validate()">
                            Update
                        </VBtn>
                    </VRow>
                </VForm>
            </VCardText>
        </VCard>
    </v-dialog>

    <v-dialog v-model="sapDialogVisible" max-width="550px" persistent>
      <VCard class="auth-card pa-4 pt-4">
            <VCardItem class="justify-center">
                <v-icon
                    class="text-center mx-auto"
                    color="grey-700"
                    icon="ri-login-circle-line"
                    size="56"
                ></v-icon>
            </VCardItem>
            <VCardText class="pt-2">
                <h4 class="text-h4 mb-1 text-center">
                    SAP Account
                </h4>
                <p class="mb-0 text-center">
                    Enter your SAP credentials to link your account for seamless integration.
                </p>
            </VCardText>

            <VCardText>
                <VForm @submit.prevent="handleSapSubmit" ref="sapAccountForm">
                    <VRow>
                        <VCol cols="12">
                            <VTextField
                                v-model="sapForm.username"
                                label="User Name"
                                placeholder="SAP username"
                                autocomplete="username"
                                :rules="[requiredValidator]"
                                :loading="sapForm.loading"
                            />

                            <VTextField
                                v-model="sapForm.password"
                                label="Password"
                                class="mt-4"
                                placeholder="············"
                                type="password"
                                autocomplete="current-password"
                                :rules="[requiredValidator]"
                            />

                            <VAlert v-if="sapSuccess" class="mt-4 text-center" color="primary" variant="tonal">
                                SAP account saved successfully.
                            </VAlert>
                            <VAlert v-if="sapErrorMessage" class="mt-4" color="error" variant="tonal">
                                {{ sapErrorMessage }}
                            </VAlert>

                            <VBtn block type="submit" class="mt-6" :loading="isSapLoading">
                                Submit
                            </VBtn>
                            <VBtn block variant="text" class="mt-2" @click="sapDialogVisible = false">
                                Cancel
                            </VBtn>
                        </VCol>
                    </VRow>
                </VForm>
            </VCardText>
        </VCard>
    </v-dialog>
</template>
