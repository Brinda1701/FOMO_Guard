export const AI_CONFIG = {
    URL: 'http://localhost:5000',
    TIMEOUT: 3000
};

export const PROFILES = {
    '茅台': { base: 72, vol: 8, sector: '消费', kw: ['白酒', '业绩', '估值', '消费'] },
    '贵州茅台': { base: 72, vol: 8, sector: '消费', kw: ['白酒', '业绩', '估值', '消费'] },
    '比亚迪': { base: 78, vol: 10, sector: '新能源', kw: ['电动车', '电池', '出海', '销量'] },
    '特斯拉': { base: 55, vol: 15, sector: '科技', kw: ['马斯克', 'FSD', '降价', '产能'] },
    'Tesla': { base: 55, vol: 15, sector: '科技', kw: ['马斯克', 'FSD', '降价', '产能'] },
    'TSLA': { base: 55, vol: 15, sector: '科技', kw: ['马斯克', 'FSD', '降价', '产能'] },
    '英伟达': { base: 85, vol: 8, sector: 'AI芯片', kw: ['AI', 'GPU', '数据中心', '算力'] },
    'NVIDIA': { base: 85, vol: 8, sector: 'AI芯片', kw: ['AI', 'GPU', '数据中心', '算力'] },
    'NVDA': { base: 85, vol: 8, sector: 'AI芯片', kw: ['AI', 'GPU', '数据中心', '算力'] },
    '苹果': { base: 62, vol: 8, sector: '科技', kw: ['iPhone', 'AI', '供应链', '创新'] },
    'Apple': { base: 62, vol: 8, sector: '科技', kw: ['iPhone', 'AI', '供应链', '创新'] },
    'AAPL': { base: 62, vol: 8, sector: '科技', kw: ['iPhone', 'AI', '供应链', '创新'] },
    '阿里巴巴': { base: 35, vol: 12, sector: '互联网', kw: ['电商', '云计算', '拆分', '监管'] },
    '阿里': { base: 35, vol: 12, sector: '互联网', kw: ['电商', '云计算', '拆分', '监管'] },
    'BABA': { base: 35, vol: 12, sector: '互联网', kw: ['电商', '云计算', '拆分', '监管'] },
    '腾讯': { base: 58, vol: 10, sector: '互联网', kw: ['游戏', '微信', '投资', '视频号'] },
    '宁德时代': { base: 75, vol: 12, sector: '新能源', kw: ['电池', '储能', '出海', '技术'] },
    '华为': { base: 82, vol: 8, sector: '科技', kw: ['芯片', '手机', '突破', '自主'] },
    '小米': { base: 68, vol: 10, sector: '消费电子', kw: ['手机', '汽车', 'IoT', '高端化'] },
    '京东': { base: 42, vol: 12, sector: '电商', kw: ['物流', '零售', '竞争', '利润'] },
    '美团': { base: 45, vol: 14, sector: '本地生活', kw: ['外卖', '到店', '竞争', '盈利'] },
    '万科': { base: 25, vol: 18, sector: '房地产', kw: ['销售', '现金流', '债务', '转型'] },
    '恒大': { base: 12, vol: 10, sector: '房地产', kw: ['债务', '重组', '风险', '清盘'] },
    '中国平安': { base: 32, vol: 10, sector: '金融', kw: ['保险', '投资', '地产', '转型'] },
    '谷歌': { base: 70, vol: 10, sector: '科技', kw: ['AI', '广告', '云计算', '搜索'] },
    'Google': { base: 70, vol: 10, sector: '科技', kw: ['AI', '广告', '云计算', '搜索'] },
    '微软': { base: 76, vol: 8, sector: '科技', kw: ['AI', '云计算', 'Office', 'Azure'] },
    'Microsoft': { base: 76, vol: 8, sector: '科技', kw: ['AI', '云计算', 'Office', 'Azure'] },
    '亚马逊': { base: 65, vol: 10, sector: '电商', kw: ['AWS', '电商', '物流', 'AI'] },
    'Amazon': { base: 65, vol: 10, sector: '电商', kw: ['AWS', '电商', '物流', 'AI'] },
};

export const SECTOR_KW = {
    '银行': { sector: '金融', base: 42, vol: 8, kw: ['贷款', '息差', '资产', '分红'] },
    '证券': { sector: '金融', base: 50, vol: 15, kw: ['交易', '投行', '资管', '佣金'] },
    '保险': { sector: '金融', base: 38, vol: 10, kw: ['保费', '投资', '理赔', '转型'] },
    '地产': { sector: '房地产', base: 28, vol: 18, kw: ['销售', '债务', '现金流', '政策'] },
    '房产': { sector: '房地产', base: 28, vol: 18, kw: ['销售', '债务', '现金流', '政策'] },
    '新能源': { sector: '新能源', base: 72, vol: 12, kw: ['产能', '出海', '竞争', '技术'] },
    '电池': { sector: '新能源', base: 70, vol: 12, kw: ['产能', '成本', '技术', '出货'] },
    '汽车': { sector: '汽车', base: 58, vol: 12, kw: ['销量', '新能源', '出口', '竞争'] },
    '医药': { sector: '医药', base: 52, vol: 14, kw: ['研发', '集采', '创新', '出海'] },
    '芯片': { sector: '半导体', base: 65, vol: 15, kw: ['制程', '产能', '国产', '需求'] },
    '半导体': { sector: '半导体', base: 65, vol: 15, kw: ['制程', '产能', '国产', '需求'] },
    '互联网': { sector: '互联网', base: 50, vol: 14, kw: ['流量', '变现', '竞争', '监管'] },
    '白酒': { sector: '消费', base: 68, vol: 10, kw: ['动销', '价格', '库存', '高端'] },
};

export const PSYCHOLOGY_LIBRARY = {
    'buy': {
        'high': { title: '🚨 别当接盘侠！', content: '当前情绪极度亢奋。你现在买入极大概率是在为别人的利润买单。', cooldown: true },
        'low': { title: '💎 逆向思维校验', content: '全网都在恐惧。此时买入需要极大的耐心，确认基本面没坏再动手。', cooldown: false }
    },
    'sell': {
        'high': { title: '📈 止盈的艺术', content: '盈利是拿出来的，不是看出来的。由于处置效应，你可能正错过最佳卖点。', cooldown: false },
        'low': { title: '⏰ 割肉心理诱导', content: '亏损的痛苦是盈利的2倍。不要因为害怕账户红色而选择在黎明前离场。', cooldown: true }
    },
    'hold': {
        'high': { title: '🧘 拒绝 FOMO', content: '在别人疯狂时选择按兵不动。你不需要赚到每一分钱，稳健比频率更重要。', cooldown: false },
        'low': { title: '🔍 静待出击', content: '目前入场太早，离场太晚。观望是目前最高级的风险控制手段。', cooldown: false }
    }
};

export const PSYCHOLOGY_QUIZZES = [
    {
        question: "当股价连续下跌时，'损失厌恶'会导致投资者？",
        options: ["更倾向于持有亏损股票", "理性止损离场", "加仓摊平成本", "以上都不对"],
        correct: 0,
        explanation: "损失厌恶使人对亏损的痛苦感受是同等收益快乐的2倍，导致不愿承认亏损而继续持有。"
    },
    {
        question: "'锚定效应'指的是什么？",
        options: ["以历史高点作为价值参照", "分散投资降低风险", "跟随机构买入", "高抛低吸"],
        correct: 0,
        explanation: "锚定效应是指人们过度依赖最初获得的信息（如历史高价）来做判断。"
    },
    {
        question: "当所有人都在讨论某只股票时，最可能发生什么？",
        options: ["继续大涨", "接近顶部", "基本面改善", "机构建仓"],
        correct: 1,
        explanation: "当'擦鞋童都在讨论股票'时，往往意味着市场情绪过热，接近顶部。"
    },
    {
        question: "'确认偏误'会让投资者？",
        options: ["只关注支持自己观点的信息", "客观分析所有数据", "听取专家建议", "逆向思考"],
        correct: 0,
        explanation: "确认偏误使人倾向于寻找、解释、偏好支持自己已有信念的信息。"
    },
    {
        question: "情绪极度恐慌时（情绪指数<30），历史数据显示？",
        options: ["继续下跌概率大", "反而可能是买入机会", "应该立即清仓", "与收益无关"],
        correct: 1,
        explanation: "历史数据表明，极度恐慌时往往是市场超跌，反向操作长期来看收益更高。"
    },
    {
        question: "'处置效应'指的是什么行为？",
        options: ["过早卖出盈利股，过久持有亏损股", "理性止盈止损", "频繁交易", "集中持仓"],
        correct: 0,
        explanation: "处置效应是指投资者倾向于过早卖出盈利股票，而过久持有亏损股票。"
    }
];