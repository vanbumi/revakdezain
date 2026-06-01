import { generate } from './engine';
import { getDeepSeekContent, buildTemplateData } from './agent';
import type { TemplateData, OutputPreset, DeepSeekOutput } from './types';

// ─── CLI ────────────────────────────────────────────────────────

function printHelp(): void {
  console.log(`
╔══════════════════════════════════════════════════╗
║    🎯 REVAKDEZAIN — Automated Ad-Graphic Engine  ║
║    Mesin Pembuat Iklan Produk/Jasa               ║
╚══════════════════════════════════════════════════╝

  Penggunaan:
    npm run generate "<produk/topik>"         # Generate iklan dari produk
    npm run generate -- --preset instagram-story "<produk>"
    npm run generate -- --help                # Tampilkan bantuan

  Preset ukuran:
    instagram-square   1080×1080  (default)
    instagram-story    1080×1920
    twitter-post       1200×675

  Contoh:
    npm run generate "Jasa Desain Interior Premium"
    npm run generate -- --preset twitter-post "Bootcamp AI 2026"
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }

  // Parse flags
  let preset: OutputPreset = 'instagram-square';
  let topicInput: string | null = null;

  let i = 0;
  while (i < args.length) {
    if (args[i] === '--preset' && args[i + 1]) {
      const p = args[i + 1] as OutputPreset;
      if (['instagram-square', 'instagram-story', 'twitter-post', 'custom'].includes(p)) {
        preset = p;
      } else {
        console.error(`Preset tidak dikenal: "${p}". Gunakan --help untuk lihat daftar.`);
        process.exit(1);
      }
      i += 2;
    } else {
      // Semua argumen tersisa adalah topik
      topicInput = args.slice(i).join(' ');
      break;
    }
  }

  if (!topicInput) {
    console.error('❌ Harap berikan topik produk/jasa.');
    printHelp();
    process.exit(1);
  }

  // Pipeline: AI → JSON → TemplateData
  const deepseekOut: DeepSeekOutput = await getDeepSeekContent(topicInput, preset);
  const data: TemplateData = await buildTemplateData(deepseekOut, preset);
  const sourceLabel = `DeepSeek: "${topicInput}"`;

  console.log(`\n🎯 Revakdezain Ad Engine — Generating...`);
  console.log(`   Produk  : ${sourceLabel}`);
  console.log(`   Preset  : ${preset}`);
  console.log(`   Headline: ${data.headline}`);
  console.log(`   Offer   : ${data.offer.slice(0, 60)}...`);

  // Generate
  const result = await generate(data, { preset });

  if (result.success) {
    const sizeKB = result.fileSizeBytes
      ? (result.fileSizeBytes / 1024).toFixed(1)
      : '?';
    console.log(`\n✅ Iklan berhasil dibuat!`);
    console.log(`   Output  : ${result.outputPath}`);
    console.log(`   Ukuran  : ${result.dimensions.width}×${result.dimensions.height}`);
    console.log(`   Format  : ${result.format}`);
    console.log(`   Size    : ${sizeKB} KB\n`);
  } else {
    console.error(`\n❌ Gagal: ${result.error}\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});