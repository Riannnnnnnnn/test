import { forwardRef, type HTMLAttributes, type PropsWithChildren } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> { padded?: boolean; }

export const Card = forwardRef<HTMLDivElement, PropsWithChildren<CardProps>>(function Card(
  { children, padded = true, className = "", ...props },
  ref,
) {
  return <div ref={ref} className={`card ${padded ? "card--padded" : ""} ${className}`.trim()} {...props}>{children}</div>;
});
