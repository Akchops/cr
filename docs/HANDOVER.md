# Ownership transfer and deployment — if Jeff buys

Studio reference. Nothing here goes on the page.

## What is actually being sold for $100

This exact one-page site, its source, one consolidated revision round, correction of
business details, optimisation of owner-approved photos, and one straightforward
deployment with domain connection using access Jeff authorises.

**Not included:** new branding, photography, extra page copy, ecommerce, booking,
forms/backend, ongoing maintenance, subscriptions, domain purchase, paid hosting.

## Before taking payment

1. **Photo permission, in writing.** Every photograph is Jeff's (or his photographer's).
   The page is built from screenshot-resolution crops of his own site. Get his written
   OK and, ideally, the originals off his phone — they are 2016×2048 and the page gets
   visibly sharper for free.
2. **Confirm the before/after.** The hay-covered rear bench and the clean one must be
   the same job. It is the only causal claim on the page.
3. **Confirm the prices are current.** The list on the page is the studio-supplied one.
   Jeff's own homepage and /services disagree with each other, so he should confirm which
   is right before anything goes live.
4. **Agree hosting.** See options below. Do not promise free hosting indefinitely.
5. **Do not promise this imports into GoDaddy's page builder.** It does not. It is a
   static site and needs static hosting.

## Deployment options

The site is plain HTML, CSS, JS and images. No build step, no server, no database.
Anything that serves static files will run it.

| Option | Cost | Notes |
|---|---|---|
| **Netlify / Cloudflare Pages** (recommended) | free tier, ample | drag-and-drop `public/`, or connect the repo. Free TLS, custom domain, instant rollback. |
| **GitHub Pages** | free | fine, but the repo has to be public unless Jeff has a paid plan. |
| **Jeff's existing host** | varies | only if it serves plain static files. GoDaddy Website Builder does **not**. |

Whichever is chosen, **Jeff owns the account.** Create it in his name and email, with his
password. The studio must not hold the only credentials for his live site.

## The transfer, step by step

1. **Repository** — transfer the repo to Jeff's GitHub account, or hand over a zip of the
   source plus `README.md`. He gets everything: HTML, CSS, JS, the asset pipeline, the QA
   harness and the manifest.
2. **Hosting account** — Jeff creates it (or the studio creates it and immediately
   transfers ownership and resets the password to one only he holds).
3. **First deploy** — deploy `public/` to a preview URL on that account. Check it on his
   phone before touching the domain.
4. **Remove the concept markers** — this is the moment, and only after 1–3 above plus his
   explicit approval to launch. Four things come out:
   - the footer disclaimer sentence
   - the "Independent concept" flag in the header
   - `<meta name="robots" content="noindex, nofollow, noarchive, noimageindex">` and the
     `googlebot` meta
   - the `X-Robots-Tag` header in `scripts/serve.mjs` (and any host-level equivalent)
   Then the Open Graph title and description change from "Unofficial Concept" to real
   marketing copy.
5. **Domain** — point his existing domain (or a new one he buys) at the new host. If he
   keeps `carriagetowndetailingllc.godaddysites.com`, that is a GoDaddy-hosted subdomain
   and **cannot** be repointed; he needs his own domain for this to replace it.
6. **Keep the old site live** until the replacement is approved and working. Cut over only
   when he says so, and only after checking the new site on a phone.
7. **Add what a live site needs** that a concept does not: a favicon he approves,
   an OG share image, and — if he wants it — analytics of his choosing.

## If migration gets complicated

Stop and explain the specific extra scope before doing it. Domain transfers, email
records tangled with DNS, or an existing host that will not serve static files are all
beyond the $100. Quote them separately or decline.

## What the studio keeps

Nothing exclusive. Asset rights stay with their owners. The studio may describe the work
only with Jeff's permission, since the photographs are his.
