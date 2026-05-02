import React, { useState } from 'react';
import { auth, hasFirebaseConfig } from '../firebase';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { Lock, Mail, AlertCircle, Loader2, Key } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // If Firebase is not configured yet, show the setup instructions instead of the login form
  if (!hasFirebaseConfig) {
    return (
      <div className="min-h-screen bg-[var(--apple-gray-1)] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
        <div className="sm:mx-auto sm:w-full sm:max-w-xl">
          <div className="bg-white py-10 px-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl border border-[var(--apple-gray-2)]">
            <div className="w-16 h-16 bg-[var(--apple-gray-1)] rounded-2xl flex items-center justify-center mb-6">
              <Key size={32} className="text-[var(--apple-black)]" />
            </div>
            <h2 className="text-[24px] font-semibold tracking-tight text-[var(--apple-black)] mb-4">
              Firebase Configuration Required
            </h2>
            <p className="text-[15px] text-[var(--apple-gray-5)] mb-6 leading-relaxed">
              To secure your quotation builder, you need to connect it to your free Firebase project. Follow these steps:
            </p>
            <ol className="list-decimal pl-5 space-y-3 text-[14px] text-[var(--apple-black)] mb-8">
              <li>Go to <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">console.firebase.google.com</a> and click "Create a project".</li>
              <li>Once created, click the <strong>Web icon (&lt;/&gt;)</strong> to register an app.</li>
              <li>Copy the `firebaseConfig` block it gives you.</li>
              <li>Create a `.env.local` file in the root of this project and paste your keys like this:</li>
            </ol>
            <div className="bg-[var(--apple-gray-1)] p-4 rounded-xl font-mono text-[13px] text-[var(--apple-gray-6)] mb-6 overflow-x-auto">
              VITE_FIREBASE_API_KEY=your_api_key<br/>
              VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com<br/>
              VITE_FIREBASE_PROJECT_ID=your_project_id<br/>
              VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com<br/>
              VITE_FIREBASE_MESSAGING_SENDER_ID=123456789<br/>
              VITE_FIREBASE_APP_ID=1:12345:web:abcde
            </div>
            <p className="text-[14px] text-[var(--apple-gray-5)]">
              Restart your development server (`npm run dev`) after adding the `.env.local` file.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
      setError('Google sign-in failed. Please ensure it is enabled in your Firebase console.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Let App.jsx handle the auth state change natively via onAuthStateChanged
    } catch (err) {
      console.error(err);
      setError('Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--apple-gray-1)] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="w-20 h-20 bg-white shadow-sm rounded-3xl flex items-center justify-center mx-auto mb-6">
          <img src="/logo.png" alt="Logo" className="w-14 h-14 object-contain" />
        </div>
        <h2 className="text-center text-[28px] font-semibold tracking-tight text-[var(--apple-black)] mb-2">
          Sign in to your account
        </h2>
        <p className="text-center text-[15px] text-[var(--apple-gray-5)]">
          SRR Quotation Builder
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-[400px]">
        <div className="bg-white py-10 px-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl border border-[var(--apple-gray-2)]">
          <form className="space-y-6" onSubmit={handleLogin}>
            
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-start gap-3 text-[14px] leading-snug">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 border border-[var(--apple-gray-3)] rounded-2xl text-[15px] font-medium text-[var(--apple-black)] bg-white hover:bg-[var(--apple-gray-1)] transition-colors"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              Continue with Google
            </button>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-[var(--apple-gray-2)]"></div>
              <span className="flex-shrink-0 mx-4 text-[var(--apple-gray-5)] text-[13px]">Or continue with email</span>
              <div className="flex-grow border-t border-[var(--apple-gray-2)]"></div>
            </div>

            <div>
              <label className="apple-label block mb-2">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-[var(--apple-gray-4)]" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="apple-input !pl-11 w-full"
                  placeholder="admin@example.com"
                />
              </div>
            </div>

            <div>
              <label className="apple-label block mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-[var(--apple-gray-4)]" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="apple-input !pl-11 w-full"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full py-3.5 text-[15px] flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
