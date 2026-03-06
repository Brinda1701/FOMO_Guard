// Vercel Serverless Function: URL 内容爬取
// 支持雪球、东方财富、新浪财经等主流财经媒体
// 使用共享 utils 模块

import { stripHtml, setSecureCorsHeaders } from './utils.js';

export default async function handler(req, res) {
  // 使用安全的 CORS 配置
  setSecureCorsHeaders(res, { 'Content-Type': 'application/json' });

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

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (e) {
      return res.status(400).json({
        success: false,
        error: '无效的 URL 格式'
      });
    }

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

    let source = '未知';
    if (domain.includes('xueqiu')) source = '雪球';
    else if (domain.includes('eastmoney') || domain.includes('guba')) source = '东方财富';
    else if (domain.includes('sina') || domain.includes('finance')) source = '新浪财经';
    else if (domain.includes('10jqka')) source = '同花顺';
    else if (domain.includes('wallstreetcn')) source = '华尔街见闻';
    else if (domain.includes('caixin')) source = '财新';
    else if (domain.includes('yicai')) source = '第一财经';

    const content = await fetchUrlContent(url);

    if (!content || content.trim().length < 50) {
      return res.status(400).json({
        success: false,
        error: '无法获取网页内容，可能该页面需要登录或反爬虫保护'
      });
    }

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

async function fetchUrlContent(url) {
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

function extractContent(html, source) {
  let title = '';
  let content = '';
  let publishTime = '';

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    title = titleMatch[1].trim();
    title = title.replace(/_-.*$/, '').replace(/-.*$/, '').trim();
  }

  if (source === '雪球') {
    content = extractXueqiuContent(html);
  } else if (source === '东方财富' || source === '股吧') {
    content = extractEastmoneyContent(html);
  } else if (source === '华尔街见闻') {
    content = extractWallstreetcnContent(html);
  } else {
    content = extractGenericContent(html);
  }

  content = cleanContent(content);

  return { title, content, publishTime };
}

function extractXueqiuContent(html) {
  const contentMatch = html.match(/class="article__content"[^>]*>([\s\S]*?)<\/div>/i);
  if (contentMatch) {
    return stripHtml(contentMatch[1]);
  }

  const postMatch = html.match(/class="detail__stock-info"[^>]*>([\s\S]*?)<\/div>/i);
  if (postMatch) {
    return stripHtml(postMatch[1]);
  }

  return '';
}

function extractEastmoneyContent(html) {
  const contentMatch = html.match(/class="btext"[^>]*>([\s\S]*?)<\/div>/i);
  if (contentMatch) {
    return stripHtml(contentMatch[1]);
  }

  const postMatch = html.match(/id="post_content_[^>]*>([\s\S]*?)<\/div>/i);
  if (postMatch) {
    return stripHtml(postMatch[1]);
  }

  return '';
}

function extractWallstreetcnContent(html) {
  const contentMatch = html.match(/class="article__content"[^>]*>([\s\S]*?)<\/article>/i);
  if (contentMatch) {
    return stripHtml(contentMatch[1]);
  }

  return '';
}

function extractGenericContent(html) {
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch) {
    return stripHtml(mainMatch[1]);
  }

  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch) {
    return stripHtml(articleMatch[1]);
  }

  const pTags = html.match(/<p[^>]*>([^<]+)<\/p>/gi) || [];
  if (pTags.length > 0) {
    return pTags.slice(0, 10).map(p => {
      const match = p.match(/<p[^>]*>([^<]+)<\/p>/i);
      return match ? match[1] : '';
    }).join('\n\n');
  }

  return '';
}

function cleanContent(content) {
  const paragraphs = content.split('\n').filter(p => p.trim().length > 10);
  return paragraphs.join('\n\n');
}
