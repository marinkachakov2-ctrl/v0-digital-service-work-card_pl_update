"use client";

import { GlobalHeader } from "./global-header";

interface TechnicalPortalLayoutProps {
  children: React.ReactNode;
  /** Optional subtitle for the header */
  subtitle?: string;
  /** Optional callback for creating a new job card */
  onNewJobCard?: () => void;
  /** Optional callback for selecting a job card */
  onSelectJobCard?: (jobCardId: string) => void;
  /** Optional content to render in the center of the header */
  headerCenter?: React.ReactNode;
}

export function TechnicalPortalLayout({
  children,
  subtitle,
  onNewJobCard,
  onSelectJobCard,
  headerCenter,
}: TechnicalPortalLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <GlobalHeader
        subtitle={subtitle}
        onNewJobCard={onNewJobCard}
        onSelectJobCard={onSelectJobCard}
      >
        {headerCenter}
      </GlobalHeader>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
