import { renderToString } from "react-dom/server";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "./LoginForm";
import { SignupForm } from "./SignupForm";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import { ResetPasswordForm } from "./ResetPasswordForm";
import { RecoveryForm } from "./RecoveryForm";
import { MfaForm } from "./MfaForm";
import { RecoverOrganizationForm } from "./RecoverOrganizationForm";
import { signInWithPassword } from "@/app/actions/auth/signInWithPassword";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (value: string) => value }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/app/actions/auth/signInWithPassword", () => ({ signInWithPassword: vi.fn() }));
vi.mock("@/app/actions/auth/signUp", () => ({ signUp: vi.fn() }));
vi.mock("@/app/actions/auth/requestPasswordReset", () => ({ requestPasswordReset: vi.fn() }));
vi.mock("@/app/actions/auth/updatePassword", () => ({ updatePassword: vi.fn() }));
vi.mock("@/app/actions/auth/useRecoveryCode", () => ({ useRecoveryCode: vi.fn() }));
vi.mock("@/app/actions/auth/verifyMfa", () => ({ verifyMfa: vi.fn() }));
vi.mock("@/app/actions/auth/recoverOrganization", () => ({ recoverOrganization: vi.fn() }));

const forms = [
  LoginForm,
  SignupForm,
  ForgotPasswordForm,
  ResetPasswordForm,
  RecoveryForm,
  MfaForm,
  RecoverOrganizationForm,
].map((Form) => ({ name: Form.name, Form }));

describe("auth waits for its client handler", () => {
  it.each(forms)("SSR never offers a native submit before hydration: $name", ({ Form }) => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<Form />);
    const form = container.querySelector("form");
    expect(form?.method).toBe("post");
    const submits = [...container.querySelectorAll<HTMLButtonElement>('button[type="submit"]')];
    expect(submits.length).toBeGreaterThan(0);
    for (const submit of submits) expect(submit.disabled).toBe(true);
  });

  it("hydration enables login and sends credentials through the action, preserving inline errors", async () => {
    vi.mocked(signInWithPassword).mockResolvedValueOnce({ error: "invalid_credentials" });
    const container = document.createElement("div");
    container.innerHTML = renderToString(<LoginForm />);
    document.body.append(container);
    expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(
      true,
    );
    render(<LoginForm />, { container, hydrate: true });
    const submit = screen.getByRole("button", { name: "Entrar", exact: true });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "hydration@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "Fixture!123456" } });
    fireEvent.click(submit);
    await waitFor(() =>
      expect(signInWithPassword).toHaveBeenCalledWith(
        { email: "hydration@example.com", password: "Fixture!123456" },
        undefined,
      ),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Email ou senha incorretos.");
  });
});
