import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { HistoryPage } from "../../../../src/adapters/views/pages/HistoryPage";
import { AuthContext } from "../../../../src/adapters/AuthContext";
import {
  job,
  makeControllers,
  makeAuthContextValue,
  signedIn,
} from "../../../fixtures/application";

function showHistory() {
  const { historyController, repositories } = makeControllers();
  render(
    <AuthContext.Provider value={makeAuthContextValue(signedIn)}>
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <HistoryPage historyController={historyController} />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
  return repositories;
}

describe("job history interactions through the page controller", () => {
  it("filters loaded jobs by posting, status, and identifier without another request", async () => {
    const repositories = showHistory();
    await screen.findByRole("heading", { name: job.jobContext });
    for (const value of ["DESCRIPTION", "pending", "JOB-ID"]) {
      fireEvent.change(screen.getByLabelText("Search analyses"), {
        target: { value },
      });
      expect(
        screen.getByRole("heading", { name: job.jobContext }),
      ).toBeInTheDocument();
    }
    fireEvent.change(screen.getByLabelText("Search analyses"), {
      target: { value: "unmatched" },
    });
    expect(screen.getByText("No matching analyses")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search analyses"), {
      target: { value: "" },
    });
    expect(
      screen.getByRole("heading", { name: job.jobContext }),
    ).toBeInTheDocument();
    expect(repositories.jobs.list).toHaveBeenCalledTimes(1);
  });

  it("does not delete when confirmation is cancelled", async () => {
    const repositories = showHistory();
    await screen.findByRole("heading", { name: job.jobContext });
    const confirmation = vi.spyOn(window, "confirm").mockReturnValue(false);
    try {
      fireEvent.click(
        screen.getByRole("button", { name: "Delete submission" }),
      );
      expect(repositories.jobs.delete).not.toHaveBeenCalled();
    } finally {
      confirmation.mockRestore();
    }
  });

  it("displays deletion failures and reloads history after a successful retry", async () => {
    const repositories = showHistory();
    await screen.findByRole("heading", { name: job.jobContext });
    const confirmation = vi.spyOn(window, "confirm").mockReturnValue(true);
    try {
      repositories.jobs.delete.mockRejectedValueOnce(
        new Error("Deletion unavailable"),
      );
      fireEvent.click(
        screen.getByRole("button", { name: "Delete submission" }),
      );
      await screen.findByText("Deletion unavailable");
      repositories.jobs.list.mockResolvedValue([]);
      fireEvent.click(
        screen.getByRole("button", { name: "Delete submission" }),
      );
      await screen.findByText("Your history starts here");
      expect(repositories.jobs.delete).toHaveBeenCalledTimes(2);
      expect(repositories.jobs.list).toHaveBeenCalledTimes(2);
    } finally {
      confirmation.mockRestore();
    }
  });
});
