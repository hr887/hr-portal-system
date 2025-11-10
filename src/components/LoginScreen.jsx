// src/components/LoginScreen.jsx
import React, { useState } from 'react';
import { handleLogin } from '../firebase/auth.js';
import { Eye, EyeOff, Building2 } from 'lucide-react';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await handleLogin(email, password);
      // 'onAuthStateChanged' in App.jsx will handle the rest
    } catch (err) {
      setError(err.message);
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
          
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Sign In</h2>
          <p className="text-gray-600 mb-8">Welcome back! Please enter your details.</p>

          <form id="login-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label 
                htmlFor="login-email" 
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email Address
              </label>
              <input
                type="email"
                id="login-email"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="you@company.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div>
              <label 
                htmlFor="login-password" 
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="login-password"
                  className="w-full p-3 border border-gray-300 rounded-lg pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  id="password-toggle-btn"
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            
            {error && (
              <div id="login-error" className="text-sm text-red-600 p-3 bg-red-50 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              id="login-btn"
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 shadow-blue-200 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none disabled:shadow-none"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>

      {/* Right Side (Image) */}
      <div className="hidden lg:block w-1/2 bg-gray-100 p-8">
        <div 
          className="w-full h-full rounded-2xl bg-cover bg-center"
          style={{ backgroundImage: "url('https://placehold.co/1000x1200/3b82f6/ffffff?text=HR+Portal&font=inter')" }}
        >
          {/* This is a placeholder image */}
        </div>
      </div>
    </div>
  );
}
