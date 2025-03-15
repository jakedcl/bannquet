import { ReactNode } from 'react';

interface AdminPageWrapperProps {
  children: ReactNode;
  title: string;
}

export default function AdminPageWrapper({ children, title }: AdminPageWrapperProps) {
  return (
    <div className="pt-[92px] min-h-screen bg-gray-100 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          </div>
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
} 