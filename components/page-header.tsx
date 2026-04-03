interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-8">
      <div className="flex items-center gap-3">
        <div className="w-1 h-8 rounded-full bg-gradient-to-b from-purple-500 to-indigo-500 shrink-0 animate-accent-bar" />
        <div className="animate-spring-up stagger-tight-2 fill-mode-backwards">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground text-sm mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 mt-3 sm:mt-0 animate-spring-up stagger-tight-3 fill-mode-backwards">{actions}</div>}
    </div>
  )
}
