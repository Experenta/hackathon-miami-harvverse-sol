import type { Address } from "@solana/kit";
import {
  MOCK_USDC_BASE_UNITS_PER_USDC,
  MOCK_USDC_CENTS_TO_BASE_UNITS,
  MOCK_USDC_DECIMALS,
} from "./constants";

export function usdcCentsToMockUsdcBaseUnits(cents: number | bigint): bigint {
  return BigInt(cents) * MOCK_USDC_CENTS_TO_BASE_UNITS;
}

export function formatMockUsdcBaseUnits(
  amountBaseUnits: number | bigint,
  decimals = MOCK_USDC_DECIMALS,
): string {
  const amount = BigInt(amountBaseUnits);
  const base = 10n ** BigInt(decimals);
  const whole = amount / base;
  const fraction = amount % base;
  const cents = (fraction * 100n) / base;
  return `${whole.toLocaleString()}.${cents.toString().padStart(2, "0")} mockUSDC`;
}

export function mockUsdcBaseUnitsToNumber(
  amountBaseUnits: number | bigint,
  decimals = MOCK_USDC_DECIMALS,
): number {
  return Number(amountBaseUnits) / Number(10n ** BigInt(decimals));
}

export function getMockUsdcReserveAmount(input: {
  depositedAmount: number | bigint;
  releasedAmount: number | bigint;
  vaultBalance?: number | bigint;
}): bigint {
  const deposited = BigInt(input.depositedAmount);
  const released = BigInt(input.releasedAmount);
  const computed = deposited > released ? deposited - released : 0n;
  return input.vaultBalance === undefined
    ? computed
    : BigInt(input.vaultBalance);
}

export function getMockUsdcExplorerLabel(address: Address | string) {
  const value = address.toString();
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export { MOCK_USDC_BASE_UNITS_PER_USDC };
