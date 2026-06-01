import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { generate } from './engine';
import { getDeepSeekContent, buildTemplateData } from './agent';
import { TemplateDataSchema } from './types';
import type { OutputPreset, TemplateData, DeepSeekOutput } from './types';

const app = express();
const PORT = 3000;
const ROOT = path.resolve(__dirname, '..');

app.use(express.json({ limit: '5mb' }));

// Serve output & templates sebagai static files
app.use('/output', express.static(path.join(ROOT, 'output')));
app.use('/templates', express.static(path.join(ROOT, 'templates')));

// Serve halaman utama dari file HTML terpisah
app.get('/', (_req: Request, res: Response) => {
  const htmlPath = path.join(ROOT, 'templates', 'index.html');
  res.sendFile(htmlPath);
});

// ─── ENDPOINT 1: AI Agent → JSON (Iklan Komersial) ────────────
// Menerima topik produk, memanggil AI (DeepSeek), return JSON iklan
app.post('/api/generate-konten', async (req: Request, res: Response) => {
  try {
    const { topic, preset = 'instagram-square' } = req.body;

    if (!topic || typeof topic !== 'string') {
      return res.status(400).json({ success: false, error: 'Harap berikan "topic" (produk/jasa).' });
    }

    console.log(`📝 Generate iklan untuk produk: "${topic}" (${preset})`);

    // Pipeline: AI → JSON → TemplateData
    const deepseekOut: DeepSeekOutput = await getDeepSeekContent(topic, preset);
    const data: TemplateData = await buildTemplateData(deepseekOut, preset);

    return res.json({
      success: true,
      data,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// ─── ENDPOINT 2: Render JSON → Gambar ─────────────────────────
// Menerima JSON konten + preset, render ke gambar via Puppeteer
app.post('/api/render-image', async (req: Request, res: Response) => {
  try {
    const { data, preset = 'instagram-square' } = req.body;

    if (!data) {
      return res.status(400).json({ success: false, error: 'Harap berikan "data" (JSON konten iklan).' });
    }

    // Validasi data dengan Zod schema
    const validationResult = TemplateDataSchema.safeParse(data);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
      return res.status(400).json({ success: false, error: `Data tidak valid: ${errors}` });
    }

    const validatedData = validationResult.data as TemplateData;
    console.log(`🖼️ Render iklan dengan preset: ${preset}`);

    const result = await generate(validatedData, { preset: preset as OutputPreset });
    
    const relativePath = path.relative(ROOT, result.outputPath).replace(/\\/g, '/');

    return res.json({
      success: result.success,
      outputPath: relativePath,
      dimensions: result.dimensions,
      format: result.format,
      fileSizeBytes: result.fileSizeBytes,
      error: result.error,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// ─── ENDPOINT LAMA (untuk kompatibilitas) ──────────────────────
// Menggabungkan generate-konten + render-image dalam satu panggilan
app.post('/api/generate', async (req: Request, res: Response) => {
  try {
    const { topic, preset = 'instagram-square' } = req.body;

    if (!topic || typeof topic !== 'string') {
      return res.status(400).json({ success: false, error: 'Harap berikan "topic" (produk/jasa).' });
    }

    // Pipeline: AI → JSON → TemplateData
    const deepseekOut: DeepSeekOutput = await getDeepSeekContent(topic, preset);
    const data: TemplateData = await buildTemplateData(deepseekOut, preset);

    const result = await generate(data, { preset: preset as OutputPreset });
    
    const relativePath = path.relative(ROOT, result.outputPath).replace(/\\/g, '/');

    res.json({
      success: result.success,
      outputPath: relativePath,
      dimensions: result.dimensions,
      format: result.format,
      fileSizeBytes: result.fileSizeBytes,
      error: result.error,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║    🎯 Revakdezain — Automated Ad Engine     ║
║    Buka di browser: http://localhost:${PORT}   ║
╚══════════════════════════════════════════════╝
║    Endpoints:                                 ║
║    POST /api/generate-konten   (AI → JSON)   ║
║    POST /api/render-image      (JSON → Gambar)║
║    POST /api/generate          (All-in-one)   ║
╚══════════════════════════════════════════════╝
`);
});