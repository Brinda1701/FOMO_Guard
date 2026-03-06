// Vercel Serverless Function: URL 内容爬取
// 使用 Cheerio 进行 DOM 解析

const cheerio = require('cheerio');
const { setSecureCorsHeaders, stripHtml } = require('./utils');

module.exports = async function handler(req, res) {
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
      return res.status(400).json({ success: false, error: 'URL is required' });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (e) {
      return res.status(400).json({ success: false, error: '无效的 URL 格式' });
    }

    const domain = parsedUrl.hostname.replace('www.', '');
    const siteConfig = findSiteConfig(domain);

    if (!siteConfig) {
      const supportedList = Object.values(SITE_CONFIGS).map(s => s.name).join('、');
      return res.status(400).json({ success: false, error: `暂不支持该网站，目前支持：${supportedList}` });
    }

    const html = await fetchUrlContent(url);
    const $ = cheerio.load(html);
    const extracted = extractContentWithCheerio($, siteConfig, html);

    const antiBotResult = detectAntiBot(extracted.content);
    if (antiBotResult.detected) {
      return res.status(400).json({
        success: false,
        error: '该网页可能需要登录或存在反爬防护，无法自动抓取。请复制新闻文本使用「文本分析」模式',
        reason: antiBotResult.reason
      });
    }

    if (extracted.content.length < 100) {
      return res.status(400).json({
        success: false,
        error: '该网页可能需要登录或存在反爬防护，无法自动抓取。请复制新闻文本使用「文本分析」模式',
        reason: `提取到的内容过少（仅${extracted.content.length}字）`,
        extractedTitle: extracted.title
      });
    }

    res.status(200).json({
      success: true,
      url,
      source: siteConfig.name,
      title: extracted.title,
      content: extracted.content,
      publishTime: extracted.publishTime,
      textLength: extracted.content.length
    });

  } catch (error) {
    console.error('[Scrape URL] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const SITE_CONFIGS = {
  'xueqiu.com': { name: '雪球', selectors: { title: 'h1.article__title', content: '.article__content', publishTime: '.article__time' } },
  'eastmoney.com': { name: '东方财富', selectors: { title: '.btitle', content: '.btext', publishTime: '.time' } },
  'guba.eastmoney.com': { name: '东方财富股吧', selectors: { title: '.article-title', content: '#post_content_1', publishTime: '.article-time' } },
  'sina.com.cn': { name: '新浪财经', selectors: { title: 'h1.main-title', content: '#artibody', publishTime: '.time-source' } },
  'wallstreetcn.com': { name: '华尔街见闻', selectors: { title: '.article__title', content: '.article__content', publishTime: '.article__time' } }
};

function findSiteConfig(domain) {
  for (const [key, config] of Object.entries(SITE_CONFIGS)) {
    if (domain.includes(key)) return config;
  }
  return null;
}

async function fetchUrlContent(url, maxRetries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'zh-CN,zh;q=0.9'
        },
        redirect: 'follow'
      });
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  throw lastError;
}

function extractContentWithCheerio($, siteConfig, html) {
  let title = '', content = '', publishTime = '';
  const selectors = siteConfig.selectors;

  if (selectors.title) {
    const titleEl = $(selectors.title).first();
    if (titleEl.length > 0) title = titleEl.text().trim();
  }
  if (!title) title = $('title').first().text().trim();
  title = cleanTitle(title);

  if (selectors.publishTime) {
    const timeEl = $(selectors.publishTime).first();
    if (timeEl.length > 0) publishTime = timeEl.text().trim();
  }

  if (selectors.content) {
    const contentEls = $(selectors.content);
    if (contentEls.length > 0) {
      content = contentEls.map((_, el) => {
        const el$ = cheerio.load($(el).html() || '', null, false);
        return el$('p, div, span').map((i, p) => $(p).text().trim()).get().join('\n\n');
      }).get().join('\n\n');
    }
  }

  if (!content || content.length < 50) content = extractGenericContent($);
  content = cleanContent(content);

  return { title, content, publishTime };
}

function extractGenericContent($) {
  const mainContent = $('main').text();
  if (mainContent.trim().length > 100) return mainContent;
  const articleContent = $('article').text();
  if (articleContent.trim().length > 100) return articleContent;
  const paragraphs = [];
  $('p').each((_, p) => {
    const text = $(p).text().trim();
    if (text.length > 20) paragraphs.push(text);
    if (paragraphs.length >= 20) return false;
  });
  return paragraphs.join('\n\n');
}

function cleanTitle(title) {
  if (!title) return '';
  return title.replace(/_-.*$/, '').replace(/-.*(?:财经 | 股票 | 资讯).*$/i, '').replace(/\|.*$/, '').trim();
}

function cleanContent(content) {
  if (!content) return '';
  const paragraphs = content.split('\n').map(p => p.trim()).filter(p => p.length > 10);
  return [...new Set(paragraphs)].join('\n\n');
}

function detectAntiBot(content) {
  const lowerContent = content.toLowerCase();
  const patterns = ['验证码', '验证您的访问', '请稍候', '正在检查', 'captcha', 'verify', 'cloudflare', '请完成验证', '安全验证'];
  for (const pattern of patterns) {
    if (lowerContent.includes(pattern.toLowerCase())) {
      return { detected: true, reason: `检测到反爬特征词："${pattern}"` };
    }
  }
  return { detected: false };
}
