## 2.1.0

### 新增
- 默认壁纸替换为三张新图，并新增默认视频背景
- 壁纸库：支持多图 / 多视频上传、缩放中心取点，必应每日下载后自动加入壁纸库
- Dock 最多显示 10 个网站，溢出时按整图标收纳；「…」展开 5～7 列、5 行的玻璃收藏面板
- 收藏夹：支持移至顶部、清空、导入浏览器收藏夹（只读，不修改浏览器数据）
- 界面语言：简体中文、繁體中文、English、Français、Русский、Español、العربية（阿拉伯语 RTL）
- 时钟：字重选择、冒号同步闪烁、12 小时制中午 12 / 午夜 0
- 删除操作改为应用内确认弹窗；默认视频不可删除；视频禁用画中画

### 优化
- 搜索联想多源聚合，谁先返回谁先显示，并加入查询缓存
- 设置页固定 72vh 高度，宽度不再随滚动条抖动
- 视频加载期间显示灰色底，不再先铺默认壁纸
- Dock 与收藏面板样式统一，面板按窗口宽度显示 5～7 列
- 新增应用图标（扩展图标 / 工具栏 / favicon）

### 修复
- 缩放中心第二次保存失效
- 关闭搜索历史后刷新又自动开启
- 清空搜索框后仍残留上一次联想
- 视频切换图片后图片不显示
- 4K 开关一直加载
- 暗化遮罩滑块无效
- 必应每日没有预览、下载后未加入壁纸库
- 横竖屏切换时界面元素位置变化

### 截图

![首页](https://raw.githubusercontent.com/suiyuanmingjing/SuiYuan-Search/main/submission/screenshots/01-home.png)

![壁纸库](https://raw.githubusercontent.com/suiyuanmingjing/SuiYuan-Search/main/submission/screenshots/02-settings.png)

![缩放中心](https://raw.githubusercontent.com/suiyuanmingjing/SuiYuan-Search/main/submission/screenshots/03-focal.png)

### 安装

- 网页：下载源码解压，双击 `index.html`
- Edge / Chrome：`edge://extensions` → 开发人员模式 → 加载解压缩的扩展
- Edge 加载项商店：审核通过后可直接搜索「随缘搜索」

完整变更：https://github.com/suiyuanmingjing/SuiYuan-Search/compare/v2.0.0...main
