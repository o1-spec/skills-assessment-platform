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
  userName: string;
}

export function NotificationsView({
  initialNotifications,
  initialTotal,
  initialUnreadCount,
  dashboardHref,
  userName,
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
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">Campaign</span>;
      case 'ASSESSMENT_DUE_REMINDER':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">Due Reminder</span>;
      case 'ASSESSMENT_SUBMITTED_FOR_REVIEW':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">Review Request</span>;
      case 'CORROBORATION_OVERDUE':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Overdue</span>;
      case 'CORROBORATION_COMPLETED':
      case 'ASSESSMENT_COMPLETED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">Completed</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">Notification</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Header Bar */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Link
              href={dashboardHref}
              className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
              id="back-to-dashboard-link"
            >
              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Dashboard
            </Link>
            <span className="text-gray-300">|</span>
            <h1 className="text-lg font-bold text-gray-900">Notification Center</h1>
          </div>

          <div className="text-sm text-gray-600 font-medium">
            {userName}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
          {/* Controls header */}
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50">
            {/* Filter tabs */}
            <div className="flex space-x-2" role="tablist">
              <button
                type="button"
                onClick={() => handleFilterChange('all')}
                id="filter-all-button"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                All Notifications
              </button>
              <button
                type="button"
                onClick={() => handleFilterChange('unread')}
                id="filter-unread-button"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors inline-flex items-center space-x-1.5 ${
                  filter === 'unread'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span>Unread</span>
                {unreadCount > 0 && (
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-bold ${
                      filter === 'unread'
                        ? 'bg-blue-800 text-white'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>

            {/* Actions */}
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={isLoading}
                id="page-mark-all-read-button"
                className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50 transition-colors"
              >
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Mark all as read
              </button>
            )}
          </div>

          {/* List */}
          {isLoading && notifications.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3" />
              <p className="text-sm">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-16 text-center text-gray-500">
              <div className="h-12 w-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900">No notifications found</p>
              <p className="text-xs text-gray-500 mt-1">
                {filter === 'unread'
                  ? "You don't have any unread notifications."
                  : 'You have no notifications in your history.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100" id="notifications-list">
              {notifications.map((item) => {
                const isUnread = !item.readAt;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`p-5 hover:bg-gray-50/80 cursor-pointer transition-colors flex items-start space-x-4 ${
                      isUnread ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    {/* Unread indicator */}
                    <div className="pt-1.5 shrink-0">
                      {isUnread ? (
                        <span className="block h-2.5 w-2.5 rounded-full bg-blue-600 ring-4 ring-blue-100" />
                      ) : (
                        <span className="block h-2.5 w-2.5 rounded-full bg-transparent" />
                      )}
                    </div>

                    {/* Body */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1 flex-wrap gap-y-1">
                        {getTypeBadge(item.type)}
                        <h2
                          className={`text-sm ${
                            isUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-800'
                          }`}
                        >
                          {item.title}
                        </h2>
                        <span className="text-xs text-gray-400">
                          &bull; {new Date(item.createdAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {item.message}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="shrink-0 flex items-center space-x-2 pt-1">
                      {item.href && (
                        <span className="text-xs font-semibold text-blue-600 group-hover:underline">
                          Open &rarr;
                        </span>
                      )}
                      {isUnread && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(item.id, e)}
                          className="text-xs text-gray-400 hover:text-blue-600 p-1 transition-colors"
                          title="Mark as read"
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
      </main>
    </div>
  );
}
