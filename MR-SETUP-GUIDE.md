# 🚀 MR自动触发AI代码审查配置指南

本指南将帮你配置在创建Merge Request (MR) 或 Pull Request (PR) 时自动触发AI代码审查。

## 🎯 支持的平台

- ✅ GitLab (使用 GitLab CI/CD)
- ✅ GitHub (使用 GitHub Actions)
- ✅ 其他Git平台 (使用Webhook)

---

## 📋 GitLab 配置步骤

### 1. 配置CI/CD变量

在GitLab项目中设置以下环境变量：

1. 进入项目 → **Settings** → **CI/CD** → **Variables**
2. 添加以下变量（设置为 **Protected** 和 **Masked**）：

```
DEEPSEEK_API_KEY = sk-052e176af3ed40258dc024701bad4a12
DINGTALK_WEBHOOK = https://oapi.dingtalk.com/robot/send?access_token=...
DINGTALK_SECRET = SEC9650d7ef5f31bef2b112ae2299d96c7f...
```

### 2. 启用CI/CD

确保项目已启用CI/CD：
- 项目根目录已存在 `.gitlab-ci.yml` 文件 ✅
- 项目 → **Settings** → **General** → **Visibility, project features, permissions** → 启用 **Pipelines**

### 3. 测试配置

创建一个MR测试：

```bash
git checkout -b feature/test-ai-review
git add .
git commit -m "test: 测试AI代码审查"
git push origin feature/test-ai-review
```

然后在GitLab中创建MR，查看Pipeline是否正常运行。

---

## 📋 GitHub 配置步骤

### 1. 配置Secrets

在GitHub仓库中设置以下Secrets：

1. 进入仓库 → **Settings** → **Secrets and variables** → **Actions**
2. 点击 **New repository secret** 添加：

```
DEEPSEEK_API_KEY = sk-052e176af3ed40258dc024701bad4a12
DINGTALK_WEBHOOK = https://oapi.dingtalk.com/robot/send?access_token=...
DINGTALK_SECRET = SEC9650d7ef5f31bef2b112ae2299d96c7f...
```

### 2. 启用Actions

确保GitHub Actions已启用：
- 仓库 → **Actions** → 如果被禁用，点击 **Enable Actions**
- 工作流文件 `.github/workflows/ai-code-review.yml` 已存在 ✅

### 3. 测试配置

创建一个PR测试：

```bash
git checkout -b feature/test-ai-review
git add .
git commit -m "test: 测试AI代码审查"
git push origin feature/test-ai-review
```

然后在GitHub中创建PR，查看Actions是否正常运行。

---

## 🔧 高级配置

### 自定义触发条件

#### GitLab (.gitlab-ci.yml)

```yaml
ai-code-review:
  # 只在特定分支的MR中触发
  only:
    - merge_requests
  except:
    refs:
      - /^hotfix\/.*$/  # 排除hotfix分支
      
  # 只在文件变更时触发
  only:
    changes:
      - "src/**/*"
      - "lib/**/*"
      - "*.js"
      - "*.ts"
```

#### GitHub (.github/workflows/ai-code-review.yml)

```yaml
on:
  pull_request:
    branches: [ main, develop ]
    # 只在特定文件变更时触发
    paths:
      - 'src/**'
      - 'lib/**'
      - '*.js'
      - '*.ts'
    # 排除draft PR
    types: [ opened, synchronize, reopened, ready_for_review ]
```

### 配置审查规则

在 `config.json` 中自定义审查规则：

```json
{
  "codeReview": {
    "includeFiles": ["*.js", "*.ts", "*.py", "*.java"],
    "excludeFiles": ["node_modules/**", "dist/**", "*.test.js"],
    "maxDiffLines": 500,
    "reviewAspects": [
      "代码规范性",
      "潜在bug",
      "性能优化", 
      "安全问题",
      "可维护性"
    ]
  }
}
```

---

## 🎮 使用方式

### 自动触发

1. **创建分支并开发**
   ```bash
   git checkout -b feature/new-feature
   # 进行开发...
   git add .
   git commit -m "feat: 添加新功能"
   git push origin feature/new-feature
   ```

2. **创建MR/PR**
   - GitLab: 在界面创建Merge Request
   - GitHub: 在界面创建Pull Request

3. **查看结果**
   - CI/CD Pipeline会自动运行
   - AI审查结果会发送到钉钉群组
   - 在MR/PR页面查看Pipeline状态

### 手动触发

如果需要手动重新审查：

```bash
# 本地执行
./review-code.sh origin/main

# 或者使用npm脚本
npm run ai-review
```

---

## 🛠️ 故障排除

### 常见问题

1. **Pipeline失败: "DeepSeek API Key未配置"**
   - 检查环境变量是否正确设置
   - 确认变量名拼写正确

2. **API调用失败: "Invalid max_tokens"**
   - 检查 `config.json` 中 `maxTokens` 值
   - DeepSeek API限制：max_tokens ≤ 8192

3. **钉钉消息发送失败**
   - 检查Webhook URL是否正确
   - 确认机器人安全设置（加签Secret）

4. **没有检测到代码变更**
   - 检查 `includeFiles` 和 `excludeFiles` 配置
   - 确认要审查的文件类型已包含

### 调试方法

1. **查看Pipeline日志**
   - GitLab: 项目 → CI/CD → Pipelines → 点击具体任务
   - GitHub: 仓库 → Actions → 点击具体工作流

2. **本地调试**
   ```bash
   # 设置环境变量
   export DEEPSEEK_API_KEY="your-api-key"
   export DINGTALK_WEBHOOK="your-webhook"
   export DINGTALK_SECRET="your-secret"
   
   # 运行脚本
   node ai-code-review.js origin/main
   ```

3. **测试配置**
   ```bash
   # 检查Git差异
   git diff origin/main --name-only
   
   # 检查配置文件
   node -e "console.log(JSON.stringify(require('./config.json'), null, 2))"
   ```

---

## 📊 监控和优化

### 性能监控

- 监控Pipeline运行时间
- 关注API调用频率和成本
- 定期检查审查质量

### 配置优化

- 根据项目特点调整 `includeFiles`
- 优化 `maxDiffLines` 提高响应速度
- 自定义 `reviewAspects` 关注重点

### 团队协作

- 在MR模板中提醒关注AI审查结果
- 定期回顾和改进审查规则
- 培训团队成员理解和使用AI审查建议

---

## 🎉 完成！

现在你的项目已经配置了自动AI代码审查！

每次创建MR/PR时，系统会：
1. 🤖 自动分析代码变更
2. 📱 发送详细审查报告到钉钉
3. ✅ 在CI/CD中显示审查状态

**祝你代码审查愉快！** 🚀 