"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { SearchIcon, Loader2 } from "lucide-react"
import { ResultDisplay } from "@/components/result-display"
import { LogDisplay } from "@/components/log-display"
import { useLogs } from "@/lib/logs-context"
import { getOpportunityZoneService } from "@/lib/service-provider/factory"
import { updateConfig } from "@/lib/service-provider/config"

export function AddressSearchForm() {
  const [address, setAddress] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ isInZone: boolean | null; error?: string } | null>(null)
  const { addLog, clearLogs } = useLogs()

  const handleAddressChange = useCallback((newAddress: string) => {
    console.log('Address changed:', newAddress); // Debug log
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
      
      // Get the service instance (defaults to local if not configured)
      const service = await getOpportunityZoneService();
      
      // Check the address
      const response = await service.checkAddress(address);
      
      if (response.error) {
        throw new Error(response.error);
      }

      // Add any logs from the service
      if (response.logs) {
        response.logs.forEach(log => {
          addLog(log.type, log.message);
        });
      }

      setResult({
        isInZone: response.isInZone,
        error: undefined
      });

      // Try to get geocoding information
      const geocoding = await service.geocodeAddress(address);
      if (geocoding) {
        addLog("success", `📍 Found coordinates: (${geocoding.lat}, ${geocoding.lon})`);
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            placeholder="123 Main St, City, State, ZIP"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full"
            disabled={isLoading}
          />
        </div>

        <Button 
          type="submit" 
          className="w-full" 
          disabled={isLoading || !address.trim()}
          onClick={() => console.log('Button state:', { isLoading, address, trimmed: address.trim(), isDisabled: isLoading || !address.trim() })}
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

