// Please install OpenAI SDK first: `npm install openai`

const OpenAI = require("openai");

const openai = new OpenAI({
        baseURL: 'https://api.deepseek.com',
        apiKey: 'sk-052e176af3ed40258dc024701bad4a12'
});

async function main() {
  const completion = await openai.chat.completions.create({
    messages: [{ role: "system", content: "You are a helpful assistant." }],
    model: "deepseek-chat",
  });

  console.log(completion.choices[0].message.content);
}

main();