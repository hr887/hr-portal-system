import React from 'react';
import { FileSignature, Zap, Grid3x3, Code2 } from 'lucide-react';

export function ESignatureAnimation() {
  return (
    <div className="space-y-8 max-w-4xl">
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h2 className="text-xl font-bold text-gray-900">E-Signature Documents</h2>
        <p className="text-sm text-gray-500 mt-1">Manage your custom hiring documents.</p>
      </div>

      <div className="relative bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-xl overflow-hidden p-16">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Floating spheres */}
          <div className="absolute top-10 left-10 w-32 h-32 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" 
               style={{ animation: 'float 8s ease-in-out infinite' }} />
          <div className="absolute bottom-10 right-10 w-32 h-32 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" 
               style={{ animation: 'float 10s ease-in-out infinite 1s' }} />
          <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" 
               style={{ animation: 'float 12s ease-in-out infinite 2s' }} />
        </div>

        {/* Main content */}
        <div className="relative z-10 text-center">
          {/* Animated icon container */}
          <div className="flex justify-center gap-4 mb-8">
            <div className="relative">
              <FileSignature size={40} className="text-emerald-500 animate-bounce" style={{ animationDelay: '0s' }} />
            </div>
            <div className="relative">
              <Grid3x3 size={40} className="text-blue-500 animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
            <div className="relative">
              <Zap size={40} className="text-purple-500 animate-bounce" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>

          {/* Animated title */}
          <div className="mb-4">
            <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 animate-pulse">
              Under Development
            </h3>
          </div>

          {/* Description */}
          <p className="text-gray-700 font-medium mb-2">
            We're building e-signature document management for you
          </p>
          <p className="text-gray-600 text-sm mb-8">
            Custom document templates and e-signature capabilities coming soon
          </p>

          {/* Animated progress bar */}
          <div className="flex justify-center gap-2 mb-8">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            {[
              { icon: FileSignature, label: 'E-Signatures', delay: '0s' },
              { icon: Code2, label: 'Custom Templates', delay: '0.2s' },
              { icon: Zap, label: 'Quick Upload', delay: '0.4s' },
            ].map(({ icon: Icon, label, delay }, idx) => (
              <div
                key={idx}
                className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all"
                style={{
                  animation: `slideIn 0.6s ease-out forwards`,
                  animationDelay: delay,
                  opacity: 0,
                }}
              >
                <Icon size={24} className="text-emerald-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-gray-700">{label}</p>
              </div>
            ))}
          </div>

          {/* Status indicator */}
          <div className="flex items-center justify-center gap-2 mt-8 text-sm text-gray-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Team is actively working on this</span>
          </div>
        </div>

        {/* CSS Animations */}
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
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
