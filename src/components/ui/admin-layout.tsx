import { ReactNode } from "react";
import { AdminNavigation } from "./admin-navigation";
import { PageContainer } from "./layout-system";

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
}

export function AdminLayout({ children, title, description, actions }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <AdminNavigation />
      
      {/* Main Content */}
      <div className="lg:ml-72 min-h-screen flex flex-col">
        <div className="flex-1 pt-16 lg:pt-8">
          <PageContainer>
            <div className="space-y-6">
              {/* Page Header */}
              {(title || description || actions) && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6">
                  <div className="space-y-1">
                    {title && (
                      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                        {title}
                      </h1>
                    )}
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
              )}
              
              {/* Page Content */}
              <div className="pb-6">
                {children}
              </div>
            </div>
          </PageContainer>
        </div>
      </div>
    </div>
  );
}
