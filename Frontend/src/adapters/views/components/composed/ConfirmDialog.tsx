import { useState } from "react";
import { Button } from "../primitives/Button";
import { Modal } from "../primitives/Modal";

// Describe the confirmation content, callbacks, and optional typed confirmation requirement.
type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmText?: string;
  pending?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
};

// Require confirmation before invoking the supplied action.
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmText,
  pending = false,
  onConfirm,
  onClose,
}: Props) {
  // Track the confirmation phrase entered by the user.
  const [typed, setTyped] = useState("");

  // Enable confirmation when no phrase is required or the entered phrase matches exactly.
  const valid = !confirmText || typed === confirmText;

  // Clear the confirmation phrase before notifying the caller that the dialog closed.
  const close = () => {
    setTyped("");
    onClose();
  };

  return (
    <Modal
      open={open}
      title={title}
      description={description}
      onClose={close}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={close}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            disabled={pending || !valid}
            onClick={() => void onConfirm()}
          >
            {pending ? "Working…" : confirmLabel}
          </Button>
        </>
      }
    >
      {confirmText && (
        <div>
          <label className="field-label" htmlFor="confirmation-text">
            Type <strong>{confirmText}</strong> to confirm
          </label>
          <input
            id="confirmation-text"
            className="field"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
          />
        </div>
      )}
    </Modal>
  );
}
