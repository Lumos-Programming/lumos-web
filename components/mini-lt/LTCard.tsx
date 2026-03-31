import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Card, CardContent, CardHeader, CardTitle, Avatar, Badge, Button } from './ui'
import { SerializableTalk } from '@/lib/mini-lt/firebase'
import { format } from 'date-fns'

interface LTCardProps {
  talk: SerializableTalk
  onEdit?: (talk: SerializableTalk) => void
  onDelete?: (talkId: string) => void
  isOwner?: boolean
}

export function LTCard({ talk, onEdit, onDelete, isOwner }: LTCardProps) {
  return (
    <Card className="h-full flex flex-col hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-purple-200">
      <CardHeader className="flex flex-row items-start space-x-4 pb-3 bg-gradient-card">
        <Avatar
          src={talk.presenterAvatar}
          alt={talk.presenterName}
          className="h-14 w-14 ring-2 ring-purple-100"
        />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Badge className="bg-gradient-primary text-white">{talk.presenterName}</Badge>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded-full flex items-center gap-1">
                <span>⏱️</span>
                <span>{talk.duration}分</span>
              </span>
              <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                #{talk.order}
              </span>
            </div>
          </div>
          <CardTitle className="text-xl font-bold leading-tight">{talk.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pt-4">
        <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{talk.description}</ReactMarkdown>
        </div>
      </CardContent>
      {isOwner && (onEdit || onDelete) && (
        <div className="p-4 pt-0 flex justify-end space-x-2 border-t bg-gray-50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit?.(talk)}
            className="hover:bg-purple-50 hover:border-purple-300"
          >
            ✏️ 編集
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onDelete?.(talk.id)}>
            🗑️ 削除
          </Button>
        </div>
      )}
      <div className="px-6 pb-3 text-xs text-muted-foreground flex items-center justify-end gap-1">
        <span className="opacity-60">📅</span>
        {format(new Date(talk.createdAt), 'yyyy-MM-dd HH:mm')}
      </div>
    </Card>
  )
}
