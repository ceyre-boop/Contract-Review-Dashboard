'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Upload, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { Talent } from '@/types/database'

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export default function NewReviewPage() {
  const router = useRouter()
  const supabase = createClient()
  const [talent, setTalent] = useState<Talent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  const [form, setForm] = useState({
    talent_id: '',
    brand: '',
    // required deal terms
    rate: '',
    deliverables: '',
    agreed_usage: '',
    timeline: '',
    // optional
    commission: '',
    exclusivity: '',
    spark_ads: '',
    live_period: '',
    special_terms: '',
    brand_deadline: '',
    manager_notes: '',
  })

  useEffect(() => {
    supabase.from('talent').select('*').order('name').then(({ data }) => {
      setTalent(data ?? [])
    })
  }, [])

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm(prev => ({ ...prev, [field]: e.target.value }))
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError('Only PDF and DOCX files are accepted.')
      return
    }
    if (f.size > 52428800) {
      setError('File must be under 50 MB.')
      return
    }
    setError(null)
    setFile(f)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setError('Please upload the contract file.'); return }
    if (!confirmed) { setError('Please confirm this is a brand-new contract review.'); return }
    if (!form.brand || !form.rate || !form.deliverables || !form.agreed_usage || !form.timeline) {
      setError('Please fill in all required deal term fields.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 1. Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // 2. Upload contract to Supabase Storage
      const ext = file.name.split('.').pop()
      const storagePath = `${user.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(storagePath, file)
      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

      // 3. Create the review record
      const dealTerms = {
        rate: form.rate,
        deliverables: form.deliverables,
        agreed_usage: form.agreed_usage,
        timeline: form.timeline,
        ...(form.commission && { commission: form.commission }),
        ...(form.exclusivity && { exclusivity: form.exclusivity }),
        ...(form.spark_ads && { spark_ads: form.spark_ads }),
        ...(form.live_period && { live_period: form.live_period }),
        ...(form.special_terms && { special_terms: form.special_terms }),
        ...(form.brand_deadline && { brand_deadline: form.brand_deadline }),
        ...(form.manager_notes && { manager_notes: form.manager_notes }),
      }

      const { data: review, error: reviewError } = await supabase
        .from('reviews')
        .insert({
          talent_id: form.talent_id || null,
          manager_id: user.id,
          brand: form.brand,
          contract_storage_path: storagePath,
          contract_filename: file.name,
          deal_terms: dealTerms,
          status: 'Review Running',
        })
        .select()
        .single()

      if (reviewError || !review) throw new Error(reviewError?.message ?? 'Failed to create review')

      // 4. Trigger AI review (non-blocking — the review page polls for status)
      fetch(`/api/reviews/${review.id}/run`, { method: 'POST' }).catch(console.error)

      router.push(`/reviews/${review.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">New Contract Review</h1>
        <p className="text-sm text-gray-500 mt-1">
          Fill in all required fields. The AI review starts immediately after submission.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Contract upload */}
        <Card>
          <CardHeader>
            <CardTitle>Contract</CardTitle>
            <CardDescription>Upload the brand&apos;s agreement. PDF or DOCX only.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label
                htmlFor="contract-file"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors"
              >
                {file ? (
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm font-medium">{file.name}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-gray-500">
                    <Upload className="h-6 w-6" />
                    <span className="text-sm font-medium">Click to upload contract</span>
                    <span className="text-xs">PDF or DOCX · max 50 MB</span>
                  </div>
                )}
                <input
                  id="contract-file"
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Confirmation checkbox */}
            <label className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={e => setConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm text-amber-800 font-medium">
                This is a brand-new contract review. Do not rely on prior versions of this agreement.
              </span>
            </label>
          </CardContent>
        </Card>

        {/* Talent & brand */}
        <Card>
          <CardHeader>
            <CardTitle>Parties</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="talent">Talent</Label>
              <Select id="talent" value={form.talent_id} onChange={set('talent_id')}>
                <option value="">Select talent…</option>
                {talent.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
              <p className="text-xs text-gray-400">Add talent in the Talent section if not listed.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="brand">Brand <span className="text-red-500">*</span></Label>
              <Input id="brand" value={form.brand} onChange={set('brand')} placeholder="e.g. Nike" required />
            </div>
          </CardContent>
        </Card>

        {/* Required deal terms */}
        <Card>
          <CardHeader>
            <CardTitle>Deal Terms</CardTitle>
            <CardDescription>These are the confirmed terms. The AI will flag any conflicts with the contract.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="rate">Rate / Total Compensation <span className="text-red-500">*</span></Label>
                <Input id="rate" value={form.rate} onChange={set('rate')} placeholder="e.g. $5,000 flat fee" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="timeline">Timeline / Due Dates <span className="text-red-500">*</span></Label>
                <Input id="timeline" value={form.timeline} onChange={set('timeline')} placeholder="e.g. Post by March 15, 2025" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deliverables">Deliverables <span className="text-red-500">*</span></Label>
              <Textarea id="deliverables" value={form.deliverables} onChange={set('deliverables')} placeholder="e.g. 1 TikTok, 2 Instagram Reels, 3 Stories" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="agreed_usage">Agreed Usage <span className="text-red-500">*</span></Label>
              <Textarea id="agreed_usage" value={form.agreed_usage} onChange={set('agreed_usage')} placeholder="e.g. Paid social only, 6 months, no whitelisting" required />
            </div>
          </CardContent>
        </Card>

        {/* Optional deal terms */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Terms <span className="text-xs font-normal text-gray-400">(optional)</span></CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="commission">Commission</Label>
                <Input id="commission" value={form.commission} onChange={set('commission')} placeholder="e.g. 20%" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exclusivity">Exclusivity</Label>
                <Input id="exclusivity" value={form.exclusivity} onChange={set('exclusivity')} placeholder="e.g. No competing brands for 60 days" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="spark_ads">Spark Ads / Whitelisting</Label>
                <Input id="spark_ads" value={form.spark_ads} onChange={set('spark_ads')} placeholder="e.g. No Spark Ads agreed" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="live_period">Live Period Requirement</Label>
                <Input id="live_period" value={form.live_period} onChange={set('live_period')} placeholder="e.g. Content must stay live 30 days" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="brand_deadline">Brand Deadline</Label>
                <Input id="brand_deadline" type="date" value={form.brand_deadline} onChange={set('brand_deadline')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="special_terms">Special Negotiated Terms</Label>
              <Textarea id="special_terms" value={form.special_terms} onChange={set('special_terms')} placeholder="Any terms negotiated outside the standard deal…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="manager_notes">Internal Manager Notes</Label>
              <Textarea id="manager_notes" value={form.manager_notes} onChange={set('manager_notes')} placeholder="Notes for the AI reviewer…" />
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-4 py-3">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 pb-8">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Submitting…' : 'Submit for Review'}
          </Button>
        </div>
      </form>
    </div>
  )
}
