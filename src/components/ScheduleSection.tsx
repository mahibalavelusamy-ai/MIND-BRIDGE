import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  writeBatch, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Plus, Trash2, Calendar, Clock, MapPin, X, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ScheduleItem {
  id: string;
  subject: string;
  day: string;
  startTime: string;
  endTime: string;
  room: string;
  color: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function ScheduleSection({ childId }: { childId: string }) {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    subject: '',
    day: DAYS[new Date().getDay() - 1] || 'Monday',
    startTime: '09:00',
    endTime: '10:30',
    room: ''
  });

  // 1. Initial Data Fetch & Automatic Seeding
  useEffect(() => {
    const q = query(collection(db, 'children', childId, 'schedules'));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduleItem));
      
      // Seed data if empty
      if (items.length === 0 && loading) {
        await seedDefaultSchedule();
      }
      
      setSchedules(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [childId]);

  const seedDefaultSchedule = async () => {
    const batch = writeBatch(db);
    const seedData = [
      { subject: 'Math', day: 'Monday', startTime: '09:00', endTime: '10:30', room: 'Room 101', color: 'bg-blue-500/20' },
      { subject: 'Data Science', day: 'Tuesday', startTime: '09:00', endTime: '10:30', room: 'Lab B', color: 'bg-green-500/20' },
      { subject: 'Digital Marketing', day: 'Wednesday', startTime: '11:00', endTime: '12:30', room: 'Room 302', color: 'bg-purple-500/20' },
      { subject: 'Arts', day: 'Thursday', startTime: '12:00', endTime: '13:30', room: 'Studio A', color: 'bg-pink-500/20' },
      { subject: 'Computer Science', day: 'Friday', startTime: '10:00', endTime: '11:30', room: 'Tech Hub', color: 'bg-indigo-500/20' },
    ];

    seedData.forEach(item => {
      const docRef = doc(collection(db, 'children', childId, 'schedules'));
      batch.set(docRef, { ...item, createdAt: serverTimestamp() });
    });

    await batch.commit();
  };

  // 2. Add Class with Deduplication
  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isDuplicate = schedules.some(s => 
      s.day === formData.day && s.startTime === formData.startTime && s.subject === formData.subject
    );

    if (isDuplicate) {
      alert("⚠️ This class is already in your schedule!");
      return;
    }

    try {
      await addDoc(collection(db, 'children', childId, 'schedules'), {
        ...formData,
        color: 'bg-indigo-500/20',
        createdAt: serverTimestamp()
      });
      setShowModal(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error("Error adding class:", error);
    }
  };

  const deleteClass = async (id: string) => {
    await deleteDoc(doc(db, 'children', childId, 'schedules', id));
  };

  return (
    <div className="relative min-h-[400px] p-6 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Calendar className="text-indigo-400" /> Weekly Schedule
        </h2>
      </div>

      {/* 5-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {DAYS.map(day => (
          <div key={day} className="space-y-4">
            <h3 className="text-center text-sm font-semibold text-gray-400 uppercase tracking-widest">{day}</h3>
            <div className="space-y-3">
              <AnimatePresence>
                {schedules.filter(s => s.day === day).map(item => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`${item.color || 'bg-white/10'} p-4 rounded-2xl border border-white/10 backdrop-blur-sm group relative`}
                  >
                    <button 
                      onClick={() => deleteClass(item.id)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:bg-red-500/20 rounded-lg transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                    <p className="font-bold text-white text-sm">{item.subject}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-300 mt-2">
                      <Clock size={12} /> {item.startTime} - {item.endTime}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                      <MapPin size={12} /> {item.room}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-10 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.5)] hover:scale-110 active:scale-95 transition-all flex items-center justify-center z-50 group"
      >
        <Plus size={32} className="group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* Add Class Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl">
            <motion.form 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onSubmit={handleAddClass}
              className="bg-gray-900 border border-white/20 p-8 rounded-[2rem] w-full max-w-md shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Add New Class</h3>
                <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><X /></button>
              </div>
              
              <div className="space-y-4">
                <input 
                  placeholder="Subject Name" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-indigo-500"
                  required
                  onChange={e => setFormData({...formData, subject: e.target.value})}
                />
                <select 
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-indigo-500"
                  value={formData.day}
                  onChange={e => setFormData({...formData, day: e.target.value})}
                >
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-4">
                  <input type="time" className="bg-white/5 border border-white/10 rounded-xl p-3 text-white" onChange={e => setFormData({...formData, startTime: e.target.value})} />
                  <input type="time" className="bg-white/5 border border-white/10 rounded-xl p-3 text-white" onChange={e => setFormData({...formData, endTime: e.target.value})} />
                </div>
                <input 
                  placeholder="Room/Location" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-indigo-500"
                  onChange={e => setFormData({...formData, room: e.target.value})}
                />
                <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-500 transition-colors mt-4 shadow-lg shadow-indigo-600/20">
                  Add to Schedule
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* Success Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            className="fixed bottom-10 right-10 bg-green-500 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 z-[110]"
          >
            <CheckCircle size={20} />
            <span className="font-bold">Class Added Successfully!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}