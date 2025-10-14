import { cn } from "@/lib/utils";
import { ReactNode } from "react";

// Page Layout Components
interface PageLayoutProps {
  children: ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageLayoutProps) {
  return (
    <div className={cn("max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", className)}>
      {children}
    </div>
  );
}

export function ContentContainer({ children, className }: PageLayoutProps) {
  return (
    <div className={cn("max-w-4xl mx-auto px-4 sm:px-6", className)}>
      {children}
    </div>
  );
}

export function FormContainer({ children, className }: PageLayoutProps) {
  return (
    <div className={cn("max-w-2xl mx-auto px-4 sm:px-6", className)}>
      {children}
    </div>
  );
}

// Page Header Component
interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: ReactNode;
  className?: string;
}

export function PageHeader({ 
  title, 
  description, 
  actions, 
  breadcrumbs,
  className 
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {breadcrumbs && (
        <div className="text-sm text-muted-foreground">
          {breadcrumbs}
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-sm sm:text-base text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-col sm:flex-row gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

// Grid System Components
interface GridProps {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4 | 'auto-fit' | 'auto-fill';
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Grid({ children, columns = 'auto-fit', gap = 'md', className }: GridProps) {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 lg:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    'auto-fit': 'grid-cols-[repeat(auto-fit,minmax(300px,1fr))]',
    'auto-fill': 'grid-cols-[repeat(auto-fill,minmax(250px,1fr))]'
  };

  const gapClasses = {
    sm: 'gap-4',
    md: 'gap-6',
    lg: 'gap-8',
    xl: 'gap-10'
  };

  return (
    <div className={cn(
      'grid',
      gridClasses[columns],
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  );
}

// Flex System Components
interface FlexProps {
  children: ReactNode;
  direction?: 'row' | 'col';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  wrap?: boolean;
  className?: string;
}

export function Flex({ 
  children, 
  direction = 'row',
  justify = 'start',
  align = 'start',
  gap = 'md',
  wrap = false,
  className 
}: FlexProps) {
  const directionClasses = {
    row: 'flex-row',
    col: 'flex-col'
  };

  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly'
  };

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
    baseline: 'items-baseline'
  };

  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8'
  };

  return (
    <div className={cn(
      'flex',
      directionClasses[direction],
      justifyClasses[justify],
      alignClasses[align],
      gapClasses[gap],
      wrap && 'flex-wrap',
      className
    )}>
      {children}
    </div>
  );
}

// Section Components
interface SectionProps {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export function Section({ children, title, description, className }: SectionProps) {
  return (
    <section className={cn("space-y-6", className)}>
      {(title || description) && (
        <div className="space-y-2">
          {title && (
            <h2 className="text-xl font-semibold tracking-tight">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

// Stats Grid Component
interface StatsGridProps {
  children: ReactNode;
  className?: string;
}

export function StatsGrid({ children, className }: StatsGridProps) {
  return (
    <div className={cn(
      "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4",
      className
    )}>
      {children}
    </div>
  );
}

// Content Area Component
interface ContentAreaProps {
  children: ReactNode;
  sidebar?: ReactNode;
  className?: string;
}

export function ContentArea({ children, sidebar, className }: ContentAreaProps) {
  return (
    <div className={cn(
      sidebar ? "grid grid-cols-1 lg:grid-cols-4 gap-6" : "",
      className
    )}>
      <div className={cn(sidebar && "lg:col-span-3")}>
        {children}
      </div>
      {sidebar && (
        <div className="lg:col-span-1">
          {sidebar}
        </div>
      )}
    </div>
  );
}

// Loading State Component
interface LoadingStateProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export function LoadingState({ size = 'md', text = 'Loading...', className }: LoadingStateProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <div className={cn("flex flex-col items-center justify-center space-y-4", className)}>
      <div className={cn(
        "animate-spin rounded-full border-2 border-primary border-t-transparent",
        sizeClasses[size]
      )} />
      <p className={cn("text-muted-foreground", textSizes[size])}>
        {text}
      </p>
    </div>
  );
}

// Empty State Component
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action, 
  className 
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center space-y-4 py-12",
      className
    )}>
      {icon && (
        <div className="text-muted-foreground">
          {icon}
        </div>
      )}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground max-w-sm">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="pt-4">
          {action}
        </div>
      )}
    </div>
  );
}


