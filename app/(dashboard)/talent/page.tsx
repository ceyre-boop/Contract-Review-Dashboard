'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Users, Plus, X } from 'lucide-react'
import type { Talent } from '@/types/database'

export default function TalentPage() {
  const supabase = createClient()
  const [talent, setTalent] = useState<Talent[]>([])
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('talent').select('*').order('name').then(({ data }) => setTalent(data ?? []))
  }, [])

  async function addTalent() {
    if (!newName.trim()) return
    setLoading(true)
    const { data } = await supabase.from('talent').insert({ name: newName.trim() }).select().single()
    if (data) {
      setTalent(prev => [...prev, data as Talent].sort((a, b) => a.name.localeCompare(b.name)))
      setNewName('')
      setAdding(false)
    }
    setLoading(false)
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Talent</h1>
          <p className="text-sm text-gray-500 mt-1">{talent.length} profiles</p>
        </div>
        <Button onClick={() => setAdding(true)} disabled={adding}>
          <Plus className="h-4 w-4" /> Add Talent
        </Button>
      </div>

      {adding && (
        <Card className="mb-4 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-1.5">
                <Label>Talent name</Label>
                <Input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Jane Smith"
                  onKeyDown={e => e.key === 'Enter' && addTalent()}
                  autoFocus
                />
              </div>
              <Button onClick={addTalent} disabled={loading}>
                {loading ? 'Adding…' : 'Add'}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setAdding(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {talent.length === 0 && !adding ? (
        <Card>
          <CardContent className="text-center py-16 text-gray-400">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No talent profiles yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {talent.map(t => (
            <Link key={t.id} href={`/talent/${t.id}`}>
              <Card className="hover:border-gray-300 transition-colors cursor-pointer">
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                    {t.notes && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-md">{t.notes}</p>}
                  </div>
                  <span className="text-xs text-gray-400">View reviews →</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
