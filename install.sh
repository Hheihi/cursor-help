#!/bin/bash

# AI Code Review 工具安装脚本

echo "🚀 开始安装 AI Code Review 工具..."

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

# 检查是否在Git仓库中
if [ ! -d ".git" ]; then
    echo "❌ 当前目录不是Git仓库"
    exit 1
fi

# 安装依赖
echo "📦 安装依赖包..."
npm install --save-dev axios crypto

# 创建.ai-code-review目录
mkdir -p .ai-code-review

# 复制文件到工具目录
echo "📁 复制工具文件..."
cp ai-code-review.js .ai-code-review/
cp config.json .ai-code-review/

# 创建Git hooks
echo "🔧 配置Git hooks..."

# Pre-push hook
cat > .git/hooks/pre-push << 'EOF'
#!/bin/bash

# AI Code Review Pre-push Hook
echo "🤖 正在执行AI代码审查..."

# 获取要推送的commit范围
if [ "$4" != "0000000000000000000000000000000000000000" ]; then
    # 比较本地分支与远程分支
    LOCAL_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    REMOTE_BRANCH="origin/$LOCAL_BRANCH"
    
    # 检查远程分支是否存在
    if git rev-parse --verify "$REMOTE_BRANCH" >/dev/null 2>&1; then
        TARGET="$REMOTE_BRANCH"
    else
        TARGET="HEAD~1"
    fi
else
    TARGET="HEAD~1"
fi

# 执行AI代码审查
node .ai-code-review/ai-code-review.js "$TARGET"

echo "✅ AI代码审查完成"
EOF

chmod +x .git/hooks/pre-push

# 创建手动执行脚本
cat > review-code.sh << 'EOF'
#!/bin/bash

# 手动执行AI代码审查
echo "🤖 手动执行AI代码审查..."

TARGET=${1:-HEAD~1}
echo "目标对比: $TARGET"

node .ai-code-review/ai-code-review.js "$TARGET"
EOF

chmod +x review-code.sh

# 更新.gitignore
echo "📝 更新.gitignore..."
if [ -f ".gitignore" ]; then
    if ! grep -q ".ai-code-review/config.json" .gitignore; then
        echo ".ai-code-review/config.json" >> .gitignore
    fi
else
    echo ".ai-code-review/config.json" > .gitignore
fi

echo ""
echo "✅ 安装完成！"
echo ""
echo "📋 下一步配置说明:"
echo "1. 编辑 .ai-code-review/config.json 文件"
echo "2. 配置你的 DeepSeek API Key"
echo "3. 配置钉钉机器人Webhook和Secret"
echo "4. 根据项目调整文件包含/排除规则"
echo ""
echo "🎯 使用方法:"
echo "- 自动触发: git push 时自动执行"
echo "- 手动执行: ./review-code.sh [commit范围]"
echo "- 示例: ./review-code.sh HEAD~3  # 审查最近3次提交"
echo ""
echo "🔧 配置文件位置: .ai-code-review/config.json"
echo "" 