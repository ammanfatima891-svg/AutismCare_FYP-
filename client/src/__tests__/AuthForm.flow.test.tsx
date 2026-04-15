import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import AuthForm from "../components/AuthForm";
import { AuthProvider } from "../context/AuthContext";

const postMock = vi.fn();

vi.mock("../api", () => ({
  default: {
    post: (...args: unknown[]) => postMock(...args),
  },
}));

vi.mock("../components/figma/ImageWithFallback", () => ({
  ImageWithFallback: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img alt="" {...props} />,
}));

describe("AuthForm login flow", () => {
  beforeEach(() => {
    postMock.mockReset();
    sessionStorage.clear();
    localStorage.clear();
  });

  it("submits login form and stores session on success", async () => {
    const user = userEvent.setup();
    postMock.mockResolvedValue({
      data: {
        token: "jwt-test",
        role: "parent",
        firstName: "Pat",
        lastName: "Lee",
        email: "pat@example.com",
      },
    });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <AuthProvider>
            <AuthForm />
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    const emailEl = document.querySelector('input[type="email"]') as HTMLInputElement;
    const passEl = document.querySelector('input[type="password"]') as HTMLInputElement;
    expect(emailEl).toBeTruthy();
    expect(passEl).toBeTruthy();
    await user.type(emailEl, "pat@example.com");
    await user.type(passEl, "Password123!");
    const loginButtons = screen.getAllByRole("button", { name: /^login$/i });
    const submitLogin = loginButtons.find((b) => (b as HTMLButtonElement).type === "submit");
    expect(submitLogin).toBeTruthy();
    await user.click(submitLogin!);

    await waitFor(() => {
      expect(postMock).toHaveBeenCalled();
    });

    const [path, body] = postMock.mock.calls[0] as [string, { email: string; password: string }];
    expect(String(path)).toMatch(/auth\/login/);
    expect(body.email).toBe("pat@example.com");
    expect(sessionStorage.getItem("token")).toBe("jwt-test");
    expect(sessionStorage.getItem("role")).toBe("parent");
  });
});
