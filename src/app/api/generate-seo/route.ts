import { type NextRequest, NextResponse } from "next/server";

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || "";

export async function POST(req: NextRequest) {
  try {
    const { name, productType, gender, category, description, price, colors, sizes } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }

    if (!MISTRAL_API_KEY) {
      return NextResponse.json({ error: "Mistral API key not configured" }, { status: 500 });
    }

    const prompt = `You are an expert SEO copywriter for a premium Indian fashion brand called "VPPA Fashions" (website: vppafashions.com). Generate SEO metadata for the following product.

Product Details:
- Name: ${name}
- Type: ${productType || "Apparel"}
- Gender: ${gender || "Unisex"}
- Category: ${category || "Fashion"}
- Price: ₹${price || "N/A"}
- Colors: ${colors || "N/A"}
- Sizes: ${sizes || "N/A"}
- Description: ${description ? description.replace(/<[^>]*>/g, "").slice(0, 200) : "N/A"}

Generate the following in JSON format (no markdown, just raw JSON):
{
  "metaTitle": "SEO-optimized title (50-60 chars, include brand name VPPA Fashions)",
  "metaDescription": "Compelling meta description (140-160 chars, include key features, price mention, call to action)",
  "seoKeywords": "comma-separated relevant keywords (8-12 keywords, include product type, gender, brand, fabric, style)",
  "ogTitle": "Open Graph title for social sharing (60-70 chars)",
  "ogDescription": "Social media optimized description (100-120 chars, engaging tone)"
}

Important:
- Keep metaTitle under 60 characters
- Keep metaDescription between 140-160 characters
- Include "VPPA Fashions" in metaTitle
- Make descriptions compelling with buying intent
- Include Indian fashion context (₹ pricing, Indian sizing)
- Output ONLY valid JSON, no other text`;

    const response = await fetch(MISTRAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: "mistral-small-latest",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Mistral API error:", err);
      return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse the JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    const seoData = JSON.parse(jsonMatch[0]);

    return NextResponse.json(seoData);
  } catch (error) {
    console.error("SEO generation error:", error);
    return NextResponse.json({ error: "Failed to generate SEO data" }, { status: 500 });
  }
}
