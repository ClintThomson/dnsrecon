import type { LucideIcon } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ScanTypeCardProps {
  title: string
  description: string
  icon: LucideIcon
  selected?: boolean
  onClick?: () => void
}

export function ScanTypeCard({ title, description, icon: Icon, selected, onClick }: ScanTypeCardProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        selected && 'ring-2 ring-primary'
      )}
      onClick={onClick}
    >
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-3">
          <div className={cn('rounded-lg p-2', selected ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
            <Icon className="h-5 w-5" />
          </div>
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
    </Card>
  )
}
