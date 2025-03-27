import { AddressSearchForm } from "@/components/address-search-form"
import { PageHeader } from "@/components/page-header"

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center p-4 md:p-8 bg-gray-50">
      <div className="w-full max-w-3xl mx-auto">
        <PageHeader />
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8">
          <AddressSearchForm />
        </div>
      </div>
    </main>
  )
}

