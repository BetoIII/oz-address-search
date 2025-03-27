import { CheckCircle, XCircle } from "lucide-react"

interface ResultDisplayProps {
  isInZone: boolean
  address: string
}

export function ResultDisplay({ isInZone, address }: ResultDisplayProps) {
  return (
    <div
      className={`mt-6 p-4 rounded-lg border ${isInZone ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
    >
      <div className="flex items-start">
        {isInZone ? (
          <CheckCircle className="h-6 w-6 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
        ) : (
          <XCircle className="h-6 w-6 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
        )}
        <div>
          <h3 className={`font-medium ${isInZone ? "text-green-800" : "text-red-800"}`}>
            {isInZone
              ? "Yes, this address is in an Opportunity Zone!"
              : "No, this address is not in an Opportunity Zone."}
          </h3>
          <p className="text-sm mt-1 text-gray-600">Address: {address}</p>
          {isInZone && (
            <p className="text-sm mt-2 text-green-700">
              This location may qualify for tax incentives under the Opportunity Zone program.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

