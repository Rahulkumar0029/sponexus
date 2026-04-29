"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type NotificationItem = {
  _id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
};

type NotificationsResponse = {
  success: boolean;
  notifications?: NotificationItem[];
  unreadCount?: number;
};

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  async function loadNotifications() {
    try {
      setLoading(true);

      const res = await fetch("/api/notifications?limit=10", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data: NotificationsResponse = await res.json();

      if (res.ok && data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Notification load failed:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadUnreadCount() {
    try {
      const res = await fetch("/api/notifications/unread-count", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setUnreadCount(Number(data.unreadCount || 0));
      }
    } catch {
      // silent
    }
  }

  async function markRead(id: string) {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        credentials: "include",
      });

      setNotifications((items) =>
        items.map((item) =>
          item._id === id ? { ...item, isRead: true } : item
        )
      );

      setUnreadCount((count) => Math.max(0, count - 1));
    } catch {
      // silent
    }
  }

  async function markAllRead() {
    try {
      await fetch("/api/notifications/read-all", {
        method: "PATCH",
        credentials: "include",
      });

      setNotifications((items) =>
        items.map((item) => ({ ...item, isRead: true }))
      );

      setUnreadCount(0);
    } catch {
      // silent
    }
  }

  useEffect(() => {
    loadUnreadCount();

    const interval = window.setInterval(() => {
      loadUnreadCount();
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          const nextOpen = !open;
          setOpen(nextOpen);
          if (nextOpen) loadNotifications();
        }}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
        aria-label="Notifications"
      >
        <span className="text-lg">🔔</span>

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF7A18] px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-3 w-[340px] overflow-hidden rounded-2xl border border-white/10 bg-[#07152F] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">Notifications</p>
              <p className="text-xs text-[#94A3B8]">
                {unreadCount} unread
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-semibold text-[#FFB347] hover:text-white"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="p-4 text-sm text-[#94A3B8]">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-sm text-[#94A3B8]">
                No notifications yet.
              </div>
            ) : (
              notifications.map((item) => {
                const content = (
                  <div
                    className={`border-b border-white/5 px-4 py-3 transition hover:bg-white/5 ${
                      item.isRead ? "opacity-70" : "bg-white/[0.03]"
                    }`}
                    onClick={() => {
                      if (!item.isRead) markRead(item._id);
                      setOpen(false);
                    }}
                  >
                    <div className="flex gap-3">
                      <div
                        className={`mt-1 h-2 w-2 rounded-full ${
                          item.isRead ? "bg-transparent" : "bg-[#FF7A18]"
                        }`}
                      />

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white">
                          {item.title}
                        </p>

                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#CBD5E1]">
                          {item.message}
                        </p>

                        <p className="mt-2 text-[11px] text-[#64748B]">
                          {formatTime(item.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                );

                if (item.link) {
                  return (
                    <Link key={item._id} href={item.link}>
                      {content}
                    </Link>
                  );
                }

                return (
  <button
    key={item._id}
    type="button"
    className="w-full text-left"
    onClick={() => {
      if (!item.isRead) markRead(item._id);
      setOpen(false);
    }}
  >
    {content}
  </button>
);
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}