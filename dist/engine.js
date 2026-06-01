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
exports.renderTemplate = renderTemplate;
exports.renderToImage = renderToImage;
exports.generate = generate;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const types_1 = require("./types");
// ─── TEMPLATE ENGINE ───────────────────────────────────────────
/**
 * Membaca file template HTML dan mengganti semua placeholder dengan data.
 * Placeholder: {{JUDUL}}, {{SUBJUDUL}}, {{GRADIENT_FROM}}, dll.
 * Blok poin: {{#POIN}} ... {{/POIN}} untuk loop array string.
 */
function renderTemplate(templatePath, data) {
    let html = fs.readFileSync(templatePath, 'utf-8');
    // 1. Ganti placeholder sederhana
    const replacements = {
        '{{JUDUL}}': data.judul,
        '{{SUBJUDUL}}': data.subjudul,
        '{{CTA}}': data.cta,
        '{{GRADIENT_FROM}}': data.gradientFrom,
        '{{GRADIENT_TO}}': data.gradientTo,
        '{{AKSEN}}': data.aksen,
        '{{WATERMARK}}': data.watermark,
    };
    for (const [placeholder, value] of Object.entries(replacements)) {
        html = html.split(placeholder).join(value);
    }
    // 2. Tangani blok poin {{#POIN}} ... {{/POIN}}
    const poinRegex = /\{\{#POIN\}\}([\s\S]*?)\{\{\/POIN\}\}/g;
    html = html.replace(poinRegex, (_match, innerTemplate) => {
        return data.poin
            .map((teks) => innerTemplate.replace(/\{\{TEKS\}\}/g, teks))
            .join('\n');
    });
    // 3. Hapus blok {{#HAS_BG}} ... {{/HAS_BG}} karena kita tidak pakai bg image lagi
    html = html.replace(/\{\{#HAS_BG\}\}[\s\S]*?\{\{\/HAS_BG\}\}/g, '');
    return html;
}
// ─── RENDERER (Puppeteer) ──────────────────────────────────────
let puppeteerModule = null;
async function getPuppeteer() {
    if (!puppeteerModule) {
        puppeteerModule = await Promise.resolve().then(() => __importStar(require('puppeteer')));
    }
    return puppeteerModule;
}
/**
 * Mengambil screenshot dari HTML yang sudah di-render menggunakan Puppeteer headless.
 * Mengembalikan Buffer gambar (tidak menyimpan ke file).
 */
async function renderToImage(config) {
    const { templatePath, outputPath, width = 1080, height = 1080, format = 'png', quality = 92, } = config;
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
            return new Promise((resolve) => {
                setTimeout(resolve, 1500);
            });
        });
        // Screenshot langsung ke buffer
        const screenshotRaw = await page.screenshot({
            type: format,
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
    }
    catch (err) {
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
/**
 * Pipeline lengkap: template rendering → screenshot.
 * Fungsi utama yang akan dipanggil dari CLI/Server.
 */
async function generate(data, options) {
    const preset = options?.preset ?? 'instagram-square';
    const dims = types_1.PRESET_DIMENSIONS[preset];
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
    try {
        fs.unlinkSync(tempHtmlPath);
    }
    catch { /* ignore */ }
    return result;
}
//# sourceMappingURL=engine.js.map