#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
const crypto = require('crypto');
const https = require('https');

class AICodeReview {
    constructor() {
        this.config = this.loadConfig();
        this.gitDiff = '';
        this.reviewResult = '';
    }

    loadConfig() {
        try {
            const configPath = path.join(__dirname, 'config.json');
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            
            // 优先使用环境变量中的敏感配置
            if (process.env.DEEPSEEK_API_KEY) {
                config.deepseek.apiKey = process.env.DEEPSEEK_API_KEY;
            }
            
            if (process.env.DINGTALK_WEBHOOK) {
                config.dingtalk.webhook = process.env.DINGTALK_WEBHOOK;
            }
            
            if (process.env.DINGTALK_SECRET) {
                config.dingtalk.secret = process.env.DINGTALK_SECRET;
            }
            
            // 验证必要的配置
            if (!config.deepseek.apiKey || config.deepseek.apiKey === 'YOUR_DEEPSEEK_API_KEY') {
                throw new Error('DeepSeek API Key未配置，请设置环境变量DEEPSEEK_API_KEY或在config.json中配置');
            }
            
            return config;
        } catch (error) {
            console.error('配置文件加载失败:', error.message);
            process.exit(1);
        }
    }

    // 获取Git变更内容
    getGitDiff(target = 'HEAD~1') {
        try {
            console.log('📊 正在获取代码变更...');

            // 获取变更的文件列表
            const changedFiles = execSync(`git diff --name-only ${target}`, { encoding: 'utf8' })
                .trim()
                .split('\n')
                .filter(file => file && this.shouldIncludeFile(file));

            if (changedFiles.length === 0) {
                console.log('没有发现需要审查的文件变更');
                return '';
            }

            console.log(`发现 ${changedFiles.length} 个文件变更:`, changedFiles);

            // 获取详细的diff内容
            const diffCommand = `git diff ${target} -- ${changedFiles.join(' ')}`;
            const diff = execSync(diffCommand, { encoding: 'utf8' });

            // 限制diff长度
            const lines = diff.split('\n');
            if (lines.length > this.config.codeReview.maxDiffLines) {
                console.log(`⚠️  Diff内容过长，截取前 ${this.config.codeReview.maxDiffLines} 行`);
                return lines.slice(0, this.config.codeReview.maxDiffLines).join('\n');
            }

            return diff;
        } catch (error) {
            console.error('获取Git变更失败:', error.message);
            return '';
        }
    }

    shouldIncludeFile(filename) {
        const { includeFiles, excludeFiles } = this.config.codeReview;

        // 检查是否在排除列表中
        for (const pattern of excludeFiles) {
            if (this.matchPattern(filename, pattern)) {
                return false;
            }
        }

        // 检查是否在包含列表中
        for (const pattern of includeFiles) {
            if (this.matchPattern(filename, pattern)) {
                return true;
            }
        }

        return false;
    }

    matchPattern(filename, pattern) {
        // 简单的通配符匹配
        const regex = new RegExp(
            pattern
                .replace(/\*\*/g, '.*')
                .replace(/\*/g, '[^/]*')
                .replace(/\./g, '\\.')
        );
        return regex.test(filename);
    }

    // 调用DeepSeek API进行代码分析
    async analyzeCodeWithDeepSeek(diff) {
        console.log('🤖 正在调用DeepSeek API进行代码分析...');

        const prompt = this.buildAnalysisPrompt(diff);

        const requestData = {
            model: this.config.deepseek.model,
            messages: [
                {
                    role: "system",
                    content: "你是一个专业的代码审查专家，请仔细分析提供的代码变更，从代码规范、潜在bug、性能优化、安全问题等方面给出专业的审查意见。请用中文回复，格式要清晰易读。"
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            // max_tokens: this.config.deepseek.maxTokens,
            // temperature: this.config.deepseek.temperature
        };

        try {
            const response = await this.makeHttpRequest({
                hostname: 'api.deepseek.com',
                port: 443,
                path: '/v1/chat/completions',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.deepseek.apiKey}`
                }
            }, JSON.stringify(requestData));

            const result = JSON.parse(response);

            if (result.choices && result.choices[0]) {
                return result.choices[0].message.content;
            } else {
                throw new Error('API响应格式异常');
            }
        } catch (error) {
            console.error('DeepSeek API调用失败:', error.message);
            return `❌ AI分析失败: ${error.message}`;
        }
    }

    buildAnalysisPrompt(diff) {
        const aspects = this.config.codeReview.reviewAspects.join('、');

        return `请对以下代码变更进行专业的代码审查分析:

【审查要求】
请重点关注以下方面: ${aspects}

【代码变更内容】
\`\`\`diff
${diff}
\`\`\`

【输出格式要求】
请按以下格式输出审查结果:

## 📋 代码审查总结
- 变更文件数: X个
- 主要变更类型: [新增功能/bug修复/重构/其他]

## 🔍 详细分析

### ✅ 优点
- [列出代码的优点]

### ⚠️ 需要注意的问题
- [列出发现的问题，按严重程度排序]

### 💡 优化建议  
- [给出具体的改进建议]

## 📊 评分
代码质量评分: X/10 分

请确保分析内容专业、准确、实用。`;
    }

    // HTTP请求封装
    makeHttpRequest(options, data) {
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(responseData);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
                    }
                });
            });

            req.on('error', reject);

            if (data) {
                req.write(data);
            }

            req.end();
        });
    }

    // 发送钉钉消息
    async sendDingTalkMessage(content, isBackend = false) {
        console.log('📱 正在发送钉钉消息...');

        const timestamp = Date.now();
        const secret = this.config.dingtalk.secret;
        const stringToSign = timestamp + '\n' + secret;
        const sign = crypto
            .createHmac('sha256', secret)
            .update(stringToSign)
            .digest('base64');

        const webhook = this.config.dingtalk.webhook;
        const url = new URL(webhook);
        url.searchParams.set('timestamp', timestamp);
        url.searchParams.set('sign', encodeURIComponent(sign));

        const groupName = isBackend ?
            this.config.project.backendGroup :
            this.config.project.frontendGroup;

        const message = {
            msgtype: 'markdown',
            markdown: {
                title: '🤖 AI代码审查报告',
                text: `# 🤖 AI代码审查报告\n\n**项目**: ${this.config.project.name}\n**群组**: ${groupName}\n**时间**: ${new Date().toLocaleString('zh-CN')}\n\n---\n\n${content}\n\n---\n\n*由AI自动生成，仅供参考*`
            }
        };

        try {
            const options = {
                hostname: url.hostname,
                port: 443,
                path: url.pathname + url.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            await this.makeHttpRequest(options, JSON.stringify(message));
            console.log('✅ 钉钉消息发送成功');
        } catch (error) {
            console.error('❌ 钉钉消息发送失败:', error.message);
        }
    }

    // 主要执行流程
    async run(target = 'HEAD~1') {
        console.log('🚀 开始AI代码审查流程...');

        try {
            // 1. 获取代码变更
            this.gitDiff = this.getGitDiff(target);

            if (!this.gitDiff) {
                console.log('没有发现代码变更，跳过审查');
                return;
            }

            // 2. AI分析
            this.reviewResult = await this.analyzeCodeWithDeepSeek(this.gitDiff);

            // 3. 输出结果到控制台
            console.log('\n' + '='.repeat(80));
            console.log('🤖 AI代码审查结果:');
            console.log('='.repeat(80));
            console.log(this.reviewResult);
            console.log('='.repeat(80));

            // 4. 发送钉钉消息
            if (this.config.dingtalk.webhook && this.config.dingtalk.webhook !== 'YOUR_DINGTALK_WEBHOOK_URL') {
                // 判断是否为后端代码（简单判断，可以根据需要调整）
                const isBackend = this.gitDiff.includes('.java') ||
                    this.gitDiff.includes('.py') ||
                    this.gitDiff.includes('.go') ||
                    this.gitDiff.includes('server/') ||
                    this.gitDiff.includes('backend/');

                await this.sendDingTalkMessage(this.reviewResult, isBackend);
            }

            console.log('✅ AI代码审查完成！');

        } catch (error) {
            console.error('❌ AI代码审查执行失败:', error.message);
            process.exit(1);
        }
    }
}

// 命令行参数处理
if (require.main === module) {
    const args = process.argv.slice(2);
    const target = args.length > 0 ? args[0] : 'HEAD~1';

    console.log(`目标对比: ${target}`);

    const reviewer = new AICodeReview();
    reviewer.run(target).catch(error => {
        console.error('程序执行异常:', error);
        process.exit(1);
    });
}

module.exports = AICodeReview; 