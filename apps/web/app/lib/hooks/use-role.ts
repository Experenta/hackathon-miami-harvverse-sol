"use client";

import { useRoleContext } from "../role-context";

export function useRole() {
  return useRoleContext();
}
