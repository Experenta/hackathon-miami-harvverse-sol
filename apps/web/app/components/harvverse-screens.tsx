"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Address } from "@solana/kit";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@havverse/backend/convex/_generated/api";
import {
  buildCreateFarmerProfileTx,
  buildCreatePartnerProfileTx,
  buildRegisterRoleTx,
  computeManifestHash,
  computeManifestHashHex,
  ellipsify,
  fetchFarmerProfileByWallet,
  fetchLotByPda,
  fetchPartnerProfileByWallet,
  findFarmerProfilePda,
  findPartnerProfilePda,
  findUserRolePda,
  RoleKind,
} from "@repo/solana-client";
import { ClusterSelect } from "./cluster-select";
import { WalletButton } from "./wallet-button";
import { useCluster } from "./cluster-context";
import { useFarmerLots } from "../lib/hooks/use-farmer-lots";
import { useLotCatalog } from "../lib/hooks/use-lot-catalog";
import { usePartnerships } from "../lib/hooks/use-partnerships";
import { useRole } from "../lib/hooks/use-role";
import { useTransaction } from "../lib/hooks/use-send-transaction";
import { useSolanaClient } from "../lib/solana-client-context";
import { useWallet } from "../lib/wallet/context";
import {
  DEMO_AGRONOMIC_PLAN,
  DEMO_SENSOR_SNAPSHOT,
  ZAFIRO_DEMO_LOT,
} from "../lib/harvverse/demo-data";
import {
  buildPublishInstructions,
  computePublishHashes,
  type LotPublishData,
  type PublishFlowResult,
} from "../lib/harvverse/publish-flow";
import {
  buildReserveInstruction,
  computeReserveData,
  type ReserveFlowResult,
} from "../lib/harvverse/reserve-flow";
import { AiChatPanel } from "./ai-chat-panel";

type RoleOption = "farmer" | "partner";
type VerificationStatus =
  | "loading"
  | "match"
  | "mismatch"
  | "not_found"
  | "error";

interface LotFormData {
  lotCode: string;
  farmName: string;
  country: string;
  region: string;
  latitude: string;
  longitude: string;
  altitudeMeters: string;
  variety: string;
  areaManzanas: string;
  ticketUsdcCents: string;
  farmerShareBps: string;
  partnerShareBps: string;
}

const EMPTY_LOT_FORM: LotFormData = {
  lotCode: "",
  farmName: "",
  country: "",
  region: "",
  latitude: "",
  longitude: "",
  altitudeMeters: "",
  variety: "",
  areaManzanas: "",
  ticketUsdcCents: "",
  farmerShareBps: "",
  partnerShareBps: "",
};

const statusClasses: Record<string, string> = {
  draft: "border-amber-200 bg-amber-50 text-amber-800",
  published: "border-emerald-200 bg-emerald-50 text-emerald-800",
  reserved: "border-blue-200 bg-blue-50 text-blue-800",
  active: "border-emerald-200 bg-emerald-50 text-emerald-800",
  in_cycle: "border-indigo-200 bg-indigo-50 text-indigo-800",
  settled: "border-violet-200 bg-violet-50 text-violet-800",
  cancelled: "border-red-200 bg-red-50 text-red-800",
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatUsdCents(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })}`;
}

function formatBps(bps: number) {
  return `${bps / 100}%`;
}

function pageTitleForRole(role: RoleOption) {
  return role === "farmer" ? "Farmer" : "Partner";
}

function Button({
  children,
  onClick,
  disabled,
  type = "button",
  variant = "primary",
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "danger" | "green" | "purple";
  className?: string;
}) {
  const variants = {
    primary:
      "border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800",
    secondary:
      "border-border bg-card text-foreground hover:bg-neutral-50 dark:hover:bg-neutral-800",
    danger:
      "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40",
    green: "border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800",
    purple: "border-violet-700 bg-violet-700 text-white hover:bg-violet-800",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg border px-4 py-2 text-sm font-semibold transition disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-55",
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 text-foreground dark:bg-background">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-emerald-700" />
        <p className="text-sm text-muted">{message}</p>
      </div>
    </main>
  );
}

function ErrorState({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 text-foreground dark:bg-background">
      <div className="w-full max-w-md rounded-lg border border-red-200 bg-card p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-red-700">{title}</h1>
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{message}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="green" className="mt-5 w-full">
            Retry
          </Button>
        )}
      </div>
    </main>
  );
}

function AppShell({
  children,
  role,
  title,
}: {
  children: ReactNode;
  role?: RoleOption;
  title?: string;
}) {
  const nav =
    role === "farmer"
      ? [
          { href: "/farmer/home", label: "Dashboard" },
          { href: "/farmer/profile", label: "Profile" },
          { href: "/farmer/lots/new", label: "Create Lot" },
        ]
      : role === "partner"
        ? [
            { href: "/partner/home", label: "Dashboard" },
            { href: "/partner/profile", label: "Profile" },
            { href: "/partner/catalog", label: "Catalog" },
          ]
        : [];

  return (
    <div className="min-h-screen bg-neutral-50 text-foreground dark:bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/" className="text-base font-bold tracking-tight">
              Harvverse
            </Link>
            {role && (
              <span className="rounded-md border border-border bg-neutral-50 px-2.5 py-1 text-xs font-semibold text-muted dark:bg-neutral-900">
                {pageTitleForRole(role)}
              </span>
            )}
            <nav className="flex flex-wrap items-center gap-1">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-2.5 py-1.5 text-sm font-medium text-muted transition hover:bg-neutral-100 hover:text-foreground dark:hover:bg-neutral-800"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <ClusterSelect />
            <WalletButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        {title && (
          <div className="mb-5">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}

function RequireRole({
  requiredRole,
  children,
}: {
  requiredRole: RoleOption;
  children: ReactNode;
}) {
  const router = useRouter();
  const { wallet, status } = useWallet();
  const { role, isLoading } = useRole();

  useEffect(() => {
    if (status !== "connected" || !wallet) {
      router.replace("/connect-wallet");
      return;
    }
    if (!isLoading && role !== requiredRole) {
      router.replace("/");
    }
  }, [isLoading, requiredRole, role, router, status, wallet]);

  if (status !== "connected" || !wallet || isLoading || role !== requiredRole) {
    return <LoadingState message="Checking role..." />;
  }

  return <>{children}</>;
}

function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx(
        "rounded-lg border border-border bg-card p-4 shadow-sm",
        className,
      )}
    >
      {children}
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-md border px-2 py-1 text-xs font-bold capitalize",
        statusClasses[status] ?? statusClasses.draft,
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border-low py-2 last:border-b-0">
      <span className="text-sm text-muted">{label}</span>
      <span
        className={cx(
          "max-w-[65%] break-words text-right text-sm font-semibold text-foreground",
          mono && "font-mono text-xs",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function WalletAddressCard({
  address,
  label = "Connected wallet",
}: {
  address: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-muted">{label}</p>
          <p className="mt-1 break-all font-mono text-sm">{address}</p>
        </div>
        <Button
          variant="secondary"
          onClick={async () => {
            await navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </Card>
  );
}

function HashRow({ label, hash }: { label: string; hash: string }) {
  return <DetailRow label={label} value={ellipsify(hash, 8)} mono />;
}

export function HomeRouterScreen() {
  const router = useRouter();
  const { wallet, status } = useWallet();
  const { role, isLoading, error, refetch } = useRole();

  useEffect(() => {
    if (status === "connecting") return;
    if (status !== "connected" || !wallet) {
      router.replace("/connect-wallet");
      return;
    }
    if (isLoading || error) return;
    if (role === null) {
      router.replace("/role-select");
      return;
    }
    router.replace(role === "farmer" ? "/farmer/home" : "/partner/home");
  }, [error, isLoading, role, router, status, wallet]);

  if (error) {
    return (
      <ErrorState
        title="Could not fetch role"
        message={error.message}
        onRetry={() => void refetch()}
      />
    );
  }

  return <LoadingState message="Checking your Harvverse account..." />;
}

export function ConnectWalletScreen() {
  const router = useRouter();
  const { connectors, connect, wallet, status, error } = useWallet();
  const upsertAfterWalletConnect = useMutation(
    api.users.upsertAfterWalletConnect,
  );

  useEffect(() => {
    const address = wallet?.account.address?.toString();
    if (!address) return;

    upsertAfterWalletConnect({ wallet: address })
      .catch((err) => {
        console.error("Failed to upsert wallet user", err);
      })
      .finally(() => {
        router.replace("/");
      });
  }, [router, upsertAfterWalletConnect, wallet]);

  return (
    <AppShell title="Connect Wallet">
      <div className="mx-auto grid max-w-3xl gap-4">
        <Card>
          <div className="space-y-3">
            <h2 className="text-3xl font-bold tracking-tight">Harvverse</h2>
            <p className="text-sm text-muted">
              Connect a Solana wallet, choose a network, and continue into the
              same role-based workflow used by the Android app.
            </p>
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">Network</h3>
              <p className="text-sm text-muted">
                Devnet is the default app network.
              </p>
            </div>
            <ClusterSelect />
          </div>
          <div className="grid gap-2">
            {connectors.length === 0 ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                No browser wallet was detected. Install a wallet that supports
                Wallet Standard, then refresh this page.
              </p>
            ) : (
              connectors.map((connector) => (
                <Button
                  key={connector.id}
                  variant="green"
                  disabled={status === "connecting"}
                  onClick={() => {
                    connect(connector.id).catch(() => {
                      /* context surfaces the error */
                    });
                  }}
                  className="justify-start"
                >
                  {status === "connecting"
                    ? "Connecting..."
                    : `Connect ${connector.name}`}
                </Button>
              ))
            )}
          </div>
          {error != null && (
            <p className="mt-3 whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error instanceof Error ? error.message : String(error)}
            </p>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

export function RoleSelectScreen() {
  const router = useRouter();
  const { wallet, disconnect } = useWallet();
  const { refetch } = useRole();
  const { signAndSendWithSigner, isPending, error, reset } = useTransaction();
  const recordRoleRegistration = useMutation(api.users.recordRoleRegistration);
  const [selectedRole, setSelectedRole] = useState<RoleOption | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  useEffect(() => {
    if (!wallet) {
      router.replace("/connect-wallet");
    }
  }, [router, wallet]);

  const handleRegister = useCallback(async () => {
    if (!selectedRole || !wallet) return;

    reset();
    setTxSignature(null);

    try {
      const roleKind =
        selectedRole === "farmer" ? RoleKind.Farmer : RoleKind.Partner;
      const walletAddress = wallet.account.address;
      const [rolePda] = await findUserRolePda({ farmer: walletAddress });

      const { signature } = await signAndSendWithSigner(async (signer) => {
        const instruction = await buildRegisterRoleTx({
          wallet: signer,
          role: roleKind,
        });
        return [instruction];
      });

      setTxSignature(signature);
      await recordRoleRegistration({
        wallet: walletAddress.toString(),
        role: selectedRole,
        rolePda: rolePda.toString(),
        roleTx: signature,
      });
      await refetch();
      router.replace(
        selectedRole === "farmer" ? "/farmer/home" : "/partner/home",
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Role registration failed";
      toast.error(message);
    }
  }, [
    recordRoleRegistration,
    refetch,
    reset,
    router,
    selectedRole,
    signAndSendWithSigner,
    wallet,
  ]);

  return (
    <AppShell title="Choose your role">
      <div className="mx-auto max-w-3xl space-y-4">
        <p className="text-sm text-muted">
          Your role is registered on-chain and controls which Harvverse workflow
          you can access.
        </p>
        {wallet && (
          <WalletAddressCard address={wallet.account.address.toString()} />
        )}
        <Button
          variant="danger"
          onClick={() => {
            disconnect().catch(() => {});
            router.replace("/connect-wallet");
          }}
        >
          Disconnect Wallet
        </Button>

        <div className="grid gap-3 md:grid-cols-2">
          {[
            {
              value: "farmer" as const,
              label: "Farmer",
              description:
                "Create and publish coffee lots, track agronomic data, and manage partner-ready farm records.",
            },
            {
              value: "partner" as const,
              label: "Partner",
              description:
                "Browse verified coffee lots, reserve partnerships, and review settlement projections.",
            },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={isPending}
              onClick={() => setSelectedRole(option.value)}
              className={cx(
                "cursor-pointer rounded-lg border bg-card p-4 text-left transition disabled:pointer-events-none disabled:opacity-60",
                selectedRole === option.value
                  ? "border-emerald-700 ring-2 ring-emerald-100"
                  : "border-border hover:border-emerald-300",
              )}
            >
              <h2 className="text-lg font-bold">{option.label}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                {option.description}
              </p>
            </button>
          ))}
        </div>

        {txSignature && (
          <Card className="border-emerald-200 bg-emerald-50">
            <p className="font-mono text-sm text-emerald-800">
              Confirming {ellipsify(txSignature, 8)}
            </p>
          </Card>
        )}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <p className="whitespace-pre-wrap text-sm text-red-700">
              {error.message}
            </p>
          </Card>
        )}

        <Button
          variant="green"
          disabled={!selectedRole || isPending}
          onClick={handleRegister}
          className="w-full"
        >
          {isPending ? "Waiting for wallet..." : "Sign and register role"}
        </Button>
      </div>
    </AppShell>
  );
}

export function FarmerHomeScreen() {
  const { wallet, disconnect } = useWallet();
  const { rolePda } = useRole();
  const { lots, isLoading } = useFarmerLots();
  const router = useRouter();

  return (
    <RequireRole requiredRole="farmer">
      <AppShell role="farmer" title="Farmer Dashboard">
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              {wallet && (
                <WalletAddressCard
                  address={wallet.account.address.toString()}
                />
              )}
              {rolePda && (
                <Card>
                  <DetailRow label="Role PDA" value={ellipsify(rolePda)} mono />
                </Card>
              )}
            </div>
            <Card>
              <div className="grid gap-2">
                <Button
                  variant="green"
                  onClick={() => router.push("/farmer/lots/new")}
                >
                  Create lot
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => router.push("/farmer/profile")}
                >
                  Farmer profile
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    disconnect().catch(() => {});
                    router.replace("/connect-wallet");
                  }}
                >
                  Disconnect wallet
                </Button>
              </div>
            </Card>
          </div>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">My Lots</h2>
              <Link
                href="/farmer/lots/new"
                className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                Create lot
              </Link>
            </div>
            {isLoading ? (
              <Card>
                <p className="text-sm text-muted">Loading lots...</p>
              </Card>
            ) : lots.length === 0 ? (
              <Card>
                <p className="text-sm text-muted">
                  No lots yet. Create your first lot to get started.
                </p>
              </Card>
            ) : (
              <div className="grid gap-3">
                {lots.map((lot) => (
                  <Link
                    key={lot._id}
                    href={`/farmer/lots/${encodeURIComponent(lot.lotCode)}/edit`}
                    className="rounded-lg border border-border bg-card p-4 shadow-sm transition hover:border-emerald-300"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-sm font-bold">
                          {lot.lotCode}
                        </p>
                        <h3 className="mt-1 font-semibold">{lot.farmName}</h3>
                        <p className="mt-1 text-sm text-muted">
                          {lot.variety} - {formatUsdCents(lot.ticketUsdcCents)}
                        </p>
                      </div>
                      <StatusBadge status={lot.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </AppShell>
    </RequireRole>
  );
}

export function FarmerProfileScreen() {
  const { wallet } = useWallet();
  const walletAddress = wallet?.account.address?.toString() ?? "";
  const { signAndSendWithSigner, isPending, error } = useTransaction();
  const upsertProfile = useMutation(api.farmerProfiles.upsert);
  const existingProfile = useQuery(
    api.farmerProfiles.getByWallet,
    walletAddress ? { wallet: walletAddress } : "skip",
  );

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successTx, setSuccessTx] = useState<string | null>(null);

  useEffect(() => {
    if (existingProfile) {
      setDisplayName(existingProfile.displayName);
      setBio(existingProfile.bio ?? "");
      setCountry(existingProfile.country ?? "");
      setRegion(existingProfile.region ?? "");
    }
  }, [existingProfile]);

  const handleSubmit = useCallback(async () => {
    if (!walletAddress || !displayName.trim()) {
      toast.error("Display name is required.");
      return;
    }

    setIsSubmitting(true);
    setSuccessTx(null);

    try {
      const profilePayload = {
        displayName: displayName.trim(),
        bio: bio.trim(),
        country: country.trim(),
        region: region.trim(),
        wallet: walletAddress,
      };
      const metadataHashHex = await computeManifestHashHex(
        profilePayload as Record<string, unknown>,
      );
      const displayNameHash = await computeManifestHash({
        displayName: displayName.trim(),
      } as Record<string, unknown>);
      const metadataUriHash = await computeManifestHash(
        profilePayload as Record<string, unknown>,
      );
      const [farmerProfilePda] = await findFarmerProfilePda({
        farmer: walletAddress as Address,
      });
      const result = await signAndSendWithSigner(async (signer) => [
        await buildCreateFarmerProfileTx({
          farmer: signer,
          displayNameHash,
          metadataUriHash,
        }),
      ]);

      await upsertProfile({
        wallet: walletAddress,
        farmerProfilePda: farmerProfilePda.toString(),
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
        country: country.trim() || undefined,
        region: region.trim() || undefined,
        metadataHash: metadataHashHex,
      });

      setSuccessTx(result.signature);
      toast.success("Farmer profile saved.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Profile creation failed";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    bio,
    country,
    displayName,
    region,
    signAndSendWithSigner,
    upsertProfile,
    walletAddress,
  ]);

  const busy = isPending || isSubmitting;

  return (
    <RequireRole requiredRole="farmer">
      <AppShell role="farmer" title="Farmer Profile">
        <ProfileFormLayout
          subtitle="Create your on-chain farmer profile so partners can verify your identity."
          profilePda={existingProfile?.farmerProfilePda}
          buttonLabel={
            existingProfile
              ? "Update profile on-chain"
              : "Sign and create profile"
          }
          busy={busy}
          disabled={!displayName.trim()}
          txError={error?.message}
          successTx={successTx}
          onSubmit={handleSubmit}
        >
          <FormField
            label="Display Name *"
            value={displayName}
            onChange={setDisplayName}
            placeholder="Your farm or name"
            disabled={busy}
          />
          <FormField
            label="Bio"
            value={bio}
            onChange={setBio}
            placeholder="Tell partners about your farm"
            disabled={busy}
            multiline
          />
          <FormField
            label="Country"
            value={country}
            onChange={setCountry}
            placeholder="Honduras"
            disabled={busy}
          />
          <FormField
            label="Region"
            value={region}
            onChange={setRegion}
            placeholder="Comayagua"
            disabled={busy}
          />
        </ProfileFormLayout>
      </AppShell>
    </RequireRole>
  );
}

export function PartnerProfileScreen() {
  const { wallet } = useWallet();
  const walletAddress = wallet?.account.address?.toString() ?? "";
  const { signAndSendWithSigner, isPending, error } = useTransaction();
  const upsertProfile = useMutation(api.partnerProfiles.upsert);
  const existingProfile = useQuery(
    api.partnerProfiles.getByWallet,
    walletAddress ? { wallet: walletAddress } : "skip",
  );

  const [displayName, setDisplayName] = useState("");
  const [organization, setOrganization] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successTx, setSuccessTx] = useState<string | null>(null);

  useEffect(() => {
    if (existingProfile) {
      setDisplayName(existingProfile.displayName);
      setOrganization(existingProfile.organization ?? "");
    }
  }, [existingProfile]);

  const handleSubmit = useCallback(async () => {
    if (!walletAddress || !displayName.trim()) {
      toast.error("Display name is required.");
      return;
    }

    setIsSubmitting(true);
    setSuccessTx(null);

    try {
      const profilePayload = {
        displayName: displayName.trim(),
        organization: organization.trim(),
        wallet: walletAddress,
      };
      const metadataHashHex = await computeManifestHashHex(
        profilePayload as Record<string, unknown>,
      );
      const displayNameHash = await computeManifestHash({
        displayName: displayName.trim(),
      } as Record<string, unknown>);
      const metadataUriHash = await computeManifestHash(
        profilePayload as Record<string, unknown>,
      );
      const [partnerProfilePda] = await findPartnerProfilePda({
        partner: walletAddress as Address,
      });
      const result = await signAndSendWithSigner(async (signer) => [
        await buildCreatePartnerProfileTx({
          partner: signer,
          displayNameHash,
          metadataUriHash,
        }),
      ]);

      await upsertProfile({
        wallet: walletAddress,
        partnerProfilePda: partnerProfilePda.toString(),
        displayName: displayName.trim(),
        organization: organization.trim() || undefined,
        metadataHash: metadataHashHex,
      });

      setSuccessTx(result.signature);
      toast.success("Partner profile saved.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Profile creation failed";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    displayName,
    organization,
    signAndSendWithSigner,
    upsertProfile,
    walletAddress,
  ]);

  const busy = isPending || isSubmitting;

  return (
    <RequireRole requiredRole="partner">
      <AppShell role="partner" title="Partner Profile">
        <ProfileFormLayout
          subtitle="Create your on-chain partner profile so farmers can verify your identity."
          profilePda={existingProfile?.partnerProfilePda}
          buttonLabel={
            existingProfile
              ? "Update profile on-chain"
              : "Sign and create profile"
          }
          busy={busy}
          disabled={!displayName.trim()}
          txError={error?.message}
          successTx={successTx}
          onSubmit={handleSubmit}
        >
          <FormField
            label="Display Name *"
            value={displayName}
            onChange={setDisplayName}
            placeholder="Your name or alias"
            disabled={busy}
          />
          <FormField
            label="Organization"
            value={organization}
            onChange={setOrganization}
            placeholder="Harvest Capital LLC"
            disabled={busy}
          />
        </ProfileFormLayout>
      </AppShell>
    </RequireRole>
  );
}

function ProfileFormLayout({
  children,
  subtitle,
  profilePda,
  buttonLabel,
  busy,
  disabled,
  txError,
  successTx,
  onSubmit,
}: {
  children: ReactNode;
  subtitle: string;
  profilePda?: string;
  buttonLabel: string;
  busy: boolean;
  disabled: boolean;
  txError?: string;
  successTx: string | null;
  onSubmit: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <p className="text-sm text-muted">{subtitle}</p>
      {profilePda && (
        <Card>
          <DetailRow label="Profile PDA" value={ellipsify(profilePda)} mono />
        </Card>
      )}
      <Card>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          {children}
          <Button
            type="submit"
            variant="green"
            disabled={busy || disabled}
            className="w-full"
          >
            {busy ? "Waiting for wallet..." : buttonLabel}
          </Button>
          {txError && (
            <p className="whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {txError}
            </p>
          )}
          {successTx && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 font-mono text-sm text-emerald-800">
              Transaction {ellipsify(successTx, 8)}
            </p>
          )}
        </form>
      </Card>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "number";
  disabled?: boolean;
  multiline?: boolean;
}) {
  const inputClasses =
    "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-emerald-600 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-muted dark:disabled:bg-neutral-900";

  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cx(inputClasses, "min-h-24 resize-y")}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClasses}
        />
      )}
    </label>
  );
}

function LotForm({
  data,
  onChange,
  disabled,
  showAutofill = true,
  children,
}: {
  data: LotFormData;
  onChange: (data: LotFormData) => void;
  disabled?: boolean;
  showAutofill?: boolean;
  children?: ReactNode;
}) {
  const update = useCallback(
    (field: keyof LotFormData, value: string) => {
      onChange({ ...data, [field]: value });
    },
    [data, onChange],
  );

  const handleAutofill = useCallback(() => {
    onChange({
      lotCode: ZAFIRO_DEMO_LOT.lotCode,
      farmName: ZAFIRO_DEMO_LOT.farmName,
      country: ZAFIRO_DEMO_LOT.country,
      region: ZAFIRO_DEMO_LOT.region,
      latitude: String(ZAFIRO_DEMO_LOT.latitude),
      longitude: String(ZAFIRO_DEMO_LOT.longitude),
      altitudeMeters: String(ZAFIRO_DEMO_LOT.altitudeMeters),
      variety: ZAFIRO_DEMO_LOT.variety,
      areaManzanas: String(ZAFIRO_DEMO_LOT.areaManzanas),
      ticketUsdcCents: String(ZAFIRO_DEMO_LOT.ticketUsdcCents),
      farmerShareBps: String(ZAFIRO_DEMO_LOT.farmerShareBps),
      partnerShareBps: String(ZAFIRO_DEMO_LOT.partnerShareBps),
    });
  }, [onChange]);

  return (
    <Card>
      <div className="space-y-4">
        {showAutofill && (
          <Button
            variant="secondary"
            disabled={disabled}
            onClick={handleAutofill}
            className="w-full border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
          >
            Autofill Zafiro demo lot
          </Button>
        )}
        <FormField
          label="Lot Code *"
          value={data.lotCode}
          onChange={(value) => update("lotCode", value)}
          placeholder="HV-HN-ZAF-L02"
          disabled={disabled}
        />
        <FormField
          label="Farm Name *"
          value={data.farmName}
          onChange={(value) => update("farmName", value)}
          placeholder="Zafiro"
          disabled={disabled}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Country *"
            value={data.country}
            onChange={(value) => update("country", value)}
            placeholder="Honduras"
            disabled={disabled}
          />
          <FormField
            label="Region *"
            value={data.region}
            onChange={(value) => update("region", value)}
            placeholder="Comayagua"
            disabled={disabled}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Latitude"
            value={data.latitude}
            onChange={(value) => update("latitude", value)}
            placeholder="14.9465"
            type="number"
            disabled={disabled}
          />
          <FormField
            label="Longitude"
            value={data.longitude}
            onChange={(value) => update("longitude", value)}
            placeholder="-88.0863"
            type="number"
            disabled={disabled}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Altitude (m)"
            value={data.altitudeMeters}
            onChange={(value) => update("altitudeMeters", value)}
            placeholder="1300"
            type="number"
            disabled={disabled}
          />
          <FormField
            label="Variety *"
            value={data.variety}
            onChange={(value) => update("variety", value)}
            placeholder="Parainema"
            disabled={disabled}
          />
        </div>
        <FormField
          label="Area (manzanas)"
          value={data.areaManzanas}
          onChange={(value) => update("areaManzanas", value)}
          placeholder="1.0"
          type="number"
          disabled={disabled}
        />
        <FormField
          label="Ticket (USDC cents) *"
          value={data.ticketUsdcCents}
          onChange={(value) => update("ticketUsdcCents", value)}
          placeholder="342500"
          type="number"
          disabled={disabled}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Farmer Share (BPS)"
            value={data.farmerShareBps}
            onChange={(value) => update("farmerShareBps", value)}
            placeholder="6000"
            type="number"
            disabled={disabled}
          />
          <FormField
            label="Partner Share (BPS)"
            value={data.partnerShareBps}
            onChange={(value) => update("partnerShareBps", value)}
            placeholder="4000"
            type="number"
            disabled={disabled}
          />
        </div>
        {children}
      </div>
    </Card>
  );
}

function validateLotForm(formData: LotFormData) {
  const { lotCode, farmName, variety, country, region, ticketUsdcCents } =
    formData;

  if (
    !lotCode.trim() ||
    !farmName.trim() ||
    !variety.trim() ||
    !country.trim() ||
    !region.trim() ||
    !ticketUsdcCents.trim()
  ) {
    return "Please fill in all required fields.";
  }

  const farmerShareBps = parseInt(formData.farmerShareBps, 10) || 0;
  const partnerShareBps = parseInt(formData.partnerShareBps, 10) || 0;
  if (farmerShareBps + partnerShareBps !== 10000) {
    return "Farmer share + Partner share must equal 10000 BPS.";
  }

  return null;
}

function lotArgsFromForm(formData: LotFormData, wallet: string) {
  return {
    lotCode: formData.lotCode.trim(),
    farmerWallet: wallet,
    farmName: formData.farmName.trim(),
    variety: formData.variety.trim(),
    region: formData.region.trim(),
    country: formData.country.trim(),
    latitude: parseFloat(formData.latitude) || 0,
    longitude: parseFloat(formData.longitude) || 0,
    altitudeMeters: parseInt(formData.altitudeMeters, 10) || 0,
    areaManzanas: parseFloat(formData.areaManzanas) || 0,
    ticketUsdcCents: parseInt(formData.ticketUsdcCents, 10) || 0,
    farmerShareBps: parseInt(formData.farmerShareBps, 10) || 0,
    partnerShareBps: parseInt(formData.partnerShareBps, 10) || 0,
  };
}

export function CreateLotScreen() {
  const { wallet } = useWallet();
  const router = useRouter();
  const createDraft = useMutation(api.lots.createDraft);
  const upsertPlan = useMutation(api.agronomicPlans.upsertPlan);
  const addSnapshot = useMutation(api.sensorSnapshots.addSnapshot);
  const [formData, setFormData] = useState<LotFormData>(EMPTY_LOT_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [planAutofilled, setPlanAutofilled] = useState(false);
  const [sensorAutofilled, setSensorAutofilled] = useState(false);

  const walletAddress = wallet?.account.address?.toString() ?? "";

  const handleSaveDraft = useCallback(async () => {
    if (!walletAddress) {
      toast.error("No wallet connected.");
      return;
    }

    const validationError = validateLotForm(formData);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSaving(true);
    try {
      await createDraft(lotArgsFromForm(formData, walletAddress));
      setDraftSaved(true);
      toast.success("Draft saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save draft");
    } finally {
      setIsSaving(false);
    }
  }, [createDraft, formData, walletAddress]);

  const handleAutofillPlan = useCallback(async () => {
    const lotCode = formData.lotCode.trim();
    if (!lotCode) {
      toast.error("Save the lot draft first.");
      return;
    }

    try {
      const planHash = await computeManifestHashHex({
        lotCode,
        planId: DEMO_AGRONOMIC_PLAN.planId,
        planJson: DEMO_AGRONOMIC_PLAN.planJson,
      } as Record<string, unknown>);
      await upsertPlan({
        lotCode,
        planId: DEMO_AGRONOMIC_PLAN.planId,
        planJson: DEMO_AGRONOMIC_PLAN.planJson,
        hash: planHash,
      });
      setPlanAutofilled(true);
      toast.success("Demo agronomic plan saved.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to autofill plan",
      );
    }
  }, [formData.lotCode, upsertPlan]);

  const handleAutofillSensor = useCallback(async () => {
    const lotCode = formData.lotCode.trim();
    if (!lotCode) {
      toast.error("Save the lot draft first.");
      return;
    }

    try {
      const payload = { ...DEMO_SENSOR_SNAPSHOT };
      const hash = await computeManifestHashHex(
        payload as unknown as Record<string, unknown>,
      );
      await addSnapshot({
        lotCode,
        source: DEMO_SENSOR_SNAPSHOT.source,
        temperatureC: DEMO_SENSOR_SNAPSHOT.temperatureC,
        humidityPct: DEMO_SENSOR_SNAPSHOT.humidityPct,
        soilPh: DEMO_SENSOR_SNAPSHOT.soilPh,
        soilMoisturePct: DEMO_SENSOR_SNAPSHOT.soilMoisturePct,
        payload,
        hash,
      });
      setSensorAutofilled(true);
      toast.success("Demo sensor snapshot saved.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to autofill sensor",
      );
    }
  }, [addSnapshot, formData.lotCode]);

  return (
    <RequireRole requiredRole="farmer">
      <AppShell role="farmer" title="Create New Lot">
        <div className="mx-auto max-w-3xl">
          <LotForm data={formData} onChange={setFormData} disabled={isSaving}>
            <Button
              variant="green"
              disabled={isSaving || draftSaved}
              onClick={handleSaveDraft}
              className="w-full"
            >
              {isSaving
                ? "Saving..."
                : draftSaved
                  ? "Draft Saved"
                  : "Save Draft"}
            </Button>
            {draftSaved && (
              <div className="space-y-3 border-t border-border pt-4">
                <h2 className="text-sm font-bold">Demo Autofill Helpers</h2>
                <Button
                  variant="secondary"
                  disabled={planAutofilled}
                  onClick={handleAutofillPlan}
                  className="w-full border-blue-200 bg-blue-50 text-blue-900 hover:bg-blue-100"
                >
                  {planAutofilled
                    ? "Plan autofilled"
                    : "Autofill agronomic plan"}
                </Button>
                <Button
                  variant="secondary"
                  disabled={sensorAutofilled}
                  onClick={handleAutofillSensor}
                  className="w-full border-blue-200 bg-blue-50 text-blue-900 hover:bg-blue-100"
                >
                  {sensorAutofilled
                    ? "Sensor autofilled"
                    : "Autofill demo sensor snapshot"}
                </Button>
                <Button
                  variant="purple"
                  onClick={() =>
                    router.push(
                      `/farmer/lots/${encodeURIComponent(
                        formData.lotCode.trim(),
                      )}/publish-review`,
                    )
                  }
                  className="w-full"
                >
                  Proceed to Publish
                </Button>
              </div>
            )}
          </LotForm>
        </div>
      </AppShell>
    </RequireRole>
  );
}

function useLotCodeParam() {
  const params = useParams<{ lotCode: string }>();
  return decodeURIComponent(params.lotCode ?? "");
}

export function EditLotScreen() {
  const lotCode = useLotCodeParam();
  const router = useRouter();
  const lot = useQuery(api.lots.getByCode, lotCode ? { lotCode } : "skip");
  const updateDraft = useMutation(api.lots.updateDraft);
  const [formData, setFormData] = useState<LotFormData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (lot && !formData) {
      setFormData({
        lotCode: lot.lotCode,
        farmName: lot.farmName,
        country: lot.country,
        region: lot.region,
        latitude: String(lot.latitude),
        longitude: String(lot.longitude),
        altitudeMeters: String(lot.altitudeMeters),
        variety: lot.variety,
        areaManzanas: String(lot.areaManzanas),
        ticketUsdcCents: String(lot.ticketUsdcCents),
        farmerShareBps: String(lot.farmerShareBps),
        partnerShareBps: String(lot.partnerShareBps),
      });
    }
  }, [formData, lot]);

  const handleSave = useCallback(async () => {
    if (!formData || !lotCode) return;

    const validationError = validateLotForm(formData);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSaving(true);
    try {
      const args = lotArgsFromForm(formData, "");
      await updateDraft({
        lotCode,
        farmName: args.farmName,
        variety: args.variety,
        region: args.region,
        country: args.country,
        latitude: args.latitude,
        longitude: args.longitude,
        altitudeMeters: args.altitudeMeters,
        areaManzanas: args.areaManzanas,
        ticketUsdcCents: args.ticketUsdcCents,
        farmerShareBps: args.farmerShareBps,
        partnerShareBps: args.partnerShareBps,
      });
      toast.success("Lot draft updated.");
      router.push("/farmer/home");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save lot");
    } finally {
      setIsSaving(false);
    }
  }, [formData, lotCode, router, updateDraft]);

  if (lot === undefined || !formData) {
    return <LoadingState message="Loading lot..." />;
  }

  if (!lot) {
    return <ErrorState title="Lot not found" message={lotCode} />;
  }

  const isDraft = lot.status === "draft";

  return (
    <RequireRole requiredRole="farmer">
      <AppShell
        role="farmer"
        title={`${isDraft ? "Edit Lot" : "Lot Details"}: ${lot.lotCode}`}
      >
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted">
              {isDraft
                ? "Draft lots can be edited before publishing."
                : `This lot is ${lot.status} and details are read-only.`}
            </p>
            <StatusBadge status={lot.status} />
          </div>
          <LotForm
            data={formData}
            onChange={setFormData}
            disabled={isSaving || !isDraft}
            showAutofill={isDraft}
          >
            {isDraft && (
              <Button
                variant="green"
                disabled={isSaving}
                onClick={handleSave}
                className="w-full"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            )}
            <Button
              variant="purple"
              onClick={() =>
                router.push(
                  `/farmer/lots/${encodeURIComponent(lotCode)}/publish-review`,
                )
              }
              className="w-full"
            >
              {isDraft ? "Proceed to Publish" : "View Publish Review"}
            </Button>
          </LotForm>
        </div>
      </AppShell>
    </RequireRole>
  );
}

export function PublishReviewScreen() {
  const lotCode = useLotCodeParam();
  const { wallet } = useWallet();
  const client = useSolanaClient();
  const { cluster } = useCluster();
  const router = useRouter();
  const { signAndSendWithSigner, isPending, error } = useTransaction();
  const lot = useQuery(api.lots.getByCode, lotCode ? { lotCode } : "skip");
  const plan = useQuery(
    api.agronomicPlans.getByLot,
    lotCode ? { lotCode } : "skip",
  );
  const media = useQuery(
    api.lotMedia.listByLot,
    lotCode ? { lotCode } : "skip",
  );
  const sensors = useQuery(
    api.sensorSnapshots.listByLot,
    lotCode ? { lotCode } : "skip",
  );
  const recordOnChainLot = useMutation(api.lots.recordOnChainLot);
  const markPublished = useMutation(api.lots.markPublished);

  const [hashes, setHashes] = useState<PublishFlowResult | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const [publishedTx, setPublishedTx] = useState<string | null>(null);
  const [hasFarmerProfile, setHasFarmerProfile] = useState<boolean | null>(
    null,
  );
  const [profileCheckError, setProfileCheckError] = useState<string | null>(
    null,
  );
  const walletAddress = wallet?.account.address?.toString() ?? "";

  useEffect(() => {
    if (!walletAddress) {
      setHasFarmerProfile(null);
      setProfileCheckError(null);
      return;
    }

    let isActive = true;
    setHasFarmerProfile(null);
    setProfileCheckError(null);

    fetchFarmerProfileByWallet(client.rpc, walletAddress as Address)
      .then((profile) => {
        if (isActive) setHasFarmerProfile(Boolean(profile));
      })
      .catch((err) => {
        if (!isActive) return;
        setHasFarmerProfile(false);
        setProfileCheckError(
          err instanceof Error
            ? err.message
            : "Unable to verify farmer profile.",
        );
      });

    return () => {
      isActive = false;
    };
  }, [client.rpc, cluster, walletAddress]);

  useEffect(() => {
    if (!lot || !walletAddress) return;
    if (plan === undefined || media === undefined || sensors === undefined) {
      return;
    }
    if (hashes) return;

    const compute = async () => {
      setIsComputing(true);
      try {
        const lotData: LotPublishData = {
          lotCode: lot.lotCode,
          farmName: lot.farmName,
          farmerWallet: walletAddress, // Keep as string for initial computation
          country: lot.country,
          region: lot.region,
          latitude: lot.latitude,
          longitude: lot.longitude,
          altitudeMeters: lot.altitudeMeters,
          variety: lot.variety,
          areaManzanas: lot.areaManzanas,
          ticketUsdcCents: lot.ticketUsdcCents,
          farmerShareBps: lot.farmerShareBps,
          partnerShareBps: lot.partnerShareBps,
        };
        const mediaItems = media.map((item) => ({
          storageId: item.storageId,
          kind: item.kind,
          hash: item.hash,
        }));
        const sensorSnapshots = sensors.map((snapshot) => ({
          source: snapshot.source,
          temperatureC: snapshot.temperatureC ?? undefined,
          humidityPct: snapshot.humidityPct ?? undefined,
          soilPh: snapshot.soilPh ?? undefined,
          soilMoisturePct: snapshot.soilMoisturePct ?? undefined,
          hash: snapshot.hash,
        }));
        const result = await computePublishHashes(
          lotData,
          plan ? { planId: plan.planId, planJson: plan.planJson } : null,
          mediaItems,
          sensorSnapshots,
        );
        setHashes(result);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to compute hashes",
        );
      } finally {
        setIsComputing(false);
      }
    };

    void compute();
  }, [hashes, lot, media, plan, sensors, walletAddress]);

  const handlePublish = useCallback(async () => {
    if (!hashes || !lot) return;
    if (!hasFarmerProfile) {
      toast.error(
        "Create your on-chain farmer profile before publishing a lot.",
      );
      return;
    }

    try {
      const result = await signAndSendWithSigner((signer) =>
        buildPublishInstructions(
          signer,
          hashes.lotPda,
          hashes.lotIdHash,
          hashes.metadataHash,
          hashes.planHash,
          hashes.mediaManifestHash,
          hashes.sensorManifestHash,
          lot.ticketUsdcCents,
          lot.farmerShareBps,
          lot.partnerShareBps,
        ),
      );

      await recordOnChainLot({
        lotCode: lot.lotCode,
        lotPda: hashes.lotPda.toString(),
        tx: result.signature,
      });

      await markPublished({
        lotCode: lot.lotCode,
        tx: result.signature,
        metadataHash: hashes.metadataHashHex,
        planHash: hashes.planHashHex,
        mediaManifestHash: hashes.mediaManifestHashHex,
        sensorManifestHash: hashes.sensorManifestHashHex,
      });

      setPublishedTx(result.signature);
      toast.success("Lot published on-chain.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Publish failed");
    }
  }, [
    hashes,
    hasFarmerProfile,
    lot,
    markPublished,
    recordOnChainLot,
    signAndSendWithSigner,
  ]);

  if (
    lot === undefined ||
    plan === undefined ||
    media === undefined ||
    sensors === undefined
  ) {
    return <LoadingState message="Loading publish data..." />;
  }

  if (!lot) {
    return <ErrorState title="Lot not found" message={lotCode} />;
  }

  if (publishedTx) {
    return (
      <RequireRole requiredRole="farmer">
        <AppShell role="farmer" title="Lot Published">
          <Card className="mx-auto max-w-2xl border-emerald-200 bg-emerald-50">
            <DetailRow label="Lot Code" value={lot.lotCode} />
            <DetailRow
              label="Lot PDA"
              value={hashes ? ellipsify(hashes.lotPda.toString()) : "-"}
              mono
            />
            <DetailRow
              label="Transaction"
              value={ellipsify(publishedTx)}
              mono
            />
            <Button
              variant="green"
              onClick={() => router.push("/farmer/home")}
              className="mt-4 w-full"
            >
              Back to Dashboard
            </Button>
          </Card>
        </AppShell>
      </RequireRole>
    );
  }

  return (
    <RequireRole requiredRole="farmer">
      <AppShell role="farmer" title="Publish Review">
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <Card>
              <h2 className="mb-2 font-bold">Lot Summary</h2>
              <DetailRow label="Network" value={cluster} />
              <DetailRow label="Code" value={lot.lotCode} />
              <DetailRow label="Farm" value={lot.farmName} />
              <DetailRow label="Variety" value={lot.variety} />
              <DetailRow
                label="Location"
                value={`${lot.region}, ${lot.country}`}
              />
              <DetailRow
                label="Ticket"
                value={formatUsdCents(lot.ticketUsdcCents)}
              />
              <DetailRow
                label="Split"
                value={`Farmer ${formatBps(lot.farmerShareBps)} / Partner ${formatBps(
                  lot.partnerShareBps,
                )}`}
              />
            </Card>
            <Card>
              <h2 className="mb-2 font-bold">Manifest Hashes</h2>
              {isComputing ? (
                <p className="text-sm text-muted">Computing hashes...</p>
              ) : hashes ? (
                <>
                  <HashRow label="Metadata" hash={hashes.metadataHashHex} />
                  <HashRow label="Plan" hash={hashes.planHashHex} />
                  <HashRow label="Media" hash={hashes.mediaManifestHashHex} />
                  <HashRow label="Sensor" hash={hashes.sensorManifestHashHex} />
                  <DetailRow
                    label="Lot PDA"
                    value={ellipsify(hashes.lotPda.toString())}
                    mono
                  />
                </>
              ) : (
                <p className="text-sm text-red-700">
                  Failed to compute hashes.
                </p>
              )}
            </Card>
          </div>
          <div className="space-y-4">
            {hasFarmerProfile === null ? (
              <Card>
                <p className="text-sm text-muted">
                  Checking on-chain farmer profile...
                </p>
              </Card>
            ) : hasFarmerProfile === false ? (
              <Card className="border-amber-200 bg-amber-50">
                <h2 className="font-bold text-amber-900">
                  Farmer profile required
                </h2>
                <p className="mt-2 text-sm text-amber-900">
                  This wallet does not have the FarmerProfile PDA required by
                  create_lot.
                </p>
                {profileCheckError && (
                  <p className="mt-2 whitespace-pre-wrap text-xs text-amber-800">
                    {profileCheckError}
                  </p>
                )}
                <Button
                  variant="green"
                  onClick={() => router.push("/farmer/profile")}
                  className="mt-4 w-full"
                >
                  Create farmer profile
                </Button>
              </Card>
            ) : (
              <Card className="border-emerald-200 bg-emerald-50">
                <p className="text-sm font-semibold text-emerald-800">
                  Farmer profile verified.
                </p>
              </Card>
            )}
            {error && (
              <Card className="border-red-200 bg-red-50">
                <p className="whitespace-pre-wrap text-sm text-red-700">
                  {error.message}
                </p>
              </Card>
            )}
            <Button
              variant="green"
              disabled={
                isPending || isComputing || !hashes || hasFarmerProfile !== true
              }
              onClick={handlePublish}
              className="w-full"
            >
              {isPending ? "Waiting for wallet..." : "Sign and publish lot"}
            </Button>
            {walletAddress && lotCode && (
              <AiChatPanel
                lotCode={lotCode}
                wallet={walletAddress}
                role="farmer"
              />
            )}
          </div>
        </div>
      </AppShell>
    </RequireRole>
  );
}

export function PartnerHomeScreen() {
  const { wallet, disconnect } = useWallet();
  const router = useRouter();
  const { rolePda } = useRole();
  const { partnerships, isLoading } = usePartnerships();
  const walletAddress = wallet?.account.address?.toString() ?? "";

  return (
    <RequireRole requiredRole="partner">
      <AppShell role="partner" title="Partner Dashboard">
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              {wallet && (
                <WalletAddressCard
                  address={wallet.account.address.toString()}
                />
              )}
              {rolePda && (
                <Card>
                  <DetailRow label="Role PDA" value={ellipsify(rolePda)} mono />
                </Card>
              )}
            </div>
            <Card>
              <div className="grid gap-2">
                <Button
                  variant="purple"
                  onClick={() => router.push("/partner/catalog")}
                >
                  Browse Lots
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => router.push("/partner/profile")}
                >
                  Partner profile
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    disconnect().catch(() => {});
                    router.replace("/connect-wallet");
                  }}
                >
                  Disconnect wallet
                </Button>
              </div>
            </Card>
          </div>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">My Partnerships</h2>
              <Link
                href="/partner/catalog"
                className="rounded-lg bg-violet-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-violet-800"
              >
                Browse Lots
              </Link>
            </div>
            {isLoading ? (
              <Card>
                <p className="text-sm text-muted">Loading partnerships...</p>
              </Card>
            ) : partnerships.length === 0 ? (
              <Card>
                <p className="text-sm text-muted">
                  No partnerships yet. Browse the lot catalog to reserve your
                  first partnership.
                </p>
              </Card>
            ) : (
              <div className="grid gap-3">
                {partnerships.map((partnership) => (
                  <Link
                    key={partnership._id}
                    href={`/partner/partnerships/${partnership._id}`}
                    className="rounded-lg border border-border bg-card p-4 shadow-sm transition hover:border-violet-300"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-sm font-bold">
                          {partnership.lotCode}
                        </p>
                        <p className="mt-1 text-sm text-muted">
                          Farmer {ellipsify(partnership.farmerWallet)}
                        </p>
                        {partnership.partnershipPda && (
                          <p className="mt-1 font-mono text-xs text-muted">
                            PDA {ellipsify(partnership.partnershipPda)}
                          </p>
                        )}
                      </div>
                      <StatusBadge status={partnership.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* AI Chat Panel for Partners */}
          {walletAddress && (
            <AiChatPanel
              lotCode="" // Empty for general partner queries
              wallet={walletAddress}
              role="partner"
            />
          )}
        </div>
      </AppShell>
    </RequireRole>
  );
}

export function CatalogScreen() {
  const { lots, isLoading } = useLotCatalog();
  const { wallet } = useWallet();
  const walletAddress = wallet?.account.address?.toString() ?? "";

  return (
    <RequireRole requiredRole="partner">
      <AppShell role="partner" title="Lot Catalog">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Browse published lots available for partnership.
          </p>
          {isLoading ? (
            <Card>
              <p className="text-sm text-muted">Loading lots...</p>
            </Card>
          ) : lots.length === 0 ? (
            <Card>
              <p className="text-sm text-muted">
                No published lots available yet.
              </p>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {lots.map((lot) => (
                <Link
                  key={lot._id}
                  href={`/partner/lots/${encodeURIComponent(lot.lotCode)}`}
                  className="rounded-lg border border-border bg-card p-4 shadow-sm transition hover:border-violet-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-bold">
                        {lot.lotCode}
                      </p>
                      <h2 className="mt-1 font-semibold">{lot.farmName}</h2>
                    </div>
                    <p className="text-sm font-bold text-violet-700">
                      {formatUsdCents(lot.ticketUsdcCents)}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    {lot.variety} - {lot.region}, {lot.country}
                  </p>
                </Link>
              ))}
            </div>
          )}

          {/* AI Chat Panel for Partners browsing lots */}
          {walletAddress && (
            <AiChatPanel
              lotCode="" // Empty for general catalog queries
              wallet={walletAddress}
              role="partner"
            />
          )}
        </div>
      </AppShell>
    </RequireRole>
  );
}

export function PartnerLotDetailScreen() {
  const lotCode = useLotCodeParam();
  const client = useSolanaClient();
  const { cluster } = useCluster();
  const router = useRouter();
  const { wallet } = useWallet();
  const lot = useQuery(api.lots.getByCode, lotCode ? { lotCode } : "skip");
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus>("loading");
  const [verificationError, setVerificationError] = useState<string | null>(
    null,
  );
  const walletAddress = wallet?.account.address?.toString() ?? "";

  useEffect(() => {
    if (!lot?.lotPda) {
      if (lot !== undefined) setVerificationStatus("not_found");
      return;
    }

    let isActive = true;
    setVerificationStatus("loading");
    setVerificationError(null);

    fetchLotByPda(client.rpc, lot.lotPda as Address)
      .then((onChainLot) => {
        if (!isActive) return;
        if (!onChainLot?.exists) {
          setVerificationStatus("not_found");
          return;
        }

        const data = onChainLot.data;
        const ticketMatch =
          Number(data.ticketUsdcCents) === lot.ticketUsdcCents;
        const farmerShareMatch = data.farmerShareBps === lot.farmerShareBps;
        const partnerShareMatch = data.partnerShareBps === lot.partnerShareBps;
        setVerificationStatus(
          ticketMatch && farmerShareMatch && partnerShareMatch
            ? "match"
            : "mismatch",
        );
      })
      .catch((err) => {
        if (!isActive) return;
        setVerificationStatus("error");
        setVerificationError(
          err instanceof Error ? err.message : "Verification failed",
        );
      });

    return () => {
      isActive = false;
    };
  }, [client.rpc, cluster, lot]);

  if (lot === undefined) {
    return <LoadingState message="Loading lot..." />;
  }

  if (!lot) {
    return <ErrorState title="Lot not found" message={lotCode} />;
  }

  return (
    <RequireRole requiredRole="partner">
      <AppShell role="partner" title={lot.farmName}>
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              <Card>
                <h2 className="mb-2 font-bold">{lot.lotCode}</h2>
                <DetailRow label="Variety" value={lot.variety} />
                <DetailRow
                  label="Location"
                  value={`${lot.region}, ${lot.country}`}
                />
                <DetailRow
                  label="Coordinates"
                  value={`${lot.latitude}, ${lot.longitude}`}
                />
                <DetailRow label="Altitude" value={`${lot.altitudeMeters}m`} />
                <DetailRow
                  label="Area"
                  value={`${lot.areaManzanas} manzanas`}
                />
                <DetailRow
                  label="Ticket"
                  value={formatUsdCents(lot.ticketUsdcCents)}
                />
                <DetailRow
                  label="Farmer Share"
                  value={formatBps(lot.farmerShareBps)}
                />
                <DetailRow
                  label="Partner Share"
                  value={formatBps(lot.partnerShareBps)}
                />
              </Card>
              <Card>
                <h2 className="mb-2 font-bold">On-Chain Data</h2>
                {lot.lotPda && (
                  <DetailRow
                    label="Lot PDA"
                    value={ellipsify(lot.lotPda)}
                    mono
                  />
                )}
                <DetailRow
                  label="Farmer Wallet"
                  value={ellipsify(lot.farmerWallet)}
                  mono
                />
              </Card>
            </div>
            <div className="space-y-4">
              <VerificationBadge
                status={verificationStatus}
                error={verificationError}
              />
              <Button
                variant="purple"
                disabled={verificationStatus !== "match"}
                onClick={() =>
                  router.push(
                    `/partner/lots/${encodeURIComponent(lotCode)}/reserve`,
                  )
                }
                className="w-full"
              >
                Reserve Partnership
              </Button>
              {verificationStatus !== "match" &&
                verificationStatus !== "loading" && (
                  <p className="text-center text-xs text-muted">
                    On-chain verification must pass before reserving.
                  </p>
                )}
            </div>
          </div>

          {/* AI Chat Panel for Partner lot details */}
          {walletAddress && lotCode && (
            <AiChatPanel
              lotCode={lotCode}
              wallet={walletAddress}
              role="partner"
            />
          )}
        </div>
      </AppShell>
    </RequireRole>
  );
}

function VerificationBadge({
  status,
  error,
}: {
  status: VerificationStatus;
  error: string | null;
}) {
  const config = {
    loading: {
      className: "border-border bg-card text-muted",
      text: "Verifying on-chain data...",
    },
    match: {
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
      text: "On-chain data verified.",
    },
    mismatch: {
      className: "border-red-200 bg-red-50 text-red-800",
      text: "On-chain data mismatch. Proceed with caution.",
    },
    not_found: {
      className: "border-amber-200 bg-amber-50 text-amber-900",
      text: "Lot PDA not found on-chain.",
    },
    error: {
      className: "border-red-200 bg-red-50 text-red-800",
      text: error ?? "Verification failed.",
    },
  }[status];

  return (
    <Card className={config.className}>
      <p className="text-sm font-semibold">{config.text}</p>
    </Card>
  );
}

export function ReservePartnershipScreen() {
  const lotCode = useLotCodeParam();
  const { wallet } = useWallet();
  const client = useSolanaClient();
  const { cluster } = useCluster();
  const router = useRouter();
  const { signAndSendWithSigner, isPending, error } = useTransaction();
  const lot = useQuery(api.lots.getByCode, lotCode ? { lotCode } : "skip");
  const createPendingReservation = useMutation(
    api.partnerships.createPendingReservation,
  );
  const recordReservationTx = useMutation(api.partnerships.recordReservationTx);
  const [reserveData, setReserveData] = useState<ReserveFlowResult | null>(
    null,
  );
  const [isComputing, setIsComputing] = useState(false);
  const [reservedTx, setReservedTx] = useState<string | null>(null);
  const [hasPartnerProfile, setHasPartnerProfile] = useState<boolean | null>(
    null,
  );
  const [profileCheckError, setProfileCheckError] = useState<string | null>(
    null,
  );
  const walletAddress = wallet?.account.address?.toString() ?? "";

  useEffect(() => {
    if (!walletAddress) {
      setHasPartnerProfile(null);
      setProfileCheckError(null);
      return;
    }

    let isActive = true;
    setHasPartnerProfile(null);
    setProfileCheckError(null);

    fetchPartnerProfileByWallet(client.rpc, walletAddress as Address)
      .then((profile) => {
        if (isActive) setHasPartnerProfile(Boolean(profile));
      })
      .catch((err) => {
        if (!isActive) return;
        setHasPartnerProfile(false);
        setProfileCheckError(
          err instanceof Error
            ? err.message
            : "Unable to verify partner profile.",
        );
      });

    return () => {
      isActive = false;
    };
  }, [client.rpc, cluster, walletAddress]);

  useEffect(() => {
    if (!lot?.lotPda || !walletAddress || reserveData) return;

    const compute = async () => {
      setIsComputing(true);
      try {
        const result = await computeReserveData({
          lotPda: lot.lotPda!,
          farmerWallet: lot.farmerWallet,
          partnerWallet: walletAddress,
          ticketUsdcCents: lot.ticketUsdcCents,
          farmerShareBps: lot.farmerShareBps,
          partnerShareBps: lot.partnerShareBps,
          metadataHash: lot.metadataHash,
          planHash: lot.planHash,
        });
        setReserveData(result);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to compute terms hash",
        );
      } finally {
        setIsComputing(false);
      }
    };

    void compute();
  }, [lot, reserveData, walletAddress]);

  const handleReserve = useCallback(async () => {
    if (!reserveData || !lot?.lotPda || !walletAddress) return;
    if (!hasPartnerProfile) {
      toast.error(
        "Create your on-chain partner profile before reserving a partnership.",
      );
      return;
    }

    try {
      const result = await signAndSendWithSigner((signer) =>
        buildReserveInstruction(
          signer,
          lot.lotPda! as Address,
          reserveData.termsHash,
        ),
      );
      const partnershipId = await createPendingReservation({
        lotCode: lot.lotCode,
        lotPda: lot.lotPda,
        farmerWallet: lot.farmerWallet,
        partnerWallet: walletAddress,
        termsHash: reserveData.termsHashHex,
      });
      await recordReservationTx({
        partnershipId,
        partnershipPda: reserveData.partnershipPda.toString(),
        tx: result.signature,
      });
      setReservedTx(result.signature);
      toast.success("Partnership reserved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reservation failed");
    }
  }, [
    createPendingReservation,
    hasPartnerProfile,
    lot,
    recordReservationTx,
    reserveData,
    signAndSendWithSigner,
    walletAddress,
  ]);

  if (lot === undefined) {
    return <LoadingState message="Loading lot..." />;
  }

  if (!lot) {
    return <ErrorState title="Lot not found" message={lotCode} />;
  }

  if (reservedTx) {
    return (
      <RequireRole requiredRole="partner">
        <AppShell role="partner" title="Partnership Reserved">
          <Card className="mx-auto max-w-2xl border-emerald-200 bg-emerald-50">
            <DetailRow label="Lot" value={lot.lotCode} />
            <DetailRow
              label="Partnership PDA"
              value={
                reserveData
                  ? ellipsify(reserveData.partnershipPda.toString())
                  : "-"
              }
              mono
            />
            <DetailRow label="Transaction" value={ellipsify(reservedTx)} mono />
            <Button
              variant="purple"
              onClick={() => router.replace("/partner/home")}
              className="mt-4 w-full"
            >
              Back to Dashboard
            </Button>
          </Card>
        </AppShell>
      </RequireRole>
    );
  }

  return (
    <RequireRole requiredRole="partner">
      <AppShell role="partner" title="Reserve Partnership">
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <Card>
              <h2 className="mb-2 font-bold">Partnership Terms</h2>
              <DetailRow label="Lot" value={lot.lotCode} />
              <DetailRow label="Farm" value={lot.farmName} />
              <DetailRow
                label="Ticket"
                value={formatUsdCents(lot.ticketUsdcCents)}
              />
              <DetailRow
                label="Farmer Share"
                value={formatBps(lot.farmerShareBps)}
              />
              <DetailRow
                label="Partner Share"
                value={formatBps(lot.partnerShareBps)}
              />
              <DetailRow
                label="Farmer Wallet"
                value={ellipsify(lot.farmerWallet)}
                mono
              />
              {lot.lotPda && (
                <DetailRow label="Lot PDA" value={ellipsify(lot.lotPda)} mono />
              )}
            </Card>
            <Card>
              <h2 className="mb-2 font-bold">Terms Hash</h2>
              {isComputing ? (
                <p className="text-sm text-muted">Computing terms hash...</p>
              ) : reserveData ? (
                <>
                  <DetailRow
                    label="Hash"
                    value={ellipsify(reserveData.termsHashHex, 8)}
                    mono
                  />
                  <DetailRow
                    label="Partnership PDA"
                    value={ellipsify(reserveData.partnershipPda.toString())}
                    mono
                  />
                </>
              ) : (
                <p className="text-sm text-red-700">
                  Failed to compute terms hash.
                </p>
              )}
            </Card>
          </div>
          <div className="space-y-4">
            {hasPartnerProfile === null ? (
              <Card>
                <p className="text-sm text-muted">
                  Checking on-chain partner profile...
                </p>
              </Card>
            ) : hasPartnerProfile === false ? (
              <Card className="border-amber-200 bg-amber-50">
                <h2 className="font-bold text-amber-900">
                  Partner profile required
                </h2>
                <p className="mt-2 text-sm text-amber-900">
                  This wallet does not have the PartnerProfile PDA required by
                  reserve_partnership.
                </p>
                {profileCheckError && (
                  <p className="mt-2 whitespace-pre-wrap text-xs text-amber-800">
                    {profileCheckError}
                  </p>
                )}
                <Button
                  variant="purple"
                  onClick={() => router.push("/partner/profile")}
                  className="mt-4 w-full"
                >
                  Create partner profile
                </Button>
              </Card>
            ) : (
              <Card className="border-emerald-200 bg-emerald-50">
                <p className="text-sm font-semibold text-emerald-800">
                  Partner profile verified.
                </p>
              </Card>
            )}
            {error && (
              <Card className="border-red-200 bg-red-50">
                <p className="whitespace-pre-wrap text-sm text-red-700">
                  {error.message}
                </p>
              </Card>
            )}
            <Button
              variant="purple"
              disabled={
                isPending ||
                isComputing ||
                !reserveData ||
                hasPartnerProfile !== true ||
                !lot.lotPda
              }
              onClick={handleReserve}
              className="w-full"
            >
              {isPending ? "Waiting for wallet..." : "Sign and reserve"}
            </Button>
          </div>
        </div>
      </AppShell>
    </RequireRole>
  );
}

function usePartnershipIdParam() {
  const params = useParams<{ partnershipId: string }>();
  return params.partnershipId ?? "";
}

export function PartnershipDetailScreen() {
  const partnershipId = usePartnershipIdParam();
  const { partnerships, isLoading } = usePartnerships();
  const partnership = useMemo(
    () => partnerships.find((item) => item._id === partnershipId),
    [partnershipId, partnerships],
  );

  if (isLoading) {
    return <LoadingState message="Loading partnership..." />;
  }

  if (!partnership) {
    return <ErrorState title="Partnership not found" message={partnershipId} />;
  }

  return (
    <RequireRole requiredRole="partner">
      <AppShell role="partner" title="Partnership Details">
        <div className="mx-auto max-w-2xl space-y-4">
          <Card>
            <h2 className="mb-2 font-bold">Overview</h2>
            <DetailRow label="Lot" value={partnership.lotCode} />
            <DetailRow
              label="Status"
              value={<StatusBadge status={partnership.status} />}
            />
            <DetailRow
              label="Farmer"
              value={ellipsify(partnership.farmerWallet)}
              mono
            />
            {partnership.partnershipPda && (
              <DetailRow
                label="Partnership PDA"
                value={ellipsify(partnership.partnershipPda)}
                mono
              />
            )}
            {partnership.reserveTx && (
              <DetailRow
                label="Reserve Tx"
                value={ellipsify(partnership.reserveTx)}
                mono
              />
            )}
            {partnership.termsHash && (
              <DetailRow
                label="Terms Hash"
                value={ellipsify(partnership.termsHash, 8)}
                mono
              />
            )}
          </Card>
          <Link
            href={`/partner/partnerships/${partnershipId}/settlement`}
            className="inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-800"
          >
            View Settlement Preview
          </Link>
        </div>
      </AppShell>
    </RequireRole>
  );
}

const DEMO_YIELD_QQ = 6;
const LBS_PER_QQ = 83.3;
const PRICE_PER_LB = 3.5;
const DEMO_COST_CENTS = 149000;

export function SettlementPreviewScreen() {
  const partnershipId = usePartnershipIdParam();
  const { partnerships, isLoading } = usePartnerships();
  const partnership = useMemo(
    () => partnerships.find((item) => item._id === partnershipId),
    [partnershipId, partnerships],
  );
  const lot = useQuery(
    api.lots.getByCode,
    partnership?.lotCode ? { lotCode: partnership.lotCode } : "skip",
  );

  if (isLoading) {
    return <LoadingState message="Loading settlement..." />;
  }

  if (!partnership) {
    return <ErrorState title="Partnership not found" message={partnershipId} />;
  }

  const farmerShareBps = lot?.farmerShareBps ?? 6000;
  const partnerShareBps = lot?.partnerShareBps ?? 4000;
  const totalLbs = DEMO_YIELD_QQ * LBS_PER_QQ;
  const revenueCents = Math.round(totalLbs * PRICE_PER_LB * 100);
  const profitCents = revenueCents - DEMO_COST_CENTS;
  const farmerShareCents = Math.round((profitCents * farmerShareBps) / 10000);
  const partnerShareCents = Math.round((profitCents * partnerShareBps) / 10000);

  return (
    <RequireRole requiredRole="partner">
      <AppShell role="partner" title="Settlement Preview">
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <Card>
              <h2 className="mb-2 font-bold">Partnership Info</h2>
              <DetailRow label="Lot" value={partnership.lotCode} />
              <DetailRow
                label="Farmer"
                value={ellipsify(partnership.farmerWallet)}
                mono
              />
              <DetailRow
                label="Status"
                value={<StatusBadge status={partnership.status} />}
              />
              {partnership.partnershipPda && (
                <DetailRow
                  label="PDA"
                  value={ellipsify(partnership.partnershipPda)}
                  mono
                />
              )}
            </Card>
            <Card>
              <h2 className="mb-2 font-bold">Settlement Math</h2>
              <div className="space-y-4">
                <SettlementSection title="Revenue">
                  <MathRow
                    label={`${DEMO_YIELD_QQ}qq x ${LBS_PER_QQ} lb/qq x $${PRICE_PER_LB.toFixed(
                      2,
                    )}`}
                    value={formatUsdCents(revenueCents)}
                  />
                </SettlementSection>
                <SettlementSection title="Cost">
                  <MathRow
                    label="Production + processing"
                    value={formatUsdCents(DEMO_COST_CENTS)}
                  />
                </SettlementSection>
                <SettlementSection title="Profit">
                  <MathRow
                    label={`${formatUsdCents(revenueCents)} - ${formatUsdCents(
                      DEMO_COST_CENTS,
                    )}`}
                    value={formatUsdCents(profitCents)}
                    highlight
                  />
                </SettlementSection>
                <SettlementSection title="Share Split">
                  <MathRow
                    label={`Farmer (${formatBps(farmerShareBps)})`}
                    value={formatUsdCents(farmerShareCents)}
                  />
                  <MathRow
                    label={`Partner (${formatBps(partnerShareBps)})`}
                    value={formatUsdCents(partnerShareCents)}
                    highlight
                  />
                </SettlementSection>
              </div>
            </Card>
          </div>
          <Card className="h-fit border-blue-200 bg-blue-50">
            <p className="text-sm leading-6 text-blue-900">
              This is a projected settlement based on demo values: 6qq yield,
              $3.50/lb, and $1,490 cost. Actual settlement is recorded on-chain
              when the harvest cycle completes.
            </p>
          </Card>
        </div>
      </AppShell>
    </RequireRole>
  );
}

function SettlementSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-border pt-3 first:border-t-0 first:pt-0">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-normal text-muted">
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function MathRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted">{label}</span>
      <span
        className={cx(
          "text-sm font-bold",
          highlight ? "text-violet-700" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}
