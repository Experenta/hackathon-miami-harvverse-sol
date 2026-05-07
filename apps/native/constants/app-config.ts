import {
  AppIdentity,
  createSolanaDevnet,
  createSolanaTestnet,
  createSolanaLocalnet,
  SolanaCluster,
} from "@wallet-ui/react-native-kit";

export class AppConfig {
  static identity: AppIdentity = { name: "Harvverse" };
  static networks: SolanaCluster[] = [
    createSolanaDevnet({ url: "https://api.devnet.solana.com" }),
    createSolanaLocalnet({
      label: "Localnet (Emulator)",
      url: "http://10.0.2.2:8899",
      urlWs: "ws://10.0.2.2:8900",
    }),
    createSolanaTestnet({ url: "https://api.testnet.solana.com" }),
  ];
  /** Convex deployment URL — set via EXPO_PUBLIC_CONVEX_URL in .env.local */
  static convexUrl: string | undefined = process.env.EXPO_PUBLIC_CONVEX_URL;
}
