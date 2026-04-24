import { useCallback, useState } from "react";

export type FieldErrors<TField extends string> = Partial<Record<TField, string>>;

export function focusFirstInvalid(root: ParentNode | null = document) {
  if (!root) return;

  const firstInvalid = root.querySelector<HTMLElement>("[aria-invalid='true']");
  if (!firstInvalid) return;

  try {
    firstInvalid.scrollIntoView({ block: "center", behavior: "smooth" });
  } catch {
    // ignore
  }

  try {
    firstInvalid.focus();
  } catch {
    // ignore
  }
}

export function useFieldErrors<TField extends string>() {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<TField>>({});

  const clearFieldError = useCallback((field: TField) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const setErrorsAndFocus = useCallback(
    (errors: FieldErrors<TField>, root: ParentNode | null = document) => {
      setFieldErrors(errors);
      requestAnimationFrame(() => focusFirstInvalid(root));
    },
    [],
  );

  return { fieldErrors, setFieldErrors, clearFieldError, setErrorsAndFocus };
}
