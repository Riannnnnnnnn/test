import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  size?: "default" | "small";
}

export function Button({
  children,
  variant = "primary",
  fullWidth = false,
  size = "default",
  className = "",
  ...props
}: PropsWithChildren<ButtonProps>) {
  const classes = [
    "button",
    `button--${variant}`,
    fullWidth ? "button--full" : "",
    size === "small" ? "button--small" : "",
    className,
  ].filter(Boolean).join(" ");

  return <button className={classes} {...props}>{children}</button>;
}
