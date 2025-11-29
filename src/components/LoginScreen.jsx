// src/components/LoginScreen.jsx
import React, { useState } from 'react';
import { handleLogin } from '../firebase/auth.js';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { Eye, EyeOff, Building2, ArrowRight, Mail, Lock, ChevronLeft, Truck, ShieldCheck, BarChart3 } from 'lucide-react';

export function LoginScreen() {
  const [view, setView] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      if (view === 'login') {
        await handleLogin(email, password);
        // Force reload to sync auth state
        window.location.reload();
      } else {
        const auth = getAuth();
        await sendPasswordResetEmail(auth, email);
        setSuccessMsg(`Password reset link sent to ${email}. Check your inbox.`);
        setLoading(false);
        setTimeout(() => setView('login'), 5000);
      }
    } catch (err) {
      console.error("Login Error:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-white overflow-hidden font-sans text-slate-900">
      {/* Inject custom animation styles directly for this page */}
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
      `}</style>

      {/* --- LEFT SIDE: FORM --- */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-16 z-20 bg-white">
        <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-left-8 duration-700">

          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-6">
               <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-blue-200 shadow-lg">
                  <Building2 size={24} />
               </div>
               <span className="text-2xl font-bold tracking-tight text-slate-900">HR Portal</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              {view === 'login' ? 'Welcome back' : 'Reset password'}
            </h1>
            <p className="text-slate-500">
              {view === 'login' 
                ? 'Please enter your details to sign in.' 
                : 'Enter your email to receive a recovery link.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

            <div className="space-y-1">
              <label className="block text-sm font-semibold text-slate-700">Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all shadow-sm"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {view === 'login' && (
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-semibold text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={() => { setView('forgot'); setError(''); }}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="block w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all shadow-sm"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            )}

            {/* Messages */}
            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top-2">
                <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-red-600"></span>
                {error}
              </div>
            )}
            {successMsg && (
              <div className="p-4 rounded-xl bg-green-50 border border-green-100 text-green-700 text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top-2">
                <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-green-600"></span>
                {successMsg}
              </div>
            )}

            {/* Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {view === 'login' ? 'Sign In' : 'Send Reset Link'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            {view === 'forgot' && (
              <button
                type="button"
                onClick={() => { setView('login'); setError(''); }}
                className="w-full py-3 text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center justify-center gap-2 transition-colors"
              >
                <ChevronLeft size={16} /> Back to Sign In
              </button>
            )}
          </form>

          {/* Footer */}
          <div className="pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              Protected by enterprise-grade security. <br/>
              © {new Date().getFullYear()} SafeHaul Systems.
            </p>
          </div>
        </div>
      </div>

      {/* --- RIGHT SIDE: VISUALS WITH ANIMATIONS --- */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 items-center justify-center overflow-hidden">

        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Floating spheres */}
          <div className="absolute top-10 left-10 w-40 h-40 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse" 
               style={{ animation: 'float 8s ease-in-out infinite' }} />
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse" 
               style={{ animation: 'float 10s ease-in-out infinite 1s' }} />
          <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse" 
               style={{ animation: 'float 12s ease-in-out infinite 2s' }} />
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 p-12 max-w-lg text-center">
           {/* Animated icon container */}
           <div className="flex justify-center gap-4 mb-8">
              <div className="relative">
                 <Truck size={40} className="text-blue-300 animate-bounce" style={{ animationDelay: '0s' }} />
              </div>
              <div className="relative">
                 <BarChart3 size={40} className="text-indigo-300 animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
              <div className="relative">
                 <ShieldCheck size={40} className="text-purple-300 animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
           </div>

           {/* Animated title */}
           <h2 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200 mb-4 leading-tight animate-pulse">
             Streamline your Driver Recruitment
           </h2>

           {/* Description */}
           <p className="text-slate-200 text-lg mb-2 font-medium">
             Manage applications, track performance, and onboard drivers faster
           </p>
           <p className="text-slate-300 text-sm mb-8">
             with our all-in-one HR platform
           </p>

           {/* Animated progress bar */}
           <div className="flex justify-center gap-2 mb-8">
              <div className="flex gap-1">
                 {[...Array(5)].map((_, i) => (
                    <div
                       key={i}
                       className="h-1 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"
                       style={{
                          width: '16px',
                          animation: `loading 1.5s ease-in-out infinite`,
                          animationDelay: `${i * 0.2}s`,
                       }}
                    />
                 ))}
              </div>
           </div>

           {/* Feature cards animation */}
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8">
              {[
                 { icon: Truck, label: 'Driver Management', delay: '0s' },
                 { icon: BarChart3, label: 'Performance Tracking', delay: '0.2s' },
                 { icon: ShieldCheck, label: 'Secure & Reliable', delay: '0.4s' },
              ].map(({ icon: Icon, label, delay }, idx) => (
                 <div
                    key={idx}
                    className="bg-white/5 border border-white/10 rounded-lg p-3 shadow-sm backdrop-blur-sm hover:bg-white/10 transition-all"
                    style={{
                       animation: `slideIn 0.6s ease-out forwards`,
                       animationDelay: delay,
                       opacity: 0,
                    }}
                 >
                    <Icon size={20} className="text-blue-300 mx-auto mb-1" />
                    <p className="text-xs font-semibold text-slate-200">{label}</p>
                 </div>
              ))}
           </div>

           {/* Status indicator */}
           <div className="flex items-center justify-center gap-2 mt-8 text-sm text-slate-300">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span>Ready to onboard</span>
           </div>
        </div>

        {/* CSS Animations */}
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-30px); }
          }
          
          @keyframes loading {
            0%, 100% { opacity: 0.3; transform: scaleY(1); }
            50% { opacity: 1; transform: scaleY(1.5); }
          }
          
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>

      </div>
    </div>
  );
}