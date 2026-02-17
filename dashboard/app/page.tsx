'use client';
import { useState, useRef, useEffect } from 'react';

export default function Home() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selected, setSelected] = useState({
    quotes: true,
    leads: true,
    jobs: true,
    invoices: true,
  });
  const logContainerRef = useRef<HTMLDivElement>(null);

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
        body: JSON.stringify(selected),
      });

      if (!response.body) throw new Error('No response body');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = decoder.decode(value);
        // Split by newline and filter empty strings
        const newLogs = text.split('\n').filter(line => line.trim());
        setLogs(prev => [...prev, ...newLogs]);

        // Auto-scroll
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-8 font-sans text-gray-800">
      <div className="max-w-4xl w-full bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    JobMan Sync Dashboard
                </h1>
                <p className="text-blue-100 text-sm mt-1">Google Sheets Integration Control Panel</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${isRunning ? 'bg-green-400 text-green-900 animate-pulse' : 'bg-white/20 text-white'}`}>
                {isRunning ? 'RUNNING' : 'IDLE'}
            </div>
        </div>

        {/* Content */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Left: Controls */}
            <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Sync Scope</h3>
                    <div className="space-y-3">
                        {(Object.keys(selected) as Array<keyof typeof selected>).map((key) => (
                            <label key={key} className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200 cursor-pointer hover:border-blue-300 transition-colors">
                                <span className="capitalize font-medium text-gray-700">{key}</span>
                                <input 
                                    type="checkbox" 
                                    checked={selected[key]} 
                                    onChange={() => toggle(key)}
                                    className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    disabled={isRunning}
                                />
                            </label>
                        ))}
                    </div>
                </div>

                <button 
                    onClick={startSync}
                    disabled={isRunning}
                    className={`w-full py-4 rounded-lg font-bold text-lg shadow-md transition-all flex items-center justify-center gap-2
                        ${isRunning 
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                            : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg active:scale-[0.98]'
                        }`}
                >
                    {isRunning ? 'Syncing...' : 'Start Sync'}
                </button>
            </div>

            {/* Right: Console Log */}
            <div className="md:col-span-2 flex flex-col h-[500px]">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Live Logs</h3>
                    <span className="text-xs text-gray-400">{logs.length} lines</span>
                </div>
                <div 
                    ref={logContainerRef}
                    className="flex-1 bg-gray-900 rounded-lg p-4 font-mono text-sm text-green-400 overflow-y-auto border border-gray-800 shadow-inner"
                >
                    {logs.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-2">
                            <p>Ready to start.</p>
                        </div>
                    )}
                    {logs.map((line, i) => (
                        <div key={i} className="whitespace-pre-wrap break-all py-0.5 border-l-2 border-transparent hover:bg-white/5 pl-2 hover:border-blue-500 transition-colors">
                            {line}
                        </div>
                    ))}
                    {isRunning && (
                        <div className="animate-pulse text-blue-400 mt-2">Processing...</div>
                    )}
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}
