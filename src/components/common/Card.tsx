import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  glow?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ hover = false, padding = "md", glow = false, className = "", children, ...props }, ref) => {
    const paddingClasses = {
      none: "",
      sm: "p-4",
      md: "p-5",
      lg: "p-6",
    };
    return (
      <div
        ref={ref}
        className={[
          "bg-dark-surface border border-dark-border rounded-2xl",
          paddingClasses[padding],
          hover ? "card-hover cursor-pointer" : "",
          glow ? "border-accent/30 shadow-lg shadow-accent/5" : "",
          "transition-all duration-200",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
