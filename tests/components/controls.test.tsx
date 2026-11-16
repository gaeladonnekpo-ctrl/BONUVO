// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Pagination } from "@/components/ui/pagination";
import { TestUiWrapper } from "./test-wrapper";

describe("Phase 1 — Brand identity, theme toggle & interactive primitives", () => {
  it("affiche le logo BONUVO avec nom accessible", () => {
    render(
      <TestUiWrapper>
        <BrandLogo size="lg" showTagline />
      </TestUiWrapper>,
    );

    expect(screen.getByRole("img", { name: "BONUVO" })).toBeInTheDocument();
    expect(screen.getByText("SMART OFFERS. BETTER CHOICES.")).toBeInTheDocument();
  });

  it("bascule le thème sombre <-> clair et met à jour documentElement + cookie", () => {
    document.documentElement.className = "dark";
    document.documentElement.dataset.theme = "dark";

    render(
      <TestUiWrapper initialTheme="dark">
        <ThemeToggle />
      </TestUiWrapper>,
    );

    const toggle = screen.getByRole("button", { name: /Passer en thème clair/i });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(toggle);
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.cookie).toContain("bonuvo_theme=light");

    const backToDark = screen.getByRole("button", { name: /Passer en thème sombre/i });
    expect(backToDark).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(backToDark);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("pilote Pagination au clic et respecte les bornes", () => {
    const onPageChange = vi.fn();
    render(
      <TestUiWrapper locale="en">
        <Pagination currentPage={1} totalPages={3} onPageChange={onPageChange} />
      </TestUiWrapper>,
    );

    const prev = screen.getByRole("button", { name: "Previous" });
    const next = screen.getByRole("button", { name: "Next" });
    expect(prev).toBeDisabled();
    expect(next).toBeEnabled();

    fireEvent.click(next);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
