/**
 * Chrome API Mock 兼容性适配层
 * 
 * 文件说明：
 * 这个文件为非Chrome扩展环境提供Chrome扩展API的模拟实现
 * 主要用于开发、测试和演示环境中，让扩展代码能够在普通浏览器中运行
 * 
 * 使用场景：
 * 1. 本地开发调试：在不加载扩展的情况下测试前端功能
 * 2. 单元测试：为测试框架提供Chrome API的模拟实现
 * 3. 演示部署：在非扩展环境中展示扩展功能
 * 4. 跨浏览器兼容：让代码在其他浏览器中也能运行
 * 
 * 技术实现：
 * - 使用localStorage模拟Chrome Storage API
 * - 使用事件系统模拟Chrome Runtime API
 * - 提供与真实API相同的接口和行为
 * - 支持Promise和回调两种调用方式
 * 
 * @author SuiYuan Search Team
 * @version 1.0.0
 * @since 2024
 */

// ==================== 全局检测和初始化 ====================

/**
 * 检测当前环境是否为Chrome扩展环境
 * @returns {boolean} true表示Chrome扩展环境，false表示需要使用Mock
 */
function isChromeExtensionEnvironment() {
  return typeof chrome !== 'undefined' && 
         chrome.runtime && 
         chrome.runtime.id;
}

/**
 * 如果不是Chrome扩展环境，则初始化Mock API
 */
if (!isChromeExtensionEnvironment()) {
  console.log('🔧 检测到非Chrome扩展环境，正在初始化Chrome API Mock...');
  initializeChromeMock();
} else {
  console.log('✅ 检测到Chrome扩展环境，跳过Mock初始化');
}

// ==================== Chrome Mock 主初始化函数 ====================

/**
 * 初始化Chrome API Mock
 * 创建全局chrome对象及其子API
 */
function initializeChromeMock() {
  // 创建全局chrome对象
  window.chrome = window.chrome || {};
  
  // 初始化各个子API模块
  initializeStorageMock();
  initializeRuntimeMock();
  initializeTabsMock();
  initializeCommandsMock();
  initializeContextMenusMock();
  initializeAlarmsMock();
  initializeNotificationsMock();
  
  console.log('🎉 Chrome API Mock 初始化完成');
}

// ==================== Storage API Mock ====================

/**
 * 初始化Chrome Storage API的Mock实现
 * 支持sync和local两种存储类型，使用localStorage作为底层存储
 */
function initializeStorageMock() {
  chrome.storage = chrome.storage || {};
  
  // 存储前缀，避免与localStorage中的其他数据冲突
  const STORAGE_PREFIX = 'chrome_mock_storage_';
  
  /**
   * 获取存储键名
   * @param {string} storageType - 存储类型 ('sync' | 'local')
   * @param {string} key - 数据键名
   * @returns {string} 完整的localStorage键名
   */
  function getStorageKey(storageType, key) {
    return `${STORAGE_PREFIX}${storageType}_${key}`;
  }
  
  /**
   * 通用存储操作函数
   * @param {string} storageType - 存储类型
   * @param {Function} operation - 操作函数
   * @returns {Promise} 操作结果Promise
   */
  function storageOperation(storageType, operation) {
    return new Promise((resolve, reject) => {
      try {
        const result = operation();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Chrome Storage Sync API Mock
   * 模拟Chrome的同步存储API，实际使用localStorage
   */
  chrome.storage.sync = {
    /**
     * 获取存储的数据
     * @param {string|Array|Object} keys - 要获取的键名
     * @param {Function} [callback] - 可选的回调函数
     * @returns {Promise} 包含获取数据的Promise
     */
    get: function(keys, callback) {
      return storageOperation('sync', () => {
        let result = {};
        
        // 处理不同的键名参数类型
        if (typeof keys === 'string') {
          // 单个键名
          const value = localStorage.getItem(getStorageKey('sync', keys));
          if (value !== null) {
            result[keys] = JSON.parse(value);
          }
        } else if (Array.isArray(keys)) {
          // 键名数组
          keys.forEach(key => {
            const value = localStorage.getItem(getStorageKey('sync', key));
            if (value !== null) {
              result[key] = JSON.parse(value);
            }
          });
        } else if (typeof keys === 'object' && keys !== null) {
          // 键名对象（包含默认值）
          Object.keys(keys).forEach(key => {
            const value = localStorage.getItem(getStorageKey('sync', key));
            if (value !== null) {
              result[key] = JSON.parse(value);
            } else {
              result[key] = keys[key]; // 使用默认值
            }
          });
        } else {
          // 获取所有数据
          for (let i = 0; i < localStorage.length; i++) {
            const fullKey = localStorage.key(i);
            if (fullKey && fullKey.startsWith(STORAGE_PREFIX + 'sync_')) {
              const key = fullKey.replace(STORAGE_PREFIX + 'sync_', '');
              const value = localStorage.getItem(fullKey);
              result[key] = JSON.parse(value);
            }
          }
        }
        
        // 触发回调（如果提供）
        if (typeof callback === 'function') {
          callback(result);
        }
        
        return result;
      });
    },
    
    /**
     * 保存数据到存储
     * @param {Object} items - 要保存的数据对象
     * @param {Function} [callback] - 可选的回调函数
     * @returns {Promise} 保存操作Promise
     */
    set: function(items, callback) {
      return storageOperation('sync', () => {
        const changes = {};
        const oldValues = {};
        
        // 记录旧值用于变化事件
        Object.keys(items).forEach(key => {
          const oldValue = localStorage.getItem(getStorageKey('sync', key));
          if (oldValue !== null) {
            oldValues[key] = { oldValue: JSON.parse(oldValue) };
          }
          
          // 保存新值
          localStorage.setItem(getStorageKey('sync', key), JSON.stringify(items[key]));
          changes[key] = {
            oldValue: oldValue ? JSON.parse(oldValue) : undefined,
            newValue: items[key]
          };
        });
        
        // 触发存储变化事件
        if (chrome.storage.onChanged && chrome.storage.onChanged.hasListeners()) {
          chrome.storage.onChanged.dispatch(changes, 'sync');
        }
        
        // 触发回调（如果提供）
        if (typeof callback === 'function') {
          callback();
        }
      });
    },
    
    /**
     * 删除存储的数据
     * @param {string|Array} keys - 要删除的键名
     * @param {Function} [callback] - 可选的回调函数
     * @returns {Promise} 删除操作Promise
     */
    remove: function(keys, callback) {
      return storageOperation('sync', () => {
        const changes = {};
        const keysArray = Array.isArray(keys) ? keys : [keys];
        
        keysArray.forEach(key => {
          const oldValue = localStorage.getItem(getStorageKey('sync', key));
          if (oldValue !== null) {
            changes[key] = {
              oldValue: JSON.parse(oldValue),
              newValue: undefined
            };
            localStorage.removeItem(getStorageKey('sync', key));
          }
        });
        
        // 触发存储变化事件
        if (chrome.storage.onChanged && chrome.storage.onChanged.hasListeners()) {
          chrome.storage.onChanged.dispatch(changes, 'sync');
        }
        
        // 触发回调（如果提供）
        if (typeof callback === 'function') {
          callback();
        }
      });
    },
    
    /**
     * 清空所有存储数据
     * @param {Function} [callback] - 可选的回调函数
     * @returns {Promise} 清空操作Promise
     */
    clear: function(callback) {
      return storageOperation('sync', () => {
        const changes = {};
        const keysToRemove = [];
        
        // 收集所有sync存储的键
        for (let i = 0; i < localStorage.length; i++) {
          const fullKey = localStorage.key(i);
          if (fullKey && fullKey.startsWith(STORAGE_PREFIX + 'sync_')) {
            const key = fullKey.replace(STORAGE_PREFIX + 'sync_', '');
            const value = localStorage.getItem(fullKey);
            changes[key] = {
              oldValue: JSON.parse(value),
              newValue: undefined
            };
            keysToRemove.push(fullKey);
          }
        }
        
        // 删除所有键
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // 触发存储变化事件
        if (chrome.storage.onChanged && chrome.storage.onChanged.hasListeners()) {
          chrome.storage.onChanged.dispatch(changes, 'sync');
        }
        
        // 触发回调（如果提供）
        if (typeof callback === 'function') {
          callback();
        }
      });
    },
    
    /**
     * 获取存储使用情况
     * @param {Function} [callback] - 可选的回调函数
     * @returns {Promise} 存储使用信息Promise
     */
    getBytesInUse: function(keys, callback) {
      return storageOperation('sync', () => {
        let totalBytes = 0;
        
        if (keys === null || keys === undefined) {
          // 计算所有sync存储的字节数
          for (let i = 0; i < localStorage.length; i++) {
            const fullKey = localStorage.key(i);
            if (fullKey && fullKey.startsWith(STORAGE_PREFIX + 'sync_')) {
              totalBytes += fullKey.length + localStorage.getItem(fullKey).length;
            }
          }
        } else {
          // 计算指定键的字节数
          const keysArray = Array.isArray(keys) ? keys : [keys];
          keysArray.forEach(key => {
            const fullKey = getStorageKey('sync', key);
            const value = localStorage.getItem(fullKey);
            if (value !== null) {
              totalBytes += fullKey.length + value.length;
            }
          });
        }
        
        // 触发回调（如果提供）
        if (typeof callback === 'function') {
          callback(totalBytes);
        }
        
        return totalBytes;
      });
    }
  };
  
  /**
   * Chrome Storage Local API Mock
   * 与sync API相同，但使用不同的存储前缀
   */
  chrome.storage.local = {
    get: chrome.storage.sync.get,
    set: chrome.storage.sync.set,
    remove: chrome.storage.sync.remove,
    clear: chrome.storage.sync.clear,
    getBytesInUse: chrome.storage.sync.getBytesInUse
  };
  
  /**
   * 存储变化事件系统
   */
  chrome.storage.onChanged = createEventSystem();
}

// ==================== Runtime API Mock ====================

/**
 * 初始化Chrome Runtime API的Mock实现
 * 提供扩展运行时相关的API模拟
 */
function initializeRuntimeMock() {
  chrome.runtime = chrome.runtime || {};
  
  // 模拟扩展ID
  chrome.runtime.id = 'mock_extension_id_' + Math.random().toString(36).substr(2, 9);
  
  /**
   * 获取扩展清单信息
   * @returns {Object} 模拟的manifest.json内容
   */
  chrome.runtime.getManifest = function() {
    return {
      manifest_version: 3,
      name: "SuiYuan Search",
      version: "1.0",
      description: "随缘起始页 - 一个简洁、可自定义的多搜索引擎起始页扩展",
      permissions: ["activeTab", "storage"],
      host_permissions: ["file://*/*"],
      web_accessible_resources: [{
        resources: ["img/*"],
        matches: ["<all_urls>"]
      }],
      action: {
        default_popup: "popup.html",
        default_title: "SuiYuan Search - 设置"
      },
      icons: {
        "16": "img/ico.ico",
        "48": "img/ico.ico",
        "128": "img/ico.ico"
      },
      background: {
        service_worker: "background.js"
      },
      chrome_url_overrides: {
        newtab: "index.html"
      }
    };
  };
  
  /**
   * 获取扩展URL
   * @param {string} path - 相对路径
   * @returns {string} 完整的URL
   */
  chrome.runtime.getURL = function(path) {
    // 在Mock环境中，返回相对于当前页面的URL
    const basePath = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');
    return basePath + path;
  };
  
  /**
   * 发送消息
   * @param {string|Object} message - 消息内容
   * @param {Function} [callback] - 回调函数
   * @returns {Promise} 消息发送Promise
   */
  chrome.runtime.sendMessage = function(message, callback) {
    return new Promise((resolve, reject) => {
      try {
        // 模拟消息处理
        console.log('Mock Runtime: 发送消息', message);
        
        // 模拟异步响应
        setTimeout(() => {
          const response = {
            success: true,
            data: null,
            message: "Mock response"
          };
          
          if (typeof callback === 'function') {
            callback(response);
          }
          resolve(response);
        }, 10);
      } catch (error) {
        if (typeof callback === 'function') {
          callback({ success: false, error: error.message });
        }
        reject(error);
      }
    });
  };
  
  /**
   * 连接到扩展
   * @param {Object} connectInfo - 连接信息
   * @returns {Object} 模拟的Port对象
   */
  chrome.runtime.connect = function(connectInfo) {
    console.log('Mock Runtime: 建立连接', connectInfo);
    
    return {
      name: connectInfo && connectInfo.name || 'mock_port',
      postMessage: function(message) {
        console.log('Mock Port: 发送消息', message);
      },
      disconnect: function() {
        console.log('Mock Port: 断开连接');
      },
      onMessage: createEventSystem(),
      onDisconnect: createEventSystem()
    };
  };
  
  /**
   * 获取背景页面（仅用于调试）
   * @param {Function} callback - 回调函数
   */
  chrome.runtime.getBackgroundPage = function(callback) {
    // 在Mock环境中，返回当前window对象
    if (typeof callback === 'function') {
      callback(window);
    }
  };
  
  /**
   * 重新加载扩展
   */
  chrome.runtime.reload = function() {
    console.log('Mock Runtime: 重新加载扩展');
    window.location.reload();
  };
  
  // 事件系统
  chrome.runtime.onMessage = createEventSystem();
  chrome.runtime.onInstalled = createEventSystem();
  chrome.runtime.onStartup = createEventSystem();
  chrome.runtime.onSuspend = createEventSystem();
  chrome.runtime.onConnect = createEventSystem();
  chrome.runtime.onConnectExternal = createEventSystem();
  chrome.runtime.onRestartRequired = createEventSystem();
  chrome.runtime.onUpdateAvailable = createEventSystem();
  chrome.runtime.onBrowserUpdateAvailable = createEventSystem();
}

// ==================== Tabs API Mock ====================

/**
 * 初始化Chrome Tabs API的Mock实现
 * 提供标签页管理相关的API模拟
 */
function initializeTabsMock() {
  chrome.tabs = chrome.tabs || {};
  
  /**
   * 获取当前活动标签页
   * @param {Object} queryInfo - 查询条件
   * @param {Function} callback - 回调函数
   * @returns {Promise} 标签页信息Promise
   */
  chrome.tabs.query = function(queryInfo, callback) {
    return new Promise((resolve) => {
      // 模拟当前标签页信息
      const mockTab = {
        id: 1,
        index: 0,
        windowId: 1,
        highlighted: true,
        active: true,
        pinned: false,
        url: window.location.href,
        title: document.title,
        favIconUrl: null,
        status: 'complete',
        incognito: false,
        selected: true,
        audible: false,
        mutedInfo: { muted: false },
        width: window.innerWidth,
        height: window.innerHeight
      };
      
      const tabs = queryInfo && queryInfo.active ? [mockTab] : [mockTab];
      
      if (typeof callback === 'function') {
        callback(tabs);
      }
      resolve(tabs);
    });
  };
  
  /**
   * 创建新标签页
   * @param {Object} createProperties - 创建属性
   * @param {Function} callback - 回调函数
   * @returns {Promise} 新标签页信息Promise
   */
  chrome.tabs.create = function(createProperties, callback) {
    return new Promise((resolve) => {
      console.log('Mock Tabs: 创建标签页', createProperties);
      
      const newTab = {
        id: Math.floor(Math.random() * 10000),
        index: 0,
        windowId: 1,
        highlighted: true,
        active: true,
        pinned: false,
        url: createProperties.url || 'about:blank',
        title: 'New Tab',
        favIconUrl: null,
        status: 'loading',
        incognito: false,
        selected: true
      };
      
      if (typeof callback === 'function') {
        callback(newTab);
      }
      resolve(newTab);
    });
  };
  
  /**
   * 更新标签页
   * @param {number} tabId - 标签页ID
   * @param {Object} updateProperties - 更新属性
   * @param {Function} callback - 回调函数
   * @returns {Promise} 更新后的标签页信息Promise
   */
  chrome.tabs.update = function(tabId, updateProperties, callback) {
    return new Promise((resolve) => {
      console.log('Mock Tabs: 更新标签页', tabId, updateProperties);
      
      const updatedTab = {
        id: tabId,
        url: updateProperties.url || window.location.href,
        title: document.title,
        active: true
      };
      
      if (typeof callback === 'function') {
        callback(updatedTab);
      }
      resolve(updatedTab);
    });
  };
  
  // 事件系统
  chrome.tabs.onCreated = createEventSystem();
  chrome.tabs.onUpdated = createEventSystem();
  chrome.tabs.onActivated = createEventSystem();
  chrome.tabs.onRemoved = createEventSystem();
  chrome.tabs.onReplaced = createEventSystem();
  chrome.tabs.onMoved = createEventSystem();
  chrome.tabs.onDetached = createEventSystem();
  chrome.tabs.onAttached = createEventSystem();
}

// ==================== Commands API Mock ====================

/**
 * 初始化Chrome Commands API的Mock实现
 * 提供快捷键命令相关的API模拟
 */
function initializeCommandsMock() {
  chrome.commands = chrome.commands || {};
  
  /**
   * 获取所有可用命令
   * @param {Function} callback - 回调函数
   * @returns {Promise} 命令列表Promise
   */
  chrome.commands.getAll = function(callback) {
    return new Promise((resolve) => {
      const commands = [
        {
          name: "toggle-theme",
          description: "切换主题",
          shortcut: "Ctrl+Shift+T"
        },
        {
          name: "open-search",
          description: "打开搜索",
          shortcut: "Ctrl+Shift+S"
        }
      ];
      
      if (typeof callback === 'function') {
        callback(commands);
      }
      resolve(commands);
    });
  };
  
  // 事件系统
  chrome.commands.onCommand = createEventSystem();
}

// ==================== Context Menus API Mock ====================

/**
 * 初始化Chrome Context Menus API的Mock实现
 * 提供右键菜单相关的API模拟
 */
function initializeContextMenusMock() {
  chrome.contextMenus = chrome.contextMenus || {};
  
  let menuIdCounter = 1;
  const menuItems = {};
  
  /**
   * 创建上下文菜单项
   * @param {Object} createProperties - 创建属性
   * @param {Function} callback - 回调函数
   */
  chrome.contextMenus.create = function(createProperties, callback) {
    const id = createProperties.id || 'menu_' + menuIdCounter++;
    menuItems[id] = createProperties;
    
    console.log('Mock Context Menus: 创建菜单项', id, createProperties);
    
    if (typeof callback === 'function') {
      callback(id);
    }
    
    return id;
  };
  
  /**
   * 更新上下文菜单项
   * @param {string|number} id - 菜单项ID
   * @param {Object} updateProperties - 更新属性
   * @param {Function} callback - 回调函数
   */
  chrome.contextMenus.update = function(id, updateProperties, callback) {
    if (menuItems[id]) {
      Object.assign(menuItems[id], updateProperties);
      console.log('Mock Context Menus: 更新菜单项', id, updateProperties);
    }
    
    if (typeof callback === 'function') {
      callback();
    }
  };
  
  /**
   * 删除上下文菜单项
   * @param {string|number} id - 菜单项ID
   * @param {Function} callback - 回调函数
   */
  chrome.contextMenus.remove = function(id, callback) {
    delete menuItems[id];
    console.log('Mock Context Menus: 删除菜单项', id);
    
    if (typeof callback === 'function') {
      callback();
    }
  };
  
  /**
   * 删除所有上下文菜单项
   * @param {Function} callback - 回调函数
   */
  chrome.contextMenus.removeAll = function(callback) {
    Object.keys(menuItems).forEach(id => delete menuItems[id]);
    console.log('Mock Context Menus: 删除所有菜单项');
    
    if (typeof callback === 'function') {
      callback();
    }
  };
  
  // 事件系统
  chrome.contextMenus.onClicked = createEventSystem();
}

// ==================== Alarms API Mock ====================

/**
 * 初始化Chrome Alarms API的Mock实现
 * 提供定时器相关的API模拟
 */
function initializeAlarmsMock() {
  chrome.alarms = chrome.alarms || {};
  
  const alarms = {};
  let alarmIdCounter = 1;
  
  /**
   * 创建定时器
   * @param {string|Object} nameOrAlarmInfo - 定时器名称或配置对象
   * @param {Object} [alarmInfo] - 定时器配置（当第一个参数为名称时）
   */
  chrome.alarms.create = function(nameOrAlarmInfo, alarmInfo) {
    let name, config;
    
    if (typeof nameOrAlarmInfo === 'string') {
      name = nameOrAlarmInfo;
      config = alarmInfo || {};
    } else {
      name = 'alarm_' + alarmIdCounter++;
      config = nameOrAlarmInfo;
    }
    
    const alarm = {
      name: name,
      scheduledTime: Date.now() + (config.delayInMinutes || 0) * 60000,
      periodInMinutes: config.periodInMinutes
    };
    
    alarms[name] = alarm;
    
    // 模拟定时器触发
    if (config.delayInMinutes) {
      setTimeout(() => {
        if (chrome.alarms.onAlarm.hasListeners()) {
          chrome.alarms.onAlarm.dispatch(alarm);
        }
        
        // 如果是周期性定时器，继续调度
        if (config.periodInMinutes) {
          const interval = config.periodInMinutes * 60000;
          setInterval(() => {
            if (chrome.alarms.onAlarm.hasListeners()) {
              chrome.alarms.onAlarm.dispatch({
                ...alarm,
                scheduledTime: Date.now()
              });
            }
          }, interval);
        }
      }, config.delayInMinutes * 60000);
    }
    
    console.log('Mock Alarms: 创建定时器', name, config);
  };
  
  /**
   * 获取定时器
   * @param {string} [name] - 定时器名称，不提供则获取所有
   * @param {Function} callback - 回调函数
   */
  chrome.alarms.get = function(name, callback) {
    if (typeof name === 'function') {
      callback = name;
      name = null;
    }
    
    const result = name ? alarms[name] : Object.values(alarms);
    
    if (typeof callback === 'function') {
      callback(result);
    }
  };
  
  /**
   * 清除定时器
   * @param {string} [name] - 定时器名称，不提供则清除所有
   * @param {Function} callback - 回调函数
   */
  chrome.alarms.clear = function(name, callback) {
    if (typeof name === 'function') {
      callback = name;
      name = null;
    }
    
    let cleared = false;
    
    if (name) {
      if (alarms[name]) {
        delete alarms[name];
        cleared = true;
      }
    } else {
      Object.keys(alarms).forEach(key => delete alarms[key]);
      cleared = true;
    }
    
    if (typeof callback === 'function') {
      callback(cleared);
    }
    
    return cleared;
  };
  
  // 事件系统
  chrome.alarms.onAlarm = createEventSystem();
}

// ==================== Notifications API Mock ====================

/**
 * 初始化Chrome Notifications API的Mock实现
 * 提供系统通知相关的API模拟
 */
function initializeNotificationsMock() {
  chrome.notifications = chrome.notifications || {};
  
  let notificationIdCounter = 1;
  
  /**
   * 创建通知
   * @param {string} notificationId - 通知ID
   * @param {Object} options - 通知选项
   * @param {Function} callback - 回调函数
   */
  chrome.notifications.create = function(notificationId, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = notificationId;
      notificationId = 'notification_' + notificationIdCounter++;
    }
    
    console.log('Mock Notifications: 创建通知', notificationId, options);
    
    // 在浏览器环境中使用Web Notifications API
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(options.title || '通知', {
        body: options.message || '',
        icon: options.iconUrl || '',
        tag: notificationId
      });
      
      notification.onclick = function() {
        if (chrome.notifications.onClicked.hasListeners()) {
          chrome.notifications.onClicked.dispatch(notificationId);
        }
      };
      
      notification.onclose = function() {
        if (chrome.notifications.onClosed.hasListeners()) {
          chrome.notifications.onClosed.dispatch(notificationId, true);
        }
      };
    }
    
    if (typeof callback === 'function') {
      callback(notificationId);
    }
    
    return notificationId;
  };
  
  /**
   * 更新通知
   * @param {string} notificationId - 通知ID
   * @param {Object} options - 更新选项
   * @param {Function} callback - 回调函数
   */
  chrome.notifications.update = function(notificationId, options, callback) {
    console.log('Mock Notifications: 更新通知', notificationId, options);
    
    if (typeof callback === 'function') {
      callback(true);
    }
    
    return true;
  };
  
  /**
   * 清除通知
   * @param {string} notificationId - 通知ID
   * @param {Function} callback - 回调函数
   */
  chrome.notifications.clear = function(notificationId, callback) {
    console.log('Mock Notifications: 清除通知', notificationId);
    
    if (typeof callback === 'function') {
      callback(true);
    }
    
    return true;
  };
  
  /**
   * 请求通知权限
   * @param {Function} callback - 回调函数
   */
  chrome.notifications.getPermissionLevel = function(callback) {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        callback('granted');
      } else if (Notification.permission === 'denied') {
        callback('denied');
      } else {
        Notification.requestPermission().then(permission => {
          callback(permission);
        });
      }
    } else {
      callback('denied');
    }
  };
  
  // 事件系统
  chrome.notifications.onClicked = createEventSystem();
  chrome.notifications.onClosed = createEventSystem();
  chrome.notifications.onButtonClicked = createEventSystem();
  chrome.notifications.onPermissionLevelChanged = createEventSystem();
  chrome.notifications.onShowSettings = createEventSystem();
}

// ==================== 事件系统工具函数 ====================

/**
 * 创建事件系统
 * 提供类似Chrome扩展事件API的功能
 * @returns {Object} 事件系统对象
 */
function createEventSystem() {
  const listeners = [];
  
  return {
    /**
     * 添加事件监听器
     * @param {Function} listener - 监听器函数
     */
    addListener: function(listener) {
      if (typeof listener === 'function') {
        listeners.push(listener);
      }
    },
    
    /**
     * 移除事件监听器
     * @param {Function} listener - 监听器函数
     */
    removeListener: function(listener) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    },
    
    /**
     * 检查是否有监听器
     * @returns {boolean} 是否有监听器
     */
    hasListeners: function() {
      return listeners.length > 0;
    },
    
    /**
     * 触发事件
     * @param {...any} args - 传递给监听器的参数
     */
    dispatch: function(...args) {
      listeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error('事件监听器执行错误:', error);
        }
      });
    },
    
    /**
     * 获取监听器数量
     * @returns {number} 监听器数量
     */
    getListenerCount: function() {
      return listeners.length;
    }
  };
}

// ==================== 调试和工具函数 ====================

/**
 * 获取Mock API的状态信息
 * @returns {Object} 状态信息
 */
window.getChromeMockStatus = function() {
  return {
    isMock: !isChromeExtensionEnvironment(),
    availableAPIs: [
      'chrome.storage',
      'chrome.runtime', 
      'chrome.tabs',
      'chrome.commands',
      'chrome.contextMenus',
      'chrome.alarms',
      'chrome.notifications'
    ],
    extensionId: chrome.runtime ? chrome.runtime.id : null,
    timestamp: new Date().toISOString()
  };
};

/**
 * 重置Mock API的存储数据
 */
window.resetChromeMockStorage = function() {
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('chrome_mock_storage_')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
  console.log('Chrome Mock存储已重置，清理了', keysToRemove.length, '个键');
};

/**
 * 导出Mock配置（用于调试）
 */
window.exportChromeMockConfig = function() {
  const config = {
    storage: {
      sync: {},
      local: {}
    },
    timestamp: new Date().toISOString()
  };
  
  // 导出存储数据
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('chrome_mock_storage_')) {
      const parts = key.replace('chrome_mock_storage_', '').split('_');
      const type = parts[0];
      const dataKey = parts.slice(1).join('_');
      const value = localStorage.getItem(key);
      
      if (config.storage[type]) {
        config.storage[type][dataKey] = JSON.parse(value);
      }
    }
  }
  
  console.log('Chrome Mock配置已导出:', config);
  return config;
};

// 在控制台输出Mock初始化信息
console.log('📋 Chrome API Mock 已就绪');
console.log('💡 调试命令:');
console.log('   - getChromeMockStatus() - 获取Mock状态');
console.log('   - resetChromeMockStorage() - 重置存储');
console.log('   - exportChromeMockConfig() - 导出配置');