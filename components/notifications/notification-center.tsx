"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  X,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Clock,
  Loader2,
  BellOff,
} from "lucide-react";
import Link from "next/link";

// Types
interface Notification {
  id: string;
  title: string;
  message: string;
  job_card_id: string | null;
  is_read: boolean;
  created_at: string;
  user_id: string | null;
}

interface NotificationCenterProps {
  userId?: string;
}

// Helper to get notification icon based on title/content
function getNotificationIcon(title: string) {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes("approved") || lowerTitle.includes("completed")) {
    return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
  }
  if (lowerTitle.includes("urgent") || lowerTitle.includes("alert")) {
    return <AlertCircle className="h-5 w-5 text-red-500" />;
  }
  if (lowerTitle.includes("repair") || lowerTitle.includes("defect")) {
    return <Wrench className="h-5 w-5 text-amber-500" />;
  }
  return <Clock className="h-5 w-5 text-blue-500" />;
}

// Format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("bg-BG", { month: "short", day: "numeric" });
}

export function NotificationCenter({ userId }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    const supabase = createClient();

    try {
      let query = supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      // Filter by user if provided
      if (userId) {
        query = query.or(`user_id.eq.${userId},user_id.is.null`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching notifications:", error);
        return;
      }

      setNotifications(data || []);
      setUnreadCount((data || []).filter((n) => !n.is_read).length);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    const supabase = createClient();

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    const supabase = createClient();
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);

    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  };

  // Fetch on mount and when opened
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Real-time subscription
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("notifications_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const newNotification = payload.new as Notification;
          // Only add if it's for this user or global
          if (!userId || !newNotification.user_id || newNotification.user_id === userId) {
            setNotifications((prev) => [newNotification, ...prev.slice(0, 19)]);
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <div className="relative">
      {/* Bell Button with Badge */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative h-12 w-12 rounded-full hover:bg-primary/10 active:scale-95 transition-all"
        aria-label="Notifications"
      >
        <Bell className="h-6 w-6 text-foreground" />
        
        {/* Unread Indicator - Red Dot */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5"
            >
              <span className="flex h-5 w-5 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </Button>

      {/* Backdrop for mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, x: "100%" }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -10, x: "100%" }}
            transition={{ 
              type: "spring", 
              damping: 25, 
              stiffness: 300,
              duration: 0.3 
            }}
            className="fixed md:absolute right-0 top-0 md:top-full md:mt-2 z-50 w-full md:w-[380px] h-full md:h-auto md:max-h-[70vh] bg-card border-l md:border border-border md:rounded-xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between bg-card border-b border-border/50 px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Notifications</h2>
                  <p className="text-xs text-muted-foreground">
                    {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs text-primary hover:text-primary/80"
                  >
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-10 w-10 rounded-full hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Notification List */}
            <ScrollArea className="h-[calc(100vh-80px)] md:h-auto md:max-h-[calc(70vh-80px)]">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4">
                    <BellOff className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-medium text-foreground mb-1">No notifications</p>
                  <p className="text-sm text-muted-foreground">
                    You're all caught up! New updates will appear here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {notifications.map((notification, index) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`relative p-4 transition-colors ${
                        !notification.is_read
                          ? "bg-primary/5 hover:bg-primary/10"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => !notification.is_read && markAsRead(notification.id)}
                    >
                      {/* Unread indicator line */}
                      {!notification.is_read && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r" />
                      )}

                      <div className="flex gap-3">
                        {/* Icon */}
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                            {getNotificationIcon(notification.title)}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className={`text-base font-semibold leading-tight ${
                              !notification.is_read ? "text-foreground" : "text-foreground/80"
                            }`}>
                              {notification.title}
                            </h3>
                            <span className="flex-shrink-0 text-xs text-muted-foreground">
                              {formatRelativeTime(notification.created_at)}
                            </span>
                          </div>

                          <p className="text-sm text-muted-foreground leading-relaxed mb-3 line-clamp-2">
                            {notification.message}
                          </p>

                          {/* Action Button */}
                          {notification.job_card_id && (
                            <Link 
                              href={`/technician?editId=${notification.job_card_id}`}
                              onClick={() => setIsOpen(false)}
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-2 h-10 px-4 border-amber-500/50 text-amber-500 hover:bg-amber-500 hover:text-black font-semibold active:scale-95 transition-all"
                              >
                                Go to Job
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Footer - View All (Mobile) */}
            {notifications.length > 0 && (
              <div className="sticky bottom-0 border-t border-border/50 bg-card p-3 md:hidden">
                <Button
                  variant="outline"
                  className="w-full h-12 text-base font-medium"
                  onClick={() => setIsOpen(false)}
                >
                  Close
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Export a simple bell icon for header use
export function NotificationBell({ userId }: { userId?: string }) {
  return <NotificationCenter userId={userId} />;
}
