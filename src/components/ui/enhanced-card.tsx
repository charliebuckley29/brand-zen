import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const enhancedCardVariants = cva(
  "rounded-lg border bg-card text-card-foreground transition-all duration-200 ease-in-out",
  {
    variants: {
      variant: {
        default: "shadow-sm",
        elevated: "shadow-md hover:shadow-lg",
        outlined: "border-2 shadow-none",
        interactive: "shadow-sm hover:shadow-md cursor-pointer hover:-translate-y-0.5",
        compact: "shadow-sm p-4",
        gradient: "shadow-sm bg-gradient-to-br from-card to-muted/20",
        glass: "shadow-sm backdrop-blur-sm bg-card/80 border-border/50",
      },
      padding: {
        none: "p-0",
        sm: "p-3",
        default: "p-6",
        lg: "p-8",
        xl: "p-10",
      },
      hover: {
        none: "",
        lift: "hover:-translate-y-1 hover:shadow-lg",
        glow: "hover:shadow-lg hover:shadow-primary/10",
        scale: "hover:scale-[1.02]",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "default",
      hover: "none",
    },
  }
);

export interface EnhancedCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof enhancedCardVariants> {
  asChild?: boolean;
}

const EnhancedCard = React.forwardRef<HTMLDivElement, EnhancedCardProps>(
  ({ className, variant, padding, hover, asChild = false, ...props }, ref) => {
    const Comp = asChild ? "div" : "div";
    
    return (
      <Comp
        className={cn(enhancedCardVariants({ variant, padding, hover, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
EnhancedCard.displayName = "EnhancedCard";

const EnhancedCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    padding?: "none" | "sm" | "default" | "lg";
  }
>(({ className, padding = "default", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-1.5",
      {
        "p-0": padding === "none",
        "p-3": padding === "sm",
        "p-6": padding === "default",
        "p-8": padding === "lg",
      },
      className
    )}
    {...props}
  />
));
EnhancedCardHeader.displayName = "EnhancedCardHeader";

const EnhancedCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement> & {
    size?: "sm" | "default" | "lg" | "xl";
  }
>(({ className, size = "default", ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "font-semibold leading-none tracking-tight",
      {
        "text-sm": size === "sm",
        "text-base": size === "default",
        "text-lg": size === "lg",
        "text-xl": size === "xl",
      },
      className
    )}
    {...props}
  />
));
EnhancedCardTitle.displayName = "EnhancedCardTitle";

const EnhancedCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
EnhancedCardDescription.displayName = "EnhancedCardDescription";

const EnhancedCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    padding?: "none" | "sm" | "default" | "lg";
  }
>(({ className, padding = "default", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      {
        "p-0": padding === "none",
        "p-3": padding === "sm",
        "p-6 pt-0": padding === "default",
        "p-8 pt-0": padding === "lg",
      },
      className
    )}
    {...props}
  />
));
EnhancedCardContent.displayName = "EnhancedCardContent";

const EnhancedCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    padding?: "none" | "sm" | "default" | "lg";
  }
>(({ className, padding = "default", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center",
      {
        "p-0": padding === "none",
        "p-3 pt-0": padding === "sm",
        "p-6 pt-0": padding === "default",
        "p-8 pt-0": padding === "lg",
      },
      className
    )}
    {...props}
  />
));
EnhancedCardFooter.displayName = "EnhancedCardFooter";

export { 
  EnhancedCard, 
  EnhancedCardHeader, 
  EnhancedCardFooter, 
  EnhancedCardTitle, 
  EnhancedCardDescription, 
  EnhancedCardContent,
  enhancedCardVariants 
};


