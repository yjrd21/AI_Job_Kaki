import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

// Describe modal visibility, accessible headings, content, and close handling.
type Props = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  description?: string;
  closeLabel?: string;
};

// Render a native modal dialog and synchronise it with React visibility state.
export function Modal({
  open,
  title,
  children,
  onClose,
  footer,
  description,
  closeLabel = "Close dialog",
}: Props) {
  // Retain the native dialog element used to open and close the modal.
  const ref = useRef<HTMLDialogElement>(null);

  // Generate the identifier used to label the dialog with its title.
  const titleId = useId();

  // Generate the identifier used to associate optional descriptive text.
  const descriptionId = useId();

  // Keep the native dialog open state aligned with the visibility requested by React.
  useEffect(() => {
    // Read the mounted dialog element before synchronising its open state.
    const dialog = ref.current;

    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  if (typeof document === "undefined") return null;
  return createPortal(
    <dialog
      ref={ref}
      className="ui-modal"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="ui-modal-header">
        <h2 id={titleId} className="section-title">
          {title}
        </h2>
        <button
          type="button"
          className="ui-icon-button"
          aria-label={closeLabel}
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>
      {description && (
        <p id={descriptionId} className="muted ui-modal-description">
          {description}
        </p>
      )}
      <div className="ui-modal-body">{children}</div>
      {footer && <div className="ui-modal-footer">{footer}</div>}
    </dialog>,
    document.body,
  );
}
