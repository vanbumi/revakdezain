import type { TemplateData, RenderConfig, RenderResult, OutputPreset } from './types';
/**
 * Membaca file template HTML dan mengganti semua placeholder dengan data.
 * Placeholder: {{JUDUL}}, {{SUBJUDUL}}, {{GRADIENT_FROM}}, dll.
 * Blok poin: {{#POIN}} ... {{/POIN}} untuk loop array string.
 */
export declare function renderTemplate(templatePath: string, data: TemplateData): string;
/**
 * Mengambil screenshot dari HTML yang sudah di-render menggunakan Puppeteer headless.
 * Mengembalikan Buffer gambar (tidak menyimpan ke file).
 */
export declare function renderToImage(config: RenderConfig): Promise<RenderResult>;
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
export declare function generate(data: TemplateData, options?: Partial<GenerateOptions>): Promise<RenderResult>;
//# sourceMappingURL=engine.d.ts.map