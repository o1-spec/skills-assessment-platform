'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
  type: string;
}

interface NotificationsViewProps {
  initialNotifications: NotificationItem[];
  initialTotal: number;
  initialUnreadCount: number;
  dashboardHref: string;
}

export function NotificationsView({
  initialNotifications,
  initialTotal,
  initialUnreadCount,
  dashboardHref,
}: NotificationsViewProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [, setTotal] = useState<number>(initialTotal);
  const [unreadCount, setUnreadCount] = useState<number>(initialUnreadCount);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const router = useRouter();

  const handleFilterChange = async (nextFilter: 'all' | 'unread') => {
    setFilter(nextFilter);
    setIsLoading(true);
    try {
      const url = `/api/notifications?limit=50${nextFilter === 'unread' ? '&unread=true' : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setTotal(data.total || 0);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      if (res.ok) {
        const now = new Date().toISOString();
        setNotifications((prev) => prev.map((n) => ({ ...n, readAt: now })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to mark all read:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemClick = async (item: NotificationItem) => {
    if (!item.readAt) {
      try {
        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationId: item.id }),
        });
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Failed to mark read on click:', err);
      }
    }
    if (item.href) {
      router.push(item.href);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'CAMPAIGN_ASSIGNED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-700 border border-stone-200/80">Campaign</span>;
      case 'ASSESSMENT_DUE_REMINDER':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-700 border border-stone-200/80">Due Reminder</span>;
      case 'ASSESSMENT_SUBMITTED_FOR_REVIEW':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-700 border border-stone-200/80">Review Request</span>;
      case 'CORROBORATION_OVERDUE':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200/80">Overdue</span>;
      case 'CORROBORATION_COMPLETED':
      case 'ASSESSMENT_COMPLETED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">Completed</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-700 border border-stone-200/80">Notification</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-500 mb-1">
            <Link
              href={dashboardHref}
              className="hover:text-neutral-900 transition-colors inline-flex items-center gap-1"
              id="back-to-dashboard-link"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-neutral-800 font-semibold">Notification Center</span>
          </div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Notification Center</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            View, filter, and respond to account, review, and workflow notifications.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xs border border-stone-200/80 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-50/50">
            <div className="flex space-x-2" role="tablist">
              <button
                type="button"
                onClick={() => handleFilterChange('all')}
                id="filter-all-button"
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  filter === 'all'
                    ? 'bg-neutral-900 text-white shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-stone-100'
                }`}
              >
                All Notifications
              </button>
              <button
                type="button"
                onClick={() => handleFilterChange('unread')}
                id="filter-unread-button"
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors inline-flex items-center space-x-1.5 cursor-pointer ${
                  filter === 'unread'
                    ? 'bg-neutral-900 text-white shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-stone-100'
                }`}
              >
                <span>Unread</span>
                {unreadCount > 0 && (
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      filter === 'unread'
                        ? 'bg-neutral-800 text-white'
                        : 'bg-stone-200 text-neutral-800'
                    }`}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={isLoading}
                id="page-mark-all-read-button"
                className="inline-flex items-center text-xs font-semibold text-neutral-700 hover:text-neutral-900 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <svg className="h-3.5 w-3.5 mr-1 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Mark all as read
              </button>
            )}
          </div>

          {isLoading && notifications.length === 0 ? (
            <div className="p-12 text-center text-neutral-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900 mx-auto mb-3" />
              <p className="text-xs">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-16 text-center text-neutral-500">
              <div className="h-12 w-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-3">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </div>
              <p className="text-sm font-bold text-neutral-900">No notifications found</p>
              <p className="text-xs text-neutral-500 mt-1">
                {filter === 'unread'
                  ? "You don't have any unread notifications."
                  : 'You have no notifications in your history.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100" id="notifications-list">
              {notifications.map((item) => {
                const isUnread = !item.readAt;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`p-5 hover:bg-stone-50/80 cursor-pointer transition-colors flex items-start space-x-4 ${
                      isUnread ? 'bg-stone-50/50' : ''
                    }`}
                  >
                    <div className="pt-1.5 shrink-0">
                      {isUnread ? (
                        <span className="block h-2 w-2 rounded-full bg-neutral-900 ring-2 ring-stone-200" />
                      ) : (
                        <span className="block h-2 w-2 rounded-full bg-transparent" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1 flex-wrap gap-y-1">
                        {getTypeBadge(item.type)}
                        <h2
                          className={`text-xs ${
                            isUnread ? 'font-bold text-neutral-900' : 'font-semibold text-neutral-800'
                          }`}
                        >
                          {item.title}
                        </h2>
                        <span className="text-[11px] text-neutral-400">
                          &bull; {new Date(item.createdAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 leading-relaxed">
                        {item.message}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center space-x-2 pt-1">
                      {item.href && (
                        <span className="text-xs font-semibold text-neutral-900 hover:underline">
                          Open &rarr;
                        </span>
                      )}
                      {isUnread && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(item.id, e)}
                          title="Mark as read"
                          className="text-xs text-neutral-400 hover:text-neutral-900 p-1 transition-colors cursor-pointer"
                        >
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
  );
}
