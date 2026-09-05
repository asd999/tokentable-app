export async function handler(event) {
  const TOKENTABLE_KEY = process.env.TOKENTABLE_KEY;
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };

  if (!TOKENTABLE_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "尚未在 Netlify 設定 TOKENTABLE_KEY 環境變數！" })
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: "Method Not Allowed" };
  }

  try {
    const { prompt, model } = JSON.parse(event.body || "{}");
    if (!prompt) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "請輸入內容" }) };
    }

    const response = await fetch("https://api.tokentable.asia/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TOKENTABLE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model || "gpt-4o-mini",
        messages: [
          { role: "user", content: prompt }
        ]
      })
    });

    const data = await response.json();

    if (data.error) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: data.error.message || "TokenTable 請求失敗" }) };
    }

    const reply = data.choices?.[0]?.message?.content || "無回應內容";

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ result: reply })
    };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
