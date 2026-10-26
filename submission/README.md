# 提交到 Microsoft Edge 加载项商店

## 文件
- `store-icon-300.png`：商店图标 300×300
- `screenshots/01-home.png`、`02-settings.png`、`03-focal.png`：1280×800
- `promo-440x280.png`：小型展示图 440×280
- `promo-1400x560.png`：大型展示图 1400×560
- `listing-zh.md` / `listing-en.md`：商店文案
- `privacy.md`：隐私政策
- 安装包：`dist/SuiYuan-Search-2.1.0-edge.zip`

## 上传步骤
1. 打开 https://partner.microsoft.com/dashboard/microsoftedge
2. 创建新加载项，上传 `dist/SuiYuan-Search-2.1.0-edge.zip`
3. 填写 listing-zh/en 中的名称、描述、分类
4. 上传 `store-icon-300.png` 和 `screenshots/` 下的截图
5. 隐私政策填上面的 GitHub 链接
6. 权限说明：
   - `storage`：保存设置、收藏与搜索历史
   - `bookmarks`：仅用于「导入浏览器收藏夹」，只读
   - 主机权限：必应壁纸/联想、百度联想、Google 联想、必应图片备用源
7. 提交审核

## 注意
- 包内默认视频 `video/default.mp4` 约 50MB，总包体约 55MB，低于 100MB 限制
- 包内不含 `.git`、`legacy/`、`docs/`、`submission/`
- manifest 版本号 2.1.0

## 多语言
manifest 已使用 `__MSG_extensionName__` / `__MSG_extensionDescription__`，并包含 `_locales/en|zh_CN|zh_TW|fr|ru|es|ar/messages.json`。
重新上传安装包后，Partner Center 的 Store Listings 会列出这 7 种语言；截图和促销图可以用「复制所有语言」批量带过去。
