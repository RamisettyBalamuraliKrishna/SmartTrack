
import { User, Period, AttendanceRecord } from '../types';
import { STORAGE_KEYS } from '../constants';

export const storage = {
  getUsers: (): User[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]'),
  saveUsers: (users: User[]) => localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users)),
  
  getPeriods: (): Period[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.PERIODS) || '[]'),
  savePeriods: (periods: Period[]) => localStorage.setItem(STORAGE_KEYS.PERIODS, JSON.stringify(periods)),
  
  getAttendance: (): AttendanceRecord[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTENDANCE) || '[]'),
  saveAttendance: (records: AttendanceRecord[]) => localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(records)),
  
  getCurrentUser: (): User | null => JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null'),
  setCurrentUser: (user: User | null) => localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user)),

  generateId: (): string => {
    try {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
    } catch (e) {}
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  },

  getDeviceId: (): string => {
    let id = localStorage.getItem('smart_track_device_id');
    if (!id) {
      id = storage.generateId();
      localStorage.setItem('smart_track_device_id', id);
    }
    return id;
  }
};
