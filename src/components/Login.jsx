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
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
        {/* Floating Glowing Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="sm:mx-auto sm:w-full sm:max-w-xl relative z-10 px-4">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 py-10 px-8 shadow-2xl rounded-3xl text-white">
            <div className="w-16 h-16 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center mb-6">
              <Key size={32} className="text-emerald-400" />
            </div>
            <h2 className="text-[24px] font-bold tracking-tight text-white mb-4">
              Firebase Configuration Required
            </h2>
            <p className="text-[15px] text-slate-300 mb-6 leading-relaxed">
              To secure your quotation builder, you need to connect it to your Firebase project. Follow these steps:
            </p>
            <ol className="list-decimal pl-5 space-y-3 text-[14px] text-slate-300 mb-8">
              <li>Go to <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-emerald-400 font-bold hover:underline">console.firebase.google.com</a> and click "Create a project".</li>
              <li>Once created, click the <strong>Web icon (&lt;/&gt;)</strong> to register an app.</li>
              <li>Copy the `firebaseConfig` block it gives you.</li>
              <li>Create a `.env.local` file in the root of this project and paste your keys:</li>
            </ol>
            <div className="bg-black/40 border border-white/10 p-4 rounded-xl font-mono text-[13px] text-emerald-300 mb-6 overflow-x-auto">
              VITE_FIREBASE_API_KEY=your_api_key<br/>
              VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com<br/>
              VITE_FIREBASE_PROJECT_ID=your_project_id<br/>
              VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com<br/>
              VITE_FIREBASE_MESSAGING_SENDER_ID=123456789<br/>
              VITE_FIREBASE_APP_ID=1:12345:web:abcde
            </div>
            <p className="text-[14px] text-slate-400 italic">
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
    } catch (err) {
      console.error(err);
      setError('Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-955 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      {/* Dynamic Mesh Blur Backdrops */}
      <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[130px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[130px] pointer-events-none"></div>
      <div className="absolute top-[30%] right-[10%] w-[300px] h-[300px] bg-teal-500/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="w-20 h-20 bg-white/10 border border-white/20 shadow-2xl backdrop-blur-xl rounded-3xl flex items-center justify-center mx-auto mb-6">
          <img src="/logo.png" alt="Logo" className="w-14 h-14 object-contain" />
        </div>
        <h2 className="text-center text-[26px] font-extrabold tracking-tight text-white mb-2">
          SRR Quotation Builder
        </h2>
        <p className="text-center text-[14px] text-slate-400">
          Frosted glassmorphism administration console
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-[420px] relative z-10 px-4">
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 py-10 px-8 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-3xl">
          <form className="space-y-6" onSubmit={handleLogin}>
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-4 rounded-2xl flex items-start gap-3 text-[14px] leading-snug">
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-400" />
                <p>{error}</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-white/10 rounded-2xl text-[14.5px] font-semibold text-white bg-white/10 hover:bg-white/15 transition-all shadow-md active:scale-[0.98]"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              Continue with Google
            </button>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink-0 mx-4 text-slate-400 text-[12.5px] font-medium">Or continue with email</span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-2">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="apple-input !pl-11 w-full !bg-white/5 !border-white/10 text-white focus:!bg-white/10 focus:!border-emerald-500/50"
                  placeholder="admin@example.com"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="apple-input !pl-11 w-full !bg-white/5 !border-white/10 text-white focus:!bg-white/10 focus:!border-emerald-500/50"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full py-3.5 text-[15px] font-bold flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 size={18} className="animate-spin text-white" />
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
