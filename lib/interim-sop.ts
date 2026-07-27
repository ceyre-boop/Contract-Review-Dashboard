/**
 * INTERIM SOP — PLACEHOLDER
 *
 * This is a temporary baseline standard used ONLY when no official TABOOST SOP
 * document has been uploaded and marked active in the Admin panel.
 *
 * It encodes widely-accepted creator/influencer agreement review standards so the
 * dashboard produces useful redlines from day one. It is NOT TABOOST's official
 * policy and carries no institutional authority.
 *
 * TO REPLACE: upload the real SOP via Admin → Upload New Document (type = SOP),
 * add it to the OpenAI vector store, and this interim standard is automatically
 * bypassed — the uploaded SOP takes over as the governing framework.
 */

export const INTERIM_SOP_VERSION = 'interim-v0.1 (placeholder)'

export const INTERIM_SOP = `
INTERIM REVIEW STANDARD (PLACEHOLDER — no official SOP uploaded yet)

Review the contract against the following baseline. Treat these as default
positions, not absolute rules. Where the manager's confirmed deal terms conflict
with the contract, the deal terms always win and the conflict must be flagged.

1. USAGE RIGHTS  — typically the highest-value issue
   - Organic-only usage should be the default unless paid usage was negotiated.
   - Any paid media / advertising usage must be time-boxed (commonly 3-6 months)
     and channel-limited. Flag perpetual, unlimited, or "in any and all media now
     known or hereafter devised" grants as Must-Have.
   - Flag any usage term longer than what the manager entered in deal terms.
   - Whitelisting / Spark Ads / dark posting must be called out explicitly and
     separately compensated. Flag if granted without mention in deal terms.

2. EXCLUSIVITY
   - Must be narrow in category, defined in scope, and limited in duration.
   - Flag category exclusivity broader than the specific product vertical.
   - Flag exclusivity extending materially beyond the campaign window.
   - Flag uncompensated exclusivity as Must-Have.

3. CONTENT OWNERSHIP & IP
   - Creator should retain ownership of the content; the brand receives a license.
   - Flag any full copyright assignment or work-for-hire language as Must-Have.
   - Moral rights waivers should be flagged.

4. PAYMENT TERMS
   - Confirm the rate matches the manager's confirmed deal terms exactly.
   - Net-30 from invoice is the default. Flag Net-60 or longer.
   - Flag payment contingent on performance metrics, brand "satisfaction,"
     approval at the brand's sole discretion, or post-campaign conditions.
   - Flag the absence of a kill fee where the brand can cancel.

5. APPROVALS & REVISIONS
   - Revision rounds should be capped (commonly 1-2).
   - Flag unlimited revisions or unlimited brand approval rights.
   - Approval timelines should be defined; flag open-ended approval windows.

6. TERMINATION
   - Flag brand-side termination-for-convenience without a kill fee.
   - Termination rights should be reciprocal where practical.
   - Flag any clause allowing termination after content is created without payment.

7. EXCLUSIVITY OF DELIVERABLES / RESHOOTS
   - Flag obligations to reshoot at the creator's expense.
   - Flag unlimited or undefined deliverable counts.

8. INDEMNIFICATION & LIABILITY
   - Creator indemnity should be limited to the creator's own content, conduct,
     and disclosure compliance — not the brand's product claims or safety.
   - Flag uncapped liability. Liability should be capped at fees paid.
   - Flag indemnity for the brand's product defects as Must-Have.

9. FTC / DISCLOSURE COMPLIANCE
   - The creator must be permitted to comply with FTC disclosure rules.
   - Flag any clause restricting or discouraging disclosure.

10. MORALITY / CONDUCT CLAUSES
   - Should be mutual and objectively defined.
   - Flag one-sided or subjectively-worded morality clauses ("conduct the brand
     deems objectionable") as Must-Have.

11. CONFIDENTIALITY
   - Should be mutual and time-limited.
   - Should not prevent the creator from disclosing the partnership itself.

12. GOVERNING LAW & DISPUTE RESOLUTION
   - Flag inconvenient forums and mandatory arbitration in distant jurisdictions
     as Nice-to-Have unless the amounts at stake are significant.

PRIORITIZATION GUIDANCE
- Must-Have: perpetual/unlimited usage, IP assignment, uncapped liability,
  uncompensated exclusivity, payment contingencies, brand-product indemnity.
- Nice-to-Have: payment timing, revision caps, forum selection, notice periods.

TONE
- Write proposed language as clean, insertable contract text.
- Keep issue summaries plain-language and manager-ready.
- Always provide a realistic fallback position for negotiation.
`.trim()
