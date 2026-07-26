#!/usr/bin/env node
/**
 * TABOOST — OpenAI Setup Script
 *
 * Run this ONCE on your local machine (not the cloud):
 *   node scripts/setup-openai.js
 *
 * It will:
 *   1. Create an OpenAI vector store for SOP + precedent documents
 *   2. Create the TABOOST Contract Reviewer assistant bound to that store
 *   3. Print the IDs you need to paste into .env.local
 *
 * Prerequisites:
 *   - Node 18+ installed
 *   - npm install openai (or: node --input-type=module won't need it if you have it globally)
 *   - OPENAI_API_KEY set in your shell:
 *       export OPENAI_API_KEY="sk-proj-..."
 *     Or paste it directly in the OPENAI_API_KEY constant below (then delete it after).
 */

import OpenAI from 'openai'

// ── CONFIG ─────────────────────────────────────────────────────────────────
// Option A: set env var before running: export OPENAI_API_KEY="sk-proj-..."
// Option B: paste your key here temporarily (NEVER commit this file with a key in it)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''

const ASSISTANT_NAME = 'TABOOST Contract Reviewer'
const VECTOR_STORE_NAME = 'TABOOST SOP & Precedents'

// System prompt (mirrors lib/openai.ts buildSystemPrompt)
const SYSTEM_PROMPT = `You are an expert entertainment & influencer contract attorney working for TABOOST, a creator management company. Your job is to review brand partnership contracts on behalf of TABOOST's creator talent.

SOURCE HIERARCHY (in order of authority):
1. Confirmed Deal Terms provided by the manager — these are ground truth. Flag any contract language that conflicts.
2. TABOOST SOP (Standard Operating Procedures) — your primary review framework. Follow it exactly.
3. Approved Precedent Redlines — use these as validated fallback language when proposing alternatives.
4. Your general legal expertise — only for issues not covered by the above.

REVIEW MANDATE:
- Flag every clause that deviates from the deal terms or SOP
- Prioritize issues as "Must-Have" (non-negotiable) or "Nice-to-Have" (push for but can concede)
- For each issue, provide: the original language, your proposed replacement, a fallback position, and the SOP basis
- Write in plain language the manager can use directly in negotiations
- Be specific about section numbers when referencing contract clauses
- Flag creator-facing risks separately in creator_risk_note

OUTPUT: Return ONLY a valid JSON object matching the provided schema. No preamble, no explanation outside the JSON.`
// ───────────────────────────────────────────────────────────────────────────

async function main() {
  if (!OPENAI_API_KEY) {
    console.error('❌  OPENAI_API_KEY is not set.')
    console.error('   Run: export OPENAI_API_KEY="sk-proj-..." and try again.')
    process.exit(1)
  }

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

  console.log('🚀  TABOOST OpenAI Setup\n')

  // ── Step 1: Create vector store ──────────────────────────────────────────
  console.log('1/2  Creating vector store…')
  let vectorStore
  try {
    vectorStore = await openai.vectorStores.create({
      name: VECTOR_STORE_NAME,
      // expires_after can be set if desired, omit for no expiry
    })
    console.log(`     ✅  Vector store created: ${vectorStore.id}`)
    console.log(`     Name: "${vectorStore.name}"`)
    console.log()
  } catch (err) {
    console.error('❌  Failed to create vector store:', err.message)
    process.exit(1)
  }

  // ── Step 2: Create assistant ─────────────────────────────────────────────
  console.log('2/2  Creating assistant…')
  let assistant
  try {
    assistant = await openai.beta.assistants.create({
      name: ASSISTANT_NAME,
      instructions: SYSTEM_PROMPT,
      model: 'gpt-4o',
      tools: [{ type: 'file_search' }],
      tool_resources: {
        file_search: {
          vector_store_ids: [vectorStore.id],
        },
      },
    })
    console.log(`     ✅  Assistant created: ${assistant.id}`)
    console.log(`     Name: "${assistant.name}"`)
    console.log()
  } catch (err) {
    console.error('❌  Failed to create assistant:', err.message)
    console.error('   Vector store was created successfully — its ID is:', vectorStore.id)
    console.error('   Create the assistant manually at platform.openai.com → Assistants')
    process.exit(1)
  }

  // ── Done: print .env.local values ────────────────────────────────────────
  console.log('═'.repeat(60))
  console.log('✅  Setup complete! Add these lines to your .env.local:\n')
  console.log(`OPENAI_ASSISTANT_ID=${assistant.id}`)
  console.log(`OPENAI_VECTOR_STORE_ID=${vectorStore.id}`)
  console.log()
  console.log('═'.repeat(60))
  console.log()
  console.log('NEXT STEPS:')
  console.log('  1. Copy both lines above into .env.local')
  console.log('  2. Go to platform.openai.com → Storage → Vector stores')
  console.log(`     → Select "${VECTOR_STORE_NAME}" (${vectorStore.id})`)
  console.log('     → Upload your TABOOST SOP document (PDF or DOCX)')
  console.log('     → Upload any approved precedent redline documents')
  console.log('  3. Restart your Next.js dev server (or redeploy to Vercel)')
  console.log('  4. Run your first contract review — the assistant is ready!')
  console.log()
  console.log('NOTE: You can also upload SOP/precedents via the Admin page')
  console.log('      in the dashboard, then add them to the vector store at')
  console.log('      platform.openai.com → Storage → Vector stores.')
}

main()
