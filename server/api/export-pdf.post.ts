/**
 * PDF export endpoint.
 *
 * Input (JSON body): a PdfExportPayload (project + assessments + locale).
 * Output: application/pdf binary stream, suitable for direct download.
 *
 * Implementation: renders the server-built HTML (server/utils/pdfHtml.ts) in
 * a headless Chromium via Puppeteer. On Vercel we use @sparticuz/chromium —
 * a compressed serverless build of Chromium (~60MB) that fits the function
 * size limit. On local dev we fall back to the local Chrome binary if
 * present, or @sparticuz/chromium's bundled executable.
 *
 * Vercel Function config: maxDuration=60s, memory=1024MB. PDF generation
 * cold-starts in ~3s and renders in ~1s — comfortably within budget.
 */

import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import type { PdfExportPayload } from '../utils/pdfHtml'
import { buildPdfHtml } from '../utils/pdfHtml'

// Bump Vercel function limits — Puppeteer cold start ≈ 3s, render ≈ 1s.
export const config = {
  maxDuration: 60
}

export default defineEventHandler(async (event) => {
  // ---------- Validate input ----------
  const body = await readBody<PdfExportPayload>(event).catch(() => null)
  if (!body || !body.project || !body.locale) {
    setResponseStatus(event, 400)
    return { error: 'Invalid body. Expected { project, assessments, locale, generatedAt }.' }
  }
  if (body.locale !== 'fr' && body.locale !== 'en') {
    setResponseStatus(event, 400)
    return { error: 'locale must be "fr" or "en".' }
  }

  // ---------- Build the HTML ----------
  const html = buildPdfHtml({
    ...body,
    generatedAt: body.generatedAt ?? new Date().toISOString()
  })

  // ---------- Launch Chromium ----------
  // @sparticuz/chromium ships a binary tuned for Vercel/Lambda. Calling
  // .executablePath() returns the path; on local dev it'll be in the npm
  // cache directory of the package after first install.
  let executablePath: string
  try {
    executablePath = await chromium.executablePath()
  } catch (e) {
    // Fallback: try a common local Chrome install path on macOS dev machines.
    if (process.platform === 'darwin') {
      executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    } else {
      throw e
    }
  }

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath,
    headless: true,
    defaultViewport: { width: 1240, height: 1754 } // A4 at 150dpi-ish
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '20mm', bottom: '20mm', left: '18mm', right: '18mm' }
    })

    // ---------- Stream response ----------
    setHeader(event, 'Content-Type', 'application/pdf')
    setHeader(
      event,
      'Content-Disposition',
      `attachment; filename="7powers-${slug(body.project.name)}.pdf"`
    )
    setHeader(event, 'Cache-Control', 'no-store')
    return pdfBuffer
  } finally {
    await browser.close()
  }
})

function slug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) || 'report'
}
