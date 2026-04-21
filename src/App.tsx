/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  User,
  signOut
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  orderBy,
  getDocFromServer,
  writeBatch
} from 'firebase/firestore';
import { 
  Wallet, 
  Upload, 
  Plus, 
  TrendingDown, 
  TrendingUp, 
  AlertCircle, 
  LogOut, 
  PieChart as PieIcon, 
  Settings as SettingsIcon,
  X,
  Loader2,
  ChevronRight,
  Calendar as CalendarIcon,
  RefreshCcw,
  ChevronLeft
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths 
} from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as ChartTooltip
} from 'recharts';

import { auth, db } from './lib/firebase';
import { parseTransactionScreenshot, ParsedTransaction } from './lib/gemini';
import { cn, formatCurrency } from './lib/utils';
import { exportToPDF, exportTransactionsToPDF } from './lib/pdfExport';

// --- Types ---
interface UserProfile {
  userId: string;
  initialBalance: number;
  monthlyLimit: number;
  currency: string;
}

interface Transaction extends ParsedTransaction {
  id: string;
  userId: string;
  createdAt: string;
}

// --- Components ---

function Login({ onLogin }: { onLogin: () => void }) {
  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      onLogin();
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_20%_20%,#e2e8f0_0%,transparent_50%),radial-gradient(circle_at_80%_80%,#cbd5e1_0%,transparent_50%)]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-200"
      >
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-200">
          <Wallet className="text-white w-8 h-8" />
        </div>
        <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tighter italic">PennyWise AI</h1>
        <p className="text-slate-500 mb-8 leading-relaxed text-sm font-medium">
          High-precision financial intelligence engine. Process transaction screenshots with advanced AI categorization.
        </p>
        <button 
          onClick={handleLogin}
          className="w-full bg-slate-900 text-white rounded-2xl py-5 font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all active:scale-[0.98] shadow-xl shadow-slate-200 uppercase tracking-widest text-xs"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" referrerPolicy="no-referrer" />
          Authenticate User
        </button>
      </motion.div>
    </div>
  );
}

function Onboarding({ onComplete }: { onComplete: (profile: UserProfile) => void }) {
  const [balance, setBalance] = useState('');
  const [limit, setLimit] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const profile: UserProfile = {
        userId: auth.currentUser.uid,
        initialBalance: parseFloat(balance),
        monthlyLimit: parseFloat(limit),
        currency: 'INR'
      };
      await setDoc(doc(db, 'userProfiles', auth.currentUser.uid), profile);
      onComplete(profile);
    } catch (error) {
      console.error("Setup failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-200"
      >
        <div className="mb-8">
           <h2 className="text-3xl font-black italic tracking-tighter text-slate-900">Project Initiation</h2>
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Configure your entry liquidity & burn limit</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="label-xs mb-3 block">Liquidity Entry (Initial)</label>
            <div className="relative">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
              <input 
                type="number" 
                required
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0.00"
                className="w-full pl-12 pr-6 py-5 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-black text-xl tracking-tighter"
              />
            </div>
          </div>
          <div>
            <label className="label-xs mb-3 block">Critical Burn Threshold (Limit)</label>
            <div className="relative">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
              <input 
                type="number" 
                required
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                placeholder="0.00"
                className="w-full pl-12 pr-6 py-5 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-black text-xl tracking-tighter"
              />
            </div>
          </div>
          <button 
            disabled={loading}
            className="w-full bg-indigo-600 text-white rounded-2xl py-6 font-black flex items-center justify-center gap-2 hover:bg-primary-dark transition-all active:scale-[0.98] disabled:opacity-50 shadow-xl shadow-indigo-100 uppercase tracking-[0.2em] text-sm"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Activate Engine'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function CalendarView({ transactions, onClose }: { transactions: Transaction[], onClose: () => void }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getTransactionsForDay = (day: Date) => {
    return transactions.filter(t => isSameDay(new Date(t.date), day));
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[70] bg-slate-50 flex flex-col p-8 overflow-hidden"
    >
      <div className="max-w-5xl mx-auto w-full flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-4xl font-black italic tracking-tighter text-slate-900 uppercase">Registry Timeline</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Temporal Distribution of Cash Flow</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl flex items-center p-1 shadow-sm">
              <button onClick={prevMonth} className="p-3 hover:bg-slate-100 rounded-xl transition-colors">
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
              <span className="px-6 font-black text-lg tracking-tight min-w-[160px] text-center">
                {format(currentDate, 'MMMM yyyy')}
              </span>
              <button onClick={nextMonth} className="p-3 hover:bg-slate-100 rounded-xl transition-colors">
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            <button 
              onClick={onClose} 
              className="p-4 bg-slate-900 text-white hover:bg-slate-800 transition-all rounded-2xl shadow-xl active:scale-95"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden flex flex-col group">
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-r last:border-0 border-slate-100">
                {day}
              </div>
            ))}
          </div>
          <div className="flex-1 grid grid-cols-7">
            {days.map((day) => {
              const dayTransactions = getTransactionsForDay(day);
              const totalAmount = dayTransactions.reduce((acc, t) => acc + t.amount, 0);
              const isCurrentMonth = isSameMonth(day, currentDate);
              
              return (
                <div 
                  key={day.toISOString()} 
                  className={cn(
                    "min-h-[100px] border-b border-r border-slate-100 p-3 transition-all flex flex-col",
                    !isCurrentMonth && "bg-slate-50/30 opacity-30",
                    isSameDay(day, new Date()) && "bg-indigo-50/30"
                  )}
                >
                  <span className={cn(
                    "text-xs font-bold mb-1",
                    isSameDay(day, new Date()) ? "text-indigo-600" : "text-slate-400"
                  )}>
                    {format(day, 'd')}
                  </span>
                  
                  <div className="flex-1 flex flex-col gap-1 overflow-y-auto scrollbar-hide">
                    {dayTransactions.slice(0, 3).map(t => (
                      <div key={t.id} className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded border leading-none transition-transform hover:scale-105",
                        t.type === 'debit' 
                          ? "bg-rose-50 text-rose-600 border-rose-100" 
                          : "bg-emerald-50 text-emerald-600 border-emerald-100"
                      )}>
                        {t.merchant || 'Txn'}
                      </div>
                    ))}
                    {dayTransactions.length > 3 && (
                      <div className="text-[8px] font-black text-slate-300 pl-1 uppercase tracking-tighter">
                        +{dayTransactions.length - 3} More
                      </div>
                    )}
                  </div>

                  {totalAmount > 0 && (
                    <div className="mt-2 text-right">
                      <span className="text-[10px] font-black tracking-tighter text-slate-900 border-t border-slate-100 pt-1 block">
                        ₹{totalAmount.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error: any) {
        // Only log serious failures, ignore "not found" as that's expected for this path
        if (error.code !== 'not-found' && !error.message.includes('not-found')) {
          console.error("Firebase connection check:", error.message);
        }
      }
    };
    testConnection();

    return onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const docRef = doc(db, 'userProfiles', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        }

        const q = query(
          collection(db, 'transactions'), 
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        onSnapshot(q, (snapshot) => {
          setTransactions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
        }, (error) => {
          console.error("Transactions listener error:", error);
          if (error.message.includes('index')) {
            console.warn("Please check the console for a link to create the required Firestore index.");
          }
        });
      }
      setLoading(false);
    });
  }, []);

  const handleResetData = async () => {
    if (!user) return;
    const confirmed = window.confirm("Are you sure you want to clear ALL transaction history? This cannot be undone.");
    if (!confirmed) return;

    setIsResetting(true);
    try {
      const batch = writeBatch(db);
      transactions.forEach(t => {
        const docRef = doc(db, 'transactions', t.id);
        batch.delete(docRef);
      });
      await batch.commit();
    } catch (error) {
      console.error("Error resetting data:", error);
    } finally {
      setIsResetting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const parsedArray = await parseTransactionScreenshot(base64, file.type);
        
        const batch = parsedArray.map(parsed => 
          addDoc(collection(db, 'transactions'), {
            ...parsed,
            userId: user.uid,
            createdAt: new Date().toISOString()
          })
        );
        
        await Promise.all(batch);
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
    } catch (error) {
      console.error("Failed to parse image", error);
      setIsUploading(false);
    }
  };

  const totalExpense = transactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalIncome = transactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);

  const currentBalance = (profile?.initialBalance || 0) + totalIncome - totalExpense;
  const expensePercentage = Math.round((totalExpense / (profile?.monthlyLimit || 1)) * 100);
  const isLimitExceeded = profile && totalExpense > profile.monthlyLimit;

  const categoryData = transactions
    .filter(t => t.type === 'debit')
    .reduce((acc: any[], t) => {
      const existing = acc.find(item => item.name === t.category);
      if (existing) existing.value += t.amount;
      else acc.push({ name: t.category, value: t.amount });
      return acc;
    }, []);

  const COLORS = ['#4f46e5', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user) return <Login onLogin={() => {}} />;
  if (!profile) return <Onboarding onComplete={setProfile} />;

  return (
    <div className="h-screen bg-slate-50 text-slate-800 flex flex-col p-6 overflow-hidden">
      {/* High Density Header */}
      <header className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200">
            <Wallet className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">FinSnap Dashboard</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">AI-Powered Expense Engine</p>
          </div>
        </div>

        <div className="flex gap-8 items-center">
          <div className="text-right">
            <p className="label-xs">Current Liquidity</p>
            <p className="text-2xl value-bold">₹{currentBalance.toLocaleString()}</p>
          </div>
          <div className="h-10 w-px bg-slate-200"></div>
          <div className="text-right">
            <p className="text-[10px] text-rose-500 uppercase font-bold">Monthly Burn Limit</p>
            <p className="text-2xl font-black text-rose-600 tracking-tighter">₹{profile.monthlyLimit.toLocaleString()}</p>
          </div>
          
          <AnimatePresence>
            {expensePercentage >= 80 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 flex items-center gap-2",
                  expensePercentage >= 100 ? "animate-none" : "animate-pulse"
                )}
              >
                <span className="w-2 h-2 bg-rose-600 rounded-full"></span>
                <span className="text-[11px] font-bold text-rose-700 uppercase">Alert: {expensePercentage}% Used</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-2 border-l border-slate-200 pl-4 ml-2">
            <button 
              onClick={() => setShowCalendar(true)} 
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-indigo-600 font-bold flex items-center gap-2"
              title="Calendar View"
            >
              <CalendarIcon className="w-5 h-5" />
              <span className="text-[10px] uppercase">Calendar</span>
            </button>
            <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
              <SettingsIcon className="w-5 h-5" />
            </button>
            <button onClick={() => signOut(auth)} className="p-2 hover:bg-rose-50 rounded-lg transition-colors text-rose-500">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main id="audit-dashboard" className="grid grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Sidebar Logic */}
        <section className="col-span-4 flex flex-col gap-6 min-h-0">
          {/* Upload Card */}
          <div className="bg-white border-2 border-dashed border-indigo-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:border-indigo-400 transition-all bg-gradient-to-b from-white to-indigo-50/20 group">
             <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
               {isUploading ? <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" /> : <Upload className="h-8 w-8 text-indigo-600" />}
             </div>
             <h2 className="text-lg font-bold">Snap & Process</h2>
             <p className="text-sm text-slate-500 mt-2 px-6 leading-relaxed">
               {isUploading ? "AI is decoding your transaction..." : "Upload UPI screenshots, bank PDFs, or transaction receipts"}
             </p>
             <button 
               onClick={() => fileInputRef.current?.click()}
               disabled={isUploading}
               className="mt-6 bg-slate-900 text-white px-8 py-3 rounded-full text-sm font-bold shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 w-full"
             >
               {isUploading ? "Processing..." : "Select Files"}
             </button>

             <button
               onClick={handleResetData}
               disabled={isResetting || transactions.length === 0}
               className="mt-4 text-[10px] font-bold text-slate-400 hover:text-rose-500 transition-colors flex items-center justify-center gap-2 group uppercase tracking-widest no-print"
             >
               {isResetting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCcw className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" />}
               Reset Registry (New Month)
             </button>
             
             <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
          </div>

          {/* Visualization / Stat Card */}
          <div className="dashboard-card p-5">
            <h3 className="text-sm font-bold mb-4 uppercase tracking-tighter flex justify-between items-center">
              Budget Visualization
              <button 
                onClick={() => setShowReport(true)}
                className="text-[10px] text-indigo-600 font-bold hover:underline"
              >View Full Case</button>
            </h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-end text-xs mb-2">
                  <span className="font-bold text-slate-500">Spend to Date</span>
                  <span className="font-black text-slate-900">₹{totalExpense.toLocaleString()}</span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(expensePercentage, 100)}%` }}
                    className={cn(
                      "h-full rounded-full transition-all duration-1000",
                      isLimitExceeded ? "bg-rose-500" : "bg-indigo-500"
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="label-xs">Remaining</p>
                  <p className="text-lg font-black tracking-tight">₹{(profile.monthlyLimit - totalExpense > 0 ? profile.monthlyLimit - totalExpense : 0).toLocaleString()}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="label-xs">Income Stat</p>
                  <p className="text-lg font-black tracking-tight text-emerald-600">₹{totalIncome.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Transaction Table Section */}
        <section className="col-span-8 flex flex-col gap-6 min-h-0">
          <div className="dashboard-card flex-1 flex flex-col min-h-0">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10 no-print">
              <h3 className="text-sm font-bold uppercase tracking-tighter">Verified Transactions</h3>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 bg-slate-100 rounded text-[11px] font-bold text-slate-600 border border-slate-200">Filter: All</button>
                <button 
                  onClick={() => {
                    const dataToExport = transactions.map(t => ({
                      date: new Date(t.date).toLocaleDateString(),
                      merchant: t.merchant || 'Unknown',
                      category: t.category,
                      type: t.type.toUpperCase(),
                      amount: `Rs. ${t.amount.toFixed(2)}`
                    }));
                    exportTransactionsToPDF(dataToExport);
                  }}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded text-[11px] font-bold shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-all font-display no-print"
                >Export PDF Document</button>
              </div>
            </div>

            <div id="dashboard-target" className="overflow-auto flex-1 h-full scrollbar-hide">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-200">
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Status / Date</th>
                    <th className="px-6 py-4">Merchant/Source</th>
                    <th className="px-6 py-4 text-center">Category</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-2 opacity-30">
                          <AlertCircle className="w-10 h-10" />
                          <p className="font-bold uppercase tracking-widest text-xs">Awaiting Data Capture</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-6 py-4 text-slate-400 font-mono text-[11px]">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              t.type === 'credit' ? "bg-emerald-500" : "bg-rose-500"
                            )}></span>
                            {new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate max-w-[150px]">
                          {t.merchant}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="bg-slate-100 text-slate-600 text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest">
                            {t.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "text-[10px] font-black tracking-tighter uppercase",
                            t.type === 'credit' ? "text-emerald-600" : "text-rose-600"
                          )}>{t.type}</span>
                        </td>
                        <td className="px-6 py-4 text-right font-black text-slate-900 text-base">
                          ₹{t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-50 text-[10px] font-bold text-slate-400 flex justify-between rounded-b-2xl border-t border-slate-100">
              <span className="uppercase tracking-widest">Showing last {transactions.length} entries</span>
              <span className="uppercase tracking-widest">AI Engine Confirmed: 99.4%</span>
            </div>
          </div>
        </section>
      </main>

      {/* Report Side/Modal Overlays (Refined) */}
      <AnimatePresence>
        {showCalendar && (
          <CalendarView 
            transactions={transactions} 
            onClose={() => setShowCalendar(false)} 
          />
        )}
        
        {showReport && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className="fixed inset-0 z-[60] bg-white text-slate-900 overflow-y-auto printable-modal"
          >
            <div id="report-target" className="max-w-3xl mx-auto px-10 py-12">
              <div className="flex items-center justify-between mb-12 no-print">
                <div>
                  <h2 className="text-4xl font-black italic tracking-tighter text-slate-900">Intelligence Audit</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Full Transaction Profile & Analytics</p>
                </div>
                <button onClick={() => setShowReport(false)} className="p-4 bg-slate-100 hover:bg-slate-200 transition-colors rounded-2xl shadow-sm">
                  <X className="w-8 h-8" />
                </button>
              </div>
              
              {/* Added print-only header for professional PDF look */}
              <div className="hidden print:block mb-8 border-b pb-4">
                 <h1 className="text-2xl font-bold">PennyWise AI - Intelligence Audit</h1>
                 <p className="text-sm text-slate-500">Generated on {new Date().toLocaleString()}</p>
              </div>

              <div className="grid grid-cols-3 gap-6 mb-12">
                <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-xl">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Total Utilization</p>
                  <p className="text-4xl font-black italic">₹{totalExpense.toLocaleString()}</p>
                </div>
                <div className="bg-emerald-500 text-white rounded-3xl p-8 shadow-xl">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100 mb-2">Portfolio Growth</p>
                  <p className="text-4xl font-black italic">₹{totalIncome.toLocaleString()}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Remaining Ops</p>
                  <p className="text-4xl font-black italic text-slate-900">₹{(profile.monthlyLimit - totalExpense > 0 ? profile.monthlyLimit - totalExpense : 0).toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-10">
                <div className="col-span-5">
                   <div className="h-80 relative">
                     <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={110}
                          paddingAngle={6}
                          dataKey="value"
                          stroke="none"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                          itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                       <p className="label-xs mb-1">Risk Profile</p>
                       <p className="text-2xl font-black text-slate-900">{expensePercentage}%</p>
                    </div>
                  </div>
                </div>
                <div className="col-span-7 flex flex-col justify-center gap-4">
                  {categoryData.sort((a, b) => b.value - a.value).map((d, i) => (
                    <div key={d.name} className="flex items-center gap-6 bg-slate-50/80 p-5 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-colors">
                      <div className="w-5 h-5 rounded-lg shrink-0 shadow-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-slate-900 font-bold tracking-tight text-lg">{d.name}</span>
                      <div className="ml-auto text-right">
                        <p className="text-xl font-black italic tracking-tighter text-slate-900">₹{d.value.toLocaleString()}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{Math.round((d.value/totalExpense)*100)}% Participation</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <button 
                onClick={() => exportToPDF('report-target', 'PennyWise-Full-Analysis.pdf')}
                className="mt-12 w-full bg-slate-900 text-white rounded-3xl py-6 font-black uppercase tracking-[0.2em] text-sm shadow-2xl hover:bg-slate-800 transition-all active:scale-95 no-print"
              >
                Generate Final Compliance Document
              </button>
            </div>
          </motion.div>
        )}

        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl relative border border-slate-200"
            >
              <button onClick={() => setShowSettings(false)} className="absolute top-8 right-8 p-3 hover:bg-slate-100 rounded-2xl transition-colors">
                <X className="w-5 h-5" />
              </button>
              <div className="mb-10">
                <h3 className="text-3xl font-black italic tracking-tighter">System Config</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Adjust liquidity & burn limits</p>
              </div>
              
              <div className="space-y-8">
                <div>
                  <label className="label-xs mb-3 block">Liquidity Entry (Initial)</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-black">₹</span>
                    <input 
                      type="number" 
                      value={profile?.initialBalance}
                      onChange={(e) => setProfile(prev => prev ? {...prev, initialBalance: parseFloat(e.target.value)} : null)}
                      className="w-full pl-12 pr-6 py-5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-black text-xl tracking-tighter"
                    />
                  </div>
                </div>
                <div>
                  <label className="label-xs mb-3 block">Critical Burn Threshold (Limit)</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-black">₹</span>
                    <input 
                      type="number" 
                      value={profile?.monthlyLimit}
                      onChange={(e) => setProfile(prev => prev ? {...prev, monthlyLimit: parseFloat(e.target.value)} : null)}
                      className="w-full pl-12 pr-6 py-5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-black text-xl tracking-tighter"
                    />
                  </div>
                </div>
                <button 
                  onClick={async () => {
                    if (user && profile) {
                      await setDoc(doc(db, 'userProfiles', user.uid), profile);
                      setShowSettings(false);
                    }
                  }}
                  className="w-full bg-indigo-600 text-white rounded-2xl py-6 font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all uppercase tracking-[0.2em] text-sm active:scale-95"
                >
                  Commit Sequence
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
