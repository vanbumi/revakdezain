import * as fs from 'fs';
import * as path from 'path';
import type { TemplateData, RenderConfig, RenderResult, OutputPreset } from './types';
import { PRESET_DIMENSIONS } from './types';

// ─── TEMPLATE ENGINE ───────────────────────────────────────────

/**
 * Membaca file template HTML dan mengganti semua placeholder dengan data.
 * Placeholder untuk struktur iklan komersial:
 * {{HEADLINE}}, {{KATA_KUNCI_AKSEN}}, {{OFFER}}, {{URGENCY}}, {{CTA}},
 * {{GRADIENT_FROM}}, {{GRADIENT_TO}}, {{WARNA_AKSEN_TEKS}}, {{KEYWORD_PEXELS}}
 */
export function renderTemplate(templatePath: string, data: TemplateData): string {
  let html = fs.readFileSync(templatePath, 'utf-8');

  // Ganti placeholder sederhana
  const replacements: Record<string, string> = {
    '{{HEADLINE}}':         data.headline,
    '{{KATA_KUNCI_AKSEN}}': data.kataKunciAksen,
    '{{OFFER}}':            data.offer,
    '{{URGENCY}}':          data.urgency,
    '{{CTA}}':              data.cta,
    '{{GRADIENT_FROM}}':     data.gradientFrom,
    '{{GRADIENT_TO}}':       data.gradientTo,
    '{{WARNA_AKSEN_TEKS}}':  data.warnaAksenTeks,
    '{{KEYWORD_PEXELS}}':   data.keywordPexels,
    '{{PEXELS_IMAGE_URL}}': data.pexelsImageUrl,
  };

  for (const [placeholder, value] of Object.entries(replacements)) {
    html = html.split(placeholder).join(value);
  }

  // Hapus blok lama yang tidak dipakai lagi (poin loop, has_bg)
  html = html.replace(/\{\{#POIN\}\}[\s\S]*?\{\{\/POIN\}\}/g, '');
  html = html.replace(/\{\{#HAS_BG\}\}[\s\S]*?\{\{\/HAS_BG\}\}/g, '');

  return html;
}

// ─── RENDERER (Puppeteer) ──────────────────────────────────────

let puppeteerModule: typeof import('puppeteer') | null = null;

async function getPuppeteer(): Promise<typeof import('puppeteer')> {
  if (!puppeteerModule) {
    puppeteerModule = await import('puppeteer');
  }
  return puppeteerModule;
}

/**
 * Mengambil screenshot dari HTML yang sudah di-render menggunakan Puppeteer headless.
 * Mengembalikan Buffer gambar (tidak menyimpan ke file).
 */
export async function renderToImage(config: RenderConfig): Promise<RenderResult> {
  const {
    templatePath,
    outputPath,
    width = 1080,
    height = 1080,
    format = 'png',
    quality = 92,
  } = config;

  try {
    const puppeteer = await getPuppeteer();
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      timeout: 60000,
    });

    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 2 });

    // Buka file HTML via file:// protocol
    const fileUrl = `file:///${templatePath.replace(/\\/g, '/')}`;
    await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });

    // Tunggu sebentar agar Tailwind CDN & font selesai loading
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        setTimeout(resolve, 1500);
      });
    });

    // Screenshot langsung ke buffer
    const screenshotRaw = await page.screenshot({
      type: format as 'png' | 'jpeg' | 'webp',
      fullPage: false,
      clip: { x: 0, y: 0, width, height },
      ...(format === 'jpeg' || format === 'webp' ? { quality } : {}),
    });

    await browser.close();

    // Convert ke Buffer jika Uint8Array
    const screenshotBuffer = Buffer.isBuffer(screenshotRaw)
      ? screenshotRaw
      : Buffer.from(screenshotRaw);

    // Tulis buffer ke file output
    fs.writeFileSync(outputPath, screenshotBuffer);

    // Dapatkan ukuran file
    const stats = fs.statSync(outputPath);

    return {
      success: true,
      buffer: screenshotBuffer,
      outputPath,
      dimensions: { width, height },
      format,
      fileSizeBytes: stats.size,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      buffer: new Uint8Array(0),
      outputPath,
      dimensions: { width, height },
      format,
      error: message,
    };
  }
}

// ─── FULL PIPELINE ─────────────────────────────────────────────

export interface GenerateOptions {
  data: TemplateData;
  preset?: OutputPreset;
  templatePath?: string;
  outputFilename?: string;
}

/**
 * Pipeline lengkap: template rendering → screenshot.
 * Fungsi utama yang akan dipanggil dari CLI/Server.
 */
export async function generate(data: TemplateData, options?: Partial<GenerateOptions>): Promise<RenderResult> {
  const preset: OutputPreset = options?.preset ?? 'instagram-square';
  const dims = PRESET_DIMENSIONS[preset];

  const templatePath = options?.templatePath ?? path.resolve(__dirname, '..', 'templates', 'instagram-square.html');
  const outputFilename = options?.outputFilename ?? `revakdezain-${Date.now()}.png`;
  const outputPath = path.resolve(__dirname, '..', 'output', outputFilename);

  // 1. Render template HTML dengan data
  const renderedHtml = renderTemplate(templatePath, data);

  // 2. Tulis HTML hasil render ke file temporary
  const tempHtmlPath = path.resolve(__dirname, '..', 'output', '.temp_render.html');
  fs.writeFileSync(tempHtmlPath, renderedHtml, 'utf-8');

  // 3. Screenshot via Puppeteer
  const result = await renderToImage({
    templatePath: tempHtmlPath,
    outputPath,
    width: dims.width,
    height: dims.height,
    format: 'png',
  });

  // 4. Bersihkan temp file
  try { fs.unlinkSync(tempHtmlPath); } catch { /* ignore */ }

  return result;
}