import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
	type PropsWithChildren,
} from "react";
import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { fetchUserRoleByWallet, RoleKind } from "@repo/solana-client";

export type RoleKindValue = "farmer" | "partner" | null;

export interface RoleContextValue {
	role: RoleKindValue;
	rolePda: string | null;
	isLoading: boolean;
	error: Error | null;
	refetch: () => void;
}

const RoleContext = createContext<RoleContextValue>({
	role: null,
	rolePda: null,
	isLoading: false,
	error: null,
	refetch: () => {},
});

export function RoleProvider({ children }: PropsWithChildren) {
	const { account, client } = useMobileWallet();
	const [role, setRole] = useState<RoleKindValue>(null);
	const [rolePda, setRolePda] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	const fetchRole = useCallback(async () => {
		if (!account) {
			setRole(null);
			setRolePda(null);
			setError(null);
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const maybeAccount = await fetchUserRoleByWallet(
				client.rpc,
				account.address,
			);

			// fetchUserRoleByWallet returns null when account doesn't exist,
			// or a MaybeAccount (exists: true) when it does.
			if (maybeAccount && maybeAccount.exists) {
				const roleKind = maybeAccount.data.role;
				setRole(roleKind === RoleKind.Farmer ? "farmer" : "partner");
				setRolePda(maybeAccount.address.toString());
			} else {
				setRole(null);
				setRolePda(null);
			}
		} catch (err) {
			setError(
				err instanceof Error
					? err
					: new Error("Failed to fetch role PDA"),
			);
			setRole(null);
			setRolePda(null);
		} finally {
			setIsLoading(false);
		}
	}, [account, client.rpc]);

	useEffect(() => {
		fetchRole();
	}, [fetchRole]);

	return (
		<RoleContext.Provider
			value={{ role, rolePda, isLoading, error, refetch: fetchRole }}
		>
			{children}
		</RoleContext.Provider>
	);
}

export function useRoleContext(): RoleContextValue {
	return useContext(RoleContext);
}
