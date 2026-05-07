import { ActivityIndicator } from "react-native";
import { Banner } from "@/components/ui/banner";

export type TxState = "pending" | "confirmed" | "failed";

interface TxStatusProps {
	state: TxState;
	signature?: string | null;
	errorMessage?: string | null;
}

export function TxStatus({ state, signature, errorMessage }: TxStatusProps) {
	if (state === "pending") {
		return (
			<Banner
				tone="info"
				title="Transaction pending"
				description={signature ?? "Awaiting wallet confirmation and network finalization."}
				accessory={<ActivityIndicator size="small" />}
			/>
		);
	}

	if (state === "confirmed") {
		return (
			<Banner
				tone="success"
				title="Transaction confirmed"
				description={signature ?? "The transaction completed successfully."}
			/>
		);
	}

	return (
		<Banner
			tone="error"
			title="Transaction failed"
			description={errorMessage ?? "The transaction could not be completed."}
		/>
	);
}
