Web-Branch-Blinds (v1.5)
========================
Web-Branch-Blinds 是一款专为 AI 聊天界面（如 ChatGPT）设计的长对话管理工具。它通过“百叶窗”式的交互逻辑，帮助开发者和深度用户在长达数百条的消息流中，精确标记、折叠和定位不同的讨论分支。

核心功能
1. 支线标记系统 (S/E/R UI)
S (Start): 标记一个讨论分支的起点。点击后进入 Pending 状态。

E (End): 标记分支终点。自动闭合区间并持久化存储。

R (Remove): 快速清理已标记的节点或撤回正在进行的标记。

智能互斥: 自动禁用非法的标记操作（例如：无法在已标记的节点内再次启动 S，或在未选择 S 时点击 E）。

2. “百叶窗”视觉逻辑
自动折叠: 标记为中间（Mid）或结尾（End）的消息块会自动压缩至 48px，并降低透明度。

Hover 联动: 鼠标悬停在折叠节点上时，节点会像百叶窗一样顺滑展开，展示完整内容。

Start 节点清理: 标记为 Start 的节点仅保留控制条，原始内容完全隐藏，作为分支的视觉分割线。

3. 代码块智能虚化 (Code Blur)
无感折叠: 自动识别长代码块，在非活跃状态下实施 mask-image 渐变虚化和半透明处理。

零干扰: 移除了多余的局部按钮，代码块随父节点（消息块）的 Hover 状态同步展开/收起。

4. 手机端导航球 (Nav Panel)
快速锚点: 在页面右侧生成数字索引球，点击即可一键滚动到对应的 Start Node 位置。

全局控制: 提供全局代码块隐藏/显示开关。

技术架构
核心模块
detection.js (Core): 负责算法逻辑。根据 branchPairs 数组计算每一条消息的 Role（start, mid, end）。

content_module.js (Manager):

MutationObserver: 实时监听对话流的变化。

UI Injector: 负责向 DOM 注入 S/E/R 组件，并实施“双重过滤”防止组件误入代码块内部。

State Manager: 维护 pendingStartId 等实时交互状态。

content_style.css (View): 纯 CSS 驱动的百叶窗动画、虚化遮罩及响应式布局。

适配层 (Adapter Pattern)
虽然目前主要针对 ChatGPT 优化，但架构上已支持多模型扩展：

currentAdapter: 通过检测 window.location.host 自动切换选择器。

抽象接口: 统一了 findMessages 和 getMessageId 的调用方式。

安装与运行
1. 确保浏览器安装了脚本管理插件（如 Tampermonkey 或 Stay）。

2. 将脚本加载至 chatgpt.com 或 claude.ai（当前仅测试 Web 端）。

3. 持久化: 所有分支标记均存储在浏览器的 localStorage 中，刷新页面不会丢失。

下一步规划 (Roadmap)
------------------
[ ] 多模型深度匹配: 完成对 Claude 3.5/Sonnet 复杂 DOM 结构的 100% 适配。







Web-Branch-Blinds (v1.5)
========================
Web-Branch-Blinds is a productivity-focused browser extension/userscript designed for AI chat interfaces (specifically ChatGPT). It introduces a "Blind-style" interactive logic to help developers and power users manage long, complex conversations by precisely marking, collapsing, and navigating different discussion branches.

Core Features
1. Branch Tagging System (S/E/R UI)
S (Start): Mark the beginning of a discussion branch. Clicking this puts the session into a Pending state.

E (End): Mark the end of a branch. This closes the interval and persists the pair to storage.

R (Remove): Quickly clear existing tags or cancel a pending start.

Smart Mutex Logic: Automatically disables invalid operations (e.g., you cannot start a new branch inside an existing one, or click 'End' before a 'Start' is selected).

2. "Blind-Style" Visual Logic
Automatic Collapse: Messages marked as Mid or End are compressed to a height of 48px with reduced opacity.

Hover-to-Expand: Hovering over a collapsed node triggers a smooth "Blind" expansion, revealing the full content instantly.

Start Node Separation: Nodes marked as Start hide their original content entirely, acting as clean visual dividers between different topics.

3. Intelligent Code Block Blurring
Seamless Folding: Automatically detects long code blocks and applies a mask-image gradient blur and transparency in non-active states.

Zero Distraction: Removed redundant local buttons. Code blocks expand/collapse in sync with the parent message's hover state.

4. Navigation Panel (Mobile-Friendly)
Quick Anchors: Generates a numerical index panel on the right side of the screen. Clicking a number scrolls the page directly to the corresponding Start Node.

Global Toggle: Includes a global switch to toggle code block visibility across the entire conversation.


Technical Architecture
----------------------
Core Modules

  detection.js (Core Engine): Handles the algorithmic heavy lifting. It calculates the Role (start, mid, end) for every message based on the branchPairs array.

  content_module.js (Manager):

  MutationObserver: Monitors DOM changes in real-time to handle new messages.

  UI Injector: Injects the S/E/R components with "Double-Filtering" logic to prevent controls from being injected inside code blocks.

  State Manager: Maintains the real-time pendingStartId state for interactive tagging.

  content_style.css (View): Pure CSS-driven animations for the "Blind" effect, blur masks, and responsive layouts.


Adapter Pattern
---------------
The architecture is designed to be model-agnostic:

currentAdapter: Automatically switches selectors based on window.location.host.

Abstract Interface: Standardizes methods like findMessages() and getMessageId() so adding support for Claude or Gemini is straightforward.


Installation & Usage
--------------------
1. Environment: Ensure you have a script manager like Tampermonkey, Violentmonkey, or Stay installed.

2. Deployment: Load the script on chatgpt.com.

3. Persistence: All branch tags are saved in the browser's localStorage, ensuring your organized view remains intact even after a page refresh.

Roadmap
-------
[ ] Multi-Model Support: Complete 100% selector mapping for Claude 3.5 Sonnet and Gemini.
