"use client";

import * as React from "react";
import { AppSidebarWrapper } from "@/components/navigation/app-sidebar";

type UserRole = "admin" | "tech";

interface ManagerLayoutProps {
  children: React.ReactNode;
  /** User role for sidebar navigation filtering */
  userRole?: UserRole;
  /** User name displayed in sidebar */
  userName?: string;
  /** User avatar URL */
  userAvatar?: string;
  /** Callback when user changes role via sidebar */
  onRoleChange?: (role: UserRole) => void;
  /** Number of pending cards to show in sidebar badge */
  pendingCardsCount?: number;
}

/**
 * ManagerLayout - Layout for manager/admin-facing pages
 * Contains LEFT sidebar navigation (AppSidebar) with no top header
 * Used for: /admin/manager, /planning, /admin/queue, etc.
 */
export function ManagerLayout({
  children,
  userRole = "admin",
  userName = "Service Manager",
  userAvatar,
  onRoleChange,
  pendingCardsCount,
}: ManagerLayoutProps) {
  return (
    <AppSidebarWrapper
      userRole={userRole}
      userName={userName}
      userAvatar={userAvatar}
      onRoleChange={onRoleChange}
      pendingCardsCount={pendingCardsCount}
    >
      {children}
    </AppSidebarWrapper>
  );
}
