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
}

export const useAuthStore = defineStore("auth", () => {
    const errors = ref({});
    const user = ref<User>({} as User);
    const isAuthenticated = ref(!!JwtService.getToken());

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
        return ApiService.post("login", credentials)
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
            ApiService.post("logout", { api_token: JwtService.getToken() })
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
        if (JwtService.getToken()) {
            ApiService.setHeader();
            ApiService.post("verify_token", { api_token: JwtService.getToken() })
            .then(({ data }) => {
                setAuth(data);
            })
            .catch(({ response }) => {
                purgeAuth();
                setError(response.data.errors);
            });
        } else {
          purgeAuth();
        }
    }

    return {
        errors,
        user,
        isAuthenticated,
        login,
        logout,
        // register,
        // forgotPassword,
        verifyAuth,
    };

});
