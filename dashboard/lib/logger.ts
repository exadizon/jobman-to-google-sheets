// dashboard/lib/logger.ts
export class Logger {
    private logs: string[] = [];
    private listeners: ((msg: string) => void)[] = [];
  
    log(message: string) {
      const timestamp = new Date().toLocaleTimeString();
      const formatted = `[${timestamp}] ${message}`;
      this.logs.push(formatted);
      this.listeners.forEach(l => l(formatted));
    }
  
    warn(message: string) {
      this.log(`⚠️ ${message}`);
    }
  
    error(message: string) {
      this.log(`❌ ${message}`);
    }
  
    onLog(listener: (msg: string) => void) {
      this.listeners.push(listener);
    }
  
    getLogs() {
      return this.logs;
    }
  }
