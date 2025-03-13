import { useAuthStore } from '@/stores/auth';
import { createRouter, createWebHistory } from 'vue-router';
import { routes } from './routes';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach((to, from, next) => {
    const authStore = useAuthStore();  // Get auth store
    
    // Set page title dynamically based on route meta
    document.title = `${to.meta.pageTitle || 'Default'} - ${import.meta.env.VITE_APP_NAME}`;

    authStore.verifyAuth();

    // If route requires authentication
    if (authStore.isAuthenticated) {
        if (to.name === "login") {
            next({ name: "dashboard" }); // Redirect to dashboard if trying to go to login while already logged
        } else if (authStore.user?.email_verified_at === null && to.name !== 'logout' ) {
            authStore.showPasswordModal(); // force the user to create password if not yet verified
            next();
        } else {
            next(); // Proceed to the requested route
        }
    } else {
        // If route requires authentication
        if (to.meta.middleware === 'auth') {
            if (authStore.isAuthenticated) {
                next();  // Proceed if authenticated
            } else {
                next({ name: 'login' });  // Redirect to login if not authenticated
            }
        } else {
            next();  // If route does not require authentication, allow the navigation
        }
    }

  window.scrollTo({
    top: 0,
    left: 0,
    behavior: "smooth",
  });
})

export default function (app) {
  app.use(router) // Use the router in the app
}

export { router };

