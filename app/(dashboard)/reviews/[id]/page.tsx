import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { ReviewDetail } from './ReviewDetail'
import type { Review, Redline } from '@/types/database'

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: review } = await supabase
    .from('reviews')
    .select('*, talent(name), redlines(*)')
    .eq('id', id)
    .order('created_at', { ascending: true, referencedTable: 'redlines' })
    .single()

  if (!review) notFound()

  const typedReview = review as Review & {
    talent: { name: string } | null
    redlines: Redline[]
  }

  return <ReviewDetail review={typedReview} />
}
