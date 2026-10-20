import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { AccountPage } from "../../../../src/adapters/views/pages/AccountPage";
import { AccountControllerContainer } from "../../../../src/adapters/containers/AccountControllerContainer";
import { AuthContainerProvider } from "../../../../src/infrastructure/providers/AuthContainerProvider";
import {
  account,
  makeApplication,
  makeSession,
} from "../../../fixtures/application";

async function showAccount() {
  const { accountController, repositories } = makeApplication();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AccountControllerContainer.Provider value={accountController}>
        <AuthContainerProvider session={makeSession()}>
          <AccountPage />
        </AuthContainerProvider>
      </AccountControllerContainer.Provider>
    </QueryClientProvider>,
  );
  await screen.findByDisplayValue(account.email);
  return repositories;
}
function submitForm() {
  const form = screen
    .getByRole("button", { name: "Save changes" })
    .closest("form");
  if (!form) throw new Error("Account form missing");
  fireEvent.submit(form);
}

describe("account view through the injected controller", () => {
  it("shows controller field errors and prevents invalid updates", async () => {
    const repositories = await showAccount();
    fireEvent.change(screen.getByLabelText("First name"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "invalid" },
    });
    submitForm();
    await screen.findByText("First name is required");
    expect(screen.getByText("Enter a valid email")).toBeInTheDocument();
    expect(repositories.users.update).not.toHaveBeenCalled();
  });

  it("saves validated values through the application and refreshes the account", async () => {
    const repositories = await showAccount();
    repositories.users.get.mockResolvedValue({
      ...account,
      firstName: "Updated",
    });
    fireEvent.change(screen.getByLabelText("First name"), {
      target: { value: "Updated" },
    });
    submitForm();
    await screen.findByText("Account saved.");
    expect(repositories.users.update).toHaveBeenCalledExactlyOnceWith(
      "user-id",
      {
        firstName: "Updated",
        lastName: account.lastName,
        email: account.email,
      },
    );
    await waitFor(() =>
      expect(repositories.users.get).toHaveBeenCalledTimes(2),
    );
  });

  it("displays application save errors without reporting success", async () => {
    const repositories = await showAccount();
    repositories.users.update.mockRejectedValue(
      new Error("Account update unavailable"),
    );
    submitForm();
    await screen.findByText("Account update unavailable");
    expect(screen.queryByText("Account saved.")).not.toBeInTheDocument();
  });
});
