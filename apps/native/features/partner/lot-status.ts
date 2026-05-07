import { LotStatus } from "@repo/solana-client";

export const RESERVABLE_LOT_STATUS = LotStatus.Published;

const ON_CHAIN_LOT_STATUS_MAP = {
	[LotStatus.Draft]: "draft",
	[LotStatus.Published]: "published",
	[LotStatus.Reserved]: "reserved",
	[LotStatus.InCycle]: "in_cycle",
	[LotStatus.Settled]: "settled",
	[LotStatus.Cancelled]: "cancelled",
} as const;

export function mapOnChainLotStatusToApp(status: LotStatus) {
	return ON_CHAIN_LOT_STATUS_MAP[status];
}

export function isReservableLotStatus(status: LotStatus | null | undefined) {
	return status === RESERVABLE_LOT_STATUS;
}

export function formatLotStatusLabel(status: string) {
	return status
		.split("_")
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join(" ");
}

export function getReserveBlockedReason(status: LotStatus | null | undefined) {
	if (status === null || status === undefined) {
		return "The app could not confirm the live on-chain lot state. Try again once the lot record is reachable.";
	}

	switch (status) {
		case LotStatus.Draft:
			return "This lot is still in draft and must be published on-chain before a partner can reserve it.";
		case LotStatus.Reserved:
			return "This lot is already reserved on-chain, so no new partnership can be created from this wallet.";
		case LotStatus.InCycle:
			return "This lot is already in cycle on-chain and is no longer open for a new reservation.";
		case LotStatus.Settled:
			return "This lot has already been settled on-chain and cannot be reserved again.";
		case LotStatus.Cancelled:
			return "This lot was cancelled on-chain and is no longer available for reservation.";
		case LotStatus.Published:
			return "This lot is available for reservation.";
		default:
			return "This lot is not in a reservable on-chain state.";
	}
}
