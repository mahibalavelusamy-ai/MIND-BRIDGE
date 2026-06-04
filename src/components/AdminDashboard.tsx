import React, { useState, useEffect } from 'react';
import { db, collection, getDocs } from '../lib/firebase';
import { Users, Shield, Clock, Search, BookOpen, Activity, AlertCircle } from 'lucide-react';

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const usersData = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Let's also fetch students if needed, but the prompt says 
        // "see all those fellas who logs in this web" which implies 'users' collection.
        setUsers(usersData);
      } catch (error) {
        console.error("Error fetching users for admin:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(u => 
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.role || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in p-6 lg:p-8 overflow-y-auto text-text-main pb-24 lg:pb-8">
      <div className="bg-[#0F172A] border border-white/5 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="relative z-10 flex items-center gap-6">
          <div className="hidden sm:flex w-16 h-16 rounded-[1.5rem] bg-amber-500/20 border border-amber-500/30 items-center justify-center text-amber-500 text-3xl shadow-[0_0_30px_rgba(245,158,11,0.2)]">
            <Shield size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold font-serif flex items-center gap-2 mb-2 text-white drop-shadow-md">
              Admin Portal
            </h1>
            <p className="text-slate-400 max-w-xl">
              System overview. You have god-mode access to view all registered accounts.
            </p>
          </div>
        </div>

        <div className="relative z-10 w-full md:w-72 mt-4 md:mt-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="text-slate-500" size={16} />
          </div>
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#020617] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:border-amber-500 focus:outline-none transition-all shadow-inner text-white placeholder-slate-500 focus:ring-1 focus:ring-amber-500/50"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
        <div className="bg-[#020617] p-6 rounded-2xl border border-white/5 flex items-center gap-4 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center">
            <Users size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Total Users</p>
            <p className="text-2xl font-bold text-white">{users.length}</p>
          </div>
        </div>
        <div className="bg-[#020617] p-6 rounded-2xl border border-white/5 flex items-center gap-4 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-500 flex items-center justify-center">
            <BookOpen size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Students</p>
            <p className="text-2xl font-bold text-white">{users.filter(u => u.role === 'student').length}</p>
          </div>
        </div>
        <div className="bg-[#020617] p-6 rounded-2xl border border-white/5 flex items-center gap-4 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
            <Activity size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Caretakers</p>
            <p className="text-2xl font-bold text-white">{users.filter(u => u.role === 'caretaker').length}</p>
          </div>
        </div>
      </div>

      <div className="bg-[#0F172A] border border-white/5 rounded-3xl p-6 lg:p-8 flex-1 min-h-[400px] shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center gap-3 mb-6 shrink-0">
          <Clock className="text-amber-500" size={20} />
          <h2 className="text-lg font-bold text-white">Registered Accounts Directory</h2>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-500">
            <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
            <p className="text-sm font-bold tracking-widest uppercase">Fetching Network Data...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-500 bg-[#020617] rounded-[2rem] border border-white/5 border-dashed m-4">
            <AlertCircle size={32} className="opacity-50" />
            <p className="text-sm font-bold tracking-widest uppercase">No Users Found</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto rounded-2xl border border-white/5 bg-[#020617]">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#0F172A] sticky top-0 z-10 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-xs">Role</th>
                  <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-xs">User ID / Email</th>
                  <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-xs">Name</th>
                  <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-xs">Registered At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((u, i) => (
                  <tr key={u.id || i} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        u.role === 'student' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 
                        u.role === 'caretaker' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                        'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        {u.role ? u.role.toUpperCase() : 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">{u.email || 'No Email'}</span>
                        <span className="text-[10px] text-slate-500 font-mono mt-1">{u.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className="text-slate-300 font-medium">{u.name || (u.email ? u.email.split('@')[0] : 'Unknown')}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-400">
                        {u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString() : 'Unknown'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
