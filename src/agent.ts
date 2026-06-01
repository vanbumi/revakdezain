import type { DeepSeekOutput, TemplateData } from './types';
import * as dotenv from 'dotenv';

dotenv.config();

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const PEXELS_API_KEY = process.env.PEXELS_API_KEY || '';
const PEXELS_API_URL = 'https://api.pexels.com/v1/search';

/**
 * System Prompt — Senior Art Director & Conversion Copywriter.
 * Output JSON langsung berisi struktur iklan komersial lengkap + visual guide.
 */
const SYSTEM_PROMPT = `Kamu adalah seorang Senior Art Director dan Conversion Copywriter spesialis Iklan Digital (FB Ads, IG Ads, TikTok Ads).

Tugasmu adalah mengubah input topik/produk dari user menjadi struktur konten iklan komersial yang persuasif, menjual, dan memiliki panduan visual yang mewah khas desainer profesional.

Aturan Copywriting Iklan:
1. THE HOOK (Headline): Kalimat utama di bagian atas yang bombastis, memicu emosi, atau menyelesaikan masalah utama audiens (Maksimal 6 kata).
2. THE OFFER (Penawaran/Core Benefit): Penjelasan produk/jasa yang padat, keuntungan terbesar apa yang didapatkan konsumen, atau info diskon/harga coret jika relevan.
3. INCENTIVES/URGENCY: Trigger psikologi seperti "Slot Terbatas", "Garansi 100% Aman", "Promo Khusus Minggu Ini", atau "Free Konsultasi".
4. CALL TO ACTION (CTA): Instruksi jelas untuk membeli/menghubungi, misal: "Klik Link di Bawah", "Amankan Slotmu Sekarang", atau "Hubungi via WhatsApp".

Aturan Estetika & Visual (Sentuhan Desainer Manusia):
1. PALET WARNA GRADASI (Mesh Gradient): Tentukan kombinasi warna background yang sesuai dengan psikologi produk (misal: produk teknologi = biru gelap & ungu elektrik; produk promo/diskon = merah marun & oranye gelap; produk premium = hitam arang & aksen emas). Berikan warna Hex yang kontras dengan teks putih/terang.
2. AKSEN TEKS: Pilih satu warna Hex cerah (misal: kuning neon, hijau mint, cyan) khusus untuk memberi penekanan pada kata kunci penting di bagian Headline atau Diskon agar mata audiens langsung tertuju ke sana.
3. KEYWORD BACKGROUND (Pexels): Pilih 1-2 kata kunci bahasa Inggris spesifik untuk latar belakang yang estetik dan moody, relevan dengan kategori industri produk. JANGAN gunakan keyword membosankan seperti "office" atau "laptop". Gunakan kata kunci yang memberikan atmosfer komersial, contoh: "cyberpunk grid texture", "modern abstract architecture shadow", "luxury minimalist texture", "dark industrial background".

Keluarkan HANYA dalam format JSON valid tanpa kata pembuka/penutup dan tanpa markdown (\`\`\`json):
{
  "headline": "string",
  "kataKunciAksen": "satu atau dua kata dari headline yang ingin diberi warna aksen cerah",
  "offer": "string penawaran utama",
  "urgency": "string insentif/urgency",
  "cta": "string kalimat cta",
  "visual": {
    "gradientFrom": "Hex warna latar 1",
    "gradientTo": "Hex warna latar 2",
    "warnaAksenTeks": "Hex warna cerah untuk highlight",
    "keywordPexels": "string kata kunci pencarian gambar latar belakang di pexels"
  }
}`;

/**
 * Menerjemahkan ukuran preset ke deskripsi visual untuk prompt AI.
 */
function presetToDescription(preset: string): string {
  const map: Record<string, string> = {
    'instagram-square': 'persegi 1080×1080 (Instagram post)',
    'instagram-story': 'vertikal 1080×1920 (Instagram Story)',
    'twitter-post': 'horizontal 1200×675 (Twitter/X post)',
  };
  return map[preset] || preset;
}

/**
 * Cari gambar dari Pexels API berdasarkan keyword.
 * Mengembalikan URL gambar portrait ukuran medium.
 */
async function searchPexelsImage(keyword: string): Promise<string> {
  if (!PEXELS_API_KEY || PEXELS_API_KEY === 'your-pexels-api-key') {
    console.warn('⚠️  PEXELS_API_KEY tidak dikonfigurasi. Fallback placeholder.');
    return '';
  }

  try {
    console.log(`📷 Mencari gambar Pexels: "${keyword}"...`);
    const encodedKeyword = encodeURIComponent(keyword);
    const url = `${PEXELS_API_URL}?query=${encodedKeyword}&per_page=1&orientation=portrait`;

    const response = await fetch(url, {
      headers: {
        'Authorization': PEXELS_API_KEY,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.warn(`⚠️  Pexels API HTTP ${response.status}`);
      return '';
    }

    const data: any = await response.json();

    if (data.photos && data.photos.length > 0) {
      const photo = data.photos[0];
      // Ambil ukuran medium (lebar ~400px) untuk portrait
      const imageUrl = photo.src?.medium || photo.src?.small || '';
      console.log(`✅ Pexels: ${imageUrl}`);
      return imageUrl;
    }

    console.warn('⚠️  Tidak ada foto dari Pexels untuk keyword:', keyword);
    return '';
  } catch (err: any) {
    console.warn('⚠️  Pexels API error:', err.message);
    return '';
  }
}

/**
 * Memanggil DeepSeek API menggunakan fetch murni (tanpa library eksternal).
 * Menggunakan endpoint v1 dengan response_format json_object.
 * Output langsung berupa JSON iklan komersial (headline, offer, urgency, cta, visual).
 * Jika gagal/gak ada key, fallback ke simulasi lokal.
 */
export async function getDeepSeekContent(topic: string, preset: string): Promise<DeepSeekOutput> {
  if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY === 'sk-your-deepseek-api-key-here') {
    console.warn('⚠️  DEEPSEEK_API_KEY tidak dikonfigurasi. Fallback simulasi.');
    return getFallbackOutput(topic);
  }

  const ukuranDesc = presetToDescription(preset);
  const userPrompt = `Buat konten iklan untuk produk/topik: "${topic}" dengan format layout untuk ukuran: ${ukuranDesc}. Gunakan bahasa Indonesia yang natural, persuasif, dan engaging.`;

  try {
    console.log(`🤖 Memanggil DeepSeek API (Ad Engine): "${topic}" (${preset})...`);

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 800,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${errBody.slice(0, 200)}`);
    }

    const json: any = await response.json();
    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error('Response kosong dari DeepSeek');

    const parsed = JSON.parse(content) as DeepSeekOutput;

    // Validasi minimal struktur iklan
    if (!parsed.headline || !parsed.offer || !parsed.cta || !parsed.visual?.gradientFrom) {
      throw new Error('Struktur JSON dari AI tidak sesuai skema iklan');
    }

    console.log(`✅ DeepSeek berhasil: headline="${parsed.headline}"`);
    return parsed;
  } catch (err: any) {
    console.error('❌ DeepSeek API error:', err.message);
    console.warn('⚠️  Fallback ke simulasi lokal.');
    return getFallbackOutput(topic);
  }
}

/**
 * Konversi DeepSeekOutput → TemplateData + fetch gambar dari Pexels.
 */
export async function buildTemplateData(deepseekOut: DeepSeekOutput, _preset: string): Promise<TemplateData> {
  // Cari gambar dari Pexels berdasarkan keyword dari AI
  const pexelsImageUrl = await searchPexelsImage(deepseekOut.visual.keywordPexels);

  return {
    headline: deepseekOut.headline,
    kataKunciAksen: deepseekOut.kataKunciAksen,
    offer: deepseekOut.offer,
    urgency: deepseekOut.urgency,
    cta: deepseekOut.cta,
    gradientFrom: deepseekOut.visual.gradientFrom,
    gradientTo: deepseekOut.visual.gradientTo,
    warnaAksenTeks: deepseekOut.visual.warnaAksenTeks,
    keywordPexels: deepseekOut.visual.keywordPexels,
    pexelsImageUrl,
  };
}

// ─── FALLBACK SIMULASI ─────────────────────────────────────────

function getFallbackOutput(topic: string): DeepSeekOutput {
  const fallbackByKeyword: Record<string, Partial<DeepSeekOutput & { visual: DeepSeekOutput['visual'] }>> = {
    'teknologi': {
      headline: 'Teknologi Masa Depan',
      kataKunciAksen: 'Masa Depan',
      offer: 'Rasakan inovasi terkini dengan teknologi AI canggih. Produktivitas meningkat 3x lipat!',
      urgency: 'Slot Terbatas — Hanya untuk 100 pendaftar pertama!',
      cta: 'Klik Link di Bawah & Daftar Sekarang',
      visual: { gradientFrom: '#0F172A', gradientTo: '#312E81', warnaAksenTeks: '#38BDF8', keywordPexels: 'modern abstract architecture' },
    },
    'diskon': {
      headline: 'Diskon 50% Hari Ini',
      kataKunciAksen: '50%',
      offer: 'Promo spesial akhir bulan. Semua produk diskon hingga 50%. Jangan lewatkan!',
      urgency: 'Promo Khusus Minggu Ini — Stok Terbatas!',
      cta: 'Amankan Slotmu Sekarang',
      visual: { gradientFrom: '#7F1D1D', gradientTo: '#9A3412', warnaAksenTeks: '#FCD34D', keywordPexels: 'dark industrial background' },
    },
    'premium': {
      headline: 'Eksklusivitas Tanpa Batas',
      kataKunciAksen: 'Eksklusivitas',
      offer: 'Layanan premium dengan standar internasional. Konsultasi private dengan para ahli.',
      urgency: 'Garansi 100% Aman & Puas — Atau Uang Kembali!',
      cta: 'Hubungi via WhatsApp Sekarang',
      visual: { gradientFrom: '#0C0A09', gradientTo: '#292524', warnaAksenTeks: '#F59E0B', keywordPexels: 'luxury minimalist interior' },
    },
    'interior': {
      headline: 'Rumah Impian, Tanpa Ribet',
      kataKunciAksen: 'Rumah Impian',
      offer: 'Jasa desain interior premium untuk hunian Anda. Dapatkan konsultasi gratis sekarang!',
      urgency: 'Slot Terbatas — Hanya untuk 50 pendaftar pertama!',
      cta: 'Hubungi via WhatsApp Sekarang',
      visual: { gradientFrom: '#1E1B4B', gradientTo: '#0F172A', warnaAksenTeks: '#F59E0B', keywordPexels: 'luxury minimalist interior' },
    },
  };

  const lower = topic.toLowerCase();
  let found = fallbackByKeyword['premium'];
  for (const [key, val] of Object.entries(fallbackByKeyword)) {
    if (lower.includes(key)) { found = val; break; }
  }

  return {
    headline: found.headline!,
    kataKunciAksen: found.kataKunciAksen!,
    offer: found.offer!,
    urgency: found.urgency!,
    cta: found.cta!,
    visual: {
      gradientFrom: found.visual!.gradientFrom,
      gradientTo: found.visual!.gradientTo,
      warnaAksenTeks: found.visual!.warnaAksenTeks,
      keywordPexels: found.visual!.keywordPexels,
    },
  };
}