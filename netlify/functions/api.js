export async function handler(event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  try {
    const { prompt, imageBase64 } = JSON.parse(event.body || "{}");

    if (!prompt) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "請輸入提示詞！" }) };
    }

    // 從 Netlify 環境變數取得你的 TokenTable API 金鑰
    const tokenTableKey = process.env.TOKENTABLE_KEY;
    if (!tokenTableKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "未設定 TOKENTABLE_KEY 環境變數" }) };
    }

    /* 
      透過 TokenTable API 呼叫其支援的影音模型 
      (註：請根據 TokenTable 文件中對應的影片生成端點調整 URL 與 model 名稱)
    */
    const response = await fetch("https://api.tokentable.asia/v1/chat/completions", { // 或 TokenTable 的多媒體 API 路徑
      method: "POST",
      headers: {
        "Authorization": `Bearer ${tokenTableKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "kling-video-or-similar", // 依 TokenTable 支援的影片模型名稱調整
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              ...(imageBase64 ? [{ type: "image_url", image_url: { url: imageBase64 } }] : [])
            ]
          }
        ]
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || "TokenTable 請求失敗");
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ result: data.choices?.[0]?.message?.content || "生成指令已送出" }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
}
