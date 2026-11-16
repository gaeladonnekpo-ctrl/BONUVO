"use client";

import * as React from "react";
import { trackPublicEvent } from "@/lib/events/track-public-event";

export interface PageViewTrackerProps {
  eventType?: "page_view" | "offer_view";
  path: string;
  offerId?: string | null;
  bookmakerId?: string | null;
  countryCode?: string;
}

export function PageViewTracker({
  eventType = "page_view",
  path,
  offerId,
  bookmakerId,
  countryCode,
}: PageViewTrackerProps) {
  const sentRef = React.useRef(false);

  React.useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;
    trackPublicEvent({
      eventType,
      path,
      offerId: offerId ?? null,
      bookmakerId: bookmakerId ?? null,
      countryCode,
    });
  }, [eventType, path, offerId, bookmakerId, countryCode]);

  return null;
}
