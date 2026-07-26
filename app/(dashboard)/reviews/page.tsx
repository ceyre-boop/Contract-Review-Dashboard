import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/StatusBadge'
import { formatDate } from '@/lib/utils'
import { Plus, FileText } from 'lucide-react'
import type { Review } from '@/types/database'

export default async function ReviewsPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: reviews } = await supabase
    .from('reviews')
    .select('*, talent(name)')
    .order('created_at', { ascending: false })

  const list = (reviews ?? []) as (Review & { talent: { name: string } | null })[]

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
          <p className="text-sm text-gray-500 mt-1">{list.length} total</p>
        </div>
        <Link href="/reviews/new">
          <Button><Plus className="h-4 w-4" /> New Review</Button>
        </Link>
      </div>

      {list.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16 text-gray-400">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No reviews yet.</p>
            <Link href="/reviews/new">
              <Button variant="outline" size="sm" className="mt-4">Start your first review</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map(review => (
            <Link key={review.id} href={`/reviews/${review.id}`}>
              <Card className="hover:border-gray-300 transition-colors cursor-pointer">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {review.talent?.name ?? '—'} × {review.brand}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{review.contract_filename} · {formatDate(review.created_at)}</p>
                  </div>
                  <StatusBadge status={review.status} />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
