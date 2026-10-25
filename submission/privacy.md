# 隐私政策 / Privacy Policy

随缘搜索（SuiYuan Search）不收集、不存储、不上传任何个人数据。

- 设置、收藏夹、搜索历史保存在浏览器本地：扩展使用 `chrome.storage.sync`，网页使用 `localStorage`。
- 上传的图片、视频保存在本机 IndexedDB，不会离开设备。
- 仅在需要时发起网络请求：
  - 必应壁纸接口（cn.bing.com / www.bing.com）
  - 搜索建议（api.bing.com、suggestion.baidu.com、suggestqueries.google.com）
  - 网页版必应壁纸的备用图片源（api.bimg.cc）
- 不包含统计、追踪、广告或远程代码。
- 浏览器收藏夹权限仅用于「导入浏览器收藏夹」，只读取，不修改、不删除浏览器收藏夹。

如有问题，请在项目仓库提交 issue：
https://github.com/suiyuanmingjing/SuiYuan-Search

---

SuiYuan Search does not collect, store or upload any personal data.

- Settings, bookmarks and search history stay local (chrome.storage.sync in the extension, localStorage on the web).
- Uploaded images and videos are stored in local IndexedDB and never leave the device.
- Network requests are limited to Bing wallpaper endpoints, search suggestion endpoints and an optional Bing image fallback.
- No analytics, tracking, ads or remote code.
- The bookmarks permission is used only to import browser bookmarks; it never modifies or deletes them.
