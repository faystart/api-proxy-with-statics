import { serve } from "https://deno.land/std/http/server.ts";

// 用户代理列表
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

// 获取随机 User-Agent
function getRandomUserAgent(): string {
  const randomIndex = Math.floor(Math.random() * userAgents.length);
  return userAgents[randomIndex];
}

const apiMapping = {
  "/gemini": "https://generativelanguage.googleapis.com",
  "/gnothink": "https://generativelanguage.googleapis.com",
  "/groq": "https://api.groq.com/openai",
  "/gmi": "https://api.gmi-serving.com",
  "/openrouter": "https://openrouter.ai/api",
  "/chutes": "https://llm.chutes.ai",
  "/nebius": "https://api.studio.nebius.com",
};

// Stats storage
const stats = {
  total: 0,
  endpoints: {} as Record<string, { total: number; today: number; week: number; month: number }>,
  requests: [] as Array<{ endpoint: string; timestamp: number }>,
};

// Initialize stats
for (const endpoint of Object.keys(apiMapping)) {
  stats.endpoints[endpoint] = {
    total: 0,
    today: 0, // Aggregated count for last 24h
    week: 0, // Aggregated count for last 7d
    month: 0, // Aggregated count for last 30d
  };
}

function recordRequest(endpoint) {
  const now = Date.now();
  stats.total++;
  stats.endpoints[endpoint].total++;
  stats.requests.push({ endpoint, timestamp: now });

  // Clean up old requests (older than 30 days)
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
  stats.requests = stats.requests.filter((req) => req.timestamp > thirtyDaysAgo);

  updateSummaryStats(); // Update summary stats like today, week, month totals
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
    if (!endpointStats) continue; // Should not happen if initialized correctly

    if (req.timestamp > oneDayAgo) {
      endpointStats.today++;
    }
    if (req.timestamp > sevenDaysAgo) {
      endpointStats.week++;
    }
    if (req.timestamp > thirtyDaysAgo) { // This will always be true due to cleanup, but good for clarity
      endpointStats.month++;
    }
  }
}

function generateStatsHTML(request) {
  updateSummaryStats(); // Ensure summary stats are up-to-date

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API代理服务器 - 统计面板</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #5B9CFA; min-height: 100vh; padding: 20px; }
        .container { max-width: 1400px; margin: 0 auto; }
        .header { text-align: center; color: white; margin-bottom: 40px; }
        .header h1 { font-size: 2.5rem; margin-bottom: 10px; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
        .header p { font-size: 1.1rem; opacity: 0.9; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .stat-card { background: rgba(255, 255, 255, 0.95); border-radius: 16px; padding: 24px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.2); transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .stat-card:hover { transform: translateY(-5px); box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15); }
        .stat-card h3 { font-size: 1.2rem; color: #333; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
        .api-icon { width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; color: white; }
        .total-icon { background: #6366f1; }
        .stat-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #eee; }
        .stat-row:last-child { border-bottom: none; }
        .stat-label { color: #666; font-size: 0.9rem; }
        .stat-value { font-size: 1.1rem; font-weight: 600; color: #333; }
        .refresh-btn { position: fixed; bottom: 30px; right: 30px; background: #6366f1; color: white; border: none; border-radius: 50px; padding: 12px 24px; font-size: 1rem; cursor: pointer; box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3); transition: all 0.3s ease; z-index: 1000; }
        .refresh-btn:hover { background: #5855eb; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4); }
        @media (max-width: 768px) {
            .stats-grid { grid-template-columns: 1fr; }
            .header h1 { font-size: 2rem; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header"><h1>🚀 API代理服务器</h1><p>实时统计</p></div>
        
        <div class="stats-grid">
            ${Object.keys(apiMapping).map(endpoint => {
              const epStats = stats.endpoints[endpoint] || { today: 0, week: 0, month: 0, total: 0 };
              const endpointName = endpoint.replace('/', '');
              const iconChar = endpointName.substring(0, 1).toUpperCase();
              // 生成随机颜色给每个端点图标
              const iconColor = `#${(Math.random() * 0xFFFFFF << 0).toString(16).padStart(6, '0')}`;
              return `
            <div class="stat-card">
                <h3><div class="api-icon" style="background: ${iconColor}">${iconChar}</div> ${endpointName.charAt(0).toUpperCase() + endpointName.slice(1)} API 调用统计</h3>
                <div class="stat-row"><span class="stat-label">24小时</span><span class="stat-value">${epStats.today}</span></div>
                <div class="stat-row"><span class="stat-label">7天</span><span class="stat-value">${epStats.week}</span></div>
                <div class="stat-row"><span class="stat-label">30天</span><span class="stat-value">${epStats.month}</span></div>
                <div class="stat-row"><span class="stat-label">总计</span><span class="stat-value">${epStats.total}</span></div>
            </div>`;
            }).join('')}
            <div class="stat-card">
                <h3><div class="api-icon total-icon">📊</div>总体统计</h3>
                <div class="stat-row"><span class="stat-label">总请求数</span><span class="stat-value">${stats.total}</span></div>
                <div class="stat-row"><span class="stat-label">活跃端点</span><span class="stat-value">${Object.keys(stats.endpoints).filter(k => stats.endpoints[k].total > 0).length}</span></div>
                <div class="stat-row"><span class="stat-label">服务状态</span><span class="stat-value" style="color: #10b981;">🟢 运行中</span></div>
            </div>
        </div>
    </div>
    <button class="refresh-btn" onclick="location.reload()">🔄 刷新数据</button>
    
    <script>
        // 每分钟自动刷新页面
        setInterval(() => { location.reload(); }, 60000);
    </script>
</body>
</html>`;
}

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
    updateSummaryStats(); // Make sure summary is up-to-date for the API
    return new Response(JSON.stringify(stats, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // Allow CORS for stats API
      },
    });
  }

  // Proxy mode
  if (pathname.startsWith("/proxy/")) {
    try {
      const fullUrl = url.href;
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
        if (allowedHeaders.includes(key.toLowerCase()) || key.toLowerCase().startsWith("sec-") || key.toLowerCase().startsWith("x-")) { // Keep sec- and x- headers
          headers.set(key, value);
        }
      });
      // 如果请求头中没有 user-agent，则添加一个随机的
      if (!headers.has("user-agent")) {
        headers.set("User-Agent", getRandomUserAgent());
      }
      if (request.headers.has("referer")) {
        headers.set("Referer", request.headers.get("referer").replace(url.origin, targetUrl.origin));
      }

      const response = await fetch(targetUrl.toString(), {
        method: request.method,
        headers: headers,
        body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
        redirect: "manual", // Handle redirects manually if needed, or 'follow'
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

      // Security headers (can be adjusted)
      responseHeaders.set("X-Content-Type-Options", "nosniff");
      responseHeaders.delete("X-Frame-Options"); // Or set to SAMEORIGIN if proxying own content
      responseHeaders.set("Referrer-Policy", "no-referrer-when-downgrade"); // Common policy

      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: responseHeaders });
      }

      // Handle redirects by rewriting Location header
      if (response.status >= 300 && response.status < 400 && response.headers.has("location")) {
        let newLocation = response.headers.get("location");
        // If location is relative, prepend the target's base URL
        if (newLocation && newLocation.startsWith("/")) {
          newLocation = `${baseUrl}${newLocation}`;
        }
        // Rewrite the location to go through the proxy
        if (newLocation) {
          responseHeaders.set("Location", `${url.origin}/proxy/${newLocation}`);
        }
        return new Response(null, { status: response.status, headers: responseHeaders });
      }

      const contentType = responseHeaders.get("content-type") || "";
      if (contentType.includes("text/html")) {
        let text = await response.text();
        // Basic HTML rewriting (can be very complex for modern SPAs)
        const currentProxyBase = `${url.origin}/proxy/`;
        text = text.replace(/(href|src|action)=["']\/(?!\/)/gi, `$1="${currentProxyBase}${baseUrl}/`);
        text = text.replace(/(href|src|action)=["'](https?:\/\/[^"']+)/gi, (match, attr, originalUrl) => {
          return `${attr}="${currentProxyBase}${originalUrl}"`;
        });
        // Rewrite srcset
        text = text.replace(/srcset=["']([^"']+)["']/gi, (match, srcset) => {
          const newSrcset = srcset.split(',').map((s) => {
            const parts = s.trim().split(/\s+/);
            let u = parts[0];
            if (u.startsWith('/')) u = `${baseUrl}${u}`;
            return `${currentProxyBase}${u}${parts[1] ? ' ' + parts[1] : ''}`;
          }).join(', ');
          return `srcset="${newSrcset}"`;
        });
        // Remove integrity attributes as content is modified
        text = text.replace(/\s+integrity=["'][^"']+["']/gi, '');
        // Attempt to fix base href if present
        text = text.replace(/<base\s+href=["']([^"']+)["'][^>]*>/gi, (match, baseHrefVal) => {
          let newBase = baseHrefVal;
          if (baseHrefVal.startsWith('/')) newBase = `${baseUrl}${baseHrefVal}`;
          return `<base href="${currentProxyBase}${newBase}">`;
        });

        return new Response(text, { status: response.status, headers: responseHeaders });
      } else if (contentType.includes("text/css")) {
        let text = await response.text();
        // Rewrite url() in CSS
        const currentProxyBase = `${url.origin}/proxy/`;
        text = text.replace(/url\(([^)]+)\)/gi, (match, cssUrl) => {
          let u = cssUrl.trim().replace(/["']/g, '');
          if (u.startsWith('data:') || u.startsWith('#')) return match; // Skip data URIs and fragments
          if (u.startsWith('/')) u = `${baseUrl}${u}`;
          else if (!u.startsWith('http')) u = `${new URL(u, targetUrl.toString()).href}`; // Resolve relative URLs
          return `url(${currentProxyBase}${u})`;
        });
        return new Response(text, { status: response.status, headers: responseHeaders });
      }

      return new Response(response.body, { status: response.status, headers: responseHeaders });
    } catch (error) {
      console.error("Proxy request failed:", error.message, error.stack);
      return new Response("Proxy Request Failed: " + error.message, { status: 502 }); // Bad Gateway
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
    // Forward specific headers, be selective for security
    const commonApiHeaders = ["content-type", "authorization", "accept", "anthropic-version", "user-agent"]; // 包含 user-agent
    request.headers.forEach((value, key) => {
      if (commonApiHeaders.includes(key.toLowerCase()) || key.toLowerCase().startsWith("x-")) {
        headers.set(key, value);
      }
    });

    // 如果请求头中没有 user-agent，则添加一个随机的
    if (!headers.has("user-agent")) {
      headers.set("User-Agent", getRandomUserAgent());
    }

    // Add required headers for specific APIs
    if (prefix === "/claude" && !headers.has("anthropic-version")) {
      headers.set("anthropic-version", "2023-06-01");
    }

    // Handle special processing for gnothink
    let requestBody: BodyInit | null = null;
    if (prefix === "/gnothink" && request.method === "POST" && request.body && headers.get("content-type")?.includes("application/json")) {
      const originalBodyText = await request.text();
      if (originalBodyText) {
        const bodyJson = JSON.parse(originalBodyText);

        // Add thinkingBudget: 0 to disable thinking mode
        bodyJson.generationConfig = {
          ...(bodyJson.generationConfig || {}),
          thinkingConfig: {
            thinkingBudget: 0,
          },
        };

        requestBody = JSON.stringify(bodyJson);
      } else {
        requestBody = null;
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
    responseHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization, anthropic-version, User-Agent, " + commonApiHeaders.join(", ")); // 包含 User-Agent

    // Security headers
    responseHeaders.set("X-Content-Type-Options", "nosniff");
    responseHeaders.set("X-Frame-Options", "DENY"); // APIs shouldn't be framed
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

function extractPrefixAndRest(pathname, prefixes) {
  for (const prefix of prefixes) {
    if (pathname.startsWith(prefix)) {
      return [prefix, pathname.slice(prefix.length)];
    }
  }
  return [null, null];
}

console.log("🚀 API代理服务器已启动 (Deno)");
console.log("🕒 统计数据每分钟自动刷新页面");
