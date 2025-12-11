export default function Loading() {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-green mb-4"></div>
        <p className="text-gray-600">Loading Adirondacks Map...</p>
      </div>
    </div>
  );
} 