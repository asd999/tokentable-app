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

    const tokenTableKey = process.env.TOKENTABLE_KEY;
    if (!tokenTableKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "未設定 TOKENTABLE_KEY 環境變數" }) };
    }

    const baseUrl = "https://tokentable.asia/v1";[span_0](start_span)[span_0](end_span)

    let base64Data = imageBase64;
    let mimeType = "image/jpeg";
    if (imageBase64 && imageBase64.includes("data:")) {
      const matches = imageBase64.match(/^data:(.+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        base64Data = matches[2];
      }
    }

    // 1. 提交影片生成任務[span_1](start_span)[span_1](end_span)
    const payload = {
      model: "kling/kling-v3-omni-video-generation",
      prompt: prompt,
      duration: 5
    };

    if (base64Data) {
      payload.imageBase64 = base64Data;
      payload.imageMimeType = mimeType;
    }

    const response = await fetch(`${baseUrl}/media/video`, {[span_2](start_span)[span_2](end_span)
      method: "POST",
      headers: {
        "Authorization": `Bearer ${tokenTableKey}`,[span_3](start_span)[span_3](end_span)
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "TokenTable 影片任務建立失敗");
    }

    const taskId = data.taskid;
    if (!taskId) {
      throw new Error("未取得有效的 Task ID");
    }

    // 2. 輪詢狀態[span_4](start_span)[span_4](end_span)
    let videoUrl = "";
    let status = "pending";
    let attempts = 0;
    const maxAttempts = 35;

    while (status === "pending" && attempts < maxAttempts) {
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 5000));

      const statusRes = await fetch(`${baseUrl}/media/task/status`, {[span_5](start_span)[span_5](end_span)
        method: "POST",
        headers: {
          "Authorization": `Bearer ${tokenTableKey}`,[span_6](start_span)[span_6](end_span)
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          taskid: taskId,
          model: "kling/kling-v3-omni-video-generation"
        })
      });

      const statusData = await statusRes.json();
      status = statusData.status;

      if (status === "succeeded") {
        // 相容多種可能的欄位名稱
        videoUrl = statusData.videoUrl || statusData.url || statusData.output || statusData.data?.url;
        break;
      } else if (status === "failed") {
        throw new Error(statusData.error?.code || "遠端影片生成失敗");
      }
    }

    if (status !== "succeeded" || !videoUrl) {
      throw new Error("影片生成逾時或未取得影片網址");
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ videoUrl }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
}
