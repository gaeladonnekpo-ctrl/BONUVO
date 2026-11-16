"use client";

export interface ClientEventPayload {
  eventType: "page_view" | "offer_view" | "promo_copy";
  path: string;
  offerId?: string | null;
  bookmakerId?: string | null;
  promoCodeId?: string | null;
  countryCode?: string;
}

export function trackPublicEvent(payload: ClientEventPayload): void {
  if (typeof window === "undefined") return;
  try {
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Telemetry must never interrupt visitor interactions
  }
}
