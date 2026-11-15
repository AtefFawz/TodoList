import { useCallback, useSyncExternalStore } from "react";
import { parseViewKey, viewKey, type View } from "@/core/selectors";

const subscribe = (notify: () => void) => {
  window.addEventListener("hashchange", notify);
  return () => window.removeEventListener("hashchange", notify);
};
const snapshot = () => window.location.hash.replace(/^#\/?/, "");

/** The current view lives in the URL hash (#/today, #/list/abc, #/tag/home), so back/forward and deep links work. */
export function useRoute(): [View, (view: View) => void] {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "");
  const view = parseViewKey(raw ? decodeURIComponent(raw).replace("/", ":") : "today");
  const go = useCallback((next: View) => {
    const key = viewKey(next).replace(":", "/");
    window.location.hash = `/${key.split("/").map(encodeURIComponent).join("/")}`;
  }, []);
  return [view, go];
}
