# Design QA

Date: 2026-08-26

## Visual truth

- Reference: `/var/folders/_q/9k2kln4x09v4_hlpw3fhwytr0000gn/T/TemporaryItems/NSIRD_screencaptureui_O079PM/Screenshot 2026-08-26 at 5.13.09 PM.png`
- Reference dimensions: 613 × 508 px.
- Reference state: desktop landing-page hero preview with the Approve stage highlighted and the proposed-patch panel visible.

## Implementation evidence

- Primary implementation capture: `/tmp/mend-image-to-code-landing.png`.
- Primary capture dimensions: 585 × 772 px, cropped from the local page at `http://localhost:3000/`.
- Browser viewport: 1280 × 720 CSS px, device pixel ratio 1. The focused hero preview measured 585.1 × 772.3 CSS px.
- Same-input comparison: `/tmp/mend-design-qa-comparison.jpg`, pairing the 613 × 508 reference with the implementation's matching 585 × 508 top region at native density.
- Verification interaction capture: `/tmp/mend-image-to-code-landing-verify.png`, showing the Verify stage selected and the before/after result panel.
- Responsive capture: `/tmp/mend-landing-mobile-workflow.png`, checked at 390 × 844 CSS px with device pixel ratio 1.

## Comparison history

### Initial P1 finding

The hero workflow copy was too small and the stage rows were static. The reference also had a clear active stage, while the implementation did not give the user a way to explore the workflow.

### P1 fix

- Moved the readability layer outside the legacy ultra-wide media block so it applies to normal viewports.
- Increased body, label, workflow, preview, and issue-detail typography while preserving the existing Mend scrapbook aesthetic.
- Converted the four workflow rows into accessible buttons with selected, complete, and pending states.
- Added a dynamic preview panel that changes its explanation, code context, badge, and footer as the selected stage changes.

### Post-fix result

The side-by-side comparison shows readable stage titles and subtitles, an unambiguous selected stage, and a legible proposed-patch panel. The mobile capture confirms the rows fit within the narrow content column without horizontal overflow. No P0, P1, or P2 findings remain for this requested area.

## Surface review

- Typography: larger, darker, sentence-case workflow copy with readable line height and wrapping.
- Layout and spacing: the hero preview remains aligned with the landing layout; the focus panel has enough room for its explanatory copy.
- Color and tokens: existing DNM red, gold, ink, green, lavender, grid, and paper palette are preserved.
- Assets: no new imagery was needed; existing product marks and icon components remain in use.
- Copy and content: each stage now explains its purpose and the selected stage exposes a matching next action.
- Icons and controls: existing icons are preserved; workflow rows are keyboard-focusable buttons with `aria-pressed`.
- States and interaction: Scan, Understand, Approve, and Verify were each clicked and confirmed to update the preview. Verify showed the before/after state and `VERIFIED` badge.
- Accessibility: selected-state semantics are present, the preview uses `aria-live="polite"`, and no browser console errors or warnings were reported during QA.

## Final result

final result: passed
