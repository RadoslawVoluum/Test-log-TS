import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Wifi, WifiOff, Save, Trash2, Clock, AlertTriangle } from 'lucide-react';

interface Log {
  timestamp: string;
  status: boolean;
  responseTime: number;
}

interface LogSummary {
  timestamp: string;
  startDate: string;
  endDate: string;
  totalDowntime: number;
  logs: Log[];
}

function App() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [pingUrl, setPingUrl] = useState('https://www.google.com/favicon.ico');
  const [interval, setInterval] = useState(5);
  const [autoSave, setAutoSave] = useState(true);
  const [autoSaveInterval, setAutoSaveInterval] = useState(15);
  const [logs, setLogs] = useState<Log[]>([]);
  const [totalDowntime, setTotalDowntime] = useState(0);
  const [monitoringTimer, setMonitoringTimer] = useState<NodeJS.Timeout | null>(null);
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds}s`);
    
    return parts.join(' ');
  };

  const saveLogs = useCallback(() => {
    if (logs.length === 0) return;

    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const summary: LogSummary = {
      timestamp: new Date().toISOString(),
      startDate: logs[logs.length - 1].timestamp,
      endDate: logs[0].timestamp,
      totalDowntime,
      logs: [...logs].reverse()
    };

    // Save to localStorage
    const storedLogs = JSON.parse(localStorage.getItem('Logs') || '[]');
    localStorage.setItem('Logs', JSON.stringify([summary, ...storedLogs]));

    // Create and download file
    const content = `Connection Monitoring Log - ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}
Total Timerange: ${format(new Date(summary.startDate), 'yyyy-MM-dd HH:mm:ss')} to ${format(new Date(summary.endDate), 'yyyy-MM-dd HH:mm:ss')}
Total Downtime: ${formatDuration(totalDowntime)}

Detailed Logs:
${logs.map(log => 
  `${format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')} | Status: ${log.status ? 'Online' : 'Offline'} | Response Time: ${log.responseTime}ms`
).join('\n')}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `connection_log_${timestamp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [logs, totalDowntime]);

  const clearLogs = () => {
    saveLogs();
    setLogs([]);
    setTotalDowntime(0);
  };

  const checkConnection = async () => {
    const timestamp = new Date().toISOString();
    const start = performance.now();
    
    try {
      await fetch(pingUrl, { mode: 'no-cors', cache: 'no-cache' });
      const end = performance.now();
      const responseTime = Math.round(end - start);
      
      setLogs(prev => [{
        timestamp,
        status: true,
        responseTime
      }, ...prev]);
    } catch (error) {
      setLogs(prev => [{
        timestamp,
        status: false,
        responseTime: 0
      }, ...prev]);
      setTotalDowntime(prev => prev + interval);
    }
  };

  const toggleMonitoring = () => {
    if (!isMonitoring) {
      checkConnection();
      const timer = setInterval(checkConnection, interval * 1000);
      setMonitoringTimer(timer);
      if (autoSave) {
        const saveTimer = setInterval(saveLogs, autoSaveInterval * 60 * 1000);
        setAutoSaveTimer(saveTimer);
      }
    } else {
      if (monitoringTimer) clearInterval(monitoringTimer);
      if (autoSaveTimer) clearInterval(autoSaveTimer);
      setMonitoringTimer(null);
      setAutoSaveTimer(null);
      saveLogs();
    }
    setIsMonitoring(!isMonitoring);
  };

  useEffect(() => {
    // Load logs from localStorage
    const storedLogs = localStorage.getItem('Logs');
    if (storedLogs) {
      const parsedLogs = JSON.parse(storedLogs);
      if (parsedLogs.length > 0) {
        setLogs(parsedLogs[0].logs);
        setTotalDowntime(parsedLogs[0].totalDowntime);
      }
    }

    // Setup event listeners for page unload
    const handleUnload = () => {
      if (logs.length > 0) saveLogs();
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      if (monitoringTimer) clearInterval(monitoringTimer);
      if (autoSaveTimer) clearInterval(autoSaveTimer);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Wifi className="h-6 w-6" />
            Connection Monitor
          </h1>

          <div className="grid gap-4 mb-6">
            <div className="flex items-center gap-4">
              <input
                type="text"
                value={pingUrl}
                onChange={(e) => setPingUrl(e.target.value)}
                placeholder="Enter URL to ping"
                className="flex-1 px-3 py-2 border rounded"
                disabled={isMonitoring}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check Interval (seconds)
                </label>
                <input
                  type="number"
                  min="1"
                  value={interval}
                  onChange={(e) => setInterval(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded"
                  disabled={isMonitoring}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Auto-save Interval
                </label>
                <select
                  value={autoSaveInterval}
                  onChange={(e) => setAutoSaveInterval(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded"
                  disabled={isMonitoring || !autoSave}
                >
                  <option value={1}>Every 1 minute</option>
                  <option value={5}>Every 5 minutes</option>
                  <option value={10}>Every 10 minutes</option>
                  <option value={15}>Every 15 minutes</option>
                  <option value={30}>Every 30 minutes</option>
                  <option value={45}>Every 45 minutes</option>
                  <option value={60}>Every 60 minutes</option>
                  <option value={90}>Every 90 minutes</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoSave"
                checked={autoSave}
                onChange={(e) => setAutoSave(e.target.checked)}
                className="rounded border-gray-300"
                disabled={isMonitoring}
              />
              <label htmlFor="autoSave" className="text-sm text-gray-700">
                Enable auto-save
              </label>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={toggleMonitoring}
                className={`px-4 py-2 rounded-md ${
                  isMonitoring 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
              </button>
              
              <button
                onClick={saveLogs}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center gap-2"
                disabled={logs.length === 0}
              >
                <Save className="h-4 w-4" />
                Save Logs
              </button>
              
              <button
                onClick={clearLogs}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 flex items-center gap-2"
                disabled={logs.length === 0}
              >
                <Trash2 className="h-4 w-4" />
                Clear Logs
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-md">
              <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Total Downtime
              </h2>
              <p className="text-xl font-mono">{formatDuration(totalDowntime)}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-md">
              <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Current Status
              </h2>
              <p className={`text-xl ${logs[0]?.status ? 'text-green-600' : 'text-red-600'}`}>
                {logs[0]?.status ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>

          <div className="overflow-auto max-h-96">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Timestamp</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Response Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, index) => (
                  <tr key={index} className="border-t">
                    <td className="px-4 py-2 font-mono text-sm">
                      {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                    </td>
                    <td className={`px-4 py-2 ${log.status ? 'text-green-600' : 'text-red-600'}`}>
                      {log.status ? (
                        <span className="flex items-center gap-1">
                          <Wifi className="h-4 w-4" />
                          Online
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <WifiOff className="h-4 w-4" />
                          Offline
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">{log.responseTime}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
