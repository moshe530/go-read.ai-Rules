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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "מפתח API אינו מוגדר בשרת" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const model = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const aiResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: `אתה עוזר לבודקי קריאה. להלן טבלת הכללים:\n${formattedRules}` }]
        },
        contents: [
          {
            role: "user",
            parts: [{ text: question }]
          }
        ]
      })
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      return new Response(JSON.stringify({ error: "שגיאה מול ה-AI: " + errText }), {
        status: 502,
        headers: { "Content-Type": "application/json" }
      });
    }

    const aiData = await aiResponse.json();
    const answer = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "לא התקבלה תשובה מה-AI";

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
