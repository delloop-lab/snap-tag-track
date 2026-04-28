import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { filePath } = await req.json();

    if (!filePath) {
      return new Response(
        JSON.stringify({ success: false, error: "filePath is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase environment variables are not configured");
    }
    if (!openaiApiKey) {
      throw new Error(
        "OpenAI API key is not configured. Set OPENAI_API_KEY in Supabase secrets."
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Download image from Supabase Storage
    const { data: imageData, error: downloadError } = await supabase.storage
      .from("receipts")
      .download(filePath);

    if (downloadError) {
      throw new Error(`Failed to download image: ${downloadError.message}`);
    }

    // Convert blob to base64
    const arrayBuffer = await imageData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.byteLength; i += chunkSize) {
      binary += String.fromCharCode(...uint8Array.subarray(i, i + chunkSize));
    }
    const base64Image = btoa(binary);
    const mimeType = imageData.type || "image/jpeg";

    const prompt = `You are a receipt data extractor. Analyze this receipt image and return structured data.
Return ONLY a valid JSON object — no markdown fences, no explanation, nothing else.

Schema:
{
  "vendor": "exact store or business name from the receipt header",
  "total_amount": 0.00,
  "purchase_date": "YYYY-MM-DD",
  "currency": "ISO 4217 code",
  "line_items": [{"description": "item name", "amount": 0.00}],
  "confidence": "high|medium|low",
  "raw_text": "full readable text transcribed from the receipt"
}

Rules:
- vendor: name at the top of the receipt, not the address or tagline
- total_amount: the final amount paid after all taxes and discounts — must be a number, null if not found
- purchase_date: look for labels like Date, Data, Datum, Fecha; format as YYYY-MM-DD; null if not found
- currency: detect from symbols (£=GBP, €=EUR, $=USD) or country context; return null if you cannot determine it
- line_items: list individual items with prices; return empty array [] if not clearly readable
- confidence: "high" if all fields are clear, "medium" if some fields are uncertain, "low" if image quality is poor
- raw_text: transcribe all readable text from the receipt in reading order`;

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${base64Image}`,
                    detail: "high",
                  },
                },
              ],
            },
          ],
          max_tokens: 1500,
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      throw new Error(
        `OpenAI API error ${openaiResponse.status}: ${errorText}`
      );
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No content returned from OpenAI");
    }

    const parsed = JSON.parse(content);

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("process-receipt error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
