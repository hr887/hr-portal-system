// src/components/LoginScreen.jsx
import React, { useState } from 'react';
import { handleLogin } from '../firebase/auth.js';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { Eye, EyeOff, Building2, ArrowRight, Mail, Lock, ChevronLeft } from 'lucide-react';

export function LoginScreen() {
  const [view, setView] = useState('login'); // 'login' or 'forgot'
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
        // App.jsx handles the redirect upon auth state change
      } else {
        // Forgot Password Logic
        const auth = getAuth();
        await sendPasswordResetEmail(auth, email);
        setSuccessMsg(`Password reset link sent to ${email}. Check your inbox.`);
        setTimeout(() => setView('login'), 3000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login-container" className="min-h-screen flex bg-gray-50">
      {/* Left Side (Form) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-blue-600 rounded-lg text-white">
              <Building2 size={24} />
            </div>
            <span className="text-2xl font-bold text-gray-900">HR Portal</span>
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {view === 'login' ? 'Sign In' : 'Reset Password'}
          </h2>
          <p className="text-gray-600 mb-8">
            {view === 'login' 
              ? 'Welcome back! Please enter your details.' 
              : 'Enter your email to receive a reset link.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="admin@company.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            
            {view === 'login' && (
              <div>
                <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <button 
                        type="button"
                        onClick={() => { setView('forgot'); setError(''); }}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                        Forgot password?
                    </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="w-full pl-10 p-3 border border-gray-300 rounded-lg pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            )}
            
            {error && (
              <div className="text-sm text-red-600 p-3 bg-red-50 rounded-lg border border-red-200">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="text-sm text-green-600 p-3 bg-green-50 rounded-lg border border-green-200">
                {successMsg}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : (
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
                    className="w-full text-center text-sm text-gray-500 hover:text-gray-900 flex items-center justify-center gap-1"
                >
                    <ChevronLeft size={16} /> Back to Sign In
                </button>
            )}
          </form>
        </div>
      </div>

      {/* Right Side (Image) */}
      <div className="hidden lg:block w-1/2 bg-gray-100 p-8">
        <div 
          className="w-full h-full rounded-2xl bg-cover bg-center shadow-inner"
          style={{ backgroundImage: "url('https://placehold.co/1000x1200/2563eb/ffffff?text=HR+Management+Portal&font=inter')" }}
        ></div>
      </div>
    </div>
  );
}