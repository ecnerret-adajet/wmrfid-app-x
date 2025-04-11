import ApiService from "@/services/ApiService";
import JwtService from "@/services/JwtService";
import { defineStore } from "pinia";
import { ref } from "vue";

export interface User {
    name: string;
    surname: string;
    email: string;
    password: string;
    api_token: string;
    email_verified_at: string;
}

export const useAuthStore = defineStore(
    'auth',
    () => {
        const errors = ref({});
        const user = ref<User>({} as User);
        const isAuthenticated = ref(!!JwtService.getToken());
        const isPasswordModalVisible = ref(false);
        const isSessionExpiredModalVisible = ref(false);


        function setAuth(authUser: User) {
            isAuthenticated.value = true;
            user.value = authUser;
            errors.value = {};
            JwtService.saveToken(user.value.api_token);
        }
    
        function setError(error: any) {
            errors.value = { ...error };
        }

        function purgeAuth() {
            isAuthenticated.value = false;
            user.value = {} as User;
            errors.value = [];
            JwtService.destroyToken();
        }
    
        function login(credentials: User) {
            errors.value = {}
            return ApiService.post("/login", credentials)
              .then(({ data }) => {
                setAuth(data);
              })
              .catch(({ response }) => {
                setError(response.data.errors);
              });
        }
    
        function logout(isLoginFlow = false) {
            if (JwtService.getToken()) {
                ApiService.setHeader();
                ApiService.post("/logout", { api_token: JwtService.getToken() })
                    .then(({ data }) => {
                        purgeAuth();
                        if (!isLoginFlow) {
                            window.location.href = "/";
                        }
                    })
                    .catch(({ response }) => {
                        setError(response.data.errors);
                        purgeAuth();
                    
                    });
            }
        }
    
        function verifyAuth() {
            isSessionExpiredModalVisible.value = false;
            if (JwtService.getToken()) {
                ApiService.setHeader();
                ApiService.post("verify_token", { api_token: JwtService.getToken() })
                .then(({ data }) => {
                    setAuth(data);
                })
                .catch(({ response }) => {
                    purgeAuth();
                    setError(response.data.errors);
                    showSessionExpiredModal();
                
                });
            } else {
                purgeAuth();
            }
        }

         // Show password modal
        const showPasswordModal = () => {
            isPasswordModalVisible.value = true;
        };

        // Hide password modal
        const hidePasswordModal = () => {
            isPasswordModalVisible.value = false;
        };

        
        const showSessionExpiredModal = () => {
            isSessionExpiredModalVisible.value = true;
        };

        const hideSessionExpiredModal = () => {
            isSessionExpiredModalVisible.value = false;
        };


        return {
            errors,
            user,
            isAuthenticated,
            login,
            logout,
            // register,
            // forgotPassword,
            verifyAuth,
            setAuth,
            setError,
            purgeAuth,
            hidePasswordModal,
            showPasswordModal,
            isPasswordModalVisible,
            isSessionExpiredModalVisible,
            showSessionExpiredModal,
            hideSessionExpiredModal,
        };
    },
    {
      persist: true,
    },
  )

