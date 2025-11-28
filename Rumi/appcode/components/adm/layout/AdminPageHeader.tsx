// components/adm/layout/AdminPageHeader.tsx
// Page header with optional action buttons

interface AdminPageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
}

export function AdminPageHeader({ title, description, actions }: AdminPageHeaderProps) {
  return (
    <div className="border-b border-white/10 pb-5 mb-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          {description && (
            <p className="mt-2 text-sm text-gray-400">{description}</p>
          )}
        </div>
        {actions && (
          <div className="mt-4 sm:mt-0 sm:ml-4">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
