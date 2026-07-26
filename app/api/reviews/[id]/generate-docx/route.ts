import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, ShadingType,
} from 'docx'
import type { Redline, Review } from '@/types/database'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: review } = await supabase
    .from('reviews')
    .select('*, talent(name), redlines(*)')
    .eq('id', id)
    .single()

  if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 })

  const typedReview = review as Review & { talent: { name: string } | null; redlines: Redline[] }
  const selectedRedlines = typedReview.redlines.filter(r => r.manager_selected)

  if (selectedRedlines.length === 0) {
    return NextResponse.json({ error: 'No redlines selected' }, { status: 400 })
  }

  const doc = new Document({
    creator: 'TABOOST',
    title: `Redline Instructions — ${typedReview.talent?.name ?? 'Talent'} × ${typedReview.brand}`,
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1080, bottom: 1080, left: 1260, right: 1260 },
        },
      },
      children: [
        // Header notice
        new Paragraph({
          spacing: { before: 0, after: 200 },
          shading: { type: ShadingType.CLEAR, fill: 'FEF3C7' },
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 6, color: 'FCD34D' },
          },
          children: [
            new TextRun({
              text: 'REDLINE INSTRUCTIONS DOCUMENT',
              bold: true, size: 20, color: '92400E',
            }),
          ]
        }),
        new Paragraph({
          spacing: { before: 0, after: 400 },
          children: [new TextRun({
            text: 'This document contains TABOOST\'s proposed edits. It is NOT a fully redlined copy of the agreement. These are instructions to be negotiated with the brand.',
            size: 18, color: '6B7280', italics: true,
          })]
        }),

        // Title
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 0, after: 120 },
          children: [new TextRun({
            text: `${typedReview.talent?.name ?? 'Talent'} × ${typedReview.brand}`,
            bold: true, size: 28, color: '111827',
          })]
        }),
        new Paragraph({
          spacing: { before: 0, after: 80 },
          children: [new TextRun({ text: `Contract: ${typedReview.contract_filename}`, size: 20, color: '6B7280' })]
        }),
        new Paragraph({
          spacing: { before: 0, after: 80 },
          children: [new TextRun({ text: `Date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, size: 20, color: '6B7280' })]
        }),
        new Paragraph({
          spacing: { before: 0, after: 80 },
          children: [new TextRun({ text: `Selected Redlines: ${selectedRedlines.length} (${selectedRedlines.filter(r => r.priority === 'Must-Have').length} Must-Have, ${selectedRedlines.filter(r => r.priority === 'Nice-to-Have').length} Nice-to-Have)`, size: 20, color: '6B7280' })]
        }),

        // Overall summary
        ...(typedReview.overall_summary ? [
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 120 },
            children: [new TextRun({ text: 'Overall Assessment', bold: true, size: 24, color: '111827' })]
          }),
          new Paragraph({
            spacing: { before: 0, after: 400 },
            children: [new TextRun({ text: typedReview.overall_summary, size: 20, color: '374151' })]
          }),
        ] : []),

        // Redlines — Must-Have first
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 240 },
          children: [new TextRun({ text: 'Proposed Redlines', bold: true, size: 24, color: '111827' })]
        }),

        ...selectedRedlines
          .sort((a, b) => {
            if (a.priority === 'Must-Have' && b.priority !== 'Must-Have') return -1
            if (b.priority === 'Must-Have' && a.priority !== 'Must-Have') return 1
            return 0
          })
          .flatMap((redline, i): Paragraph[] => {
            const finalLanguage = redline.manager_edited_language ?? redline.proposed_language ?? ''
            return [
              // Redline header
              new Paragraph({
                spacing: { before: i === 0 ? 0 : 400, after: 80 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB' } },
                children: [
                  new TextRun({ text: `${redline.redline_id}  `, bold: true, size: 22, color: '111827' }),
                  ...(redline.section_number ? [new TextRun({ text: `§${redline.section_number} `, size: 20, color: '6B7280' })] : []),
                  ...(redline.section_title ? [new TextRun({ text: redline.section_title, size: 20, color: '6B7280' })] : []),
                ]
              }),
              // Priority + action
              new Paragraph({
                spacing: { before: 80, after: 80 },
                children: [
                  new TextRun({ text: `Priority: `, bold: true, size: 18, color: '374151' }),
                  new TextRun({
                    text: redline.priority,
                    bold: true, size: 18,
                    color: redline.priority === 'Must-Have' ? 'DC2626' : 'D97706',
                  }),
                  new TextRun({ text: `   Action: `, bold: true, size: 18, color: '374151' }),
                  new TextRun({ text: redline.redline_action, size: 18, color: '374151' }),
                ]
              }),
              // Issue summary
              new Paragraph({
                spacing: { before: 80, after: 80 },
                children: [
                  new TextRun({ text: 'Issue: ', bold: true, size: 20, color: '374151' }),
                  new TextRun({ text: redline.issue_summary, size: 20, color: '374151' }),
                ]
              }),
              // Business risk
              ...(redline.business_risk ? [new Paragraph({
                spacing: { before: 0, after: 80 },
                children: [
                  new TextRun({ text: 'Risk: ', bold: true, size: 18, color: '6B7280' }),
                  new TextRun({ text: redline.business_risk, size: 18, color: '6B7280', italics: true }),
                ]
              })] : []),
              // Original language
              ...(redline.original_language ? [
                new Paragraph({ spacing: { before: 120, after: 40 }, children: [new TextRun({ text: 'Original Language:', bold: true, size: 18, color: '374151' })] }),
                new Paragraph({
                  spacing: { before: 0, after: 80 },
                  indent: { left: 360 },
                  shading: { type: ShadingType.CLEAR, fill: 'FEE2E2' },
                  children: [new TextRun({ text: redline.original_language, size: 18, color: '7F1D1D', italics: true })]
                }),
              ] : []),
              // Proposed language
              new Paragraph({ spacing: { before: 80, after: 40 }, children: [new TextRun({ text: `Proposed Language${redline.manager_edited_language ? ' (Manager Edited)' : ''}:`, bold: true, size: 18, color: '374151' })] }),
              new Paragraph({
                spacing: { before: 0, after: 80 },
                indent: { left: 360 },
                shading: { type: ShadingType.CLEAR, fill: 'DCFCE7' },
                children: [new TextRun({ text: finalLanguage, size: 18, color: '14532D' })]
              }),
              // Fallback position
              ...(redline.fallback_position ? [
                new Paragraph({ spacing: { before: 80, after: 40 }, children: [new TextRun({ text: 'Fallback Position:', bold: true, size: 18, color: '374151' })] }),
                new Paragraph({
                  spacing: { before: 0, after: 80 },
                  indent: { left: 360 },
                  children: [new TextRun({ text: redline.fallback_position, size: 18, color: '6B7280' })]
                }),
              ] : []),
              // SOP basis
              ...(redline.sop_basis ? [new Paragraph({
                spacing: { before: 0, after: 80 },
                children: [
                  new TextRun({ text: 'SOP Basis: ', bold: true, size: 16, color: '9CA3AF' }),
                  new TextRun({ text: redline.sop_basis, size: 16, color: '9CA3AF', italics: true }),
                ]
              })] : []),
              // Manager note
              ...(redline.manager_note ? [new Paragraph({
                spacing: { before: 0, after: 80 },
                children: [
                  new TextRun({ text: 'Manager Note: ', bold: true, size: 16, color: '6B7280' }),
                  new TextRun({ text: redline.manager_note, size: 16, color: '6B7280' }),
                ]
              })] : []),
            ]
          }),

        // Creator risk note
        ...(typedReview.creator_risk_note ? [
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 600, after: 120 },
            children: [new TextRun({ text: 'Creator-Facing Risk Note', bold: true, size: 24, color: '111827' })]
          }),
          new Paragraph({
            spacing: { before: 0, after: 200 },
            children: [new TextRun({ text: typedReview.creator_risk_note, size: 20, color: '374151', italics: true })]
          }),
        ] : []),

        // Footer
        new Paragraph({
          spacing: { before: 600, after: 0 },
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB' } },
          children: [new TextRun({ text: 'TABOOST — Confidential & Internal Use Only', size: 16, color: 'D1D5DB' })]
        }),
      ]
    }]
  })

  const buffer = await Packer.toBuffer(doc)

  // Upload to Supabase Storage
  const filename = `${typedReview.talent?.name ?? 'talent'}_${typedReview.brand}_redlines_${Date.now()}.docx`
    .replace(/\s+/g, '_')
    .toLowerCase()

  const { error: uploadError } = await supabase.storage
    .from('generated-docs')
    .upload(filename, buffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Create a 15-minute presigned download URL
  const { data: signedUrl } = await supabase.storage
    .from('generated-docs')
    .createSignedUrl(filename, 900)

  await supabase.from('reviews').update({
    docx_storage_path: filename,
    status: 'DOCX Generated',
  }).eq('id', id)

  return NextResponse.json({ downloadUrl: signedUrl?.signedUrl })
}
