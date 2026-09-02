import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "outline" | "ghost" | "destructive";
type Size = "sm" | "md";

const VARIANT: Record<Variant, string> = {
  default: "bg-brand text-white shadow-sm hover:bg-brand-hover disabled:bg-neutral-400 disabled:shadow-none",
  outline: "border border-line bg-white text-ink hover:bg-brand-soft hover:border-brand/40 disabled:opacity-50",
  ghost: "text-ink hover:bg-brand-soft hover:text-brand disabled:opacity-50",
  destructive: "bg-red-600 text-white shadow-sm hover:bg-red-700 disabled:bg-red-300",
};
const SIZE: Record<Size, string> = {
  sm: "h-8 px-2.5 text-xs",
  md: "h-9 px-3.5 text-sm",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

/** Klassen für Button-Optik — auch für `<Link>` als Button verwendbar. */
export function buttonClasses(variant: Variant = "default", size: Size = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
    "disabled:cursor-not-allowed",
    VARIANT[variant],
    SIZE[size],
    className,
  );
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", type = "button", ...props }, ref) => (
    <button ref={ref} type={type} className={buttonClasses(variant, size, className)} {...props} />
  ),
);
Button.displayName = "Button";
