"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const engine_1 = require("./engine");
const agent_1 = require("./agent");
// ─── CLI ────────────────────────────────────────────────────────
function printHelp() {
    console.log(`
╔══════════════════════════════════════════════════╗
║           🎨 REVAKDEZAIN — Canva Pribadi        ║
║      Code-to-Image Engine v1.0.0                ║
╚══════════════════════════════════════════════════╝

  Penggunaan:
    npm run generate "<topik>"               # Generate dari teks topik
    npm run generate -- --preset instagram-story "<topik>"
    npm run generate -- --help               # Tampilkan bantuan

  Preset ukuran:
    instagram-square   1080×1080  (default)
    instagram-story    1080×1920
    twitter-post       1200×675

  Contoh:
    npm run generate "Clean Code Tips"
    npm run generate -- --preset twitter-post "TypeScript Generics"
`);
}
async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        printHelp();
        return;
    }
    // Parse flags
    let preset = 'instagram-square';
    let topicInput = null;
    let i = 0;
    while (i < args.length) {
        if (args[i] === '--preset' && args[i + 1]) {
            const p = args[i + 1];
            if (['instagram-square', 'instagram-story', 'twitter-post', 'custom'].includes(p)) {
                preset = p;
            }
            else {
                console.error(`Preset tidak dikenal: "${p}". Gunakan --help untuk lihat daftar.`);
                process.exit(1);
            }
            i += 2;
        }
        else {
            // Semua argumen tersisa adalah topik
            topicInput = args.slice(i).join(' ');
            break;
        }
    }
    if (!topicInput) {
        console.error('❌ Harap berikan topik.');
        printHelp();
        process.exit(1);
    }
    // Pipeline: AI → JSON → TemplateData
    const deepseekOut = await (0, agent_1.getDeepSeekContent)(topicInput, preset);
    const data = await (0, agent_1.buildTemplateData)(deepseekOut, preset);
    const sourceLabel = `DeepSeek: "${topicInput}"`;
    console.log(`\n🎨 Revakdezain — Generating...`);
    console.log(`   Sumber  : ${sourceLabel}`);
    console.log(`   Preset  : ${preset}`);
    console.log(`   Judul   : ${data.judul}`);
    console.log(`   Poin    : ${data.poin.length} items`);
    // Generate
    const result = await (0, engine_1.generate)(data, { preset });
    if (result.success) {
        const sizeKB = result.fileSizeBytes
            ? (result.fileSizeBytes / 1024).toFixed(1)
            : '?';
        console.log(`\n✅ Berhasil!`);
        console.log(`   Output  : ${result.outputPath}`);
        console.log(`   Ukuran  : ${result.dimensions.width}×${result.dimensions.height}`);
        console.log(`   Format  : ${result.format}`);
        console.log(`   Size    : ${sizeKB} KB\n`);
    }
    else {
        console.error(`\n❌ Gagal: ${result.error}\n`);
        process.exit(1);
    }
}
main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map