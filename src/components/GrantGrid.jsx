import GrantCard from './GrantCard'
import { FileSearch } from 'lucide-react'

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/3" />
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-3 bg-gray-100 rounded w-1/2" />
      <div className="h-3 bg-gray-100 rounded w-2/5" />
    </div>
  )
}

export default function GrantGrid({ grants, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  if (!grants.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <FileSearch className="w-12 h-12 mb-3 text-gray-300" />
        <p className="text-lg font-medium text-gray-500">No grants found</p>
        <p className="text-sm mt-1">Try a different filter or search term</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {grants.map((grant) => (
        <GrantCard key={grant.id} grant={grant} />
      ))}
    </div>
  )
}
