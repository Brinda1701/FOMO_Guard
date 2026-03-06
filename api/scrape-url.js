// Vercel Serverless Function: URL 内容爬取
// 使用 Cheerio 进行 DOM 解析，支持主流财经媒体
// 包含反爬检测和 SPA 处理

import * as cheerio from 'cheerio';
import { setSecureCorsHeaders } from './utils.js';

// 真实的 User-Agent 列表（轮询使用）
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
];

// 反爬特征词（检测到这些词说明可能被拦截）
const ANTI_BOT_PATTERNS = [
  '验证码',
  '验证您的访问',
  '请稍候',
  '正在检查',
  'access check',
  'captcha',
  'verify',
  'cloudflare',
  'cf-browser-verification',
  '请完成验证',
  '安全验证',
  '人类验证',
  '访问受限',
  '需要登录',
  '请先登录'
];

// 支持的网站及其选择器配置
const SITE_CONFIGS = {
  'xueqiu.com': {
    name: '雪球',
    selectors: {
      title: 'h1.article__title, .article__title',
      content: '.article__content, .detail__stock-info, .rich-media-container',
      publishTime: '.article__time, .publish-time'
    }
  },
  'eastmoney.com': {
    name: '东方财富',
    selectors: {
      title: '.btitle, #title',
      content: '.btext, .article-content, #Content_body',
      publishTime: '.time, .date'
    }
  },
  'guba.eastmoney.com': {
    name: '东方财富股吧',
    selectors: {
      title: '.article-title, #title',
      content: '#post_content_1, .article-content',
      publishTime: '.article-time'
    }
  },
  'sina.com.cn': {
    name: '新浪财经',
    selectors: {
      title: 'h1.main-title, .main-title',
      content: '.article, #artibody, .content',
      publishTime: '.date, .time-source'
    }
  },
  'finance.sina.com.cn': {
    name: '新浪财经',
    selectors: {
      title: 'h1.main-title',
      content: '#artibody, .article',
      publishTime: '.time-source'
    }
  },
  'wallstreetcn.com': {
    name: '华尔街见闻',
    selectors: {
      title: '.article__title, h1',
      content: '.article__content, .article-content',
      publishTime: '.article__time'
    }
  },
  '10jqka.com.cn': {
    name: '同花顺',
    selectors: {
      title: 'h1.title, .title',
      content: '#js_content, .content',
      publishTime: '.time'
    }
  },
  'caixin.com': {
    name: '财新',
    selectors: {
      title: 'h1.article-title',
      content: '.article-content, #Main_Content',
      publishTime: '.time'
    }
  },
  'yicai.com': {
    name: '第一财经',
    selectors: {
      title: '.m-title, h1',
      content: '.text-content, .article',
      publishTime: '.time'
    }
  }
};

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
    const domain = parsedUrl.hostname.replace('www.', '');
    const siteConfig = findSiteConfig(domain);

    if (!siteConfig) {
      const supportedList = Object.values(SITE_CONFIGS).map(s => s.name).join('、');
      return res.status(400).json({
        success: false,
        error: `暂不支持该网站，目前支持：${supportedList}`
      });
    }

    // 爬取网页内容
    const html = await fetchUrlContent(url);

    // 使用 Cheerio 解析
    const $ = cheerio.load(html);

    // 提取内容
    const extracted = extractContentWithCheerio($, siteConfig, html);

    // 反爬检测
    const antiBotResult = detectAntiBot(extracted.content);
    if (antiBotResult.detected) {
      return res.status(400).json({
        success: false,
        error: '该网页可能需要登录或存在反爬防护，无法自动抓取。请复制新闻文本使用「文本分析」模式',
        reason: antiBotResult.reason,
        suggestion: '请复制新闻文本使用「文本分析」模式'
      });
    }

    // 内容长度检测（SPA 或动态加载检测）
    if (extracted.content.length < 100) {
      return res.status(400).json({
        success: false,
        error: '该网页可能需要登录或存在反爬防护，无法自动抓取。请复制新闻文本使用「文本分析」模式',
        reason: `提取到的内容过少（仅${extracted.content.length}字），可能是 SPA 页面或需要 JavaScript 渲染`,
        suggestion: '请复制新闻文本使用「文本分析」模式',
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
    
    // 判断是否是网络错误
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return res.status(503).json({
        success: false,
        error: '无法访问该网页，可能是网络问题或网站已屏蔽访问。请复制新闻文本使用「文本分析」模式'
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * 查找匹配的站点配置
 */
function findSiteConfig(domain) {
  for (const [key, config] of Object.entries(SITE_CONFIGS)) {
    if (domain.includes(key)) {
      return config;
    }
  }
  return null;
}

/**
 * 爬取网页内容（带重试和 UA 轮询）
 */
async function fetchUrlContent(url, maxRetries = 2) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // 轮询 User-Agent
      const userAgent = USER_AGENTS[attempt % USER_AGENTS.length];
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        redirect: 'follow',
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      
      // 检查是否是错误页面
      if (html.includes('404') && html.includes('Not Found')) {
        throw new Error('页面不存在 (404)');
      }
      
      return html;
      
    } catch (error) {
      lastError = error;
      console.warn(`[Fetch attempt ${attempt + 1}] failed:`, error.message);
      
      // 如果不是最后一次尝试，等待后重试
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }
  
  throw lastError;
}

/**
 * 使用 Cheerio 提取内容
 */
function extractContentWithCheerio($, siteConfig, html) {
  let title = '';
  let content = '';
  let publishTime = '';

  const selectors = siteConfig.selectors;

  // 提取标题
  if (selectors.title) {
    const titleEl = $(selectors.title).first();
    if (titleEl.length > 0) {
      title = titleEl.text().trim();
    }
  }
  
  // 如果特定选择器失败，尝试通用方法
  if (!title) {
    title = $('title').first().text().trim();
  }
  
  // 清理标题（移除网站名称等）
  title = cleanTitle(title);

  // 提取发布时间
  if (selectors.publishTime) {
    const timeEl = $(selectors.publishTime).first();
    if (timeEl.length > 0) {
      publishTime = timeEl.text().trim();
    }
  }

  // 提取正文内容
  if (selectors.content) {
    const contentEls = $(selectors.content);
    if (contentEls.length > 0) {
      // 提取所有匹配元素中的文本
      content = contentEls.map((_, el) => {
        // 保留段落结构
        const el$ = cheerio.load($(el).html() || '', null, false);
        return el$('p, div, span').map((i, p) => $(p).text().trim()).get().join('\n\n');
      }).get().join('\n\n');
    }
  }

  // 如果特定选择器失败，尝试通用方法
  if (!content || content.length < 50) {
    content = extractGenericContent($);
  }

  // 清理内容
  content = cleanContent(content);

  return { title, content, publishTime };
}

/**
 * 通用内容提取（当特定选择器失败时）
 */
function extractGenericContent($) {
  // 尝试提取 main 标签
  const mainContent = $('main').text();
  if (mainContent.trim().length > 100) {
    return mainContent;
  }

  // 尝试提取 article 标签
  const articleContent = $('article').text();
  if (articleContent.trim().length > 100) {
    return articleContent;
  }

  // 尝试提取所有 p 标签（最多 20 段）
  const paragraphs = [];
  $('p').each((_, p) => {
    const text = $(p).text().trim();
    if (text.length > 20) { // 只保留有意义的段落
      paragraphs.push(text);
    }
    if (paragraphs.length >= 20) {
      return false; // 跳出循环
    }
  });

  return paragraphs.join('\n\n');
}

/**
 * 清理标题
 */
function cleanTitle(title) {
  if (!title) return '';
  
  // 移除常见的网站后缀
  const patterns = [
    /_-.*$/,
    /-.*(?:财经 | 股票 | 资讯 | 新闻| 网| 吧| 雪球| 东方财富| 新浪| 华尔街| 同花顺| 财新| 第一财经).*$/i,
    /\|.*$/,
    /::.*$/
  ];
  
  let cleaned = title;
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  return cleaned.trim();
}

/**
 * 清理内容
 */
function cleanContent(content) {
  if (!content) return '';
  
  // 移除过短的段落（小于 10 字）
  const paragraphs = content.split('\n')
    .map(p => p.trim())
    .filter(p => p.length > 10);
  
  // 移除重复段落
  const uniqueParagraphs = [...new Set(paragraphs)];
  
  return uniqueParagraphs.join('\n\n');
}

/**
 * 反爬检测
 */
function detectAntiBot(content) {
  const lowerContent = content.toLowerCase();
  
  for (const pattern of ANTI_BOT_PATTERNS) {
    if (lowerContent.includes(pattern.toLowerCase())) {
      return {
        detected: true,
        reason: `检测到反爬特征词："${pattern}"`
      };
    }
  }
  
  return { detected: false };
}
