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
    // function authUserHasMenuAccess(permissions){
    //     if (permissions.includes('*')) return true; // all access

    //     if (auth.user.permissions){
    //         let matches = auth.user.permissions.filter(x => permissions.includes(x));
    //         if (matches.length) return true;
    //     }
    //     return false;
    // }

    function authUserHasMenuAccess(permissions) {
        // Handle wildcard permission
        if (permissions.includes('*')) return true;
        
        // Convert to array if single permission is passed as string
        if (typeof permissions === 'string') {
            permissions = [permissions];
        }
        
        if (auth.user && auth.user.permissions) {
            return permissions.some(permission => {
                // Check for exact match
                if (auth.user.permissions.includes(permission)) return true;
                
                // Check for hierarchical permissions (optional)
                // e.g., 'view.rfid' should grant access to 'view.rfid.*' but not 'view.rfid.monitoring'
                const permissionParts = permission.split('.');
                for (let i = permissionParts.length; i > 0; i--) {
                    const wildcardPermission = permissionParts.slice(0, i).join('.') + '.*';
                    if (auth.user.permissions.includes(wildcardPermission)) return true;
                }
                
                return false;
            });
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
