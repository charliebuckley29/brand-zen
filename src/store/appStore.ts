import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { persist } from 'zustand/middleware';
import { Mention, User, Notification, UserType } from '@/types';
import { logger } from '@/lib/logger';

// App State Interface
interface AppState {
  // User state
  user: User | null;
  userRole: UserType | null;
  isAuthenticated: boolean;
  
  // Mentions state
  mentions: Mention[];
  mentionsLoading: boolean;
  mentionsError: string | null;
  totalMentions: number;
  currentPage: number;
  pageSize: number;
  
  // UI state
  currentView: string;
  selectedMentionId: string | null;
  sidebarOpen: boolean;
  
  // Notifications state
  notifications: Notification[];
  unreadCount: number;
  notificationsLoading: boolean;
  
  // Loading states
  globalLoading: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setUserRole: (role: UserType | null) => void;
  setAuthenticated: (authenticated: boolean) => void;
  
  // Mentions actions
  setMentions: (mentions: Mention[]) => void;
  addMention: (mention: Mention) => void;
  updateMention: (id: string, updates: Partial<Mention>) => void;
  removeMention: (id: string) => void;
  setMentionsLoading: (loading: boolean) => void;
  setMentionsError: (error: string | null) => void;
  setTotalMentions: (total: number) => void;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  
  // UI actions
  setCurrentView: (view: string) => void;
  setSelectedMentionId: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  navigateToMention: (mentionId: string) => void;
  clearSelectedMention: () => void;
  
  // Notifications actions
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  updateNotification: (id: string, updates: Partial<Notification>) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  setUnreadCount: (count: number) => void;
  setNotificationsLoading: (loading: boolean) => void;
  
  // Global actions
  setGlobalLoading: (loading: boolean) => void;
  reset: () => void;
}

// Initial state
const initialState = {
  // User state
  user: null,
  userRole: null,
  isAuthenticated: false,
  
  // Mentions state
  mentions: [],
  mentionsLoading: false,
  mentionsError: null,
  totalMentions: 0,
  currentPage: 1,
  pageSize: 10,
  
  // UI state
  currentView: 'dashboard',
  selectedMentionId: null,
  sidebarOpen: false,
  
  // Notifications state
  notifications: [],
  unreadCount: 0,
  notificationsLoading: false,
  
  // Loading states
  globalLoading: false,
};

// Create the store
export const useAppStore = create<AppState>()(
  devtools(
    subscribeWithSelector(
      persist(
        (set, get) => ({
          ...initialState,
          
          // User actions
          setUser: (user) => {
            logger.info('Setting user:', user?.email);
            set({ user, isAuthenticated: !!user });
          },
          
          setUserRole: (role) => {
            logger.info('Setting user role:', role);
            set({ userRole: role });
          },
          
          setAuthenticated: (authenticated) => {
            logger.info('Setting authenticated:', authenticated);
            set({ isAuthenticated: authenticated });
          },
          
          // Mentions actions
          setMentions: (mentions) => {
            logger.debug('Setting mentions:', mentions.length);
            set({ mentions, mentionsError: null });
          },
          
          addMention: (mention) => {
            const { mentions } = get();
            logger.debug('Adding mention:', mention.id);
            set({ mentions: [mention, ...mentions] });
          },
          
          updateMention: (id, updates) => {
            const { mentions } = get();
            logger.debug('Updating mention:', id, updates);
            set({
              mentions: mentions.map(m => 
                m.id === id ? { ...m, ...updates } : m
              )
            });
          },
          
          removeMention: (id) => {
            const { mentions, totalMentions } = get();
            logger.debug('Removing mention:', id);
            set({
              mentions: mentions.filter(m => m.id !== id),
              totalMentions: Math.max(0, totalMentions - 1)
            });
          },
          
          setMentionsLoading: (loading) => {
            set({ mentionsLoading: loading });
          },
          
          setMentionsError: (error) => {
            logger.error('Mentions error:', error);
            set({ mentionsError: error, mentionsLoading: false });
          },
          
          setTotalMentions: (total) => {
            set({ totalMentions: total });
          },
          
          setCurrentPage: (page) => {
            logger.debug('Setting current page:', page);
            set({ currentPage: page });
          },
          
          setPageSize: (size) => {
            logger.debug('Setting page size:', size);
            set({ pageSize: size, currentPage: 1 });
          },
          
          // UI actions
          setCurrentView: (view) => {
            logger.debug('Setting current view:', view);
            set({ currentView: view });
          },
          
          setSelectedMentionId: (id) => {
            logger.debug('Setting selected mention ID:', id);
            set({ selectedMentionId: id });
          },
          
          setSidebarOpen: (open) => {
            set({ sidebarOpen: open });
          },
          
          navigateToMention: (mentionId) => {
            logger.debug('Navigating to mention:', mentionId);
            set({ 
              currentView: 'dashboard',
              selectedMentionId: mentionId 
            });
          },
          
          clearSelectedMention: () => {
            logger.debug('Clearing selected mention');
            set({ selectedMentionId: null });
          },
          
          // Notifications actions
          setNotifications: (notifications) => {
            logger.debug('Setting notifications:', notifications.length);
            set({ notifications });
          },
          
          addNotification: (notification) => {
            const { notifications, unreadCount } = get();
            logger.debug('Adding notification:', notification.id);
            set({
              notifications: [notification, ...notifications],
              unreadCount: unreadCount + 1
            });
          },
          
          updateNotification: (id, updates) => {
            const { notifications } = get();
            logger.debug('Updating notification:', id, updates);
            set({
              notifications: notifications.map(n => 
                n.id === id ? { ...n, ...updates } : n
              )
            });
          },
          
          markNotificationAsRead: (id) => {
            const { notifications, unreadCount } = get();
            logger.debug('Marking notification as read:', id);
            const updatedNotifications = notifications.map(n => 
              n.id === id ? { ...n, read: true } : n
            );
            const newUnreadCount = Math.max(0, unreadCount - 1);
            set({
              notifications: updatedNotifications,
              unreadCount: newUnreadCount
            });
          },
          
          markAllNotificationsAsRead: () => {
            const { notifications } = get();
            logger.debug('Marking all notifications as read');
            set({
              notifications: notifications.map(n => ({ ...n, read: true })),
              unreadCount: 0
            });
          },
          
          setUnreadCount: (count) => {
            set({ unreadCount: count });
          },
          
          setNotificationsLoading: (loading) => {
            set({ notificationsLoading: loading });
          },
          
          // Global actions
          setGlobalLoading: (loading) => {
            set({ globalLoading: loading });
          },
          
          reset: () => {
            logger.info('Resetting app state');
            set(initialState);
          },
        }),
        {
          name: 'brand-zen-store',
          // Only persist certain parts of the state
          partialize: (state) => ({
            currentView: state.currentView,
            pageSize: state.pageSize,
            sidebarOpen: state.sidebarOpen,
          }),
        }
      )
    ),
    {
      name: 'brand-zen-store',
    }
  )
);

// Selectors for better performance
export const useUser = () => useAppStore((state) => ({
  user: state.user,
  userRole: state.userRole,
  isAuthenticated: state.isAuthenticated,
}));

export const useMentions = () => useAppStore((state) => ({
  mentions: state.mentions,
  loading: state.mentionsLoading,
  error: state.mentionsError,
  totalMentions: state.totalMentions,
  currentPage: state.currentPage,
  pageSize: state.pageSize,
}));

export const useUI = () => useAppStore((state) => ({
  currentView: state.currentView,
  selectedMentionId: state.selectedMentionId,
  sidebarOpen: state.sidebarOpen,
}));

export const useNotifications = () => useAppStore((state) => ({
  notifications: state.notifications,
  unreadCount: state.unreadCount,
  loading: state.notificationsLoading,
}));

// Action selectors
export const useMentionsActions = () => useAppStore((state) => ({
  setMentions: state.setMentions,
  addMention: state.addMention,
  updateMention: state.updateMention,
  removeMention: state.removeMention,
  setMentionsLoading: state.setMentionsLoading,
  setMentionsError: state.setMentionsError,
  setTotalMentions: state.setTotalMentions,
  setCurrentPage: state.setCurrentPage,
  setPageSize: state.setPageSize,
}));

export const useUIActions = () => useAppStore((state) => ({
  setCurrentView: state.setCurrentView,
  setSelectedMentionId: state.setSelectedMentionId,
  setSidebarOpen: state.setSidebarOpen,
  navigateToMention: state.navigateToMention,
  clearSelectedMention: state.clearSelectedMention,
}));

export const useNotificationActions = () => useAppStore((state) => ({
  setNotifications: state.setNotifications,
  addNotification: state.addNotification,
  updateNotification: state.updateNotification,
  markNotificationAsRead: state.markNotificationAsRead,
  markAllNotificationsAsRead: state.markAllNotificationsAsRead,
  setUnreadCount: state.setUnreadCount,
  setNotificationsLoading: state.setNotificationsLoading,
}));

// Subscribe to specific state changes
export const subscribeToMentions = (callback: (mentions: Mention[]) => void) => {
  return useAppStore.subscribe(
    (state) => state.mentions,
    callback,
    {
      equalityFn: (a, b) => a.length === b.length && a.every((mention, index) => mention.id === b[index]?.id)
    }
  );
};

export const subscribeToNotifications = (callback: (notifications: Notification[]) => void) => {
  return useAppStore.subscribe(
    (state) => state.notifications,
    callback,
    {
      equalityFn: (a, b) => a.length === b.length && a.every((notification, index) => notification.id === b[index]?.id)
    }
  );
};
