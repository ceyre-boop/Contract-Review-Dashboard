import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { openai } from '@/lib/openai'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { instructions, reviewId } = await req.json()

  if (!instructions || !reviewId) {
    return NextResponse.json({ error: 'instructions and reviewId required' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const [{ data: redline }, { data: review }] = await Promise.all([
    supabase.from('redlines').select('*').eq('id', id).single(),
    supabase.from('reviews').select('openai_thread_id, openai_assistant_id').eq('id', reviewId).single(),
  ])

  if (!redline || !review) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!review.openai_thread_id || !review.openai_assistant_id) {
    return NextResponse.json({ error: 'No OpenAI thread available for this review' }, { status: 400 })
  }

  try {
    // Add revision request to the existing thread (single redline only)
    await openai.beta.threads.messages.create(review.openai_thread_id, {
      role: 'user',
      content: `Revise only redline ${redline.redline_id} ("${redline.issue_summary}").

Current proposed language:
${redline.proposed_language ?? '(none)'}

Revision instructions: ${instructions}

Return ONLY a JSON object with this exact shape:
{"redline_id": "${redline.redline_id}", "proposed_language": "<revised language>"}

Do not change any other redlines. Do not include any other text.`,
    })

    const run = await openai.beta.threads.runs.createAndPoll(review.openai_thread_id, {
      assistant_id: review.openai_assistant_id,
    })

    if (run.status !== 'completed') {
      throw new Error(`Revision run failed: ${run.status}`)
    }

    const messages = await openai.beta.threads.messages.list(review.openai_thread_id)
    const assistantMsg = messages.data[0]
    const rawContent = assistantMsg?.content[0]
    if (!rawContent || rawContent.type !== 'text') throw new Error('No response')

    const parsed = JSON.parse(rawContent.text.value)
    const newLanguage = parsed.proposed_language

    // Save to revision history and update proposed language
    const revisionHistory = [
      ...(redline.revision_history ?? []),
      {
        proposed_language: redline.proposed_language,
        instructions,
        revised_at: new Date().toISOString(),
      }
    ]

    await supabase.from('redlines').update({
      proposed_language: newLanguage,
      revision_history: revisionHistory,
    }).eq('id', id)

    return NextResponse.json({ proposed_language: newLanguage, revision_history: revisionHistory })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Revision failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
