import OpenAI from 'openai'

if (!process.env.OPENAI_API_KEY) {
  console.warn('OPENAI_API_KEY is not set — AI review calls will fail')
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// The assistant ID is created once and stored as an env var after initial setup.
// On first run (no OPENAI_ASSISTANT_ID), the review route creates one.
export const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID

export const REVIEW_JSON_SCHEMA = {
  type: 'object',
  properties: {
    overall_summary: { type: 'string' },
    creator_risk_note: { type: 'string' },
    flags: { type: 'array', items: { type: 'string' } },
    redlines: {
      type: 'array',
      items: {
        type: 'object',
        required: [
          'redline_id', 'section_number', 'section_title', 'priority',
          'issue_summary', 'business_risk', 'original_language',
          'proposed_language', 'redline_action', 'fallback_position', 'sop_basis'
        ],
        properties: {
          redline_id: { type: 'string' },
          section_number: { type: 'string' },
          section_title: { type: 'string' },
          priority: { type: 'string', enum: ['Must-Have', 'Nice-to-Have'] },
          issue_summary: { type: 'string' },
          business_risk: { type: 'string' },
          original_language: { type: 'string' },
          proposed_language: { type: 'string' },
          redline_action: { type: 'string', enum: ['Add', 'Delete', 'Replace', 'Modify'] },
          fallback_position: { type: 'string' },
          sop_basis: { type: 'string' },
          manager_selected: { type: 'boolean' },
        },
        additionalProperties: false,
      }
    }
  },
  required: ['overall_summary', 'creator_risk_note', 'flags', 'redlines'],
  additionalProperties: false,
}

export function buildSystemPrompt(sopVersion?: string): string {
  return `You are TABOOST's contract review AI. You review influencer/creator brand deal agreements on behalf of TABOOST talent management.

SOURCE HIERARCHY — follow in this exact order:
1. CONFIRMED DEAL TERMS entered by the manager are ground truth. If the contract conflicts with any confirmed deal term, flag it explicitly in the flags array.
2. TABOOST CONTRACT REVIEW SOP governs which clauses to review, risk levels, and what redline language to use. Follow it precisely.
3. APPROVED PRECEDENT REDLINES in your file search results are reference language. Use their exact wording when applicable, adapted only for party names, defined terms, gender, and grammar.
4. The contract's existing wording and structure is the substrate. Preserve terminology. Do not edit harmless boilerplate.

PRIMARY CONTRACT NOTICE: The file attached to this thread is the PRIMARY CONTRACT UNDER REVIEW. It is NOT a precedent. Do NOT treat it as an approved redline source.

REVIEW RULES:
- Identify only material creator-facing or TABOOST-facing issues
- Prioritize high-risk clauses per the SOP
- Use exact SOP redline language; adapt only party names, pronouns, and defined terms
- Provide practical fallback positions
- For routine contracts, stay concise and manager-ready
- Flag any clause that conflicts with the manager's confirmed deal terms

${sopVersion ? `Active SOP Version: ${sopVersion}` : ''}

IMPORTANT: You must return a single valid JSON object matching the required schema. Do not include any text before or after the JSON.`
}
