/**
 * Tipe data untuk Revakdezain versi Plan3.
 * Struktur disesuaikan dengan Plan3: AI → JSON → Render → Gambar langsung.
 */
import { z } from 'zod';
/** Skema output dari DeepSeek (Plan3) */
export interface DeepSeekOutput {
    judul: string;
    subjudul: string;
    poin: string[];
    cta: string;
}
/** Data final yang dikonsumsi oleh template engine */
export interface TemplateData {
    judul: string;
    subjudul: string;
    poin: string[];
    cta: string;
    gradientFrom: string;
    gradientTo: string;
    aksen: string;
    watermark: string;
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
export declare const PRESET_DIMENSIONS: Record<OutputPreset, {
    width: number;
    height: number;
}>;
/** Hasil dari proses rendering */
export interface RenderResult {
    success: boolean;
    buffer: Uint8Array;
    outputPath: string;
    dimensions: {
        width: number;
        height: number;
    };
    format: string;
    fileSizeBytes?: number;
    error?: string;
}
/**
 * Zod schema untuk validasi TemplateData (digunakan di server.ts).
 */
export declare const TemplateDataSchema: z.ZodObject<{
    judul: z.ZodString;
    subjudul: z.ZodString;
    poin: z.ZodArray<z.ZodString>;
    cta: z.ZodString;
    gradientFrom: z.ZodString;
    gradientTo: z.ZodString;
    aksen: z.ZodString;
    watermark: z.ZodString;
}, z.core.$strip>;
//# sourceMappingURL=types.d.ts.map