/**
 * IndexedDB 本地存储管理模块
 * 
 * 文件说明：
 * 这个模块实现了基于IndexedDB的客户端存储系统，用于管理用户上传的媒体文件
 * 提供了完整的文件CRUD操作、存储空间管理和数据持久化功能
 * 
 * 技术特点：
 * 1. 使用IndexedDB作为底层存储，支持大文件存储和高性能查询
 * 2. 实现了存储空间监控和自动清理机制
 * 3. 支持多种文件类型（图片、视频）的统一管理
 * 4. 提供了事务性操作，确保数据一致性
 * 5. 包含错误处理和用户友好的提示信息
 * 
 * 使用场景：
 * - 用户自定义背景图片存储（亮色/暗色主题）
 * - 背景视频文件存储
 * - 媒体文件缓存管理
 * - 跨会话数据持久化
 * 
 * @author SuiYuan Search Team
 * @version 1.0.0
 * @since 2024
 */

// ==================== 常量定义 ====================

/**
 * 数据库名称
 * 使用项目名称作为数据库名，避免与其他应用冲突
 */
const DB_NAME = 'SuiYuanMedia';

/**
 * 数据库版本
 * 用于数据库结构升级和迁移
 */
const DB_VERSION = 1;

/**
 * 存储对象名称
 * 用于存储媒体文件元数据和二进制内容
 */
const STORE_FILES = 'files';

// ==================== 数据库核心操作 ====================

/**
 * 打开IndexedDB数据库连接
 * 
 * 功能说明：
 * 1. 创建或打开数据库连接
 * 2. 在版本升级时自动创建对象存储和索引
 * 3. 提供Promise化的API接口
 * 
 * @returns {Promise<IDBDatabase>} 数据库实例Promise
 * 
 * @example
 * // 基本用法
 * openDB().then(database => {
 *   console.log('数据库连接成功');
 * }).catch(error => {
 *   console.error('数据库连接失败:', error);
 * });
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    
    /**
     * 数据库版本升级事件处理器
     * 在数据库版本变化时自动调用，用于创建或修改数据库结构
     * 
     * @param {IDBVersionChangeEvent} e - 版本升级事件
     */
    req.onupgradeneeded = function(e) {
      const db = e.target.result;
      
      console.log(`🔄 数据库版本升级: ${DB_NAME} v${DB_VERSION}`);
      
      // 检查并创建文件存储对象
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        console.log(`📝 创建对象存储: ${STORE_FILES}`);
        
        // 创建对象存储，使用文件名作为主键
        const store = db.createObjectStore(STORE_FILES, { keyPath: 'name' });
        
        // 创建索引以提高查询性能
        console.log('🔍 创建数据库索引...');
        
        // 文件类型索引 - 支持按类型筛选
        store.createIndex('type', 'type', { unique: false });
        
        // 创建时间索引 - 支持按时间排序和清理
        store.createIndex('createdAt', 'createdAt', { unique: false });
        
        console.log('✅ 数据库结构创建完成');
      } else {
        console.log(`📋 对象存储 ${STORE_FILES} 已存在`);
      }
    };
    
    /**
     * 数据库打开成功事件处理器
     * @param {Event} e - 成功事件
     */
    req.onsuccess = function(e) { 
      const db = e.target.result;
      console.log('✅ IndexedDB数据库连接成功');
      resolve(db); 
    };
    
    /**
     * 数据库打开失败事件处理器
     * @param {Event} e - 错误事件
     */
    req.onerror = function(e) { 
      const error = e.target.error || new Error('openDB failed');
      console.error('❌ IndexedDB数据库连接失败:', error);
      reject(error); 
    };
  });
}

/**
 * 保存文件到IndexedDB
 * 
 * 功能说明：
 * 1. 检查存储配额，防止空间不足
 * 2. 将文件数据存储到IndexedDB中
 * 3. 记录文件元数据（类型、大小、时间戳等）
 * 4. 提供友好的错误提示和用户反馈
 * 
 * @param {string} name - 文件名称（作为主键）
 * @param {Blob} blob - 文件数据（Blob对象）
 * @param {string} [type] - 文件MIME类型（可选，从blob中获取）
 * @param {number} [size] - 文件大小（可选，从blob中获取）
 * @returns {Promise<boolean>} 保存是否成功
 * 
 * @example
 * // 保存用户上传的图片
 * const file = input.files[0];
 * putFile('my_image', file).then(success => {
 *   if (success) {
 *     console.log('文件保存成功');
 *   }
 * });
 */
async function putFile(name, blob, type, size) {
  try {
    console.log(`💾 开始保存文件: ${name} (${formatFileSize(size || blob.size || 0)})`);
    
    // 检查存储配额
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      
      // 如果当前使用量超过配额的80%，给出警告
      if (quota > 0 && (usage + (size || blob.size || 0)) > quota * 0.8) {
        const usageMB = (usage / 1024 / 1024).toFixed(2);
        const quotaMB = (quota / 1024 / 1024).toFixed(2);
        
        console.warn(`⚠️ 存储空间即将不足: ${usageMB}MB / ${quotaMB}MB`);
        
        // 触发清理旧数据的建议
        if (window.showStatus) {
          window.showStatus('存储空间即将不足，建议清理旧媒体文件', 'warning');
        }
      }
    }
    
    // 打开数据库连接
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
      // 创建读写事务
      const tx = db.transaction(STORE_FILES, 'readwrite');
      const store = tx.objectStore(STORE_FILES);
      
      // 创建文件记录
      const record = {
        name: name,                                    // 文件名（主键）
        blob: blob,                                    // 文件数据
        type: type || blob.type || '',                 // MIME类型
        size: size || blob.size || 0,                  // 文件大小
        createdAt: Date.now(),                         // 创建时间
        lastUpdated: Date.now()                        // 最后更新时间
      };
      
      // 执行保存操作
      const req = store.put(record);
      
      /**
       * 保存成功事件处理器
       */
      req.onsuccess = function() { 
        console.log(`✅ 文件保存成功: ${name}`);
        resolve(true); 
      };
      
      /**
       * 保存失败事件处理器
       * @param {Event} e - 错误事件
       */
      req.onerror = function(e) { 
        const error = e.target.error || new Error('putFile failed');
        
        // 如果是存储空间不足的错误，提供更友好的错误信息
        if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
          console.error('❌ IndexedDB存储空间不足:', error);
          if (window.showStatus) {
            window.showStatus('存储空间不足，请清理后重试', 'error');
          }
          reject(new Error('存储空间不足，请清理后重试'));
        } else {
          console.error('❌ 保存文件到IndexedDB失败:', error);
          reject(error);
        }
      };
    });
  } catch (error) {
    console.error('❌ putFile过程中发生异常:', error);
    throw error;
  }
}

/**
 * 从IndexedDB获取文件
 * 
 * 功能说明：
 * 1. 根据文件名检索文件记录
 * 2. 返回文件的Blob对象
 * 3. 提供错误处理和日志记录
 * 
 * @param {string} name - 文件名称
 * @returns {Promise<Blob|null>} 文件Blob对象或null
 * 
 * @example
 * // 获取保存的图片
 * getFile('my_image').then(blob => {
 *   if (blob) {
 *     const url = URL.createObjectURL(blob);
 *     document.getElementById('preview').src = url;
 *   }
 * });
 */
async function getFile(name) {
  console.log(`📂 正在获取文件: ${name}`);
  
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    // 创建只读事务
    const tx = db.transaction(STORE_FILES, 'readonly');
    const store = tx.objectStore(STORE_FILES);
    const req = store.get(name);
    
    /**
     * 获取成功事件处理器
     * @param {Event} e - 成功事件
     */
    req.onsuccess = function(e) {
      const rec = e.target.result;
      if (rec) {
        console.log(`✅ 文件获取成功: ${name}`);
        resolve(rec.blob);
      } else {
        console.log(`⚠️ 文件不存在: ${name}`);
        resolve(null);
      }
    };
    
    /**
     * 获取失败事件处理器
     * @param {Event} e - 错误事件
     */
    req.onerror = function(e) { 
      const error = e.target.error || new Error('getFile failed');
      console.error('❌ 获取文件失败:', error);
      reject(error); 
    };
  });
}

// ==================== 工具函数 ====================

/**
 * 将Data URL转换为Blob对象
 * 
 * 功能说明：
 * 1. 解析Data URL的MIME类型和base64数据
 * 2. 将base64字符串转换为二进制数据
 * 3. 创建对应类型的Blob对象
 * 
 * @param {string} dataUrl - Data URL字符串
 * @returns {Blob} 转换后的Blob对象
 * 
 * @example
 * // 转换canvas生成的图片
 * const canvas = document.getElementById('canvas');
 * const dataUrl = canvas.toDataURL('image/png');
 * const blob = dataUrlToBlob(dataUrl);
 */
function dataUrlToBlob(dataUrl) {
  // 分割MIME类型和base64数据
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)[1];
  const bstr = atob(parts[1]);
  
  // 转换为Uint8Array
  let n = bstr.length;
  const u8 = new Uint8Array(n);
  while (n--) {
    u8[n] = bstr.charCodeAt(n);
  }
  
  // 创建Blob对象
  return new Blob([u8], { type: mime });
}

/**
 * 格式化文件大小显示
 * @param {number} bytes - 字节数
 * @returns {string} 格式化的大小
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ==================== 高级API接口 ====================

/**
 * 本地媒体存储管理对象
 * 提供统一的媒体文件存储管理接口
 */
window.localMediaStorage = {
  
  /**
   * 保存媒体文件
   * @param {string} name - 文件名
   * @param {Blob} blob - 文件数据
   * @param {string} type - 文件类型
   * @returns {Promise<boolean>} 保存是否成功
   */
  async put(name, blob, type) {
    return putFile(name, blob, type, blob.size);
  },
  
  /**
   * 获取媒体文件
   * @param {string} name - 文件名
   * @returns {Promise<Blob|null>} 文件数据
   */
  async get(name) {
    return getFile(name);
  },
  
  /**
   * 获取文件的URL
   * @param {string} name - 文件名
   * @returns {Promise<string|null>} 文件URL或null
   */
  async getUrl(name) {
    const blob = await getFile(name);
    return blob ? URL.createObjectURL(blob) : null;
  },
  
  /**
   * 删除媒体文件
   * @param {string} name - 文件名
   * @returns {Promise<boolean>} 删除是否成功
   */
  async delete(name) {
    console.log(`🗑️ 正在删除文件: ${name}`);
    
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FILES, 'readwrite');
      const store = tx.objectStore(STORE_FILES);
      const req = store.delete(name);
      
      req.onsuccess = function() { 
        console.log(`✅ 文件删除成功: ${name}`);
        resolve(true); 
      };
      req.onerror = function(e) { 
        const error = e.target.error || new Error('delete failed');
        console.error('❌ 删除文件失败:', error);
        reject(error); 
      };
    });
  },
  
  /**
   * 保存主题背景图片
   * 支持亮色和暗色两种主题的背景图片存储
   * 
   * @param {string} theme - 主题类型 ('dark' | 'light')
   * @param {string|Blob} imageData - 图片数据（Data URL或Blob）
   * @returns {Promise<boolean>} 保存是否成功
   * 
   * @example
   * // 保存暗色主题背景
   * localMediaStorage.saveImage('dark', imageData).then(success => {
   *   if (success) console.log('暗色主题背景保存成功');
   * });
   */
  async saveImage(theme, imageData) {
    try {
      const blob = typeof imageData === 'string' ? dataUrlToBlob(imageData) : imageData;
      const name = theme === 'dark' ? 'image_dark' : 'image_light';
      
      console.log(`🖼️ 保存${theme === 'dark' ? '暗色' : '亮色'}主题背景图片`);
      
      await putFile(name, blob, blob.type, blob.size);
      return true;
    } catch (e) { 
      console.error('❌ 保存图片到IndexedDB失败:', e);
      return false; 
    }
  },
  
  /**
   * 获取主题背景图片
   * 
   * @param {string} theme - 主题类型 ('dark' | 'light')
   * @returns {Promise<{dataUrl: string, lastUpdated: number}|null>} 图片数据或null
   * 
   * @example
   * // 获取暗色主题背景
   * localMediaStorage.getImage('dark').then(result => {
   *   if (result) {
   *     document.body.style.backgroundImage = `url(${result.dataUrl})`;
   *   }
   * });
   */
  async getImage(theme) {
    try {
      const name = theme === 'dark' ? 'image_dark' : 'image_light';
      console.log(`🖼️ 获取${theme === 'dark' ? '暗色' : '亮色'}主题背景图片`);
      
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_FILES, 'readonly');
        const store = tx.objectStore(STORE_FILES);
        const req = store.get(name);
        
        req.onsuccess = function(e) {
          const rec = e.target.result;
          if (rec) {
            const url = URL.createObjectURL(rec.blob);
            console.log(`✅ ${theme === 'dark' ? '暗色' : '亮色'}主题背景获取成功`);
            resolve({ 
              dataUrl: url, 
              lastUpdated: rec.lastUpdated || rec.createdAt 
            });
          } else {
            console.log(`⚠️ ${theme === 'dark' ? '暗色' : '亮色'}主题背景不存在`);
            resolve(null);
          }
        };
        req.onerror = function(e) { 
          const error = e.target.error || new Error('getImage failed');
          console.error('❌ 获取图片失败:', error);
          reject(error); 
        };
      });
    } catch (e) { 
      console.error('❌ 获取图片过程中发生异常:', e);
      return null; 
    }
  },
  
  /**
   * 保存背景视频
   * @param {string|Blob} videoData - 视频数据（Data URL或Blob）
   * @returns {Promise<boolean>} 保存是否成功
   */
  async saveVideo(videoData) {
    try {
      const blob = typeof videoData === 'string' ? dataUrlToBlob(videoData) : videoData;
      
      console.log(`🎥 保存背景视频 (${formatFileSize(blob.size)})`);
      
      await putFile('video_main', blob, blob.type, blob.size);
      return true;
    } catch (e) { 
      console.error('❌ 保存视频失败:', e);
      return false; 
    }
  },
  
  /**
   * 获取背景视频
   * @returns {Promise<{dataUrl: string, lastUpdated: number}|null>} 视频数据或null
   */
  async getVideo() {
    try {
      console.log('🎥 获取背景视频');
      
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_FILES, 'readonly');
        const store = tx.objectStore(STORE_FILES);
        const req = store.get('video_main');
        
        req.onsuccess = function(e) {
          const rec = e.target.result;
          if (rec) {
            const url = URL.createObjectURL(rec.blob);
            console.log('✅ 背景视频获取成功');
            resolve({ 
              dataUrl: url, 
              lastUpdated: rec.lastUpdated || rec.createdAt 
            });
          } else {
            console.log('⚠️ 背景视频不存在');
            resolve(null);
          }
        };
        req.onerror = function(e) { 
          const error = e.target.error || new Error('getVideo failed');
          console.error('❌ 获取视频失败:', error);
          reject(error); 
        };
      });
    } catch (e) { 
      console.error('❌ 获取视频过程中发生异常:', e);
      return null; 
    }
  },
  
  /**
   * 清空所有媒体文件
   * @returns {Promise<boolean>} 清空是否成功
   */
  async clearAll() {
    try {
      console.log('🧹 清空所有媒体文件');
      
      const db = await openDB();
      const tx = db.transaction(STORE_FILES, 'readwrite');
      tx.objectStore(STORE_FILES).clear();
      
      console.log('✅ 所有媒体文件已清空');
      return true;
    } catch (e) { 
      console.error('❌ 清空媒体文件失败:', e);
      return false; 
    }
  },
  
  /**
   * 获取存储空间信息
   * 
   * 功能说明：
   * 1. 统计所有文件的大小和数量
   * 2. 获取浏览器存储配额信息
   * 3. 计算存储空间使用率
   * 4. 返回详细的文件列表信息
   * 
   * @returns {Promise<Object|null>} 存储信息对象或null
   * 
   * @example
   * localMediaStorage.getStorageInfo().then(info => {
   *   if (info) {
   *     console.log(`存储使用率: ${info.usagePercent}%`);
   *     console.log(`文件数量: ${info.count}`);
   *     console.log(`总大小: ${formatFileSize(info.totalSize)}`);
   *   }
   * });
   */
  async getStorageInfo() {
    try {
      console.log('📊 获取存储空间信息');
      
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_FILES, 'readonly');
        const store = tx.objectStore(STORE_FILES);
        const req = store.getAll();
        
        req.onsuccess = function(e) {
          const arr = e.target.result || [];
          
          // 计算总大小
          const total = arr.reduce((s, r) => s + (r.size || 0), 0);
          
          // 获取浏览器存储配额信息
          if ('storage' in navigator && 'estimate' in navigator.storage) {
            navigator.storage.estimate().then(estimate => {
              const usagePercent = estimate.quota > 0 ? 
                ((estimate.usage || 0) / estimate.quota * 100).toFixed(2) : 0;
              
              console.log('📊 存储信息统计:', {
                totalSize: formatFileSize(total),
                count: arr.length,
                usage: formatFileSize(estimate.usage || 0),
                quota: formatFileSize(estimate.quota || 0),
                usagePercent: usagePercent + '%'
              });
              
              resolve({ 
                totalSize: total, 
                count: arr.length,
                usage: estimate.usage || 0,
                quota: estimate.quota || 0,
                usagePercent: usagePercent,
                files: arr.map(f => ({
                  name: f.name,
                  size: f.size,
                  type: f.type,
                  createdAt: f.createdAt,
                  lastUpdated: f.lastUpdated
                }))
              });
            }).catch(() => {
              console.log('📊 存储信息统计:', {
                totalSize: formatFileSize(total),
                count: arr.length
              });
              
              resolve({ 
                totalSize: total, 
                count: arr.length,
                files: arr.map(f => ({
                  name: f.name,
                  size: f.size,
                  type: f.type,
                  createdAt: f.createdAt,
                  lastUpdated: f.lastUpdated
                }))
              });
            });
          } else {
            console.log('📊 存储信息统计:', {
              totalSize: formatFileSize(total),
              count: arr.length
            });
            
            resolve({ 
              totalSize: total, 
              count: arr.length,
              files: arr.map(f => ({
                name: f.name,
                size: f.size,
                type: f.type,
                createdAt: f.createdAt,
                lastUpdated: f.lastUpdated
              }))
            });
          }
        };
        
        req.onerror = function() { 
          console.error('❌ 获取存储信息失败');
          resolve(null); 
        };
      });
    } catch (e) { 
      console.error('❌ 获取存储信息失败:', e);
      return null; 
    }
  },
  
  /**
   * 清理旧文件，保留最新的指定数量
   * 
   * 功能说明：
   * 1. 按最后更新时间排序文件
   * 2. 保留最新的N个文件
   * 3. 删除超出保留数量的旧文件
   * 4. 提供清理结果统计
   * 
   * @param {number} [keepCount=5] - 保留文件数量，默认5个
   * @returns {Promise<{deleted: number, message: string}>} 清理结果
   * 
   * @example
   * // 保留最新的3个文件，删除其他文件
   * localMediaStorage.cleanupOldFiles(3).then(result => {
   *   console.log(`清理了 ${result.deleted} 个文件`);
   * });
   */
  async cleanupOldFiles(keepCount = 5) {
    try {
      console.log(`🧹 开始清理旧文件，保留最新 ${keepCount} 个`);
      
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_FILES, 'readwrite');
        const store = tx.objectStore(STORE_FILES);
        const req = store.getAll();
        
        req.onsuccess = function(e) {
          const arr = e.target.result || [];
          
          // 按最后更新时间排序，保留最新的文件
          arr.sort((a, b) => (b.lastUpdated || b.createdAt || 0) - (a.lastUpdated || a.createdAt || 0));
          
          // 删除超出保留数量的旧文件
          const filesToDelete = arr.slice(keepCount);
          let deletedCount = 0;
          
          if (filesToDelete.length === 0) {
            console.log('✅ 没有需要清理的文件');
            resolve({ deleted: 0, message: '没有需要清理的文件' });
            return;
          }
          
          console.log(`🗑️ 准备删除 ${filesToDelete.length} 个旧文件`);
          
          filesToDelete.forEach(file => {
            const deleteReq = store.delete(file.name);
            deleteReq.onsuccess = function() {
              deletedCount++;
              console.log(`🗑️ 已删除: ${file.name}`);
              
              if (deletedCount === filesToDelete.length) {
                console.log(`✅ 清理完成，删除了 ${deletedCount} 个旧文件`);
                resolve({ deleted: deletedCount, message: `成功清理 ${deletedCount} 个旧文件` });
              }
            };
            deleteReq.onerror = function() {
              console.error('❌ 删除文件失败:', file.name);
              
              if (deletedCount === filesToDelete.length) {
                console.log(`⚠️ 清理完成，部分文件删除失败`);
                resolve({ deleted: deletedCount, message: `清理完成，部分文件删除失败` });
              }
            };
          });
        };
        
        req.onerror = function(e) { 
          const error = e.target.error || new Error('cleanupOldFiles failed');
          console.error('❌ 获取文件列表失败:', error);
          reject(error); 
        };
      });
    } catch (e) { 
      console.error('❌ 清理旧文件过程中发生异常:', e);
      throw e;
    }
  }
};

// ==================== 调试工具函数 ====================

/**
 * 保存临时数据到date.json文件
 * 用于调试和导出配置数据
 * 
 * @returns {string|null} 导出的数据或null
 */
console.saveToDateJson = function() {
  const tempData = localStorage.getItem('temp_date_json');
  if (tempData) {
    console.log('💾 导出date.json配置文件');
    
    const blob = new Blob([tempData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'date.json';
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('✅ date.json文件导出成功');
    return tempData;
  } else {
    console.log('⚠️ 没有找到临时数据');
    return null;
  }
};

/**
 * 清空媒体存储
 * 用于调试和重置存储
 */
console.clearMediaStorage = function() {
  console.log('🧹 清空所有媒体存储');
  window.localMediaStorage.clearAll().then(() => {
    console.log('✅ 媒体存储已清空');
  });
};

// ==================== 模块初始化 ====================

/**
 * 模块加载完成提示
 */
console.log('📦 LocalStorage模块已加载');
console.log('💡 调试命令:');
console.log('   - localMediaStorage.getStorageInfo() - 获取存储信息');
console.log('   - localMediaStorage.cleanupOldFiles() - 清理旧文件');
console.log('   - console.saveToDateJson() - 导出配置文件');
console.log('   - console.clearMediaStorage() - 清空媒体存储');