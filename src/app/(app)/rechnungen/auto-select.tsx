"use client";

import { Select } from "@/components/ui/input";

/** Auswahlfeld, das beim Ändern das umgebende GET-Formular sofort absendet. */
export function AutoSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <Select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}
