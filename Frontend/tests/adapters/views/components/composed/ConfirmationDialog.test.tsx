import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmationDialog } from "../../../../../src/adapters/views/components/composed/ConfirmationDialog";

function DialogHarness({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open dialog
      </button>
      <ConfirmationDialog
        open={open}
        title="Confirm deletion"
        description="This cannot be undone."
        onConfirm={vi.fn()}
        onClose={() => {
          onClose();
          setOpen(false);
        }}
      />
    </>
  );
}

describe("ConfirmationDialog", () => {
  it("notifies the close callback once when the dialog is dismissed", () => {
    const onClose = vi.fn();
    render(<DialogHarness onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Open dialog" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalledOnce();
    fireEvent(dialog, new Event("close"));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
