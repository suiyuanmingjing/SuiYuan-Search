document.addEventListener('DOMContentLoaded', function() {
	// 创建启动时的黑色遮蔽层
	const startupOverlay = document.createElement('div');
	startupOverlay.id = 'startup-overlay';
	startupOverlay.style.position = 'fixed';
	startupOverlay.style.top = '0';
	startupOverlay.style.left = '0';
	startupOverlay.style.width = '100%';
	startupOverlay.style.height = '100%';
	startupOverlay.style.background = 'rgba(0, 0, 0, 1)';
	startupOverlay.style.zIndex = '10000';
	startupOverlay.style.opacity = '1';
	startupOverlay.style.transition = 'opacity 0.8s ease-in-out';
	startupOverlay.style.pointerEvents = 'none';
	document.body.appendChild(startupOverlay);
	
	const circleDropdown = document.querySelector('.circle-dropdown');
	const dropdownItems = document.querySelectorAll('.dropdown-item');
	const leftCircle = document.querySelector('.circle-dropdown .solid-circle');
    const searchTitle = document.querySelector('.search-title');
	const textContent = document.querySelector('.text-content');
	
	// 设置contenteditable属性
	if (textContent) {
		textContent.setAttribute('contenteditable', 'true');
	}
	
	let isDarkMode = false;
    let currentSettings = {
        searchEngine: 'bing',
        theme: 'light',
        background: 'default',
        titleDisplay: 'text',
        showSeconds: true,
        titleText: 'SuiYuan-Search',
        titleFillColor: '#ffffff',
        titleOutlineColor: '#000000',
		// 新增背景设置
		solidColor: '#ffffff',
		solidColorDark: '#1a1a1a',
		gradientStart: '#667eea',
		gradientEnd: '#764ba2',
		gradientDirection: '135deg',
		imageLight: '',
		imageDark: '',
		imageOpacity: 100,
		imageBlur: 0,
		// 视频背景设置
		video: '',
		videoOpacity: 80,
		videoBlur: 2,
		// 自定义搜索引擎
		customEngines: []
	};
	
	// 文件管理工具函数
	function generateUniqueFileName(originalName) {
		const timestamp = Date.now();
		const random = Math.floor(Math.random() * 1000);
		const extension = originalName.split('.').pop();
		const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
		return `${nameWithoutExt}_${timestamp}_${random}.${extension}`;
	}

	async function copyFileToUserImg(file, fileName) {
		try {
			// 检查Chrome API是否可用
			if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
				// 使用Chrome存储API模拟文件系统
				const reader = new FileReader();
				return new Promise((resolve, reject) => {
					reader.onload = function(e) {
						const fileData = {
							name: fileName,
							data: e.target.result,
							type: file.type,
							size: file.size,
							originalName: file.name,
							uploadTime: new Date().toISOString()
						};
						
						// 保存到Chrome本地存储
						chrome.storage.local.get(['userimgFiles'], function(result) {
							const userimgFiles = result.userimgFiles || {};
							userimgFiles[fileName] = fileData;
							
							chrome.storage.local.set({userimgFiles: userimgFiles}, function() {
								console.log('文件已保存到userimg文件夹:', fileName);
								resolve(fileName);
							});
						});
					};
					reader.onerror = reject;
					reader.readAsArrayBuffer(file);
				});
			} else {
				// 使用localStorage作为备选方案
				const reader = new FileReader();
				return new Promise((resolve, reject) => {
					reader.onload = function(e) {
						const fileData = {
							name: fileName,
							data: e.target.result,
							type: file.type,
							size: file.size,
							originalName: file.name,
							uploadTime: new Date().toISOString()
						};
						
						const userimgFiles = JSON.parse(localStorage.getItem('userimgFiles') || '{}');
						userimgFiles[fileName] = fileData;
						localStorage.setItem('userimgFiles', JSON.stringify(userimgFiles));
						
						console.log('文件已保存到userimg文件夹:', fileName);
						resolve(fileName);
					};
					reader.onerror = reject;
					reader.readAsDataURL(file);
				});
			}
		} catch (error) {
			console.error('保存文件到userimg失败:', error);
			throw error;
		}
	}

async function getFileFromUserImg(fileName) {
    const fromIdb = await window.localMediaStorage.getUrl(fileName);
    if (fromIdb) return fromIdb;
    const storageKey = `userimg_${fileName}`;
    const chromeApiAvailable = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
    if (chromeApiAvailable) {
        return new Promise((resolve, reject) => {
            if (chrome.runtime) { chrome.runtime.lastError = null; }
            chrome.storage.local.get([storageKey], function(result) {
                if (chrome.runtime && chrome.runtime.lastError) {
                    try {
                        const data = localStorage.getItem(storageKey);
                        if (data) { resolve(JSON.parse(data).fileData); } else { reject(new Error('文件不存在')); }
                    } catch (e) { reject(new Error('Chrome存储和localStorage都失败: ' + e.message)); }
                } else if (result[storageKey]) {
                    resolve(result[storageKey].fileData);
                } else {
                    try {
                        const data = localStorage.getItem(storageKey);
                        if (data) { resolve(JSON.parse(data).fileData); } else { reject(new Error('文件不存在')); }
                    } catch (e) { reject(new Error('文件不存在')); }
                }
            });
        });
    } else {
        return new Promise((resolve, reject) => {
            try {
                const data = localStorage.getItem(storageKey);
                if (data) { resolve(JSON.parse(data).fileData); } else { reject(new Error('文件不存在')); }
            } catch (e) { reject(e); }
        });
    }
}

	async function deleteFileFromUserImg(fileName) {
		try {
			if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
				return new Promise((resolve) => {
					chrome.storage.local.get(['userimgFiles'], function(result) {
						const userimgFiles = result.userimgFiles || {};
						delete userimgFiles[fileName];
						chrome.storage.local.set({userimgFiles: userimgFiles}, function() {
							console.log('文件已从userimg删除:', fileName);
							resolve();
						});
					});
				});
			} else {
				const userimgFiles = JSON.parse(localStorage.getItem('userimgFiles') || '{}');
				delete userimgFiles[fileName];
				localStorage.setItem('userimgFiles', JSON.stringify(userimgFiles));
				console.log('文件已从userimg删除:', fileName);
			}
		} catch (error) {
			console.error('从userimg删除文件失败:', error);
			throw error;
		}
	}

    // 创建模式切换遮蔽层
    const transitionOverlay = document.createElement('div');
    transitionOverlay.style.position = 'fixed';
    transitionOverlay.style.top = '0';
    transitionOverlay.style.left = '0';
    transitionOverlay.style.width = '100%';
    transitionOverlay.style.height = '100%';
    transitionOverlay.style.background = 'radial-gradient(circle, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.95) 100%)';
    transitionOverlay.style.zIndex = '9999';
    transitionOverlay.style.opacity = '0';
    transitionOverlay.style.visibility = 'hidden';
    transitionOverlay.style.transition = 'opacity 0.3s ease-in-out, visibility 0.3s ease-in-out';
    transitionOverlay.style.pointerEvents = 'none';
    document.body.appendChild(transitionOverlay);

    // 时间更新相关变量
    let timeUpdateInterval = null;

    

    // 从存储加载设置
	loadSettings();

	// 安全地监听Chrome存储变化
	try {
		if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged && chrome.storage.onChanged.addListener) {
			chrome.storage.onChanged.addListener(function(changes, area) {
				if (area === 'local' && changes.suiYuanMedia) {
					const media = changes.suiYuanMedia.newValue || {};
					if (media.video) {
						currentSettings.video = media.video;
						const previousBackground = currentSettings.background;
						if (currentSettings.background === 'video') {
							applyBackground('video', previousBackground);
						}
					} else if (media.imageLight || media.imageDark) {
						currentSettings.imageLight = media.imageLight;
						currentSettings.imageDark = media.imageDark;
						const previousBackground = currentSettings.background;
						if (currentSettings.background === 'image') {
							applyBackground('image', previousBackground);
						}
					}
				}
				if (area === 'sync' && changes.suiYuanSettings) {
					Object.assign(currentSettings, changes.suiYuanSettings.newValue || {});
					applySettings(currentSettings);
				}
			});
		}
	} catch (error) {
		console.log('Chrome存储监听器初始化失败:', error.message);
	}
	
	// 安全地监听来自设置页面的消息
	try {
		if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage && chrome.runtime.onMessage.addListener) {
			chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
				if (request.action === 'updateSettings') {
					applySettings(request.settings);
					sendResponse({status: 'success'});
				}
			});
		}
	} catch (error) {
		console.log('Chrome消息监听器初始化失败:', error.message);
	}

	// 监听IndexedDB变化（用于实时更新媒体文件）
	if (typeof window !== 'undefined' && window.localMediaStorage) {
		// 创建一个简单的IndexedDB变化监听器
		const observeIndexedDBChanges = () => {
			// 定期检查媒体文件是否有更新
			let lastVideoCheck = 0;
			let lastImageCheck = 0;
			
			const checkForMediaUpdates = async () => {
				const now = Date.now();
				
				// 不再检查视频更新，视频播放完后自动重播
				
				// 每30秒检查一次图片更新（减少频率避免闪烁）
				if (now - lastImageCheck > 30000 && currentSettings.background === 'image') {
					lastImageCheck = now;
					try {
						const lightImage = await window.localMediaStorage.getImage('light');
						const darkImage = await window.localMediaStorage.getImage('dark');
						
						if (lightImage && lightImage.lastUpdated > (currentSettings.imageLight?.lastUpdated || 0)) {
							console.log('检测到亮色图片更新，重新应用背景');
							// 只更新图片源，不重新创建整个背景
							updateImageSourceOnly();
						} else if (darkImage && darkImage.lastUpdated > (currentSettings.imageDark?.lastUpdated || 0)) {
							console.log('检测到暗色图片更新，重新应用背景');
							// 只更新图片源，不重新创建整个背景
							updateImageSourceOnly();
						}
					} catch (e) {
						console.log('检查图片更新时出错:', e);
					}
				}
			};
			
			// 每10秒检查一次更新（减少频率避免闪烁）
			setInterval(checkForMediaUpdates, 10000);
		};
		
		// 延迟启动监听器，确保页面完全加载
		setTimeout(observeIndexedDBChanges, 3000);
	}
	
	// 加载设置函数
	function loadSettings() {
		// 清理可能存在的旧视频数据（没有temp标记的视频数据）
		if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
			// 使用同步方式清理旧数据
			chrome.storage.local.get(['suiYuanMedia'], function(result) {
				if (result.suiYuanMedia && result.suiYuanMedia.video) {
					const video = result.suiYuanMedia.video;
					// 如果视频数据没有temp标记，或者temp为false，说明是旧数据，需要清理
					if (typeof video === 'object' && (video.temp === undefined || video.temp === false)) {
						console.log('发现旧的视频数据，正在清理...');
						// 清理旧视频数据
						const updatedMedia = {
							...result.suiYuanMedia,
							video: null
						};
						chrome.storage.local.set({suiYuanMedia: updatedMedia}, function() {
							console.log('旧视频数据已清理');
							// 清理完成后，重新加载设置
							loadSettingsAfterCleanup();
						});
						return; // 阻止继续执行后续加载逻辑
					}
				}
				// 没有旧数据需要清理，直接加载设置
				loadSettingsAfterCleanup();
			});
		} else {
			// Chrome API不可用，直接加载设置
			loadSettingsAfterCleanup();
		}
	}

	function loadSettingsAfterCleanup() {
		chrome.storage.sync.get(['suiYuanSettings'], function(result) {
			if (result.suiYuanSettings) {
				// 兼容旧的darkMode设置
				const settings = result.suiYuanSettings;
				if (settings.darkMode !== undefined && settings.theme === undefined) {
					settings.theme = settings.darkMode ? 'dark' : 'light';
				}
				
				// 更新当前设置
				currentSettings.searchEngine = settings.searchEngine || 'bing';
				currentSettings.theme = settings.theme || 'light';
				currentSettings.background = settings.background || 'default';
				currentSettings.titleDisplay = settings.titleDisplay || 'text';
				currentSettings.showSeconds = settings.showSeconds !== undefined ? settings.showSeconds : true;
				
				// 加载新的背景设置
				currentSettings.solidColor = settings.solidColor || '#ffffff';
				currentSettings.solidColorDark = settings.solidColorDark || '#1a1a1a';
				currentSettings.gradientStart = settings.gradientStart || '#667eea';
				currentSettings.gradientEnd = settings.gradientEnd || '#764ba2';
				currentSettings.gradientDirection = settings.gradientDirection || '135deg';
				
				// 加载自定义搜索引擎
				currentSettings.customEngines = settings.customEngines || [];
				
				// 注意：这里不立即调用 applySettings，等待媒体文件加载完成后再统一应用
			} else {
				// 没有同步存储数据时，也不立即应用默认设置，等待媒体文件加载完成
				console.log('没有找到同步存储设置，使用默认设置');
			}
		});

		// 加载媒体文件
		loadMediaFiles();
	}

	function loadMediaFiles() {
		// 检查Chrome API是否可用
		if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
			console.log('Chrome扩展API不可用，跳过从Chrome存储加载媒体文件');
			// 直接尝试从date.json加载
			loadFromDateJsonThenApply();
			return;
		}
		
		// 从Chrome本地存储加载媒体文件
		chrome.storage.local.get(['suiYuanMedia'], function(result) {
			if (result.suiYuanMedia) {
				const media = result.suiYuanMedia;
				console.log('从Chrome本地存储加载媒体数据:', media);
				
				// 更新图片数据 - 支持新的文件路径结构
				if (media.imageLight) {
					currentSettings.imageLight = media.imageLight;
					console.log('加载图片数据(亮色):', media.imageLight.name || '未命名', 
							   media.imageLight.filePath ? '文件路径: ' + media.imageLight.filePath : '使用dataUrl');
				}
				if (media.imageDark) {
					currentSettings.imageDark = media.imageDark;
					console.log('加载图片数据(暗色):', media.imageDark.name || '未命名',
							   media.imageDark.filePath ? '文件路径: ' + media.imageDark.filePath : '使用dataUrl');
				}
				
				// 更新视频数据 - 支持新的文件路径结构
				if (media.video) {
					// 优先使用包含文件路径的新结构
					if (typeof media.video === 'object' && (media.video.filePath || media.video.dataUrl)) {
						currentSettings.video = {
							filePath: media.video.filePath, // 新的文件路径字段
							savedName: media.video.savedName,
							originalName: media.video.originalName,
							dataUrl: media.video.dataUrl, // 保留dataUrl作为备用
							name: media.video.name || 'background',
							type: media.video.type || 'video/mp4',
							size: media.video.size || 0,
							lastUpdated: media.video.lastUpdated,
							temp: media.video.temp || false // 确保temp属性存在
						};
						console.log('从本地存储加载视频数据:', currentSettings.video.name, 
								   currentSettings.video.filePath ? '文件路径: ' + currentSettings.video.filePath : '使用dataUrl',
								   '大小:', currentSettings.video.size ? (currentSettings.video.size / 1024 / 1024).toFixed(2) + 'MB' : '未知大小',
								   '类型:', currentSettings.video.type,
								   '临时视频:', currentSettings.video.temp);
						// 不在此处强制修改背景类型，尊重同步设置中的背景选择
					} else {
						// 兼容旧格式或字符串格式 - 这些都是旧数据，应该被清理
						console.log('发现旧格式视频数据，跳过加载:', typeof media.video === 'string' ? '字符串格式' : '对象格式');
						// 不加载旧格式的视频数据，避免影响背景设置
					}
				}
				
				// 如果有图片数据但没有有效的视频数据，设置背景类型为图片
				if ((media.imageLight || media.imageDark) && (!media.video || (typeof media.video === 'object' && media.video.temp))) {
					// 不在此处强制修改背景类型，尊重同步设置中的背景选择
				}
			} else {
				console.log('Chrome本地存储中没有媒体数据');
			}
			
			// 同时尝试从IndexedDB加载，作为权威数据源
			(async () => {
				try {
					const [idbLight, idbDark, idbVideo] = await Promise.all([
						window.localMediaStorage.getImage('light'),
						window.localMediaStorage.getImage('dark'),
						window.localMediaStorage.getVideo()
					]);
					if (idbLight) { currentSettings.imageLight = { dataUrl: idbLight.dataUrl, savedName: 'image_light' }; }
					if (idbDark) { currentSettings.imageDark = { dataUrl: idbDark.dataUrl, savedName: 'image_dark' }; }
					if (idbVideo) { 
						currentSettings.video = { 
							dataUrl: idbVideo.dataUrl, 
							savedName: 'video_main', 
							type: 'video/mp4',
							temp: false // IndexedDB中的视频都是正式保存的，不是临时视频
						}; 
						// 不在此处强制修改背景类型，尊重同步设置中的背景选择
					}
					else if ((idbLight || idbDark) && !currentSettings.video) { /* 保持现有背景类型 */ }
				} catch (e) {}
				loadFromDateJsonThenApply();
			})();
		});
	}

	async function loadFromDateJsonThenApply() {
		try {
			const response = await fetch('date.json');
			if (response.ok) {
				const data = await response.json();
				if (data && data.background) {
					const bg = data.background;
					
					// 更新背景设置（只有在没有从Chrome存储加载到媒体数据时才使用date.json的数据）
					if (bg.type === 'image' && !currentSettings.imageLight && !currentSettings.imageDark) {
						// 支持新的文件路径结构
						if (bg.filePath) {
							currentSettings.imageLight = {
								filePath: bg.filePath,
								dataUrl: bg.dataUrl, // 保留dataUrl作为备用
								name: bg.fileName || '',
								type: bg.fileType || 'image/jpeg',
								savedName: bg.fileName,
								originalName: bg.fileName
							};
							currentSettings.imageDark = {...currentSettings.imageLight};
							console.log('从date.json加载图片背景设置(文件路径):', bg.filePath);
						} else if (bg.dataUrl) {
							currentSettings.imageLight = bg.dataUrl;
							currentSettings.imageDark = bg.dataUrl;
							console.log('从date.json加载图片背景设置(dataUrl)');
						}
						// 不在此处强制修改背景类型，尊重同步设置中的背景选择
					} else if (bg.type === 'video' && !currentSettings.video) {
						// 支持新的文件路径结构
						if (bg.filePath) {
							currentSettings.video = {
								filePath: bg.filePath,
								dataUrl: bg.dataUrl, // 保留dataUrl作为备用
								name: bg.fileName || 'background',
								type: bg.fileType || 'video/mp4',
								savedName: bg.fileName,
								originalName: bg.fileName,
								temp: false // date.json中的视频都是正式保存的，不是临时视频
							};
							console.log('从date.json加载视频背景设置(文件路径):', bg.filePath);
						} else if (bg.dataUrl) {
							currentSettings.video = {
								dataUrl: bg.dataUrl,
								name: bg.fileName || 'background',
								type: bg.fileType || 'video/mp4',
								temp: false // date.json中的视频都是正式保存的，不是临时视频
							};
							console.log('从date.json加载视频背景设置(dataUrl)');
						}
						// 不在此处强制修改背景类型，尊重同步设置中的背景选择
					}
				}
			}
		} catch (error) {
			console.log('读取date.json文件失败:', error);
		}
		
		// 最终验证：确保背景类型设置正确
		if (currentSettings.background === 'video') {
			let hasValidVideo = false;
			const videoData = currentSettings.video;
			
			if (videoData) {
				if (typeof videoData === 'object') {
					// 检查是否有dataUrl或filePath，以及不是临时视频
					hasValidVideo = !!(videoData.dataUrl || videoData.filePath) && !videoData.temp;
				} else if (typeof videoData === 'string') {
					// 字符串格式，检查是否非空
					hasValidVideo = videoData.trim() !== '';
				}
			}
			
			if (!hasValidVideo) {
				console.warn('最终验证失败：背景类型为视频但没有有效视频数据，重置为默认背景');
				currentSettings.background = 'default';
			} else {
				console.log('最终验证通过：检测到有效视频数据，保持视频背景');
			}
		}
		
		// 所有数据加载完成后，统一应用设置
		console.log('所有设置加载完成，当前背景类型:', currentSettings.background);
		applySettings(currentSettings);
	}
	
	/**
 * 应用设置到页面
 * @param {Object} settings - 要应用的设置对象
 * 功能：将设置应用到页面各个元素，包括搜索引擎、主题、背景等
 */
	function applySettings(settings) {
		// 首先更新当前设置对象，确保后续操作使用最新的设置
		// 使用Object.assign合并设置，避免直接引用
		Object.assign(currentSettings, settings);
		
		// 应用搜索引擎设置
		if (settings.searchEngine) {
			switchSearchEngine(settings.searchEngine);
			// 更新下拉菜单的激活状态，高亮显示当前选中的搜索引擎
			// 重新获取所有下拉菜单项，包括动态添加的自定义引擎
			const allDropdownItems = document.querySelectorAll('.dropdown-item');
			allDropdownItems.forEach(item => {
				item.classList.remove('active');
				if (item.getAttribute('data-engine') === settings.searchEngine) {
					item.classList.add('active');
				}
			});
		}
		
		// 应用主题设置（必须先应用主题，再应用背景）
		// 因为背景设置可能依赖当前的暗色模式状态
		if (settings.theme) {
			if (settings.theme === 'dark') {
				document.body.classList.add('dark-mode');
				isDarkMode = true;
			} else if (settings.theme === 'light') {
				document.body.classList.remove('dark-mode');
				isDarkMode = false;
			} else if (settings.theme === 'auto') {
				// 跟随系统主题：检测系统颜色方案偏好
				const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
				if (prefersDark) {
					document.body.classList.add('dark-mode');
					isDarkMode = true;
				} else {
					document.body.classList.remove('dark-mode');
					isDarkMode = false;
				}
			}
		}
		
		// 应用背景设置（在主题设置之后，确保使用正确的isDarkMode状态）
		// 背景设置需要知道当前是亮色还是暗色模式来选择合适的背景
		if (settings.background) {
			const previousBackground = currentSettings.background;
			applyBackground(settings.background, previousBackground);
		}

		// 更新标题文本与颜色设置
		if (settings.titleText !== undefined) { currentSettings.titleText = settings.titleText; }
		if (settings.titleFillColor !== undefined) { currentSettings.titleFillColor = settings.titleFillColor; }
		if (settings.titleOutlineColor !== undefined) { currentSettings.titleOutlineColor = settings.titleOutlineColor; }
		
		// 应用标题显示设置（文字标题或时钟显示）
		if (settings.titleDisplay) {
			applyTitleDisplay(settings.titleDisplay);
		}
		
		// 应用秒数显示设置（仅影响时钟模式）
		if (settings.showSeconds !== undefined) {
			currentSettings.showSeconds = settings.showSeconds;
		}
		
		// 页面设置应用完成后，淡出启动遮蔽层
		setTimeout(() => {
			const startupOverlay = document.getElementById('startup-overlay');
			if (startupOverlay) {
				startupOverlay.style.opacity = '0';
				setTimeout(() => {
					startupOverlay.remove();
				}, 800);
			}
		}, 100);
	}
	
	/**
 * 清理视频背景资源
 * 功能：停止视频播放，清理视频元素，释放内存资源
 */
	function cleanupVideoBackground() {
		const existingVideo = document.getElementById('background-video');
		if (existingVideo) {
			// 停止视频播放
			existingVideo.pause();
			// 清空视频源，释放资源
			existingVideo.src = '';
			// 从DOM中移除视频元素
			existingVideo.remove();
		}
	}

	// 只更新视频源而不重新创建整个背景（避免闪烁）
	async function updateVideoSourceOnly() {
		try {
			const videoData = currentSettings.video;
			if (!videoData) return;

			let videoUrl = '';
			if (typeof videoData === 'object') {
				if (videoData.dataUrl) {
					videoUrl = videoData.dataUrl;
				} else if (videoData.filePath) {
					try {
						const fileName = videoData.savedName || videoData.name || videoData.filePath;
						const fileData = await getFileFromUserImg(fileName);
						if (fileData) {
							videoUrl = fileData;
						}
					} catch (error) {
						console.warn('从存储获取视频失败:', error);
					}
				}
			} else if (typeof videoData === 'string') {
				videoUrl = videoData;
			}

			if (videoUrl) {
				const videoElement = document.getElementById('background-video');
				if (videoElement) {
					// 只更新视频源，不重新创建元素
					videoElement.src = videoUrl;
					videoElement.load();
					console.log('视频源已更新');
				}
			}
		} catch (error) {
			console.error('更新视频源时出错:', error);
		}
	}

	// 只更新图片源而不重新创建整个背景（避免闪烁）
	async function updateImageSourceOnly() {
		try {
			const imageData = isDarkMode ? currentSettings.imageDark : currentSettings.imageLight;
			if (!imageData) return;

			let imageUrl = '';
			if (typeof imageData === 'object') {
				if (imageData.filePath) {
					try {
						const url = await getFileFromUserImg(imageData.savedName || imageData.name);
						if (url) { imageUrl = url; }
					} catch (error) {
						imageUrl = imageData.dataUrl || imageData.url;
					}
				} else { imageUrl = imageData.dataUrl || imageData.url; }
			} else if (typeof imageData === 'string') {
				imageUrl = imageData;
			}

			if (imageUrl) {
				const layer = document.getElementById('background-image-layer');
				if (layer) {
					// 只更新背景图片，不重新创建元素
					layer.style.backgroundImage = `url(${imageUrl})`;
					console.log('图片源已更新');
				}
			}
		} catch (error) {
			console.error('更新图片源时出错:', error);
		}
	}

	// 显示刷新遮罩并提供手动刷新按钮
	function showRefreshOverlayAndReload() {
		// 如果已经存在刷新遮罩，先移除
		const existingOverlay = document.getElementById('refresh-overlay');
		if (existingOverlay) {
			existingOverlay.remove();
		}

		// 创建刷新遮罩
		const overlay = document.createElement('div');
		overlay.id = 'refresh-overlay';
		overlay.style.cssText = `
			position: fixed;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background-color: rgba(0, 0, 0, 0.7);
			z-index: 9999;
			display: flex;
			justify-content: center;
			align-items: center;
			color: white;
			font-size: 18px;
			font-family: Arial, sans-serif;
		`;

		// 添加刷新按钮
		const refreshButton = document.createElement('button');
		refreshButton.textContent = '刷新';
		refreshButton.style.cssText = `
			padding: 16px 32px;
			background-color: #007acc;
			color: white;
			border: none;
			border-radius: 8px;
			font-size: 18px;
			font-weight: bold;
			cursor: pointer;
			transition: background-color 0.2s;
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		`;

		// 按钮悬停效果
		refreshButton.onmouseover = () => {
			refreshButton.style.backgroundColor = '#005a9e';
		};
		refreshButton.onmouseout = () => {
			refreshButton.style.backgroundColor = '#007acc';
		};

		// 按钮点击事件 - 刷新页面
		refreshButton.onclick = () => {
			window.location.reload();
		};

		// 添加到遮罩
		overlay.appendChild(refreshButton);
		document.body.appendChild(overlay);

		// 添加ESC键关闭功能
		const handleKeyPress = (event) => {
			if (event.key === 'Escape') {
				overlay.remove();
				document.removeEventListener('keydown', handleKeyPress);
			}
		};
		document.addEventListener('keydown', handleKeyPress);

		// 添加点击遮罩关闭功能（除了按钮区域）
		overlay.onclick = (event) => {
			if (event.target === overlay) {
				overlay.remove();
				document.removeEventListener('keydown', handleKeyPress);
			}
		};
	}

	function showTransitionOverlay() {
		transitionOverlay.style.opacity = '1';
		transitionOverlay.style.visibility = 'visible';
	}

	function hideTransitionOverlay() {
		transitionOverlay.style.opacity = '0';
		transitionOverlay.style.visibility = 'hidden';
	}

	async function applySolidBackgroundAsTransition() {
		const body = document.body;
		
		// 重置所有背景相关的类和样式
		body.classList.remove('solid-background', 'gradient-background', 'image-background', 'video-background');
		body.style.removeProperty('background');
		body.style.removeProperty('background-image');
		body.style.removeProperty('background-color');
		body.style.removeProperty('filter');
		
		// 移除之前动态创建的样式元素
		const existingStyle = document.getElementById('dynamic-background-style');
		if (existingStyle) {
			existingStyle.remove();
		}
		
		// 移除之前创建的图片图层
		const existingImgLayer = document.getElementById('background-image-layer');
		if (existingImgLayer) {
			existingImgLayer.remove();
		}
		
		// 应用纯色背景
		body.classList.add('solid-background');
		const solidColor = isDarkMode ? currentSettings.solidColorDark : currentSettings.solidColor;
		body.style.backgroundColor = solidColor;
	}

	async function applyBackground(background, previousBackground = null) {
		// 显示过渡遮蔽层
		showTransitionOverlay();
		
		// 只有在切换到非视频背景时才清理视频
		if (background !== 'video') {
			cleanupVideoBackground();
		}
		
		const body = document.body;
		
		// 特殊处理：从视频背景切换到图片背景时，先切换到纯色背景
		if (previousBackground === 'video' && background === 'image') {
			// 第一步：先切换到纯色背景
			await applySolidBackgroundAsTransition();
			
			// 等待纯色背景完全显示
			await new Promise(resolve => setTimeout(resolve, 300));
		}
		
		// 重置所有背景相关的类和样式
		// 确保不同背景类型之间不会相互干扰
		body.classList.remove('solid-background', 'gradient-background', 'image-background', 'video-background');
		body.style.removeProperty('background');
		body.style.removeProperty('background-image');
		body.style.removeProperty('background-color');
		body.style.removeProperty('filter');
		
		// 移除之前动态创建的样式元素（用于图片背景的伪元素样式）
		const existingStyle = document.getElementById('dynamic-background-style');
		if (existingStyle) {
			existingStyle.remove();
		}

		// 移除之前创建的图片图层（改用固定层代替伪元素）
		const existingImgLayer = document.getElementById('background-image-layer');
		if (existingImgLayer) {
			existingImgLayer.remove();
		}
		
		// 根据背景类型应用相应的背景效果
		switch(background) {
			case 'default':
				// 默认背景：根据当前暗色模式自动选择对应的预设图片
				if (isDarkMode) {
					// 暗色模式使用暗色背景图片
					body.style.background = 'url("img/暗色.jpg") no-repeat';
				} else {
					// 亮色模式使用亮色背景图片
					body.style.background = 'url("img/亮色.jpg") no-repeat';
				}
				// 设置背景图片的显示属性
				body.style.backgroundSize = 'cover';        // 覆盖整个容器
				body.style.backgroundPosition = 'center';   // 居中显示
				setTimeout(() => { hideTransitionOverlay(); }, 200);
				break;
				
			case 'solid':
				// 纯色背景：应用用户选择的单一颜色
				body.classList.add('solid-background');
				// 根据当前主题模式选择对应的颜色
				const solidColor = isDarkMode ? currentSettings.solidColorDark : currentSettings.solidColor;
				// 应用纯色背景
				body.style.backgroundColor = solidColor;
				setTimeout(() => { hideTransitionOverlay(); }, 200);
				break;
				
			case 'gradient':
				// 渐变背景：应用用户设置的CSS渐变效果
				body.classList.add('gradient-background');
				// 根据主题模式生成不同的渐变效果
				const gradientColor = 
					`linear-gradient(${currentSettings.gradientDirection}, ${currentSettings.gradientStart} 0%, ${currentSettings.gradientEnd} 100%)`;
				// 应用渐变背景
				body.style.background = gradientColor;
				setTimeout(() => { hideTransitionOverlay(); }, 200);
				break;
				
			case 'image':
				// 图片背景：使用用户提供的图片作为背景
				body.classList.add('image-background');
				// 根据主题模式选择对应的图片
				const imageData = isDarkMode ? currentSettings.imageDark : currentSettings.imageLight;
				
				// 异步处理图片加载
				const loadImageBackground = async () => {
					let imageUrl = '';
					
					if (imageData) {
						if (typeof imageData === 'object') {
							// 新对象格式：优先使用filePath，回退到dataUrl，最后到url
                            if (imageData.filePath) {
                                try {
                                    const url = await getFileFromUserImg(imageData.savedName || imageData.name);
                                    if (url) { imageUrl = url; }
                                } catch (error) {
                                    imageUrl = imageData.dataUrl || imageData.url;
                                }
                            } else { imageUrl = imageData.dataUrl || imageData.url; }
						} else if (typeof imageData === 'string') {
							// 字符串格式：直接使用（可能是Data URL或普通URL）
							imageUrl = imageData;
						}
					}
					
					if (imageUrl && imageUrl.trim() !== '') {
						let layer = document.getElementById('background-image-layer');
						if (!layer) {
							layer = document.createElement('div');
							layer.id = 'background-image-layer';
							layer.style.position = 'fixed';
							layer.style.top = '0';
							layer.style.left = '0';
							layer.style.width = '100%';
							layer.style.height = '100%';
							layer.style.pointerEvents = 'none';
							layer.style.zIndex = '-1';
							document.body.appendChild(layer);
						}
						layer.style.backgroundImage = `url(${imageUrl})`;
						layer.style.backgroundSize = 'cover';
						layer.style.backgroundPosition = 'center';
						layer.style.backgroundRepeat = 'no-repeat';
						layer.style.opacity = `${currentSettings.imageOpacity / 100}`;
						layer.style.filter = `blur(${currentSettings.imageBlur}px)`;
						setTimeout(() => { hideTransitionOverlay(); }, 200);
					} else {
						// 如果没有上传图片，回退到默认背景
						if (isDarkMode) {
							body.style.background = 'url("img/暗色.jpg") no-repeat';
						} else {
							body.style.background = 'url("img/亮色.jpg") no-repeat';
						}
						body.style.backgroundSize = 'cover';
						body.style.backgroundPosition = 'center';
						setTimeout(() => { hideTransitionOverlay(); }, 200);
					}
				};
				
				// 异步加载图片背景
				loadImageBackground();
				break;
				
			case 'video':
				// 视频背景：使用用户提供的视频作为动态背景
				// 首先检查是否有有效的视频数据
				let videoData = currentSettings.video;
				let hasValidVideo = false;
				
				if (videoData) {
					if (typeof videoData === 'object') {
						// 检查是否有dataUrl或filePath
						hasValidVideo = !!(videoData.dataUrl || videoData.filePath);
					} else if (typeof videoData === 'string') {
						// 字符串格式，检查是否非空
						hasValidVideo = videoData.trim() !== '';
					}
				}
				
				if (!hasValidVideo) {
					console.warn('没有有效的视频数据，回退到默认背景');
					// 回退到默认背景
					if (isDarkMode) {
						body.style.background = 'url("img/暗色.jpg") no-repeat';
					} else {
						body.style.background = 'url("img/亮色.jpg") no-repeat';
					}
                    body.style.backgroundSize = 'cover';
                    body.style.backgroundPosition = 'center';
                    setTimeout(() => { hideTransitionOverlay(); }, 200);
                    break;
				}
				
				console.log('检测到有效视频数据，应用视频背景');
				body.classList.add('video-background');
				
				// 异步处理视频加载
				const loadVideoBackground = async () => {
					let videoUrl = '';
					
					if (videoData) {
						if (typeof videoData === 'object') {
							// 简单方式：优先使用dataUrl
							if (videoData.dataUrl) {
								videoUrl = videoData.dataUrl;
								console.log('直接使用Data URL作为视频源');
							} else if (videoData.filePath) {
								// 兼容旧格式：尝试从文件路径获取
								try {
									const fileName = videoData.savedName || videoData.name || videoData.filePath;
									const fileData = await getFileFromUserImg(fileName);
									if (fileData) {
										videoUrl = fileData;
										console.log('从存储获取视频Data URL，文件名:', fileName);
									} else {
										throw new Error('文件数据为空');
									}
								} catch (error) {
									console.warn('从存储获取视频失败:', error);
								}
							}
						} else if (typeof videoData === 'string') {
							// 兼容旧格式：字符串格式
							videoUrl = videoData;
						}
					}
					
					if (videoUrl && videoUrl.trim() !== '') {
						console.log('应用视频背景，源:', videoUrl.startsWith('data:') ? 'Data URL' : '文件路径');
						
						// 清理现有视频
						cleanupVideoBackground();
						
						// 创建新的视频元素 - 简化逻辑，提高可靠性
						const video = document.createElement('video');
						video.id = 'background-video';
						
						// 设置基本属性
						video.autoplay = true;
						video.loop = true;
						video.muted = true;
						video.playsInline = true;
						
						// 设置样式 - 确保视频正确覆盖整个背景
					video.style.cssText = `
						position: fixed;
						top: 0;
						left: 0;
						width: 100%;
						height: 100%;
						object-fit: cover;
						z-index: -2;
						opacity: ${(isDarkMode ? 
							(currentSettings.videoOpacityDark || currentSettings.videoOpacity || 80) : 
							(currentSettings.videoOpacity || 80)) / 100};
						filter: blur(${currentSettings.videoBlur}px);
						transition: opacity 0.3s ease-in-out, filter 0.3s ease-in-out;
					`;
					
					// 添加到DOM
					document.body.appendChild(video);

					// 在暗色模式下添加黑色半透明遮罩以提高清晰度
					if (isDarkMode) {
						let overlay = document.getElementById('video-dark-overlay');
						if (!overlay) {
							overlay = document.createElement('div');
							overlay.id = 'video-dark-overlay';
							overlay.style.cssText = `
								position: fixed;
								top: 0;
								left: 0;
								width: 100%;
								height: 100%;
								background-color: rgba(0, 0, 0, 0.4);
								z-index: -1;
								pointer-events: none;
							`;
							document.body.appendChild(overlay);
						}
					} else {
						// 亮色模式下移除遮罩
						const overlay = document.getElementById('video-dark-overlay');
						if (overlay) {
							overlay.remove();
						}
					}
						
						// 设置视频源并加载
						video.src = videoUrl;
						
						// 简化的加载和播放逻辑
						const playVideo = () => {
							video.play().then(() => {
								console.log('视频背景播放成功');
							}).catch(error => {
								console.warn('视频自动播放失败:', error.message);
								// 如果自动播放失败，等待用户交互
								const enablePlay = () => {
									video.play().then(() => {
										console.log('用户交互后视频播放成功');
										document.removeEventListener('click', enablePlay);
										document.removeEventListener('touchstart', enablePlay);
									}).catch(e => {
										console.error('用户交互后视频播放仍然失败:', e.message);
									});
								};
								document.addEventListener('click', enablePlay, { once: true });
								document.addEventListener('touchstart', enablePlay, { once: true });
							});
						};
						
						// 监听视频加载完成
                    video.addEventListener('loadeddata', () => {
                        console.log('视频数据加载完成');
                        playVideo();
                        setTimeout(() => { hideTransitionOverlay(); }, 200);
                    });
					
					// 监听视频播放结束，自动重播
					video.addEventListener('ended', () => {
						console.log('视频播放完成，自动重播');
						video.currentTime = 0;
						video.play().catch(error => {
							console.log('自动重播失败:', error.message);
						});
					});
					
					// 监听加载错误
					video.addEventListener('error', (e) => {
							const errorMessage = e.message || e.target.error?.message || '未知视频加载错误';
							console.error('视频加载失败:', errorMessage);
							// 尝试重新加载一次
							setTimeout(() => {
								console.log('尝试重新加载视频...');
								video.load();
							}, 2000);
						});
						
						// 如果视频已经加载完成，直接播放
						if (video.readyState >= 2) {
							playVideo();
						}
						
                            } else {
                                // 回退到默认背景
                                if (isDarkMode) {
                                    body.style.background = 'url("img/暗色.jpg") no-repeat';
                                } else {
                                    body.style.background = 'url("img/亮色.jpg") no-repeat';
                                }
                                body.style.backgroundSize = 'cover';
                                body.style.backgroundPosition = 'center';
                                setTimeout(() => { hideTransitionOverlay(); }, 200);
                            }
				};
				
				// 异步加载视频背景
		loadVideoBackground();
		break;
	}
	
}
	
	/**
 * 应用页面动画效果
 * @param {string|boolean} animation - 动画设置：false/'off'表示关闭动画，其他值表示开启动画
 * 功能：控制页面元素（圆形按钮、下拉菜单、搜索按钮）的过渡动画效果
 * 实现原理：通过设置CSS transition属性来控制动画效果
 */
	function applyAnimation(animation) {
		// 获取需要应用动画的元素列表
		const elements = document.querySelectorAll('.solid-circle, .dropdown-menu, .search-button');
		
		// 根据动画设置决定是否应用过渡效果
		if (animation === false || animation === 'off') {
			// 关闭动画：移除所有过渡效果
			elements.forEach(el => {
				el.style.transition = 'none';
			});
		} else {
			// 开启动画：恢复默认过渡效果
			elements.forEach(el => {
				el.style.transition = ''; // 恢复CSS中定义的默认transition
			});
		}
	}
	
	/**
 * 保存当前设置到Chrome同步存储
 * 功能：将所有用户设置保存到Chrome的同步存储中，实现跨设备同步
 * 保存内容包括：搜索引擎、主题、背景、动画、各种背景参数等
 * 使用Chrome Storage API实现数据持久化
 */
	async function saveCurrentSettings() {
	// 使用与popup.js一致的存储格式和键名
	if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
		// 创建不包含大媒体数据的设置对象（与popup.js保持一致）
		const settingsToSave = { ...currentSettings };
		// 移除大媒体数据，避免超过存储限制
		delete settingsToSave.imageLight;
		delete settingsToSave.imageDark;
		delete settingsToSave.video;
		
		// 使用与popup.js相同的存储键名 suiYuanSettings
		chrome.storage.sync.set({ 
			suiYuanSettings: settingsToSave 
		}, function() {
			if (chrome.runtime.lastError) {
				console.error('保存设置失败:', chrome.runtime.lastError);
				return;
			}
			console.log('主题设置已保存到Chrome同步存储');
			
			// 通知所有起始页标签页更新设置
			chrome.tabs.query({}, function(tabs) {
				if (chrome.runtime.lastError) {
					console.error('查询所有标签失败:', chrome.runtime.lastError.message);
					return;
				}
				
				tabs.forEach(tab => {
					if (tab.url && tab.url.startsWith('chrome-extension://') && tab.url.includes('index.html')) {
						chrome.tabs.sendMessage(tab.id, { 
							action: 'updateSettings', 
							settings: currentSettings 
						}, function(response) {
							if (chrome.runtime.lastError) {
								// 忽略无法发送消息的标签
							}
						});
					}
				});
			});
			
			if (chrome.runtime && chrome.runtime.sendMessage) {
				chrome.runtime.sendMessage({ action: 'updateSettings', settings: currentSettings });
			}
		});
	} else {
		// Chrome扩展API不可用，使用localStorage作为备选方案
		console.log('Chrome扩展API不可用，使用localStorage保存设置');
		try {
			// 创建不包含大媒体数据的设置对象
			const settingsToSave = { ...currentSettings };
			// 移除大媒体数据，避免localStorage过大
			delete settingsToSave.imageLight;
			delete settingsToSave.imageDark;
			delete settingsToSave.video;
			
			localStorage.setItem('suiYuanSettings', JSON.stringify(settingsToSave));
			console.log('主题设置已保存到localStorage');
		} catch (error) {
			console.error('保存到localStorage失败:', error);
		}
	}
	
		// 异步保存媒体文件到本地存储（仅在存在Data URL时）
		try {
			if (currentSettings.imageLight) {
				const imageLightData = typeof currentSettings.imageLight === 'object' ? currentSettings.imageLight : { url: currentSettings.imageLight };
				const imageLightUrl = imageLightData.dataUrl || imageLightData.url;
				if (imageLightUrl) { await window.localMediaStorage.saveImage('light', imageLightUrl); }
			}
			if (currentSettings.imageDark) {
				const imageDarkData = typeof currentSettings.imageDark === 'object' ? currentSettings.imageDark : { url: currentSettings.imageDark };
				const imageDarkUrl = imageDarkData.dataUrl || imageDarkData.url;
				if (imageDarkUrl) { await window.localMediaStorage.saveImage('dark', imageDarkUrl); }
			}
			if (currentSettings.video && !currentSettings.video.temp) {
				const videoData = typeof currentSettings.video === 'object' ? currentSettings.video : { url: currentSettings.video };
				const videoUrl = videoData.dataUrl || videoData.url;
				if (videoUrl) { await window.localMediaStorage.saveVideo(videoUrl); }
			}
		} catch (error) {
			console.error('保存媒体文件到本地存储失败:', error);
		}
}
	
    
	
/**
 * 标题点击事件处理器 - 切换暗色/亮色模式
 * 功能：通过点击标题在暗色和亮色主题之间切换，使用遮蔽层实现平滑过渡效果
 * 实现原理：
 * 1. 显示预创建的黑色遮蔽层
 * 2. 延迟执行实际的主题切换操作
 * 3. 切换body的dark-mode类和更新设置
 * 4. 重新应用背景以适应新主题
 * 5. 淡出遮蔽层完成过渡动画
 */
	// 标题点击事件 - 切换暗色模式
	searchTitle.addEventListener('click', function() {
		// 第一步：显示遮蔽层，为过渡动画做准备
		transitionOverlay.style.opacity = '1';
		transitionOverlay.style.visibility = 'visible';
		
		// 第二步：延迟执行主题切换，等待遮蔽层完全显示
		setTimeout(() => {
			isDarkMode = !isDarkMode;
			
			if (isDarkMode) {
				document.body.classList.add('dark-mode');
				currentSettings.theme = 'dark';
			} else {
				document.body.classList.remove('dark-mode');
				currentSettings.theme = 'light';
			}
			
			// 第四步：重新应用背景设置，确保背景与新的主题状态匹配
		const previousBackground = currentSettings.background;
		applyBackground(currentSettings.background, previousBackground);
			
			// 第五步：保存新的主题设置到存储
			saveCurrentSettings();
			
			// 第六步：延迟隐藏遮蔽层，完成过渡动画
			setTimeout(() => {
				transitionOverlay.style.opacity = '0';
				transitionOverlay.style.visibility = 'hidden';
			}, 200);
		}, 300);
	});
	
	// 初始化默认搜索引擎图标
	circleDropdown.setAttribute('data-engine', 'bing');
	
	// 点击左侧圆形切换下拉菜单
	leftCircle.addEventListener('click', function(e) {
		e.stopPropagation();
		circleDropdown.classList.toggle('active');
	});
	
	// 使用事件委托处理下拉菜单项点击（支持动态添加的自定义引擎）
	document.querySelector('.dropdown-menu').addEventListener('click', function(e) {
		const dropdownItem = e.target.closest('.dropdown-item');
		if (dropdownItem) {
			e.stopPropagation();
			
			// 移除所有激活状态
			const allDropdownItems = document.querySelectorAll('.dropdown-item');
			allDropdownItems.forEach(i => i.classList.remove('active'));
			
			// 添加当前激活状态
			dropdownItem.classList.add('active');
			
			// 关闭下拉菜单
			circleDropdown.classList.remove('active');
			
			// 切换搜索引擎（标记为临时修改）
			const engine = dropdownItem.getAttribute('data-engine');
			switchSearchEngine(engine, true);
		}
	});
	
	/**
	 * 切换搜索引擎
	 * @param {string} engine - 搜索引擎标识：bing/google/baidu 或自定义引擎ID
	 * @param {boolean} isTemporary - 是否为临时切换（true表示临时，false表示永久）
	 * 功能：切换当前使用的搜索引擎，更新图标、占位符文本，支持自定义搜索引擎
	 */
function switchSearchEngine(engine, isTemporary = false) {
	const circleDropdown = document.querySelector('.circle-dropdown');
	
	// 更新左侧圆形容器的data-engine属性，用于CSS样式选择器
	circleDropdown.setAttribute('data-engine', engine);
	
	// 检查是否为自定义搜索引擎（用户添加的搜索引擎）
	const customEngine = currentSettings.customEngines.find(e => e.id === engine);
	
	// 如果是自定义搜索引擎，动态设置自定义图标
	if (customEngine && customEngine.icon) {
		// 创建或更新样式规则来显示自定义图标
		let styleElement = document.getElementById('custom-engine-icon-style');
		if (!styleElement) {
			styleElement = document.createElement('style');
			styleElement.id = 'custom-engine-icon-style';
			document.head.appendChild(styleElement);
		}
		
		// 添加CSS规则来设置自定义图标背景
		const cssRule = `.circle-dropdown[data-engine="${engine}"] .solid-circle::after { background-image: url('${customEngine.icon}'); }`;
		styleElement.textContent = cssRule;
	}
	
	// 根据搜索引擎类型设置相应的占位符文本
	if (customEngine) {
		textContent.setAttribute('data-placeholder', customEngine.name);
	} else {
		switch(engine) {
			case 'bing':
				textContent.setAttribute('data-placeholder', '必应搜索');
				break;
			case 'google':
				textContent.setAttribute('data-placeholder', '谷歌搜索');
				break;
			case 'baidu':
				textContent.setAttribute('data-placeholder', '百度搜索');
				break;
		}
	}
	
	// 只有在非临时切换时才更新当前设置（避免临时搜索影响默认设置）
	if (!isTemporary) {
		currentSettings.searchEngine = engine;
	}
	
	// 如果输入框当前为空，立即更新placeholder显示效果
	if (textContent.textContent.trim() === '') {
		// 通过重新赋值强制触发placeholder的重新渲染
		const temp = textContent.textContent;
		textContent.textContent = temp;
	}
}
	
	// 点击页面其他地方关闭下拉菜单
	document.addEventListener('click', function() {
		circleDropdown.classList.remove('active');
	});
	
	// 阻止下拉菜单内部点击事件冒泡（已在事件委托中处理）
	// document.querySelector('.dropdown-menu').addEventListener('click', function(e) {
	// 	e.stopPropagation();
	// });
	
	// 添加回车键搜索功能
	textContent.addEventListener('keydown', function(e) {
		if (e.key === 'Enter') {
			// 检查是否按下了Alt键
			if (e.altKey) {
				// Alt+Enter：允许换行，不阻止默认行为
				return;
			} else {
				// 单独Enter：执行搜索
				e.preventDefault();
				// 检查输入框是否为空，如果为空则不进行任何操作
				if (textContent.textContent.trim() !== '') {
					performSearch();
				}
			}
		}
	});
	
	// 右侧搜索按钮点击事件
	const searchButton = document.querySelector('.search-button');
	if (searchButton) {
		searchButton.addEventListener('click', function(e) {
			e.stopPropagation();
			performSearchOrGoHome();
		});
	} else {
		console.error('搜索按钮未找到');
	}
	
	/**
 * 执行搜索操作
 * 功能：根据当前选择的搜索引擎和用户输入的查询词，构建搜索URL并在新标签页中打开
 * 支持内置搜索引擎（必应、谷歌、百度）和用户自定义搜索引擎
 * 搜索完成后会清空输入框，如果是临时切换的搜索引擎会恢复默认设置
 */
	function performSearch() {
		// 获取用户输入的搜索文本
		const searchText = textContent.textContent.trim();
		if (searchText === '') {
			alert('请输入搜索内容');
			return;
		}
		
		// 获取当前选中的搜索引擎标识
		const activeItem = document.querySelector('.dropdown-item.active');
		const engine = activeItem.getAttribute('data-engine');
		
		// 记录当前是否为临时修改（用户临时切换搜索引擎进行搜索）
		const isTemporaryEngine = engine !== currentSettings.searchEngine;
		
		let searchUrl = '';
		
		// 检查是否为自定义搜索引擎
		const customEngine = currentSettings.customEngines.find(e => e.id === engine);
		if (customEngine) {
			searchUrl = customEngine.url.replace('%s', encodeURIComponent(searchText));
		} else {
			switch(engine) {
				case 'bing':
					// 必应搜索URL格式
					searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(searchText)}`;
					break;
				case 'google':
					// 谷歌搜索URL格式
					searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchText)}`;
					break;
				case 'baidu':
					// 百度搜索URL格式
					searchUrl = `https://www.baidu.com/s?wd=${encodeURIComponent(searchText)}`;
					break;
			}
		}
		
		// 在新窗口打开搜索结果页面
		if (searchUrl) {
			window.open(searchUrl, '_blank');
			// 清空搜索框内容，为下次搜索做准备
			textContent.textContent = '';
			
			// 如果是临时修改的搜索引擎，搜索后恢复默认设置
			// 这样可以保持用户的默认搜索引擎选择不变
			if (isTemporaryEngine) {
				setTimeout(() => {
					// 恢复默认搜索引擎的激活状态
					// 重新获取所有下拉菜单项，包括动态添加的自定义引擎
					const allDropdownItems = document.querySelectorAll('.dropdown-item');
					allDropdownItems.forEach(item => {
						item.classList.remove('active');
						if (item.getAttribute('data-engine') === currentSettings.searchEngine) {
							item.classList.add('active');
						}
					});
					// 切换回默认搜索引擎
					switchSearchEngine(currentSettings.searchEngine);
				}, 100);
			}
		}
	}
	
	/**
 * 搜索或进入官网函数
 * 功能：根据搜索框是否有内容，决定是执行搜索还是进入搜索引擎官网
 * - 无搜索内容时：进入当前选中搜索引擎的官网首页
 * - 有搜索内容时：执行搜索操作
 * 支持内置搜索引擎和自定义搜索引擎
 */
	function performSearchOrGoHome() {
		// 获取搜索框中的文本内容
		const searchText = textContent.textContent.trim();
		
		// 获取当前选中的搜索引擎标识
		const activeItem = document.querySelector('.dropdown-item.active');
		const engine = activeItem.getAttribute('data-engine');
		
		let targetUrl = '';
		
		// 检查是否为自定义搜索引擎
		const customEngine = currentSettings.customEngines.find(e => e.id === engine);
		
		if (searchText === '') {
			if (customEngine) {
				targetUrl = customEngine.homepage;
			} else {
				switch(engine) {
					case 'bing':
						targetUrl = 'https://www.bing.com';
						break;
					case 'google':
						targetUrl = 'https://www.google.com';
						break;
					case 'baidu':
						targetUrl = 'https://www.baidu.com';
						break;
				}
			}
		} else {
			if (customEngine) {
				targetUrl = customEngine.url.replace('%s', encodeURIComponent(searchText));
			} else {
				switch(engine) {
					case 'bing':
						targetUrl = `https://www.bing.com/search?q=${encodeURIComponent(searchText)}`;
						break;
					case 'google':
						targetUrl = `https://www.google.com/search?q=${encodeURIComponent(searchText)}`;
						break;
					case 'baidu':
						targetUrl = `https://www.baidu.com/s?wd=${encodeURIComponent(searchText)}`;
						break;
				}
			}
		}
		
		// 在新窗口打开目标页面
		if (targetUrl) {
			window.open(targetUrl, '_blank');
			
			// 如果执行了搜索操作（有搜索内容），清空搜索框
			// 这样用户可以方便地进行下一次搜索
			if (searchText !== '') {
				textContent.textContent = '';
			}
		}
	}
	
	/**
	 * 应用标题显示设置
	 * @param {string} displayMode - 显示类型：none（不显示）、text（文字标题）或time（时间显示）
	 * 功能：控制页面顶部显示内容，支持不显示、文字标题或实时时钟，支持秒数显示开关
	 */
	function applyTitleDisplay(displayMode) {
		if (timeUpdateInterval) {
			clearInterval(timeUpdateInterval);
			timeUpdateInterval = null;
		}
		
		if (displayMode === 'time') {
			// 时间显示模式：显示实时时钟，包含问候语和日期信息
			searchTitle.style.display = 'block'; // 确保标题元素可见
			searchTitle.style.color = currentSettings.titleFillColor || '#ffffff';
			searchTitle.style.webkitTextStroke = `1px ${currentSettings.titleOutlineColor || '#000000'}`;
			updateTime(); // 立即更新一次时间显示
			// 根据是否显示秒数决定更新频率：显示秒数时每秒更新，否则每分钟更新
			const updateInterval = currentSettings.showSeconds ? 1000 : 60000;
			timeUpdateInterval = setInterval(updateTime, updateInterval);
			console.log('已启用时间显示模式，更新间隔:', updateInterval + 'ms');
		} else if (displayMode === 'text') {
			// 文字标题模式：显示固定的应用名称
			searchTitle.style.display = 'block'; // 确保标题元素可见
			searchTitle.textContent = currentSettings.titleText || 'SuiYuan-Search';
			searchTitle.style.color = currentSettings.titleFillColor || '#ffffff';
			searchTitle.style.webkitTextStroke = `1px ${currentSettings.titleOutlineColor || '#000000'}`;
			// 重置字体大小为默认值
			searchTitle.style.fontSize = '';
			console.log('已启用标题文字显示模式');
		} else if (displayMode === 'none') {
			// 不显示标题模式：隐藏标题元素
			searchTitle.style.display = 'none';
			console.log('已启用不显示标题模式');
		}
	}
	
	/**
 * 更新时间显示函数
 * 功能：获取当前时间并格式化显示在页面标题区域
 * 支持显示/隐藏秒数，包含问候语和日期信息
 * 根据窗口大小自动调整字体大小，确保良好的显示效果
 */
	function updateTime() {
		// 获取当前时间对象
		const now = new Date();
		// 格式化时间组件，确保两位数显示
		const hours = String(now.getHours()).padStart(2, '0');
		const minutes = String(now.getMinutes()).padStart(2, '0');
		const seconds = String(now.getSeconds()).padStart(2, '0');
		
		// 根据用户设置决定是否显示秒数
		let timeString;
		if (currentSettings.showSeconds) {
			// 显示秒数：时:分:秒格式
			timeString = `${hours}:${minutes}:${seconds}`;
		} else {
			// 不显示秒数：时:分格式
			timeString = `${hours}:${minutes}`;
		}
		
		// 获取日期信息（用于控制台日志和可能的扩展功能）
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');
		const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
		const weekday = weekdays[now.getDay()];
		
		// 根据当前时间生成相应的问候语
		let greeting = '';
		if (hours >= 5 && hours < 9) {
			greeting = '早安';      // 早晨5-9点
		} else if (hours >= 9 && hours < 12) {
			greeting = '上午好';   // 上午9-12点
		} else if (hours >= 12 && hours < 14) {
			greeting = '中午好';   // 中午12-14点
		} else if (hours >= 14 && hours < 18) {
			greeting = '下午好';   // 下午14-18点
		} else if (hours >= 18 && hours < 22) {
			greeting = '晚上好';   // 晚上18-22点
		} else {
			greeting = '夜深了';   // 深夜22-5点
		}
		
		// 当前只显示时间，日期和问候语保留用于控制台日志
		const displayText = `${timeString}`;
		// 更新页面标题显示
		searchTitle.textContent = displayText;
		
		// 根据窗口大小动态调整时间字体大小，确保在不同设备上都有良好的显示效果
		updateTimeFontSize();
		
		// 在控制台输出详细的时间信息，便于调试和日志记录
		console.log(`时间更新: ${displayText} | ${year}年${month}月${day}日 ${weekday} ${greeting}`);
	}
	
	// 监听窗口大小变化，更新时间字体大小
	window.addEventListener('resize', () => {
		if (currentSettings.titleDisplay === 'time' || currentSettings.titleDisplay === 'text') {
			updateTimeFontSize();
		}
	});
	
	/**
 * 监听主题变化并同步到Chrome存储
 * 功能：检测页面主题模式的变化，并将新的主题设置保存到Chrome同步存储
 * 用途：确保多个标签页之间的主题设置保持同步，以及下次打开页面时恢复用户的主题偏好
 */
	function syncThemeToSettings() {
		// 检查body元素是否包含dark-mode类，判断当前是否为暗色模式
		const isDarkMode = document.body.classList.contains('dark-mode');
		// 将暗色模式状态转换为主题字符串
		const newTheme = isDarkMode ? 'dark' : 'light';
		
		// 检查主题是否真的发生了变化，避免不必要的存储操作
		if (currentSettings.theme !== newTheme) {
			// 更新内存中的当前设置
			currentSettings.theme = newTheme;
			// 将新的主题设置保存到Chrome同步存储
			chrome.storage.sync.set({ theme: newTheme }, () => {
				console.log('主题变化已同步到设置:', newTheme);
			});
		}
	}
	
	// 创建一个MutationObserver来监听body class的变化
	const themeObserver = new MutationObserver((mutations) => {
		mutations.forEach((mutation) => {
			if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
				syncThemeToSettings();
			}
		});
	});
	
	// 开始观察body元素的class变化
	themeObserver.observe(document.body, {
		attributes: true,
		attributeFilter: ['class']
	});
	
	// 初始同步一次主题
	syncThemeToSettings();
	
	// 根据窗口宽度设置字体大小
	function updateTimeFontSize() {
		// 如果当前不显示标题，则不执行字体大小调整
		if (currentSettings.titleDisplay === 'none') {
			return;
		}
		
		const windowWidth = window.innerWidth;
		let fontSize;
		
		// 根据窗口宽度设置字体大小
		if (windowWidth < 768) {
			// 移动设备
			fontSize = Math.max(24, Math.min(48, windowWidth / 12));
		} else if (windowWidth < 1200) {
			// 平板设备
			fontSize = Math.max(32, Math.min(64, windowWidth / 15));
		} else {
			// 桌面设备
			fontSize = Math.max(40, Math.min(80, windowWidth / 20));
		}
		
		// 应用字体大小
		searchTitle.style.fontSize = `${fontSize}px`;
		
		// 根据是否显示秒数调整更新间隔
		if (timeUpdateInterval) {
			clearInterval(timeUpdateInterval);
			const updateInterval = currentSettings.showSeconds ? 1000 : 60000; // 显示秒数时每秒更新，否则每分钟更新
			timeUpdateInterval = setInterval(updateTime, updateInterval);
		}
		
		console.log(`时间字体大小已更新: ${fontSize}px, 窗口宽度: ${windowWidth}px`);
	}
	
	// 获取DOM元素
const bookmarksToggle = document.getElementById('bookmarks-toggle');
const bookmarksContent = document.getElementById('bookmarks-content');
	let isBookmarksExpanded = false;
	
	// 默认收藏夹数据
	const defaultBookmarks = [
		{ title: 'GitHub', url: 'https://github.com', icon: 'https://github.com/favicon.ico' },
		{ title: 'Google', url: 'https://www.google.com', icon: 'https://www.google.com/favicon.ico' },
		{ title: 'Bilibili', url: 'https://www.bilibili.com', icon: 'https://www.bilibili.com/favicon.ico' },
		{ title: '知乎', url: 'https://www.zhihu.com', icon: 'https://www.zhihu.com/favicon.ico' },
		{ title: '微博', url: 'https://weibo.com', icon: 'https://weibo.com/favicon.ico' },
		{ title: '淘宝', url: 'https://www.taobao.com', icon: 'https://www.taobao.com/favicon.ico' }
	];
	
	// 加载收藏夹
	// 排序收藏夹
	function sortBookmarks(bookmarks, sortOrder) {
		const sortedBookmarks = [...bookmarks];
		
		switch (sortOrder) {
			case 'alpha-asc':
				sortedBookmarks.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
				break;
			case 'alpha-desc':
				sortedBookmarks.sort((a, b) => b.title.localeCompare(a.title, 'zh-CN'));
				break;
			case 'custom':
				// 自定义排序保持当前顺序
				break;
			case 'default':
			default:
				// 保持原有顺序
				break;
		}
		
		return sortedBookmarks;
	}
	
	function loadBookmarks() {
		if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
			chrome.storage.sync.get(['bookmarks', 'bookmarkSortOrder'], function(result) {
				let bookmarks = result.bookmarks;
				
				// 如果没有保存的收藏夹，检查localStorage中是否有数据
				if (!bookmarks) {
					const savedBookmarks = localStorage.getItem('bookmarks');
					if (savedBookmarks) {
						try {
							bookmarks = JSON.parse(savedBookmarks);
							// 将localStorage中的数据同步到Chrome存储
							chrome.storage.sync.set({ bookmarks: bookmarks });
						} catch (e) {
							bookmarks = defaultBookmarks;
						}
					} else {
						bookmarks = defaultBookmarks;
					}
				}
				
				const sortOrder = result.bookmarkSortOrder || 'default';
				bookmarks = sortBookmarks(bookmarks, sortOrder);
				renderBookmarks(bookmarks);
			});
		} else {
			// 使用localStorage作为备选方案
			const savedBookmarks = localStorage.getItem('bookmarks');
			let bookmarks = savedBookmarks ? JSON.parse(savedBookmarks) : defaultBookmarks;
			
			const savedSortOrder = localStorage.getItem('bookmarkSortOrder');
			const sortOrder = savedSortOrder ? JSON.parse(savedSortOrder) : 'default';
			
			bookmarks = sortBookmarks(bookmarks, sortOrder);
			renderBookmarks(bookmarks);
		}
	}
	
	// 渲染收藏夹（桌面端）
	function renderBookmarks(bookmarks) {
		const bookmarksBar = document.querySelector('.bookmarks-bar');
		
		// 如果收藏夹为空，隐藏收藏夹栏
		if (!bookmarks || bookmarks.length === 0) {
			if (bookmarksBar) {
				bookmarksBar.style.display = 'none';
			}
			return;
		}
		
		// 收藏夹不为空，根据用户设置显示收藏夹栏
		if (bookmarksBar) {
			// 检查用户是否手动关闭了收藏夹栏
			if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
				chrome.storage.sync.get(['bookmarkBarVisible'], (result) => {
					const isVisible = result.bookmarkBarVisible !== false; // 默认显示
					bookmarksBar.style.display = isVisible ? 'flex' : 'none';
				});
			} else {
				const isVisible = localStorage.getItem('bookmarkBarVisible') !== 'false'; // 默认显示
				bookmarksBar.style.display = isVisible ? 'flex' : 'none';
			}
		}
		
		bookmarksContent.innerHTML = '';
		
		const windowWidth = window.innerWidth;
		const maxVisibleBookmarks = getMaxVisibleBookmarks(windowWidth);
		
		if (bookmarks.length <= maxVisibleBookmarks) {
			// 收藏数量较少，全部显示
			bookmarks.forEach((bookmark, index) => {
				const bookmarkItem = createBookmarkElement(bookmark, index);
				if (bookmarkItem) {
					bookmarksContent.appendChild(bookmarkItem);
				}
			});
		} else {
			// 收藏数量较多，显示前N个和"更多"按钮
			const visibleBookmarks = bookmarks.slice(0, maxVisibleBookmarks);
			const hiddenBookmarks = bookmarks.slice(maxVisibleBookmarks);
			
			// 显示可见的收藏
			visibleBookmarks.forEach((bookmark, index) => {
				const bookmarkItem = createBookmarkElement(bookmark, index);
				if (bookmarkItem) {
					bookmarksContent.appendChild(bookmarkItem);
				}
			});
			
			// 创建折叠/展开按钮
			const collapseButton = createCollapseButton(hiddenBookmarks, bookmarks, bookmarksContent, maxVisibleBookmarks);
			bookmarksContent.appendChild(collapseButton);
		}
		
		// 添加拖拽排序功能
		addDragSortFunctionality(bookmarksContent, bookmarks);
	}
	
	// 获取当前窗口宽度下最多显示的收藏数量
	function getMaxVisibleBookmarks(windowWidth) {
		if (windowWidth < 768) {
			return 0; // 移动端不显示任何收藏夹，全部进入二级菜单
		} else if (windowWidth < 1200) {
			return 5; // 平板端最多显示5个
		} else {
			return 7; // 桌面端最多显示7个
		}
	}
	
	// 创建折叠/展开按钮
	function createCollapseButton(hiddenBookmarks, allBookmarks, container, maxVisible) {
		const collapseButton = document.createElement('div');
		collapseButton.className = 'bookmark-item bookmark-collapse';
		collapseButton.style.cursor = 'pointer';
		collapseButton.style.background = 'rgba(57, 197, 187, 0.3)';
		collapseButton.style.border = '1px solid rgba(57, 197, 187, 0.5)';
		
		const icon = document.createElement('span');
		icon.className = 'bookmark-icon collapse-icon';
		icon.innerHTML = '▼'; // 展开图标
		icon.style.display = 'flex';
		icon.style.alignItems = 'center';
		icon.style.justifyContent = 'center';
		icon.style.fontSize = '14px';
		icon.style.color = '#39c5bb';
		icon.style.transition = 'transform 0.3s ease';
		
		const title = document.createElement('span');
		title.className = 'bookmark-title collapse-text';
		title.textContent = `展开收藏夹(${hiddenBookmarks.length})`;
		title.style.fontWeight = 'bold';
		
		collapseButton.appendChild(icon);
		collapseButton.appendChild(title);
		
		// 创建二级菜单容器
		const expandMenu = document.createElement('div');
		expandMenu.className = 'bookmark-expand-menu';
		
		// 添加隐藏的收藏到二级菜单
		hiddenBookmarks.forEach(bookmark => {
			const bookmarkElement = createBookmarkElement(bookmark);
			if (bookmarkElement) {
				expandMenu.appendChild(bookmarkElement);
			}
		});
		
		// 将二级菜单添加到收藏夹栏容器
		const bookmarksBar = container.closest('.bookmarks-bar');
		bookmarksBar.appendChild(expandMenu);
		
		let isExpanded = false;
		
		// 点击折叠/展开按钮
		collapseButton.addEventListener('click', (e) => {
			e.stopPropagation();
			isExpanded = !isExpanded;
			
			if (isExpanded) {
				// 展开状态：显示二级菜单
				icon.innerHTML = '▲';
				title.textContent = `折叠收藏夹(${hiddenBookmarks.length})`;
				icon.style.transform = 'rotate(180deg)';
				
				// 计算二级菜单位置 - 页面居中
				const buttonRect = collapseButton.getBoundingClientRect();
				const bookmarksBarRect = bookmarksBar.getBoundingClientRect();
				const menuWidth = bookmarksBarRect.width;
				
				// 页面居中显示
				expandMenu.style.bottom = (window.innerHeight - buttonRect.top + 8) + 'px';
				expandMenu.style.left = '50%';
				expandMenu.style.transform = 'translateX(-50%) translateY(-10px)';
				expandMenu.style.width = menuWidth + 'px';
				
				// 显示二级菜单
				expandMenu.style.display = 'flex';
				// 延迟显示以实现淡入效果
				setTimeout(() => {
					expandMenu.style.opacity = '1';
					expandMenu.style.transform = 'translateX(-50%) translateY(0)';
				}, 10);
				
			} else {
				// 折叠状态：隐藏二级菜单
				icon.innerHTML = '▼';
				title.textContent = `展开收藏夹(${hiddenBookmarks.length})`;
				icon.style.transform = 'rotate(0deg)';
				
				expandMenu.style.opacity = '0';
				expandMenu.style.transform = 'translateX(-50%) translateY(-10px)';
				setTimeout(() => {
					expandMenu.style.display = 'none';
				}, 300);
			}
		});
		
		// 点击页面其他地方关闭二级菜单
		document.addEventListener('click', (e) => {
			if (isExpanded && !collapseButton.contains(e.target) && !expandMenu.contains(e.target)) {
				isExpanded = false;
				icon.innerHTML = '▼';
				title.textContent = `展开收藏夹(${hiddenBookmarks.length})`;
				icon.style.transform = 'rotate(0deg)';
				
				expandMenu.style.opacity = '0';
				expandMenu.style.transform = 'translateX(-50%) translateY(-10px)';
				setTimeout(() => {
					expandMenu.style.display = 'none';
				}, 300);
			}
		});
		
		// 暗色模式适配
		if (document.body.classList.contains('dark-mode')) {
			expandMenu.style.background = 'rgba(0, 0, 0, 0.9)';
			expandMenu.style.border = '1px solid rgba(255, 255, 255, 0.1)';
		}
		
		return collapseButton;
	}
	
	// 创建收藏夹元素
	function createBookmarkElement(bookmark, index) {
		// 检查bookmark对象是否存在且有效
		if (!bookmark || typeof bookmark !== 'object') {
			return null;
		}
		
		const bookmarkItem = document.createElement('a');
		bookmarkItem.href = bookmark.url || '#';
		bookmarkItem.className = 'bookmark-item';
		bookmarkItem.target = '_blank';
		bookmarkItem.setAttribute('data-index', index);
		bookmarkItem.draggable = true;
		
		const icon = document.createElement('img');
		icon.className = 'bookmark-icon';
		icon.src = bookmark.icon || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTggMTVMMTMuNSA5LjVIMTBWNEg2VjkuNUgyLjVMOCAxNVoiIGZpbGw9IiM5OTk5OTkiLz4KPC9zdmc+';
		icon.alt = bookmark.title || '未知网站';
		icon.onerror = function() {
			// 如果图标加载失败，使用默认图标
			this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTggMTVMMTMuNSA5LjVIMTBWNEg2VjkuNUgyLjVMOCAxNVoiIGZpbGw9IiM5OTk5OTkiLz4KPC9zdmc+';
		};
		
		const title = document.createElement('span');
		title.className = 'bookmark-title';
		title.textContent = bookmark.title || '未知网站';
		
		bookmarkItem.appendChild(icon);
		bookmarkItem.appendChild(title);
		
		return bookmarkItem;
	}
	
	// 切换收藏夹展开/收起
	function toggleBookmarks() {
		isBookmarksExpanded = !isBookmarksExpanded;
		
		// 移动端：切换收藏夹内容的显示/隐藏
		if (window.innerWidth <= 768) {
			if (isBookmarksExpanded) {
				bookmarksContent.style.display = 'flex';
				bookmarksToggle.textContent = '收起收藏夹';
			} else {
				bookmarksContent.style.display = 'none';
				bookmarksToggle.textContent = '展开收藏夹';
			}
		} else {
			// 桌面端：原有的展开/收起逻辑
			if (isBookmarksExpanded) {
				bookmarksContent.classList.add('bookmarks-expanded');
				bookmarksToggle.textContent = '收起收藏夹';
			} else {
				bookmarksContent.classList.remove('bookmarks-expanded');
				bookmarksToggle.textContent = '展开收藏夹';
			}
		}
	}
	
	// 收藏夹切换按钮事件
	if (bookmarksToggle) {
		bookmarksToggle.addEventListener('click', toggleBookmarks);
	}
	
	// 初始化收藏夹
	loadBookmarks();
	
	// 初始化收藏夹栏显示状态
	function initBookmarkBarVisibility() {
		try {
			if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
				chrome.storage.sync.get(['bookmarkBarVisible', 'bookmarkBarEnabled'], (result) => {
					const bookmarksBar = document.querySelector('.bookmarks-bar');
					if (bookmarksBar) {
						// 优先使用bookmarkBarVisible，如果不存在则使用bookmarkBarEnabled
						const isVisible = result.bookmarkBarVisible !== undefined ? result.bookmarkBarVisible : 
											(result.bookmarkBarEnabled !== undefined ? result.bookmarkBarEnabled : true);
						bookmarksBar.style.display = isVisible ? 'flex' : 'none';
					}
				});
			} else {
				// 使用localStorage
				const savedVisible = localStorage.getItem('bookmarkBarVisible');
				const savedEnabled = localStorage.getItem('bookmarkBarEnabled');
				// 优先使用bookmarkBarVisible，如果不存在则使用bookmarkBarEnabled
				const isVisible = savedVisible !== undefined ? JSON.parse(savedVisible) : 
									(savedEnabled !== undefined ? JSON.parse(savedEnabled) : true);
				const bookmarksBar = document.querySelector('.bookmarks-bar');
				if (bookmarksBar) {
					bookmarksBar.style.display = isVisible ? 'flex' : 'none';
				}
			}
		} catch (error) {
			console.log('初始化收藏夹栏显示状态失败:', error);
		}
	}
	
	// 监听收藏夹栏设置变化
	function listenForBookmarkBarChanges() {
		try {
			if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged && chrome.storage.onChanged.addListener) {
				chrome.storage.onChanged.addListener((changes, namespace) => {
					if (namespace === 'sync' && (changes.bookmarkBarVisible || changes.bookmarkBarEnabled)) {
						// 优先使用bookmarkBarVisible的变化，如果没有则使用bookmarkBarEnabled的变化
						const isVisible = changes.bookmarkBarVisible ? changes.bookmarkBarVisible.newValue : 
											(changes.bookmarkBarEnabled ? changes.bookmarkBarEnabled.newValue : true);
						const bookmarksBar = document.querySelector('.bookmarks-bar');
						if (bookmarksBar) {
							bookmarksBar.style.display = isVisible ? 'flex' : 'none';
						}
					}
					
					// 监听收藏夹排序变化
					if (namespace === 'sync' && changes.bookmarkSortOrder) {
						console.log('检测到收藏夹排序变化，重新加载');
						loadBookmarks();
					}
				});
			} else {
				// 使用localStorage事件监听
		window.addEventListener('storage', (e) => {
			if (e.key === 'bookmarkBarVisible' || e.key === 'bookmarkBarEnabled') {
				const isVisible = e.newValue !== null ? JSON.parse(e.newValue) : true;
				const bookmarksBar = document.querySelector('.bookmarks-bar');
				if (bookmarksBar) {
					bookmarksBar.style.display = isVisible ? 'flex' : 'none';
				}
			}
			
			// 监听收藏夹排序变化
			if (e.key === 'bookmarkSortOrder') {
				console.log('检测到收藏夹排序变化，重新加载');
				loadBookmarks();
			}
			
			// 监听收藏夹更新
			if (e.key === 'bookmarksUpdated') {
				console.log('检测到收藏夹更新，重新加载');
				loadBookmarks();
			}
			
			// 监听收藏夹排序变化（来自popup）
			if (e.key === 'bookmarkSortChanged') {
				console.log('检测到收藏夹排序变化（来自popup），重新加载');
				loadBookmarks();
			}
		});
				
				// 定期检查收藏夹栏设置变化
				setInterval(() => {
					const currentBookmarkBarVisible = localStorage.getItem('bookmarkBarVisible');
					const currentBookmarkBarEnabled = localStorage.getItem('bookmarkBarEnabled');
					
					// 检查bookmarkBarVisible变化
					if (currentBookmarkBarVisible !== window.lastBookmarkBarVisibleData) {
						window.lastBookmarkBarVisibleData = currentBookmarkBarVisible;
						const isVisible = currentBookmarkBarVisible !== null ? JSON.parse(currentBookmarkBarVisible) : true;
						const bookmarksBar = document.querySelector('.bookmarks-bar');
						if (bookmarksBar) {
							bookmarksBar.style.display = isVisible ? 'flex' : 'none';
						}
					}
					
					// 检查bookmarkBarEnabled变化（作为备用）
					if (currentBookmarkBarEnabled !== window.lastBookmarkBarEnabledData) {
						window.lastBookmarkBarEnabledData = currentBookmarkBarEnabled;
						// 只有当bookmarkBarVisible不存在时才使用bookmarkBarEnabled
						if (currentBookmarkBarVisible === null) {
							const isVisible = currentBookmarkBarEnabled !== null ? JSON.parse(currentBookmarkBarEnabled) : true;
							const bookmarksBar = document.querySelector('.bookmarks-bar');
							if (bookmarksBar) {
								bookmarksBar.style.display = isVisible ? 'flex' : 'none';
							}
						}
					}
					
					// 定期检查收藏夹排序变化
					const currentSortOrder = localStorage.getItem('bookmarkSortOrder');
					if (currentSortOrder !== window.lastBookmarkSortOrderData) {
						window.lastBookmarkSortOrderData = currentSortOrder;
						loadBookmarks();
					}
				}, 1000);
			}
		} catch (error) {
			console.log('监听收藏夹栏设置变化失败:', error);
		}
	}
	
	// 初始化收藏夹栏显示状态和监听器
	initBookmarkBarVisibility();
	listenForBookmarkBarChanges();
	
	// 页面加载完成后确保收藏夹栏状态正确
	document.addEventListener('DOMContentLoaded', function() {
		console.log('页面加载完成，重新初始化收藏夹栏状态');
		initBookmarkBarVisibility();
		loadBookmarks();
	});
	
	// 如果页面已经加载完成，立即执行初始化
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', function() {
			console.log('DOM加载中，等待完成后初始化收藏夹栏状态');
			initBookmarkBarVisibility();
			loadBookmarks();
		});
	} else {
		console.log('DOM已加载完成，立即初始化收藏夹栏状态');
		initBookmarkBarVisibility();
		loadBookmarks();
	}
	
	// 监听Chrome存储变化，实现实时更新
	try {
		if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync && chrome.storage.onChanged && chrome.storage.onChanged.addListener) {
			chrome.storage.onChanged.addListener((changes, namespace) => {
				if (namespace === 'sync' && changes.bookmarks) {
					console.log('检测到收藏夹变化，重新加载');
					loadBookmarks();
				}
			});
		} else {
			throw new Error('Chrome storage API not available');
		}
	} catch (error) {
		console.log('使用localStorage监听方案:', error.message);
		// 如果Chrome API不可用，使用localStorage事件监听
		window.addEventListener('storage', (e) => {
			if (e.key === 'bookmarks') {
				console.log('检测到收藏夹变化，重新加载');
				loadBookmarks();
			}
			
			// 监听收藏夹更新
			if (e.key === 'bookmarksUpdated') {
				console.log('检测到收藏夹更新，重新加载');
				loadBookmarks();
			}
			
			// 监听收藏夹排序变化（来自popup）
			if (e.key === 'bookmarkSortChanged') {
				console.log('检测到收藏夹排序变化（来自popup），重新加载');
				loadBookmarks();
			}
		});
		
		// 定期检查localStorage变化（作为备用方案）
		setInterval(() => {
			const currentBookmarks = localStorage.getItem('bookmarks');
			if (currentBookmarks !== window.lastBookmarksData) {
				window.lastBookmarksData = currentBookmarks;
				console.log('定期检查发现收藏夹变化，重新加载');
				loadBookmarks();
			}
		}, 1000);
	}
	
	// 监听窗口大小变化，自动调整收藏夹显示
	window.addEventListener('resize', () => {
		const bookmarksContent = document.getElementById('bookmarks-content');
		
		// 无论窗口宽度如何，都始终显示收藏夹内容
		if (bookmarksContent) {
			bookmarksContent.style.display = 'flex';
		}
		
		// 关闭所有已打开的二级菜单
		const expandMenus = document.querySelectorAll('.bookmark-expand-menu');
		expandMenus.forEach(menu => {
			menu.style.opacity = '0';
			menu.style.transform = 'translateX(-50%) translateY(-10px)';
			setTimeout(() => {
				menu.style.display = 'none';
			}, 300);
		});
		
		// 重置所有展开按钮状态
		const collapseButtons = document.querySelectorAll('.bookmark-collapse');
		collapseButtons.forEach(button => {
			const icon = button.querySelector('.collapse-icon');
			const title = button.querySelector('.collapse-text');
			if (icon && title) {
				icon.innerHTML = '▼';
				icon.style.transform = 'rotate(0deg)';
				// 重新计算隐藏的收藏数量
				const hiddenCount = parseInt(title.textContent.match(/\d+/)?.[0] || '0');
				title.textContent = `展开收藏夹(${hiddenCount})`;
			}
		});
		
		// 重新渲染收藏夹以适应新的窗口大小
		loadBookmarks();
	});
	
	// 初始化时检查窗口大小
	const resizeEvent = new Event('resize');
	window.dispatchEvent(resizeEvent);
	
	// 拖拽排序功能
	function addDragSortFunctionality(container, bookmarks) {
		let draggedElement = null;
		let draggedIndex = null;
		let placeholder = null;
		
		// 创建占位符
		function createPlaceholder() {
			const placeholder = document.createElement('div');
			placeholder.className = 'bookmark-placeholder';
			placeholder.style.cssText = `
				height: 40px;
				background: rgba(57, 197, 187, 0.2);
				border: 2px dashed #39c5bb;
				border-radius: 6px;
				margin: 0 4px;
				flex-shrink: 0;
			`;
			return placeholder;
		}
		
		// 为所有收藏夹项添加拖拽事件
		container.querySelectorAll('.bookmark-item').forEach((item, index) => {
			item.addEventListener('dragstart', function(e) {
				draggedElement = this;
				draggedIndex = parseInt(this.getAttribute('data-index'));
				this.classList.add('dragging');
				e.dataTransfer.effectAllowed = 'move';
				e.dataTransfer.setData('text/html', this.innerHTML);
				
				// 创建占位符
				if (!placeholder) {
					placeholder = createPlaceholder();
				}
			});

			item.addEventListener('dragend', function(e) {
				this.classList.remove('dragging');
				
				// 移除占位符
				if (placeholder && placeholder.parentNode) {
					placeholder.parentNode.removeChild(placeholder);
				}
				placeholder = null;
				draggedElement = null;
				draggedIndex = null;
			});

			item.addEventListener('dragover', function(e) {
				if (e.preventDefault) {
					e.preventDefault();
				}
				
				e.dataTransfer.dropEffect = 'move';
				
				// 确保占位符存在
				if (!placeholder) {
					placeholder = createPlaceholder();
				}
				
				// 计算鼠标在元素中的位置
				const rect = this.getBoundingClientRect();
				const midpoint = rect.left + rect.width / 2;
				const isBefore = e.clientX < midpoint;
				
				// 插入占位符
				if (isBefore) {
					// 插入到当前元素之前
					if (this.previousSibling !== placeholder) {
						this.parentNode.insertBefore(placeholder, this);
					}
				} else {
					// 插入到当前元素之后
					if (this.nextSibling !== placeholder) {
						if (this.nextSibling) {
							this.parentNode.insertBefore(placeholder, this.nextSibling);
						} else {
							this.parentNode.appendChild(placeholder);
						}
					}
				}
				
				return false;
			});

			item.addEventListener('drop', function(e) {
				if (e.stopPropagation) {
					e.stopPropagation();
				}
				
				// 获取所有收藏夹项（不包括占位符）
				const allItems = Array.from(container.querySelectorAll('.bookmark-item:not(.bookmark-placeholder)'));
				
				// 找到占位符的当前位置
				let newPosition = -1;
				if (placeholder && placeholder.parentNode) {
					const itemsWithPlaceholder = Array.from(container.children);
					newPosition = itemsWithPlaceholder.indexOf(placeholder);
					
					// 如果占位符在最后，新位置就是数组长度
					if (newPosition >= allItems.length) {
						newPosition = allItems.length;
					}
				}
				
				// 如果没有找到占位符，不进行排序
				if (newPosition === -1) {
					return false;
				}
				
				// 重新排序收藏夹数据
				if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
					chrome.storage.sync.get(['bookmarks'], function(result) {
						let bookmarks = result.bookmarks || [];
						const draggedBookmark = bookmarks[draggedIndex];
						
						// 移除原位置的收藏
						bookmarks.splice(draggedIndex, 1);
						
						// 调整新位置（如果原位置在新位置之前，新位置需要减1）
						if (draggedIndex < newPosition) {
							newPosition = newPosition - 1;
						}
						
						// 插入到新位置
						bookmarks.splice(newPosition, 0, draggedBookmark);
						
						// 保存并重新渲染
						chrome.storage.sync.set({ bookmarks: bookmarks }, function() {
							console.log('收藏夹顺序已更新');
							loadBookmarks();
						});
						
						// 通知popup页面收藏夹排序变化
						localStorage.setItem('bookmarkSortChanged', JSON.stringify({
							sortOrder: 'custom',
							timestamp: Date.now()
						}));
					});
				} else {
					const savedBookmarks = localStorage.getItem('bookmarks');
					let bookmarks = savedBookmarks ? JSON.parse(savedBookmarks) : [];
					const draggedBookmark = bookmarks[draggedIndex];
					
					// 移除原位置的收藏
					bookmarks.splice(draggedIndex, 1);
					
					// 调整新位置（如果原位置在新位置之前，新位置需要减1）
					if (draggedIndex < newPosition) {
						newPosition = newPosition - 1;
					}
					
					// 插入到新位置
					bookmarks.splice(newPosition, 0, draggedBookmark);
					
					// 保存并重新渲染
					localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
					console.log('收藏夹顺序已更新');
					loadBookmarks();
					
					// 通知popup页面收藏夹排序变化
					localStorage.setItem('bookmarkSortChanged', JSON.stringify({
						sortOrder: 'custom',
						timestamp: Date.now()
					}));
				}
				
				return false;
			});
		});
	}
});