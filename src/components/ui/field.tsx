import * as React from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-xs font-medium text-neutral-600", className)}
      {...props}
    />
  );
}

export interface FieldProps {
  label?: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  errors?: string[];
  className?: string;
  children: React.ReactNode;
}

/** Label + Control + Fehlerliste. Reicht `errors` aus `ActionState.fieldErrors[name]` durch. */
export function Field({ label, htmlFor, hint, errors, className, children }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label ? <Label htmlFor={htmlFor}>{label}</Label> : null}
      {children}
      {hint ? <p className="text-xs text-neutral-400">{hint}</p> : null}
      {errors?.length ? (
        <ul className="text-xs text-red-600">
          {errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      ) : null}
    </div>
  );
}
