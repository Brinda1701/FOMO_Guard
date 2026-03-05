// Vercel Serverless Function: URL 内容爬取
// 支持雪球、东方财富、新浪财经等主流财经媒体

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    // 验证 URL 格式
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (e) {
      return res.status(400).json({
        success: false,
        error: '无效的 URL 格式'
      });
    }

    // 检查是否是支持的网站
    const supportedDomains = [
      'xueqiu.com',
      'eastmoney.com',
      'guba.eastmoney.com',
      'sina.com.cn',
      'finance.sina.com.cn',
      '10jqka.com.cn',
      'wallstreetcn.com',
      'caixin.com',
      'yicai.com'
    ];

    const domain = parsedUrl.hostname.replace('www.', '');
    const isSupported = supportedDomains.some(d => domain.includes(d));

    if (!isSupported) {
      return res.status(400).json({
        success: false,
        error: `暂不支持该网站，目前支持：${supportedDomains.join('、')}`
      });
    }

    // 识别来源
    let source = '未知';
    if (domain.includes('xueqiu')) source = '雪球';
    else if (domain.includes('eastmoney') || domain.includes('guba')) source = '东方财富';
    else if (domain.includes('sina') || domain.includes('finance')) source = '新浪财经';
    else if (domain.includes('10jqka')) source = '同花顺';
    else if (domain.includes('wallstreetcn')) source = '华尔街见闻';
    else if (domain.includes('caixin')) source = '财新';
    else if (domain.includes('yicai')) source = '第一财经';

    // 爬取网页内容
    const content = await fetchUrlContent(url);

    if (!content || content.trim().length < 50) {
      return res.status(400).json({
        success: false,
        error: '无法获取网页内容，可能该页面需要登录或反爬虫保护'
      });
    }

    // 提取标题和正文
    const extracted = extractContent(content, source);

    res.status(200).json({
      success: true,
      url,
      source,
      title: extracted.title,
      content: extracted.content,
      publishTime: extracted.publishTime,
      textLength: extracted.content.length
    });

  } catch (error) {
    console.error('[Scrape URL] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * 爬取网页内容
 */
async function fetchUrlContent(url) {
  // 使用 fetch 获取网页内容
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  const html = await response.text();
  return html;
}

/**
 * 使用 Cheerio 提取内容
 */
function extractContent(html, source) {
  // 由于 Vercel Serverless 不支持动态 require，这里使用简单的字符串处理
  // 在实际部署时，建议使用 cheerio 库来解析 HTML

  let title = '';
  let content = '';
  let publishTime = '';

  // 提取标题
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    title = titleMatch[1].trim();
    // 清理标题中的网站名称
    title = title.replace(/_-.*$/, '').replace(/-.*$/, '').trim();
  }

  // 根据不同来源提取内容
  if (source === '雪球') {
    content = extractXueqiuContent(html);
  } else if (source === '东方财富' || source === '股吧') {
    content = extractEastmoneyContent(html);
  } else if (source === '华尔街见闻') {
    content = extractWallstreetcnContent(html);
  } else {
    // 通用提取方法
    content = extractGenericContent(html);
  }

  // 清理内容
  content = cleanContent(content);

  return { title, content, publishTime };
}

/**
 * 提取雪球内容
 */
function extractXueqiuContent(html) {
  // 雪球文章正文通常在 .article__content 中
  const contentMatch = html.match(/class="article__content"[^>]*>([\s\S]*?)<\/div>/i);
  if (contentMatch) {
    return stripHtml(contentMatch[1]);
  }

  // 雪球帖子内容
  const postMatch = html.match(/class="detail__stock-info"[^>]*>([\s\S]*?)<\/div>/i);
  if (postMatch) {
    return stripHtml(postMatch[1]);
  }

  return '';
}

/**
 * 提取东方财富内容
 */
function extractEastmoneyContent(html) {
  // 东方财富文章正文在 .btext 中
  const contentMatch = html.match(/class="btext"[^>]*>([\s\S]*?)<\/div>/i);
  if (contentMatch) {
    return stripHtml(contentMatch[1]);
  }

  // 股吧内容
  const postMatch = html.match(/id="post_content_[^>]*>([\s\S]*?)<\/div>/i);
  if (postMatch) {
    return stripHtml(postMatch[1]);
  }

  return '';
}

/**
 * 提取华尔街见闻内容
 */
function extractWallstreetcnContent(html) {
  // 华尔街见闻文章在 .article__content 中
  const contentMatch = html.match(/class="article__content"[^>]*>([\s\S]*?)<\/article>/i);
  if (contentMatch) {
    return stripHtml(contentMatch[1]);
  }

  return '';
}

/**
 * 通用内容提取
 */
function extractGenericContent(html) {
  // 尝试提取 main 标签
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch) {
    return stripHtml(mainMatch[1]);
  }

  // 尝试提取 article 标签
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch) {
    return stripHtml(articleMatch[1]);
  }

  // 尝试提取 p 标签内容（最多 10 段）
  const pTags = html.match(/<p[^>]*>([^<]+)<\/p>/gi) || [];
  if (pTags.length > 0) {
    return pTags.slice(0, 10).map(p => {
      const match = p.match(/<p[^>]*>([^<]+)<\/p>/i);
      return match ? match[1] : '';
    }).join('\n\n');
  }

  return '';
}

/**
 * 清理 HTML 标签
 */
function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 清理内容
 */
function cleanContent(content) {
  // 移除过短的段落
  const paragraphs = content.split('\n').filter(p => p.trim().length > 10);
  return paragraphs.join('\n\n');
}
