
import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole, AttendanceRecord, Period } from '../types';
import { storage } from '../services/storageService';

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [allPeriods, setAllPeriods] = useState<Period[]>([]);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [viewingPeriod, setViewingPeriod] = useState<Period | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LINKED' | 'UNLOCKED'>('ALL');

  useEffect(() => {
    setUsers(storage.getUsers());
    setAllPeriods(storage.getPeriods());
    setAllAttendance(storage.getAttendance());
  }, []);

  const totalSessions = allPeriods.length;

  // Filtered User Logic
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.admissionNumber && user.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.staffId && user.staffId.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
      
      const matchesStatus = statusFilter === 'ALL' || (
        statusFilter === 'LINKED' ? !!user.deviceFingerprint : !user.deviceFingerprint
      );

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  const handleResetDevice = (id: string) => {
    const updated = users.map(u => u.id === id ? { ...u, deviceFingerprint: undefined } : u);
    storage.saveUsers(updated);
    setUsers(updated);
    alert('Device link successfully severed.');
  };

  const handleDeleteUser = (id: string) => {
    if (confirm('Permanently redact this account and all associated data?')) {
      const updated = users.filter(u => u.id !== id);
      storage.saveUsers(updated);
      setUsers(updated);
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredUsers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = () => {
    if (confirm(`Authorize mass deletion of ${selectedIds.size} user accounts?`)) {
      const updated = users.filter(u => !selectedIds.has(u.id));
      storage.saveUsers(updated);
      setUsers(updated);
      setSelectedIds(new Set());
    }
  };

  const handleBulkResetDevice = () => {
    const updated = users.map(u => selectedIds.has(u.id) ? { ...u, deviceFingerprint: undefined } : u);
    storage.saveUsers(updated);
    setUsers(updated);
    alert(`Redacted device links for ${selectedIds.size} users.`);
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-8">
      {/* Search and Filters Header */}
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex-1 max-w-md relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input 
              type="text" 
              placeholder="Search by Name, Email or ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition font-medium text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-col">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Role Filter</label>
              <select 
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-700 focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="ALL">All Roles</option>
                <option value={UserRole.STUDENT}>Students</option>
                <option value={UserRole.STAFF}>Academic Staff</option>
                <option value={UserRole.ADMIN}>Administrators</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Binding Status</label>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-700 focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="ALL">All Statuses</option>
                <option value="LINKED">Secure-Link</option>
                <option value="UNLOCKED">Unlocked Only</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm overflow-hidden relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Registry Database</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Viewing {filteredUsers.length} of {users.length} Records</p>
          </div>
          
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-4 bg-indigo-50 px-5 py-2.5 rounded-2xl border border-indigo-100 animate-in fade-in slide-in-from-right-8 duration-500">
              <span className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">{selectedIds.size} Selected</span>
              <div className="h-4 w-px bg-indigo-200"></div>
              <button onClick={handleBulkResetDevice} className="text-[10px] font-black uppercase tracking-widest text-indigo-700 hover:underline">Reset Bindings</button>
              <button onClick={handleBulkDelete} className="text-[10px] font-black uppercase tracking-widest text-rose-600 hover:underline">Redact All</button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto -mx-8">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-y border-gray-100 text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">
              <tr>
                <th className="p-6 w-10">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded-lg accent-indigo-600 cursor-pointer"
                    checked={filteredUsers.length > 0 && selectedIds.size === filteredUsers.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="p-6">Authority / Student</th>
                <th className="p-6 text-center">Score</th>
                <th className="p-6 text-center">Status</th>
                <th className="p-6 text-right">Commands</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                      <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">No matching users found.</p>
                      <button 
                        onClick={() => {setSearchQuery(''); setRoleFilter('ALL'); setStatusFilter('ALL');}}
                        className="mt-4 text-indigo-600 font-bold text-xs uppercase tracking-widest hover:underline"
                      >
                        Clear all filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.map(user => {
                const presence = allAttendance.filter(a => a.studentId === user.id).length;
                const absence = Math.max(0, totalSessions - presence);
                const isSelected = selectedIds.has(user.id);
                return (
                  <tr key={user.id} className={`transition-all group ${isSelected ? 'bg-indigo-50/50' : 'hover:bg-gray-50/50'}`}>
                    <td className="p-6">
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 rounded-lg accent-indigo-600 cursor-pointer"
                        checked={isSelected}
                        onChange={() => toggleSelect(user.id)}
                      />
                    </td>
                    <td className="p-6 font-black text-gray-900 text-sm">
                      {user.fullName}
                      <br/>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {user.role} • {user.admissionNumber || user.staffId || 'ADMIN'}
                      </span>
                    </td>
                    <td className="p-6 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-black text-indigo-600">P: {presence}</span>
                        <span className="text-[9px] font-bold text-rose-400">A: {absence}</span>
                      </div>
                    </td>
                    <td className="p-6 text-center">
                      {user.role === UserRole.STUDENT && (
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${user.deviceFingerprint ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-300 border-gray-100'}`}>
                          {user.deviceFingerprint ? 'Secure-Link' : 'Unlocked'}
                        </span>
                      )}
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                        {user.role === UserRole.STUDENT && user.deviceFingerprint && (
                          <button onClick={() => handleResetDevice(user.id)} className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800">Reset</button>
                        )}
                        <button onClick={() => handleDeleteUser(user.id)} className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-700">Redact</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase tracking-tight mb-8">System Pulse</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {allPeriods.length === 0 ? (
            <div className="col-span-full py-20 text-center text-gray-300 italic font-medium border-2 border-dashed border-gray-50 rounded-3xl">Infrastructure idle. No active periods.</div>
          ) : (
            allPeriods.map(p => (
              <div key={p.id} className="p-6 border border-gray-100 rounded-3xl bg-gray-50 hover:bg-white hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-50 transition-all group cursor-pointer" onClick={() => setViewingPeriod(p)}>
                <div className="flex justify-between items-start mb-6">
                  <h4 className="font-black text-gray-900 uppercase tracking-tight group-hover:text-indigo-600 transition-all">{p.subject}</h4>
                  <span className="bg-white border border-gray-100 px-3 py-1 rounded-xl text-[9px] font-black text-indigo-400 uppercase">{allAttendance.filter(a => a.periodId === p.id).length} Marks</span>
                </div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] space-y-2">
                  <p className="flex items-center gap-2"><span className="w-1 h-1 bg-gray-300 rounded-full"></span> {p.date}</p>
                  <p className="flex items-center gap-2"><span className="w-1 h-1 bg-gray-300 rounded-full"></span> {p.day} @ {p.time}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {viewingPeriod && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-md flex items-center justify-center p-6 z-50">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[85vh] overflow-hidden border border-white">
             <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                <div>
                  <h3 className="font-black text-gray-900 text-2xl uppercase tracking-tight">{viewingPeriod.subject}</h3>
                  <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.3em] mt-1">Attendance Verification Protocol</p>
                </div>
                <button onClick={() => setViewingPeriod(null)} className="w-12 h-12 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 text-3xl transition-all">&times;</button>
             </div>
             <div className="p-8 overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                    <tr><th className="p-4">Participant</th><th className="p-4">Admission ID</th><th className="p-4 text-right">Verification</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {allAttendance.filter(a => a.periodId === viewingPeriod.id).map(r => {
                      const student = users.find(u => u.id === r.studentId);
                      return (
                        <tr key={r.id} className="text-sm font-medium text-gray-700">
                          <td className="p-4 font-black text-gray-900">{student?.fullName || 'REDACTED'}</td>
                          <td className="p-4 font-mono text-xs text-gray-400">{student?.admissionNumber || '----'}</td>
                          <td className="p-4 text-right text-[10px] font-black text-emerald-500 uppercase tracking-widest">{new Date(r.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
