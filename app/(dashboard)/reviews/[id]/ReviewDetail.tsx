'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge, PriorityBadge, ActionBadge } from '@/components/StatusBadge'
import { Separator } from '@/components/ui/separator'
import {
  CheckCircle2, XCircle, Edit3, RotateCcw, Plus,
  Download, AlertTriangle, Loader2, ChevronDown, ChevronUp
} from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import type { Review, Redline } from '@/types/database'

interface Props {
  review: Review & { talent: { name: string } | null; redlines: Redline[] }
}

interface RedlineCardProps {
  redline: Redline
  onToggle: (id: string, selected: boolean) => void
  onEditLanguage: (id: string, lang: string) => void
  onAddNote: (id: string, note: string) => void
  onRevise: (id: string, instructions: string) => void
}

function RedlineCard({ redline, onToggle, onEditLanguage, onAddNote, onRevise }: RedlineCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [editingLang, setEditingLang] = useState(false)
  const [lang, setLang] = useState(redline.manager_edited_language ?? redline.proposed_language ?? '')
  const [note, setNote] = useState(redline.manager_note ?? '')
  const [reviseInstructions, setReviseInstructions] = useState('')
  const [revising, setRevising] = useState(false)
  const [showRevise, setShowRevise] = useState(false)

  async function handleRevise() {
    if (!reviseInstructions.trim()) return
    setRevising(true)
    await onRevise(redline.id, reviseInstructions)
    setRevising(false)
    setShowRevise(false)
    setReviseInstructions('')
  }

  const displayLang = redline.manager_edited_language ?? redline.proposed_language

  return (
    <div className={`rounded-lg border-2 transition-colors ${
      redline.manager_selected
        ? 'border-green-300 bg-green-50'
        : 'border-gray-200 bg-white'
    }`}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <button
              onClick={() => onToggle(redline.id, !redline.manager_selected)}
              className="mt-0.5 shrink-0"
            >
              {redline.manager_selected
                ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                : <div className="h-5 w-5 rounded-full border-2 border-gray-300 hover:border-gray-500 transition-colors" />
              }
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono text-gray-400">{redline.redline_id}</span>
                {redline.section_number && (
                  <span className="text-xs text-gray-400">§{redline.section_number}</span>
                )}
                {redline.section_title && (
                  <span className="text-xs font-medium text-gray-600">{redline.section_title}</span>
                )}
                <PriorityBadge priority={redline.priority} />
                <ActionBadge action={redline.redline_action} />
              </div>
              <p className="mt-1.5 text-sm font-medium text-gray-900">{redline.issue_summary}</p>
              {redline.business_risk && (
                <p className="mt-1 text-xs text-gray-500">{redline.business_risk}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          {redline.original_language && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Original Language</p>
              <p className="text-sm text-gray-600 bg-red-50 border border-red-100 rounded px-3 py-2 italic">
                {redline.original_language}
              </p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Proposed Language</p>
              <button
                onClick={() => setEditingLang(!editingLang)}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
              >
                <Edit3 className="h-3 w-3" />
                {editingLang ? 'Done editing' : 'Edit'}
              </button>
            </div>
            {editingLang ? (
              <div className="space-y-2">
                <Textarea
                  value={lang}
                  onChange={e => setLang(e.target.value)}
                  className="text-sm min-h-[100px]"
                />
                <Button size="sm" onClick={() => { onEditLanguage(redline.id, lang); setEditingLang(false) }}>
                  Save language
                </Button>
              </div>
            ) : (
              <p className="text-sm text-gray-800 bg-green-50 border border-green-100 rounded px-3 py-2">
                {displayLang}
              </p>
            )}
            {redline.manager_edited_language && (
              <p className="text-xs text-blue-600 mt-1">✎ Manager edited</p>
            )}
          </div>

          {redline.fallback_position && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Fallback Position</p>
              <p className="text-sm text-gray-600">{redline.fallback_position}</p>
            </div>
          )}

          {redline.sop_basis && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">SOP Basis</p>
              <p className="text-sm text-gray-500 italic">{redline.sop_basis}</p>
            </div>
          )}

          {/* Note */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Internal Note</p>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              onBlur={() => onAddNote(redline.id, note)}
              placeholder="Add a note for your records…"
              className="text-sm min-h-[60px]"
            />
          </div>

          {/* Revise */}
          <div>
            <button
              onClick={() => setShowRevise(!showRevise)}
              className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800"
            >
              <RotateCcw className="h-3 w-3" />
              Revise this redline with AI
            </button>
            {showRevise && (
              <div className="mt-2 space-y-2">
                <Textarea
                  value={reviseInstructions}
                  onChange={e => setReviseInstructions(e.target.value)}
                  placeholder="e.g. make this narrower, use exact SOP language, make it more brand-friendly…"
                  className="text-sm min-h-[60px]"
                />
                <Button size="sm" onClick={handleRevise} disabled={revising} variant="secondary">
                  {revising ? <><Loader2 className="h-3 w-3 animate-spin" /> Revising…</> : 'Send revision request'}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function ReviewDetail({ review: initialReview }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [review, setReview] = useState(initialReview)
  const [generatingDocx, setGeneratingDocx] = useState(false)
  const [customRedlineText, setCustomRedlineText] = useState('')
  const [addingCustom, setAddingCustom] = useState(false)

  // Poll for status while review is running
  useEffect(() => {
    if (review.status !== 'Review Running') return

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('reviews')
        .select('*, talent(name), redlines(*)')
        .eq('id', review.id)
        .order('created_at', { ascending: true, referencedTable: 'redlines' })
        .single()

      if (data && data.status !== 'Review Running') {
        setReview(data as typeof review)
        clearInterval(interval)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [review.status, review.id, supabase])

  const toggleRedline = useCallback(async (redlineId: string, selected: boolean) => {
    await supabase.from('redlines').update({ manager_selected: selected }).eq('id', redlineId)
    setReview(prev => ({
      ...prev,
      redlines: prev.redlines!.map(r => r.id === redlineId ? { ...r, manager_selected: selected } : r)
    }))
  }, [supabase])

  const editLanguage = useCallback(async (redlineId: string, lang: string) => {
    await supabase.from('redlines').update({ manager_edited_language: lang }).eq('id', redlineId)
    setReview(prev => ({
      ...prev,
      redlines: prev.redlines!.map(r => r.id === redlineId ? { ...r, manager_edited_language: lang } : r)
    }))
  }, [supabase])

  const addNote = useCallback(async (redlineId: string, note: string) => {
    await supabase.from('redlines').update({ manager_note: note }).eq('id', redlineId)
  }, [supabase])

  const reviseRedline = useCallback(async (redlineId: string, instructions: string) => {
    const res = await fetch(`/api/redlines/${redlineId}/revise`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instructions, reviewId: review.id }),
    })
    if (res.ok) {
      const { proposed_language, revision_history } = await res.json()
      setReview(prev => ({
        ...prev,
        redlines: prev.redlines!.map(r =>
          r.id === redlineId ? { ...r, proposed_language, revision_history } : r
        )
      }))
    }
  }, [review.id, supabase])

  const selectAllMustHave = async () => {
    const mustHaveIds = review.redlines?.filter(r => r.priority === 'Must-Have').map(r => r.id) ?? []
    await supabase.from('redlines').update({ manager_selected: true }).in('id', mustHaveIds)
    setReview(prev => ({
      ...prev,
      redlines: prev.redlines!.map(r =>
        r.priority === 'Must-Have' ? { ...r, manager_selected: true } : r
      )
    }))
  }

  const approveAndGenerate = async () => {
    setGeneratingDocx(true)
    await supabase.from('reviews').update({ status: 'Redlines Approved' }).eq('id', review.id)
    const res = await fetch(`/api/reviews/${review.id}/generate-docx`, { method: 'POST' })
    if (res.ok) {
      const { downloadUrl } = await res.json()
      await supabase.from('reviews').update({ status: 'DOCX Generated' }).eq('id', review.id)
      setReview(prev => ({ ...prev, status: 'DOCX Generated' }))
      if (downloadUrl) window.open(downloadUrl, '_blank')
    }
    setGeneratingDocx(false)
  }

  const selectedCount = review.redlines?.filter(r => r.manager_selected).length ?? 0
  const mustHaveCount = review.redlines?.filter(r => r.priority === 'Must-Have').length ?? 0
  const mustHaveSelected = review.redlines?.filter(r => r.priority === 'Must-Have' && r.manager_selected).length ?? 0

  if (review.status === 'Review Running') {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {review.talent?.name ?? 'Unknown'} × {review.brand}
            </h1>
            <StatusBadge status={review.status} />
          </div>
          <p className="text-sm text-gray-500">{review.contract_filename}</p>
        </div>
        <Card>
          <CardContent className="py-16 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">AI review in progress…</p>
            <p className="text-sm text-gray-400 mt-1">This usually takes 30–90 seconds. This page updates automatically.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (review.status === 'Draft Intake' || review.error_message) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{review.brand}</h1>
          <StatusBadge status={review.status} />
        </div>
        <Card className="border-red-200">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-4" />
            <p className="text-gray-700 font-medium">
              {review.error_message ?? 'The review has not been run yet.'}
            </p>
            <Button
              className="mt-4"
              onClick={() => fetch(`/api/reviews/${review.id}/run`, { method: 'POST' }).then(() => router.refresh())}
            >
              Run review
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {review.talent?.name ?? 'Unknown'} × {review.brand}
            </h1>
            <StatusBadge status={review.status} />
          </div>
          <p className="text-sm text-gray-500">
            {review.contract_filename} · {formatDateTime(review.created_at)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={selectAllMustHave}
            disabled={mustHaveSelected === mustHaveCount}
          >
            Select all Must-Have
          </Button>
          <Button
            size="sm"
            onClick={approveAndGenerate}
            disabled={selectedCount === 0 || generatingDocx}
          >
            {generatingDocx
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
              : <><Download className="h-4 w-4" /> Approve & Generate DOCX ({selectedCount})</>
            }
          </Button>
        </div>
      </div>

      {/* Overall summary */}
      {review.overall_summary && (
        <Card>
          <CardHeader><CardTitle className="text-base">Overall Assessment</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">{review.overall_summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Creator risk note */}
      {review.creator_risk_note && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800 mb-1">Creator-Facing Risk Note</p>
                <p className="text-sm text-amber-700">{review.creator_risk_note}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Redline progress */}
      <div className="flex items-center gap-4 text-sm text-gray-600">
        <span>{selectedCount} of {review.redlines?.length ?? 0} redlines selected</span>
        <Separator orientation="vertical" className="h-4" />
        <span>{mustHaveSelected}/{mustHaveCount} Must-Have selected</span>
      </div>

      {/* Redline cards */}
      <div className="space-y-3">
        {/* Must-Have first */}
        {['Must-Have', 'Nice-to-Have'].map(priority => {
          const group = review.redlines?.filter(r => r.priority === priority) ?? []
          if (group.length === 0) return null
          return (
            <div key={priority}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {priority} ({group.length})
              </h2>
              <div className="space-y-3">
                {group.map(redline => (
                  <RedlineCard
                    key={redline.id}
                    redline={redline}
                    onToggle={toggleRedline}
                    onEditLanguage={editLanguage}
                    onAddNote={addNote}
                    onRevise={reviseRedline}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Custom redline */}
      <Card className="border-dashed">
        <CardContent className="pt-4">
          {addingCustom ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Add a custom redline</p>
              <Textarea
                value={customRedlineText}
                onChange={e => setCustomRedlineText(e.target.value)}
                placeholder="Describe the custom edit you want to add…"
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setAddingCustom(false)}>Cancel</Button>
                <Button size="sm" onClick={async () => {
                  if (!customRedlineText.trim()) return
                  const { data } = await supabase.from('redlines').insert({
                    review_id: review.id,
                    redline_id: `CUSTOM-${Date.now()}`,
                    priority: 'Must-Have',
                    issue_summary: customRedlineText,
                    redline_action: 'Modify',
                    manager_selected: true,
                    revision_history: [],
                  }).select().single()
                  if (data) {
                    setReview(prev => ({ ...prev, redlines: [...(prev.redlines ?? []), data as Redline] }))
                    setCustomRedlineText('')
                    setAddingCustom(false)
                  }
                }}>Add redline</Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingCustom(true)}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors w-full"
            >
              <Plus className="h-4 w-4" />
              Add a custom redline
            </button>
          )}
        </CardContent>
      </Card>

      {/* Bottom approve */}
      <div className="flex justify-end pb-8">
        <Button
          onClick={approveAndGenerate}
          disabled={selectedCount === 0 || generatingDocx}
          size="lg"
        >
          {generatingDocx
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating DOCX…</>
            : <><Download className="h-4 w-4" /> Approve & Generate DOCX</>
          }
        </Button>
      </div>
    </div>
  )
}
