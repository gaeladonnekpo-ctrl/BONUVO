// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { SignInForm } from "@/components/auth/AuthCredentialForms";
import { OtpInput } from "@/components/auth/OtpInput";
import { PasswordField } from "@/components/auth/PasswordField";
import { TestUiWrapper } from "./test-wrapper";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

function ControlledPasswordDemo() {
  const [pwd, setPwd] = useState("");
  return (
    <PasswordField
      id="demo-pwd"
      name="password"
      label="Mot de passe"
      value={pwd}
      onChange={setPwd}
      showStrengthHint
    />
  );
}

function ControlledOtpDemo({ onChangeSpy }: { onChangeSpy: (val: string) => void }) {
  const [otp, setOtp] = useState("");
  return (
    <OtpInput
      value={otp}
      onChange={(next) => {
        setOtp(next);
        onChangeSpy(next);
      }}
    />
  );
}

describe("Phase 2 — Auth UI components", () => {
  it("bascule la visibilité du mot de passe et valide l'indicateur de robustesse (12+ car.)", () => {
    render(
      <TestUiWrapper>
        <ControlledPasswordDemo />
      </TestUiWrapper>,
    );

    const input = screen.getByLabelText("Mot de passe") as HTMLInputElement;
    expect(input.type).toBe("password");
    expect(screen.getByText(/12 caractères minimum/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Afficher le mot de passe" }));
    expect(input.type).toBe("text");
    expect(screen.getByRole("button", { name: "Masquer le mot de passe" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.change(input, { target: { value: "BonuvoStrong2026" } });
    expect(screen.getByText(/Critères de robustesse respectés/i)).toBeInTheDocument();
  });

  it("gère la saisie et le collage à 6 chiffres dans OtpInput", () => {
    const spy = vi.fn();
    render(
      <TestUiWrapper>
        <ControlledOtpDemo onChangeSpy={spy} />
      </TestUiWrapper>,
    );

    const box1 = screen.getByLabelText("Chiffre 1 sur 6") as HTMLInputElement;
    fireEvent.paste(box1, {
      clipboardData: {
        getData: () => "654321",
      },
    });

    expect(spy).toHaveBeenLastCalledWith("654321");
    expect((screen.getByLabelText("Chiffre 6 sur 6") as HTMLInputElement).value).toBe("1");
  });

  it("valide le formulaire de connexion et affiche une erreur neutre accessible", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        error: { code: "INVALID_CREDENTIALS", message: "Identifiants invalides." },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <TestUiWrapper>
        <SignInForm />
      </TestUiWrapper>,
    );

    fireEvent.change(screen.getByLabelText("Adresse e-mail"), {
      target: { value: "membre@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Mot de passe"), {
      target: { value: "WrongPassword123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Identifiants invalides.");
    vi.unstubAllGlobals();
  });
});
