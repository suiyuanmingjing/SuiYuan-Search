# 隐私政策 / Privacy Policy

随缘搜索（SuiYuan Search）不收集、不存储、不上传任何个人数据。

- 设置、收藏夹、搜索历史保存在浏览器本地：扩展使用 `chrome.storage.sync`，网页使用 `localStorage`。
- 上传的图片、视频保存在本机 IndexedDB，不会离开设备。
- 仅在需要时发起网络请求：
  - 必应壁纸接口（cn.bing.com / www.bing.com）
  - 搜索建议（api.bing.com、suggestion.baidu.com、suggestqueries.google.com）
  - 网页版必应壁纸的备用图片源（api.bimg.cc）
- 图标：优先请求网站自身的 `/favicon.ico`；失败时可能把该收藏网站的域名或 URL 发送给公开图标服务（api.xinac.net、cc.me、icons.duckduckgo.com、www.google.com、logo.clearbit.com、besticon-demo.herokuapp.com、favicon.run）以获取图标图片。这些请求只包含图标查询，不包含账号、搜索词或浏览历史。
- 不包含统计、追踪、广告或远程代码。
- 浏览器收藏夹权限仅用于「导入浏览器收藏夹」，只读取，不修改、不删除浏览器收藏夹。

如有问题，请在项目仓库提交 issue：
https://github.com/suiyuanmingjing/SuiYuan-Search

---

SuiYuan Search does not collect, store or upload any personal data.

- Settings, bookmarks and search history stay local (chrome.storage.sync in the extension, localStorage on the web).
- Uploaded images and videos are stored in local IndexedDB and never leave the device.
- Network requests are limited to Bing wallpaper endpoints, search suggestion endpoints and an optional Bing image fallback.
- Icons: the extension first requests the site's own `/favicon.ico`; if that fails, the bookmarked domain or URL may be sent to public icon services (api.xinac.net, cc.me, icons.duckduckgo.com, www.google.com, logo.clearbit.com, besticon-demo.herokuapp.com, favicon.run) to fetch an icon image. These requests contain only the icon lookup, never accounts, search terms or browsing history.
- No analytics, tracking, ads or remote code.
- The bookmarks permission is used only to import browser bookmarks; it never modifies or deletes them.
