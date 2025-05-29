import { serve } from "https://deno.land/std@v0.215.0/http/server.ts"; // 更新 Deno 标准库版本，与 code 1 保持一致

console.log("Deno Proxy Server Started with Random User Agent & TLS Proxying 🚀");

// ✅ 支持的 API 映射
const apiMapping = {
  "/discord": "https://discord.com/api",
  "/telegram": "https://api.telegram.org",
  "/openai": "https://api.openai.com",
  "/claude": "https://api.anthropic.com",
  "/gemini": "https://generativelanguage.googleapis.com",
  "/gnothink": "https://generativelanguage.googleapis.com", // 注意：此路径会自动禁用 Gemini 的思考模式
  "/meta": "https://www.meta.ai/api",
  "/groq": "https://api.groq.com/openai",
  "/xai": "https://api.x.ai",
  "/cohere": "https://api.cohere.ai",
  "/huggingface": "https://api-inference.huggingface.co",
  "/together": "https://api.together.xyz",
  "/novita": "https://api.novita.ai",
  "/portkey": "https://api.portkey.ai",
  "/fireworks": "https://api.fireworks.ai",
  "/openrouter": "https://openrouter.ai/api",
  // 额外添加 code 1 中的一些映射（可选，根据需求保留或删除）
  "/gmi": "https://api.gmi-serving.com", 
  "/chutes": "https://llm.chutes.ai",
  "/nebius":"https://api.studio.nebius.com"
};
};

/**
 * 🌐 生成随机 User-Agent（Chrome/Firefox/Safari/Edge/移动端）
 * 从第一个代码段整合过来
 */
function getRandomUserAgent(): string {
  const uaList = [
    // Chrome 123-124（Windows、Mac、Linux）
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",

    // Firefox 124-125
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15; rv:125.0) Gecko/20100101 Firefox/125.0",

    // Safari 17（Mac & iOS）
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    "Mozilla/5.0 (iPad; CPU OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",

    // Microsoft Edge
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.2420.81",

    // Android 移动端浏览器
    "Mozilla/5.0 (Linux; Android 10; SM-G975F Build/QP1A.190711.020) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Linux; Android 13; Pixel 7 Build/TD1A.220624.011) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",

    // iPhone/iPad Safari 浏览器
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (iPad; CPU OS 16_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Mobile/15E148 Safari/604.1",

    // Opera 浏览器
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0",

    // Brave 浏览器
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.2420.81 Brave/1.58.61",

    // Vivaldi 浏览器
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Vivaldi/6.5.3213.10"
  ];

  return uaList[Math.floor(Math.random() * uaList.length)];
}

/**
 * 🔄 请求处理器
 */
serve(async (request: Request): Promise<Response> => {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const search = url.search;

  console.log(`[REQ] ${request.method} ${pathname}${search}`); // 记录传入请求

  // ✅ 根路径或 index.html 返回一个简单的状态页面
  if (pathname === '/' || pathname === '/index.html') {
    return new Response("Deno TLS Proxy Server Running 🚀", {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // ✅ robots.txt 策略
  if (pathname === '/robots.txt') {
    return new Response("User-agent: *\nDisallow: /", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // ✅ 代理模式 (/proxy/https://example.com)
  if (pathname.startsWith("/proxy/")) {
    try {
      const proxyPathIndex = pathname.indexOf("/proxy/");
      const targetUrlString = pathname.substring(proxyPathIndex + "/proxy/".length) + search + url.hash; // 拼装完整目标 URL

      if (!targetUrlString || !targetUrlString.startsWith("http")) {
        console.warn(`[ERR] Invalid proxy URL: ${targetUrlString}`);
        return new Response("Invalid proxy URL. Must start with http:// or https:// after /proxy/", { status: 400 });
      }
      const targetUrl = new URL(targetUrlString);
      const baseUrl = `${targetUrl.protocol}//${targetUrl.host}`;

      console.log(`👉 Proxying (Web): ${targetUrl.toString()}`); // 记录代理目标

      const headers = new Headers();
      // 转发部分常用请求头，但 User-Agent 将被覆盖
      const allowedHeaders = ["accept", "content-type", "authorization", "accept-encoding", "accept-language", "cache-control", "pragma", "x-requested-with", "cookie"];
      request.headers.forEach((value, key) => {
        if (allowedHeaders.includes(key.toLowerCase()) || key.toLowerCase().startsWith("sec-") || key.toLowerCase().startsWith("x-")) {
          headers.set(key, value);
        }
      });
      // 移除 Host 头，避免目标服务器验证失败
      if (headers.has("Host")) headers.delete("Host");

      // 🌐 始终使用随机 User-Agent
      headers.set("User-Agent", getRandomUserAgent());

      // 处理 Referer 头，将其重写为目标域，避免泄露代理信息
      if (request.headers.has("referer")) {
        headers.set("Referer", request.headers.get("referer")!.replace(url.origin, targetUrl.origin));
      }

      const response = await fetch(targetUrl.toString(), {
        method: request.method,
        headers: headers,
        body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
        redirect: "manual" // 手动处理重定向
      });

      const responseHeaders = new Headers(response.headers);
      // 允许跨域
      const origin = request.headers.get("Origin");
      if (origin) {
        responseHeaders.set("Access-Control-Allow-Origin", origin);
        responseHeaders.set("Access-Control-Allow-Credentials", "true");
      } else {
        responseHeaders.set("Access-Control-Allow-Origin", "*");
      }
      responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH");
      responseHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, " + allowedHeaders.join(", "));
      responseHeaders.set("Access-Control-Max-Age", "86400"); // 缓存 CORS 预检请求

      // 安全头部（根据需求调整）
      responseHeaders.set("X-Content-Type-Options", "nosniff");
      responseHeaders.delete("X-Frame-Options"); // 代理外部内容时通常需要删除
      responseHeaders.set("Referrer-Policy", "no-referrer-when-downgrade");

      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: responseHeaders });
      }

      // 处理重定向：重写 Location 头使其通过代理
      if (response.status >= 300 && response.status < 400 && response.headers.has("location")) {
        let newLocation = response.headers.get("location");
        if (newLocation) {
          // 如果是相对路径，转换为绝对路径
          if (newLocation.startsWith("/")) {
            newLocation = `${baseUrl}${newLocation}`;
          }
          // 重写 Location 头，确保重定向也通过代理服务器
          responseHeaders.set("Location", `${url.origin}/proxy/${newLocation}`);
        }
        return new Response(null, { status: response.status, headers: responseHeaders });
      }

      // HTML 和 CSS 内容重写（非常基础，复杂网站可能需要更强大的解析器）
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
        text = text.replace(/\s+integrity=["'][^"']+["']/gi, ''); // 移除完整性属性
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
      console.error(`🆘 Proxy Error (Web): ${error.message}`);
      return new Response("Proxy Request Failed: " + error.message, { status: 502 }); // Bad Gateway
    }
  }

  // ✅ API 路由匹配
  const [prefix, rest] = extractPrefixAndRest(pathname, Object.keys(apiMapping));
  if (!prefix) {
    console.log(`[404] API Route not found: ${pathname}`);
    return new Response("Not Found", { status: 404 });
  }

  // 构造目标 API URL
  const targetApiUrl = `${apiMapping[prefix]}${rest}${search}`;
  console.log(`👉 Proxying (API): ${targetApiUrl}`); // 记录 API 代理目标

  try {
    const headers = new Headers();
    // 转发特定请求头
    const commonApiHeaders = ["content-type", "authorization", "accept", "anthropic-version", "x-api-key"]; // 增加 x-api-key
    request.headers.forEach((value, key) => {
      if (commonApiHeaders.includes(key.toLowerCase()) || key.toLowerCase().startsWith("x-")) {
        headers.set(key, value);
      }
    });

    // 移除 Host 头，避免目标服务器验证失败
    if (headers.has("Host")) {
        headers.delete("Host");
    }

    // 🌐 始终为 API 请求设置随机 User-Agent
    headers.set("User-Agent", getRandomUserAgent());

    // 为特定 API 添加必要头部
    if (prefix === "/claude" && !headers.has("anthropic-version")) {
      headers.set("anthropic-version", "2023-06-01"); // Claude API 要求此版本头
    }

    // 处理 gnothink（Gemini 禁用思考模式） 逻辑
    let requestBody: BodyInit | null = null;
    if (prefix === "/gnothink" && request.method === "POST" && request.body && headers.get("content-type")?.includes("application/json")) {
      const originalBodyText = await request.text();
      if (originalBodyText) {
        try {
          const bodyJson = JSON.parse(originalBodyText);
          // 添加 thinkingBudget: 0 禁用思考模式
          bodyJson.generationConfig = {
            ...(bodyJson.generationConfig || {}),
            thinkingConfig: {
              thinkingBudget: 0
            }
          };
          requestBody = JSON.stringify(bodyJson);
        } catch (parseError) {
          console.error(`[ERR] Failed to parse JSON for /gnothink: ${parseError.message}`);
          requestBody = originalBodyText; // 如果解析失败，尝试转发原始 body
        }
      } else {
        requestBody = null;
      }
    } else if (request.method !== "GET" && request.method !== "HEAD" && request.body) {
      // 其他 POST/PUT 请求直接转发原始 body
      requestBody = request.body;
    }

    const apiResponse = await fetch(targetApiUrl, {
      method: request.method,
      headers: headers,
      body: requestBody,
    });

    const responseHeaders = new Headers(apiResponse.headers);
    // 允许跨域
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH");
    responseHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization, anthropic-version, x-api-key, " + commonApiHeaders.join(", "));

    // 安全头部
    responseHeaders.set("X-Content-Type-Options", "nosniff");
    responseHeaders.set("X-Frame-Options", "DENY"); // API 不应被嵌入
    responseHeaders.set("Referrer-Policy", "no-referrer"); // 避免泄露代理信息

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: responseHeaders });
    }

    return new Response(apiResponse.body, {
      status: apiResponse.status,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error(`🆘 Proxy Error (API): ${targetApiUrl} - Reason: ${error.message}`);
    return new Response("Internal Server Error during API proxy: " + error.message, { status: 500 });
  }
});

/**
 * 🔎 路由匹配：从路径中提取 API 前缀和剩余部分
 */
function extractPrefixAndRest(pathname: string, prefixes: string[]): [string | null, string] {
  for (const prefix of prefixes) {
    if (pathname.startsWith(prefix)) {
      const rest = pathname.slice(prefix.length);
      // 确保剩余部分为空或以 '/' 开头，避免 /openai_v2 匹配到 /openai
      if (!rest || rest.startsWith('/')) { 
        return [prefix, rest || ""];
      }
    }
  }
  return [null, null]; // 类型适配为 [string | null, string | null]
}
