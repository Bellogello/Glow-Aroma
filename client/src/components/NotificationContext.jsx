import React, { createContext, useContext, useState, useCallback } from 'react';
import '../styles/Notifications.css';

const NotificationContext = createContext(null);

export const useNotification = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used inside NotificationProvider');
  return ctx;
};

let idCounter = 0;

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const dismiss = useCallback((id) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, exiting: true } : n)
    );
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 350);
  }, []);

  const notify = useCallback((message, type = 'info', title = '', duration = 4000) => {
    const id = ++idCounter;
    const defaultTitles = {
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Info'
    };
    setNotifications(prev => [
      ...prev,
      { id, message, type, title: title || defaultTitles[type], duration, exiting: false }
    ]);
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  // Shorthand helpers
  const success = useCallback((message, title = '') => notify(message, 'success', title), [notify]);
  const error   = useCallback((message, title = '') => notify(message, 'error', title), [notify]);
  const warning = useCallback((message, title = '') => notify(message, 'warning', title), [notify]);
  const info    = useCallback((message, title = '') => notify(message, 'info', title), [notify]);

  return (
    <NotificationContext.Provider value={{ notify, success, error, warning, info, dismiss }}>
      {children}
      <div className="notif-container" aria-live="polite" aria-atomic="false">
        {notifications.map(n => (
          <Toast key={n.id} notification={n} onDismiss={dismiss} />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

const ICONS = {
  success: '✓',
  error:   '✕',
  warning: '!',
  info:    'i'
};

const Toast = ({ notification, onDismiss }) => {
  const { id, message, type, title, duration, exiting } = notification;
  return (
    <div className={`notif-toast notif-${type} ${exiting ? 'notif-exit' : 'notif-enter'}`} role="alert">
      <div className="notif-icon">{ICONS[type]}</div>
      <div className="notif-body">
        {title && <p className="notif-title">{title}</p>}
        <p className="notif-message">{message}</p>
      </div>
      <button className="notif-close" onClick={() => onDismiss(id)} aria-label="Dismiss">×</button>
      {duration > 0 && (
        <div
          className="notif-bar"
          style={{ animationDuration: `${duration}ms` }}
        />
      )}
    </div>
  );
};

export default NotificationProvider;