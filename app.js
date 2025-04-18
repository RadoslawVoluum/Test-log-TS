class ConnectionMonitor {
  constructor() {
    this.isMonitoring = false;
    this.logs = [];
    this.totalDowntime = 0;
    this.monitoringInterval = null;
    this.autoSaveInterval = null;
    
    // DOM Elements
    this.elements = {
      toggleBtn: document.getElementById('toggleBtn'),
      saveBtn: document.getElementById('saveBtn'),
      clearBtn: document.getElementById('clearBtn'),
      pingUrl: document.getElementById('pingUrl'),
      interval: document.getElementById('interval'),
      autoSave: document.getElementById('autoSave'),
      autoSaveInterval: document.getElementById('autoSaveInterval'),
      downtime: document.getElementById('downtime'),
      status: document.getElementById('status'),
      logsTable: document.getElementById('logsTable')
    };

    this.initializeEventListeners();
    this.loadFromLocalStorage();
  }

  initializeEventListeners() {
    this.elements.toggleBtn.addEventListener('click', () => this.toggleMonitoring());
    this.elements.saveBtn.addEventListener('click', () => this.saveLogs());
    this.elements.clearBtn.addEventListener('click', () => this.clearLogs());
    window.addEventListener('beforeunload', () => this.handleUnload());
  }

  async checkConnection() {
    const timestamp = new Date().toISOString();
    const start = performance.now();
    
    try {
      await fetch(this.elements.pingUrl.value, { 
        mode: 'no-cors', 
        cache: 'no-cache' 
      });
      const end = performance.now();
      
      this.addLog({
        timestamp,
        status: true,
        responseTime: Math.round(end - start)
      });
    } catch (error) {
      this.addLog({
        timestamp,
        status: false,
        responseTime: 0
      });
      this.totalDowntime += Number(this.elements.interval.value);
      this.updateDowntimeDisplay();
    }
  }

  addLog(log) {
    this.logs.unshift(log);
    this.updateLogsTable();
    this.updateStatus();
  }

  updateLogsTable() {
    this.elements.logsTable.innerHTML = this.logs.map(log => `
      <tr class="border-t">
        <td class="px-4 py-2 font-mono text-sm">
          ${new Date(log.timestamp).toLocaleString()}
        </td>
        <td class="px-4 py-2 ${log.status ? 'text-green-600' : 'text-red-600'}">
          ${log.status ? 'Online' : 'Offline'}
        </td>
        <td class="px-4 py-2">${log.responseTime}ms</td>
      </tr>
    `).join('');
  }

  updateStatus() {
    const currentStatus = this.logs[0]?.status;
    this.elements.status.className = `text-xl ${currentStatus ? 'text-green-600' : 'text-red-600'}`;
    this.elements.status.textContent = currentStatus ? 'Online' : 'Offline';
  }

  updateDowntimeDisplay() {
    const hours = Math.floor(this.totalDowntime / 3600);
    const minutes = Math.floor((this.totalDowntime % 3600) / 60);
    const seconds = this.totalDowntime % 60;
    
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
    
    this.elements.downtime.textContent = parts.join(' ');
  }

  toggleMonitoring() {
    this.isMonitoring = !this.isMonitoring;
    
    if (this.isMonitoring) {
      this.startMonitoring();
    } else {
      this.stopMonitoring();
    }
    
    this.elements.toggleBtn.textContent = this.isMonitoring ? 'Stop Monitoring' : 'Start Monitoring';
    this.elements.toggleBtn.className = `px-4 py-2 ${
      this.isMonitoring ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
    } text-white rounded`;
  }

  startMonitoring() {
    this.checkConnection();
    const interval = Number(this.elements.interval.value) * 1000;
    this.monitoringInterval = setInterval(() => this.checkConnection(), interval);
    
    if (this.elements.autoSave.checked) {
      const autoSaveMs = Number(this.elements.autoSaveInterval.value) * 60 * 1000;
      this.autoSaveInterval = setInterval(() => this.saveLogs(), autoSaveMs);
    }
    
    this.disableInputs(true);
  }

  stopMonitoring() {
    clearInterval(this.monitoringInterval);
    clearInterval(this.autoSaveInterval);
    this.saveLogs();
    this.disableInputs(false);
  }

  disableInputs(disabled) {
    this.elements.pingUrl.disabled = disabled;
    this.elements.interval.disabled = disabled;
    this.elements.autoSave.disabled = disabled;
    this.elements.autoSaveInterval.disabled = disabled;
  }

  saveLogs() {
    if (this.logs.length === 0) return;

    // Save to localStorage
    const timestamp = new Date().toISOString();
    const summary = {
      timestamp,
      startDate: this.logs[this.logs.length - 1].timestamp,
      endDate: this.logs[0].timestamp,
      totalDowntime: this.totalDowntime,
      logs: this.logs
    };

    const storedLogs = JSON.parse(localStorage.getItem('Logs') || '[]');
    localStorage.setItem('Logs', JSON.stringify([summary, ...storedLogs]));

    // Download file
    const content = this.generateLogContent(summary);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `connection_log_${timestamp.replace(/[:.]/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  generateLogContent(summary) {
    const formatDate = date => new Date(date).toLocaleString();
    const formatDuration = seconds => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = seconds % 60;
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    };

    return `Connection Monitoring Log - ${formatDate(summary.timestamp)}
Total Timerange: ${formatDate(summary.startDate)} to ${formatDate(summary.endDate)}
Total Downtime: ${formatDuration(summary.totalDowntime)}

Detailed Logs:
${this.logs.map(log => 
  `${formatDate(log.timestamp)} | Status: ${log.status ? 'Online' : 'Offline'} | Response Time: ${log.responseTime}ms`
).join('\n')}`;
  }

  clearLogs() {
    if (this.logs.length > 0) {
      this.saveLogs();
    }
    this.logs = [];
    this.totalDowntime = 0;
    this.updateLogsTable();
    this.updateDowntimeDisplay();
    this.elements.status.textContent = 'Not monitoring';
    this.elements.status.className = 'text-xl';
  }

  loadFromLocalStorage() {
    const storedLogs = localStorage.getItem('Logs');
    if (storedLogs) {
      const parsedLogs = JSON.parse(storedLogs);
      if (parsedLogs.length > 0) {
        this.logs = parsedLogs[0].logs;
        this.totalDowntime = parsedLogs[0].totalDowntime;
        this.updateLogsTable();
        this.updateDowntimeDisplay();
        this.updateStatus();
      }
    }
  }

  handleUnload() {
    if (this.logs.length > 0) {
      this.saveLogs();
    }
  }
}

// Initialize the application
new ConnectionMonitor();