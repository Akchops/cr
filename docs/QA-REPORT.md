# QA report — Carriagetown Detailing concept

Rendered and inspected in Chromium (Playwright) at **1440**, **768**, **390** and **360** px,
plus a **reduced-motion** pass and a **JavaScript-disabled** pass.
Harness: `scripts/qa.mjs` → `npm run qa`. Raw output: `qa/qa-report.txt`.
Screenshots: `qa/screenshots/`.

## Result

**P0: 0 · P1: 0** on the final run.

Automated assertions, all passing:

| Check | Result |
|---|---|
| Horizontal overflow at every breakpoint | none |
| `tel:` href is exactly `+19785726344` (one distinct number) | pass |
| `sms:` href is exactly `+19784904139` (one distinct number) | pass |
| Every in-page anchor resolves to a real target | pass |
| Broken images with no pending panel | none |
| Self-hosted Barlow Condensed + Inter actually load and apply | pass |
| Tap targets ≥ 44 px | pass |
| Exactly one `<h1>`; `main`/`nav`/`footer` landmarks present | pass |
| `robots` = noindex, nofollow, noarchive | pass |
| No `LocalBusiness` / structured data | pass |
| Footer disclaimer matches the required sentence exactly and renders legibly | pass |
| Sticky call bar height reserved in body padding (covers no content) | pass |
| Mobile menu opens, Escape closes, focus returns to the button | pass |
| Sticky header stays pinned at the page bottom | pass |
| Reduced motion: nothing hidden, stage unpinned | pass |
| No JS: h1, contact and disclaimer still visible | pass |
| Console errors other than the blocked photos | none |

## Defects found by inspection and fixed

1. **P0 — sticky header detached mid-page.** `overflow-x: hidden` on `body` turned it
   into a scroll container and broke `position: sticky`. Replaced with `overflow-x: clip`
   on `html`/`body`. A regression assertion now checks header offset at the page bottom.
2. **P1 — background word `DETAIL` was invisible** (0.035 alpha, fully behind the photo
   frame). Given its own band above the frame at 0.062 alpha, desktop only; hidden under
   960 px where it sat behind the headline and cost legibility.
3. **P1 — services rows were tall and hollow**, index `01` stranded at the top of a
   460 px row. Images moved to 16:9, index vertically centred with the service name.
4. **P1 — pinned stage was left-heavy**, with an empty right third. Caption moved beside
   the frame: index | image | caption.
5. **P1 — work section opened with a ~360 px void** between the lede and the stage.
   Tightened the heading margin and raised the stage height.
6. **P1 — wordmark tap target 35 px.** Now 44 px.
7. **P1 — closing-section pending label collided** with the headline and CTA on 360 px.
   That crop is decorative, so its label is suppressed there.
8. **P1 — image frames on the light services surface flashed dark** before load.
   Frame background now matches the surface.
9. **P1 — portrait interior photo was being cropped to a wide frame** in services row 01.
   Swapped to a landscape interior; row 03 takes the glossy exterior.

## Verified by hand in the rendered output

- Vehicle crops are intentional at every breakpoint; no clipped headline, no empty panel.
- Header, both contact actions and all five anchors work.
- Text and call numbers are visibly labelled and distinct, and both appear as copyable
  text as well as links.
- No pinned scroll trap on mobile — the stage only pins at ≥ 960 px.
- Focus rings are visible on the dark and light surfaces.

## Not tested, and why

- **The photographs themselves.** `img1.wsimg.com` is blocked by this session's egress
  policy, so no vehicle image could be downloaded, optimised or visually judged. Crops,
  art direction and the hero weight budget are therefore **unverified**. Every slot holds
  the correct aspect ratio and a labelled pending panel instead.
- **Real iOS/Android handsets.** `sms:` and `tel:` are correct in markup and verified in
  Chromium, but dialler/messaging hand-off was not exercised on a physical device.
  Both numbers are shown as plain copyable text as a fallback.
- **Transfer budget.** The hero (< 300 KB) and initial-load (1–1.5 MB) targets cannot be
  measured until the photographs exist. Current fixed payload is ~270 KB
  (fonts 124 KB, GSAP + ScrollTrigger 118 KB, CSS/HTML/JS ~28 KB).
