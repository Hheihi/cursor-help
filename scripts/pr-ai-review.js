const { execSync } = require('child_process');
const fs = require('fs');
// const crypto = require('crypto');
const axios = require('axios');
const OpenAI = require("openai");

console.log(process.env.DEEPSEEK_API_KEY);

const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY
});

async function main() {
    try {
        // 获取 PR 代码变更
        const diff = execSync('git diff origin/main...HEAD').toString();
        if (!diff) {
            console.log('没有代码变更，跳过审查');
            return;
        }

        // // 保存 diff 到文件（模拟发送给 AI）
        // fs.writeFileSync('pr-diff.txt', diff);

        // AI 审查
        const aiReview = await aiReview(diff);

        // 构造钉钉消息
        const prUrl = process.env.GITHUB_SERVER_URL + '/' + process.env.GITHUB_REPOSITORY + '/pull/' + process.env.GITHUB_REF.split('/')[2];
        const message = {
            msgtype: 'markdown',
            markdown: {
                title: `PR 审查结果: #${process.env.GITHUB_REF.split('/')[2]}`,
                text: `## PR 审查结果\n**PR**: [${prUrl}](${prUrl})\n**作者**: ${process.env.GITHUB_ACTOR}\n\n### AI 审查建议\n${aiReview}\n\n请审阅并提供反馈！`
            }
        };

        // 计算钉钉加签
        // const timestamp = Date.now();
        // const secret = process.env.DINGTALK_SECRET;
        // const stringToSign = timestamp + '\n' + secret;
        // const sign = crypto.createHmac('sha256', secret).update(stringToSign).digest('base64');

        // 发送钉钉消息
        const webhookUrl = `${process.env.DINGTALK_WEBHOOK}`;
        await axios.post(webhookUrl, message);

        console.log('钉钉消息发送成功');
    } catch (error) {
        console.error('处理失败：', error.message);
        process.exit(1);
    }
}

// AI 审查
async function aiReview(diff) {
    const completion = await openai.chat.completions.create({
        messages: [{ role: "system", content: diff }],
        model: "deepseek-chat",
    });
    console.log(completion.choices[0].message.content);
    return completion.choices[0].message.content;
}

main();