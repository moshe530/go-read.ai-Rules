# כלי "מה מסמנים?" - גרסת Netlify

## מבנה
- `public/mesamnim.html` - הכלי הראשי לבודקות
- `public/admin.html` - עמוד ניהול הכללים (מוגן סיסמה)
- `netlify/functions/rules.js` - קריאה/כתיבה של טבלת הכללים (Netlify Blobs)
- `netlify/functions/ask.js` - פונה ל-Grok עם המפתח שנשמר בצד השרת
- `seed-rules.json` - 60 הכללים שכבר חילצנו מה-PDF, לטעינה ראשונית

## הגדרה ב-Netlify (אחרי ההעלאה/חיבור לאתר)
1. באתר ב-Netlify: **Site configuration → Environment variables**, הוסיפו:
   - `GROK_API_KEY` = מפתח ה-API שלכם מ-x.ai
   - `ADMIN_PASSWORD` = הסיסמה המשותפת לעורכים
2. פרסמו/בנו מחדש (Deploy) את האתר אחרי הוספת המשתנים.

## טעינת 60 הכללים הראשונית
1. היכנסו ל-`/admin.html` באתר, הזינו את הסיסמה.
2. פתחו את `seed-rules.json`, העתיקו את כל התוכן.
3. פתחו את כלי המפתחים של הדפדפן (F12) → לשונית Console, והדביקו:
   ```js
   fetch('/.netlify/functions/rules', {
     method: 'POST',
     headers: {'Content-Type':'application/json','x-admin-password': sessionStorage.getItem('adminPassword')},
     body: JSON.stringify(/* להדביק כאן את תוכן seed-rules.json */)
   }).then(r=>r.json()).then(console.log)
   ```
4. רעננו את `/admin.html` - אמורים לראות את 60 השורות בטבלה, ניתנות לעריכה.

לאחר מכן ניתן לערוך הכל דרך הטבלה עצמה בעמוד הניהול - אין צורך לחזור על השלב הזה.
