import "server-only";

// Rewrites a raw caption (optionally + a transcribed voice-over) into a
// longer, naturally keyword-rich Thai SEO title + description, using
// Cloudflare Workers AI's hosted Llama model over the same plain REST API as
// lib/audio-transcription.ts. This is what the manual-content admin form
// calls to produce "much better" SEO copy than the plain keyword-suffix
// template in createManualSeoContent (lib/manual-content.ts) -- see
// createEnhancedSeoContent() there, which wraps this with that template as a
// guaranteed fallback.
//
// Fails open, never throws: returns null whenever Cloudflare credentials are
// missing, the request fails, or the model's reply isn't parseable JSON --
// callers must fall back to createManualSeoContent so publishing a review
// never depends on this being configured or available.

const TEXT_MODEL = "@cf/meta/llama-3.1-8b-instruct";
const REQUEST_TIMEOUT_MS = 25_000;
const MAX_SOURCE_TEXT_CHARS = 6_000; // matches the review_content field's own cap

interface LlamaResponse {
  success?: boolean;
  result?: { response?: string };
  errors?: { message: string }[];
}

export interface SeoCopyInput {
  /** Thai category label, e.g. "ร้านอาหาร", "คาเฟ่", "ที่เที่ยว" */
  categoryLabel: string;
  placeName: string;
  caption: string;
  /** Optional transcript from lib/audio-transcription.ts */
  transcript?: string | null;
  accountId?: string;
  apiToken?: string;
}

export interface GeneratedSeoCopy {
  title: string;
  description: string;
}

function resolveCredentials(input: SeoCopyInput): { accountId: string; apiToken: string } | null {
  const accountId = input.accountId ?? process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = input.apiToken ?? process.env.CLOUDFLARE_AI_API_TOKEN;
  if (!accountId || !apiToken) return null;
  return { accountId, apiToken };
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function buildPrompt({ categoryLabel, placeName, caption, transcript }: SeoCopyInput): string {
  const sourceText = [
    caption ? `แคปชั่นต้นฉบับ: ${truncate(caption, MAX_SOURCE_TEXT_CHARS)}` : null,
    transcript ? `เสียงพากย์ที่ถอดจากคลิป: ${truncate(transcript, MAX_SOURCE_TEXT_CHARS)}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  return [
    `เขียนคำโปรย SEO ภาษาไทยสำหรับรีวิว${categoryLabel} ชื่อ "${placeName}" ในจังหวัดสุพรรณบุรี`,
    "ใช้เฉพาะข้อมูลที่มีอยู่จริงด้านล่างเท่านั้น ห้ามแต่งเมนู ราคา ที่อยู่ หรือรายละเอียดที่ไม่ได้พูดถึง",
    "",
    sourceText,
    "",
    'ตอบกลับเป็น JSON เท่านั้น ไม่มีข้อความอื่นก่อนหรือหลัง รูปแบบ: {"title": "...", "description": "..."}',
    "- title: ไม่เกิน 60 ตัวอักษร มีชื่อสถานที่ และคำว่า \"สุพรรณบุรี\"",
    "- description: 2-4 ประโยค ยาว 150-300 ตัวอักษร อ่านลื่นเหมือนคนเขียนจริง ไม่ยัดคีย์เวิร์ดซ้ำๆ",
  ].join("\n");
}

/** Pulls the first {...} block out of the model's reply and parses it -- Llama
 *  instruction models sometimes wrap JSON in a sentence or code fence even
 *  when told not to, so this is more forgiving than JSON.parse(raw) directly. */
function parseModelJson(raw: string): GeneratedSeoCopy | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]) as Partial<GeneratedSeoCopy>;
    const title = parsed.title?.trim();
    const description = parsed.description?.trim();
    if (!title || !description) return null;
    return { title, description };
  } catch {
    return null;
  }
}

export async function generateSeoCopy(input: SeoCopyInput): Promise<GeneratedSeoCopy | null> {
  const credentials = resolveCredentials(input);
  if (!credentials) return null;
  if (!input.caption.trim() && !input.transcript?.trim()) return null;

  const url = `https://api.cloudflare.com/client/v4/accounts/${credentials.accountId}/ai/run/${TEXT_MODEL}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credentials.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content:
              "คุณคือนักเขียนคำโปรย SEO ภาษาไทยให้เว็บรีวิวท้องถิ่น ตอบเป็น JSON ที่ถูกต้องเท่านั้น ห้ามมีข้อความอื่นนอก JSON เด็ดขาด",
          },
          { role: "user", content: buildPrompt(input) },
        ],
        max_tokens: 400,
        temperature: 0.4,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const payload = (await response.json().catch(() => null)) as LlamaResponse | null;
    if (!response.ok || !payload?.success || !payload.result?.response) {
      console.error("[seo-content-generator] Cloudflare Llama request failed:", payload?.errors ?? response.statusText);
      return null;
    }

    return parseModelJson(payload.result.response);
  } catch (error) {
    console.error("[seo-content-generator] generateSeoCopy threw:", error instanceof Error ? error.message : error);
    return null;
  }
}
