import { serve } from "https://deno.land/std/http/server.ts";

// User-Agent 列表
const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; WOW64; rv:102.0) Gecko/20100101 Firefox/102.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:102.0) Gecko/20100101 Firefox/102.0",
  "Mozilla/5.0 (iPad; CPU OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (WebOS/2.2.4; U; en-US) AppleWebKit/534.6 (KHTML, like Gecko) Safari/534.6 Pre/1.0",
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
  "curl/8.X.X",
  "Wget/1.X.X",
  "Python-urllib/3.X",
  "Go-http-client/1.1",
];

// 随机获取 User-Agent
function getRandomUserAgent(): string {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

// apiMapping 配置
const apiMapping = {
  "/gemini": "https://generativelanguage.googleapis.com",
  "/gnothink": "https://generativelanguage.googleapis.com",
  "/groq": "https://api.groq.com/openai",
  "/gmi": "https://api.gmi-serving.com",
  "/openrouter": "https://openrouter.ai/api",
  "/chutes": "https://llm.chutes.ai",
  "/nebius": "https://api.studio.nebius.com"
};

// 统计端点合并组
const statGroups = [
  { name: "gemini/gnothink", endpoints: ["/gemini", "/gnothink"] }, //  使用 / 分隔更清晰
  { name: "groq", endpoints: ["/groq"] },
  { name: "gmi", endpoints: ["/gmi"] },
  { name: "openrouter", endpoints: ["/openrouter"] },
  { name: "chutes", endpoints: ["/chutes"] },
  { name: "nebius", endpoints: ["/nebius"] }
];

// 初始化统计
const stats = {
  total: 0,
  endpoints: {} as Record<string, { total: number; today: number; week: number; month: number }>,
  requests: [] as Array<{ endpoint: string; timestamp: number }>
};

for (const endpoint of Object.keys(apiMapping)) {
  stats.endpoints[endpoint] = {
    total: 0, today: 0, week: 0, month: 0
  };
}

function recordRequest(endpoint: string) {
  const now = Date.now();
  stats.total++;
  if (stats.endpoints[endpoint]) { // 确保端点存在
    stats.endpoints[endpoint].total++;
  }
  stats.requests.push({ endpoint, timestamp: now });
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
  stats.requests = stats.requests.filter(req => req.timestamp > thirtyDaysAgo);
  updateSummaryStats();
}

function updateSummaryStats() {
  const now = Date.now();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);
  const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

  for (const endpointKey of Object.keys(stats.endpoints)) {
    stats.endpoints[endpointKey].today = 0;
    stats.endpoints[endpointKey].week = 0;
    stats.endpoints[endpointKey].month = 0;
  }
  for (const req of stats.requests) {
    const endpointStats = stats.endpoints[req.endpoint];
    if (!endpointStats) continue;
    if (req.timestamp > oneDayAgo) endpointStats.today++;
    if (req.timestamp > sevenDaysAgo) endpointStats.week++;
    if (req.timestamp > thirtyDaysAgo) endpointStats.month++;
  }
}

// 合并端点统计
function getGroupStats(group: {endpoints: string[]}): {today: number, week: number, month: number, total: number} {
  let today = 0, week = 0, month = 0, total = 0;
  for (const ep of group.endpoints) {
    const st = stats.endpoints[ep] || {today:0, week:0, month:0, total:0};
    today += st.today;
    week  += st.week;
    month += st.month;
    total += st.total;
  }
  return {today, week, month, total};
}

// 生成统计表格HTML
function generateStatsHTML(request: Request) {
  updateSummaryStats();
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API代理服务器 - 统计面板</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background: #2884fa; color: #333; min-height: 100vh; padding: 20px; display: flex; align-items: center; justify-content: center; }
    .container { width: 100%; max-width: 800px; background: #fff; padding: 25px; border-radius: 8px; box-shadow: 0 6px 20px rgba(0,0,0,0.1); }
    .header { text-align: center; color: #1e69c5; margin-bottom: 25px; }
    .header h1 { font-size: 2rem; margin-bottom: 8px; }
    .header p { font-size: 0.95rem; color: #555; }
    
    .stats-table-container { margin-bottom: 25px; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #e0e0e0; padding: 10px 12px; text-align: left; font-size: 0.9rem; }
    th { background-color: #eaf5ff; color: #1e69c5; font-weight: 600; }
    tbody tr:nth-child(even) { background-color: #f8f9fa; }
    tbody tr:hover { background-color: #f1f6fb; }
    td:nth-child(n+2), th:nth-child(n+2) { text-align: right; } /* Align numbers and their headers to the right */

    .overall-stats { background: #eaf5ff; padding: 15px; border-radius: 6px; border: 1px solid #d4e9fc; }
    .overall-stats h3 { color: #1e69c5; margin-bottom: 12px; font-size: 1.1rem; border-bottom: 1px solid #d4e9fc; padding-bottom: 8px;}
    .overall-stats p { margin-bottom: 6px; font-size: 0.9rem; display: flex; justify-content: space-between; }
    .overall-stats p span:first-child { color: #444; }
    .overall-stats p span:last-child { font-weight: 600; }
    
    .refresh-btn { position: fixed; bottom: 20px; right: 20px; background: #1e69c5; color: white; border: none; border-radius: 6px; padding: 10px 15px; font-size: 0.85rem; cursor: pointer; box-shadow: 0 2px 8px rgba(30,105,197,0.25); transition: all 0.2s; z-index: 1000; }
    .refresh-btn:hover { background: #165293; transform: translateY(-1px); }

    @media (max-width: 768px) {
      body { padding: 10px; display: block; } /* Allow scrolling on small screens */
      .container { margin: 10px auto; padding: 20px; }
      .header h1 { font-size: 1.7rem; }
      th, td { padding: 8px; font-size: 0.85rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>🚀 API代理服务器</h1><p>统计面板</p></div>
    
    <div class="stats-table-container">
      <table>
        <thead>
          <tr>
            <th>API 端点组</th>
            <th>24小时</th>
            <th>7天</th>
            <th>30天</th>
            <th>总计</th>
          </tr>
        </thead>
        <tbody>
          ${
            statGroups.map(g => {
              const stat = getGroupStats(g);
              return `
              <tr>
                <td>${g.name}</td>
                <td>${stat.today}</td>
                <td>${stat.week}</td>
                <td>${stat.month}</td>
                <td>${stat.total}</td>
              </tr>`;
            }).join("")
          }
        </tbody>
      </table>
    </div>

    <div class="overall-stats">
        <h3>📊 总体统计</h3>
        <p><span>总请求数:</span> <span>${stats.total}</span></p>
        <p><span>活跃配置端点数:</span> <span>${Object.keys(stats.endpoints).filter(k => stats.endpoints[k].total > 0).length} / ${Object.keys(apiMapping).length}</span></p>
        <p><span>服务状态:</span> <span style="color:#10b981;">🟢 运行中</span></p>
    </div>

  </div>
  <button class="refresh-btn" onclick="location.reload()">🔄 刷新数据</button>
  <script>setInterval(() => { location.reload(); }, 60000);</script>
</body>
</html>`;
}

// --- Deno server logic (serve, recordRequest, apiMapping etc.) remains largely the same ---
// ... (粘贴上一版本中从 serve(async (request) => { ... 到结尾的全部 Deno 服务器逻辑) ...
serve(async (request) => {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (pathname === "/" || pathname === "/index.html") {
    return new Response(generateStatsHTML(request), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (pathname === "/robots.txt") {
    return new Response("User-agent: *\nDisallow: /", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  if (pathname === "/stats") {
    updateSummaryStats();
    return new Response(JSON.stringify(stats, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  // Proxy模式
  if (pathname.startsWith("/proxy/")) {
    try {
      const proxyPathIndex = url.pathname.indexOf("/proxy/");
      const targetUrlString = url.pathname.substring(proxyPathIndex + "/proxy/".length) + url.search + url.hash;
      if (!targetUrlString || !targetUrlString.startsWith("http")) {
        return new Response("Invalid proxy URL. Must start with http:// or https:// after /proxy/", { status: 400 });
      }
      const targetUrl = new URL(targetUrlString);
      const baseUrl = `${targetUrl.protocol}//${targetUrl.host}`;

      const headers = new Headers();
      const allowedHeaders = ["accept", "content-type", "authorization", "user-agent", "accept-encoding", "accept-language", "cache-control", "pragma", "x-requested-with"];
      request.headers.forEach((value, key) => {
        if (allowedHeaders.includes(key.toLowerCase()) || key.toLowerCase().startsWith("sec-") || key.toLowerCase().startsWith("x-")) {
          headers.set(key, value);
        }
      });
      if (!headers.has("user-agent")) {
        headers.set("User-Agent", getRandomUserAgent());
      }
      if (request.headers.has("referer")) {
        headers.set("Referer", request.headers.get("referer")!.replace(url.origin, targetUrl.origin));
      }

      const response = await fetch(targetUrl.toString(), {
        method: request.method,
        headers: headers,
        body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
        redirect: "manual"
      });

      const responseHeaders = new Headers(response.headers);
      const origin = request.headers.get("Origin");
      if (origin) {
        responseHeaders.set("Access-Control-Allow-Origin", origin);
        responseHeaders.set("Access-Control-Allow-Credentials", "true");
      } else {
        responseHeaders.set("Access-Control-Allow-Origin", "*");
      }
      responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH");
      responseHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, User-Agent, " + allowedHeaders.join(", "));
      responseHeaders.set("Access-Control-Max-Age", "86400");
      responseHeaders.set("X-Content-Type-Options", "nosniff");
      responseHeaders.delete("X-Frame-Options");
      responseHeaders.set("Referrer-Policy", "no-referrer-when-downgrade");

      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: responseHeaders });

      if (response.status >= 300 && response.status < 400 && response.headers.has("location")) {
        let newLocation = response.headers.get("location");
        if (newLocation && newLocation.startsWith("/")) newLocation = `${baseUrl}${newLocation}`;
        if (newLocation) responseHeaders.set("Location", `${url.origin}/proxy/${newLocation}`);
        return new Response(null, { status: response.status, headers: responseHeaders });
      }

      const contentType = responseHeaders.get("content-type") || "";
      if (contentType.includes("text/html")) {
        let text = await response.text();
        const currentProxyBase = `${url.origin}/proxy/`;
        text = text.replace(/(href|src|action)=["']\/(?!\/)/gi, `$1="${currentProxyBase}${baseUrl}/`);
        text = text.replace(/(href|src|action)=["'](https?:\/\/[^"']+)/gi, (match, attr, originalUrl) => `${attr}="${currentProxyBase}${originalUrl}"`);
        text = text.replace(/srcset=["']([^"']+)["']/gi, (match, srcset) => {
          const newSrcset = srcset.split(',').map(s => {
            const parts = s.trim().split(/\s+/);
            let u = parts[0];
            if (u.startsWith('/')) u = `${baseUrl}${u}`;
            return `${currentProxyBase}${u}${parts[1] ? ' ' + parts[1] : ''}`;
          }).join(', ');
          return `srcset="${newSrcset}"`;
        });
        text = text.replace(/\s+integrity=["'][^"']+["']/gi, '');
        text = text.replace(/<base\s+href=["']([^"']+)["'][^>]*>/gi, (match, baseHrefVal) => {
          let newBase = baseHrefVal;
          if (baseHrefVal.startsWith('/')) newBase = `${baseUrl}${baseHrefVal}`;
          return `<base href="${currentProxyBase}${newBase}">`;
        });
        return new Response(text, { status: response.status, headers: responseHeaders });
      } else if (contentType.includes("text/css")) {
        let text = await response.text();
        const currentProxyBase = `${url.origin}/proxy/`;
        text = text.replace(/url\(([^)]+)\)/gi, (match, cssUrl) => {
          let u = cssUrl.trim().replace(/["']/g, '');
          if (u.startsWith('data:') || u.startsWith('#')) return match;
          if (u.startsWith('/')) u = `${baseUrl}${u}`;
          else if (!u.startsWith('http')) u = `${new URL(u, targetUrl.toString()).href}`;
          return `url(${currentProxyBase}${u})`;
        });
        return new Response(text, { status: response.status, headers: responseHeaders });
      }

      return new Response(response.body, { status: response.status, headers: responseHeaders });
    } catch (error) {
      console.error("Proxy request failed:", (error as Error).message, (error as Error).stack);
      return new Response("Proxy Request Failed: " + (error as Error).message, { status: 502 });
    }
  }

  const [prefix, rest] = extractPrefixAndRest(pathname, Object.keys(apiMapping));
  if (!prefix) {
    return new Response("Not Found", { status: 404 });
  }

  recordRequest(prefix);
  const targetApiUrl = `${apiMapping[prefix]}${rest}${url.search}`;

  try {
    const headers = new Headers();
    const apiHeaders = ["content-type", "authorization", "accept", "anthropic-version", "user-agent"]; // 明确包含 user-agent
    request.headers.forEach((value, key) => {
      if (apiHeaders.includes(key.toLowerCase()) || key.toLowerCase().startsWith("x-")) {
        headers.set(key, value);
      }
    });
    if (!headers.has("user-agent")) {
      headers.set("User-Agent", getRandomUserAgent());
    }
    if (prefix === "/claude" && !headers.has("anthropic-version")) {
      headers.set("anthropic-version", "2023-06-01");
    }

    let requestBody: BodyInit | null = null;
    if (prefix === "/gnothink" && request.method === "POST" && request.body && headers.get("content-type")?.includes("application/json")) {
      const originalBodyText = await request.text();
      if (originalBodyText) {
        const bodyJson = JSON.parse(originalBodyText);
        bodyJson.generationConfig = {
          ...(bodyJson.generationConfig || {}),
          thinkingConfig: { thinkingBudget: 0 }
        };
        requestBody = JSON.stringify(bodyJson);
      }
    } else if (request.method !== "GET" && request.method !== "HEAD" && request.body) {
      requestBody = request.body;
    }

    const apiResponse = await fetch(targetApiUrl, {
      method: request.method,
      headers: headers,
      body: requestBody,
    });

    const responseHeaders = new Headers(apiResponse.headers);
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH");
    responseHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization, anthropic-version, User-Agent, " + apiHeaders.join(", "));
    responseHeaders.set("X-Content-Type-Options", "nosniff");
    responseHeaders.set("X-Frame-Options", "DENY");
    responseHeaders.set("Referrer-Policy", "no-referrer");

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: responseHeaders });
    }

    return new Response(apiResponse.body, {
      status: apiResponse.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("API proxy fetch failed:", error);
    return new Response("Internal Server Error during API proxy", { status: 500 });
  }
});

function extractPrefixAndRest(pathname: string, prefixes: string[]) {
  for (const prefix of prefixes) {
    if (pathname.startsWith(prefix) && (pathname.length === prefix.length || pathname[prefix.length] === '/')) {
      return [prefix, pathname.slice(prefix.length)];
    }
  }
  return [null, null];
}

console.log("🚀 API代理服务器已启动 (Deno)");
console.log("🕒 统计数据每分钟自动刷新页面");
