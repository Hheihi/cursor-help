const { execSync } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');
const OpenAI = require("openai");

const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: 'sk-052e176af3ed40258dc024701bad4a12'
});
async function main() {
    try {

        // 获取 PR 代码变更
        const diff = execSync('git diff origin/main').toString();
        // fs.readFileSync(diff)
        if (!diff) {
            console.log('没有代码变更，跳过审查');
            return;
        }

        // // 保存 diff 到文件（模拟发送给 AI）
        // fs.writeFileSync('pr-diff.txt', diff);

        // AI 审查
        const completion = await openai.chat.completions.create({
            messages: [{ role: "system", content: `帮我review一下我这次变更的代码，提一些建议：` + diff }],
            model: "deepseek-chat",
        });

        console.log(completion.choices[0].message.content);

        // 构造钉钉消息
        // const prUrl = process.env.GITHUB_SERVER_URL + '/' + process.env.GITHUB_REPOSITORY + '/pull/' + process.env.GITHUB_REF.split('/')[2];
        const message = {
            msgtype: 'text',
            text: {
                content: completion.choices[0].message.content
            }
        };

        // 计算钉钉加签
        // 计算钉钉加签
        const timestamp = Date.now();
        const secret = 'SEC9650d7ef5f31bef2b112ae2299d96c7feebb806472face24591f9e1d293bac67';
        const stringToSign = timestamp + '\n' + secret;
        const sign = crypto.createHmac('sha256', secret).update(stringToSign).digest('base64');

        // 发送钉钉消息
        const webhookUrl = `https://oapi.dingtalk.com/robot/send?access_token=37de867592b289ac6266aa39d6a399876715388215e095bf6cea60f7c89069ef&timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`;
        await axios.post(webhookUrl, message);

        console.log('钉钉消息发送成功');
    } catch (error) {
        console.error('处理失败：', error.message);
        process.exit(1);
    }
}

// AI 审查
async function aiReview(diff) {

    console.log(completion.choices[0].message.content);
    return completion.choices[0].message.content;
}

main();