import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { DashboardPage } from "../../../../src/adapters/views/pages/DashboardPage";
import { AuthContext } from "../../../../src/adapters/AuthContext";
import {
  makeControllers,
  makeAuthContextValue,
  job,
  profile,
  signedIn,
} from "../../../fixtures/application";

function setup() {
  const dependencies = makeControllers();
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthContext.Provider value={makeAuthContextValue(signedIn)}>
        <MemoryRouter>{children}</MemoryRouter>
      </AuthContext.Provider>
    );
  }
  return { ...dependencies, wrapper };
}

describe("dashboard through its controller and presenter", () => {
  it("renders the first context with presenter-prepared labels", async () => {
    const { wrapper, repositories, dashboardController } = setup();
    repositories.contexts.list.mockResolvedValue([
      profile,
      {
        ...profile,
        id: "second",
        targetRoles: ["Later context"],
        updatedAt: "2027-01-01",
      },
    ]);
    render(<DashboardPage dashboardController={dashboardController} />, {
      wrapper,
    });
    expect(
      await screen.findByRole("heading", { name: "Engineer" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View Primary Context →" }),
    ).toHaveAttribute("href", "/profiles/profile-id");
    expect(screen.queryByText("Later context")).not.toBeInTheDocument();
  });

  it("renders presenter-prepared empty output", async () => {
    const { wrapper, repositories, dashboardController } = setup();
    repositories.contexts.list.mockResolvedValue([]);
    render(<DashboardPage dashboardController={dashboardController} />, {
      wrapper,
    });
    expect(
      await screen.findByText("No candidate profiles yet."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Create Candidate Profile →" }),
    ).toHaveAttribute("href", "/profiles/new");
  });

  it("shows a request failure instead of presenting an empty list", async () => {
    const { wrapper, repositories, dashboardController } = setup();
    repositories.contexts.list.mockRejectedValue(
      new Error("Contexts unavailable"),
    );
    render(<DashboardPage dashboardController={dashboardController} />, {
      wrapper,
    });
    expect(await screen.findByText("Contexts unavailable")).toBeInTheDocument();
    expect(
      screen.queryByText("No candidate profiles yet."),
    ).not.toBeInTheDocument();
  });

  it("retries a failed primary-context load through the controller", async () => {
    const { wrapper, repositories, dashboardController } = setup();
    repositories.contexts.list
      .mockRejectedValueOnce(new Error("Contexts unavailable"))
      .mockResolvedValueOnce([profile]);
    render(<DashboardPage dashboardController={dashboardController} />, {
      wrapper,
    });
    expect(await screen.findByText("Contexts unavailable")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(
      await screen.findByRole("heading", { name: "Engineer" }),
    ).toBeInTheDocument();
  });

  it("uses presenter-prepared details for the newest recent analysis", async () => {
    const { wrapper, repositories, dashboardController } = setup();
    repositories.jobs.list.mockResolvedValue([
      {
        ...job,
        id: "older-job",
        createdAt: "2026-10-16T07:13:08Z",
      },
      {
        ...job,
        id: "newest-job",
        submissionType: "URL",
        createdAt: "2026-10-17T07:13:08Z",
      },
    ]);
    render(<DashboardPage dashboardController={dashboardController} />, {
      wrapper,
    });
    expect(
      await screen.findByRole("heading", { name: "Submitted job URL" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View analysis →" }),
    ).toHaveAttribute("href", "/jobs/newest-job");
  });
});
