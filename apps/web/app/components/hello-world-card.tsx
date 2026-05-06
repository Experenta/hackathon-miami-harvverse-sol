"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
	parseTransactionError,
	HARVVERSE_PROGRAM_ID,
} from "@repo/solana-client";
import { useSendTransaction } from "../lib/hooks/use-send-transaction";
import { useWallet } from "../lib/wallet/context";
import { useCluster } from "./cluster-context";

export function HelloWorldCard() {
	const { signer, status } = useWallet();
	const { send, isSending } = useSendTransaction();
	const { getExplorerUrl } = useCluster();
	const [lastSignature, setLastSignature] = useState<string | null>(null);

	const handleSayHello = useCallback(async () => {
		if (!signer) return;

		try {
			// Placeholder: replace with a real Harvverse instruction when needed.
			toast.info("No demo instruction configured for the web app yet.");
		} catch (err) {
			console.error("Transaction failed:", err);
			toast.error(parseTransactionError(err));
		}
	}, [send, signer]);

	if (status !== "connected") {
		return (
			<section className="w-full space-y-4 rounded-2xl border border-border-low bg-card p-6 shadow-[0_20px_80px_-50px_rgba(0,0,0,0.35)]">
				<div className="space-y-1">
					<p className="text-lg font-semibold">Harvverse Program</p>
					<p className="text-sm text-muted">
						Connect your wallet to interact with the Harvverse
						program on the selected cluster.
					</p>
				</div>
				<div className="rounded-lg bg-cream/50 p-4 text-center text-sm text-muted">
					Wallet not connected
				</div>
			</section>
		);
	}

	return (
		<section className="w-full space-y-5 rounded-2xl border border-border-low bg-card p-6 shadow-[0_20px_80px_-50px_rgba(0,0,0,0.35)]">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div className="space-y-1">
					<p className="text-lg font-semibold">Harvverse Program</p>
					<p className="text-sm text-muted">
						The Harvverse on-chain program for coffee farmer-partner
						marketplace.
					</p>
				</div>
				<span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold uppercase text-foreground/80">
					Devnet Ready
				</span>
			</div>

			<div className="rounded-xl border border-border-low bg-cream/30 p-4">
				<p className="text-xs uppercase text-muted">Program ID</p>
				<a
					href={getExplorerUrl(`/address/${HARVVERSE_PROGRAM_ID}`)}
					target="_blank"
					rel="noopener noreferrer"
					className="mt-1 block break-all font-mono text-sm underline underline-offset-2"
				>
					{HARVVERSE_PROGRAM_ID}
				</a>
			</div>

			<button
				onClick={handleSayHello}
				disabled={isSending}
				className="w-full cursor-pointer rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-xs transition hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
			>
				{isSending ? "Confirming..." : "View Program"}
			</button>

			{lastSignature && (
				<div className="rounded-xl border border-border-low p-4 text-sm">
					<p className="text-xs uppercase text-muted">
						Last Transaction
					</p>
					<a
						href={getExplorerUrl(`/tx/${lastSignature}`)}
						target="_blank"
						rel="noopener noreferrer"
						className="mt-1 block break-all font-mono text-xs underline underline-offset-2"
					>
						{lastSignature}
					</a>
				</div>
			)}
		</section>
	);
}
