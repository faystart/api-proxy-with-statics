import { serve } from "https://deno.land/std/http/server.ts";

const apiMapping = {
  "/gemini": "https://generativelanguage.googleapis.com",
  "/gnothink": "https://generativelanguage.googleapis.com",
  "/groq": "https://api.groq.com/openai",
  "/gmi": "https://api.gmi-serving.com",
  "/openrouter": "https://openrouter.ai/api",
  "/chutes": "https://llm.chutes.ai",
  "/nebius": "https://api.studio.nebius.com" // 新增的 nebius 端点
};

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
  "curl/8.4.0", // 示例版本
  "Wget/1.21.3", // 示例版本
  "Python-urllib/3.11", // 示例版本
  "Go-http-client/1.1" // Go 默认的 UA 格式
];

function getRandomUserAgent() {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

// Stats storage
const stats = {
  total: 0,
  endpoints: {} as Record<string, { total: number; today: number; week: number; month: number }>,
  requests: [] as Array<{ endpoint: string; timestamp: number }>
};

// Initialize stats for all endpoints in apiMapping
for (const endpoint of Object.keys(apiMapping)) {
  stats.endpoints[endpoint] = {
    total: 0,
    today: 0,
    week: 0,
    month: 0
  };
}

function recordRequest(endpoint: string) {
  const now = Date.now();
  stats.total++;
  // Ensure the endpoint exists in stats before trying to increment
  if (stats.endpoints[endpoint]) {
    stats.endpoints[endpoint].total++;
  } else {
    // This case should ideally not happen if initialized correctly for all apiMapping keys
    console.warn(`Endpoint ${endpoint} not found in stats.endpoints during recordRequest. Initializing now.`);
    stats.endpoints[endpoint] = { total: 1, today: 0, week: 0, month: 0 };
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
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000); // For clarity, though filtered

  for (const endpointKey of Object.keys(stats.endpoints)) {
    stats.endpoints[endpointKey].today = 0;
    stats.endpoints[endpointKey].week = 0;
    stats.endpoints[endpointKey].month = 0;
  }

  for (const req of stats.requests) {
    const endpointStats = stats.endpoints[req.endpoint];
    if (!endpointStats) continue;

    if (req.timestamp > oneDayAgo) {
      endpointStats.today++;
    }
    if (req.timestamp > sevenDaysAgo) {
      endpointStats.week++;
    }
    if (req.timestamp > thirtyDaysAgo) { // Will be true due to cleanup
      endpointStats.month++;
    }
  }
}

function generateStatsHTML(request: Request) {
  updateSummaryStats(); // Ensure summary stats are up-to-date

  const url = new URL(request.url);
  const currentDomain = `${url.protocol}//${url.host}`;

  // Calculate totals for the summary row in the table
  const totalToday = Object.values(stats.endpoints).reduce((sum, s) => sum + s.today, 0);
  const totalWeek = Object.values(stats.endpoints).reduce((sum, s) => sum + s.week, 0);
  const totalMonth = Object.values(stats.endpoints).reduce((sum, s) => sum + s.month, 0);

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API代理服务器 - 统计面板</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
            background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); /* Blue gradient background */
            min-height: 100vh; 
            padding: 20px; 
            color: #fff; /* Default text color to white for better contrast on blue */
        }
        .container { 
            max-width: 900px; /* Adjusted width for simpler content */
            margin: 40px auto; /* Added more top margin */
            background: rgba(255, 255, 255, 0.1); /* Semi-transparent white card */
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { font-size: 2.2rem; margin-bottom: 8px; text-shadow: 0 1px 3px rgba(0,0,0,0.2); }
        .header p { font-size: 1rem; opacity: 0.9; }
        
        .stats-table-container { margin-bottom: 30px; }
        .stats-table-container h2 {
            font-size: 1.6rem;
            color: #fff; /* White title */
            margin-bottom: 20px;
            text-align: center;
            border-bottom: 2px solid rgba(255,255,255,0.3);
            padding-bottom: 10px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            background: rgba(255, 255, 255, 0.15); /* Slightly more opaque for table */
            border-radius: 8px;
            overflow: hidden; /* To make border-radius work on table */
        }
        th, td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            color: #f0f0f0; /* Light grey text for table content */
        }
        th {
            background-color: rgba(0, 0, 0, 0.1); /* Darker shade for header */
            font-weight: 600;
            color: #fff; /* White text for table headers */
        }
        tbody tr:last-child td {
            border-bottom: none;
        }
        tbody tr:hover {
            background-color: rgba(255, 255, 255, 0.1);
        }
        td:first-child { font-weight: 500; }
        td strong { color: #fff; } /* Make total values stand out */

        .info-section {
            text-align: center;
            margin-top: 20px;
            padding: 15px;
            background: rgba(0,0,0,0.1);
            border-radius: 8px;
        }
        .info-section p {
            margin: 5px 0;
            font-size: 0.9rem;
            color: #e0e0e0;
        }
        .info-section code {
            background: rgba(0,0,0,0.2);
            padding: 3px 6px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            color: #fff;
        }

        .refresh-btn { 
            position: fixed; bottom: 20px; right: 20px; 
            background: #ffc107; /* A contrasting yellow/orange */
            color: #333; 
            border: none; border-radius: 50px; padding: 10px 20px; 
            font-size: 0.9rem; font-weight: bold; cursor: pointer; 
            box-shadow: 0 4px 12px rgba(0,0,0,0.2); 
            transition: all 0.3s ease; z-index: 1000; 
        }
        .refresh-btn:hover { background: #e0a800; transform: translateY(-2px); }
        
        .toast { 
            position: fixed; top: 20px; right: 20px; 
            background: #28a745; /* Green for success */
            color: white; padding: 10px 18px; border-radius: 6px; 
            font-size: 0.9rem; z-index: 1001; opacity: 0; 
            transform: translateX(100%); transition: all 0.3s ease; 
        }
        .toast.show { opacity: 1; transform: translateX(0); }

        @media (max-width: 768px) {
            .container { margin: 20px; padding: 15px; }
            .header h1 { font-size: 1.8rem; }
            th, td { padding: 10px 8px; font-size: 0.9rem; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 API代理服务器</h1>
            <p>实时统计面板</p>
        </div>
        
        <div class="stats-table-container">
            <h2>📊 API 调用统计</h2>
            <table>
                <thead>
                    <tr>
                        <th>API 端点</th>
                        <th>24小时</th>
                        <th>7天</th>
                        <th>30天</th>
                        <th>总计</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.keys(apiMapping).map(endpointKey => {
                        const endpointStats = stats.endpoints[endpointKey] || { today: 0, week: 0, month: 0, total: 0 };
                        return `
                        <tr>
                            <td>${endpointKey}</td>
                            <td>${endpointStats.today}</td>
                            <td>${endpointStats.week}</td>
                            <td>${endpointStats.month}</td>
                            <td>${endpointStats.total}</td>
                        </tr>`;
                    }).join('')}
                    <tr>
                        <td><strong>总计 (所有定义端点)</strong></td>
                        <td><strong>${totalToday}</strong></td>
                        <td><strong>${totalWeek}</strong></td>
                        <td><strong>${totalMonth}</strong></td>
                        <td><strong>${stats.total}</strong></td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div class="info-section">
             <p>当前活动端点数: ${Object.keys(stats.endpoints).filter(k => stats.endpoints[k].total > 0).length} / ${Object.keys(apiMapping).length}</p>
             <p>服务状态: <span style="color: #28a745; font-weight: bold;">🟢 运行中</span></p>
             <p>统计API: <code>${currentDomain}/stats</code> (JSON)</p>
        </div>

    </div>
    <button class="refresh-btn" onclick="location.reload()">🔄 刷新数据</button>
    <div id="toast" class="toast"></div>
    
    <script>
        // Simplified JS: Only toast and auto-refresh remain relevant from original complex script
        setInterval(() => { 
            // console.log('Auto-reloading page for fresh stats...');
            location.reload(); 
        }, 60000); // Refresh every 60 seconds

        function showToast(message) {
            const toast = document.getElementById('toast');
            toast.textContent = message; toast.classList.add('show');
            setTimeout(() => { toast.classList.remove('show'); }, 3000);
        }

        // Fallback copy function (if needed, but elements to copy are now removed from this page)
        // function fallbackCopy(text) { ... } 
        // function copyToClipboard(text) { ... }

        // No chart or complex DOM manipulation needed here anymore.
        // The /stats endpoint link is provided as text.
        document.addEventListener('DOMContentLoaded', function() {
            console.log("统计页面加载完成。数据每分钟自动刷新。");
        });
    </script>
</body>
</html>`;
}

serve(async (request: Request) => {
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
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
    });
  }

  // Proxy mode logic remains, but make sure to use random UA if not provided
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
      const allowedHeaders = ["accept", "content-type", "authorization", "accept-encoding", "accept-language", "cache-control", "pragma", "x-requested-with"];
      request.headers.forEach((value, key) => {
        if (allowedHeaders.includes(key.toLowerCase()) || key.toLowerCase().startsWith("sec-") || key.toLowerCase().startsWith("x-")) {
          headers.set(key, value);
        }
      });
      if (!headers.has("user-agent")) { // Add random UA if not present
        headers.set("user-agent", getRandomUserAgent());
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
      responseHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, " + allowedHeaders.join(", "));
      responseHeaders.set("Access-Control-Max-Age", "86400");
      
      responseHeaders.set("X-Content-Type-Options", "nosniff");
      responseHeaders.delete("X-Frame-Options");
      responseHeaders.set("Referrer-Policy", "no-referrer-when-downgrade");

      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: responseHeaders });
      }
      
      if (response.status >= 300 && response.status < 400 && response.headers.has("location")) {
          let newLocation = response.headers.get("location")!;
          if (newLocation.startsWith("/")) {
              newLocation = `${baseUrl}${newLocation}`;
          }
          if (newLocation) {
              responseHeaders.set("Location", `${url.origin}/proxy/${newLocation}`);
          }
          return new Response(null, { status: response.status, headers: responseHeaders });
      }

      const contentType = responseHeaders.get("content-type") || "";
      if (contentType.includes("text/html")) {
        let text = await response.text();
        const currentProxyBase = `${url.origin}/proxy/`;
        text = text.replace(/(href|src|action)=["']\/(?!\/)/gi, `$1="${currentProxyBase}${baseUrl}/`);
        text = text.replace(/(href|src|action)=["'](https?:\/\/[^"']+)/gi, (match, attr, originalUrl) => {
            return `${attr}="${currentProxyBase}${originalUrl}"`;
        });
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
            if(baseHrefVal.startsWith('/')) newBase = `${baseUrl}${baseHrefVal}`;
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
      console.error("Proxy request failed:", error.message, error.stack);
      return new Response("Proxy Request Failed: " + error.message, { status: 502 });
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
    const commonApiHeaders = ["content-type", "authorization", "accept", "anthropic-version"];
    request.headers.forEach((value, key) => {
        if (commonApiHeaders.includes(key.toLowerCase()) || key.toLowerCase().startsWith("x-")) {
            headers.set(key, value);
        }
    });
    
    if (prefix === "/claude" && !headers.has("anthropic-version")) {
        headers.set("anthropic-version", "2023-06-01");
    }
    
    if (!headers.has("user-agent")) { // Add random UA if not present
        headers.set("user-agent", getRandomUserAgent());
    }

    let requestBody: BodyInit | null | undefined = request.body;
    if (prefix === "/gnothink" && request.method === "POST" && request.body && (headers.get("content-type") || "").includes("application/json")) {
      const originalBodyText = await request.text();
      if (originalBodyText) {
        try {
            const bodyJson = JSON.parse(originalBodyText);
            bodyJson.generationConfig = {
              ...(bodyJson.generationConfig || {}),
              thinkingConfig: {
                thinkingBudget: 0
              }
            };
            requestBody = JSON.stringify(bodyJson);
        } catch (e) {
            console.error("Failed to parse body for /gnothink, proxying as is.", e);
            requestBody = originalBodyText; // Send original if parsing fails
        }
      } else {
        requestBody = null;
      }
    } else if (request.method === "GET" || request.method === "HEAD") {
      requestBody = undefined;
    }

    const apiResponse = await fetch(targetApiUrl, {
      method: request.method,
      headers: headers,
      body: requestBody,
    });

    const responseHeaders = new Headers(apiResponse.headers);
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH");
    responseHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization, anthropic-version, " + commonApiHeaders.join(", "));
    
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
    console.error("API proxy fetch failed for prefix " + prefix + ":", error);
    return new Response("Internal Server Error during API proxy", { status: 500 });
  }
});

function extractPrefixAndRest(pathname: string, prefixes: string[]): [string | null, string | null] {
  for (const prefix of prefixes) {
    if (pathname.startsWith(prefix)) {
      return [prefix, pathname.slice(prefix.length)];
    }
  }
  return [null, null];
}

console.log("🚀 API代理服务器已启动 (Deno)");
console.log("📄 统计页面每分钟自动刷新");
console.log("🔧 支持的端点:", Object.keys(apiMapping).join(", "));
