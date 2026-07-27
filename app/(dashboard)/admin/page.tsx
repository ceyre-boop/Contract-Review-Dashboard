'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Upload, CheckCircle2, XCircle, FileText } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { SourceDocument } from '@/types/database'

const ACCEPTED = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export default function AdminPage() {
  const supabase = createClient()
  const [docs, setDocs] = useState<SourceDocument[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [docType, setDocType] = useState<'SOP' | 'Precedent'>('SOP')
  const [label, setLabel] = useState('')
  const [clauseType, setClauseType] = useState('')
  const [version, setVersion] = useState('v1.0')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('source_documents').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setDocs(data as SourceDocument[] ?? [])
    })
  }, [])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!ACCEPTED.includes(f.type)) { setError('PDF or DOCX only'); return }
    setError(null)
    setFile(f)
    if (!label) setLabel(f.name.replace(/\.[^.]+$/, ''))
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !label) { setError('File and label are required'); return }
    setLoading(true); setError(null); setSuccess(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const ext = file.name.split('.').pop()
      const path = `${docType.toLowerCase()}/${Date.now()}_${version}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('source-documents')
        .upload(path, file)
      if (uploadError) throw new Error(uploadError.message)

      // If new SOP — deactivate all previous SOPs
      if (docType === 'SOP') {
        await supabase
          .from('source_documents')
          .update({ is_active: false, deactivated_at: new Date().toISOString() })
          .eq('type', 'SOP')
          .eq('is_active', true)
      }

      const { data: newDoc } = await supabase.from('source_documents').insert({
        type: docType,
        label,
        clause_type: clauseType || null,
        storage_path: path,
        version,
        is_active: true,
        approved_at: new Date().toISOString(),
        approved_by: user.id,
      }).select().single()

      if (newDoc) {
        setDocs(prev => [newDoc as SourceDocument, ...prev])
        setSuccess(`"${label}" uploaded successfully. Add it to your OpenAI vector store using the file at: ${path}`)
        setFile(null); setLabel(''); setClauseType(''); setVersion('v1.0')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  async function toggleActive(doc: SourceDocument) {
    const newActive = !doc.is_active
    await supabase.from('source_documents').update({
      is_active: newActive,
      deactivated_at: newActive ? null : new Date().toISOString(),
    }).eq('id', doc.id)
    setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, is_active: newActive, deactivated_at: newActive ? null : new Date().toISOString() } : d))
  }

  const sops = docs.filter(d => d.type === 'SOP')
  const precedents = docs.filter(d => d.type === 'Precedent')

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin — Source Documents</h1>
        <p className="text-sm text-gray-500 mt-1">Manage the SOP and approved precedent documents used in AI reviews.</p>
      </div>

      {/* Upload form */}
      <Card>
        <CardHeader>
          <CardTitle>Upload New Document</CardTitle>
          <CardDescription>Uploading a new SOP will automatically deactivate the previous version.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Document type</Label>
                <Select value={docType} onChange={e => setDocType(e.target.value as 'SOP' | 'Precedent')}>
                  <option value="SOP">SOP</option>
                  <option value="Precedent">Precedent</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Version</Label>
                <Input value={version} onChange={e => setVersion(e.target.value)} placeholder="v1.0" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Label</Label>
              <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. TABOOST Contract Review SOP" required />
            </div>
            {docType === 'Precedent' && (
              <div className="space-y-1.5">
                <Label>Clause type</Label>
                <Input value={clauseType} onChange={e => setClauseType(e.target.value)} placeholder="e.g. Usage Rights, Exclusivity, Termination" />
              </div>
            )}
            <div>
              <label
                htmlFor="source-file"
                className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors"
              >
                {file
                  ? <div className="flex items-center gap-2 text-green-700"><CheckCircle2 className="h-4 w-4" /><span className="text-sm">{file.name}</span></div>
                  : <div className="text-center text-gray-400"><Upload className="h-5 w-5 mx-auto mb-1" /><span className="text-sm">Click to upload PDF or DOCX</span></div>
                }
                <input id="source-file" type="file" accept=".pdf,.docx" onChange={handleFile} className="hidden" />
              </label>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">{success}</div>}

            <Button type="submit" disabled={loading || !file}>
              {loading ? 'Uploading…' : 'Upload document'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Interim SOP warning */}
      {sops.filter(d => d.is_active).length === 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-4">
            <p className="text-sm font-semibold text-amber-900 mb-1">
              ⚠️ No official SOP uploaded — interim standard in effect
            </p>
            <p className="text-sm text-amber-800">
              Reviews are currently running against a built-in placeholder standard
              covering usage rights, exclusivity, IP, payment, indemnity, and other
              common creator-contract issues. Redlines generated this way are marked{' '}
              <code className="bg-amber-100 px-1 rounded">[INTERIM]</code> in their SOP
              basis. They are <strong>not</strong> TABOOST official policy. Upload the
              real SOP above to replace it.
            </p>
          </CardContent>
        </Card>
      )}

      {/* OpenAI setup reminder */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <p className="text-sm font-semibold text-blue-800 mb-1">OpenAI Vector Store Setup</p>
          <p className="text-sm text-blue-700">
            After uploading documents here, you need to add them to your OpenAI vector store manually (or via the OpenAI Platform UI).
            Add <code className="bg-blue-100 px-1 rounded">OPENAI_VECTOR_STORE_ID</code> and <code className="bg-blue-100 px-1 rounded">OPENAI_ASSISTANT_ID</code> to your <code className="bg-blue-100 px-1 rounded">.env.local</code> file.
            See the setup guide in the repository README.
          </p>
        </CardContent>
      </Card>

      {/* SOP list */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">SOPs</h2>
        <div className="space-y-2">
          {sops.length === 0
            ? <p className="text-sm text-gray-400">No SOP uploaded yet.</p>
            : sops.map(doc => (
              <Card key={doc.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{doc.label}</p>
                      <p className="text-xs text-gray-400">{doc.version} · {formatDate(doc.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={doc.is_active ? 'default' : 'secondary'}>
                      {doc.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => toggleActive(doc)}>
                      {doc.is_active ? <XCircle className="h-4 w-4 text-red-400" /> : <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          }
        </div>
      </div>

      <Separator />

      {/* Precedents list */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Precedent Redlines</h2>
        <div className="space-y-2">
          {precedents.length === 0
            ? <p className="text-sm text-gray-400">No precedent documents uploaded yet.</p>
            : precedents.map(doc => (
              <Card key={doc.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{doc.label}</p>
                      <p className="text-xs text-gray-400">
                        {doc.clause_type && <span className="mr-2 text-purple-600">{doc.clause_type}</span>}
                        {doc.version} · {formatDate(doc.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={doc.is_active ? 'default' : 'secondary'}>
                      {doc.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => toggleActive(doc)}>
                      {doc.is_active ? <XCircle className="h-4 w-4 text-red-400" /> : <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          }
        </div>
      </div>
    </div>
  )
}
