"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const engine_1 = require("./engine");
const agent_1 = require("./agent");
const types_1 = require("./types");
const app = (0, express_1.default)();
const PORT = 3000;
const ROOT = path_1.default.resolve(__dirname, '..');
app.use(express_1.default.json({ limit: '5mb' }));
// Serve output & templates sebagai static files
app.use('/output', express_1.default.static(path_1.default.join(ROOT, 'output')));
app.use('/templates', express_1.default.static(path_1.default.join(ROOT, 'templates')));
// Serve halaman utama dari file HTML terpisah
app.get('/', (_req, res) => {
    const htmlPath = path_1.default.join(ROOT, 'templates', 'index.html');
    res.sendFile(htmlPath);
});
// ─── ENDPOINT 1: AI Agent → JSON ──────────────────────────────
// Menerima topik, memanggil AI (DeepSeek), return JSON konten
app.post('/api/generate-konten', async (req, res) => {
    try {
        const { topic, preset = 'instagram-square' } = req.body;
        if (!topic || typeof topic !== 'string') {
            return res.status(400).json({ success: false, error: 'Harap berikan "topic".' });
        }
        console.log(`📝 Generate konten untuk topik: "${topic}" (${preset})`);
        // Pipeline: AI → JSON → TemplateData
        const deepseekOut = await (0, agent_1.getDeepSeekContent)(topic, preset);
        const data = await (0, agent_1.buildTemplateData)(deepseekOut, preset);
        return res.json({
            success: true,
            data,
        });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
});
// ─── ENDPOINT 2: Render JSON → Gambar ─────────────────────────
// Menerima JSON konten + preset, render ke gambar via Puppeteer
app.post('/api/render-image', async (req, res) => {
    try {
        const { data, preset = 'instagram-square' } = req.body;
        if (!data) {
            return res.status(400).json({ success: false, error: 'Harap berikan "data" (JSON konten desain).' });
        }
        // Validasi data dengan Zod schema
        const validationResult = types_1.TemplateDataSchema.safeParse(data);
        if (!validationResult.success) {
            const errors = validationResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
            return res.status(400).json({ success: false, error: `Data tidak valid: ${errors}` });
        }
        const validatedData = validationResult.data;
        console.log(`🖼️ Render image dengan preset: ${preset}`);
        const result = await (0, engine_1.generate)(validatedData, { preset: preset });
        const relativePath = path_1.default.relative(ROOT, result.outputPath).replace(/\\/g, '/');
        return res.json({
            success: result.success,
            outputPath: relativePath,
            dimensions: result.dimensions,
            format: result.format,
            fileSizeBytes: result.fileSizeBytes,
            error: result.error,
        });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
});
// ─── ENDPOINT LAMA (untuk kompatibilitas) ──────────────────────
// Menggabungkan generate-konten + render-image dalam satu panggilan
app.post('/api/generate', async (req, res) => {
    try {
        const { topic, preset = 'instagram-square' } = req.body;
        if (!topic || typeof topic !== 'string') {
            return res.status(400).json({ success: false, error: 'Harap berikan "topic".' });
        }
        // Pipeline: AI → JSON → TemplateData
        const deepseekOut = await (0, agent_1.getDeepSeekContent)(topic, preset);
        const data = await (0, agent_1.buildTemplateData)(deepseekOut, preset);
        const result = await (0, engine_1.generate)(data, { preset: preset });
        const relativePath = path_1.default.relative(ROOT, result.outputPath).replace(/\\/g, '/');
        res.json({
            success: result.success,
            outputPath: relativePath,
            dimensions: result.dimensions,
            format: result.format,
            fileSizeBytes: result.fileSizeBytes,
            error: result.error,
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
});
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════╗
║    🎨 Revakdezain — Web UI                  ║
║    Buka di browser: http://localhost:${PORT}   ║
╚══════════════════════════════════════════════╝
║    Endpoints:                                 ║
║    POST /api/generate-konten   (AI → JSON)   ║
║    POST /api/render-image      (JSON → Gambar)║
║    POST /api/generate          (All-in-one)   ║
╚══════════════════════════════════════════════╝
`);
});
//# sourceMappingURL=server.js.map