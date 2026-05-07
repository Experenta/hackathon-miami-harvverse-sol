import { useState } from "react";
import { ActivityIndicator, Image, Text, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useRouter, type Href } from "expo-router";
import { useMobileWallet } from "@wallet-ui/react-native-kit";
import { useMutation } from "convex/react";
import { api } from "@havverse/backend/convex/_generated/api";
import { buildRegisterRoleTx, RoleKind } from "@repo/solana-client";
import { DisconnectWalletButton } from "@/components/disconnect-wallet-button";
import { ActionBar, Banner, Button, Screen } from "@/components/ui";
import { useRole } from "@/features/role/use-role";
import { useTransaction } from "@/hooks/use-transaction";
import { useTheme } from "@/theme";

type RoleOption = "farmer" | "partner";

const ROLE_OPTIONS: {
	value: RoleOption;
	label: string;
	description: string;
	emoji: string;
	color: string;
}[] = [
	{
		value: "farmer",
		label: "Farmer",
		description:
			"Create and publish coffee lots, track agronomic plans, and connect with investment partners.",
		emoji: "🌱",
		color: "#93D832",
	},
	{
		value: "partner",
		label: "Partner",
		description:
			"Browse verified coffee lots, reserve partnerships, and view settlement receipts on-chain.",
		emoji: "🤝",
		color: "#67B9C1",
	},
];

export default function RoleSelectScreen() {
	const router = useRouter();
	const { account } = useMobileWallet();
	const { signAndSendWithSigner, isPending, error, reset } = useTransaction();
	const { refetch } = useRole();
	const recordRoleRegistration = useMutation(
		api.users.recordRoleRegistration,
	);
	const { theme } = useTheme();

	const [selectedRole, setSelectedRole] = useState<RoleOption | null>(null);
	const [txSignature, setTxSignature] = useState<string | null>(null);

	async function handleRegister() {
		if (!selectedRole || !account) return;

		reset();
		setTxSignature(null);

		try {
			const roleKind =
				selectedRole === "farmer" ? RoleKind.Farmer : RoleKind.Partner;

			let rolePda = `role-pda-${account.address}`;
			const { signature } = await signAndSendWithSigner(
				async (walletSigner) => {
					const instruction = await buildRegisterRoleTx({
						wallet: walletSigner,
						role: roleKind,
					});
					rolePda =
						instruction.accounts?.[1]?.address?.toString() ??
						rolePda;

					return [instruction];
				},
			);
			setTxSignature(signature);

			await recordRoleRegistration({
				wallet: account.address.toString(),
				role: selectedRole,
				rolePda,
				roleTx: signature,
			});

			await refetch();
			router.replace(
				(selectedRole === "farmer"
					? "/(farmer)/home"
					: "/(partner)/home") as Href,
			);
		} catch {
			// error is already set in useTransaction
		}
	}

	return (
		<Screen contentContainerStyle={{ justifyContent: "space-between" }}>
			{/* Disconnect icon – top right */}
			{account ? (
				<View
					style={{
						position: "absolute",
						top: 0,
						right: 0,
						zIndex: 1,
					}}
				>
					<DisconnectWalletButton />
				</View>
			) : null}

			{/* Hero header */}
			<Animated.View
				entering={FadeInDown.delay(50).duration(150)}
				style={{ alignItems: "center", gap: theme.spacing.sm }}
			>
				<Image
					source={require("@/assets/images/harvverse_logo.png")}
					style={{ width: 48, height: 48 }}
					resizeMode="contain"
				/>
				<View style={{ alignItems: "center", gap: 4 }}>
					<Text
						style={[
							theme.typography.labelSm,
							{
								color: theme.colors.text.muted,
								letterSpacing: 2,
								textTransform: "uppercase",
							},
						]}
					>
						On-chain identity
					</Text>
					<Text
						style={[
							theme.typography.h1,
							{
								color: theme.colors.text.primary,
								textAlign: "center",
							},
						]}
					>
						Choose your role
					</Text>
					<Text
						style={[
							theme.typography.bodySm,
							{
								color: theme.colors.text.secondary,
								textAlign: "center",
								maxWidth: 320,
							},
						]}
					>
						Your role is written on-chain and determines how you
						participate in the Harvverse ecosystem.
					</Text>
				</View>
			</Animated.View>

			{/* Role cards */}
			<Animated.View entering={FadeInUp.delay(50).duration(150)}>
				<View style={{ gap: theme.spacing.sm }}>
					{ROLE_OPTIONS.map((option) => {
						const isSelected = selectedRole === option.value;
						const roleColor = option.color;

						return (
							<Animated.View
								key={option.value}
								entering={FadeInUp.delay(
									option.value === "farmer" ? 500 : 600,
								).duration(250)}
							>
								<View
									onTouchEnd={() =>
										!isPending &&
										setSelectedRole(option.value)
									}
									style={{
										backgroundColor: isSelected
											? `${roleColor}12`
											: theme.colors.surface.default,
										borderColor: isSelected
											? `${roleColor}40`
											: theme.colors.border.subtle,
										borderWidth: isSelected ? 2 : 1,
										borderRadius: theme.radius.lg,
										padding: theme.spacing.md,
										gap: theme.spacing.sm,
									}}
								>
									<View
										style={{
											flexDirection: "row",
											alignItems: "center",
											gap: theme.spacing.sm,
										}}
									>
										{/* Role icon */}
										<View
											style={{
												width: 40,
												height: 40,
												borderRadius: 20,
												backgroundColor: `${roleColor}16`,
												borderColor: `${roleColor}32`,
												borderWidth: 1,
												alignItems: "center",
												justifyContent: "center",
											}}
										>
											<Text style={{ fontSize: 20 }}>
												{option.emoji}
											</Text>
										</View>

										{/* Role info */}
										<View style={{ flex: 1, gap: 2 }}>
											<View
												style={{
													flexDirection: "row",
													alignItems: "center",
													gap: theme.spacing.xs,
												}}
											>
												<Text
													style={[
														theme.typography.text2,
														{
															color: theme.colors
																.text.primary,
														},
													]}
												>
													{option.label}
												</Text>
												{isSelected ? (
													<View
														style={{
															backgroundColor:
																roleColor,
															borderRadius:
																theme.radius
																	.pill,
															paddingHorizontal: 8,
															paddingVertical: 2,
														}}
													>
														<Text
															style={[
																theme.typography
																	.labelSm,
																{
																	color: theme
																		.colors
																		.text
																		.inverse,
																	fontSize: 10,
																},
															]}
														>
															SELECTED
														</Text>
													</View>
												) : null}
											</View>
											<Text
												style={[
													theme.typography.caption,
													{
														color: theme.colors.text
															.secondary,
													},
												]}
												numberOfLines={2}
											>
												{option.description}
											</Text>
										</View>
									</View>

									{/* Role capabilities */}
									<View
										style={{
											flexDirection: "row",
											flexWrap: "wrap",
											gap: theme.spacing.xs,
										}}
									>
										{(option.value === "farmer"
											? [
													"Create lots",
													"Publish on-chain",
													"Track plans",
												]
											: [
													"Browse catalog",
													"Reserve positions",
													"View settlements",
												]
										).map((cap) => (
											<View
												key={cap}
												style={{
													flexDirection: "row",
													alignItems: "center",
													gap: 4,
													backgroundColor:
														theme.colors.surface
															.subtle,
													borderRadius:
														theme.radius.pill,
													paddingHorizontal:
														theme.spacing.xs,
													paddingVertical: 3,
												}}
											>
												<View
													style={{
														width: 5,
														height: 5,
														borderRadius: 3,
														backgroundColor:
															roleColor,
													}}
												/>
												<Text
													style={[
														theme.typography
															.caption,
														{
															color: theme.colors
																.text.secondary,
														},
													]}
												>
													{cap}
												</Text>
											</View>
										))}
									</View>
								</View>
							</Animated.View>
						);
					})}
				</View>
			</Animated.View>

			{/* Status messages */}
			{txSignature ? (
				<Banner
					tone="success"
					title="Transaction in flight"
					accessory={
						<ActivityIndicator
							size="small"
							color={theme.colors.feedback.success.accent}
						/>
					}
					description={`Confirming ${txSignature.slice(0, 16)}...`}
				/>
			) : null}

			{error ? (
				<Banner
					tone="error"
					title="Role registration failed"
					description={error.message}
				/>
			) : null}

			{/* Action */}
			<Animated.View entering={FadeInUp.delay(350).duration(250)}>
				<ActionBar>
					<Button
						title="Sign and register role"
						onPress={handleRegister}
						disabled={!selectedRole || isPending}
						loading={isPending}
					/>
				</ActionBar>
			</Animated.View>
		</Screen>
	);
}
