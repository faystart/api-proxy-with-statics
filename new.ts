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
  total: 0, // Total includes all requests, including proxy
  endpoints: {} as Record<string, { total: number; today: number; week: number; month: number }>, // Stats only for mapped API endpoints
  requests: [] as Array<{ endpoint: string; timestamp: number }> // Raw requests within a time window for aggregation
};

// Initialize stats for the initially defined apiMapping endpoints
// This ensures that even if an endpoint has 0 calls, it appears in stats.endpoints
for (const endpoint of Object.keys(apiMapping)) {
  stats.endpoints[endpoint] = {
    total: 0,
    today: 0, 
    week: 0,  
    month: 0  
  };
}

// Function to record a request for a specific endpoint
function recordRequest(endpoint: string) {
  const now = Date.now();
  stats.total++; // Increment overall total
  
  // Check if the endpoint is one of the mapped API endpoints
  if (Object.keys(apiMapping).includes(endpoint)) {
      // If it is a mapped API endpoint, record its stats
      if (!stats.endpoints[endpoint]) {
           // This case should ideall not be needed if initialization runs over all apiMapping keys,
           // but as a safeguard if recordRequest is somehow called for a mapped key not initialized yet.
           console.warn(`Initializing stats for mapped endpoint dynamically: ${endpoint}`);
           stats.endpoints[endpoint] = { total: 0, today: 0, week: 0, month: 0 };
      }
      stats.endpoints[endpoint].total++; // Increment total for this specific endpoint
       // We don't record proxy requests here, only API requests for mapped endpoints
       stats.requests.push({ endpoint, timestamp: now }); 
  } else {
      // Optionally log requests to non-mapped paths (like /proxy/ or missing paths)
      // console.debug(`Request to unmapped path: ${endpoint}`); // Too noisy perhaps
      // We don't record these in stats.endpoints or stats.requests array
  }

  // Clean up old requests from the requests array (older than 30 days)
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
  stats.requests = stats.requests.filter(req => req.timestamp > thirtyDaysAgo);
  
  // Update time-windowed summary stats for all *mapped* endpoints
  updateSummaryStats();
}

// Function to recalculate today/week/month stats
function updateSummaryStats() {
  const now = Date.now();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);
  const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

  // Reset aggregated counts for all endpoints that exist in stats.endpoints
  // This includes both initially mapped and dynamically added ones (if any were added)
  for (const endpointKey of Object.keys(stats.endpoints)) {
     // Ensure the endpointKey is still in apiMapping before resetting time-windowed stats?
     // No, the requirement is to show stats for endpoints "in apiMapping".
     // The initialization and recordRequest ensures only mapped endpoints get into stats.endpoints initially.
     // So, we reset all currently tracked endpoints.
    stats.endpoints[endpointKey].today = 0;
    stats.endpoints[endpointKey].week = 0;
    stats.endpoints[endpointKey].month = 0;
  }

  // Recalculate based on the filtered requests array (which only contains mapped API calls)
  for (const req of stats.requests) {
    const endpointStats = stats.endpoints[req.endpoint];
    // This check should always pass if requests only contains mapped endpoints
    if (!endpointStats) {
        console.warn(`Request logged for endpoint not found in current stats.endpoints structure: ${req.endpoint}`);
        continue; 
    } 

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

  // Embed the entire stats object as a JSON string in the HTML script
  const statsJsonString = JSON.stringify(stats);

  // Use standard string concatenation for the outer HTML template
  // This avoids Deno trying to interpret the inner JavaScript's template literals.
  return '<!DOCTYPE html>\n' +
    '<html lang="zh-CN">\n' +
    '<head>\n' +
    '    <meta charset="UTF-8">\n' +
    '    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '    <title>API代理服务器 - 24小时统计</title>\n' +
    '    <style>' + // Start of <style> block
    '        body { \n' +
    '            font-family: sans-serif; \n' +
    '            background-color: #f0f0f0; \n' +
    '            color: #333; \n' +
    '            line-height: 1.6; \n' +
    '            margin: 20px;\n' +
    '            text-align: center;\n' +
    '        }\n' +
    '        .container { \n' +
    '            max-width: 600px; \n' +
    '            margin: 40px auto; \n' +
    '            background-color: #fff; \n' +
    '            padding: 20px; \n' +
    '            border-radius: 8px; \n' +
    '            box-shadow: 0 2px 4px rgba(0,0,0,0.1); \n' +
    '            text-align: left;\n' +
    '        }\n' +
    '        h1 { \n' +
    '            text-align: center; \n' +
    '            color: #555; \n' +
    '            margin-bottom: 20px;\n' +
    '        }\n' +
    '        ul {\n' +
    '            list-style: none;\n' +
    '            padding: 0;\n' +
    '        }\n' +
    '        li {\n' +
    '            padding: 8px 0;\n' +
    '            border-bottom: 1px solid #eee;\n' +
    '            display: flex;\n' +
    '            justify-content: space-between;\n' +
    '        }\n' +
    '        li:last-child {\n' +
    '            border-bottom: none;\n' +
    '        }\n' +
    '        .endpoint-name {\n' +
    '            font-weight: bold;\n' +
    '        }\n' +
    '        .stats-value {\n' +
    '            color: #007bff;\n' +
    '        }\n' +
    '         .info-footer {\n' +
    '            font-size: 0.9em;\n' +
    '            color: #777;\n' +
    '            margin-top: 20px;\n' +
    '            text-align: center;\n' +
    '        }\n' +
    '    </style>\n' + // End of <style> block
    '</head>\n' +
    '<body>\n' +
    '    <div class="container">\n' +
    '        <h1>API代理服务器 - 24小时统计</h1>\n' +
    '        <ul id="stats-list">\n' +
    '            <!-- Stats will be loaded here by JavaScript -->\n' +
    '            <li>加载中...</li>\n' +
    '        </ul>\n' +
    '        <div class="info-footer">\n' +
    '            <p>显示过去 24 小时的请求数。</p>\n' +
    '            <p>数据每分钟自动刷新。</p>\n' +
    '             <p>完整 JSON 统计 API 地址: <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">/stats</code></p>\n' +
    '        </div>\n' +
    '    </div>\n' +
    '\n' +
    '    <script>\n' +
    '        // Raw stats data embedded from backend\n' +
    '        const rawStatsData = ' + statsJsonString + ';\n' + // Embed the JSON string here
    '        const statsList = document.getElementById(\'stats-list\');\n' +
    '\n' +
    '        function renderStats(statsData) {\n' +
    '            statsList.innerHTML = \'\'; // Clear previous content\n' +
    '            const endpoints = statsData.endpoints;\n' +
    '            const endpointKeys = Object.keys(endpoints).sort(); // Sort endpoints alphabetically by key\n' +
    '\n' +
    '            if (endpointKeys.length === 0) {\n' +
    '                 statsList.innerHTML = \'<li>暂无统计数据</li>\';\n' +
    '                 return;\n' +
    '            }\n' +
    '\n' +
    '            endpointKeys.forEach(key => { // \'key\' is defined in the loop\'s scope\n' +
    '                const endpointStats = endpoints[key]; // \'endpointStats\' is defined in the loop\'s scope\n' +
    '                if (endpointStats) {\n' +
    '                    const listItem = document.createElement(\'li\');\n' +
    '                    // Use standard string concatenation for innerHTML\n' +
    '                    // This avoids Deno trying to interpret a template literal meant for the browser.\n' +
    '                    listItem.innerHTML = \'<span class="endpoint-name">\' + key + \'</span>\' +\n' +
    '                                         \'<span>24h: <span class="stats-value">\' + endpointStats.today + \'</span></span>\';\n' +
    '                    statsList.appendChild(listItem);\n' +
    '                }\n' +
    '            });\n' +
    '        }\n' +
    '\n' +
    '        // Initial render using the embedded rawStatsData\n' +
    '        if (typeof rawStatsData !== \'undefined\') { // Check if rawStatsData was successfully embedded
    '             renderStats(rawStatsData);' +
    '        } else {' +
    '             statsList.innerHTML = \'<li>Error loading stats data.</li>\';' +
    '             console.error("rawStatsData is not defined.");' +
    '        }\n' +
    '\n' +
    '        // Auto refresh every minute\n' +
    '        setInterval(() => { location.reload(); }, 60000);\n' +
    '\n' +
    '    </script>\n' +
    '</body>\n' +
    '</html>';
}

// Deno server logic
serve(async (request) => {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Serve the minimal stats HTML page on / or /index.html
  if (pathname === "/" || pathname === "/index.html") {
     return new Response(generateStatsHTML(), { 
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
    // We expose summary stats (today, week, month, total for each mapped endpoint)
    // And a sample of recent raw requests (within 30d) for mapped endpoints.
    const mappedEndpoints = Object.keys(apiMapping);
    const relevantRequests = stats.requests.filter(req => mappedEndpoints.includes(req.endpoint));

    return new Response(JSON.stringify({
        totalRequestsAllTime: stats.total,
        summaryStats: stats.endpoints, 
        recentRequestsSample: relevantRequests 
    }, null, 2), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*" 
      },
    });
  }
  
  // Universal Proxy mode (remains functional as requested in previous turns)
  // It does NOT record stats in stats.endpoints or stats.requests.
  if (pathname.startsWith("/proxy/")) {
    try {
        const proxyPathIndex = url.pathname.indexOf("/proxy/");
        const targetUrlString = url.pathname.substring(proxyPathIndex + "/proxy/".length) + url.search + url.hash;

        if (!targetUrlString || !targetUrlString.startsWith("http")) {
            return new Response("Invalid proxy URL. Must start with http:// or https:// after /proxy/", { status: 400 });
        }
        const targetUrl = new URL(targetUrlString);
        // No need to record proxy requests in stats.endpoints
        stats.total++; // Increment overall total count if desired for total, but not per endpoint
        
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

  // API Proxy mode
  // Extract the prefix based on the defined apiMapping keys
  const [prefix, rest] = extractPrefixAndRest(pathname, Object.keys(apiMapping));

  // If the pathname doesn't match any defined API prefix or the /proxy/ prefix, return 404
  if (!prefix) {
    return new Response("Not Found", { status: 404 });
  }

  // Record the request only if it matches a mapped API endpoint
  recordRequest(prefix); 

  // Construct the target URL for the upstream API
  // Remove the leading slash from 'rest' if it exists, to avoid double slashes in target URL
  const targetApiUrl = `${apiMapping[prefix]}${rest}`; // rest includes leading slash if not root
  
  try {
    const headers = new Headers();
    const commonApiHeaders = ["content-type", "authorization", "accept"];
    request.headers.forEach((value, key) => {
        if (commonApiHeaders.includes(key.toLowerCase()) || key.toLowerCase().startsWith("x-") || key.toLowerCase().startsWith("http-")) { 
            headers.set(key, value);
        }
    });
    
     // Always use a random User-Agent for API proxy requests
    headers.set("User-Agent", getRandomUserAgent());

    let requestBody: BodyInit | null = null;
    // Special handling for gnothink endpoint to add thinkingBudget: 0
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
       // For other non-GET/HEAD methods with a body, just forward the stream
      requestBody = request.body;
    }

    // Fetch from the target API
    const apiResponse = await fetch(targetApiUrl, {
      method: request.method,
      headers: headers,
      body: requestBody, 
    });

    // Prepare response headers for the client
    const responseHeaders = new Headers(apiResponse.headers);
    // Set CORS headers
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH");
    const allowedHeadersForApiCors = "Content-Type, Authorization, anthropic-version, X-Requested-With, X-Forwarded-For, X-Real-IP, HTTP-Referer, X-Title, " + commonApiHeaders.join(", ");
    responseHeaders.set("Access-Control-Allow-Headers", allowedHeadersForApiCors);
    
    // Set security headers
    responseHeaders.set("X-Content-Type-Options", "nosniff");
    responseHeaders.set("X-Frame-Options", "DENY"); 
    responseHeaders.set("Referrer-Policy", "no-referrer");

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: responseHeaders });
    }

     responseHeaders.delete("Transfer-Encoding");

    // Return the response from the upstream API to the client
    return new Response(apiResponse.body, {
      status: apiResponse.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("API proxy fetch failed:", error);
    return new Response("Internal Server Error during API proxy: " + (error instanceof Error ? error.message : String(error)), { status: 500 });
  }
});

// Helper function to extract the longest matching prefix and the rest of the pathname
function extractPrefixAndRest(pathname: string, prefixes: string[]) {
  // Sort prefixes by length descending to ensure `/gnothink` matches before `/gemini`
  const sortedPrefixes = [...prefixes].sort((a, b) => b.length - a.length);
  for (const prefix of sortedPrefixes) {
    if (pathname.startsWith(prefix)) {
      return [prefix, pathname.slice(prefix.length)];
    }
  }
  // Also check the /proxy/ prefix
   if (pathname.startsWith("/proxy/")) {
       return ["/proxy/", pathname.slice("/proxy/".length)];
   }

  return [null, null]; // No matching prefix found
}

console.log("🚀 API代理服务器已启动 (Deno)");
console.log("🌐 统计面板可访问 http://localhost:8000/"); // Default Deno port
console.log("📊 JSON统计数据可访问 http://localhost:8000/stats");
console.log("🕒 统计页面数据每分钟自动刷新");
