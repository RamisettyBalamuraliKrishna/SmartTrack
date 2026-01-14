
export enum UserRole {
  STUDENT = 'STUDENT',
  STAFF = 'STAFF',
  ADMIN = 'ADMIN'
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  password?: string;
  role: UserRole;
  deviceFingerprint?: string;
  // Student specific
  admissionNumber?: string;
  course?: string;
  yearOfStudying?: string;
  // Staff specific
  staffId?: string;
  subject?: string;
}

export interface Period {
  id: string;
  staffId: string;
  date: string;
  day: string;
  time: string;
  subject: string;
  wifiIp: string;
  createdAt: number;
  expiresAt: number;
}

export interface AttendanceRecord {
  id: string;
  periodId: string;
  studentId: string;
  timestamp: number;
  subject: string;
  staffName: string;
  date: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
