/**
 * FOMOGuard - 用户登录和使用指南模块
 */

// 用户数据管理
export const User = {
    currentUser: null,
    
    // 初始化用户状态
    init() {
        const saved = localStorage.getItem('fomoguard_user');
        if (saved) {
            this.currentUser = JSON.parse(saved);
        }
    },
    
    // 登录
    login(username, password) {
        const users = this.getUsers();
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            this.currentUser = { username: user.username, isGuest: false, loginTime: Date.now() };
            localStorage.setItem('fomoguard_user', JSON.stringify(this.currentUser));
            return { success: true };
        }
        return { success: false, message: '用户名或密码错误' };
    },
    
    // 注册
    register(username, password) {
        const users = this.getUsers();
        
        if (users.find(u => u.username === username)) {
            return { success: false, message: '用户名已存在' };
        }
        
        users.push({ username, password, registerTime: Date.now() });
        localStorage.setItem('fomoguard_users', JSON.stringify(users));
        
        this.currentUser = { username, isGuest: false, loginTime: Date.now() };
        localStorage.setItem('fomoguard_user', JSON.stringify(this.currentUser));
        return { success: true };
    },
    
    // 游客访问
    guestAccess() {
        const guestName = '游客_' + Math.random().toString(36).substr(2, 6);
        this.currentUser = { username: guestName, isGuest: true, loginTime: Date.now() };
        localStorage.setItem('fomoguard_user', JSON.stringify(this.currentUser));
        
        // 清除游客之前的缓存数据
        this.clearGuestData();
        
        return { success: true, username: guestName };
    },

    // 清除游客数据（交易日记、情绪历史等）
    clearGuestData() {
        // 清除交易日记
        localStorage.removeItem('tradeDiary');
        // 清除情绪历史
        localStorage.removeItem('sentimentHistory');
        // 清除其他可能的缓存数据
        localStorage.removeItem('fomoguard_analysis_cache');
        console.log('[User] 游客数据已清除');
    },

    // 切换账号（清除当前用户数据）
    switchAccount() {
        this.currentUser = null;
        localStorage.removeItem('fomoguard_user');
        // 清除所有缓存数据
        this.clearGuestData();
        console.log('[User] 账号已切换，数据已清除');
    },
    
    // 获取所有用户
    getUsers() {
        const users = localStorage.getItem('fomoguard_users');
        return users ? JSON.parse(users) : [];
    },
    
    // 登出
    logout() {
        this.currentUser = null;
        localStorage.removeItem('fomoguard_user');
    },
    
    // 检查是否已登录
    isLoggedIn() {
        return this.currentUser !== null;
    }
};

// 交互式使用指南
export const Guide = {
    currentStep: 0,
    totalSteps: 5,
    
    // 指南步骤内容
    steps: [
        {
            icon: '🔍',
            title: '欢迎使用 FOMOGuard',
            content: '这是一个帮助您保持理性投资的工具。接下来我将带您了解如何使用各项功能。',
            tip: '提示：您可以随时按 ESC 键跳过指南'
        },
        {
            icon: '📝',
            title: '输入公司或股票代码',
            content: '在搜索框中输入您想分析的公司名称或股票代码，例如"茅台"、"AAPL"、"特斯拉"等。',
            tip: '小技巧：点击下方的快捷标签可以快速选择热门公司',
            highlight: 'companyInput'
        },
        {
            icon: '🤖',
            title: 'Multi-Agent 智能分析',
            content: '点击"开始分析"后，三个 AI Agent 将同时工作：市场舆情、盘面量价、行为心理，为您提供全面的分析结果。',
            tip: '分析过程约需 5-10 秒，请耐心等待',
            highlight: 'analyzeBtn'
        },
        {
            icon: '📊',
            title: '查看分析结果',
            content: '分析完成后，您将看到情绪仪表盘、Agent 评分对比、判定证据胶囊等详细信息。',
            tip: '证据胶囊会显示 AI 判断的具体依据，帮助您理解分析逻辑',
            highlight: 'agentVisualizationCard'
        },
        {
            icon: '🧠',
            title: '理性决策辅助',
            content: '当您想进行交易决策时，系统会根据当前情绪状态提供冷静期和心理建议，帮助您避免冲动交易。',
            tip: '完成冷静期抄写后，系统会解锁决策建议',
            highlight: 'impulseSection'
        }
    ],
    
    // 初始化指南
    init() {
        const guideShown = localStorage.getItem('fomoguard_guide_shown');
        if (!guideShown && User.isLoggedIn()) {
            this.show();
        }
    },
    
    // 显示指南
    show() {
        this.currentStep = 0;
        const overlay = document.getElementById('guideOverlay');
        if (overlay) {
            overlay.style.display = 'flex';
            this.renderStep();
        }
        localStorage.setItem('fomoguard_guide_shown', 'true');
    },
    
    // 渲染当前步骤
    renderStep() {
        const step = this.steps[this.currentStep];
        const content = document.getElementById('guideContent');
        const progressBar = document.getElementById('guideProgressBar');
        const prevBtn = document.getElementById('guidePrevBtn');
        
        if (!content) return;
        
        // 更新进度条
        const progress = ((this.currentStep + 1) / this.totalSteps) * 100;
        if (progressBar) {
            progressBar.style.width = progress + '%';
        }
        
        // 渲染内容
        content.innerHTML = `
            <div class="guide-step active">
                <span class="guide-step-icon">${step.icon}</span>
                <h3>${step.title}</h3>
                <p>${step.content}</p>
                ${step.highlight ? `
                    <div class="guide-step-tip">
                        💡 ${step.tip}
                    </div>
                ` : `<p class="guide-step-tip">${step.tip}</p>`}
            </div>
        `;
        
        // 更新按钮状态
        if (prevBtn) {
            prevBtn.style.display = this.currentStep > 0 ? 'block' : 'none';
        }
        
        // 高亮目标元素
        this.highlightElement(step.highlight);
    },
    
    // 高亮目标元素
    highlightElement(elementId) {
        // 清除之前的高亮
        this.clearHighlight();
        
        if (!elementId) return;
        
        const element = document.getElementById(elementId);
        if (!element) return;
        
        // 创建高亮遮罩
        const overlay = document.getElementById('highlightOverlay');
        if (overlay) {
            overlay.style.display = 'block';
            
            // 获取元素位置
            const rect = element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            // 创建箭头指示
            const arrow = document.createElement('div');
            arrow.className = 'guide-arrow';
            arrow.style.left = (centerX - 20) + 'px';
            arrow.style.top = (rect.top - 50) + 'px';
            overlay.appendChild(arrow);
            
            // 高亮目标元素
            element.classList.add('highlight-target');
            
            // 滚动到目标元素
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    },
    
    // 清除高亮
    clearHighlight() {
        const overlay = document.getElementById('highlightOverlay');
        if (overlay) {
            overlay.innerHTML = '';
            overlay.style.display = 'none';
        }
        
        document.querySelectorAll('.highlight-target').forEach(el => {
            el.classList.remove('highlight-target');
        });
    },
    
    // 下一步
    next() {
        if (this.currentStep < this.totalSteps - 1) {
            this.currentStep++;
            this.renderStep();
        } else {
            this.finish();
        }
    },
    
    // 上一步
    prev() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.renderStep();
        }
    },
    
    // 完成指南
    finish() {
        this.clearHighlight();
        const overlay = document.getElementById('guideOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    },
    
    // 跳过指南
    skip() {
        this.clearHighlight();
        const overlay = document.getElementById('guideOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
        localStorage.setItem('fomoguard_guide_shown', 'true');
    }
};

// 登录界面管理
export const LoginUI = {
    init() {
        // 检查登录状态
        User.init();

        const loginOverlay = document.getElementById('loginOverlay');

        // 如果未登录，显示登录界面
        if (!User.isLoggedIn() && loginOverlay) {
            loginOverlay.style.display = 'flex';
        }

        // 绑定事件
        this.bindEvents();
    },

    // 显示登录模态框
    showLoginModal() {
        const loginOverlay = document.getElementById('loginOverlay');
        if (loginOverlay) {
            loginOverlay.style.display = 'flex';
        }
    },

    bindEvents() {
        // 切换登录/注册标签
        document.querySelectorAll('.login-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                
                const tabName = e.target.dataset.tab;
                document.querySelectorAll('.login-form-container').forEach(f => f.classList.remove('active'));
                document.getElementById(tabName + 'Form').classList.add('active');
            });
        });
        
        // 登录提交
        const loginBtn = document.getElementById('loginSubmitBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                const username = document.getElementById('loginUsername').value;
                const password = document.getElementById('loginPassword').value;
                
                if (!username || !password) {
                    alert('请输入用户名和密码');
                    return;
                }
                
                const result = User.login(username, password);
                if (result.success) {
                    document.getElementById('loginOverlay').style.display = 'none';
                    // 更新用户状态按钮
                    if (window.updateUserStatusButton) {
                        window.updateUserStatusButton();
                    }
                    Guide.init();
                } else {
                    alert(result.message);
                }
            });
        }
        
        // 注册提交
        const registerBtn = document.getElementById('registerSubmitBtn');
        if (registerBtn) {
            registerBtn.addEventListener('click', () => {
                const username = document.getElementById('registerUsername').value;
                const password = document.getElementById('registerPassword').value;
                const confirm = document.getElementById('registerPasswordConfirm').value;
                
                if (!username || !password) {
                    alert('请填写完整信息');
                    return;
                }
                
                if (username.length < 3 || username.length > 12) {
                    alert('用户名长度应为 3-12 位');
                    return;
                }
                
                if (password.length < 6) {
                    alert('密码长度应至少 6 位');
                    return;
                }
                
                if (password !== confirm) {
                    alert('两次输入的密码不一致');
                    return;
                }
                
                const result = User.register(username, password);
                if (result.success) {
                    document.getElementById('loginOverlay').style.display = 'none';
                    // 更新用户状态按钮
                    if (window.updateUserStatusButton) {
                        window.updateUserStatusButton();
                    }
                    Guide.init();
                } else {
                    alert(result.message);
                }
            });
        }
        
        // 游客访问
        const guestBtn = document.getElementById('guestBtn');
        if (guestBtn) {
            guestBtn.addEventListener('click', () => {
                User.guestAccess();
                document.getElementById('loginOverlay').style.display = 'none';
                // 更新用户状态按钮
                if (window.updateUserStatusButton) {
                    window.updateUserStatusButton();
                }
                // 刷新页面以清除数据
                setTimeout(() => {
                    window.location.reload();
                }, 300);
            });
        }
        
        // 指南事件
        const nextBtn = document.getElementById('guideNextBtn');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => Guide.next());
        }
        
        const prevBtn = document.getElementById('guidePrevBtn');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => Guide.prev());
        }
        
        const skipBtn = document.getElementById('guideSkipBtn');
        if (skipBtn) {
            skipBtn.addEventListener('click', () => Guide.skip());
        }
        
        // ESC 键跳过指南
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                Guide.skip();
            }
        });
    }
};
