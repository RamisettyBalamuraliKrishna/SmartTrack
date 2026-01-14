
import React, { useState, useEffect } from 'react';
import { User, Period, AttendanceRecord } from '../types';
import { storage } from '../services/storageService';
import QRCode from 'qrcode';

interface StaffDashboardProps {
  staff: User;
}

const StaffDashboard: React.FC<StaffDashboardProps> = ({ staff }) => {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [activeQr, setActiveQr] = useState<Period | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrError, setQrError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [subject, setSubject] = useState(staff.subject || '');
  const [duration, setDuration] = useState(2);
  const [useWifiLock, setUseWifiLock] = useState(false);
  const [detectedIp, setDetectedIp] = useState('');

  useEffect(() => {
    const allPeriods = storage.getPeriods();
    setPeriods(allPeriods.filter(p => p.staffId === staff.id));
    
    // IP Detection for network locking
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setDetectedIp(data.ip))
      .catch(() => setDetectedIp('Campus-Net-01'));
  }, [staff.id]);

  useEffect(() => {
    let timer: any;
    if (activeQr) {
      timer = setInterval(() => {
        const remaining = Math.max(0, Math.floor((activeQr.expiresAt - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining <= 0) { 
          setActiveQr(null); 
          setQrDataUrl(''); 
          clearInterval(timer); 
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeQr]);

  const generateQRCode = async (id: string) => {
    setQrError(null);
    try {
      const url = await QRCode.toDataURL(id, { 
        width: 400, margin: 2, color: { dark: '#1e1b4b', light: '#ffffff' } 
      });
      setQrDataUrl(url);
    } catch (err) { 
      setQrError("Failed to generate security token."); 
    }
  };

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    const expiryMs = duration * 60 * 1000;
    const newPeriod: Period = {
      id: storage.generateId(), 
      staffId: staff.id, 
      date: new Date().toISOString().split('T')[0],
      day: new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date()),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
      subject, 
      wifiIp: useWifiLock ? detectedIp : '', 
      createdAt: Date.now(), 
      expiresAt: Date.now() + expiryMs
    };
    const updated = [newPeriod, ...storage.getPeriods()];
    storage.savePeriods(updated);
    setPeriods(updated.filter(p => p.staffId === staff.id));
    await generateQRCode(newPeriod.id);
    setActiveQr(newPeriod);
    setIsCreating(false);
  };

  const exportToCSV = (period: Period) => {
    const records = storage.getAttendance().filter(r => r.periodId === period.id);
    const users = storage.getUsers();
    const headers = ['Date', 'Student Name', 'Admission #', 'Check-in Time'];
    const rows = records.map(r => {
      const student = users.find(u => u.id === r.studentId);
      return [`"${period.date}"`, `"${student?.fullName}"`, `"${student?.admissionNumber}"`, `"${new Date(r.timestamp).toLocaleTimeString()}"`].join(',');
    });
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `attendance_${period.subject}.csv`; a.click();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Academic Control</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Attendance Session Management</p>
          </div>
          {!activeQr && (
            <button 
              onClick={() => setIsCreating(!isCreating)} 
              className={`px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest transition-all ${isCreating ? 'bg-gray-100 text-gray-400' : 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 hover:bg-indigo-700'}`}
            >
              {isCreating ? 'Dismiss' : 'New Session'}
            </button>
          )}
        </div>

        {isCreating && (
          <form onSubmit={handleCreatePeriod} className="bg-gray-50/50 p-8 rounded-3xl border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Module Subject</label>
              <input type="text" required value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full p-4 bg-white border border-gray-200 rounded-2xl focus:border-indigo-500 outline-none font-bold" />
            </div>
            
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">QR Valid Duration</label>
              <div className="flex items-center gap-6 bg-white p-4 border border-gray-200 rounded-2xl">
                <input type="range" min="1" max="10" value={duration} onChange={(e) => setDuration(parseInt(e.target.value))} className="flex-1 accent-indigo-600" />
                <span className="text-sm font-black text-indigo-600 w-16 text-center">{duration}m</span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Network Isolation</label>
              <div className="flex items-center gap-4 bg-white p-4 border border-gray-200 rounded-2xl">
                <input type="checkbox" checked={useWifiLock} onChange={(e) => setUseWifiLock(e.target.checked)} className="w-5 h-5 accent-indigo-600 cursor-pointer" />
                <span className="text-xs font-bold text-gray-500">{useWifiLock ? `Locked: ${detectedIp}` : 'Open Network'}</span>
              </div>
            </div>

            <div className="md:col-span-2 flex justify-end pt-4">
              <button type="submit" className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">Launch Session</button>
            </div>
          </form>
        )}

        {activeQr && (
          <div className="mt-6 flex flex-col items-center p-12 bg-indigo-50/30 border border-indigo-100/50 rounded-3xl relative animate-in zoom-in-95">
            <div className="text-center mb-10">
              <h3 className="text-2xl font-black text-indigo-900 uppercase tracking-tight">{activeQr.subject}</h3>
              <p className="text-[10px] text-indigo-400 font-black uppercase mt-2 tracking-[0.3em]">Active Verification Terminal</p>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-white mb-10 relative group overflow-hidden">
               {qrDataUrl ? <img src={qrDataUrl} alt="Session QR" className="w-64 h-64" /> : <div className="w-64 h-64 flex items-center justify-center text-xs text-gray-300 font-bold uppercase animate-pulse">Encoding...</div>}
               <div className="scan-line"></div>
            </div>
            <div className="flex gap-6 w-full max-w-sm">
              <div className="flex-1 bg-white p-5 rounded-2xl border border-gray-100 text-center shadow-sm">
                <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">Expires In</p>
                <p className="text-2xl font-mono font-black text-indigo-600">
                  {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                </p>
              </div>
              <div className="flex-1 bg-white p-5 rounded-2xl border border-gray-100 flex flex-col justify-center items-center shadow-sm">
                <div className={`w-3 h-3 rounded-full animate-pulse mb-1 ${activeQr.wifiIp ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                <p className={`text-[10px] uppercase font-black tracking-widest ${activeQr.wifiIp ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {activeQr.wifiIp ? 'Net-Locked' : 'Open-Sync'}
                </p>
              </div>
            </div>
            <button onClick={() => {setActiveQr(null); setQrDataUrl('');}} className="mt-12 text-[10px] text-gray-400 hover:text-red-500 font-black uppercase tracking-[0.4em] transition-all">Terminate Active Session</button>
          </div>
        )}
      </div>

      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-8">Session Repository</h3>
        <div className="overflow-x-auto -mx-8">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 border-y border-gray-100 text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">
              <tr>
                <th className="p-6">Schedule</th>
                <th className="p-6">Module</th>
                <th className="p-6 text-center">Headcount</th>
                <th className="p-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {periods.length === 0 ? (
                <tr><td colSpan={4} className="p-20 text-center text-gray-300 text-sm font-medium italic">No historical archives available.</td></tr>
              ) : (
                periods.map(p => {
                  const count = storage.getAttendance().filter(r => r.periodId === p.id).length;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-all">
                      <td className="p-6 font-bold text-gray-900 text-sm">{p.date}<br/><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{p.day} • {p.time}</span></td>
                      <td className="p-6 text-sm font-black text-indigo-900 uppercase tracking-tight">{p.subject}</td>
                      <td className="p-6 text-center"><span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full border border-indigo-100">{count} Present</span></td>
                      <td className="p-6 text-right"><button onClick={() => exportToCSV(p)} className="text-indigo-600 hover:text-indigo-800 text-[10px] font-black uppercase tracking-widest border border-indigo-100 px-4 py-2 rounded-xl bg-white hover:bg-indigo-50 transition-all">Export Report</button></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
