/**
 * 分析过程互动模块
 * 在等待分析结果时显示投资心理知识、趣味问答等，分散用户注意力
 */

// 投资心理知识库
const PSYCHOLOGY_TIPS = [
    {
        text: "「别人贪婪时恐惧，别人恐惧时贪婪。」",
        author: "—— 沃伦·巴菲特",
        category: "投资智慧"
    },
    {
        text: "「市场保持非理性的时间，可能比你保持偿付能力的时间更长。」",
        author: "—— 约翰·梅纳德·凯恩斯",
        category: "风险警示"
    },
    {
        text: "「风险来自于你不知道自己在做什么。」",
        author: "—— 沃伦·巴菲特",
        category: "风险管理"
    },
    {
        text: "「在华尔街，历史总是在重演。这是因为人们相信自己的直觉，而不是历史。」",
        author: "—— 约翰·肯尼斯·加尔布雷斯",
        category: "市场规律"
    },
    {
        text: "「牛市在悲观中诞生，在怀疑中成长，在乐观中成熟，在狂欢中消亡。」",
        author: "—— 约翰·邓普顿",
        category: "市场周期"
    },
    {
        text: "「投资最重要的不是买什么，而是以什么价格买。」",
        author: "—— 霍华德·马克斯",
        category: "估值理念"
    },
    {
        text: "「价格是你付出的，价值是你得到的。」",
        author: "—— 沃伦·巴菲特",
        category: "价值投资"
    },
    {
        text: "「市场短期是投票机，长期是称重机。」",
        author: "—— 本杰明·格雷厄姆",
        category: "市场本质"
    },
    {
        text: "「不要把所有鸡蛋放在同一个篮子里。」",
        author: "—— 马克·吐温",
        category: "分散投资"
    },
    {
        text: "「成功的投资需要耐心、纪律和独立思考的能力。」",
        author: "—— 彼得·林奇",
        category: "投资心态"
    },
    {
        text: "「FOMO（错失恐惧症）是投资者最大的敌人之一。」",
        author: "—— 行为金融学",
        category: "心理陷阱"
    },
    {
        text: "「损失厌恶让人对亏损的痛苦感受是同等收益快乐的 2.5 倍。」",
        author: "—— 卡尼曼 & 特沃斯基",
        category: "行为金融"
    },
    {
        text: "「锚定效应让你过度依赖最初获得的信息，比如历史高价。」",
        author: "—— 行为金融学",
        category: "认知偏误"
    },
    {
        text: "「羊群效应解释了为什么散户总是追涨杀跌。」",
        author: "—— 罗伯特·席勒",
        category: "群体行为"
    },
    {
        text: "「处置效应让你过早卖出盈利股，过久持有亏损股。」",
        author: "—— 谢夫林 & 斯塔特曼",
        category: "交易心理"
    }
];

// 趣味问答库
const QUIZ_QUESTIONS = [
    {
        question: "「损失厌恶」理论是由谁提出的？",
        options: ["巴菲特", "卡尼曼 & 特沃斯基", "索罗斯", "彼得·林奇"],
        correct: 1,
        explanation: "丹尼尔·卡尼曼和阿莫斯·特沃斯基在 1979 年提出了前景理论，其中核心概念就是损失厌恶。"
    },
    {
        question: "以下哪项不是常见的认知偏误？",
        options: ["锚定效应", "确认偏误", "有效市场", "损失厌恶"],
        correct: 2,
        explanation: "有效市场假说是一种理论，不是认知偏误。其他三项都是常见的行为金融学认知偏误。"
    },
    {
        question: "「牛市在悲观中诞生」的下一句是？",
        options: ["在狂欢中消亡", "在怀疑中成长", "在乐观中成熟", "以上都是"],
        correct: 3,
        explanation: "这是约翰·邓普顿的名言，完整描述了市场周期的四个阶段。"
    },
    {
        question: "FOMO 是指什么？",
        options: ["财务优化管理", "错失恐惧症", "市场情绪指数", "投资策略"],
        correct: 1,
        explanation: "FOMO = Fear Of Missing Out，即错失恐惧症，是驱动追涨行为的主要心理因素。"
    },
    {
        question: "价值投资的核心理念是？",
        options: ["追涨杀跌", "频繁交易", "价格 < 价值时买入", "听消息炒股"],
        correct: 2,
        explanation: "价值投资的核心是当价格低于内在价值时买入，等待价值回归。"
    }
];

// 当前状态
let currentTipIndex = 0;
let currentQuiz = null;
let tipsInterval = null;
let showQuizMode = false;

/**
 * 初始化分析互动模块
 */
export function initAnalysisInteraction() {
    console.log('[AnalysisInteraction] 初始化完成');
}

/**
 * 开始显示投资心理小贴士（轮播模式）
 */
export function startTipsRotation() {
    const container = document.getElementById('analysisTipsContainer');
    if (!container) return;

    container.style.display = 'block';
    showQuizMode = false;
    
    // 立即显示第一条
    showNextTip();
    
    // 每 3.5 秒切换一次
    if (tipsInterval) clearInterval(tipsInterval);
    tipsInterval = setInterval(() => {
        showNextTip();
    }, 3500);
}

/**
 * 显示下一条小贴士
 */
function showNextTip() {
    const contentEl = document.getElementById('tipsContent');
    const progressEl = document.getElementById('tipsProgressBar');
    if (!contentEl) return;

    // 更新进度条
    if (progressEl) {
        progressEl.style.width = '100%';
        setTimeout(() => { progressEl.style.width = '0%'; }, 100);
    }

    // 随机选择小贴士
    const tip = PSYCHOLOGY_TIPS[Math.floor(Math.random() * PSYCHOLOGY_TIPS.length)];
    
    // 淡出效果
    contentEl.style.opacity = '0';
    
    setTimeout(() => {
        contentEl.innerHTML = `
            <div class="tips-text">
                ${tip.text}
                <div class="tips-author">${tip.author}</div>
            </div>
        `;
        contentEl.style.opacity = '1';
    }, 300);
}

/**
 * 停止小贴士轮播
 */
export function stopTipsRotation() {
    if (tipsInterval) {
        clearInterval(tipsInterval);
        tipsInterval = null;
    }
    
    const container = document.getElementById('analysisTipsContainer');
    if (container) {
        container.style.opacity = '0';
        setTimeout(() => {
            container.style.display = 'none';
            container.style.opacity = '1';
        }, 300);
    }
}

/**
 * 显示互动问答（偶尔弹出，增加趣味性）
 */
export function showInteractiveQuiz() {
    const contentEl = document.getElementById('tipsContent');
    if (!contentEl || showQuizMode) return;

    showQuizMode = true;
    stopTipsRotation();

    // 随机选择问题
    currentQuiz = QUIZ_QUESTIONS[Math.floor(Math.random() * QUIZ_QUESTIONS.length)];

    contentEl.innerHTML = `
        <div class="quiz-container">
            <div class="quiz-question">${currentQuiz.question}</div>
            <div class="quiz-options">
                ${currentQuiz.options.map((opt, i) => `
                    <button class="quiz-option" data-index="${i}">${opt}</button>
                `).join('')}
            </div>
            <div class="quiz-feedback" id="quizFeedback" style="display: none;"></div>
        </div>
    `;

    // 绑定选项点击事件
    contentEl.querySelectorAll('.quiz-option').forEach(btn => {
        btn.addEventListener('click', handleQuizAnswer);
    });
}

/**
 * 处理问答选择
 */
function handleQuizAnswer(e) {
    const selectedIndex = parseInt(e.target.dataset.index);
    const feedbackEl = document.getElementById('quizFeedback');
    
    // 禁用所有按钮
    e.target.parentElement.querySelectorAll('.quiz-option').forEach(btn => {
        btn.disabled = true;
        if (parseInt(btn.dataset.index) === currentQuiz.correct) {
            btn.classList.add('correct');
        } else if (btn === e.target && selectedIndex !== currentQuiz.correct) {
            btn.classList.add('wrong');
        }
    });

    // 显示反馈
    const isCorrect = selectedIndex === currentQuiz.correct;
    feedbackEl.style.display = 'block';
    feedbackEl.className = `quiz-feedback ${isCorrect ? 'success' : 'error'}`;
    feedbackEl.innerHTML = `
        <div class="feedback-icon">${isCorrect ? '✅' : '❌'}</div>
        <div class="feedback-text">${isCorrect ? '回答正确！' : '回答错误'}</div>
        <div class="feedback-explanation">${currentQuiz.explanation}</div>
    `;

    // 2 秒后恢复小贴士轮播
    setTimeout(() => {
        showQuizMode = false;
        startTipsRotation();
    }, 3000);
}

/**
 * 随机触发问答（在分析过程中有 30% 概率触发）
 */
export function maybeShowQuiz() {
    if (Math.random() < 0.3 && !showQuizMode) {
        showInteractiveQuiz();
    }
}

/**
 * 重置互动模块
 */
export function resetAnalysisInteraction() {
    stopTipsRotation();
    showQuizMode = false;
    currentTipIndex = 0;
}

// 导出 CSS 类名供其他模块使用
export const CSS_CLASSES = {
    quizContainer: 'quiz-container',
    quizQuestion: 'quiz-question',
    quizOptions: 'quiz-options',
    quizOption: 'quiz-option',
    quizFeedback: 'quiz-feedback',
    correct: 'correct',
    wrong: 'wrong'
};
