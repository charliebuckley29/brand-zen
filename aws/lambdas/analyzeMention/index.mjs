// index.mjs
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const bedrock = new BedrockRuntimeClient({ region: "eu-west-2" });

// ---------- Model preference ----------
const MODEL_PREFERENCE = [
  { id: "anthropic.claude-3-haiku-20240307-v1:0", retries: 3 },
  { id: "anthropic.claude-3-7-sonnet-20250219-v1:0", retries: 1 },
  { id: "anthropic.claude-3-sonnet-20240229-v1:0", retries: 2 },
  { id: "mistral.mistral-large-2402-v1:0", retries: 2 },
  { id: "meta.llama3-70b-instruct-v1:0", retries: 2 },
  { id: "meta.llama3-8b-instruct-v1:0", retries: 2 },
  { id: "amazon.titan-text-express-v1", retries: 2 },
  { id: "amazon.titan-text-lite-v1", retries: 2 }
];

// ---------- Utilities ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function backoffDelay(attempt, baseMs = 500, capMs = 8000) {
  const exp = Math.min(capMs, baseMs * 2 ** (attempt - 1));
  return Math.floor(Math.random() * exp);
}

function stripMarkdownFences(text = "") {
  return text.replace(/```json\s*([\s\S]*?)\s*```/i, "$1")
             .replace(/```\s*([\s\S]*?)\s*```/g, "$1")
             .trim();
}

function isRetryableError(err) {
  const retryableNames = new Set([
    "ThrottlingException",
    "ModelTimeoutException",
    "ServiceUnavailableException",
    "InternalServerException",
    "TooManyRequestsException"
  ]);
  if (retryableNames.has(err?.name)) return true;
  const msg = (err?.message || "").toLowerCase();
  return msg.includes("too many requests") || msg.includes("rate limit");
}

// ---------- Core Model Invocation ----------
async function invokeModel(modelId, payload, maxAttempts = 3) {
  let attempt = 0;
  while (true) {
    attempt++;
    try {
      const res = await bedrock.send(
        new InvokeModelCommand({
          modelId,
          body: JSON.stringify(payload),
          contentType: "application/json",
          accept: "application/json"
        })
      );
      return new TextDecoder().decode(res.body);
    } catch (err) {
      if (attempt < maxAttempts && isRetryableError(err)) {
        const delay = backoffDelay(attempt);
        console.warn(
          `⏳ Retryable error on ${modelId} (attempt ${attempt}/${maxAttempts}): ${err.name || err.message}. Waiting ${delay}ms`
        );
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }
}

// ---------- Normalize Model Output ----------
function normalizeOutput(raw, mention, modelId) {
  let cleaned = mention.full_text || mention.content_snippet || "";
  let summary = mention.content_snippet || "";
  let sentiment = null;

  try {
    // 1) Try parsing as JSON envelope (Anthropic / Bedrock style)
    const envelope = JSON.parse(raw);

    // Anthropic content: envelope.content[0].text
    const innerText = envelope?.content?.[0]?.text;
    if (innerText) {
      const match = innerText.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(stripMarkdownFences(match[0]));
        if (parsed.cleaned_text) cleaned = parsed.cleaned_text;
        if (parsed.summary) summary = parsed.summary;
        if (typeof parsed.sentiment_score === "number") sentiment = parsed.sentiment_score;
      }
    }
  } catch {
    // 2) Fallback: try regex for JSON inside raw
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(stripMarkdownFences(jsonMatch[0]));
        if (parsed.cleaned_text) cleaned = parsed.cleaned_text;
        if (parsed.summary) summary = parsed.summary;
        if (typeof parsed.sentiment_score === "number") sentiment = parsed.sentiment_score;
      } catch {
        // ignore
      }
    }
  }

  return {
    cleaned_text: cleaned,
    summary,
    sentiment_score: sentiment,
    model_used: modelId
  };
}


// Helper to fetch brand_name from Supabase if not present
async function getBrandName(mention) {
  if (mention.brand_name) return mention.brand_name;
  if (!mention.keyword_id) return null;
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/keywords?id=eq.${mention.keyword_id}&select=brand_name`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json"
      }
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data?.[0]?.brand_name || null;
  } catch (err) {
    console.error("Error fetching brand_name from Supabase:", err);
    return null;
  }
}

// Extract a snippet around the brand name for sentiment analysis
function extractSnippet(mention, brandName) {
  const text = mention.full_text || mention.content_snippet || "";
  if (!brandName || !text) return text;
  const idx = text.toLowerCase().indexOf(brandName.toLowerCase());
  if (idx === -1) return text;
  // Get up to 100 chars before and after the brand name
  const start = Math.max(0, idx - 100);
  const end = Math.min(text.length, idx + brandName.length + 100);
  return text.slice(start, end);
}

// ---------- Main Analysis ----------
async function analyzeWithFallback(mention) {
  const brandName = await getBrandName(mention);
  const snippet = extractSnippet(mention, brandName);
  // Pre-filter: skip model if snippet is too short (e.g., <30 chars)
  if (!snippet || snippet.trim().length < 30) {
    // Do not update sentiment if not enough context; leave as null (pending)
    return {
      cleaned_text: snippet,
      summary: mention.content_snippet,
      sentiment_score: mention.sentiment ?? null,
      model_used: "skipped:low-context"
    };
  }
  for (const { id: modelId, retries } of MODEL_PREFERENCE) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(JSON.stringify({ level: "info", event: "model.start", modelId, attempt, retries }));

        const task = `Analyze the following text.\nReturn JSON with fields: cleaned_text, summary, sentiment_score (0=negative to 100=positive, -1 if unknown).\nText: ${snippet}`;

        let payload;
        if (modelId.startsWith("anthropic")) {
          payload = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 200,
            messages: [{ role: "user", content: task }]
          };
        } else if (modelId.startsWith("mistral")) {
          payload = {
            max_tokens: 200,
            messages: [{ role: "user", content: task }]
          };
        } else if (modelId.startsWith("meta.")) {
          payload = { prompt: task, max_gen_len: 200, temperature: 0.2, top_p: 0.95 };
        } else if (modelId.startsWith("amazon.titan")) {
          payload = {
            inputText: task,
            textGenerationConfig: { maxTokenCount: 200, temperature: 0.2, topP: 0.95 }
          };
        } else {
          payload = { inputText: task }; // default
        }

        const raw = await invokeModel(modelId, payload, retries);
        console.log(JSON.stringify({ level: "debug", event: "model.raw", modelId, attempt, raw_output: raw }));

        const normalized = normalizeOutput(raw, mention, modelId);
        console.log(JSON.stringify({ level: "info", event: "model.success", modelId, attempt, output: normalized }));

        return normalized;
      } catch (err) {
        if (isRetryableError(err)) continue;
        console.error(`❌ Error on ${modelId}:`, err.message || err);
        break;
      }
    }
  }

  // If all model attempts fail, do not update sentiment; leave as null (pending)
  return {
    cleaned_text: snippet,
    summary: mention.content_snippet,
    sentiment_score: mention.sentiment ?? null,
    model_used: "fallback:none"
  };
}

// ---------- Handler & Supabase Push ----------
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

export const handler = async (event) => {
  console.log("🔔 Lambda triggered:", JSON.stringify(event, null, 2));
  const record = event?.Records?.[0];
  const mention = record ? JSON.parse(record.body) : event;

  const result = await analyzeWithFallback(mention);
  console.log("✅ Final result:", JSON.stringify(result, null, 2));

  // Only update Supabase if a real model result was returned (not skipped/fallback)
  const shouldUpdateSentiment =
    result.model_used &&
    !result.model_used.startsWith("skipped:") &&
    !result.model_used.startsWith("fallback:");

  if (SUPABASE_URL && SUPABASE_KEY && mention?.id && shouldUpdateSentiment) {
    try {
      const patchBody = {
        cleaned_text: result.cleaned_text,
        summary: result.summary,
        sentiment: result.sentiment_score === undefined ? null : result.sentiment_score,
        model_used: result.model_used,
        updated_at: new Date().toISOString()
      };
      console.log('PATCHING SUPABASE', patchBody);
      const res = await fetch(`${SUPABASE_URL}/rest/v1/mentions?id=eq.${mention.id}`, {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(patchBody)
      });
      if (!res.ok) throw new Error(await res.text());
      console.log(`📤 Supabase updated for mention=${mention.id}`);
    } catch (err) {
      console.error("💥 Error pushing to Supabase:", err);
    }
  } else if (!shouldUpdateSentiment) {
    console.log("⏭️ Skipping Supabase sentiment update: low-context or model unavailable, leaving as null (pending)");
  }

  return result;
};
