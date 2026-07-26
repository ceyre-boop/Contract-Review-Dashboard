import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/StatusBadge'
import { formatDate } from '@/lib/utils'
import { FileText, Users, Plus, Clock } from 'lucide-react'
import type { Review } from '@/types/database'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const [
    { data: reviews },
    { count: talentCount },
    { count: activeCount },
  ] = await Promise.all([
    supabase
      .from('reviews')
      .select('*, talent(name)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('talent').select('*', { count: 'exact', head: true }),
    supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .not('status', 'in', '("Finalized","DOCX Generated")'),
  ])

  const recentReviews = (reviews ?? []) as (Review & { talent: { name: string } | null })[]

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">TABOOST Contract Review</p>
        </div>
        <Link href="/reviews/new">
          <Button>
            <Plus className="h-4 w-4" />
            New Review
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{activeCount ?? 0}</p>
                <p className="text-sm text-gray-500">Active reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-50 p-2">
                <FileText className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{(reviews ?? []).length}</p>
                <p className="text-sm text-gray-500">Total reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-50 p-2">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{talentCount ?? 0}</p>
                <p className="text-sm text-gray-500">Talent profiles</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent reviews */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Reviews</CardTitle>
          <Link href="/reviews" className="text-sm text-gray-500 hover:text-gray-900">
            View all →
          </Link>
        </CardHeader>
        <CardContent>
          {recentReviews.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No reviews yet.</p>
              <Link href="/reviews/new">
                <Button variant="outline" size="sm" className="mt-3">Start your first review</Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentReviews.map(review => (
                <Link
                  key={review.id}
                  href={`/reviews/${review.id}`}
                  className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded-md transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {review.talent?.name ?? 'Unknown talent'} × {review.brand}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(review.created_at)}</p>
                  </div>
                  <StatusBadge status={review.status} />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
