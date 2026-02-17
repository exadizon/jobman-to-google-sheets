'use client';
import { useState, useRef, useEffect } from 'react';

const SITE_PASSWORD = 'InspireKitchens';
const AUTH_KEY = 'jobman-dashboard-auth';

export default function Home() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selected, setSelected] = useState({
    quotes: true,
    leads: true,
    jobs: true,
    invoices: true,
  });
  const [isTestMode, setIsTestMode] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Check localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(AUTH_KEY);
      if (stored === 'true') setIsAuthed(true);
      setAuthChecked(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === SITE_PASSWORD) {
      setIsAuthed(true);
      setAuthError(false);
      localStorage.setItem(AUTH_KEY, 'true');
    } else {
      setAuthError(true);
    }
  };

  const toggle = (key: keyof typeof selected) => {
    setSelected(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const startSync = async () => {
    setLogs([]);
    setIsRunning(true);
    
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...selected, limit: isTestMode ? 5 : null }),
      });

      if (!response.body) throw new Error('No response body');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = decoder.decode(value);
        const newLogs = text.split('\n').filter(line => line.trim()).map(msg => {
          const time = new Date().toLocaleTimeString();
          return `[${time}] ${msg}`;
        });
        setLogs(prev => [...prev, ...newLogs]);

        if (logContainerRef.current) {
          logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
      }
    } catch (error: any) {
      setLogs(prev => [...prev, `❌ Error: ${error.message}`]);
    } finally {
      setIsRunning(false);
    }
  };

  // Don't render anything until auth check is complete (avoids flash)
  if (!authChecked) return null;

  // Password gate
  if (!isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#454E49' }}>
              JobMan Sync
            </h1>
            <p className="text-sm text-stone-400 mt-1">Enter password to continue</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setAuthError(false); }}
              placeholder="Password"
              autoFocus
              className={`w-full px-4 py-3 rounded-lg border bg-white text-sm font-medium text-stone-700 placeholder:text-stone-300 outline-none transition-colors
                ${authError ? 'border-red-300 ring-1 ring-red-200' : 'border-stone-200 focus:border-[#454E49]/50 focus:ring-1 focus:ring-[#454E49]/20'}`}
            />
            {authError && (
              <p className="text-xs text-red-500 pl-1">Incorrect password</p>
            )}
            <button
              type="submit"
              className="w-full py-3 rounded-lg text-sm font-semibold tracking-wide text-white hover:opacity-90 active:scale-[0.98] transition-all"
              style={{ backgroundColor: '#454E49' }}
            >
              Enter
            </button>
          </form>
          
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-6 sm:px-6 sm:py-8 lg:p-10">
      <div className="w-full max-w-5xl">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: '#454E49' }}>
              JobMan Sync
            </h1>
            <p className="text-sm text-stone-400 mt-0.5">
              Google Sheets Integration
            </p>
          </div>
          <div className={`self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium tracking-wide
            ${isRunning
              ? 'text-emerald-700 ring-1 ring-emerald-300'
              : 'text-stone-400 ring-1 ring-stone-200'
            }`}
            style={isRunning ? { backgroundColor: '#e8ebe9' } : { backgroundColor: '#f5f5f4' }}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-stone-300'}`} />
            {isRunning ? 'RUNNING' : 'IDLE'}
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3">

            {/* Left: Controls */}
            <div className="p-5 lg:border-r border-stone-200 space-y-5">

              {/* Sync Scope */}
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#454E49' }}>
                  Sync Scope
                </h3>
                <div className="space-y-2">
                  {(Object.keys(selected) as Array<keyof typeof selected>).map((key) => (
                    <label
                      key={key}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-stone-200 cursor-pointer hover:border-[#454E49]/40 transition-colors"
                    >
                      <span className="capitalize text-sm font-medium text-stone-700">{key}</span>
                      <input 
                        type="checkbox" 
                        checked={selected[key]} 
                        onChange={() => toggle(key)}
                        className="w-4 h-4 rounded cursor-pointer"
                        disabled={isRunning}
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <hr className="border-stone-100" />

              {/* Settings */}
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#454E49' }}>
                  Settings
                </h3>
                <label className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-stone-200 cursor-pointer hover:border-[#454E49]/40 transition-colors">
                  <span className="text-sm font-medium text-stone-700">Test Mode <span className="text-stone-400 font-normal">(Limit 5)</span></span>
                  <input 
                    type="checkbox" 
                    checked={isTestMode} 
                    onChange={() => setIsTestMode(!isTestMode)}
                    className="w-4 h-4 rounded cursor-pointer"
                    disabled={isRunning}
                  />
                </label>
              </div>

              {/* Divider */}
              <hr className="border-stone-100" />

              {/* Automation Info */}
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#454E49' }}>
                  Automation
                </h3>
                <div className="text-sm space-y-2 text-stone-500">
                  <div className="flex justify-between">
                    <span>Status</span>
                    <span className="font-medium text-stone-700">Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Frequency</span>
                    <span className="font-medium text-stone-700">Daily</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Next Run</span>
                    <span className="font-medium text-stone-700">5:00 PM</span>
                  </div>
                </div>
              </div>

              {/* Sync Button */}
              <button 
                onClick={startSync}
                disabled={isRunning}
                className={`w-full py-3 rounded-lg text-sm font-semibold tracking-wide transition-all
                  ${isRunning 
                    ? 'bg-stone-100 text-stone-400 cursor-not-allowed' 
                    : 'text-white hover:opacity-90 active:scale-[0.98]'
                  }`}
                style={!isRunning ? { backgroundColor: '#454E49' } : undefined}
              >
                {isRunning ? 'Syncing…' : 'Start Sync'}
              </button>
            </div>

            {/* Right: Console Log */}
            <div className="lg:col-span-2 flex flex-col border-t lg:border-t-0 border-stone-200">
              <div className="flex items-center justify-between px-5 py-3 border-b border-stone-100">
                <h3 className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#454E49' }}>
                  Live Logs
                </h3>
                <span className="text-[11px] font-mono text-stone-300">{logs.length} lines</span>
              </div>
              <div 
                ref={logContainerRef}
                className="flex-1 min-h-[320px] sm:min-h-[400px] lg:min-h-[480px] max-h-[60vh] lg:max-h-none p-4 font-mono text-[13px] leading-relaxed overflow-y-auto"
                style={{ backgroundColor: '#2a2f2c', color: '#8b9a8f' }}
              >
                {logs.length === 0 && (
                  <div className="h-full flex items-center justify-center" style={{ color: '#5c665f' }}>
                    <p>Waiting for sync…</p>
                  </div>
                )}
                {logs.map((line, i) => (
                  <div key={i} className="whitespace-pre-wrap break-all py-0.5 pl-2 border-l-2 border-transparent hover:border-[#454E49] hover:bg-white/[0.03] transition-colors">
                    {line}
                  </div>
                ))}
                {isRunning && (
                  <div className="animate-pulse mt-2" style={{ color: '#7a8a7e' }}>Processing…</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-stone-300 mt-6">
          Inspire Kitchens — JobMan to Google Sheets Automation
        </p>
      </div>
    </div>
  );
}
