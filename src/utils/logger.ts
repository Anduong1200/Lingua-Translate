export interface LogEntry {
    timestamp: string;
    level: 'INFO' | 'WARN' | 'ERROR';
    message: string;
    stack?: string;
    context?: any;
}

const MAX_LOGS = 50;
const STORAGE_KEY = 'hanora_error_logs';

export const logger = {
    logs: [] as LogEntry[],

    init() {
        // Load existing logs
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                this.logs = JSON.parse(stored);
            }
        } catch (e) {
            console.error('Failed to parse logs from localStorage', e);
        }

        // Intercept global errors
        window.addEventListener('error', (event) => {
            this.error(event.message, event.error?.stack);
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.error(typeof event.reason === 'string' ? event.reason : (event.reason?.message || 'Unhandled Promise Rejection'), event.reason?.stack);
        });
    },

    info(message: string, context?: any) {
        this.addLog('INFO', message, undefined, context);
        console.info(`[Hanora INFO] ${message}`, context || '');
    },

    warn(message: string, context?: any) {
        this.addLog('WARN', message, undefined, context);
        console.warn(`[Hanora WARN] ${message}`, context || '');
    },

    error(message: string, stack?: string, context?: any) {
        this.addLog('ERROR', message, stack, context);
        console.error(`[Hanora ERROR] ${message}`, stack || '', context || '');
    },

    addLog(level: 'INFO' | 'WARN' | 'ERROR', message: string, stack?: string, context?: any) {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            stack,
            context
        };

        this.logs.unshift(entry);
        if (this.logs.length > MAX_LOGS) {
            this.logs.pop();
        }

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs));
        } catch (e) {
            console.error('Failed to save logs to localStorage', e);
        }
    },

    getLogs(): LogEntry[] {
        return this.logs;
    },

    clearLogs() {
        this.logs = [];
        localStorage.removeItem(STORAGE_KEY);
    }
};

// Initialize automatically
logger.init();
