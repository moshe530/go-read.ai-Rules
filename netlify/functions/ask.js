import { getStore } from "@netlify/blobs";

const RULES_KEY = "rules";

function rulesToKnowledgeText(rules) {
  if (!Array.isArray(rules) || rules.length === 0) return "";
  return rules
    .map((row) => {
      const parts = [];
      for (const [key, value] of Object.entries(row)) {
        if (value && String(value).trim()) parts.push(`${key}: ${value}`);
      }
      return parts.join(" | ");
    })
    .filter(Boolean)
    .join("\n");
}

export default async (req) => {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "שיטה לא נתמכת" }), {
      status: 405,
      headers,
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "גוף הבקשה אינו JSON תקין" }), {
      status: 400,
      headers,
    });
  }

  const question = (body.question || "").trim();
  if (!question) {
    return new Response(JSON.stringify({ error: "נא לשלוח שאלה" }), {
      status: 400,
      headers,
    });
  }

  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "לא הוגדר מפתח Grok בהגדרות השרת (GROK_API_KEY)" }),
      { status: 500, headers }
    );
  }

  let rules = [];
  try {
    const store = getStore("mesamnim");
    rules = (await store.get(RULES_KEY, { type: "json" })) || [];
  } catch (e) {
    console.error("Blobs read error:", e);
  }

  const knowledgeBaseText = rulesToKnowledgeText(rules);

  if (!knowledgeBaseText) {
    return new Response(
      JSON.stringify({ error: "טבלת הכללים ריקה - יש להזין כללים דרך עמוד הניהול" }),
      { status: 400, headers }
    );
  }

  const systemPrompt = `את/ה עוזר/ת מקצועי/ת לבודקות במבדקי קריאה בעברית. יש לך גישה לבסיס ידע מלא ומעודכן המכיל את כל כללי הסימון של שגיאות קריאה, כולל הערות, עדכונים, ודוגמאות.

התפקיד שלך: לענות על שאלות של בודקות בנוגע למה יש לסמן במצבים ספציפיים במהלך מבדק קריאה.

הנחיות למענה:
1. ענה בעברית, בקצרה ובבהירות - קודם כל תן את התשובה המעשית (מה לסמן), ואז במידת הצורך הסבר קצר.
2. אם רלוונטי, ציין את תאריך העדכון של הכלל כדי שהבודקת תדע שזה כלל עדכני.
3. אם יש כלל שהתעדכן ומבטל כלל קודם - ציין זאת.
4. אם השאלה נוגעת למצב עם כמה תנאים אפשריים - פרט את התנאי המדויק.
5. אם אין תשובה ברורה בבסיס הידע, או שיש סתירה בין כללים - אמור זאת בבירור והפנה לכלל הכי קרוב שכן קיים.
6. אל תמציא כללים שלא מופיעים בבסיס הידע.
7. תשובה תמציתית - לא יותר מ-4-5 משפטים, אלא אם השאלה דורשת פירוט רב יותר.

בסיס הידע המלא:
${knowledgeBaseText}`;

  try {
    const grokResponse = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4",
        max_tokens: 1000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
      }),
    });

    if (!grokResponse.ok) {
      const errText = await grokResponse.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: `שגיאת שרת Grok: ${grokResponse.status} ${errText}` }),
        { status: 502, headers }
      );
    }

    const data = await grokResponse.json();
    const answer = data.choices?.[0]?.message?.content || "לא התקבלה תשובה";

    return new Response(JSON.stringify({ answer }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers,
    });
  }
};

export const config = { path: "/.netlify/functions/ask" };
