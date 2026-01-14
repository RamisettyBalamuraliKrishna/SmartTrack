
import React, { useState } from 'react';
import { UserRole, User } from '../types';
import { storage } from '../services/storageService';
import { ADMIN_CREDENTIALS } from '../constants';

interface AuthProps {
  onLogin: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [view, setView] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<UserRole>(UserRole.STUDENT);
  const [error, setError] = useState<string | null>(null);
  const [bindingSuccess, setBindingSuccess] = useState(false);
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [staffId, setStaffId] = useState('');
  const [course, setCourse] = useState('');
  const [yearOfStudying, setYearOfStudying] = useState('');

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setAdmissionNumber('');
    setStaffId('');
    setCourse('');
    setYearOfStudying('');
    setError(null);
    setBindingSuccess(false);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === UserRole.ADMIN) {
      setError('Administrator accounts cannot be self-registered.');
      return;
    }

    const users = storage.getUsers();
    if (users.some(u => u.email === email)) {
      setError('Email already exists');
      return;
    }

    const newUser: User = {
      id: storage.generateId(),
      fullName,
      email,
      password,
      role,
      admissionNumber,
      course,
      yearOfStudying,
      staffId
    };

    users.push(newUser);
    storage.saveUsers(users);
    setError(null);
    setView('login');
    alert('Registration successful. Your account will be bound to the first device you use to sign in.');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBindingSuccess(false);

    if (role === UserRole.ADMIN) {
      if (email === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        onLogin({ id: 'admin', fullName: 'System Administrator', email: email, role: UserRole.ADMIN });
      } else {
        setError('Invalid administrator identifier or secret key.');
      }
      return;
    }

    const users = storage.getUsers();
    const userIndex = users.findIndex(u => u.email === email && u.password === password && u.role === role);
    const user = users[userIndex];

    if (!user) {
      setError('Authentication failed. Please check your credentials and role.');
      return;
    }

    // ENFORCE DEVICE BINDING FOR STUDENTS
    if (role === UserRole.STUDENT) {
      const currentDeviceId = storage.getDeviceId();
      if (!user.deviceFingerprint) {
        // First time login - Bind the device
        user.deviceFingerprint = currentDeviceId;
        users[userIndex] = user;
        storage.saveUsers(users);
        setBindingSuccess(true);
        // Small delay to show success before redirecting
        setTimeout(() => onLogin(user), 1500);
        return;
      } else if (user.deviceFingerprint !== currentDeviceId) {
        setError('Access Denied: This account is bound to another physical device. To sync a new device, please contact the System Administrator for a Secure-Link reset.');
        return;
      }
    }

    onLogin(user);
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (view === 'login') {
      handleLogin(e);
    } else {
      handleRegister(e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white p-10 rounded-3xl shadow-xl border border-gray-100 w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-block bg-indigo-600 p-3 rounded-2xl shadow-lg mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">SmartTrack</h2>
          <p className="text-gray-400 font-bold text-xs mt-1 uppercase tracking-[0.2em]">Academic Attendance</p>
        </div>

        <div className="flex bg-gray-100 p-1.5 rounded-2xl mb-8">
          <button 
            onClick={() => { setView('login'); resetForm(); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${view === 'login' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Sign In
          </button>
          <button 
            onClick={() => { 
              setView('register'); 
              resetForm(); 
              if (role === UserRole.ADMIN) setRole(UserRole.STUDENT);
            }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${view === 'register' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {view === 'register' && (
            <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl mb-4 animate-in fade-in duration-500">
               <div className="flex gap-3">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                 </svg>
                 <p className="text-[10px] text-indigo-700 font-bold leading-relaxed">
                   <span className="uppercase font-black block mb-1">Device Security Note:</span>
                   To prevent proxy attendance, your account will be permanently bound to the first device used for login. Multiple device access is prohibited.
                 </p>
               </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Identity Role</label>
            <select 
              value={role} 
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition font-bold text-gray-700"
            >
              <option value={UserRole.STUDENT}>Student</option>
              <option value={UserRole.STAFF}>Academic Staff</option>
              {view === 'login' && <option value={UserRole.ADMIN}>Administrator</option>}
            </select>
          </div>

          {view === 'register' && (
            <>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                <input 
                  type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-indigo-500 outline-none transition font-medium" 
                />
              </div>

              {role === UserRole.STUDENT && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Admission #</label>
                    <input 
                      type="text" required value={admissionNumber} onChange={(e) => setAdmissionNumber(e.target.value)}
                      placeholder="ADM-001"
                      className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl font-medium" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Course</label>
                    <input 
                      type="text" required value={course} onChange={(e) => setCourse(e.target.value)}
                      placeholder="CS-2024"
                      className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl font-medium" 
                    />
                  </div>
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
              {role === UserRole.ADMIN ? 'Admin ID' : 'Email Address'}
            </label>
            <input 
              type={role === UserRole.ADMIN ? 'text' : 'email'} required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder={role === UserRole.ADMIN ? 'Username' : 'name@university.edu'}
              className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl font-medium" 
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Secret Key</label>
            <input 
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl font-medium" 
            />
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-[11px] font-bold text-center animate-shake leading-relaxed shadow-sm">
              <span className="font-black block uppercase mb-1">Security Alert</span>
              {error}
            </div>
          )}

          {bindingSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600 text-[11px] font-bold text-center animate-in zoom-in-95 duration-300">
               <div className="flex items-center justify-center gap-2 mb-1">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                 </svg>
                 <span className="font-black uppercase tracking-widest">Secure Link Established</span>
               </div>
               Your current device has been successfully paired with your profile.
            </div>
          )}

          {!bindingSuccess && (
            <button 
              type="submit"
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-[0.98] mt-4 flex items-center justify-center gap-3"
            >
              {view === 'login' ? 'Authenticate' : 'Complete Setup'}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default Auth;
    