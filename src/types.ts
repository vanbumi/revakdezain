/**
 * Tipe data untuk Revakdezain versi instruksi-2.
 * Automated Ad-Graphic Engine — output iklan komersial dari DeepSeek.
 */
import { z } from 'zod';

/**
 * Skema output dari DeepSeek (Instruksi 2 — Iklan Komersial).
 * AI sebagai Senior Art Director & Conversion Copywriter.
 */
export interface DeepSeekOutput {
  headline: string;
  kataKunciAksen: string;
  offer: string;
  urgency: string;
  cta: string;
  visual: {
    gradientFrom: string;
    gradientTo: string;
    warnaAksenTeks: string;
    keywordPexels: string;
  };
}

/** Data final yang dikonsumsi oleh template engine */
export interface TemplateData {
  headline: string;
  kataKunciAksen: string;
  offer: string;
  urgency: string;
  cta: string;
  gradientFrom: string;
  gradientTo: string;
  warnaAksenTeks: string;
  keywordPexels: string;
  pexelsImageUrl: string;
}

/** Konfigurasi rendering untuk Puppeteer */
export interface RenderConfig {
  templatePath: string;
  outputPath: string;
  width?: number;
  height?: number;
  format?: 'png' | 'jpeg' | 'webp';
  quality?: number;
}

/** Preset ukuran output yang umum digunakan */
export type OutputPreset = 'instagram-square' | 'instagram-story' | 'twitter-post' | 'custom';

/** Mapping preset ke dimensi */
export const PRESET_DIMENSIONS: Record<OutputPreset, { width: number; height: number }> = {
  'instagram-square': { width: 1080, height: 1080 },
  'instagram-story':  { width: 1080, height: 1920 },
  'twitter-post':     { width: 1200, height: 675 },
  'custom':           { width: 1080, height: 1080 },
};

/** Hasil dari proses rendering */
export interface RenderResult {
  success: boolean;
  buffer: Uint8Array;
  outputPath: string;
  dimensions: { width: number; height: number };
  format: string;
  fileSizeBytes?: number;
  error?: string;
}

// ─── ZOD SCHEMA ────────────────────────────────────────────────

/**
 * Zod schema untuk validasi TemplateData (digunakan di server.ts).
 */
export const TemplateDataSchema = z.object({
  headline: z.string().min(1, 'Headline wajib diisi'),
  kataKunciAksen: z.string().min(1, 'Kata kunci aksen wajib diisi'),
  offer: z.string().min(1, 'Offer wajib diisi'),
  urgency: z.string().min(1, 'Urgency wajib diisi'),
  cta: z.string().min(1, 'CTA wajib diisi'),
  gradientFrom: z.string().regex(/^#/, 'Format hex color untuk gradientFrom'),
  gradientTo: z.string().regex(/^#/, 'Format hex color untuk gradientTo'),
  warnaAksenTeks: z.string().regex(/^#/, 'Format hex color untuk warnaAksenTeks'),
  keywordPexels: z.string().min(1, 'Keyword Pexels wajib diisi'),
});