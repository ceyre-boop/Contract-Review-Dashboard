import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { openai, buildSystemPrompt, REVIEW_JSON_SCHEMA, ASSISTANT_ID } from '@/lib/openai'
import { INTERIM_SOP_VERSION } from '@/lib/interim-sop'
import type { AIReviewResponse } from '@/types/database'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Fetch review
  const { data: review, error: reviewError } = await supabase
    .from('reviews')
    .select('*')
    .eq('id', id)
    .single()

  if (reviewError || !review) {
    return NextResponse.json({ error: 'Review not found' }, { status: 404 })
  }

  try {
    // 1. Get active SOP version
    const { data: sopDoc } = await supabase
      .from('source_documents')
      .select('openai_file_id, version')
      .eq('type', 'SOP')
      .eq('is_active', true)
      .limit(1)
      .single()

    // 2. Get or create the OpenAI assistant
    let assistantId = ASSISTANT_ID
    if (!assistantId) {
      // Create assistant with vector store if file search is available
      const assistantParams: Parameters<typeof openai.beta.assistants.create>[0] = {
        name: 'TABOOST Contract Reviewer',
        instructions: buildSystemPrompt(sopDoc?.version),
        model: 'gpt-4o',
        tools: [{ type: 'file_search' }],
      }

      // Attach vector store if it exists
      if (process.env.OPENAI_VECTOR_STORE_ID) {
        assistantParams.tool_resources = {
          file_search: { vector_store_ids: [process.env.OPENAI_VECTOR_STORE_ID] }
        }
      }

      const assistant = await openai.beta.assistants.create(assistantParams)
      assistantId = assistant.id
      console.log(`Created assistant: ${assistantId} — add OPENAI_ASSISTANT_ID=${assistantId} to .env.local`)
    }

    // 3. Download the contract from Supabase Storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from('contracts')
      .download(review.contract_storage_path)

    if (fileError || !fileData) {
      throw new Error(`Could not download contract: ${fileError?.message}`)
    }

    // 4. Upload contract to OpenAI as a temporary file (NOT the vector store)
    const buffer = await fileData.arrayBuffer()
    const ext = review.contract_filename.endsWith('.pdf') ? 'pdf' : 'docx'
    const mimeType = ext === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

    const uploadedFile = await openai.files.create({
      file: new File([buffer], review.contract_filename, { type: mimeType }),
      purpose: 'assistants',
    })

    // 5. Create thread with contract attached and deal terms
    const dealTermsSummary = Object.entries(review.deal_terms)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
      .join('\n')

    const thread = await openai.beta.threads.create({
      messages: [
        {
          role: 'user',
          content: `Please review the attached contract for TABOOST.

CONFIRMED DEAL TERMS (ground truth — flag any conflicts with the contract):
${dealTermsSummary}

The attached file is the PRIMARY CONTRACT UNDER REVIEW. Review it against the deal terms above and the TABOOST SOP. Return your response as a single JSON object matching the required schema exactly.`,
          attachments: [
            {
              file_id: uploadedFile.id,
              tools: [{ type: 'file_search' }],
            }
          ]
        }
      ]
    })

    // 6. Run the thread
    const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistantId,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'contract_review',
          strict: true,
          schema: REVIEW_JSON_SCHEMA,
        }
      } as Parameters<typeof openai.beta.threads.runs.createAndPoll>[1]['response_format'],
    })

    if (run.status !== 'completed') {
      throw new Error(`Run ended with status: ${run.status}`)
    }

    // 7. Parse response
    const messages = await openai.beta.threads.messages.list(thread.id)
    const assistantMsg = messages.data.find(m => m.role === 'assistant')
    const rawContent = assistantMsg?.content[0]
    if (!rawContent || rawContent.type !== 'text') throw new Error('No text response from assistant')

    let parsed: AIReviewResponse
    try {
      parsed = JSON.parse(rawContent.text.value)
    } catch {
      // Retry once with corrective prompt
      const retryRun = await openai.beta.threads.runs.createAndPoll(thread.id, {
        assistant_id: assistantId,
        additional_instructions: 'Your previous response was not valid JSON. Return ONLY a valid JSON object matching the schema — no other text.',
      })
      if (retryRun.status !== 'completed') throw new Error('Retry run failed')
      const retryMessages = await openai.beta.threads.messages.list(thread.id)
      const retryMsg = retryMessages.data.find(m => m.role === 'assistant')
      const retryContent = retryMsg?.content[0]
      if (!retryContent || retryContent.type !== 'text') throw new Error('No text response on retry')
      parsed = JSON.parse(retryContent.text.value)
    }

    // 8. Save to database
    await supabase.from('reviews').update({
      status: 'Review Ready',
      overall_summary: parsed.overall_summary,
      creator_risk_note: parsed.creator_risk_note,
      openai_thread_id: thread.id,
      openai_assistant_id: assistantId,
      sop_version: sopDoc?.version ?? INTERIM_SOP_VERSION,
      model_used: 'gpt-4o',
    }).eq('id', id)

    if (parsed.redlines?.length) {
      await supabase.from('redlines').insert(
        parsed.redlines.map(r => ({
          review_id: id,
          redline_id: r.redline_id,
          section_number: r.section_number ?? null,
          section_title: r.section_title ?? null,
          priority: r.priority,
          issue_summary: r.issue_summary,
          business_risk: r.business_risk ?? null,
          original_language: r.original_language ?? null,
          proposed_language: r.proposed_language ?? null,
          redline_action: r.redline_action,
          fallback_position: r.fallback_position ?? null,
          sop_basis: r.sop_basis ?? null,
          manager_selected: false,
          revision_history: [],
        }))
      )
    }

    // 9. Clean up the temporary contract file from OpenAI
    await openai.files.delete(uploadedFile.id).catch(console.error)

    return NextResponse.json({ success: true, flags: parsed.flags })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Review run failed:', message)

    await supabase.from('reviews').update({
      status: 'Draft Intake',
      error_message: message,
    }).eq('id', id)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
