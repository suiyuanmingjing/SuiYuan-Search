/**
 * SuiYuan Search 扩展后台脚本 (Background Script)
 * 
 * 文件说明：
 * 这是Chrome扩展的核心后台脚本，作为Service Worker运行
 * Service Worker是Chrome扩展V3架构中的后台运行模式，具有以下特点：
 * - 按需启动：当有事件触发时启动，空闲时自动暂停
 * - 无持久状态：不能保存长期状态，需要使用chrome.storage API
 * - 事件驱动：主要处理各种Chrome扩展生命周期事件
 * 
 * 主要功能：
 * 1. 扩展生命周期管理（安装、更新、启动、挂起）
 * 2. 后台任务调度和处理
 * 3. 消息通信中枢
 * 4. 数据持久化管理
 * 5. 扩展配置初始化和迁移
 * 
 * 技术架构：
 * - 基于Chrome Extension Manifest V3规范
 * - 使用ES6+语法和异步编程模式
 * - 集成Chrome Storage API进行数据持久化
 * - 支持IndexedDB进行本地数据库操作
 * 
 * @author SuiYuan Search Team
 * @version 1.0.0
 * @since 2024
 */

/**
 * 监听扩展安装/更新事件
 * 
 * 这是扩展最重要的生命周期事件之一，在以下情况触发：
 * - 首次安装扩展 (install)
 * - 扩展版本更新 (update)
 * - Chrome浏览器更新 (chrome_update)
 * - 共享模块更新 (shared_module_update)
 * 
 * @param {Object} details - 安装详情对象，包含事件的具体信息
 * @param {string} details.reason - 事件类型，可能的值：
 *   'install': 首次安装扩展
 *   'update': 扩展版本更新
 *   'chrome_update': Chrome浏览器自身更新
 *   'shared_module_update': 依赖的共享模块更新
 * @param {string} [details.previousVersion] - 更新前的版本号，仅在update事件时存在
 * @param {string} [details.temporaryInstaller] - 临时安装器ID（用于调试）
 * 
 * 注意事项：
 * - 此事件在Service Worker上下文中运行
 * - 应该尽快完成处理，避免阻塞扩展启动
 * - 适合执行一次性初始化任务
 */
chrome.runtime.onInstalled.addListener(function(details) {
    // 根据安装原因执行不同的初始化操作
    if (details.reason === 'install') {
        // 首次安装扩展时的处理
        console.log('SuiYuan Search 扩展已安装');
        
        // 首次安装初始化操作清单：
        // 1. 设置默认配置：创建用户偏好设置的默认值
        // 2. 初始化存储结构：建立Chrome Storage和IndexedDB的数据结构
        // 3. 打开欢迎页面：引导用户了解扩展功能
        // 4. 请求必要权限：如需额外权限，可在此处动态申请
        // 5. 创建上下文菜单：添加右键菜单选项
        // 6. 设置默认搜索引擎：配置默认的搜索选项
        // 7. 初始化主题设置：应用默认的视觉主题
        
    } else if (details.reason === 'update') {
        // 扩展更新时的处理
        console.log('SuiYuan Search 扩展已更新');
        console.log('更新前版本:', details.previousVersion);
        
        // 版本更新迁移操作清单：
        // 1. 数据格式迁移：将旧版本数据转换为新格式
        // 2. 配置项更新：添加新的配置选项，移除废弃项
        // 3. 数据库结构升级：更新IndexedDB的schema
        // 4. 新功能介绍：显示更新日志或新功能提示
        // 5. 权限变更处理：处理权限申请或移除
        // 6. 缓存清理：清理不兼容的旧缓存数据
        // 7. 用户设置迁移：保持用户自定义设置的兼容性
    }
});

// ==================== 后台功能扩展区域 ====================
// 
// 此区域用于扩展后台脚本的功能，以下是一些常用的功能模块示例：
// 请根据实际需求取消注释并修改相应的代码块
//
// 重要提示：
// - Service Worker在空闲时会被暂停，不适合保存长期状态
// - 使用chrome.storage API进行数据持久化
// - 避免使用全局变量，改用存储API
// - 合理使用异步操作，避免阻塞主线程
// 
// 1. 快捷键处理 (Command Handling)：
//    监听在manifest.json中定义的快捷键命令
//    chrome.commands.onCommand.addListener(function(command) {
//        console.log('快捷键触发:', command);
//        switch(command) {
//            case 'toggle-theme':
//                // 处理主题切换快捷键
//                toggleTheme();
//                break;
//            case 'open-search':
//                // 打开快速搜索
//                openQuickSearch();
//                break;
//            case 'toggle-bookmarks':
//                // 切换书签显示
//                toggleBookmarks();
//                break;
//        }
//    });
//
// 2. 标签页管理 (Tab Management)：
//    监听浏览器标签页的生命周期事件
//    chrome.tabs.onCreated.addListener(function(tab) {
//        console.log('新标签页创建:', tab.id, tab.url);
//        // 可以在这里执行：
//        // - 自动注入content script
//        // - 记录标签页统计信息
//        // - 应用特定页面的设置
//        if (tab.url && tab.url.includes('chrome://newtab/')) {
//            // 处理新标签页
//            customizeNewTab(tab);
//        }
//    });
//
//    chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
//        // 监听标签页更新事件
//        if (changeInfo.status === 'complete') {
//            // 页面加载完成后的处理
//        }
//    });
//
// 3. 消息传递处理 (Message Passing)：
//    作为扩展内部通信的中枢，处理来自各个组件的消息
//    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
//        console.log('收到消息:', request.type, '来自:', sender.tab?.url || 'popup');
//        
//        // 根据消息类型分发处理
//        switch(request.type) {
//            case 'getSettings':
//                // 获取用户设置
//                chrome.storage.sync.get('settings', function(result) {
//                    sendResponse({settings: result.settings || {}});
//                });
//                return true; // 保持消息通道开放用于异步响应
//                
//            case 'saveSettings':
//                // 保存用户设置
//                chrome.storage.sync.set({settings: request.data}, function() {
//                    sendResponse({success: true});
//                });
//                return true;
//                
//            case 'search':
//                // 执行搜索操作
//                performSearch(request.query, request.engine)
//                    .then(results => sendResponse({results}))
//                    .catch(error => sendResponse({error: error.message}));
//                return true;
//        }
//    });
//
// 4. 定时任务 (Scheduled Tasks)：
//    使用定时器执行周期性任务，注意Service Worker的生命周期限制
//    let taskInterval = setInterval(function() {
//        console.log('执行定时任务...');
//        
//        // 定时任务示例：
//        // 1. 数据同步：与服务器同步用户数据
//        // 2. 缓存清理：清理过期的本地缓存
//        // 3. 统计上报：发送使用统计数据
//        // 4. 备份设置：定期备份用户配置
//        // 5. 检查更新：检查扩展或数据更新
//        
//        // 示例：清理过期缓存
//        cleanupExpiredCache()
//            .then(() => console.log('缓存清理完成'))
//            .catch(error => console.error('缓存清理失败:', error));
//            
//    }, 3600000); // 每小时执行一次 (3600000毫秒)
//
//    // 注意：在Service Worker中，需要考虑定时器可能被暂停的情况
//    // 建议使用chrome.alarms API替代setInterval以获得更可靠的定时执行
//
// 5. 存储监听 (Storage Monitoring)：
//    监听Chrome存储的变化，实现数据同步和响应式更新
//    chrome.storage.onChanged.addListener(function(changes, namespace) {
//        console.log('存储变化:', namespace, changes);
//        
//        // 遍历所有变化的键
//        for (let key in changes) {
//            let change = changes[key];
//            console.log(`键 "${key}" 从 "${change.oldValue}" 变为 "${change.newValue}"`);
//            
//            // 根据变化的键执行相应操作
//            switch(key) {
//                case 'theme':
//                    // 主题变化时通知所有标签页
//                    notifyAllTabs('themeChanged', change.newValue);
//                    break;
//                    
//                case 'settings':
//                    // 设置变化时更新后台逻辑
//                    updateBackgroundLogic(change.newValue);
//                    break;
//                    
//                case 'searchHistory':
//                    // 搜索历史变化时清理过期记录
//                    if (change.newValue.length > 100) {
//                        trimSearchHistory();
//                    }
//                    break;
//            }
//        }
//    });
//
// 6. 上下文菜单 (Context Menu)：
//    在浏览器右键菜单中添加自定义选项，增强用户体验
//    
//    // 创建主菜单项
//    chrome.contextMenus.create({
//        id: 'searchWithSuiYuan',
//        title: '使用SuiYuan搜索: %s', // %s会被选中文本替换
//        contexts: ['selection'], // 仅在选中文本时显示
//        documentUrlPatterns: ['<all_urls>'] // 在所有页面生效
//    });
//
//    // 创建子菜单项
//    chrome.contextMenus.create({
//        id: 'searchInBaidu',
//        parentId: 'searchWithSuiYuan',
//        title: '在百度中搜索',
//        contexts: ['selection']
//    });
//
//    chrome.contextMenus.create({
//        id: 'searchInGoogle',
//        parentId: 'searchWithSuiYuan',
//        title: '在Google中搜索',
//        contexts: ['selection']
//    });
//
//    // 监听菜单点击事件
//    chrome.contextMenus.onClicked.addListener(function(info, tab) {
//        console.log('菜单点击:', info.menuItemId, info.selectionText);
//        
//        if (info.menuItemId === 'searchWithSuiYuan' || 
//            info.menuItemId === 'searchInBaidu' || 
//            info.menuItemId === 'searchInGoogle') {
//            
//            const searchText = info.selectionText;
//            const engine = info.menuItemId === 'searchInBaidu' ? 'baidu' : 
//                         info.menuItemId === 'searchInGoogle' ? 'google' : 'default';
//            
//            // 执行搜索
//            performSearch(searchText, engine);
//        }
//    });
//
// ==================== Service Worker 重要注意事项 ====================
//
// Service Worker 生命周期特点：
// 1. 按需启动：当有事件触发时，Chrome会启动Service Worker
// 2. 空闲暂停：在约30秒无活动后自动暂停，释放资源
// 3. 无持久状态：暂停后所有内存中的变量都会丢失
// 4. 事件驱动：主要通过监听各种事件来执行功能
//
// 编程最佳实践：
// ✅ DO - 使用chrome.storage API持久化数据
// ✅ DO - 将状态保存到存储而非全局变量
// ✅ DO - 使用异步编程模式（Promise/async-await）
// ✅ DO - 快速处理事件，避免长时间阻塞
// ✅ DO - 合理使用chrome.alarms替代setInterval
//
// ❌ DON'T - 依赖全局变量保存状态
// ❌ DON'T - 使用setTimeout/setInterval进行长时间计时
// ❌ DON'T - 在事件处理中执行耗时操作
// ❌ DON'T - 假设Service Worker始终运行
//
// 调试技巧：
// - 使用chrome://extensions页面的"Service Worker"链接查看控制台
// - 在chrome://inspect/#service-workers中检查所有Service Worker
// - 使用console.log记录关键事件和状态变化
// - 利用chrome.runtime.getBackgroundPage()获取当前页面（仅在调试时）