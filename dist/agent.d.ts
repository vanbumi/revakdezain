import type { DeepSeekOutput, TemplateData } from './types';
/**
 * Memanggil DeepSeek API menggunakan fetch murni (tanpa library eksternal).
 * Menggunakan endpoint v1 dengan response_format json_object.
 * Jika gagal/gak ada key, fallback ke simulasi lokal.
 */
export declare function getDeepSeekContent(topic: string, preset: string): Promise<DeepSeekOutput>;
/**
 * Menggabungkan output DeepSeek dengan warna palet menjadi TemplateData.
 */
export declare function buildTemplateData(deepseekOut: DeepSeekOutput, preset: string): Promise<TemplateData>;
//# sourceMappingURL=agent.d.ts.map