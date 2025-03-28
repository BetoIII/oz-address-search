"use client";

import { useLogs } from "@/lib/logs-context";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp, TerminalSquare } from "lucide-react";

interface LogDisplayProps {
  visible?: boolean;
}

export function LogDisplay({ visible = false }: LogDisplayProps) {
  const { logs } = useLogs();
  const [isOpen, setIsOpen] = useState(true); // Default to open
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastLogRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs appear
  useEffect(() => {
    if (scrollRef.current && lastLogRef.current && isOpen) {
      lastLogRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isOpen]);

  // Auto-open when first log appears
  useEffect(() => {
    if (logs.length > 0) {
      setIsOpen(true);
    }
  }, [logs.length]);

  if (!visible || logs.length === 0) return null;

  const getIconForLogType = (type: string) => {
    switch (type) {
      case "info":
        return "🔍";
      case "success":
        return "✅";
      case "warning":
        return "⚠️";
      case "error":
        return "❌";
      default:
        return "📝";
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  return (
    <div className="mt-8 bg-gray-50 border rounded-lg overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 text-left bg-gray-100 hover:bg-gray-200">
          <div className="flex items-center space-x-2">
            <TerminalSquare className="h-5 w-5" />
            <span className="font-medium">Process Log ({logs.length} entries)</span>
          </div>
          {isOpen ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent forceMount>
          <div 
            ref={scrollRef}
            className="bg-gray-50 p-4 font-mono text-sm overflow-x-auto max-h-80 overflow-y-auto"
          >
            {logs.map((log, index) => (
              <div 
                key={index} 
                ref={index === logs.length - 1 ? lastLogRef : null}
                className="whitespace-pre-wrap mb-1 flex animate-in fade-in-0 duration-150"
              >
                <span className="text-gray-500 mr-2">[{formatTime(log.timestamp)}]</span>
                <span className="mr-2">{getIconForLogType(log.type)}</span>
                <span className="text-gray-800">{log.message}</span>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
} 