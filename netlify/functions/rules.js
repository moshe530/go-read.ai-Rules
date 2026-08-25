// netlify/functions/rules.js
// GET  -> מחזיר את רשימת הכללים (JSON) - פתוח לכולם (הכלי הראשי קורא מכאן)
// POST -> שומר רשימת כללים חדשה - דורש כותרת x-admin-password תואמת ל-ADMIN_PASSWORD

import { getStore } from "@netlify/blobs";

const KEY = "rules";

export default async (req) => {
  const store = getStore("mesamnim");

  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, x-admin-password",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers });
  }

  if (req.method === "GET") {
    const data = await store.get(KEY, { type: "json" });
    return new Response(JSON.stringify(data || []), { status: 200, headers });
  }

  if (req.method === "POST") {
    const providedPassword = req.headers.get("x-admin-password") || "";
    const realPassword = process.env.ADMIN_PASSWORD || "";
    if (!realPassword || providedPassword !== realPassword) {
      return new Response(JSON.stringify({ error: "סיסמה שגויה" }), {
        status: 401,
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
    if (!Array.isArray(body)) {
      return new Response(JSON.stringify({ error: "יש לשלוח מערך של כללים" }), {
        status: 400,
        headers,
      });
    }
    await store.setJSON(KEY, body);
    return new Response(JSON.stringify({ ok: true, count: body.length }), {
      status: 200,
      headers,
    });
  }

  return new Response(JSON.stringify({ error: "שיטה לא נתמכת" }), {
    status: 405,
    headers,
  });
};

export const config = { path: "/.netlify/functions/rules" };
