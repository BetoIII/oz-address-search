"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { checkAddressInOpportunityZone } from "@/lib/actions"

export default function TestPage() {
  const [address, setAddress] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [logs, setLogs] = useState<string[]>([])

  // Function to capture console logs
  const captureLog = (type: string, message: string) => {
    setLogs(prev => [...prev, `[${type}] ${new Date().toISOString()} ${message}`]);
  }

  async function handleAddressSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setResult(null)
    setLogs([])

    try {
      captureLog('LOG', "🧪 TEST: Starting address search");
      const response = await checkAddressInOpportunityZone(address)
      captureLog('LOG', `🧪 TEST: Received response: ${JSON.stringify(response)}`);
      setResult(response)
    } catch (error) {
      captureLog('ERROR', `🧪 TEST: Error in test: ${error}`);
      setResult({
        isInZone: null,
        error: "An unexpected error occurred. Check logs for details.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center p-4 md:p-8 bg-gray-50">
      <div className="w-full max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">API Integration Test Page</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Address Search</h2>
          
          <form onSubmit={handleAddressSubmit} className="space-y-4">
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

            <Button type="submit" className="w-full" disabled={isLoading || !address.trim()}>
              {isLoading ? "Checking..." : "Check Address"}
            </Button>
          </form>
        </div>

        {result && (
          <div className="bg-white rounded-lg shadow-md p-6 md:p-8 mb-6">
            <h2 className="text-xl font-semibold mb-4">Result</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        {logs.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 md:p-8">
            <h2 className="text-xl font-semibold mb-4">Logs</h2>
            <div className="bg-black text-green-400 p-4 rounded font-mono text-sm overflow-x-auto h-96 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className="whitespace-pre-wrap mb-1">{log}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
} 