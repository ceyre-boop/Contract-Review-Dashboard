import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/StatusBadge'
import { formatDate } from '@/lib/utils'
import { Plus } from 'lucide-react'
import type { Review } from '@/types/database'

export default async function TalentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const [{ data: talent }, { data: reviews }] = await Promise.all([
    supabase.from('talent').select('*').eq('id', id).single(),
    supabase.from('reviews').select('*').eq('talent_id', id).order('created_at', { ascending: false }),
  ])

  if (!talent) notFound()

  const typedReviews = (reviews ?? []) as Review[]
  const active = typedReviews.filter(r => !['Finalized', 'DOCX Generated'].includes(r.status))
  const completed = typedReviews.filter(r => ['Finalized', 'DOCX Generated'].includes(r.status))

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/talent" className="text-sm text-gray-400 hover:text-gray-600">← Talent</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{talent.name}</h1>
        </div>
        <Link href={`/reviews/new`}>
          <Button><Plus className="h-4 w-4" /> New Review</Button>
        </Link>
      </div>

      {talent.notes && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-600">{talent.notes}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Active Reviews ({active.length})</CardTitle></CardHeader>
        <CardContent>
          {active.length === 0
            ? <p className="text-sm text-gray-400">No active reviews.</p>
            : (
              <div className="divide-y divide-gray-100">
                {active.map(r => (
                  <Link key={r.id} href={`/reviews/${r.id}`} className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{r.brand}</p>
                      <p className="text-xs text-gray-400">{formatDate(r.created_at)}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </Link>
                ))}
              </div>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Completed Reviews ({completed.length})</CardTitle></CardHeader>
        <CardContent>
          {completed.length === 0
            ? <p className="text-sm text-gray-400">No completed reviews.</p>
            : (
              <div className="divide-y divide-gray-100">
                {completed.map(r => (
                  <Link key={r.id} href={`/reviews/${r.id}`} className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{r.brand}</p>
                      <p className="text-xs text-gray-400">{formatDate(r.created_at)}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </Link>
                ))}
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  )
}
