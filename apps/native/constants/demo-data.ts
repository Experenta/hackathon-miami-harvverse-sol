/**
 * Zafiro demo lot autofill constants.
 * Used by the "Autofill Zafiro demo lot" button in the lot editor.
 */
export const ZAFIRO_DEMO_LOT = {
	lotCode: "HV-HN-ZAF-L02",
	farmName: "Zafiro",
	country: "Honduras",
	region: "Comayagua",
	latitude: 14.9465,
	longitude: -88.0863,
	altitudeMeters: 1300,
	variety: "Parainema",
	areaManzanas: 1.0,
	ticketUsdcCents: 342500, // $3,425.00
	farmerShareBps: 6000,
	partnerShareBps: 4000,
} as const;

/**
 * Demo agronomic plan data for autofill.
 */
export const DEMO_AGRONOMIC_PLAN = {
	planId: "plan-zafiro-2025-a",
	summary:
		"Shade-grown Parainema at 1300m. Organic compost cycle Q1-Q3, selective hand-picking Nov-Feb.",
	planJson: {
		variety: "Parainema",
		altitude: 1300,
		shadePct: 40,
		fertilizerType: "organic_compost",
		harvestWindow: { start: "2025-11-01", end: "2026-02-28" },
		estimatedYieldQq: 6,
		processingMethod: "washed",
	},
} as const;

/**
 * Demo sensor snapshot data for autofill.
 */
export const DEMO_SENSOR_SNAPSHOT = {
	source: "demo_autofill" as const,
	temperatureC: 22.5,
	humidityPct: 68,
	soilPh: 5.8,
	soilMoisturePct: 42,
} as const;
