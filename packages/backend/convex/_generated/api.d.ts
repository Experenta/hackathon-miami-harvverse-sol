/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agronomicPlans from "../agronomicPlans.js";
import type * as audit from "../audit.js";
import type * as farmerProfiles from "../farmerProfiles.js";
import type * as lotMedia from "../lotMedia.js";
import type * as lots from "../lots.js";
import type * as partnerProfiles from "../partnerProfiles.js";
import type * as partnerships from "../partnerships.js";
import type * as sensorSnapshots from "../sensorSnapshots.js";
import type * as status from "../status.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agronomicPlans: typeof agronomicPlans;
  audit: typeof audit;
  farmerProfiles: typeof farmerProfiles;
  lotMedia: typeof lotMedia;
  lots: typeof lots;
  partnerProfiles: typeof partnerProfiles;
  partnerships: typeof partnerships;
  sensorSnapshots: typeof sensorSnapshots;
  status: typeof status;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
