// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CommunityFab } from "@/components/business/CommunityFab";
import { OfferCard } from "@/components/business/OfferCard";
import { PartnerLogoGrid } from "@/components/business/PartnerLogoGrid";
import { PromoCodeBox } from "@/components/business/PromoCodeBox";
import { RatingScore } from "@/components/business/RatingScore";
import {
  DEV_SAMPLE_CHANNELS,
  DEV_SAMPLE_OFFER,
  DEV_SAMPLE_PARTNERS,
} from "@/components/design/dev-samples";
import { TestUiWrapper } from "./test-wrapper";

describe("Phase 1 — Business UI components & 4 mandatory states", () => {
  it("affiche OfferCard en état contenu avec mentions 18+, date réelle et attribut rel sécurisé", async () => {
    render(
      <TestUiWrapper locale="fr">
        <OfferCard
          offer={{
            ...DEV_SAMPLE_OFFER,
            ctaHref: "https://example.com/partner-test",
          }}
          state="content"
        />
      </TestUiWrapper>,
    );

    expect(screen.getByRole("heading", { name: /Bookmaker Exemple A/ })).toBeInTheDocument();
    expect(screen.getByText(/18\+/)).toBeInTheDocument();
    expect(screen.getAllByText(/Exemple de développement/).length).toBeGreaterThanOrEqual(1);

    const ctaLink = screen.getByRole("link", { name: /Voir l'offre chez Bookmaker Exemple A/ });
    expect(ctaLink).toHaveAttribute("rel", "sponsored nofollow noopener");

    fireEvent.click(screen.getByRole("button", { name: /Conditions générales/ }));
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    expect(
      screen.getByText(/exemple de développement utilisé sur \/admin\/design/i),
    ).toBeInTheDocument();
  });

  it("gère les états loading, empty et error d'OfferCard avec nouvel essai", () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <TestUiWrapper>
        <OfferCard state="loading" />
      </TestUiWrapper>,
    );
    expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument();

    rerender(
      <TestUiWrapper>
        <OfferCard state="empty" />
      </TestUiWrapper>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Offre non disponible");

    rerender(
      <TestUiWrapper>
        <OfferCard state="error" onRetry={onRetry} />
      </TestUiWrapper>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Carte d'offre indisponible");
    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("copie le code promo dans PromoCodeBox et gère ses 4 états", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    const onCopy = vi.fn();

    render(
      <TestUiWrapper>
        <PromoCodeBox code="DEV-EXAMPLE-100" validOn="Sport" onCopy={onCopy} />
        <PromoCodeBox state="loading" />
        <PromoCodeBox state="empty" />
        <PromoCodeBox state="error" />
      </TestUiWrapper>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Copier DEV-EXAMPLE-100/ }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("DEV-EXAMPLE-100");
    });
    expect(onCopy).toHaveBeenCalledWith("DEV-EXAMPLE-100");
    expect(screen.getAllByText("Copié").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("status")).toHaveTextContent("DEV-EXAMPLE-100");
  });

  it("rend RatingScore, PartnerLogoGrid et CommunityFab dans leurs 4 états", () => {
    render(
      <TestUiWrapper locale="en">
        <RatingScore score={4.5} state="content" />
        <RatingScore score={null} state="empty" />
        <RatingScore score={null} state="error" />
        <PartnerLogoGrid items={DEV_SAMPLE_PARTNERS} state="content" />
        <PartnerLogoGrid items={[]} state="empty" />
        <CommunityFab mode="inline" channels={DEV_SAMPLE_CHANNELS} state="content" />
        <CommunityFab mode="inline" channels={[]} state="empty" />
      </TestUiWrapper>,
    );

    expect(screen.getByText("4.5")).toBeInTheDocument();
    expect(screen.getByText("Score pending rubric")).toBeInTheDocument();
    expect(screen.getByText("Partenaire Exemple 1")).toBeInTheDocument();
    expect(screen.getByText("Partner grid awaiting verified records")).toBeInTheDocument();
    expect(screen.getByText(/Telegram/)).toBeInTheDocument();
  });
});
