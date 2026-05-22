import { getFocusedRouteNameFromRoute, useNavigationState } from "@react-navigation/native";
import type { MainStackParamList } from "../navigation/types";

/** Current focused screen inside the Home stack (drawer → Home → stack). */
export function useActiveMainScreen(): keyof MainStackParamList {
  const name = useNavigationState((state) => {
    const home = state.routes.find((r) => r.name === "Home");
    if (!home) return "Dashboard";
    return getFocusedRouteNameFromRoute(home) ?? "Dashboard";
  });
  return (name ?? "Dashboard") as keyof MainStackParamList;
}
