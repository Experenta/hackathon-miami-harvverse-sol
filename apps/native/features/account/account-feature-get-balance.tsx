import { Text } from "react-native";
import { useAccountGetBalance } from "@/features/account/use-account-get-balance";
import { lamportsToSol } from "@/utils/lamports-to-sol";
import { Address } from "@solana/kit";
import { useTheme } from "@/theme";

export function AccountFeatureGetBalance({ address }: { address: Address }) {
	const { data, isLoading } = useAccountGetBalance({ address });
	const { theme } = useTheme();

	return (
		<Text
			style={[
				theme.typography.bodySm,
				{ color: theme.colors.text.secondary },
			]}
		>
			Balance: {isLoading ? "Loading..." : `${lamportsToSol(data?.value ?? 0n)} SOL`}
		</Text>
	);
}
