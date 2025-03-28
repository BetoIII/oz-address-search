"use client";

import React, { createContext, useContext, ReactNode, useState } from "react";

interface LogEntry {
  type: "info" | "success" | "warning" | "error";
  message: string;
  timestamp: string;
}

interface LogsContextType {
  logs: LogEntry[];
  addLog: (type: LogEntry["type"], message: string) => void;
  clearLogs: () => void;
}

const LogsContext = createContext<LogsContextType | undefined>(undefined);

export function LogsProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = (type: LogEntry["type"], message: string) => {
    // Remove any sensitive data patterns
    const sanitizedMessage = message
      .replace(/api_key=([^&]+)/gi, "api_key=***") // Hide API keys
      .replace(/token=([^&]+)/gi, "token=***") // Hide tokens
      .replace(/password=([^&]+)/gi, "password=***") // Hide passwords
      .replace(/(\b25[0-5]|\b2[0-4][0-9]|\b[01]?[0-9][0-9]?)(\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}/g, "IP_REDACTED"); // Hide IP addresses

    setLogs((prevLogs) => [
      ...prevLogs,
      {
        type,
        message: sanitizedMessage,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <LogsContext.Provider value={{ logs, addLog, clearLogs }}>
      {children}
    </LogsContext.Provider>
  );
}

export function useLogs() {
  const context = useContext(LogsContext);
  if (context === undefined) {
    throw new Error("useLogs must be used within a LogsProvider");
  }
  return context;
} 