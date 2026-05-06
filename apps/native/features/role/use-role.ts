import { useRoleContext } from "./role-context";

/**
 * Convenience hook that exposes the role state from RoleContext.
 * The actual fetching is done inside RoleProvider (role-context.tsx).
 */
export function useRole() {
	return useRoleContext();
}
