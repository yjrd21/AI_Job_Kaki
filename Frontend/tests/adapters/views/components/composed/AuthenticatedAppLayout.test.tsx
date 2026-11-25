import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthenticatedAppLayout } from "../../../../../src/adapters/views/components/composed/AuthenticatedAppLayout";

describe("AuthenticatedAppLayout", () => {
  it("uses its navigation defaults and delegates route and logout actions", () => {
    const onNavigate = vi.fn();
    const onCloseNavigation = vi.fn();
    const onLogout = vi.fn();

    render(
      <AuthenticatedAppLayout
        pathname="/jobs/job-id"
        userName="Candidate"
        isNavigationOpen={false}
        onNavigate={onNavigate}
        onOpenNavigation={vi.fn()}
        onCloseNavigation={onCloseNavigation}
        onLogout={onLogout}
      >
        <p>Current page</p>
      </AuthenticatedAppLayout>,
    );

    expect(screen.getByText("Current page")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Job History" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    fireEvent.click(screen.getByRole("link", { name: "Dashboard" }));
    fireEvent.click(screen.getByRole("button", { name: "Log out" }));

    expect(onNavigate).toHaveBeenCalledWith("/dashboard");
    expect(onCloseNavigation).toHaveBeenCalledOnce();
    expect(onLogout).toHaveBeenCalledOnce();
  });

  it("delegates mobile navigation open and close actions", () => {
    const onOpenNavigation = vi.fn();
    const onCloseNavigation = vi.fn();
    const props = {
      pathname: "/dashboard",
      userName: null,
      onNavigate: vi.fn(),
      onOpenNavigation,
      onCloseNavigation,
      onLogout: vi.fn(),
      children: <p>Current page</p>,
    };
    const { rerender } = render(
      <AuthenticatedAppLayout {...props} isNavigationOpen={false} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(onOpenNavigation).toHaveBeenCalledOnce();

    rerender(<AuthenticatedAppLayout {...props} isNavigationOpen />);
    fireEvent.click(screen.getByRole("button", { name: "Close navigation" }));
    expect(onCloseNavigation).toHaveBeenCalledOnce();
  });
});
