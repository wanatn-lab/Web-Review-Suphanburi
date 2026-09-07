import "server-only";
import { Buffer } from "node:buffer";

// Transcribes a review clip's spoken narration into Thai text using
// Cloudflare Workers AI's hosted Whisper model, called over Cloudflare's
// plain REST API (https://api.cloudflare.com/client/v4/accounts/{id}/ai/run/{model}).
// This app does NOT need to run on Cloudflare to use this -- any backend can
// call that endpoint with an account ID + API token pair from
// dash.cloudflare.com > Workers AI > "Use REST API" > "Create a Workers AI API Token".
//
// Why Cloudflare and not e.g. OpenAI's Whisper API: Workers AI gives 10,000
// free "neurons" per day (https://developers.cloudflare.com/workers-ai/platform/pricing/),
// which at this model's listed rate of $0.00051/audio-minute covers roughly
// 200+ minutes of transcription per day at zero cost -- comfortably more than
// this site's expected volume of a few short review clips a day.
//
// IMPORTANT -- verify before relying on this in production: Cloudflare's
// documented request shape for @cf/openai/whisper-large-v3-turbo takes the
// raw audio bytes as a plain JSON array of numbers under "audio" (this has
// been the stable shape for Cloudflare's whisper models). The full
// schema-input.json was not reachable while writing this file, so the first
// time real CLOUDFLARE_ACCOUNT_ID/CLOUDFLARE_AI_API_TOKEN credentials are
// available, run one real clip through and confirm the response looks like
// { success: true, result: { text: "..." } } before trusting this in the
// Facebook/TikTok import flows. If the shape has changed, only the request
// body inside transcribeAudio() below needs to change -- every caller in
// this project goes through that one function.

const WHISPER_MODEL = "@cf/openai/whisper-large-v3-turbo";
const REQUEST_TIMEOUT_MS = 55_000;
const DOWNLOAD_TIMEOUT_MS = 30_000;
// Cloudflare Workers AI has its own per-request payload ceiling and Vercel
// serverless functions have bounded memory -- a review clip is a few tens of
// seconds long, so anything past this is almost certainly the wrong file
// (or a much longer video than this feature is meant for) and is skipped
// rather than risking an out-of-memory crash mid-request.
const MAX_MEDIA_BYTES = 60 * 1024 * 1024; // 60MB

interface WhisperResponse {
  success?: boolean;
  result?: { text?: string };
  errors?: { message: string }[];
}

export interface TranscribeCredentials {
  accountId?: string;
  apiToken?: string;
}

function resolveCredentials(options: TranscribeCredentials): { accountId: string; apiToken: string } | null {
  const accountId = options.accountId ?? process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = options.apiToken ?? process.env.CLOUDFLARE_AI_API_TOKEN;
  if (!accountId || !apiToken) return null;
  return { accountId, apiToken };
}

/**
 * Transcribes an audio/video file's spoken narration into text.
 *
 * Fails open, never throws: returns null when Cloudflare credentials are not
 * configured yet, the request fails, or the response has no text. Every
 * caller in this project treats "no transcript" the same way it already
 * treats "no caption" -- a normal case that still lets the rest of the
 * import draft go through (see lib/geocoding.ts for the same pattern with
 * best-effort geocoding).
 */
export async function transcribeAudio(
  mediaBytes: ArrayBuffer,
  options: TranscribeCredentials = {}
): Promise<string | null> {
  const credentials = resolveCredentials(options);
  if (!credentials) return null;
  if (mediaBytes.byteLength === 0 || mediaBytes.byteLength > MAX_MEDIA_BYTES) return null;

  const url = `https://api.cloudflare.com/client/v4/accounts/${credentials.accountId}/ai/run/${WHISPER_MODEL}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credentials.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audio: Buffer.from(mediaBytes).toString("base64"),
        task: "transcribe",
        language: "th",
        vad_filter: true,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const payload = (await response.json().catch(() => null)) as WhisperResponse | null;
    if (!response.ok || !payload?.success) {
      console.error(
        "[audio-transcription] Cloudflare Whisper request failed:",
        payload?.errors ?? response.statusText
      );
      return null;
    }

    const text = payload.result?.text?.trim();
    return text || null;
  } catch (error) {
    console.error("[audio-transcription] transcribeAudio threw:", error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Downloads a video/audio file from a direct URL (e.g. the `source` field
 * Facebook's Graph API returns for a Video node this Page owns) so it can be
 * passed to transcribeAudio(). Returns null on any failure -- an oversized,
 * missing, or unreachable file should never fail the whole import, only skip
 * the transcript.
 */
export async function downloadMediaBytes(sourceUrl: string): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
    if (!response.ok) return null;

    const declaredLength = Number(response.headers.get("content-length") ?? "0");
    if (declaredLength > MAX_MEDIA_BYTES) {
      console.error(
        `[audio-transcription] Skipped download: declared ${declaredLength} bytes exceeds ${MAX_MEDIA_BYTES} cap`
      );
      return null;
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_MEDIA_BYTES) return null;
    return buffer;
  } catch (error) {
    console.error("[audio-transcription] downloadMediaBytes threw:", error instanceof Error ? error.message : error);
    return null;
  }
}
