import * as React from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-md border border-line bg-white px-2.5 text-sm text-ink shadow-sm transition-colors " +
  "placeholder:text-neutral-400 hover:border-neutral-300 " +
  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand focus-visible:border-brand " +
  "disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500 " +
  "aria-[invalid=true]:border-red-500";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(base, "h-9", className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, rows = 3, ...props }, ref) => (
  <textarea ref={ref} rows={rows} className={cn(base, "py-1.5 leading-snug", className)} {...props} />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn(base, "h-9 pr-8", className)} {...props} />
));
Select.displayName = "Select";
