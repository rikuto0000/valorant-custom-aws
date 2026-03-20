import * as React from "react";
import { cn } from "@/lib/cn";

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-val-input-border bg-val-input-bg px-3 py-2 text-sm text-val-light placeholder:text-val-light-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-val-ring focus-visible:ring-offset-2 focus-visible:ring-offset-val-dark disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
