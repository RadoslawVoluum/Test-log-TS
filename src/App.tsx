import { useState } from 'react';
import { format } from 'date-fns';

interface Log {
  timestamp: string;
  status: boolean;
  responseTime: number;
}

function App() {
  const [monitoring, setMonitoring] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);
  const [totalDowntime, setTotalDowntime] = useState(0);

  const toggleMonitoring = () => setMonitoring(prev => !prev);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="App">
      <button onClick={toggleMonitoring}>
        {monitoring ? 'Stop Monitoring' : 'Start Monitoring'}
      </button>

      <div>
        <h3>
          Current Status: {logs[0]?.status ? 'Online' : 'Offline'}
        </h3>
        <p>
          Total Downtime: {formatDuration(totalDowntime)}
        </p>
      </div>

      <table>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Status</th>
            <th>Response Time</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, index) => (
            <tr key={index}>
              <td>{format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}</td>
              <td>{log.status ? 'Online' : 'Offline'}</td>
              <td>{log.responseTime}ms</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
