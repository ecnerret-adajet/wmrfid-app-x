import { useAuthStore } from "@/stores/auth";

export function useAuthorization() {

    let auth = useAuthStore();

     /**
     * Check auth user if has permission
     *
     * @param permission
     * @returns {boolean}
     */
    function authUserCan(permission){
        if (auth.user.permissions){
            return auth.user.permissions.indexOf(permission) !== -1;
        }
        return false;
    }

    /**
     * Check auth user if has following permissions
     * 
     * @param permissions 
     * @returns {boolean}
     */
    function authUserCan(permissions){
        return authUserHasMenuAccess(permissions);
    }

    /**
     * Check auth user if has menu access
     *
     * @param permissions {Array}
     * @returns {boolean}
     */
    function authUserHasMenuAccess(permissions){
        if (permissions.includes('*')) return true; // all access

        if (auth.user.permissions){
            let matches = auth.user.permissions.filter(x => permissions.includes(x));
            if (matches.length) return true;
        }
        return false;
    }
    
    /**
     * Check auth user assigned roles
     * 
     * @param Array roles 
     * @returns {boolean}
     */
    // function authUserHasRole(roles){
    //     if (roles.includes('*')) return true; // all access

    //     if (auth.user.roles){
    //         let matches = auth.user.roles.filter(x => roles.includes(x));
    //         if (matches.length) return true;
    //     }
    //     return false;
    // }
    
    return {
        authUserCan,
        authUserHasMenuAccess,
    };
}
