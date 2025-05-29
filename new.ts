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
    // If an unknown endpoint is somehow requested, initialize it
    // This is a failsafe, normally endpoints should be in apiMapping
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

  // Reset aggregated counts
  for (const endpointKey of Object.keys(stats.endpoints)) {
    stats.endpoints[endpointKey].today = 0;
    stats.endpoints[endpointKey].week = 0;
    stats.endpoints[endpointKey].month = 0;
  }

  // Recalculate based on filtered requests
  for (const req of stats.requests) {
    const endpointStats = stats.endpoints[req.endpoint];
    if (!endpointStats) continue; // Should not happen if initialized correctly

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

function generateStatsHTML(request: Request) {
  updateSummaryStats(); // Ensure summary stats are up-to-date
  
  // Helper function to safely get endpoint stats
  const getEndpointStats = (ep: string) => stats.endpoints[ep] || { today: 0, week: 0, month: 0, total: 0 };

  // Get stats for relevant models
  const geminiRawStats = getEndpointStats("/gemini");
  const gnothinkRawStats = getEndpointStats("/gnothink");
  const groqStats = getEndpointStats("/groq");
  const gmiStats = getEndpointStats("/gmi");
  const openrouterStats = getEndpointStats("/openrouter");
  const chutesStats = getEndpointStats("/chutes");
  const nebiusStats = getEndpointStats("/nebius"); 

  // Combined stats for Gemini and Gnothink
  const combinedGeminiStats = {
      today: geminiRawStats.today + gnothinkRawStats.today,
      week: geminiRawStats.week + gnothinkRawStats.week,
      month: geminiRawStats.month + gnothinkRawStats.month,
      total: geminiRawStats.total + gnothinkRawStats.total,
  };

  // HTML content is now generated and placed in an artifact above.
  // This function only needs to pass the stats data to the template if it were a separate file.
  // Since it's a single file, the template is inline, and we just return the string.
  // The JS inside the HTML will use the rawStatsData variable directly.

  // For this response, we embed the HTML directly. The artifact is just for display purposes in the UI.
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API代理服务器 - 实时统计</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 20px; }
        .container { max-width: 1400px; margin: 0 auto; }
        .header { text-align: center; color: white; margin-bottom: 40px; }
        .header h1 { font-size: 2.5rem; margin-bottom: 10px; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
        .header p { font-size: 1.1rem; opacity: 0.9; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .chart-section { background: rgba(255, 255, 255, 0.95); border-radius: 16px; padding: 24px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.2); margin-bottom: 40px; }
        .chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
        .chart-title { font-size: 1.5rem; color: #333; font-weight: 600; }
        .time-tabs { display: flex; gap: 8px; background: #f1f5f9; padding: 4px; border-radius: 12px; }
        .time-tab { padding: 8px 16px; border: none; background: transparent; border-radius: 8px; cursor: pointer; font-size: 0.9rem; font-weight: 500; color: #64748b; transition: all 0.3s ease; }
        .time-tab.active { background: #6366f1; color: white; box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3); }
        .time-tab:hover:not(.active) { background: #e2e8f0; color: #334155; }
        .chart-container { position: relative; height: 400px; margin-bottom: 20px; }
        .chart-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 20px; }
        .stat-card { background: rgba(255, 255, 255, 0.95); border-radius: 16px; padding: 24px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.2); transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .stat-card:hover { transform: translateY(-5px); box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15); }
        .stat-card h3 { font-size: 1.2rem; color: #333; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
        .api-icon { width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; color: white; }
        /* API 图标颜色 */
        .gemini-icon { background: #4285f4; } 
        .groq-icon { background: #3d007c; } 
        .gmi-icon { background: #007bff; } 
        .openrouter-icon { background: #ff4733; } 
        .chutes-icon { background: #009688; } 
        .nebius-icon { background: #6262a0; } 
        .total-icon { background: #6366f1; } 

        .stat-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #eee; }
        .stat-row:last-child { border-bottom: none; }
        .stat-label { color: #666; font-size: 0.9rem; }
        .stat-value { font-size: 1.1rem; font-weight: 600; color: #333; }
        
        .refresh-btn { position: fixed; bottom: 30px; right: 30px; background: #6366f1; color: white; border: none; border-radius: 50px; padding: 12px 24px; font-size: 1rem; cursor: pointer; box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3); transition: all 0.3s ease; z-index: 1000; }
        .refresh-btn:hover { background: #5855eb; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4); }
        .toast { position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 12px 20px; border-radius: 8px; font-size: 14px; z-index: 1001; opacity: 0; transform: translateX(100%); transition: all 0.3s ease; }
        .toast.show { opacity: 1; transform: translateX(0); }
        .chart-legend { display: flex; flex-direction: column; gap: 10px; margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
        .legend-item { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; }
        .legend-color { width: 12px; height: 12px; border-radius: 2px; }
        .legend-line { width: 16px; height: 3px; border-radius: 2px; }
        .no-data { text-align: center; color: #64748b; font-style: italic; padding: 40px 0; }
        .chart-info { background: #f8fafc; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; border-left: 4px solid #6366f1; }
        .chart-info p { color: #64748b; font-size: 0.9rem; margin: 0; }
        @media (max-width: 768px) {
            .stats-grid { grid-template-columns: 1fr; }
            .header h1 { font-size: 2rem; }
            .chart-grid { grid-template-columns: 1fr; }
            .chart-header { flex-direction: column; align-items: stretch; }
            .time-tabs { justify-self: stretch; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header"><h1>🚀 API代理服务器</h1><p>实时统计</p></div>
        
        <div class="chart-section">
            <div class="chart-header">
                <h2 class="chart-title">📊 API调用统计图表</h2>
                <div class="time-tabs">
                    <button class="time-tab active" data-period="today">24小时</button>
                    <button class="time-tab" data-period="week">7天</button>
                    <button class="time-tab" data-period="month">30天</button>
                    <button class="time-tab" data-period="total">总计</button>
                </div>
            </div>
            <div class="chart-info"><p>📊 组合图表：蓝色柱状图显示总API调用次数，红色折线图显示总体调用趋势。选择上方时间范围查看不同维度数据。</p></div>
            <div class="chart-grid">
                <div class="chart-container"><canvas id="apiChart"></canvas></div>
                <div><div class="chart-legend" id="chartLegend"></div></div>
            </div>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card"><h3><div class="api-icon gemini-icon">G</div>Gemini/GnoThink 调用统计</h3><div class="stat-row"><span class="stat-label">24小时</span><span class="stat-value">${combinedGeminiStats.today}</span></div><div class="stat-row"><span class="stat-label">7天</span><span class="stat-value">${combinedGeminiStats.week}</span></div><div class="stat-row"><span class="stat-label">30天</span><span class="stat-value">${combinedGeminiStats.month}</span></div><div class="stat-row"><span class="stat-label">总计</span><span class="stat-value">${combinedGeminiStats.total}</span></div></div>
            <div class="stat-card"><h3><div class="api-icon groq-icon">⚡</div>Groq API 调用统计</h3><div class="stat-row"><span class="stat-label">24小时</span><span class="stat-value">${groqStats.today}</span></div><div class="stat-row"><span class="stat-label">7天</span><span class="stat-value">${groqStats.week}</span></div><div class="stat-row"><span class="stat-label">30天</span><span class="stat-value">${groqStats.month}</span></div><div class="stat-row"><span class="stat-label">总计</span><span class="stat-value">${groqStats.total}</span></div></div>
            <div class="stat-card"><h3><div class="api-icon openrouter-icon">🔗</div>OpenRouter API 调用统计</h3><div class="stat-row"><span class="stat-label">24小时</span><span class="stat-value">${openrouterStats.today}</span></div><div class="stat-row"><span class="stat-label">7天</span><span class="stat-value">${openrouterStats.week}</span></div><div class="stat-row"><span class="stat-label">30天</span><span class="stat-value">${openrouterStats.month}</span></div><div class="stat-row"><span class="stat-label">总计</span><span class="stat-value">${openrouterStats.total}</span></div></div>
            <div class="stat-card"><h3><div class="api-icon chutes-icon">🏹</div>Chutes AI 调用统计</h3><div class="stat-row"><span class="stat-label">24小时</span><span class="stat-value">${chutesStats.today}</span></div><div class="stat-row"><span class="stat-label">7天</span><span class="stat-value">${chutesStats.week}</span></div><div class="stat-row"><span class="stat-label">30天</span><span class="stat-value">${chutesStats.month}</span></div><div class="stat-row"><span class="stat-label">总计</span><span class="stat-value">${chutesStats.total}</span></div></div>
            <div class="stat-card"><h3><div class="api-icon nebius-icon">N</div>Nebius API 调用统计</h3><div class="stat-row"><span class="stat-label">24小时</span><span class="stat-value">${nebiusStats.today}</span></div><div class="stat-row"><span class="stat-label">7天</span><span class="stat-value">${nebiusStats.week}</span></div><div class="stat-row"><span class="stat-label">30天</span><span class="stat-value">${nebiusStats.month}</span></div><div class="stat-row"><span class="stat-label">总计</span><span class="stat-value">${nebiusStats.total}</span></div></div>
             <div class="stat-card"><h3><div class="api-icon total-icon">📊</div>总体统计</div><div class="stat-row"><span class="stat-label">总请求数</span><span class="stat-value">${stats.total}</span></div><div class="stat-row"><span class="stat-label">活跃端点</span><span class="stat-value">${Object.keys(stats.endpoints).filter(k => stats.endpoints[k].total > 0).length}</span></div><div class="stat-row"><span class="stat-label">服务状态</span><span class="stat-value" style="color: #10b981;">🟢 运行中</span></div></div>
        </div>
        
        <!-- 使用说明部分已移除 -->

         <!-- 精简的底部说明 -->
        <div class="usage-guide">
             <div class="example-section" style="border-top: none; padding-top: 0;">
                <h3>ℹ️ 信息提示</h3>
                <p style="margin-bottom: 8px; color: #666;">此页面仅显示配置的 API 统计。</p>
                <ul style="margin-left: 20px; color: #666; line-height: 1.6;">
                    <li>统计数据包含过去 30 天的请求记录。</li>
                    <li>页面每分钟自动刷新。</li>
                    <li>JSON 格式统计 API 地址: <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">/stats</code></li>
                     <!-- Optional: Add a small note about proxy mode existence -->
                     <li>此服务也提供通用代理模式，可通过 <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">/proxy/目标URL</code> 路径访问。</li>
                </ul>
            </div>
        </div>

    </div>
    <button class="refresh-btn" onclick="location.reload()">🔄 刷新数据</button>
    <!-- Toast element kept for potential future use -->
    <div id="toast" class="toast"></div> 
    
    <script>
        // The apiMapping object is used here in the frontend to map endpoint keys to display names/colors,
        // so it needs to be available or derived from rawStatsData.
        // For simplicity in this single file scenario, we can define it again or iterate rawStatsData keys.
        // Let's iterate rawStatsData.endpoints for flexibility based on actual stats collected.

        const rawStatsData = ${JSON.stringify(stats)};
        let chartInstance = null;
        let currentPeriod = 'today';
        // Define colors based on the potential API endpoints in stats.endpoints
        const baseColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#64748b', '#14b8a6', '#a855f7', '#eab308', '#22c55e', '#3b82f6'];
       
        const endpointColorMap = {
           'gemini': '#4285f4',
           'gnothink': '#4285f4', 
           'groq': '#3d007c',
           'gmi': '#007bff',
           'openrouter': '#ff4733',
           'chutes': '#009688',
           'nebius': '#6262a0',
           // Add other expected endpoint colors here
        };

        // Generate a color list for the 'total' chart based on the actual endpoints present in stats.endpoints
        const totalChartBarColors = Object.keys(rawStatsData.endpoints)
             .filter(key => rawStatsData.endpoints[key].total > 0) // Only include endpoints with some data
             .map((key, index) => {
                 const simplifiedKey = key.replace('/', '');
                 return endpointColorMap[simplifiedKey] || baseColors[index % baseColors.length]; // Use map color or fallback
             });

        function getChartDataForPeriod(period, allRequests, endpointDetails) {
            const now = Date.now();
            let labels = [];
            let aggregatedData = [];

            // Filter requests to only include those from endpoints present in the stats data
            const availableEndpoints = Object.keys(endpointDetails);
            const filteredRequests = allRequests.filter(req => availableEndpoints.includes(req.endpoint));

            if (filteredRequests.length === 0) {
                return { labels: [], data: [], filteredRequestsLength: 0 };
            }

            if (period === 'today') {
                 const hourlyCounts = Array(24).fill(0);
                 const firstHourTimestamp = new Date(now - 23 * 60 * 60 * 1000);
                 firstHourTimestamp.setMinutes(0, 0, 0);

                 for (let i = 0; i < 24; i++) {
                     const hour = new Date(firstHourTimestamp);
                     hour.setHours(firstHourTimestamp.getHours() + i);
                     labels.push(hour.getHours().toString().padStart(2, '0') + ':00');
                 }

                 const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
                 filteredRequests.filter(req => req.timestamp >= twentyFourHoursAgo)
                     .forEach(req => {
                         const reqHour = new Date(req.timestamp);
                         const diffHours = Math.floor((reqHour.getTime() - firstHourTimestamp.getTime()) / (60 * 60 * 1000));
                         if (diffHours >= 0 && diffHours < 24) {
                             hourlyCounts[diffHours]++;
                         }
                     });
                 aggregatedData = hourlyCounts;

            } else if (period === 'week' || period === 'month') {
                 const numDays = period === 'week' ? 7 : 30;
                 const dailyCounts = Array(numDays).fill(0);
                 const firstDayTimestamp = new Date(now);
                 firstDayTimestamp.setDate(firstDayTimestamp.getDate() - (numDays - 1));
                 firstDayTimestamp.setHours(0, 0, 0, 0);

                 for (let i = 0; i < numDays; i++) {
                     const day = new Date(firstDayTimestamp);
                      day.setDate(firstDayTimestamp.getDate() + i);
                      labels.push(day.getFullYear() + '-' + (day.getMonth() + 1).toString().padStart(2, '0') + '-' + day.getDate().toString().padStart(2, '0'));
                 }
                 
                 const periodStartTimestamp = firstDayTimestamp.getTime();
                  filteredRequests.filter(req => req.timestamp >= periodStartTimestamp)
                     .forEach(req => {
                         const reqDay = new Date(req.timestamp);
                         reqDay.setHours(0,0,0,0);
                         const diffDays = Math.floor((reqDay.getTime() - firstDayTimestamp.getTime()) / (24 * 60 * 60 * 1000));
                         if (diffDays >= 0 && diffDays < numDays) {
                            dailyCounts[diffDays]++;
                         }
                     });
                 aggregatedData = dailyCounts;

            } else if (period === 'total') {
                const activeEndpoints = Object.keys(endpointDetails).filter(ep => endpointDetails[ep].total > 0);
                 // Map endpoint keys (like "/gemini") to simplified names (like "gemini") for labels
                labels = activeEndpoints.map(ep => ep.replace('/', ''));
                aggregatedData = activeEndpoints.map(ep => endpointDetails[ep].total);
                // Sort by total count descending for better visualization
                 const sortedIndexes = aggregatedData.map((value, index) => ({ value, index }))
                    .sort((a, b) => b.value - a.value);
                 labels = sortedIndexes.map(item => labels[item.index]);
                 aggregatedData = sortedIndexes.map(item => item.value);
                
                // Ensure labels are unique (should be based on distinct endpoints)
                const uniqueLabels = [];
                const uniqueData = [];
                const endpointMap = new Map();
                 for(let i=0; i<labels.length; i++) {
                     if(!endpointMap.has(labels[i])) {
                          endpointMap.set(labels[i], true);
                          uniqueLabels.push(labels[i]);
                          uniqueData.push(aggregatedData[i]);
                     }
                 }
                 labels = uniqueLabels;
                 aggregatedData = uniqueData;

                 // If total is requested but no endpoint has calls
                 if (labels.length === 0 && filteredRequests.length > 0) {
                     // This case shouldn't happen if filteredRequests > 0 and endpointDetails is populated correctly,
                     // but as a safeguard, return no data if labels somehow end up empty.
                     return { labels: [], data: [], filteredRequestsLength: filteredRequests.length };
                 }
            }

            return { labels, data: aggregatedData, filteredRequestsLength: filteredRequests.length };
        }

        function createCombinedChart(period) {
            const ctx = document.getElementById('apiChart')!.getContext('2d'); 
            if (chartInstance) chartInstance.destroy();
            
            const chartData = getChartDataForPeriod(period, rawStatsData.requests, rawStatsData.endpoints);

             // Combine check for no data relevant to selected endpoints or period
            if (chartData.labels.length === 0) { 
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                ctx.fillStyle = '#64748b'; ctx.font = '16px Arial'; ctx.textAlign = 'center';
                ctx.fillText('暂无数据', ctx.canvas.width / 2, ctx.canvas.height / 2);
                updateLegend(period, chartData); // Pass chartData for legend logic to show "No Data"
                return;
            }
            
            const xAxisTitle = period === 'total' ? 'API 端点' : (period === 'today' ? '小时 (过去24小时)' : '日期');

            const chartConfig = {
                type: 'bar',
                data: {
                    labels: chartData.labels,
                    datasets: [
                        {
                            type: 'bar',
                            label: 'API调用次数',
                            data: chartData.data,
                             backgroundColor: period === 'total' 
                                ? chartData.labels.map((label, index) => endpointColorMap[label] + 'B3' || totalChartBarColors[index % totalChartBarColors.length] + 'B3') 
                                : '#6366f1B3', 
                            borderColor: period === 'total' 
                                ? chartData.labels.map((label, index) => endpointColorMap[label] || totalChartBarColors[index % totalChartBarColors.length])
                                : '#6366f1', 
                            borderWidth: 1.5,
                            yAxisID: 'y',
                            order: 2 
                        },
                        {
                            type: 'line',
                            label: '调用趋势',
                            data: chartData.data,
                            borderColor: '#ef4444',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            borderWidth: 2.5,
                            pointBackgroundColor: '#ef4444',
                            pointBorderColor: 'white',
                            pointBorderWidth: 1.5,
                             pointRadius: period === 'total' ? 4 : (period === 'today' ? 3 : 4),
                            pointHoverRadius: period === 'total' ? 6 : (period === 'today' ? 5 : 6),
                            fill: false,
                            tension: (period === 'today' || period === 'total') ? 0.1 : 0.3, 
                            yAxisID: 'y', 
                            order: 1 
                        }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { display: true, position: 'top', labels: { usePointStyle: true, padding: 20, font: { size: 12 } } },
                        tooltip: {
                            backgroundColor: 'rgba(0,0,0,0.85)', titleColor: 'white', bodyColor: 'white',
                            borderColor: '#6366f1', borderWidth: 1,
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) label += ': ';
                                    if (context.parsed.y !== null) label += context.parsed.y + ' 次';
                                    
                                    if (period === 'total') {
                                        const total = chartData.data.reduce((a, b) => a + b, 0);
                                        if (total > 0) {
                                            const percentage = ((context.raw / total) * 100).toFixed(1);
                                            label += ' (' + percentage + '%)';
                                        }
                                    }
                                    return label;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: { display: true, text: xAxisTitle, color: '#333', font: { weight: 'bold' } },
                            ticks: { color: '#64748b', maxRotation: period === 'month' ? 45 : 0, minRotation: 0 },
                            grid: { color: '#e2e8f0' }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: { color: '#64748b', precision: 0 }, 
                            grid: { color: '#e2e8f0' },
                            title: { display: true, text: '调用次数', color: '#333', font: { weight: 'bold' } }
                        }
                    },
                    animation: { duration: 800, easing: 'easeOutQuart' }
                }
            };
            chartInstance = new Chart(ctx, chartConfig);
            updateLegend(period, chartData);
        }

        function updateLegend(period, chartData) {
            const legendContainer = document.getElementById('chartLegend');
            if (!legendContainer) return; 
            legendContainer.innerHTML = ''; 

             // Check if there is any data to display in the legend for the current period
            if (chartData.labels.length === 0) { 
                legendContainer.innerHTML = '<div class="no-data">期间内无调用数据</div>';
                return;
            }

            if (period === 'total') {
                const totalOverall = chartData.data.reduce((sum, item) => sum + item, 0);
                // Labels are already sorted by value
                 const sortedLabels = chartData.labels; 

                 const legendItemsHtml = sortedLabels.map((label) => { // No index needed for color mapping
                    const value = chartData.data[sortedLabels.indexOf(label)]; // Get data value by label
                    const percentage = totalOverall > 0 ? ((value / totalOverall) * 100).toFixed(1) : 0;
                    
                    // Get color using the dynamic color map
                    const color = endpointColorMap[label] || '#64748b'; // Fallback color

                    return '<div class="legend-item">' +
                        '<div class="legend-color" style="background-color: ' + color + '"></div>' +
                        '<span>' + label + ': ' + value + ' 次 (' + percentage + '%)</span>' +
                        '</div>';
                }).join('');
                legendContainer.innerHTML = legendItemsHtml;
            } else { 
                const periodText = period === 'today' ? '24小时' : (period === 'week' ? '7天' : '30天');
                legendContainer.innerHTML = 
                    '<div class="legend-item">' +
                        '<div class="legend-color" style="background-color: #6366f1"></div>' +
                        '<span>总调用次数 (柱状)</span>' +
                    '</div>' +
                    '<div class="legend-item">' +
                        '<div class="legend-line" style="background-color: #ef4444"></div>' +
                        '<span>调用趋势 (折线)</span>' +
                        '</div>' +
                    '<p style="font-size: 0.85rem; color: #666; margin-top: 10px;">' +
                        '显示过去 ' + periodText + ' 的总调用数据。' +
                        '</p>';
            }
        }

        function switchPeriod(newPeriod) {
            currentPeriod = newPeriod;
            document.querySelectorAll('.time-tab').forEach(tab => tab.classList.remove('active'));
            const activeTab = document.querySelector('[data-period="' + newPeriod + '"]');
            if (activeTab) { 
                activeTab.classList.add('active');
            }
            createCombinedChart(currentPeriod);
        }

        setInterval(() => { location.reload(); }, 60000); // Auto refresh every minute

        document.addEventListener('DOMContentLoaded', function() {
            createCombinedChart(currentPeriod);
            document.querySelectorAll('.time-tab').forEach(tab => {
                tab.addEventListener('click', function() { switchPeriod(this.dataset.period!); }); 
            });
        });
    </script>
</body>
</html>
`;
}

// Deno server logic (serve, recordRequest, apiMapping etc.) remains largely the same
serve(async (request) => {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Serve the stats HTML page
  if (pathname === "/" || pathname === "/index.html") {
     return new Response(generateStatsHTML(request), { 
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
    return new Response(JSON.stringify(stats, null, 2), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*" // Allow CORS for stats API
      },
    });
  }
  
  // Universal Proxy mode
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
        // Define allowed headers to forward for proxy mode
        // Be cautious about which headers you forward from the client
        const allowedHeaders = [
            "accept", 
            "content-type", 
            "authorization", // Might be needed for some proxied sites, use with care
            "accept-encoding", 
            "accept-language", 
            "cache-control", 
            "pragma", 
            "x-requested-with", 
            "x-forwarded-for", // Add X-Forwarded-For
            "x-real-ip" // Add X-Real-IP
        ]; 
        
        request.headers.forEach((value, key) => {
             // Only forward allowed headers, and commonly used vendor/standard headers
            if (allowedHeaders.includes(key.toLowerCase()) || key.toLowerCase().startsWith("sec-") || key.toLowerCase().startsWith("x-") || key.toLowerCase().startsWith("http-")) {
                 // Prevent duplication if adding x-forwarded-for/x-real-ip later
                 if (!(key.toLowerCase() === 'x-forwarded-for' || key.toLowerCase() === 'x-real-ip')) {
                     headers.set(key, value);
                 }
            }
        });

         // Add User-Agent: Forward client's if present, otherwise use random
        if (request.headers.has("user-agent")) {
            headers.set("User-Agent", request.headers.get("user-agent") as string);
        } else {
            headers.set("User-Agent", getRandomUserAgent()); // Fallback to random
        }
        
         // Add X-Forwarded-For and X-Real-IP with client's IP
        headers.set("X-Forwarded-For", request.conn.remoteAddr.hostname);
        headers.set("X-Real-IP", request.conn.remoteAddr.hostname);

        // Rewrite Referer header if present
        if (request.headers.has("referer")) {
             const clientReferer = request.headers.get("referer")!;
             // Only rewrite if the referer comes from this proxy itself
             if (clientReferer.startsWith(url.origin)) {
                // Attempt to derive the original intended referer URL
                try {
                    const oldRefererUrl = new URL(clientReferer);
                    const oldProxyPathIndex = oldRefererUrl.pathname.indexOf("/proxy/");
                    if (oldProxyPathIndex !== -1) {
                         const originalRefererTarget = oldRefererUrl.pathname.substring(oldProxyPathIndex + "/proxy/".length) + oldRefererUrl.search + oldRefererUrl.hash;
                         // Ensure it's a http/https URL before setting
                         if (originalRefererTarget.startsWith("http")) {
                             headers.set("Referer", originalRefererTarget);
                         } else {
                              // If unable to parse or not http, maybe use the target origin?
                              headers.set("Referer", targetUrl.origin);
                         }
                    } else {
                         // If referer from this origin but not a /proxy/ path, still use target origin
                         headers.set("Referer", targetUrl.origin);
                    }
                } catch (e) {
                     // If Referer URL from client is malformed, just set target origin
                     console.warn("Malformed client Referer header:", clientReferer, "Error:", e);
                     headers.set("Referer", targetUrl.origin);
                }
                
             } else {
                 // If referer is from an external site, just pass it through (or decide to remove it based on policy)
                 headers.set("Referer", clientReferer);
             }
        } else {
             // If no referer from client, decide whether to set one (e.g., target origin) or omit
             // Setting target origin can help some sites function, but leaks target info
             // Omitting is more private
             // Let's omit if absent from client
              console.debug("No Referer header from client for proxy request.");
        }

        const response = await fetch(targetUrl.toString(), {
            method: request.method,
            headers: headers,
            body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
            redirect: "manual" 
        });

        const responseHeaders = new Headers(response.headers);
        // Set CORS headers for proxy mode
        const origin = request.headers.get("Origin");
        if (origin) {
            responseHeaders.set("Access-Control-Allow-Origin", origin);
            responseHeaders.set("Access-Control-Allow-Credentials", "true");
        } else {
            responseHeaders.set("Access-Control-Allow-Origin", "*");
        }
        // Reflect allowed methods and headers
        const allowedMethods = "GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH";
        const allowedHeadersForCors = "Content-Type, Authorization, X-Requested-With, X-Forwarded-For, X-Real-IP, HTTP-Referer, X-Title, " + allowedHeaders.join(", ");
        responseHeaders.set("Access-Control-Allow-Methods", allowedMethods);
        responseHeaders.set("Access-Control-Allow-Headers", allowedHeadersForCors);
        responseHeaders.set("Access-Control-Max-Age", "86400");

        // Security headers
        responseHeaders.set("X-Content-Type-Options", "nosniff");
        // For proxying arbitrary sites, X-Frame-Options: DENY might break intended framing.
        // Consider removing it, or setting to SAMEORIGIN if you control the proxied site.
        // Removing for maximum flexibility in proxying.
        responseHeaders.delete("X-Frame-Options"); 
        // Referrer-Policy for responses - usually safer to be strict
        responseHeaders.set("Referrer-Policy", "no-referrer"); 

        // Handle CORS preflight
        if (request.method === "OPTIONS") {
            return new Response(null, { status: 204, headers: responseHeaders });
        }
        
        // Handle redirects by rewriting Location header
        if (response.status >= 300 && response.status < 400 && response.headers.has("location")) {
            let newLocation = response.headers.get("location");
             if (newLocation) {
                try {
                   const redirectUrl = new URL(newLocation, targetUrl.toString()); // Resolve against the *target* URL
                    // Rewrite the location to go through *this* proxy's /proxy/ path
                   responseHeaders.set("Location", `${url.origin}/proxy/${redirectUrl.toString()}`);
                } catch (e) {
                   console.error("Failed to rewrite redirect Location header:", newLocation, "Error:", e);
                   // If rewrite fails, fall back to original location or error
                   responseHeaders.set("Location", newLocation); // Keep original as fallback
                }
             }
            return new Response(null, { status: response.status, headers: responseHeaders });
        }

        // Basic HTML and CSS rewriting
        const contentType = responseHeaders.get("content-type") || "";
        if (contentType.includes("text/html")) {
            let text = await response.text();
            const currentProxyBase = `${url.origin}/proxy/`;
             // This rewriting is basic and might fail on complex SPAs.
             // Consider using a dedicated HTML parser/rewriter for robust solutions.
            text = text.replace(/(href|src|action)=["']\/(?!\/)/gi, `$1="${currentProxyBase}${baseUrl}/`);
            text = text.replace(/(href|src|action)=["'](https?:\/\/[^"']+)/gi, (match, attr, originalUrl) => {
                // Avoid double proxying if URL is already proxied
                if (originalUrl.startsWith(currentProxyBase)) return match; 
                 return `${attr}="${currentProxyBase}${originalUrl}"`;
            });
            text = text.replace(/srcset=["']([^"']+)["']/gi, (match, srcset) => {
                const newSrcset = srcset.split(',').map(s => {
                    const parts = s.trim().split(/\s+/);
                    let u = parts[0];
                    if (u.startsWith('/')) u = `${baseUrl}${u}`;
                     if (u.startsWith(currentProxyBase)) return s; // Avoid double proxying
                    return `${currentProxyBase}${u}${parts[1] ? ' ' + parts[1] : ''}`;
                }).join(', ');
                return `srcset="${newSrcset}"`;
            });
            text = text.replace(/\s+integrity=["'][^"']+["']/gi, '');
            text = text.replace(/<base\s+href=["']([^"']+)["'][^>]*>/gi, (match, baseHrefVal) => {
                let newBase = baseHrefVal;
                if(baseHrefVal.startsWith('/')) newBase = `${baseUrl}${baseHrefVal}`;
                // Rewrite base href to point through the proxy
                return `<base href="${currentProxyBase}${newBase}">`;
            });
             // Remove CSP header as rewriting might violate it
             responseHeaders.delete("Content-Security-Policy");
             responseHeaders.delete("Transfer-Encoding"); // Ensure no Transfer-Encoding header after reading body

            return new Response(text, { status: response.status, headers: responseHeaders });
        } else if (contentType.includes("text/css")) {
            let text = await response.text();
            const currentProxyBase = `${url.origin}/proxy/`;
             // Rewrite url() in CSS
            text = text.replace(/url\((["']?)([^)"']+)\1\)/gi, (match, quote, cssUrl) => {
                let u = cssUrl;
                if (u.startsWith('data:') || u.startsWith('#')) return match; 
                
                try {
                    // Resolve the URL relative to the target CSS file's URL
                    const resolvedUrl = new URL(u, targetUrl.toString());
                    // Rewrite to proxy URL
                    return `url(${quote}${currentProxyBase}${resolvedUrl.toString()}${quote})`;
                } catch (e) {
                     console.warn("Failed to rewrite CSS URL:", u, "Error:", e);
                     return match; // Keep original if rewrite fails
                }
            });
             responseHeaders.delete("Transfer-Encoding"); // Ensure no Transfer-Encoding header after reading body

            return new Response(text, { status: response.status, headers: responseHeaders });

        } else {
             // For other content types (images, JSON, etc.), simply forward the body and headers
              responseHeaders.delete("Transfer-Encoding"); // Avoid issues with chunked encoding after reading body
            return new Response(response.body, { status: response.status, headers: responseHeaders });
        }

    } catch (error) {
        console.error("Proxy request failed:", error.message, error.stack);
        return new Response("Proxy Request Failed: " + error.message, { status: 502 }); 
    }
}

  // API Proxy mode
  const [prefix, rest] = extractPrefixAndRest(pathname, Object.keys(apiMapping));
  if (!prefix) {
    return new Response("Not Found", { status: 404 });
  }

  recordRequest(prefix); // Record only successful mapping attempts

  const targetApiUrl = `${apiMapping[prefix]}${rest}${url.search}`;

  try {
    const headers = new Headers();
    // Define allowed headers to forward for API mode
    const commonApiHeaders = ["content-type", "authorization", "accept"];
    request.headers.forEach((value, key) => {
         // Forward allowed common headers and vendor/custom headers that start with x- or http-
        if (commonApiHeaders.includes(key.toLowerCase()) || key.toLowerCase().startsWith("x-") || key.toLowerCase().startsWith("http-")) { 
            headers.set(key, value);
        }
    });
    
     // Set random User-Agent for API mode
    headers.set("User-Agent", getRandomUserAgent());

    // Handle special processing for gnothink
    let requestBody: BodyInit | null = null;
    // Check for POST method, presence of body, and correct content type
    if (prefix === "/gnothink" && request.method === "POST" && request.body && headers.get("content-type")?.includes("application/json")) {
       try {
           // Read the body text
           const originalBodyText = await request.text();
            if (originalBodyText) {
                 // Parse JSON, add thinkingBudget, stringify again
                const bodyJson = JSON.parse(originalBodyText);
                
                bodyJson.generationConfig = {
                ...(bodyJson.generationConfig || {}),
                thinkingConfig: {
                    thinkingBudget: 0
                }
                };
                
                requestBody = JSON.stringify(bodyJson);
            } else {
                 requestBody = null; // Empty body
            }
       } catch (e) {
           console.error("Failed to process /gnothink body:", e);
           // If JSON parsing or processing fails, maybe return a client error?
           // Or just forward the original body if possible/safe.
           // For now, let's return an error to prevent sending malformed requests.
           return new Response("Invalid JSON body for /gnothink", { status: 400 });
       }
    } else if (request.method !== "GET" && request.method !== "HEAD" && request.body) {
       // For other non-GET/HEAD methods with a body, just forward the stream
      requestBody = request.body;
    }

    const apiResponse = await fetch(targetApiUrl, {
      method: request.method,
      headers: headers,
      body: requestBody, // Use the potentially modified body
    });

    const responseHeaders = new Headers(apiResponse.headers);
    // Set CORS headers for API mode
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH");
    // Update Access-Control-Allow-Headers to match the headers we forward
    const allowedHeadersForApiCors = "Content-Type, Authorization, anthropic-version, X-Requested-With, X-Forwarded-For, X-Real-IP, HTTP-Referer, X-Title, " + commonApiHeaders.join(", ");
    responseHeaders.set("Access-Control-Allow-Headers", allowedHeadersForApiCors);
    
    // Security headers - usually stricter for API endpoints not meant for browsers
    responseHeaders.set("X-Content-Type-Options", "nosniff");
    responseHeaders.set("X-Frame-Options", "DENY"); 
    responseHeaders.set("Referrer-Policy", "no-referrer");

    // Handle CORS preflight for API mode
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: responseHeaders });
    }

     // Remove Transfer-Encoding as我们已经消费/处理了 body (in gnothink case) or will stream it
     responseHeaders.delete("Transfer-Encoding");

    return new Response(apiResponse.body, {
      status: apiResponse.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("API proxy fetch failed:", error);
    // Provide a more informative error response
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
