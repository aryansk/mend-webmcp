"use client";

import { useEffect, useRef, type RefObject } from "react";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function useDialogAccessibility(
  open: boolean,
  onClose: () => void,
  returnFocusRef?: RefObject<HTMLElement | null>,
) {
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    const previousFocus =
      returnFocusRef?.current ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null);
    const backdrop = dialog.closest<HTMLElement>(".modal-backdrop");
    const container = backdrop?.parentElement;
    const hiddenSiblings = container
      ? Array.from(container.children).filter(
          (element): element is HTMLElement =>
            element instanceof HTMLElement && element !== backdrop,
        )
      : [];
    const previousOverflow = document.body.style.overflow;

    for (const sibling of hiddenSiblings) {
      sibling.dataset.previousAriaHidden = sibling.getAttribute("aria-hidden") ?? "";
      sibling.setAttribute("aria-hidden", "true");
      sibling.setAttribute("inert", "");
    }

    document.body.style.overflow = "hidden";
    dialog.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter((element) => element.offsetParent !== null);

      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;

      for (const sibling of hiddenSiblings) {
        sibling.removeAttribute("inert");
        const previousAriaHidden = sibling.dataset.previousAriaHidden;
        delete sibling.dataset.previousAriaHidden;

        if (previousAriaHidden) {
          sibling.setAttribute("aria-hidden", previousAriaHidden);
        } else {
          sibling.removeAttribute("aria-hidden");
        }
      }

      previousFocus?.focus();
    };
  }, [open, returnFocusRef]);

  return dialogRef;
}
