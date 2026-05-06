/**
 * Manifest hash utilities for the Harvverse program.
 *
 * Off-chain data is anchored on-chain via SHA-256 hashes of canonical JSON.
 * Canonical JSON sorts all object keys recursively to ensure deterministic
 * output regardless of key insertion order.
 */

/**
 * Produces a deterministic JSON string by recursively sorting object keys.
 * Arrays preserve their order; only object keys are sorted.
 */
export function canonicalJson(obj: unknown): string {
	if (obj === null || typeof obj !== "object") {
		return JSON.stringify(obj);
	}

	if (Array.isArray(obj)) {
		return "[" + obj.map(canonicalJson).join(",") + "]";
	}

	const sortedKeys = Object.keys(obj as Record<string, unknown>).sort();
	const pairs = sortedKeys.map((key) => {
		const value = (obj as Record<string, unknown>)[key];
		return JSON.stringify(key) + ":" + canonicalJson(value);
	});
	return "{" + pairs.join(",") + "}";
}

/**
 * Computes a SHA-256 hash of the canonical JSON representation of the payload.
 * Returns the hash as a Uint8Array (32 bytes).
 *
 * Uses the Web Crypto API (available in React Native via the `expo-crypto`
 * polyfill or the built-in `crypto.subtle` in Node.js / modern browsers).
 */
export async function computeManifestHash(
	payload: Record<string, unknown>,
): Promise<Uint8Array> {
	const json = canonicalJson(payload);
	const encoder = new TextEncoder();
	const data = encoder.encode(json);

	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	return new Uint8Array(hashBuffer);
}

/**
 * Computes a SHA-256 hash of the canonical JSON representation of the payload.
 * Returns the hash as a lowercase hex string (64 characters).
 */
export async function computeManifestHashHex(
	payload: Record<string, unknown>,
): Promise<string> {
	const bytes = await computeManifestHash(payload);
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}
