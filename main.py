import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import urllib.request
import datetime
import json
import os
from threading import Thread, Event
import time

class ConnectionMonitor:
    def __init__(self, root):
        self.root = root
        self.root.title("Internet Connection Monitor")
        self.root.geometry("1000x800")
        
        # Variables
        self.monitoring = False
        self.stop_event = Event()
        self.logs = []
        self.save_directory = ""
        self.interval = tk.StringVar(value="5")
        self.auto_save_interval = tk.StringVar(value="15")
        self.ping_url = tk.StringVar(value="https://www.google.com")
        self.status_var = tk.StringVar(value="Not monitoring")
        self.total_downtime = 0
        
        self.create_gui()
        
    def create_gui(self):
        # Main frame
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Directory selection
        ttk.Label(main_frame, text="Save Directory:").grid(row=0, column=0, sticky=tk.W)
        self.dir_entry = ttk.Entry(main_frame, width=50)
        self.dir_entry.grid(row=0, column=1, padx=5, pady=5, sticky=tk.W)
        ttk.Button(main_frame, text="Select Directory", command=self.select_directory).grid(row=0, column=2, padx=5)
        
        # URL input
        ttk.Label(main_frame, text="URL to ping:").grid(row=1, column=0, sticky=tk.W)
        ttk.Entry(main_frame, textvariable=self.ping_url, width=50).grid(row=1, column=1, padx=5, pady=5, sticky=tk.W)
        
        # Intervals
        ttk.Label(main_frame, text="Check interval (seconds):").grid(row=2, column=0, sticky=tk.W)
        ttk.Entry(main_frame, textvariable=self.interval, width=10).grid(row=2, column=1, padx=5, pady=5, sticky=tk.W)
        
        # Auto-save interval
        ttk.Label(main_frame, text="Auto-save interval (minutes):").grid(row=3, column=0, sticky=tk.W)
        auto_save_combo = ttk.Combobox(main_frame, textvariable=self.auto_save_interval, width=10)
        auto_save_combo['values'] = ('15', '30', '45', '60')
        auto_save_combo.grid(row=3, column=1, padx=5, pady=5, sticky=tk.W)
        
        # Control buttons
        button_frame = ttk.Frame(main_frame)
        button_frame.grid(row=4, column=0, columnspan=3, pady=10)
        
        self.start_button = ttk.Button(button_frame, text="Start Monitoring", command=self.toggle_monitoring)
        self.start_button.pack(side=tk.LEFT, padx=5)
        
        ttk.Button(button_frame, text="Save Logs", command=self.save_logs).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="Clear Logs", command=self.clear_logs).pack(side=tk.LEFT, padx=5)
        
        # Status display
        status_frame = ttk.LabelFrame(main_frame, text="Status", padding="5")
        status_frame.grid(row=5, column=0, columnspan=3, pady=10, sticky=(tk.W, tk.E))
        
        ttk.Label(status_frame, text="Current Status:").grid(row=0, column=0, padx=5)
        ttk.Label(status_frame, textvariable=self.status_var).grid(row=0, column=1, padx=5)
        
        self.downtime_label = ttk.Label(status_frame, text="Total Downtime: 0s")
        self.downtime_label.grid(row=0, column=2, padx=5)
        
        # Log display
        log_frame = ttk.LabelFrame(main_frame, text="Connection Logs", padding="5")
        log_frame.grid(row=6, column=0, columnspan=3, pady=10, sticky=(tk.W, tk.E))
        
        # Treeview for logs
        self.tree = ttk.Treeview(log_frame, columns=('timestamp', 'status', 'response_time'), show='headings')
        self.tree.heading('timestamp', text='Timestamp')
        self.tree.heading('status', text='Status')
        self.tree.heading('response_time', text='Response Time (ms)')
        
        # Scrollbar for treeview
        scrollbar = ttk.Scrollbar(log_frame, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)
        
        self.tree.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        scrollbar.grid(row=0, column=1, sticky=(tk.N, tk.S))
        
        # Configure grid weights
        main_frame.columnconfigure(1, weight=1)
        log_frame.columnconfigure(0, weight=1)
        log_frame.rowconfigure(0, weight=1)
        
    def select_directory(self):
        directory = filedialog.askdirectory()
        if directory:
            self.save_directory = directory
            self.dir_entry.delete(0, tk.END)
            self.dir_entry.insert(0, directory)
    
    def check_connection(self):
        while not self.stop_event.is_set():
            try:
                start_time = time.time()
                urllib.request.urlopen(self.ping_url.get(), timeout=5)
                response_time = int((time.time() - start_time) * 1000)
                status = True
            except:
                response_time = 0
                status = False
                self.total_downtime += int(self.interval.get())
            
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            log_entry = {
                'timestamp': timestamp,
                'status': status,
                'response_time': response_time
            }
            self.logs.append(log_entry)
            
            # Update GUI
            self.root.after(0, self.update_gui, log_entry)
            
            # Auto-save if needed
            if len(self.logs) % (int(self.auto_save_interval.get()) * 60 // int(self.interval.get())) == 0:
                self.root.after(0, self.save_logs)
            
            time.sleep(int(self.interval.get()))
    
    def update_gui(self, log_entry):
        # Update status
        self.status_var.set("Online" if log_entry['status'] else "Offline")
        
        # Update downtime display
        self.downtime_label.config(text=f"Total Downtime: {self.format_duration(self.total_downtime)}")
        
        # Add log entry to treeview
        self.tree.insert('', 0, values=(
            log_entry['timestamp'],
            "Online" if log_entry['status'] else "Offline",
            f"{log_entry['response_time']}ms"
        ))
    
    def format_duration(self, seconds):
        if seconds < 60:
            return f"{seconds}s"
        elif seconds < 3600:
            return f"{seconds // 60}m {seconds % 60}s"
        else:
            hours = seconds // 3600
            minutes = (seconds % 3600) // 60
            return f"{hours}h {minutes}m"
    
    def toggle_monitoring(self):
        if not self.save_directory:
            messagebox.showerror("Error", "Please select a directory to save logs first")
            return
            
        if not self.monitoring:
            self.monitoring = True
            self.stop_event.clear()
            self.start_button.config(text="Stop Monitoring")
            Thread(target=self.check_connection, daemon=True).start()
        else:
            self.monitoring = False
            self.stop_event.set()
            self.start_button.config(text="Start Monitoring")
    
    def save_logs(self):
        if not self.logs:
            messagebox.showinfo("Info", "No logs to save")
            return
            
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"connection_log_{timestamp}.txt"
        filepath = os.path.join(self.save_directory, filename)
        
        try:
            with open(filepath, 'w') as f:
                f.write(f"Connection Monitoring Log - {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write(f"Total Downtime: {self.format_duration(self.total_downtime)}\n\n")
                f.write("Detailed Logs:\n")
                for log in self.logs:
                    f.write(f"{log['timestamp']} | Status: {'Online' if log['status'] else 'Offline'} | Response Time: {log['response_time']}ms\n")
            messagebox.showinfo("Success", f"Logs saved to {filepath}")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save logs: {str(e)}")
    
    def clear_logs(self):
        self.logs = []
        self.total_downtime = 0
        self.downtime_label.config(text="Total Downtime: 0s")
        for item in self.tree.get_children():
            self.tree.delete(item)

if __name__ == "__main__":
    root = tk.Tk()
    app = ConnectionMonitor(root)
    root.mainloop()