import { getStore } from "@netlify/blobs";

export default async (req, context) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const question = body.question || body.prompt;

    if (!question || typeof question !== "string") {
      return new Response(JSON.stringify({ error: "נא להזין שאלה תקינה" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // שליפת הכללים מה-Blobs
    const store = getStore("app-data");
    const rules = (await store.get("rules", { type: "json" })) || [];

    if (!Array.isArray(rules) || rules.length === 0) {
      return new Response(JSON.stringify({ error: "טבלת הכללים ריקה - יש להזין כללים דרך עמוד הניהול. נסי שוב." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // המרת הכללים לפורמט טקסט נקי עבור ה-AI
    const formattedRules = rules.map((r, i) => {
      const cat = r['קטגוריה'] || r.category || '';
      const rule = r['כלל / כפתור'] || r.rule || '';
      const desc = r['פירוט'] || r.description || '';
      const ex = r['דוגמה'] || r.example || '';
      const notes = r['הערות'] || r.notes || '';
      return `${i + 1}. קטגוריה: ${cat} | כלל: ${rule} | פירוט: ${desc} | דוגמה: ${ex} | הערות: ${notes}`;
    }).join("\n");

    // כאן מתבצעת הפנייה ל-OpenAI / Gemini בהתאם למפתח שמוגדר אצלך
    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "מפתח API אינו מוגדר בשרת" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // דוגמה לשליחה ל-OpenAI (אם אתם משתמשים ב-Gemini/OpenAI):
    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `אתה עוזר לבודקי קריאה. להלן טבלת הכללים:\n${formattedRules}`
          },
          {
            role: "user",
            content: question
          }
        ]
      })
    });

    const aiData = await aiResponse.json();
    const answer = aiData.choices?.[0]?.message?.content || "לא התקבלה תשובה מה-AI";

    return new Response(JSON.stringify({ answer }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: "שגיאת שרת: " + err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
