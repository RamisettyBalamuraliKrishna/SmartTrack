
import React, { useState, useEffect, useRef } from 'react';
import { User, AttendanceRecord, Period } from '../types';
import { storage } from '../services/storageService';
import { Html5Qrcode } from 'html5-qrcode';

interface StudentDashboardProps {
  student: User;
}

type ScanStatus = 'idle' | 'scanning' | 'success' | 'error';

interface Feedback {
  type: 'success' | 'error';
  message: string;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ student }) => {
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [wifiIp, setWifiIp] = useState('Checking...'); 
  const [isDetectingIp, setIsDetectingIp] = useState(true);
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const allAttendance = storage.getAttendance();
    setHistory(allAttendance.filter(r => r.studentId === student.id));
    detectNetworkIp();
  }, [student.id]);

  const detectNetworkIp = async () => {
    setIsDetectingIp(true);
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      if (data && data.ip) setWifiIp(data.ip);
    } catch (err) {
      setWifiIp('Campus-Net-01');
    } finally {
      setIsDetectingIp(false);
    }
  };

  useEffect(() => {
    if (isScanning) {
      setScanStatus('scanning');
      setIsFadingOut(false);
      const timer = window.setTimeout(() => startScanner(), 300);
      return () => {
        window.clearTimeout(timer);
        stopScanner();
      };
    } else {
      setScanStatus('idle');
      stopScanner();
    }
  }, [isScanning]);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setScanStatus(type);
    setIsFadingOut(false);

    if (feedbackTimeoutRef.current) window.clearTimeout(feedbackTimeoutRef.current);

    feedbackTimeoutRef.current = window.setTimeout(() => {
      setIsFadingOut(true);
      feedbackTimeoutRef.current = window.setTimeout(() => {
        setFeedback(null);
        setIsFadingOut(false);
        if (type === 'error') {
          setScanStatus('scanning');
        } else {
          setIsScanning(false);
          setScanStatus('idle');
        }
      }, 400);
    }, 2500);
  };

  const startScanner = async () => {
    try {
      const element = document.getElementById("reader");
      if (!element) return;
      if (scannerRef.current) await stopScanner();
      
      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;
      
      await html5QrCode.start(
        { facingMode: "environment" }, 
        { fps: 20, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 }, 
        (t) => handleVerification(t), 
        () => {}
      );
    } catch (err) {
      console.error("Scanner Access Denied", err);
      setIsScanning(false);
      alert("Verification terminal requires camera access.");
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {} finally { scannerRef.current = null; }
    }
  };

  const handleVerification = (decodedPayload: string) => {
    if (scanStatus === 'success' || scanStatus === 'error') return;
    const periods = storage.getPeriods();
    const period = periods.find(p => p.id === decodedPayload.trim());
    if (!period) return;
    
    if (Date.now() > period.expiresAt) { 
      showFeedback('error', 'Token Expired'); 
      return; 
    }

    if (period.wifiIp && period.wifiIp.trim() !== '') {
      if (wifiIp !== period.wifiIp) {
        showFeedback('error', 'Network Mismatch'); 
        return; 
      }
    }

    const all = storage.getAttendance();
    if (all.some(r => r.studentId === student.id && r.periodId === period.id)) { 
      showFeedback('error', 'Duplicate Entry'); 
      return; 
    }

    const staffs = storage.getUsers().filter(u => u.role === 'STAFF');
    const staff = staffs.find(s => s.id === period.staffId);

    const newRecord: AttendanceRecord = {
      id: storage.generateId(), 
      periodId: period.id, 
      studentId: student.id, 
      timestamp: Date.now(),
      subject: period.subject, 
      staffName: staff?.fullName || 'Academic Staff', 
      date: period.date
    };
    
    storage.saveAttendance([...all, newRecord]);
    setHistory([...all, newRecord].filter(r => r.studentId === student.id));
    showFeedback('success', 'Verification Success');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Scanner Terminal</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Identity Confirmation Portal</p>
          </div>
          <button 
            onClick={() => setIsScanning(!isScanning)}
            className={`px-10 py-4 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 ${isScanning ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-indigo-600 text-white shadow-2xl shadow-indigo-100 hover:bg-indigo-700'}`}
          >
            {isScanning ? 'Terminate Scanner' : 'Initiate Verification'}
          </button>
        </div>

        {isScanning && (
          <div className="max-w-md mx-auto animate-in fade-in zoom-in-95 duration-500">
            <div className="relative rounded-[3rem] overflow-hidden bg-gray-50 aspect-square shadow-2xl border-8 border-white ring-1 ring-gray-100">
               <div id="reader" className="w-full h-full"></div>
               {scanStatus === 'scanning' && (
                 <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
                   <div className="absolute inset-0 bg-indigo-900/10"></div>
                   <div className="w-[240px] h-[240px] scanner-target rounded-[2.5rem] relative">
                     <div className="scan-line"></div>
                     <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-indigo-600 rounded-tl-2xl"></div>
                     <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-indigo-600 rounded-tr-2xl"></div>
                     <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-indigo-600 rounded-bl-2xl"></div>
                     <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-indigo-600 rounded-br-2xl"></div>
                   </div>
                 </div>
               )}
               {scanStatus === 'success' && (
                 <div className={`absolute inset-0 bg-emerald-600/95 backdrop-blur-xl flex flex-col items-center justify-center z-50 px-10 text-center ${isFadingOut ? 'animate-quick-fade-out' : 'animate-zoom-out-settle'}`}>
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl mb-6">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-white font-black text-2xl uppercase tracking-tighter">{feedback?.message}</p>
                 </div>
               )}
               {scanStatus === 'error' && (
                 <div className={`absolute inset-0 bg-rose-600/95 backdrop-blur-xl flex flex-col items-center justify-center z-50 px-10 text-center ${isFadingOut ? 'animate-quick-fade-out' : 'animate-in fade-in'}`}>
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl mb-6">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <p className="text-white font-black text-2xl uppercase tracking-tighter mb-4">{feedback?.message}</p>
                    <button onClick={() => setScanStatus('scanning')} className="bg-white text-rose-600 px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Retry Scan</button>
                 </div>
               )}
            </div>

            <div className="mt-10 bg-gray-50 p-6 rounded-3xl border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Network Identity</p>
                <p className="text-xs font-mono font-black text-indigo-600">{isDetectingIp ? 'Analyzing Network...' : wifiIp}</p>
              </div>
              <button onClick={detectNetworkIp} className={`p-3 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all ${isDetectingIp ? 'animate-spin' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-10 pb-6 border-b border-gray-50">
          <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Verified History</h3>
          <span className="text-[10px] font-black text-gray-400 bg-gray-50 px-4 py-1.5 rounded-full border border-gray-100">{history.length} Sessions Marked</span>
        </div>
        
        <div className="space-y-4">
          {history.length === 0 ? (
            <div className="py-20 text-center border-4 border-dashed border-gray-50 rounded-[2.5rem]">
              <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">No activity detected.</p>
            </div>
          ) : (
            history.map(record => (
              <div key={record.id} className="p-6 bg-gray-50/30 border border-gray-100 rounded-3xl flex items-center justify-between hover:bg-white hover:shadow-xl hover:shadow-indigo-50/50 transition-all cursor-default group">
                <div>
                  <h4 className="font-black text-indigo-900 text-lg uppercase tracking-tight">{record.subject}</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">{record.date} • {new Date(record.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                </div>
                <div className="bg-emerald-50 text-emerald-600 px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-100 flex items-center gap-3">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  Verified
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
