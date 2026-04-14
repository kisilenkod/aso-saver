import { AppEntry } from '../types';

const APPS_KEY = 'aso_saver_apps';
const PASSWORD_KEY = 'aso_saver_password';
const AUTH_KEY = 'aso_saver_authenticated';

export function getApps(): AppEntry[] {
  const data = localStorage.getItem(APPS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveApps(apps: AppEntry[]): void {
  localStorage.setItem(APPS_KEY, JSON.stringify(apps));
}

export function getApp(id: string): AppEntry | undefined {
  return getApps().find(app => app.id === id);
}

export function saveApp(app: AppEntry): void {
  const apps = getApps();
  const index = apps.findIndex(a => a.id === app.id);
  if (index >= 0) {
    apps[index] = { ...app, updatedAt: Date.now() };
  } else {
    apps.push(app);
  }
  saveApps(apps);
}

export function deleteApp(id: string): void {
  saveApps(getApps().filter(app => app.id !== id));
}

export function hasPassword(): boolean {
  return !!localStorage.getItem(PASSWORD_KEY);
}

export function setPassword(password: string): void {
  localStorage.setItem(PASSWORD_KEY, btoa(password));
}

export function checkPassword(password: string): boolean {
  const stored = localStorage.getItem(PASSWORD_KEY);
  return stored === btoa(password);
}

export function setAuthenticated(value: boolean): void {
  if (value) {
    sessionStorage.setItem(AUTH_KEY, 'true');
  } else {
    sessionStorage.removeItem(AUTH_KEY);
  }
}

export function isAuthenticated(): boolean {
  return sessionStorage.getItem(AUTH_KEY) === 'true';
}

export function exportData(): string {
  return JSON.stringify({ apps: getApps(), version: 1 }, null, 2);
}

export function importData(json: string): AppEntry[] {
  const data = JSON.parse(json);
  if (data.version && Array.isArray(data.apps)) {
    saveApps(data.apps);
    return data.apps;
  }
  throw new Error('Invalid data format');
}
