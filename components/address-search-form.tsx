"use client"

import type React from "react"
import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { SearchIcon, Loader2 } from "lucide-react"
import { ResultDisplay } from "@/components/result-display"
import { LogDisplay } from "@/components/log-display"
import { useLogs } from "@/lib/logs-context"
import { initializeMCPClient } from "@/lib/mcp/client"
import { loadMCPConfig, DEFAULT_MCP_CONFIG } from "@/lib/mcp/config"
import OpportunityZoneService from "@/lib/mcp/service-factory"

export function AddressSearchForm() {
  const [address, setAddress] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ isInZone: boolean | null; error?: string } | null>(null)
  const { addLog, clearLogs } = useLogs()
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize MCP client
  useEffect(() => {
    let isMounted = true;

    const initMCP = async () => {
      if (isInitialized) return;

      try {
        const config = loadMCPConfig();
        const client = initializeMCPClient(config);
        const initialized = await client.initialize();
        
        if (!isMounted) return;

        if (initialized) {
          setIsInitialized(true);
        } else {
          console.error("Failed to initialize MCP client. Using fallback configuration.");
          initializeMCPClient(DEFAULT_MCP_CONFIG);
        }
      } catch (error) {
        if (!isMounted) return;
        
        console.error("MCP initialization error:", error);
        initializeMCPClient(DEFAULT_MCP_CONFIG);
      }
    };

    initMCP();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isInitialized) {
      addLog("warning", "Using fallback configuration. Some features may be limited.");
    }
  }, [isInitialized, addLog]);

  const handleAddressChange = useCallback((newAddress: string) => {
    setAddress(newAddress);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!address.trim()) return;

    setIsLoading(true);
    setResult(null);
    clearLogs();

    try {
      addLog("info", "🚀 Starting new address search...");
      
      const response = await OpportunityZoneService.checkAddress(address);
      
      if (response.error) {
        throw new Error(response.error);
      }

      if (response.logs) {
        response.logs.forEach(log => {
          addLog(log.type, log.message);
        });
      }

      if (response.data) {
        setResult({
          isInZone: response.data.isInZone,
          error: undefined
        });
        
        if (response.data.coordinates) {
          addLog("success", `📍 Found coordinates: (${response.data.coordinates.lat}, ${response.data.coordinates.lon})`);
        }
      }
    } catch (error) {
      addLog("error", `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setResult({
        isInZone: null,
        error: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">Enter an Address</h2>
        <p className="text-sm text-gray-500">
          Provide a complete address to check if it's located in an opportunity zone.
        </p>
      </div>

      {!isInitialized && (
        <Alert>
          <AlertDescription>
            Using fallback configuration. Some features may be limited.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            placeholder="123 Main St, City, State, ZIP"
            value={address}
            onChange={(e) => handleAddressChange(e.target.value)}
            className="w-full"
            disabled={isLoading}
          />
        </div>

        <Button 
          type="submit" 
          className="w-full" 
          disabled={isLoading || !address.trim()}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Checking Address...
            </>
          ) : (
            <>
              <SearchIcon className="mr-2 h-4 w-4" />
              Check Address
            </>
          )}
        </Button>
      </form>

      {result && !result.error && result.isInZone !== null && (
        <ResultDisplay isInZone={result.isInZone} address={address} />
      )}

      {result?.error && (
        <Alert variant="destructive">
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      )}
      
      <LogDisplay visible={true} />
    </div>
  )
}

