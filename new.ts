import { serve } from "https://deno.land/std/http/server.ts";

// 定义一个 User-Agent 字符串的列表
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

// apiMapping 只保留指定模型
const apiMapping = {
  "/gemini": "https://generativelanguage.googleapis.com",
  "/gnothink": "https://generativelanguage.googleapis.com",
  "/groq": "https://api.groq.com/openai",
  '/gmi': 'https://api.gmi-serving.com',
  '/openrouter': 'https://openrouter.ai/api',
  '/chutes': 'https://llm.chutes.ai',
  '/nebius':'https://api.studio.nebius.com'
};

// Stats storage
const stats = {
  total: 0,
  endpoints: {} as Record<string, { total: number; today: number; week: number; month: number }>,
  requests: [] as Array<{ endpoint: string; timestamp: number }>
};

// Initialize stats (此部分会动态适应新的 apiMapping)
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
  if (stats.endpoints[endpoint]) { // Ensure endpoint exists in stats
    stats.endpoints[endpoint].total++;
  } else {
    // If recordRequest is called for an endpoint not in apiMapping (shouldn't happen with extractPrefixAndRest)
    // initialize it. This is a failsafe.
    console.warn(`Recording request for unknown endpoint: ${endpoint}`);
    stats.endpoints[endpoint] = { total: 0, today: 0, week: 0, month: 0 };
     stats.endpoints[endpoint].total++;
  }
  stats.requests.push({ endpoint, timestamp: now });
  
  // Clean up old requests (older than 30 days)
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
  stats.requests = stats.requests.filter(req => req.timestamp > thirtyDaysAgo);
  
  updateSummaryStats(); // Update summary stats like today, week, month totals
}

function updateSummaryStats() {
  const now = Date.now();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);
  const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

  // Reset aggregated counts for all endpoints in stats.endpoints
  for (const endpointKey of Object.keys(stats.endpoints)) {
    stats.endpoints[endpointKey].today = 0;
    stats.endpoints[endpointKey].week = 0;
    stats.endpoints[endpointKey].month = 0;
  }

  // Recalculate based on filtered requests
  for (const req of stats.requests) {
    const endpointStats = stats.endpoints[req.endpoint];
    // Only aggregate if the endpoint still exists in stats (should always be true if initialized correctly)
    if (!endpointStats) continue; 

    if (req.timestamp > oneDayAgo) {
      endpointStats.today++;
    }
    if (req.timestamp > sevenDaysAgo) {
      endpointStats.week++;
    }
    if (req.timestamp > thirtyDaysAgo) {
      endpointStats.month++;
    }
  }
}

// Minimal HTML generation function
function generateStatsHTML() {
  updateSummaryStats(); // Ensure summary stats are up-to-date before embedding

  // HTML content is now generated and placed in an artifact above.
  // This function only needs to return the string.
  // The JS inside the HTML will use the rawStatsData variable directly.
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API代理服务器 - 24小时统计</title>
    <style>
        body { 
            font-family: sans-serif; 
            background-color: #f0f0f0; 
            color: #333; 
            line-height: 1.6; 
            margin: 20px;
            text-align: center; /* Center content */
        }
        .container { 
            max-width: 600px; 
            margin: 40px auto; 
            background-color: #fff; 
            padding: 20px; 
            border-radius: 8px; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
            text-align: left; /* Align list left */
        }
        h1 { 
            text-align: center; 
            color: #555; 
            margin-bottom: 20px;
        }
        ul {
            list-style: none;
            padding: 0;
        }
        li {
            padding: 8px 0;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
        }
        li:last-child {
            border-bottom: none;
        }
        .endpoint-name {
            font-weight: bold;
        }
        .stats-value {
            color: #007bff;
        }
         .info-footer {
            font-size: 0.9em;
            color: #777;
            margin-top: 20px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>API代理服务器 - 24小时统计</h1>
        <ul id="stats-list">
            <!-- Stats will be loaded here by JavaScript -->
            <li>加载中...</li>
        </ul>
        <div class="info-footer">
            <p>显示过去 24 小时的请求数。</p>
            <p>数据每分钟自动刷新。</p>
             <p>完整 JSON 统计 API 地址: /stats</p>
        </div>
    </div>

    <script>
        // Raw stats data embedded from backend
        const rawStatsData = ${JSON.stringify(stats)};
        const statsList = document.getElementById('stats-list');

        function renderStats(statsData) {
            statsList.innerHTML = ''; // Clear previous content
            const endpoints = statsData.endpoints;
            const endpointKeys = Object.keys(endpoints).sort(); // Sort endpoints alphabetically

            if (endpointKeys.length === 0) {
                 statsList.innerHTML = '<li>暂无统计数据</li>';
                 return;
            }

            endpointKeys.forEach(key => {
                const endpointStats = endpoints[key];
                // Only display endpoints that were actually initiated (i.e., are in apiMapping)
                // This check implicitly happens because stats.endpoints is initialized from apiMapping
                if (endpointStats) {
                    const listItem = document.createElement('li');
                    listItem.innerHTML = \`
                        <span class="endpoint-name">${key}</span>
                        <span>24h: <span class="stats-value">${endpointStats.today}</span></span>
                    \`;
                    statsList.appendChild(listItem);
                }
            });
        }

        // Initial render
        renderStats(rawStatsData);

        // Auto refresh every minute
        setInterval(() => { location.reload(); }, 60000);

    </script>
</body>
</html>
`;
}

// Deno server logic
serve(async (request) => {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Serve the minimal stats HTML page on / or /index.html
  if (pathname === "/" || pathname === "/index.html") {
     return new Response(generateStatsHTML(), { // No need to pass request if not used in generateStatsHTML
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Handle robots.txt
  if (pathname === "/robots.txt") {
    return new Response("User-agent: *\nDisallow: /", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // Serve the raw JSON stats data
  if (pathname === "/stats") {
    updateSummaryStats(); // Make sure summary is up-to-date for the API
    // Filter stats.requests to only include those for mapped endpoints for the JSON API?
    // Or just expose all recorded requests within the time window?
    // Let's keep it simple and expose summary stats and filtered requests.
    const mappedEndpoints = Object.keys(apiMapping);
    const relevantRequests = stats.requests.filter(req => mappedEndpoints.includes(req.endpoint));

    return new Response(JSON.stringify({
        totalRequestsAllTime: stats.total,
        summaryStats: stats.endpoints, // Contains today, week, month, total for each mapped endpoint
        recentRequestsSample: relevantRequests // Raw requests within 30d for mapped endpoints
    }, null, 2), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*" // Allow CORS for stats API
      },
    });
  }
  
  // Universal Proxy mode (remains functional)
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
        const allowedHeaders = [
            "accept", 
            "content-type", 
            "authorization", 
            "accept-encoding", 
            "accept-language", 
            "cache-control", 
            "pragma", 
            "x-requested-with", 
            "x-forwarded-for", 
            "x-real-ip" 
        ]; 
        
        request.headers.forEach((value, key) => {
            if (allowedHeaders.includes(key.toLowerCase()) || key.toLowerCase().startsWith("sec-") || key.toLowerCase().startsWith("x-") || key.toLowerCase().startsWith("http-")) {
                 if (!(key.toLowerCase() === 'x-forwarded-for' || key.toLowerCase() === 'x-real-ip')) {
                     headers.set(key, value);
                 }
            }
        });

        if (request.headers.has("user-agent")) {
            headers.set("User-Agent", request.headers.get("user-agent") as string);
        } else {
            headers.set("User-Agent", getRandomUserAgent());
        }
        
        headers.set("X-Forwarded-For", request.conn.remoteAddr.hostname);
        headers.set("X-Real-IP", request.conn.remoteAddr.hostname);

        if (request.headers.has("referer")) {
             const clientReferer = request.headers.get("referer")!;
             if (clientReferer.startsWith(url.origin)) {
                try {
                    const oldRefererUrl = new URL(clientReferer);
                    const oldProxyPathIndex = oldRefererUrl.pathname.indexOf("/proxy/");
                    if (oldProxyPathIndex !== -1) {
                         const originalRefererTarget = oldRefererUrl.pathname.substring(oldProxyPathIndex + "/proxy/".length) + oldRefererUrl.search + oldRefererUrl.hash;
                         if (originalRefererTarget.startsWith("http")) {
                             headers.set("Referer", originalRefererTarget);
                         } else {
                              headers.set("Referer", targetUrl.origin);
                         }
                    } else {
                         headers.set("Referer", targetUrl.origin);
                    }
                } catch (e) {
                     console.warn("Malformed client Referer header:", clientReferer, "Error:", e);
                     headers.set("Referer", targetUrl.origin);
                }
                
             } else {
                 headers.set("Referer", clientReferer);
             }
        } else {
              console.debug("No Referer header from client for proxy request.");
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
        const allowedMethods = "GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH";
        // Ensure allowedHeaders are included in Access-Control-Allow-Headers
        const allowedHeadersForCors = "Content-Type, Authorization, X-Requested-With, X-Forwarded-For, X-Real-IP, HTTP-Referer, X-Title, " + allowedHeaders.join(", ");
        responseHeaders.set("Access-Control-Allow-Methods", allowedMethods);
        responseHeaders.set("Access-Control-Allow-Headers", allowedHeadersForCors);
        responseHeaders.set("Access-Control-Max-Age", "86400");

        responseHeaders.set("X-Content-Type-Options", "nosniff");
        responseHeaders.delete("X-Frame-Options"); 
        responseHeaders.set("Referrer-Policy", "no-referrer"); 

        if (request.method === "OPTIONS") {
            return new Response(null, { status: 204, headers: responseHeaders });
        }
        
        if (response.status >= 300 && response.status < 400 && response.headers.has("location")) {
            let newLocation = response.headers.get("location");
             if (newLocation) {
                try {
                   const redirectUrl = new URL(newLocation, targetUrl.toString()); 
                   responseHeaders.set("Location", `${url.origin}/proxy/${redirectUrl.toString()}`);
                } catch (e) {
                   console.error("Failed to rewrite redirect Location header:", newLocation, "Error:", e);
                   responseHeaders.set("Location", newLocation); 
                }
             }
            return new Response(null, { status: response.status, headers: responseHeaders });
        }

        const contentType = responseHeaders.get("content-type") || "";
        if (contentType.includes("text/html")) {
            let text = await response.text();
            const currentProxyBase = `${url.origin}/proxy/`;
            text = text.replace(/(href|src|action)=["']\/(?!\/)/gi, `$1="${currentProxyBase}${baseUrl}/`);
            text = text.replace(/(href|src|action)=["'](https?:\/\/[^"']+)/gi, (match, attr, originalUrl) => {
                if (originalUrl.startsWith(currentProxyBase)) return match; 
                 return `${attr}="${currentProxyBase}${originalUrl}"`;
            });
            text = text.replace(/srcset=["']([^"']+)["']/gi, (match, srcset) => {
                const newSrcset = srcset.split(',').map(s => {
                    const parts = s.trim().split(/\s+/);
                    let u = parts[0];
                    if (u.startsWith('/')) u = `${baseUrl}${u}`;
                     if (u.startsWith(currentProxyBase)) return s; 
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
             responseHeaders.delete("Content-Security-Policy");
             responseHeaders.delete("Transfer-Encoding");

            return new Response(text, { status: response.status, headers: responseHeaders });
        } else if (contentType.includes("text/css")) {
            let text = await response.text();
            const currentProxyBase = `${url.origin}/proxy/`;
            text = text.replace(/url\((["']?)([^)"']+)\1\)/gi, (match, quote, cssUrl) => {
                let u = cssUrl;
                if (u.startsWith('data:') || u.startsWith('#')) return match; 
                
                try {
                    const resolvedUrl = new URL(u, targetUrl.toString());
                    return `url(${quote}${currentProxyBase}${resolvedUrl.toString()}${quote})`;
                } catch (e) {
                     console.warn("Failed to rewrite CSS URL:", u, "Error:", e);
                     return match; 
                }
            });
             responseHeaders.delete("Transfer-Encoding");

            return new Response(text, { status: response.status, headers: responseHeaders });

        } else {
              responseHeaders.delete("Transfer-Encoding");
            return new Response(response.body, { status: response.status, headers: responseHeaders });
        }

    } catch (error) {
        console.error("Proxy request failed:", error.message, error.stack);
        return new Response("Proxy Request Failed: " + error.message, { status: 502 }); 
    }
}

  // API Proxy mode (remains functional)
  const [prefix, rest] = extractPrefixAndRest(pathname, Object.keys(apiMapping));
  if (!prefix) {
    return new Response("Not Found", { status: 404 });
  }

  recordRequest(prefix); // Record incoming API calls from the mapped endpoints

  const targetApiUrl = `${apiMapping[prefix]}${rest}${url.search}`;

  try {
    const headers = new Headers();
    const commonApiHeaders = ["content-type", "authorization", "accept"];
    request.headers.forEach((value, key) => {
        if (commonApiHeaders.includes(key.toLowerCase()) || key.toLowerCase().startsWith("x-") || key.toLowerCase().startsWith("http-")) { 
            headers.set(key, value);
        }
    });
    
    headers.set("User-Agent", getRandomUserAgent());

    let requestBody: BodyInit | null = null;
    if (prefix === "/gnothink" && request.method === "POST" && request.body && headers.get("content-type")?.includes("application/json")) {
       try {
           const originalBodyText = await request.text();
            if (originalBodyText) {
                const bodyJson = JSON.parse(originalBodyText);
                
                bodyJson.generationConfig = {
                ...(bodyJson.generationConfig || {}),
                thinkingConfig: {
                    thinkingBudget: 0
                }
                };
                
                requestBody = JSON.stringify(bodyJson);
            } else {
                 requestBody = null;
            }
       } catch (e) {
           console.error("Failed to process /gnothink body:", e);
           return new Response("Invalid JSON body for /gnothink", { status: 400 });
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
    const allowedHeadersForApiCors = "Content-Type, Authorization, anthropic-version, X-Requested-With, X-Forwarded-For, X-Real-IP, HTTP-Referer, X-Title, " + commonApiHeaders.join(", ");
    responseHeaders.set("Access-Control-Allow-Headers", allowedHeadersForApiCors);
    
    responseHeaders.set("X-Content-Type-Options", "nosniff");
    responseHeaders.set("X-Frame-Options", "DENY"); 
    responseHeaders.set("Referrer-Policy", "no-referrer");

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: responseHeaders });
    }

     responseHeaders.delete("Transfer-Encoding");

    return new Response(apiResponse.body, {
      status: apiResponse.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("API proxy fetch failed:", error);
    return new Response("Internal Server Error during API proxy: " + (error instanceof Error ? error.message : String(error)), { status: 500 });
  }
});

// Helper function to extract the API prefix and the rest of the path
function extractPrefixAndRest(pathname: string, prefixes: string[]) {
  // Sort prefixes by length desc to match e.g., /gnothink before /gemini
  const sortedPrefixes = [...prefixes].sort((a, b) => b.length - a.length);
  for (const prefix of sortedPrefixes) {
    if (pathname.startsWith(prefix)) {
      return [prefix, pathname.slice(prefix.length)];
    }
  }
  return [null, null];
}

console.log("🚀 API代理服务器已启动 (Deno)");
console.log("🕒 统计数据每分钟自动刷新页面");
