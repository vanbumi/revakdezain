"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDeepSeekContent = getDeepSeekContent;
exports.buildTemplateData = buildTemplateData;
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const PALET = [
    { from: '#0F172A', to: '#1E293B', aksen: '#38BDF8' },
    { from: '#1E1B4B', to: '#312E81', aksen: '#C084FC' },
    { from: '#0C0A09', to: '#292524', aksen: '#F59E0B' },
    { from: '#052E16', to: '#166534', aksen: '#4ADE80' },
    { from: '#1A0A2E', to: '#3B0764', aksen: '#E879F9' },
];
/**
 * Menerjemahkan ukuran preset ke deskripsi visual untuk prompt AI.
 */
function presetToDescription(preset) {
    const map = {
        'instagram-square': 'persegi 1080×1080 (Instagram post)',
        'instagram-story': 'vertikal 1080×1920 (Instagram Story)',
        'twitter-post': 'horizontal 1200×675 (Twitter/X post)',
    };
    return map[preset] || preset;
}
/**
 * Memanggil DeepSeek API menggunakan fetch murni (tanpa library eksternal).
 * Menggunakan endpoint v1 dengan response_format json_object.
 * Jika gagal/gak ada key, fallback ke simulasi lokal.
 */
async function getDeepSeekContent(topic, preset) {
    if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY === 'sk-your-deepseek-api-key-here') {
        console.warn('⚠️  DEEPSEEK_API_KEY tidak dikonfigurasi. Fallback simulasi.');
        return getFallbackOutput(topic);
    }
    const ukuranDesc = presetToDescription(preset);
    const systemPrompt = `Kamu adalah seorang copywriter dan desainer layout profesional. 
Tugasmu adalah membuat konten infografis murni teks berdasarkan topik dari user.

Keluarkan HANYA dalam format JSON valid seperti ini tanpa teks penjelasan apa pun di luar JSON dan tanpa markdown (\\\`\\\`\\\`json):
{
  "judul": "string judul max 6 kata",
  "subjudul": "string satu kalimat pendek pendukung judul",
  "poin": ["solusi/fakta singkat 1", "solusi/fakta singkat 2", "solusi/fakta singkat 3"],
  "cta": "string ajakan seperti 'Follow @revaktor'"
}`;
    const userPrompt = `Buat konten untuk topik: "${topic}" dengan optimasi layout untuk ukuran: ${ukuranDesc}. Gunakan bahasa Indonesia yang natural dan engaging.`;
    try {
        console.log(`🤖 Memanggil DeepSeek API: "${topic}" (${preset})...`);
        const response = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
            },
            body: JSON.stringify({
                model: DEEPSEEK_MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                response_format: { type: 'json_object' },
                temperature: 0.7,
                max_tokens: 500,
            }),
            signal: AbortSignal.timeout(30000),
        });
        if (!response.ok) {
            const errBody = await response.text().catch(() => '');
            throw new Error(`HTTP ${response.status}: ${errBody.slice(0, 200)}`);
        }
        const json = await response.json();
        const content = json.choices?.[0]?.message?.content?.trim();
        if (!content)
            throw new Error('Response kosong dari DeepSeek');
        const parsed = JSON.parse(content);
        // Validasi minimal
        if (!parsed.judul || !parsed.subjudul || !Array.isArray(parsed.poin)) {
            throw new Error('Struktur JSON dari AI tidak sesuai skema');
        }
        console.log(`✅ DeepSeek berhasil: judul="${parsed.judul}", ${parsed.poin.length} poin`);
        return parsed;
    }
    catch (err) {
        console.error('❌ DeepSeek API error:', err.message);
        console.warn('⚠️  Fallback ke simulasi lokal.');
        return getFallbackOutput(topic);
    }
}
/**
 * Menggabungkan output DeepSeek dengan warna palet menjadi TemplateData.
 */
async function buildTemplateData(deepseekOut, preset) {
    // Pilih palet berdasarkan preset (hash sederhana)
    const idx = preset.length % PALET.length;
    const palet = PALET[idx];
    return {
        judul: deepseekOut.judul,
        subjudul: deepseekOut.subjudul,
        poin: deepseekOut.poin.slice(0, 3),
        cta: deepseekOut.cta,
        gradientFrom: palet.from,
        gradientTo: palet.to,
        aksen: palet.aksen,
        watermark: 'revakdezain',
    };
}
// ─── FALLBACK SIMULASI ─────────────────────────────────────────
function getFallbackOutput(topic) {
    const poinMap = {
        'clean code': ['Satu fungsi satu tanggung jawab', 'Nama jelas, kode terbaca', 'Hapus yang tidak dipakai'],
        'typescript': ['Type safety dari awal', 'Interface sebagai kontrak', 'Generic untuk fleksibilitas'],
        'tailwind': ['Utility-first styling', 'Responsif tanpa query manual', 'Kustom tema dengan tokens'],
        'default': ['Fokus pada esensi', 'Konsistensi adalah kunci', 'Iterasi cepat, validasi cepat'],
    };
    const lower = topic.toLowerCase();
    let poinData = poinMap['default'];
    for (const [key, val] of Object.entries(poinMap)) {
        if (lower.includes(key)) {
            poinData = val;
            break;
        }
    }
    return {
        judul: topic
            .split(' ')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' '),
        subjudul: `Eksplorasi singkat tentang ${topic} untuk inspirasi harianmu`,
        poin: poinData,
        cta: 'Simpan dan bagikan ke temanmu!',
    };
}
//# sourceMappingURL=agent.js.map