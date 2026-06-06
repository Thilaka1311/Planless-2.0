import React from "react";
import { Plan } from "../../../core/types";
import { usePlansStore } from "../../plans/state/PlansContext";

export function useHomeFeed(discoverablePlans: Plan[]) {
  const { refreshPlans } = usePlansStore();

  React.useEffect(() => {
    refreshPlans().catch((err) =>
      console.error("[HomeScreen] failed to refresh plans:", err)
    );
  }, []);

  const N = discoverablePlans.length;
  const plansToRender = React.useMemo(() => {
    if (N <= 1) return discoverablePlans;
    return [
      {
        ...discoverablePlans[N - 1],
        id: `${discoverablePlans[N - 1].id}-loop-prev-dup`,
      },
      ...discoverablePlans,
      {
        ...discoverablePlans[0],
        id: `${discoverablePlans[0].id}-loop-next-dup`,
      },
    ];
  }, [discoverablePlans, N]);

  const handleScrollLoop = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const { scrollTop, clientHeight } = target;
    if (N <= 1) return;

    const maxThreshold = (N + 1) * clientHeight - 10;
    if (scrollTop >= maxThreshold) {
      target.scrollTop = clientHeight;
    } else if (scrollTop <= 10) {
      target.scrollTop = N * clientHeight;
    }
  };

  return {
    plansToRender,
    handleScrollLoop,
  };
}
