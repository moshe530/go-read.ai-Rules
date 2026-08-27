import { getStore } from "@netlify/blobs";

export default async (req, context) => {
  const store = getStore("app-data");
  
  // טעינת נתונים
  if (req.method === "GET") {
    try {
      const data = await store.get("rules", { type: "json" });
      return new Response(JSON.stringify(data || []), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (err) {
      return new Response(JSON.stringify([]), { status: 200 });
    }
  }

  // שמירת נתונים
  if (req.method === "POST") {
    const adminPassword = process.env.ADMIN_PASSWORD;
    const requestPassword = req.headers.get("x-admin-password");

    if (adminPassword && requestPassword !== adminPassword) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    try {
      const rulesData = await req.json();
      
      // שמירה מהירה של כל המערך בפעולה אחת
      await store.setJSON("rules", rulesData);

      return new Response(JSON.stringify({ success: true, count: rulesData.length }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  return new Response("Method Not Allowed", { status: 405 });
};
