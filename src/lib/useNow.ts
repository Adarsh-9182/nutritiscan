import { useEffect, useState } from "react";
import { AppState } from "react-native";
/** Refresh date-sensitive summaries across midnight and when the app resumes. */
export function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const update = () => setNow(new Date());
    const timer = setInterval(update, 60000);
    const subscription = AppState.addEventListener("change", (state) => { if (state === "active") update(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);
  return now;
}
