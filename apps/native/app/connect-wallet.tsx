import { useEffect } from "react";
import { Image, Text, View } from "react-native";
import Animated, {
	FadeIn,
	FadeInDown,
	FadeInUp,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withTiming,
	Easing,
} from "react-native-reanimated";
import { useRouter } from "expo-router";

import { SafeAreaView } from "react-native-safe-area-context";
import { NetworkSelector } from "@/components/network-selector";
import { Button } from "@/components/ui";
import { useWalletConnection } from "@/features/wallet/use-wallet-connection";
import { useTheme } from "@/theme";

export default function ConnectWalletScreen() {
	const router = useRouter();
	const { account, connect, connectAndUpsert } = useWalletConnection();
	const { theme } = useTheme();

	// Subtle floating animation for the logo
	const floatY = useSharedValue(0);

	useEffect(() => {
		floatY.value = withRepeat(
			withTiming(-8, {
				duration: 3000,
				easing: Easing.inOut(Easing.ease),
			}),
			-1,
			true,
		);
	}, [floatY]);

	const floatingStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: floatY.value }],
	}));

	// Pulse animation for the glow ring
	const glowOpacity = useSharedValue(0.4);

	useEffect(() => {
		glowOpacity.value = withRepeat(
			withTiming(0.8, {
				duration: 2400,
				easing: Easing.inOut(Easing.ease),
			}),
			-1,
			true,
		);
	}, [glowOpacity]);

	const glowStyle = useAnimatedStyle(() => ({
		opacity: glowOpacity.value,
	}));

	useEffect(() => {
		if (account) {
			connectAndUpsert(account.address.toString()).catch(console.error);
			router.replace("/");
		}
	}, [account, connectAndUpsert, router]);

	return (
		<View style={{ flex: 1, backgroundColor: theme.colors.background.app }}>
			<SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
				<View
					style={{
						flex: 1,
						justifyContent: "space-between",
						paddingHorizontal: theme.spacing.xl,
					}}
				>
					{/* Top section: Brand + Hero */}
					<View
						style={{
							alignItems: "center",
							paddingTop: theme.spacing.lg,
						}}
					>
						{/* Eyebrow */}
						<Animated.View
							entering={FadeInDown.delay(50).duration(150)}
						>
							<Text
								style={[
									theme.typography.labelSm,
									{
										color: theme.colors.text.muted,
										letterSpacing: 2.4,
										textTransform: "uppercase",
										textAlign: "center",
									},
								]}
							>
								Solana · On-chain · Verified
							</Text>
						</Animated.View>

						{/* Logo with glow */}
						<Animated.View
							entering={FadeIn.delay(75).duration(200)}
							style={[
								floatingStyle,
								{
									marginTop: theme.spacing["2xl"],
									alignItems: "center",
									justifyContent: "center",
								},
							]}
						>
							{/* Glow ring behind logo */}
							<Animated.View
								style={[
									glowStyle,
									{
										position: "absolute",
										width: 160,
										height: 160,
										borderRadius: 80,
										backgroundColor: "transparent",
										borderWidth: 2,
										borderColor: "rgba(147, 216, 50, 0.3)",
										shadowColor: "#93D832",
										shadowOpacity: 0.4,
										shadowRadius: 24,
										shadowOffset: { width: 0, height: 0 },
									},
								]}
							/>
							<Image
								source={require("@/assets/images/harvverse_logo.png")}
								style={{ width: 120, height: 120 }}
								resizeMode="contain"
							/>
						</Animated.View>
					</View>

					{/* Middle section: Copy */}
					<View
						style={{
							gap: theme.spacing.lg,
							paddingVertical: theme.spacing.xl,
						}}
					>
						<Animated.View
							entering={FadeInUp.delay(250).duration(350)}
						>
							<Text
								style={[
									theme.typography.h1,
									{
										color: theme.colors.text.primary,
										textAlign: "center",
										lineHeight: 40,
									},
								]}
							>
								Co-invest in real{"\n"}coffee farms.
							</Text>
						</Animated.View>

						<Animated.View
							entering={FadeInUp.delay(325).duration(350)}
							style={{ alignItems: "center" }}
						>
							{/* Highlighted tag */}
							<View
								style={{
									backgroundColor: "rgba(147, 216, 50, 0.12)",
									borderColor: "rgba(147, 216, 50, 0.24)",
									borderWidth: 1,
									borderRadius: theme.radius.sm,
									paddingHorizontal: theme.spacing.md,
									paddingVertical: theme.spacing.xs,
								}}
							>
								<Text
									style={[
										theme.typography.labelMd,
										{
											color: theme.colors.text.brand,
											letterSpacing: 0.4,
										},
									]}
								>
									verified onchain state
								</Text>
							</View>
						</Animated.View>

						<Animated.View
							entering={FadeInUp.delay(50).duration(350)}
						>
							<Text
								style={[
									theme.typography.bodyMd,
									{
										color: theme.colors.text.secondary,
										textAlign: "center",
										lineHeight: 24,
										paddingHorizontal: theme.spacing.sm,
									},
								]}
							>
								Harvverse connects farmers and partners through
								transparent, on-chain agricultural investment.
								Every lot, every partnership, every settlement —
								cryptographically verified.
							</Text>
						</Animated.View>

						{/* Feature pills */}
						<Animated.View
							entering={FadeInUp.delay(475).duration(350)}
							style={{
								flexDirection: "row",
								flexWrap: "wrap",
								justifyContent: "center",
								gap: theme.spacing.xs,
								paddingTop: theme.spacing.xs,
							}}
						>
							{[
								"Discovery",
								"Contribution",
								"Yield",
								"Settlement",
							].map((step, i) => (
								<View
									key={step}
									style={{
										flexDirection: "row",
										alignItems: "center",
										gap: 6,
										backgroundColor:
											theme.colors.surface.default,
										borderColor: theme.colors.border.subtle,
										borderWidth: 1,
										borderRadius: theme.radius.pill,
										paddingHorizontal: theme.spacing.sm,
										paddingVertical: 6,
									}}
								>
									<View
										style={{
											width: 6,
											height: 6,
											borderRadius: 3,
											backgroundColor:
												i === 0
													? "#93D832"
													: i === 1
														? "#67B9C1"
														: i === 2
															? "#6766C4"
															: "rgba(238, 238, 238, 0.56)",
										}}
									/>
									<Text
										style={[
											theme.typography.caption,
											{
												color: theme.colors.text
													.secondary,
											},
										]}
									>
										{step}
									</Text>
								</View>
							))}
						</Animated.View>
					</View>

					{/* Bottom section: Network + Connect */}
					<Animated.View
						entering={FadeInUp.delay(550).duration(350)}
						style={{
							gap: theme.spacing.md,
							paddingBottom: theme.spacing["2xl"],
						}}
					>
						{/* Network selector in a compact card */}
						<View
							style={{
								backgroundColor: theme.colors.surface.default,
								borderColor: theme.colors.border.subtle,
								borderWidth: 1,
								borderRadius: theme.radius.lg,
								padding: theme.spacing.md,
							}}
						>
							<NetworkSelector />
						</View>

						{/* Connect button */}
						<View
							style={{
								backgroundColor: theme.colors.surface.raised,
								borderColor: theme.colors.border.default,
								borderWidth: 1,
								borderRadius: theme.radius.xl,
								padding: theme.spacing.sm,
								gap: theme.spacing.sm,
								...theme.elevation.raised,
							}}
						>
							<Button title="Connect Wallet" onPress={connect} />
							<Text
								style={[
									theme.typography.caption,
									{
										color: theme.colors.text.muted,
										textAlign: "center",
										paddingBottom: 2,
									},
								]}
							>
								Phantom · Solflare · Mobile Wallet Adapter
							</Text>
						</View>
					</Animated.View>
				</View>
			</SafeAreaView>
		</View>
	);
}
