"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateDataSchema = exports.PRESET_DIMENSIONS = void 0;
/**
 * Tipe data untuk Revakdezain versi Plan3.
 * Struktur disesuaikan dengan Plan3: AI → JSON → Render → Gambar langsung.
 */
const zod_1 = require("zod");
/** Mapping preset ke dimensi */
exports.PRESET_DIMENSIONS = {
    'instagram-square': { width: 1080, height: 1080 },
    'instagram-story': { width: 1080, height: 1920 },
    'twitter-post': { width: 1200, height: 675 },
    'custom': { width: 1080, height: 1080 },
};
// ─── ZOD SCHEMA ────────────────────────────────────────────────
/**
 * Zod schema untuk validasi TemplateData (digunakan di server.ts).
 */
exports.TemplateDataSchema = zod_1.z.object({
    judul: zod_1.z.string().min(1, 'Judul wajib diisi'),
    subjudul: zod_1.z.string().min(1, 'Subjudul wajib diisi'),
    poin: zod_1.z.array(zod_1.z.string()).min(1, 'Minimal 1 poin').max(5, 'Maksimal 5 poin'),
    cta: zod_1.z.string().min(1, 'CTA wajib diisi'),
    gradientFrom: zod_1.z.string().regex(/^#/, 'Format hex color untuk gradientFrom'),
    gradientTo: zod_1.z.string().regex(/^#/, 'Format hex color untuk gradientTo'),
    aksen: zod_1.z.string().regex(/^#/, 'Format hex color untuk aksen'),
    watermark: zod_1.z.string().min(1, 'Watermark wajib diisi'),
});
//# sourceMappingURL=types.js.map