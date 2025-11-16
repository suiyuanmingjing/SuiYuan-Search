/**
 * SuiYuan Search 扩展设置页面脚本
 * 功能：管理扩展的各种设置选项，包括搜索引擎、主题、背景、动画等
 * 使用Chrome Storage API保存和同步设置
 */

// ==================== 工具函数 ====================

/**
 * 文件管理工具函数
 * 将用户上传的文件复制到userimg文件夹并重命名
 */

/**
 * 生成唯一文件名
 * @param {string} originalName - 原始文件名
 * @param {string} type - 文件类型 ('image' 或 'video')
 * @returns {string} 新的文件名
 */
function generateUniqueFileName(originalName, type) {
	const timestamp = Date.now();
	const randomSuffix = Math.floor(Math.random() * 1000);
	const fileExtension = originalName.split('.').pop();
	const prefix = type === 'video' ? 'bg_video' : 'bg_image';
	return `${prefix}_${timestamp}_${randomSuffix}.${fileExtension}`;
}

/**
 * 模拟文件复制到userimg文件夹
 * 在Chrome扩展环境中，我们将使用Chrome本地存储API来模拟文件系统操作
 * @param {File} file - 要复制的文件对象
 * @param {string} newFileName - 新文件名
 * @returns {Promise<Object>} 包含文件路径和信息的对象
 */
async function copyFileToUserImg(file, newFileName) {
    return new Promise(async (resolve, reject) => {
        try {
            const maxSize = 1024 * 1024 * 200;
            if (file.size > maxSize) { reject(new Error('文件过大')); return; }
            await window.localMediaStorage.put(newFileName, file, file.type);
            const fileInfo = {
                originalName: file.name,
                savedName: newFileName,
                filePath: `userimg/${newFileName}`,
                size: file.size,
                type: file.type,
                lastUpdated: new Date().toISOString()
            };
            resolve(fileInfo);
        } catch (e) { reject(e); }
    });
}

/**
 * 从userimg文件夹获取文件
 * @param {string} fileName - 文件名
 * @returns {Promise<string>} 文件的Data URL
 */
async function getFileFromUserImg(fileName) {
    const url = await window.localMediaStorage.getUrl(fileName);
    if (url) return url;
    const storageKey = `userimg_${fileName}`;
    return new Promise((resolve, reject) => {
        const chromeApiAvailable = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
        if (chromeApiAvailable) {
            if (chrome.runtime) { chrome.runtime.lastError = null; }
            chrome.storage.local.get([storageKey], function(result) {
                if (chrome.runtime && chrome.runtime.lastError) {
                    try { const data = localStorage.getItem(storageKey); if (data) { resolve(JSON.parse(data).fileData); } else { reject(new Error('文件不存在')); } } catch (e) { reject(new Error('Chrome存储和localStorage都失败: ' + e.message)); }
                } else if (result[storageKey]) {
                    resolve(result[storageKey].fileData);
                } else {
                    try { const data = localStorage.getItem(storageKey); if (data) { resolve(JSON.parse(data).fileData); } else { reject(new Error('文件不存在')); } } catch (e) { reject(new Error('文件不存在')); }
                }
            });
        } else {
            try { const data = localStorage.getItem(storageKey); if (data) { resolve(JSON.parse(data).fileData); } else { reject(new Error('文件不存在')); } } catch (e) { reject(e); }
        }
    });
}

/**
 * 删除userimg文件夹中的文件
 * @param {string} fileName - 文件名
 * @returns {Promise<boolean>} 删除是否成功
 */
async function deleteFileFromUserImg(fileName) {
	return new Promise((resolve) => {
		const storageKey = `userimg_${fileName}`;
		
		if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
			chrome.storage.local.remove([storageKey], function() {
				if (chrome.runtime.lastError) {
					console.error('删除文件失败:', chrome.runtime.lastError);
					resolve(false);
				} else {
					console.log(`文件已删除: ${fileName}`);
					resolve(true);
				}
			});
		} else {
			// 备选方案：使用localStorage
			try {
				localStorage.removeItem(storageKey);
				console.log(`文件已删除: ${fileName}`);
				resolve(true);
			} catch (error) {
				console.error('删除文件失败:', error);
				resolve(false);
			}
		}
	});
}

/**
 * 显示状态消息
 * @param {string} message - 要显示的消息
 * @param {string} type - 消息类型 ('success' 或 'error')
 * @param {number} duration - 显示时长（毫秒），默认3000
 */
function showStatus(message, type = 'success', duration = 3000) {
	const statusElement = document.getElementById('statusMessage');
	if (!statusElement) {
		console.error('找不到状态消息元素');
		return;
	}
	
	// 设置消息内容
	statusElement.textContent = message;
	
	// 设置样式类
	statusElement.className = 'status-message';
	statusElement.classList.add(type);
	
	// 显示消息
	statusElement.style.display = 'block';
	
	// 自动隐藏
	if (duration > 0) {
		setTimeout(() => {
			statusElement.style.display = 'none';
		}, duration);
	}
}

// 等待DOM完全加载后再执行初始化操作
document.addEventListener('DOMContentLoaded', function() {
	console.log('Popup页面加载完成');
	
	// ==================== DOM元素获取 ====================
	
	// 页面加载完成后初始化预览
	setTimeout(() => {
		updatePreview();
	}, 100);
	
	// 检查存储配额状态
	checkStorageQuota();
	
	// 基础设置选项 - 使用querySelectorAll获取单选按钮组
	const searchEngineRadios = document.querySelectorAll('input[name="searchEngine"]');  // 搜索引擎单选按钮组
	const themeRadios = document.querySelectorAll('input[name="theme"]');                // 主题单选按钮组
	const backgroundRadios = document.querySelectorAll('input[name="background"]');        // 背景类型单选按钮组
	
	
	console.log('找到的选项数量:', {
		searchEngine: searchEngineRadios.length,
		theme: themeRadios.length,
		background: backgroundRadios.length
	});
	
	// 当前设置
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
		solidColor: '#f8fafc',
		solidColorDark: '#0f172a',
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
	
	// 加载设置
	loadSettings();
	
	// 初始化自定义搜索引擎管理
	initCustomEngines();
	
	// 添加折叠功能事件监听器
	const settingHeaders = document.querySelectorAll('.setting-header');
	settingHeaders.forEach(header => {
		header.addEventListener('click', function() {
			toggleSetting(this);
		});
	});
	
	// ==================== 实时响应设置变化的事件监听器 ====================
	
	// 搜索引擎选择事件监听器
	// 监听所有搜索引擎单选按钮的变化，当用户选择不同的搜索引擎时触发
	searchEngineRadios.forEach(radio => {
		radio.addEventListener('change', function() {
			currentSettings.searchEngine = this.value;  // 更新当前选择的搜索引擎
			// 使用防抖保存，避免频繁保存
			debouncedSave();
		});
	});
	
	// 主题选择事件监听器
	// 监听所有主题单选按钮的变化，当用户切换明暗主题时触发
themeRadios.forEach(radio => {
	radio.addEventListener('change', function() {
		const newTheme = this.value;
		const oldTheme = currentSettings.theme;
		
		currentSettings.theme = newTheme;        // 更新当前选择的主题（'light' 或 'dark'）
		
		// 应用主题到页面
		applyThemeToPage(newTheme);
		
		// 如果切换了主题，更新视频透明度显示
		if (oldTheme !== newTheme && videoOpacityInput) {
			const opacity = newTheme === 'dark' ? 
				(currentSettings.videoOpacityDark || currentSettings.videoOpacity || 80) : 
				(currentSettings.videoOpacity || 80);
			videoOpacityInput.value = opacity;
			videoOpacityValue.textContent = opacity + '%';
		}
		
		// 立即更新预览
		updatePreview();
		// 延迟保存
		debouncedSave();
	});
});

	// 应用主题到页面
	function applyThemeToPage(theme) {
		const body = document.body;
		
		// 移除所有主题类
		body.classList.remove('dark-mode');
		
		// 根据主题添加相应类
		if (theme === 'dark') {
			body.classList.add('dark-mode');
		} else if (theme === 'auto') {
			// 跟随系统主题
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			if (prefersDark) {
				body.classList.add('dark-mode');
			}
		}
		
		console.log('主题已应用到页面:', theme);
	}
	

	
	// 标题显示设置
	const titleOptions = document.querySelectorAll('[data-title]');
	const secondsSettings = document.getElementById('seconds-settings');
	const titleTextInput = document.getElementById('title-text-input');
	const titleFillColorInput = document.getElementById('title-fill-color');
	const titleOutlineColorInput = document.getElementById('title-outline-color');
	
	// 标题样式预览元素
	const titlePreview = document.createElement('div');
	titlePreview.id = 'title-preview';
	titlePreview.style.cssText = 'margin: 15px 0; padding: 20px; border: 2px dashed #ddd; border-radius: 8px; text-align: center; background: #f8f9fa; transition: all 0.3s ease;';
	titlePreview.innerHTML = '<div style="font-size: 14px; font-weight: bold; margin-bottom: 8px; color: #666;">标题预览</div><div id="title-preview-text" style="font-size: 28px; font-weight: bold; color: #ffffff; -webkit-text-stroke: 1px #000000; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); transition: all 0.3s ease;">SuiYuan-Search</div>';
	
	// 将预览元素插入到标题样式设置区域后
	const titleStyleSettings = document.getElementById('title-style-settings');
	if (titleStyleSettings && !document.getElementById('title-preview')) {
		titleStyleSettings.appendChild(titlePreview);
	}
	
	// 更新标题预览函数
	function updateTitlePreview() {
		const previewText = document.getElementById('title-preview-text');
		if (previewText) {
			const text = titleTextInput ? titleTextInput.value || 'SuiYuan-Search' : 'SuiYuan-Search';
			const fillColor = titleFillColorInput ? titleFillColorInput.value : '#ffffff';
			const outlineColor = titleOutlineColorInput ? titleOutlineColorInput.value : '#000000';
			
			previewText.textContent = text;
			previewText.style.color = fillColor;
			previewText.style.webkitTextStroke = `1px ${outlineColor}`;
		}
	}
	
	titleOptions.forEach(option => {
		option.addEventListener('click', () => {
			titleOptions.forEach(opt => opt.classList.remove('selected'));
			option.classList.add('selected');
			currentSettings.titleDisplay = option.dataset.title;
			console.log('标题显示模式已更新:', option.dataset.title);
			
			// 根据选择显示或隐藏秒数设置
			if (option.dataset.title === 'time') {
				secondsSettings.style.display = 'block';
			} else {
				secondsSettings.style.display = 'none';
			}
			
			saveAndNotify();
		});
	});
	
	// 标题文字输入事件监听器
	if (titleTextInput) {
		titleTextInput.addEventListener('input', function() {
			currentSettings.titleText = this.value;
			console.log('标题文字已更新:', this.value);
			updateTitlePreview();
		});
	}
	
	// 标题填充颜色事件监听器
	if (titleFillColorInput) {
		titleFillColorInput.addEventListener('input', function() {
			currentSettings.titleFillColor = this.value;
			console.log('标题填充颜色已更新:', this.value);
			updateTitlePreview();
		});
	}
	
	// 标题轮廓颜色事件监听器
	if (titleOutlineColorInput) {
		titleOutlineColorInput.addEventListener('input', function() {
			currentSettings.titleOutlineColor = this.value;
			console.log('标题轮廓颜色已更新:', this.value);
			updateTitlePreview();
		});
	}
	
	// 确认更改按钮事件监听器
	const confirmTitleChangeBtn = document.getElementById('confirm-title-change');
	if (confirmTitleChangeBtn) {
		confirmTitleChangeBtn.addEventListener('click', function() {
			// 保存标题样式设置
			console.log('确认更改标题样式:', {
				titleText: currentSettings.titleText,
				titleFillColor: currentSettings.titleFillColor,
				titleOutlineColor: currentSettings.titleOutlineColor
			});
			
			// 调用保存函数
			saveAndNotify();
			
			// 显示成功提示
			showStatusMessage('标题样式已保存！', 'success');
			
			// 按钮动画效果
			this.style.transform = 'scale(0.95)';
			setTimeout(() => {
				this.style.transform = 'scale(1)';
			}, 150);
		});
	}
	
	// 状态消息显示函数
	function showStatusMessage(message, type = 'info') {
		const statusMessage = document.getElementById('statusMessage');
		if (statusMessage) {
			statusMessage.textContent = message;
			statusMessage.className = `status-message ${type}`;
			statusMessage.style.display = 'block';
			
			// 3秒后自动隐藏
			setTimeout(() => {
				statusMessage.style.display = 'none';
			}, 3000);
		}
	}
	
	// 秒数显示设置
	const secondsOptions = document.querySelectorAll('[data-show-seconds]');
	secondsOptions.forEach(option => {
		option.addEventListener('click', () => {
			secondsOptions.forEach(opt => opt.classList.remove('selected'));
			option.classList.add('selected');
			currentSettings.showSeconds = option.dataset.showSeconds === 'true';
			console.log('秒数显示设置已更新:', currentSettings.showSeconds);
			saveAndNotify();
		});
	});
	
	// ==================== 背景设置相关事件监听器 ====================
	
	// 背景类型变化监听器（增强版）
	// 这个监听器在背景类型改变时，除了保存设置外，还会更新UI显示
	backgroundRadios.forEach(radio => {
		radio.addEventListener('change', function() {
			currentSettings.background = this.value;  // 更新背景类型设置
			updateBackgroundSettings();                // 更新背景设置面板的显示/隐藏状态
			// 立即更新预览
			updatePreview();
			// 延迟保存
			debouncedSave();
		});
	});
	
	// 纯色背景设置
	const solidColorInput = document.getElementById('solid-color');
	const solidColorDarkInput = document.getElementById('solid-color-dark');
	const presetColors = document.querySelectorAll('.color-preset');
	
	if (solidColorInput) {
		solidColorInput.addEventListener('input', function() {
			currentSettings.solidColor = this.value;
			console.log('亮色纯色背景已更新:', this.value);
			// 立即更新预览
			updatePreview();
			// 延迟保存
			debouncedSave();
		});
	}
	
	if (solidColorDarkInput) {
		solidColorDarkInput.addEventListener('input', function() {
			currentSettings.solidColorDark = this.value;
			console.log('暗色纯色背景已更新:', this.value);
			// 立即更新预览
			updatePreview();
			// 延迟保存
			debouncedSave();
		});
	}
	
	presetColors.forEach(preset => {
		preset.addEventListener('click', function() {
			console.log('预设颜色点击:', this.dataset.color, this.dataset.colorDark);
			console.log('所有dataset属性:', this.dataset);
			
			if (this.dataset.color) {
				const color = this.dataset.color;
				currentSettings.solidColor = color;
				solidColorInput.value = color;
				console.log('设置亮色纯色背景:', color);
			}
			// 检查两个可能的属性名
			const colorDark = this.dataset.colorDark || this.dataset.colorDark;
			if (colorDark) {
				currentSettings.solidColorDark = colorDark;
				solidColorDarkInput.value = colorDark;
				console.log('设置暗色纯色背景:', colorDark);
			}
			console.log('保存前的currentSettings:', currentSettings);
			// 立即更新预览
			updatePreview();
			// 预设颜色点击也需要防抖，避免频繁点击
			debouncedSave();
		});
	})
	
	// 渐变背景设置
	const gradientStartInput = document.getElementById('gradient-start');
	const gradientEndInput = document.getElementById('gradient-end');
	const gradientDirectionSelect = document.getElementById('gradient-direction');
	
	if (gradientStartInput) {
		gradientStartInput.addEventListener('input', function() {
			currentSettings.gradientStart = this.value;
			// 立即更新预览
			updatePreview();
			// 延迟保存
			debouncedSave();
		});
	}
	
	if (gradientEndInput) {
		gradientEndInput.addEventListener('input', function() {
			currentSettings.gradientEnd = this.value;
			// 立即更新预览
			updatePreview();
			// 延迟保存
			debouncedSave();
		});
	}
	
	if (gradientDirectionSelect) {
		gradientDirectionSelect.addEventListener('change', function() {
			currentSettings.gradientDirection = this.value;
			// 立即更新预览
			updatePreview();
			// 延迟保存
			debouncedSave();
		});
	}
	
	// 图片背景设置
	const imageLightInput = document.getElementById('image-light');
	const imageDarkInput = document.getElementById('image-dark');
	const imageOpacityInput = document.getElementById('image-opacity');
	const imageBlurInput = document.getElementById('image-blur');
	const opacityValue = document.getElementById('opacity-value');
	const blurValue = document.getElementById('blur-value');
	
	if (imageLightInput) {
		imageLightInput.addEventListener('change', function() {
			handleImageUpload(this, 'light');
		});
	}
	
	if (imageDarkInput) {
		imageDarkInput.addEventListener('change', function() {
			handleImageUpload(this, 'dark');
		});
	}
	
	if (imageOpacityInput) {
		imageOpacityInput.addEventListener('input', function() {
			currentSettings.imageOpacity = this.value;
			opacityValue.textContent = this.value + '%';
			// 立即更新预览
			updatePreview();
			// 延迟保存
			debouncedSave();
		});
	}
	
	if (imageBlurInput) {
		imageBlurInput.addEventListener('input', function() {
			currentSettings.imageBlur = this.value;
			blurValue.textContent = this.value + 'px';
			// 立即更新预览
			updatePreview();
			// 延迟保存
			debouncedSave();
		});
	}
	
	// 视频相关元素
	const videoInput = document.getElementById('video');
	const videoOpacityInput = document.getElementById('video-opacity');
	const videoOpacityValue = document.getElementById('video-opacity-value');
	const videoBlurInput = document.getElementById('video-blur');
	const videoBlurValue = document.getElementById('video-blur-value');
	
	// 视频上传事件
	if (videoInput) {
		videoInput.addEventListener('change', function() {
			handleVideoUpload(this);
		});
	}
	
	// 防抖保存定时器
	let saveTimeout = null;
	
	// 更新预览区域的函数
	function updatePreview() {
		const previewContent = document.getElementById('preview-content');
		if (!previewContent) return;
		
		// 根据当前选择的背景类型更新预览
		const selectedBackground = document.querySelector('input[name="background"]:checked')?.value || 'default';
		
		// 重置预览样式
		previewContent.style.background = '';
		previewContent.style.backgroundImage = '';
		previewContent.style.backgroundSize = '';
		previewContent.style.backgroundPosition = '';
		previewContent.style.backgroundRepeat = '';
		
		// 根据不同的背景类型设置预览样式
		// 获取当前主题 - 确保从 currentSettings 获取最新主题设置
		const currentTheme = currentSettings.theme || 'light';
		
		switch (selectedBackground) {
			case 'solid':
				// 获取当前主题对应的纯色背景
				const solidColor = currentTheme === 'dark' ? 
					(currentSettings.solidColorDark || '#1a1a1a') : 
					(currentSettings.solidColor || '#ffffff');
				previewContent.style.backgroundColor = solidColor;
				break;
			case 'gradient':
				const gradientStart = currentSettings.gradientStart || '#667eea';
				const gradientEnd = currentSettings.gradientEnd || '#764ba2';
				const gradientDirection = currentSettings.gradientDirection || '135deg';
				previewContent.style.background = `linear-gradient(${gradientDirection}, ${gradientStart}, ${gradientEnd})`;
				break;
			case 'image':
				// 获取当前主题对应的图片背景
				const imageKey = currentTheme === 'dark' ? 'imageDark' : 'imageLight';
				const imageData = currentSettings[imageKey];
				if (imageData) {
					// 优先使用Data URL，如果没有则使用旧的url字段（向后兼容）
					const imageUrl = imageData.dataUrl || (typeof imageData === 'string' ? imageData : (imageData.url || ''));
					if (imageUrl) {
						previewContent.style.backgroundImage = `url(${imageUrl})`;
						previewContent.style.backgroundSize = 'cover';
						previewContent.style.backgroundPosition = 'center';
						previewContent.style.backgroundRepeat = 'no-repeat';
					}
				}
				break;
			case 'video':
				// 视频背景预览（显示视频的第一帧或占位图）
				const videoData = currentSettings.video;
				if (videoData) {
					// 优先使用dataUrl，回退到filePath，最后兼容旧格式
					let videoUrl = '';
					if (videoData.dataUrl) {
						videoUrl = videoData.dataUrl;
					} else if (videoData.filePath) {
						videoUrl = videoData.filePath;
					} else if (typeof videoData === 'string') {
						// 兼容旧格式：字符串格式
						videoUrl = videoData;
					} else if (videoData.url) {
						// 兼容旧格式：对象中的url字段
						videoUrl = videoData.url;
					}
					
					if (videoUrl) {
						// 对于视频预览，我们可以设置一个背景色表示视频区域
						previewContent.style.backgroundColor = '#1a1a1a';
						// 可以在这里实现更复杂的视频帧预览，比如使用video元素的第一帧
						// 但由于这是预览区域，使用简单的背景色即可
					}
				}
				break;
			default:
				// 默认背景 - 根据主题设置不同的默认背景色
				previewContent.style.backgroundColor = currentTheme === 'dark' ? '#1a1a1a' : '#f0f0f0';
		}
	}

	// 防抖保存函数
	function debouncedSave() {
		// 清除之前的定时器
		if (saveTimeout) {
			clearTimeout(saveTimeout);
		}
		
		// 设置新的定时器，500ms后执行保存
		saveTimeout = setTimeout(() => {
			saveAndNotify();
		}, 500);
		
		// 立即更新预览，不等待保存
		updatePreview();
	}
	
	if (videoOpacityInput) {
		videoOpacityInput.addEventListener('input', function() {
			// 根据当前主题设置对应的透明度
			const currentTheme = document.querySelector('input[name="theme"]:checked')?.value || 'light';
			if (currentTheme === 'dark') {
				currentSettings.videoOpacityDark = this.value;
			} else {
				currentSettings.videoOpacity = this.value;
			}
			videoOpacityValue.textContent = this.value + '%';
			// 立即更新预览
			updatePreview();
			// 延迟保存
			debouncedSave();
		});
	}
	
	if (videoBlurInput) {
		videoBlurInput.addEventListener('input', function() {
			currentSettings.videoBlur = this.value;
			videoBlurValue.textContent = this.value + 'px';
			// 立即更新预览
			updatePreview();
			// 延迟保存
			debouncedSave();
		});
	}

	// 确认更改按钮事件
	const confirmVideoChangeBtn = document.getElementById('confirm-video-change');
	if (confirmVideoChangeBtn) {
		confirmVideoChangeBtn.addEventListener('click', function() {
			// 刷新当前标签页
			chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
				if (tabs[0]) {
					chrome.tabs.reload(tabs[0].id);
				}
			});
		});
	}

	/**
 * 从Chrome存储中加载设置
 * 功能：读取Chrome同步存储中的suiYuanSettings项，并更新到currentSettings对象和UI界面
 * 包含错误处理和延迟加载机制，避免循环调用问题
 */
function loadSettings() {
	try {
		// 延迟加载设置，避免循环调用
		setTimeout(() => {
			// 检查Chrome扩展API是否可用
			if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
				// 从Chrome同步存储中获取suiYuanSettings项
				chrome.storage.sync.get(['suiYuanSettings'], function(result) {
					// 检查存储操作是否出错
					if (chrome.runtime.lastError) {
						console.error('加载设置失败:', chrome.runtime.lastError);
						return;
					}
					// 如果找到存储的设置，更新currentSettings并刷新UI
					if (result.suiYuanSettings) {
						currentSettings = result.suiYuanSettings;
						
						// 异步从本地存储加载媒体文件
				async function loadLocalMedia() {
					try {
						// 异步获取本地存储的媒体文件
						const [localImageLight, localImageDark, localVideo] = await Promise.all([
							window.localMediaStorage.getImage('light'),
							window.localMediaStorage.getImage('dark'),
							window.localMediaStorage.getVideo()
						]);

						// 优先使用本地存储的媒体文件
						if (localImageLight) {
							// 如果本地存储中有图片，使用本地存储的图片数据
							// 否则使用设置中保存的Data URL
							if (localImageLight.dataUrl) {
								currentSettings.imageLight = localImageLight;
							} else {
								// 保持原有的imageLight设置，可能包含Data URL
								// 不覆盖currentSettings.imageLight
							}
						}
						if (localImageDark) {
							// 如果本地存储中有图片，使用本地存储的图片数据
							// 否则使用设置中保存的Data URL
							if (localImageDark.dataUrl) {
								currentSettings.imageDark = localImageDark;
							} else {
								// 保持原有的imageDark设置，可能包含Data URL
								// 不覆盖currentSettings.imageDark
							}
						}
						if (localVideo) {
							// 如果当前视频是临时的，不被本地存储的视频覆盖
							if (!currentSettings.video || !currentSettings.video.temp) {
								// 如果本地存储中有视频，使用本地存储的视频数据
								// 否则保持原有的video设置
								if (localVideo.dataUrl) {
									currentSettings.video = localVideo;
								}
							}
						}

						// 更新UI
						updateRadioOptions();
					} catch (error) {
						console.error('加载本地媒体文件失败:', error);
						// 继续更新UI
						updateRadioOptions();
					}
				}

				// 启动异步加载
				loadLocalMedia();
						
						updateRadioOptions();
					} else {
						// 保存默认设置到存储中
						saveAndNotify();
					}
				});
			} else {
				// Chrome扩展API不可用，使用localStorage作为备选方案
				console.log('Chrome扩展API不可用，使用localStorage');
				const savedSettings = localStorage.getItem('suiYuanSettings');
				if (savedSettings) {
					try {
						currentSettings = JSON.parse(savedSettings);
						updateRadioOptions();
					} catch (error) {
						console.error('解析localStorage设置失败:', error);
						updateRadioOptions();
					}
				} else {
					// 保存默认设置到localStorage
					localStorage.setItem('suiYuanSettings', JSON.stringify(currentSettings));
					updateRadioOptions();
				}
			}
		}, 100);
	} catch (error) {
		console.error('加载设置异常:', error);
	}
}
	
	// 更新单选选项状态
	function updateRadioOptions() {
		// 更新搜索引擎
		searchEngineRadios.forEach(radio => {
			radio.checked = radio.value === currentSettings.searchEngine;
		});
		
		// 更新主题
		themeRadios.forEach(radio => {
			radio.checked = radio.value === currentSettings.theme;
		});
		
		// 应用主题到页面
		applyThemeToPage(currentSettings.theme);
		
		// 更新背景
		backgroundRadios.forEach(radio => {
			radio.checked = radio.value === currentSettings.background;
		});
		

		
		// 更新标题显示
		const titleDisplayRadios = document.querySelectorAll('input[name="titleDisplay"]');
		titleDisplayRadios.forEach(radio => {
			radio.checked = radio.value === currentSettings.titleDisplay;
		});
		
		// 更新背景设置显示
		updateBackgroundSettings();
			
		// 更新标题显示选项
		const titleOptions = document.querySelectorAll('[data-title]');
		titleOptions.forEach(opt => opt.classList.remove('selected'));
		const selectedTitle = document.querySelector(`[data-title="${currentSettings.titleDisplay}"]`);
		if (selectedTitle) {
			selectedTitle.classList.add('selected');
		}
		
		// 更新标题样式输入框
		if (document.getElementById('title-text-input')) {
			document.getElementById('title-text-input').value = currentSettings.titleText || 'SuiYuan-Search';
		}
		if (document.getElementById('title-fill-color')) {
			document.getElementById('title-fill-color').value = currentSettings.titleFillColor || '#ffffff';
		}
		if (document.getElementById('title-outline-color')) {
			document.getElementById('title-outline-color').value = currentSettings.titleOutlineColor || '#000000';
		}
		
		// 更新标题预览
		if (typeof updateTitlePreview === 'function') {
			updateTitlePreview();
		}
		
		// 初始化秒数设置的显示状态
		const secondsSettings = document.getElementById('seconds-settings');
		if (secondsSettings) {
			if (currentSettings.titleDisplay === 'time') {
				secondsSettings.style.display = 'block';
			} else {
				secondsSettings.style.display = 'none';
			}
		}
		
		// 更新秒数显示选项
		const secondsOptions = document.querySelectorAll('[data-show-seconds]');
		secondsOptions.forEach(opt => opt.classList.remove('selected'));
		if (currentSettings.showSeconds !== undefined) {
			const selectedSeconds = document.querySelector(`[data-show-seconds="${currentSettings.showSeconds}"]`);
			if (selectedSeconds) {
				selectedSeconds.classList.add('selected');
			}
		}
		
		// 更新背景设置的具体值
		if (document.getElementById('solid-color')) {
			document.getElementById('solid-color').value = currentSettings.solidColor || '#ffffff';
		}
		if (document.getElementById('solid-color-dark')) {
			document.getElementById('solid-color-dark').value = currentSettings.solidColorDark || '#1a1a1a';
		}
		if (document.getElementById('gradient-start')) {
			document.getElementById('gradient-start').value = currentSettings.gradientStart || '#667eea';
		}
		if (document.getElementById('gradient-end')) {
			document.getElementById('gradient-end').value = currentSettings.gradientEnd || '#764ba2';
		}
		if (document.getElementById('gradient-direction')) {
			document.getElementById('gradient-direction').value = currentSettings.gradientDirection || '135deg';
		}
		if (document.getElementById('image-opacity')) {
			document.getElementById('image-opacity').value = currentSettings.imageOpacity || 100;
			document.getElementById('opacity-value').textContent = (currentSettings.imageOpacity || 100) + '%';
		}
		if (document.getElementById('image-blur')) {
			document.getElementById('image-blur').value = currentSettings.imageBlur || 0;
			document.getElementById('blur-value').textContent = (currentSettings.imageBlur || 0) + 'px';
		}
		if (document.getElementById('video-opacity')) {
			// 根据当前主题显示对应的透明度
			const currentTheme = currentSettings.theme || 'light';
			const opacity = currentTheme === 'dark' ? 
				(currentSettings.videoOpacityDark || currentSettings.videoOpacity || 80) : 
				(currentSettings.videoOpacity || 80);
			document.getElementById('video-opacity').value = opacity;
			document.getElementById('video-opacity-value').textContent = opacity + '%';
		}
		if (document.getElementById('video-blur')) {
			document.getElementById('video-blur').value = currentSettings.videoBlur || 2;
			document.getElementById('video-blur-value').textContent = (currentSettings.videoBlur || 2) + 'px';
		}
		if (document.getElementById('video-volume')) {
			document.getElementById('video-volume').value = currentSettings.videoVolume || 0;
			document.getElementById('video-volume-value').textContent = (currentSettings.videoVolume || 0) + '%';
		}
		
		// 更新图片预览
		if (currentSettings.imageLight) {
			const previewLight = document.getElementById('preview-light');
			if (previewLight) {
				if (typeof currentSettings.imageLight === 'string') {
					// 兼容旧的数据格式（直接是URL字符串）
					previewLight.style.backgroundImage = `url(${currentSettings.imageLight})`;
				} else if (currentSettings.imageLight.dataUrl) {
					// 新的Data URL格式
					previewLight.style.backgroundImage = `url(${currentSettings.imageLight.dataUrl})`;
				} else if (currentSettings.imageLight.url) {
					// 新的对象格式（URL字段）
					previewLight.style.backgroundImage = `url(${currentSettings.imageLight.url})`;
				}
			}
		}
		if (currentSettings.imageDark) {
			const previewDark = document.getElementById('preview-dark');
			if (previewDark) {
				if (typeof currentSettings.imageDark === 'string') {
					// 兼容旧的数据格式（直接是URL字符串）
					previewDark.style.backgroundImage = `url(${currentSettings.imageDark})`;
				} else if (currentSettings.imageDark.dataUrl) {
					// 新的Data URL格式
					previewDark.style.backgroundImage = `url(${currentSettings.imageDark.dataUrl})`;
				} else if (currentSettings.imageDark.url) {
					// 新的对象格式（URL字段）
					previewDark.style.backgroundImage = `url(${currentSettings.imageDark.url})`;
				}
			}
		}
		
		// 更新视频预览
		if (currentSettings.video) {
			const videoElement = document.querySelector('#preview-video video');
			if (videoElement) {
				if (typeof currentSettings.video === 'string') {
					// 兼容旧的数据格式（直接是URL字符串）
					videoElement.src = currentSettings.video;
				} else if (currentSettings.video.dataUrl) {
					// 新的Data URL格式
					videoElement.src = currentSettings.video.dataUrl;
				} else if (currentSettings.video.url) {
					// 新的对象格式（URL字段）
					videoElement.src = currentSettings.video.url;
				}
			}
		}
	}
	
	// 验证设置数据的有效性
	function validateSettings(settings) {
		try {
			// 检查基本结构
			if (!settings || typeof settings !== 'object') {
				throw new Error('设置数据必须是一个对象');
			}
			
			// 检查各个字段类型
			const stringFields = ['searchEngine', 'theme', 'background', 'titleDisplay', 'titleText', 'titleFillColor', 'titleOutlineColor'];
			stringFields.forEach(field => {
				if (settings[field] && typeof settings[field] !== 'string') {
					settings[field] = String(settings[field]);
				}
			});
			
			// 检查布尔字段
			const booleanFields = ['showSeconds'];
			booleanFields.forEach(field => {
				if (settings[field] !== undefined && typeof settings[field] !== 'boolean') {
					settings[field] = Boolean(settings[field]);
				}
			});
			
			// 检查数组字段
			const arrayFields = ['customEngines'];
			arrayFields.forEach(field => {
				if (settings[field] && !Array.isArray(settings[field])) {
					// 如果不是数组，尝试转换为数组或重置为空数组
					if (settings[field] && typeof settings[field] === 'object') {
						// 如果是对象，尝试将其转换为数组元素
						settings[field] = [settings[field]];
					} else {
						// 其他情况重置为空数组
						settings[field] = [];
					}
				} else if (!settings[field]) {
					// 如果字段不存在，初始化为空数组
					settings[field] = [];
				}
			});
			
			// 处理对象类型的字段（可能是File对象或媒体信息对象）
			const objectFields = ['imageLight', 'imageDark', 'video'];
			objectFields.forEach(field => {
				if (settings[field] && typeof settings[field] === 'object') {
					// 如果是File对象，跳过保存
					if (settings[field] instanceof File) {
						delete settings[field];
					}
					// 如果是媒体信息对象，保留但检查大小
					else if (settings[field].url && settings[field].name) {
						// 保留有效的媒体信息对象
					}
					// 其他未知对象类型，删除
					else {
						delete settings[field];
					}
				}
			});
			
			// 清理可能存在的无效媒体字段
			const invalidFields = ['videoLight', 'videoDark'];
			invalidFields.forEach(field => {
				if (settings[field]) {
					delete settings[field];
				}
			});
			
			// 检查数据大小（Chrome存储限制）
			const settingsString = JSON.stringify(settings);
			const sizeKB = Math.round(settingsString.length / 1024);
			
			if (settingsString.length > 102400) { // 100KB限制
				// 提供清理建议（检查所有媒体字段）
				const largeFields = [];
				const mediaFields = ['imageLight', 'imageDark', 'video'];
				
				mediaFields.forEach(field => {
					if (settings[field]) {
						if (typeof settings[field] === 'string') {
							const fieldSize = Math.round(settings[field].length / 1024);
							if (fieldSize > 10) {
								largeFields.push(`${field}: ${fieldSize}KB`);
							}
						} else if (typeof settings[field] === 'object' && settings[field].url) {
							// 对于对象格式，估算URL大小
							const urlSize = Math.round(settings[field].url.length / 1024);
							if (urlSize > 10) {
								largeFields.push(`${field}: ${urlSize}KB (URL)`);
							}
						}
					}
				});
				
				// 自动清理过大的媒体数据
				if (largeFields.length > 0) {
					mediaFields.forEach(field => {
						if (settings[field]) {
							delete settings[field];
						}
					});
					
					// 重新计算大小
					const newSettingsString = JSON.stringify(settings);
					const newSizeKB = Math.round(newSettingsString.length / 1024);
					
					if (newSettingsString.length > 102400) {
						const errorMsg = `设置数据仍然过大 (${newSizeKB}KB)，已清理媒体数据。请检查其他设置。`;
						throw new Error(errorMsg);
					}
				} else {
					const errorMsg = `设置数据过大 (${sizeKB}KB)，请减少数据。大字段: ${largeFields.join(', ')}`;
					throw new Error(errorMsg);
				}
			}
			
			return true;
		} catch (error) {
			console.error('设置数据验证失败:', error.message);
			return false;
		}
	}

	// 修改保存设置函数，添加date.json保存逻辑 
	// 仅通知设置更新，不保存数据的函数（用于临时视频）
	async function notifySettingsUpdate() {
		try {
			console.log('发送设置更新通知，不保存数据');
			
			if (typeof chrome !== 'undefined' && chrome.tabs) {
				// 获取当前活动标签页 
				chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
					if (chrome.runtime.lastError) {
						console.error('查询当前标签失败:', chrome.runtime.lastError.message);
						return;
					}
					
					// 通知当前标签页 
					if (tabs[0]) {
						chrome.tabs.sendMessage(tabs[0].id, { 
							action: 'updateSettings', 
							settings: currentSettings 
						}, function(response) {
							if (chrome.runtime.lastError) {
								console.log('消息发送失败（可能是正常的）:', chrome.runtime.lastError.message);
							} else {
								console.log('设置更新通知已发送到当前标签页');
							}
						});
					}
				});
				
				// 同时通知所有起始页标签 
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
			} else {
				console.log('Chrome扩展API不可用，无法发送设置更新通知');
			}
			
		} catch (error) {
			console.error('发送设置更新通知异常:', error);
		}
	}

	async function saveAndNotify() {
		try {
			// 验证数据 
			if (!validateSettings(currentSettings)) {
				alert('设置数据验证失败，请检查后重试');
				return;
			}
			
			// 保存媒体文件到Chrome本地存储 
			await saveMediaToChromeStorage();
			
			// 保存背景数据到date.json 
			await saveBackgroundToDateJson();
			
			// 保存其他设置到Chrome同步存储 
			if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
				// 创建不包含大媒体数据的设置对象 
				const settingsToSave = { ...currentSettings };
				// 移除大媒体数据，避免超过存储限制 
				delete settingsToSave.imageLight;
				delete settingsToSave.imageDark;
				delete settingsToSave.video;
				
					chrome.storage.sync.set({ 
						suiYuanSettings: settingsToSave 
					}, function() {
					if (chrome.runtime.lastError) {
						const errorMsg = chrome.runtime.lastError.message || JSON.stringify(chrome.runtime.lastError);
						console.error('保存设置失败:', chrome.runtime.lastError);
						alert('保存设置失败: ' + errorMsg);
						return;
					}
					
					// 获取当前活动标签页 
					chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
						if (chrome.runtime.lastError) {
							console.error('查询当前标签失败:', chrome.runtime.lastError.message);
							return;
						}
					
						// 通知当前标签页 
						if (tabs[0]) {
							chrome.tabs.sendMessage(tabs[0].id, { 
								action: 'updateSettings', 
								settings: currentSettings 
							}, function(response) {
								if (chrome.runtime.lastError) {
									// 忽略消息发送失败 
								}
							});
						}
					});
					
						// 同时通知所有起始页标签 
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
					console.log('设置已保存到localStorage');
					if (chrome.runtime && chrome.runtime.sendMessage) {
						chrome.runtime.sendMessage({ action: 'updateSettings', settings: currentSettings });
					}
				} catch (error) {
					console.error('保存到localStorage失败:', error);
					alert('保存设置失败: ' + error.message);
				}
			}
			
			showStatus('设置已保存', 'success');
			
		} catch (error) {
			console.error('保存设置异常:', error);
			showStatus('保存设置失败: ' + error.message, 'error');
		}
	}
	
	// 保存背景数据到date.json的函数 
	async function saveBackgroundToDateJson() {
		try {
			console.log('开始保存背景数据到date.json');
			
			let backgroundData = {
				type: currentSettings.background,
				imageUrl: "",
				videoUrl: "",
				fileName: "",
				fileType: "",
				dataUrl: "",
				lastUpdated: new Date().toISOString()
			};

			// 根据背景类型设置相应的数据 
			if (currentSettings.background === 'image') {
				// 获取当前主题对应的图片 
				const currentTheme = document.querySelector('input[name="theme"]:checked')?.value || 'light';
				const imageData = currentTheme === 'dark' ? currentSettings.imageDark : currentSettings.imageLight;
				
				if (imageData) {
					// 优先使用文件路径，回退到dataUrl或url
					if (imageData.filePath) {
						backgroundData.filePath = imageData.filePath;
						backgroundData.dataUrl = imageData.dataUrl; // 保留dataUrl作为备用
						backgroundData.imageUrl = imageData.filePath;
						backgroundData.fileName = imageData.savedName || imageData.name || '';
						backgroundData.fileType = imageData.type || '';
						console.log('保存图片背景(使用文件路径):', backgroundData.fileName, '路径:', backgroundData.filePath);
					} else if (typeof imageData === 'string') {
						backgroundData.dataUrl = imageData;
						backgroundData.imageUrl = imageData;
						console.log('保存图片背景(字符串格式)');
					} else if (imageData.dataUrl) {
						backgroundData.dataUrl = imageData.dataUrl;
						backgroundData.imageUrl = imageData.dataUrl;
						backgroundData.fileName = imageData.name || '';
						backgroundData.fileType = imageData.type || '';
						console.log('保存图片背景(使用dataUrl):', backgroundData.fileName);
					} else if (imageData.url) {
						backgroundData.dataUrl = imageData.url;
						backgroundData.imageUrl = imageData.url;
						backgroundData.fileName = imageData.name || '';
						backgroundData.fileType = imageData.type || '';
						console.log('保存图片背景(URL格式):', backgroundData.fileName);
					}
				}
			} else if (currentSettings.background === 'video') {
				const videoData = currentSettings.video;
				if (videoData && !videoData.temp) {
					// 优先使用文件路径，回退到dataUrl或url
					if (videoData.filePath) {
						backgroundData.filePath = videoData.filePath;
						backgroundData.dataUrl = videoData.dataUrl; // 保留dataUrl作为备用
						backgroundData.videoUrl = videoData.filePath;
						backgroundData.fileName = videoData.savedName || videoData.name || 'background';
						backgroundData.fileType = videoData.type || 'video/mp4';
						console.log('保存视频背景(使用文件路径):', backgroundData.fileName, 
								   '路径:', backgroundData.filePath,
								   '大小:', videoData.size ? (videoData.size / 1024 / 1024).toFixed(2) + 'MB' : '未知大小');
					} else if (typeof videoData === 'string') {
						backgroundData.dataUrl = videoData;
						backgroundData.videoUrl = videoData;
						console.log('保存视频背景(字符串格式)');
					} else if (videoData.dataUrl) {
						backgroundData.dataUrl = videoData.dataUrl;
						backgroundData.videoUrl = videoData.dataUrl;
						backgroundData.fileName = videoData.name || 'background';
						backgroundData.fileType = videoData.type || 'video/mp4';
						console.log('保存视频背景(使用dataUrl):', backgroundData.fileName, 
								   '大小:', videoData.size ? (videoData.size / 1024 / 1024).toFixed(2) + 'MB' : '未知大小');
					} else if (videoData.url) {
						backgroundData.dataUrl = videoData.url;
						backgroundData.videoUrl = videoData.url;
						backgroundData.fileName = videoData.name || '';
						backgroundData.fileType = videoData.type || '';
						console.log('保存视频背景(URL格式):', backgroundData.fileName);
					} else {
						console.warn('视频背景数据存在但缺少有效内容:', videoData);
					}
				} else if (videoData && videoData.temp) {
					console.log('跳过临时视频，不保存到date.json');
				} else {
					console.log('当前未设置视频背景');
				}
			}

			// 保存到date.json 
			const dateJsonData = {
				background: backgroundData,
				settings: {
					theme: currentSettings.theme,
					searchEngine: currentSettings.searchEngine,
					customBackground: currentSettings.background !== 'default'
				}
			};

			// 使用localStorage临时存储，用户可以手动复制到date.json 
			localStorage.setItem('temp_date_json', JSON.stringify(dateJsonData, null, 2));
			console.log('背景数据已准备保存到date.json:', {
				type: backgroundData.type,
				hasVideo: !!backgroundData.videoUrl,
				hasImage: !!backgroundData.imageUrl,
				fileName: backgroundData.fileName
			});
			
			// 同时保存到Chrome存储 
			await saveMediaToChromeStorage();
			
			return true;
		} catch (error) {
			console.error('保存背景数据到date.json失败:', error);
			showStatus('保存背景数据失败: ' + error.message, 'error');
			return false;
		}
	}

	// 保存媒体文件到Chrome本地存储 
async function saveMediaToChromeStorage() {
    return new Promise((resolve) => {
        const mediaData = {};
			
			// 保存图片数据 - 包含完整的文件信息
			if (currentSettings.imageLight) {
				mediaData.imageLight = {
					name: currentSettings.imageLight.name,
					filePath: currentSettings.imageLight.filePath,
					savedName: currentSettings.imageLight.savedName,
					originalName: currentSettings.imageLight.originalName,
					type: currentSettings.imageLight.type,
					size: currentSettings.imageLight.size,
					lastUpdated: currentSettings.imageLight.lastUpdated
				};
				console.log('保存亮色图片数据到存储(元数据):', mediaData.imageLight);
			}
			if (currentSettings.imageDark) {
				mediaData.imageDark = {
					name: currentSettings.imageDark.name,
					filePath: currentSettings.imageDark.filePath,
					savedName: currentSettings.imageDark.savedName,
					originalName: currentSettings.imageDark.originalName,
					type: currentSettings.imageDark.type,
					size: currentSettings.imageDark.size,
					lastUpdated: currentSettings.imageDark.lastUpdated
				};
				console.log('保存暗色图片数据到存储(元数据):', mediaData.imageDark);
			}
			
			// 保存视频数据 - 处理临时视频和正式视频
			if (currentSettings.video) {
				if (currentSettings.video.temp) {
					// 临时视频：尝试转换为正式保存，如果失败则跳过
					console.log('检测到临时视频，尝试转换为正式保存');
					convertTempVideoToPermanent().then(success => {
						if (success && currentSettings.video && !currentSettings.video.temp) {
							// 转换成功，保存正式视频数据
							mediaData.video = {
								name: currentSettings.video.name,
								filePath: currentSettings.video.filePath,
								savedName: currentSettings.video.savedName,
								originalName: currentSettings.video.originalName,
								type: currentSettings.video.type,
								size: currentSettings.video.size,
								lastUpdated: currentSettings.video.lastUpdated
							};
							console.log('临时视频已转换为正式保存:', mediaData.video);
						} else {
							console.log('临时视频转换失败，跳过保存');
						}
						// 继续执行保存逻辑
						continueSaveMedia(mediaData, resolve);
					}).catch(err => {
						console.error('临时视频转换异常:', err);
						continueSaveMedia(mediaData, resolve);
					});
				} else {
					// 正式视频：直接保存元数据
					mediaData.video = {
						name: currentSettings.video.name,
						filePath: currentSettings.video.filePath,
						savedName: currentSettings.video.savedName,
						originalName: currentSettings.video.originalName,
						type: currentSettings.video.type,
						size: currentSettings.video.size,
						lastUpdated: currentSettings.video.lastUpdated
					};
					console.log('保存正式视频数据到存储(元数据):', mediaData.video);
					continueSaveMedia(mediaData, resolve);
				}
			} else {
				// 没有视频数据，直接继续保存
				continueSaveMedia(mediaData, resolve);
			}
    });
}

// 继续保存媒体数据的辅助函数
function continueSaveMedia(mediaData, resolve) {
    // 清理旧的大数据键以释放配额
    const cleanupLegacy = () => new Promise((done) => {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get(null, function(items) {
                    const keys = Object.keys(items).filter(k => k.startsWith('userimg_') || k === 'backgroundImage_light' || k === 'backgroundImage_dark' || k === 'backgroundVideo');
                    if (keys.length) {
                        chrome.storage.local.remove(keys, function() { 
                            if (chrome.runtime.lastError) {
                                console.warn('清理旧数据时出错:', chrome.runtime.lastError);
                            }
                            done(true); 
                        });
                    } else { done(true); }
                });
            } else {
                try {
                    localStorage.removeItem('backgroundImage_light');
                    localStorage.removeItem('backgroundImage_dark');
                    localStorage.removeItem('backgroundVideo');
                } catch (e) {
                    console.warn('localStorage清理失败:', e);
                }
                done(true);
            }
        } catch (e) { 
            console.warn('清理过程中发生异常:', e);
            done(true); 
        }
    });

    cleanupLegacy().then(() => {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ suiYuanMedia: mediaData }, function() {
                    if (chrome.runtime && chrome.runtime.lastError) {
                        const msg = chrome.runtime.lastError.message || JSON.stringify(chrome.runtime.lastError);
                        console.error('Chrome存储保存失败:', msg);
                        
                        // 尝试使用localStorage作为备用方案
                        try {
                            localStorage.setItem('suiYuanMedia', JSON.stringify(mediaData));
                            console.log('已切换到localStorage备用存储方案');
                            resolve(true);
                        } catch (e) {
                            console.error('localStorage备用存储也失败:', e);
                            showStatus('存储空间不足，请清理后重试', 'error');
                            resolve(false);
                        }
                    } else { 
                        console.log('媒体数据保存成功');
                        resolve(true); 
                    }
                });
            } else {
                localStorage.setItem('suiYuanMedia', JSON.stringify(mediaData));
                console.log('使用localStorage保存媒体数据成功');
                resolve(true);
            }
        } catch (err) { 
            console.error('保存媒体数据时发生异常:', err);
            showStatus('保存失败，请重试', 'error');
            resolve(false);
        }
    });
}

// 将临时视频转换为正式保存的函数
async function convertTempVideoToPermanent() {
    try {
        if (!currentSettings.video || !currentSettings.video.temp) {
            return true; // 不是临时视频，无需转换
        }

        // 如果临时视频有有效的文件路径，尝试保存到IndexedDB
        if (currentSettings.video.filePath && currentSettings.video.dataUrl) {
            const success = await window.localMediaStorage.saveVideo(currentSettings.video.dataUrl);
            if (success) {
                // 更新视频信息为正式保存
                currentSettings.video.temp = false;
                currentSettings.video.lastUpdated = new Date().toISOString();
                console.log('临时视频已成功转换为正式保存');
                return true;
            }
        }
        
        // 转换失败，清理临时视频数据
        console.warn('临时视频转换失败，清理临时数据');
        currentSettings.video = null;
        return false;
    } catch (error) {
        console.error('临时视频转换过程中发生错误:', error);
        currentSettings.video = null;
        return false;
    }
}
	
	// 折叠/展开设置组（手风琴效果）
	function toggleSetting(header) {
		const content = header.nextElementSibling;
		const isActive = header.classList.contains('active');
		
		// 如果点击的是已展开的面板，则折叠它
		if (isActive) {
			header.classList.remove('active');
			content.classList.remove('expanded');
		} else {
			// 先折叠所有其他面板
			const allHeaders = document.querySelectorAll('.setting-header');
			const allContents = document.querySelectorAll('.setting-content');
			
			allHeaders.forEach(h => {
				h.classList.remove('active');
			});
			
			allContents.forEach(c => {
				c.classList.remove('expanded');
			});
			
			// 然后展开当前面板
			header.classList.add('active');
			content.classList.add('expanded');
		}
	}
	
	// ==================== 背景设置UI更新函数 ====================
	
	/**
	 * 更新背景设置面板的显示状态
	 * 根据当前选择的背景类型，显示对应的设置选项面板，隐藏其他面板
	 * 这样可以让用户只看到与当前背景类型相关的设置选项
	 */
	function updateBackgroundSettings() {
		// 第一步：隐藏所有背景设置子面板
		// 确保在切换背景类型时，之前显示的面板被正确隐藏
		document.getElementById('solid-settings').style.display = 'none';    // 隐藏纯色背景设置
		document.getElementById('gradient-settings').style.display = 'none';  // 隐藏渐变背景设置
		document.getElementById('image-settings').style.display = 'none';    // 隐藏图片背景设置
		document.getElementById('video-settings').style.display = 'none';   // 隐藏视频背景设置
		
		// 隐藏预览窗口（默认隐藏）
		const backgroundPreview = document.getElementById('background-preview');
		if (backgroundPreview) {
			backgroundPreview.style.display = 'none';
		}
		
		// 第二步：根据当前选择的背景类型，显示对应的设置面板
		// 使用switch语句确保只有一个面板被显示
		switch (currentSettings.background) {
			case 'default':
				// 默认背景：使用预设的亮色/暗色背景图片，无需额外设置
				// 所有设置面板保持隐藏状态
				break;
			case 'solid':
				// 显示纯色背景设置面板，包含颜色选择器和预设颜色
				document.getElementById('solid-settings').style.display = 'block';
				break;
			case 'gradient':
				// 显示渐变背景设置面板，包含起始颜色、结束颜色和方向选择
				document.getElementById('gradient-settings').style.display = 'block';
				// 仅在渐变背景时显示预览窗口
				if (backgroundPreview) {
					backgroundPreview.style.display = 'block';
				}
				break;
			case 'image':
				// 显示图片背景设置面板，包含图片上传、透明度和模糊度调节
				document.getElementById('image-settings').style.display = 'block';
				break;
			case 'video':
				// 显示视频背景设置面板，包含视频上传、透明度、模糊度和音量调节
				document.getElementById('video-settings').style.display = 'block';
				break;
			default:
				// 如果背景类型无效，所有面板保持隐藏状态
				console.warn('未知的背景类型:', currentSettings.background);
				break;
		}
	}
	
	/**
	 * 处理图片上传功能
	 * @param {HTMLInputElement} input - 文件输入框元素
	 * @param {string} theme - 主题类型 ('light' 或 'dark')
	 * 功能：处理用户选择的图片文件，使用FileReader读取为Data URL，更新预览并保存设置
	 * 特点：将图片文件转换为base64编码的Data URL，持久化保存到本地存储
	 */
function handleImageUpload(input, theme) {
    const file = input.files[0];
    if (!file) {
        console.log('没有选择文件');
        return;
    }
    
    if (!file.type.startsWith('image/')) {
        alert('请选择有效的图片文件');
        return;
    }
    
    console.log('开始处理图片上传:', file.name, '大小:', file.size);
    const savedName = theme === 'light' ? 'image_light' : 'image_dark';
    window.localMediaStorage.saveImage(theme, file).then(success => {
        if (!success) { 
            alert('保存图片失败: 请检查浏览器控制台查看详细错误信息'); 
            console.error('图片保存失败，可能原因: IndexedDB存储空间不足或浏览器限制');
            return; 
        }
        const imageInfo = {
            name: file.name,
            originalName: file.name,
            savedName: savedName,
            filePath: `userimg/${savedName}`,
            size: file.size,
            type: file.type,
            lastUpdated: new Date().toISOString()
        };
        if (theme === 'light') { currentSettings.imageLight = imageInfo; } else { currentSettings.imageDark = imageInfo; }
        const targetPreview = theme === 'light' ? 'preview-light' : 'preview-dark';
        window.localMediaStorage.getUrl(savedName).then(url => { if (url) updateImagePreview(targetPreview, url); });
        currentSettings.background = 'image';
        const imageRadio = document.querySelector('input[value="image"]');
        if (imageRadio) { imageRadio.checked = true; }
        updateBackgroundSettings();
        updatePreview();
        saveAndNotify();
    }).catch(err => { 
        console.error('图片上传处理错误:', err);
        alert('保存图片失败: ' + (err && err.message || err)); 
    });
}
	
	/**
	 * 更新图片预览
	 * @param {string} elementId - 预览元素ID
	 * @param {string} filePath - 图片文件路径
	 */
async function updateImagePreview(elementId, filePath) {
    try {
        const previewElement = document.getElementById(elementId);
        if (previewElement) {
            previewElement.style.backgroundImage = `url(${filePath})`;
            previewElement.style.backgroundSize = 'cover';
            previewElement.style.backgroundPosition = 'center';
        }
    } catch (error) {
        console.error('更新图片预览失败:', error);
        const previewElement = document.getElementById(elementId);
        if (previewElement) { previewElement.style.backgroundImage = `url(${filePath})`; }
    }
}
	
	/**
	 * 处理视频上传功能
	 * @param {HTMLInputElement} input - 文件输入框元素
	 * 功能：处理用户选择的视频文件，复制到userimg文件夹并保存文件路径，然后更新预览并保存设置
	 * 特点：将视频文件复制到userimg文件夹，使用文件路径而不是Data URL
	 */
function handleVideoUpload(input) {
        const file = input.files[0];
        if (!file || !file.type.startsWith('video/')) { 
            alert('请选择有效的视频文件'); 
            return; 
        }
        
        const progressElement = document.getElementById('upload-progress');
        if (progressElement) { 
            progressElement.textContent = '上传中...'; 
            progressElement.style.display = 'block'; 
        }
        
        const newFileName = 'video_main';
        
        copyFileToUserImg(file, newFileName).then(fileInfo => {
            const videoInfo = {
                name: file.name,
                savedName: newFileName,
                filePath: fileInfo.filePath,
                size: file.size,
                type: file.type,
                temp: false
            };
            
            currentSettings.video = videoInfo;
            currentSettings.background = 'video';
            
            const videoRadio = document.querySelector('input[value="video"]');
            if (videoRadio) { 
                videoRadio.checked = true; 
            }
            
            updateBackgroundSettings();
            
            window.localMediaStorage.getUrl(newFileName).then(url => { 
                if (url) updateVideoPreview(url); 
            }).catch(err => {
                console.error('获取视频URL失败:', err);
                showStatus('视频预览加载失败', 'error');
            });
            
            updatePreview();
            saveAndNotify();
            
            if (progressElement) { 
                progressElement.textContent = '✅ 视频已保存'; 
                progressElement.style.color = '#28a745'; 
                setTimeout(() => { 
                    progressElement.style.display = 'none'; 
                    progressElement.style.color = '#007bff'; 
                }, 3000); 
            }
        }).catch(err => { 
            console.error('视频上传失败:', err);
            if (progressElement) { 
                progressElement.textContent = '❌ 上传失败'; 
                progressElement.style.color = '#dc3545'; 
            }
            alert('上传失败: ' + (err.message || err)); 
            showStatus('视频上传失败，请重试', 'error');
        });
}
	
	/**
	 * 更新视频预览
	 * @param {string} filePath - 视频文件路径
	 */
	async function updateVideoPreview(videoSource) {
		try {
			console.log('开始更新视频预览，视频源:', videoSource);
			
			const videoElement = document.querySelector('#preview-video video');
			if (videoElement) {
				// 简单方式：直接使用传入的视频源（可能是Data URL或文件路径）
				videoElement.src = videoSource;
				videoElement.style.display = 'block';
				
				// 隐藏占位符文本 
				const placeholder = videoElement.parentElement.querySelector('.placeholder');
				if (placeholder) {
					placeholder.style.display = 'none';
				}
				
				// 显示视频状态信息
				if (currentSettings.video && currentSettings.video.temp) {
					console.log('当前视频为临时状态，将在下次保存时尝试转换为正式保存');
					// 在视频预览上显示临时标记
					let tempIndicator = videoElement.parentElement.querySelector('.temp-indicator');
					if (!tempIndicator) {
						tempIndicator = document.createElement('div');
						tempIndicator.className = 'temp-indicator';
						tempIndicator.style.cssText = 'position: absolute; top: 5px; right: 5px; background: rgba(255, 193, 7, 0.9); color: #000; padding: 2px 6px; border-radius: 3px; font-size: 11px; z-index: 10;';
						tempIndicator.textContent = '临时';
						videoElement.parentElement.style.position = 'relative';
						videoElement.parentElement.appendChild(tempIndicator);
					}
				} else {
					// 移除临时标记
					let tempIndicator = videoElement.parentElement.querySelector('.temp-indicator');
					if (tempIndicator) {
						tempIndicator.remove();
					}
				}
				
				console.log('视频预览已更新');
			} else {
				console.error('找不到视频预览元素');
				throw new Error('找不到视频预览元素');
			}
		} catch (error) {
			console.error('更新视频预览失败:', error);
			
			// 显示错误信息给用户
			const videoElement = document.querySelector('#preview-video video');
			if (videoElement) {
				const placeholder = videoElement.parentElement.querySelector('.placeholder');
				if (placeholder) {
					placeholder.style.display = 'block';
					placeholder.textContent = '视频加载失败，请重新上传';
					placeholder.style.color = 'red';
				}
			}
		}
	}
	
	/**
 * 初始化自定义搜索引擎管理功能
 * 功能：设置自定义搜索引擎相关的事件监听器和UI交互逻辑
 * 包括引擎列表渲染、弹窗管理、图标获取等功能模块
 */
	function initCustomEngines() {
		// 渲染当前已保存的自定义搜索引擎列表
		renderCustomEngines();
		
		// 添加搜索引擎按钮事件监听
		const addEngineBtn = document.getElementById('add-engine-btn');
		if (addEngineBtn) {
			// 点击按钮时显示添加搜索引擎的弹窗
			addEngineBtn.addEventListener('click', showAddEngineModal);
		}
		
		// 弹窗相关事件监听器设置
		const modal = document.getElementById('add-engine-modal');
		const closeBtn = modal.querySelector('.close-modal');
		const cancelBtn = document.getElementById('cancel-engine-btn');
		const saveBtn = document.getElementById('save-engine-btn');
		
		// 关闭按钮：点击关闭弹窗
		if (closeBtn) {
			closeBtn.addEventListener('click', hideAddEngineModal);
		}
		
		// 取消按钮：点击关闭弹窗
		if (cancelBtn) {
			cancelBtn.addEventListener('click', hideAddEngineModal);
		}
		
		// 保存按钮：点击保存自定义搜索引擎
		if (saveBtn) {
			saveBtn.addEventListener('click', saveCustomEngine);
		}
		
		// 获取图标按钮事件监听
		const fetchIconBtn = document.getElementById('fetch-icon-btn');
		if (fetchIconBtn) {
			// 点击按钮时从官网地址自动获取favicon图标
			fetchIconBtn.addEventListener('click', fetchIconFromUrl);
		}
		
		// 监听官网地址输入框的失焦事件
		const homepageInput = document.getElementById('engine-homepage');
		if (homepageInput) {
			homepageInput.addEventListener('blur', function() {
				const url = this.value.trim();
				// 如果输入了官网地址且图标框为空，自动尝试获取图标
				if (url && !document.getElementById('engine-icon').value.trim()) {
					autoFetchIcon(url);
				}
			});
		}
		
		// 点击弹窗外部区域关闭弹窗
		modal.addEventListener('click', function(e) {
			if (e.target === modal) {
				hideAddEngineModal();
			}
		});
	}
	
	/**
	 * 渲染自定义搜索引擎列表
	 * 功能：将用户添加的自定义搜索引擎显示在设置页面中
	 * 特点：动态生成DOM元素，包含图标、名称、选择、编辑和删除功能
	 * 优化：使用事件委托和默认图标，提升用户体验
	 */
	function renderCustomEngines() {
		// 获取自定义搜索引擎容器元素
		const container = document.getElementById('custom-engines-container');
		if (!container) return;
		
		// 清空容器内容，准备重新渲染
		container.innerHTML = '';
		
		// 遍历所有自定义搜索引擎，为每个引擎创建UI元素
		currentSettings.customEngines.forEach((engine, index) => {
			// 创建搜索引擎选项的容器div
			const engineDiv = document.createElement('div');
			engineDiv.className = 'radio-option custom-engine-option';
			engineDiv.setAttribute('data-engine', engine.id);
			
			// 设置图标源，如果没有自定义图标则使用默认图标
			// 默认图标是一个星形的SVG，编码为base64
			const iconSrc = engine.icon || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjNjY3ZWVhIi8+Cjwvc3ZnPgo=';
			
			// 安全地创建DOM元素，避免XSS攻击
			const radio = document.createElement('input');
			radio.type = 'radio';
			radio.name = 'searchEngine';
			radio.value = engine.id;
			radio.id = `engine-${engine.id}`;
			
			const icon = document.createElement('img');
			icon.src = iconSrc;
			icon.alt = engine.name;
			icon.className = 'engine-icon';
			
			const label = document.createElement('label');
			label.htmlFor = `engine-${engine.id}`;
			label.textContent = engine.name;
			
			const editBtn = document.createElement('button');
			editBtn.className = 'edit-engine';
			editBtn.setAttribute('data-index', index);
			editBtn.title = '编辑';
			editBtn.textContent = '✏️';
			
			const deleteBtn = document.createElement('button');
			deleteBtn.className = 'delete-engine';
			deleteBtn.setAttribute('data-index', index);
			deleteBtn.title = '删除';
			deleteBtn.textContent = '×';
			
			// 将所有元素添加到容器中
			engineDiv.appendChild(radio);
			engineDiv.appendChild(icon);
			engineDiv.appendChild(label);
			engineDiv.appendChild(editBtn);
			engineDiv.appendChild(deleteBtn);
			
			// 将创建的元素添加到容器中
			container.appendChild(engineDiv);
			
			// 为编辑按钮添加点击事件监听器
			editBtn.addEventListener('click', function(e) {
				e.stopPropagation();  // 阻止事件冒泡，避免触发选择事件
				editCustomEngine(index);  // 调用编辑函数
			});
			
			// 为删除按钮添加点击事件监听器
			deleteBtn.addEventListener('click', function(e) {
				e.stopPropagation();  // 阻止事件冒泡，避免触发选择事件
				deleteCustomEngine(index);  // 调用删除函数
			});
			
			// 为单选按钮添加变化事件监听器
			radio.addEventListener('change', function() {
				// 当用户选择此搜索引擎时，更新设置并保存
				currentSettings.searchEngine = this.value;
				saveAndNotify();
			});
		});
	}
	
	// 显示添加搜索引擎弹窗
	function showAddEngineModal(editMode = false, engineIndex = -1) {
		const modal = document.getElementById('add-engine-modal');
		modal.style.display = 'flex';
		
		// 设置弹窗标题
		const modalTitle = modal.querySelector('h3');
		if (modalTitle) {
			modalTitle.textContent = editMode ? '编辑自定义搜索引擎' : '添加自定义搜索引擎';
		}
		
		// 设置保存按钮文本
		const saveBtn = document.getElementById('save-engine-btn');
		if (saveBtn) {
			saveBtn.textContent = editMode ? '更新' : '保存';
		}
		
		// 清空表单或填充编辑数据
		if (editMode && engineIndex >= 0 && engineIndex < currentSettings.customEngines.length) {
			const engine = currentSettings.customEngines[engineIndex];
			document.getElementById('engine-name').value = engine.name || '';
			document.getElementById('engine-url').value = engine.url || '';
			document.getElementById('engine-homepage').value = engine.homepage || '';
			document.getElementById('engine-icon').value = engine.icon || '';
			
			// 显示图标预览
			if (engine.icon) {
				const preview = document.getElementById('icon-preview');
				if (preview) {
					preview.src = engine.icon;
					preview.style.display = 'block';
				}
			}
			
			// 保存编辑状态到弹窗元素
			modal.setAttribute('data-edit-mode', 'true');
			modal.setAttribute('data-engine-index', engineIndex.toString());
		} else {
			// 清空表单
			document.getElementById('engine-name').value = '';
			document.getElementById('engine-url').value = '';
			document.getElementById('engine-homepage').value = '';
			document.getElementById('engine-icon').value = '';
			
			// 清空图标预览
			const preview = document.getElementById('icon-preview');
			if (preview) {
				preview.style.display = 'none';
			}
			
			// 重置获取图标按钮
			const fetchBtn = document.getElementById('fetch-icon-btn');
			if (fetchBtn) {
				fetchBtn.disabled = false;
				fetchBtn.textContent = '获取图标';
			}
			
			// 清除编辑状态
			modal.removeAttribute('data-edit-mode');
			modal.removeAttribute('data-engine-index');
		}
	}
	
	// 隐藏添加搜索引擎弹窗
	function hideAddEngineModal() {
		const modal = document.getElementById('add-engine-modal');
		modal.style.display = 'none';
		
		// 清除编辑状态
		modal.removeAttribute('data-edit-mode');
		modal.removeAttribute('data-engine-index');
	}
	
	// 保存自定义搜索引擎
	function saveCustomEngine() {
		const modal = document.getElementById('add-engine-modal');
		const isEditMode = modal.getAttribute('data-edit-mode') === 'true';
		const engineIndex = parseInt(modal.getAttribute('data-engine-index') || '-1');
		
		const name = document.getElementById('engine-name').value.trim();
		const url = document.getElementById('engine-url').value.trim();
		const homepage = document.getElementById('engine-homepage').value.trim();
		const icon = document.getElementById('engine-icon').value.trim();
		
		// 验证必填字段
		if (!name) {
			showStatus('请输入搜索引擎名称', 'error');
			return;
		}
		
		if (!url) {
			showStatus('请输入搜索URL', 'error');
			return;
		}
		
		// 验证URL格式
		if (!url.includes('%s')) {
			showStatus('搜索URL必须包含 %s 作为搜索关键词的占位符', 'error');
			return;
		}
		
		// 验证URL格式
		try {
			new URL(url.replace('%s', 'test'));
		} catch (e) {
			showStatus('搜索URL格式不正确', 'error');
			return;
		}
		
		// 验证官网地址格式（如果提供）
		if (homepage) {
			try {
				new URL(homepage);
			} catch (e) {
				showStatus('官网地址格式不正确', 'error');
				return;
			}
		}
		
		// 创建或更新搜索引擎对象
		const engineData = {
			id: isEditMode ? currentSettings.customEngines[engineIndex].id : 'custom_' + Date.now(),
			name: name,
			url: url,
			homepage: homepage || url.replace('%s', ''),
			icon: icon
		};
		
		if (isEditMode && engineIndex >= 0) {
			// 更新现有搜索引擎
			currentSettings.customEngines[engineIndex] = engineData;
			showStatus(`成功更新搜索引擎：${name}`, 'success');
		} else {
			// 添加新搜索引擎
			currentSettings.customEngines.push(engineData);
			showStatus(`成功添加搜索引擎：${name}`, 'success');
		}
		
		// 保存设置
		saveAndNotify();
		
		// 重新渲染
		renderCustomEngines();
		
		// 关闭弹窗
		hideAddEngineModal();
	}
	
	// 编辑自定义搜索引擎
	function editCustomEngine(index) {
		const engine = currentSettings.customEngines[index];
		if (!engine) return;
		
		// 显示编辑弹窗
		showAddEngineModal(true, index);
	}
	function deleteCustomEngine(index) {
		const engine = currentSettings.customEngines[index];
		if (!engine) return;
		
		if (confirm(`确定要删除搜索引擎"${engine.name}"吗？`)) {
			// 如果当前选中的是被删除的搜索引擎，切换回默认
			if (currentSettings.searchEngine === engine.id) {
				currentSettings.searchEngine = 'bing';
				// 更新选中状态
				const bingRadio = document.getElementById('engine-bing');
				if (bingRadio) {
					bingRadio.checked = true;
				}
			}
			
			// 从列表中删除
			currentSettings.customEngines.splice(index, 1);
			
			// 保存设置
			saveAndNotify();
			
			// 重新渲染
			renderCustomEngines();
			
			// 显示成功消息
			showStatus(`已删除搜索引擎：${engine.name}`, 'success');
		}
	}
	
	// 从网址获取图标
	function fetchIconFromUrl() {
		const homepageInput = document.getElementById('engine-homepage');
		const urlInput = document.getElementById('engine-url');
		const iconInput = document.getElementById('engine-icon');
		const fetchBtn = document.getElementById('fetch-icon-btn');
		const preview = document.getElementById('icon-preview');
		const previewImage = document.getElementById('preview-image');
		
		let homepage = homepageInput.value.trim();
		const url = urlInput.value.trim();
		
		// 如果没有官网地址，尝试从搜索URL提取域名
		if (!homepage && url) {
			try {
				const urlObj = new URL(url.replace('%s', 'test'));
				homepage = urlObj.protocol + '//' + urlObj.hostname;
				console.log('从搜索URL提取的官网地址:', homepage);
			} catch (e) {
				console.error('无法从搜索URL提取域名:', e);
				showStatus('请输入官网地址或有效的搜索URL', 'error');
				return;
			}
		}
		
		if (!homepage) {
			showStatus('请输入官网地址或有效的搜索URL', 'error');
			return;
		}
		
		// 禁用按钮，显示加载状态
		fetchBtn.disabled = true;
		fetchBtn.textContent = '获取中...';
		
		autoFetchIcon(homepage, function(iconUrl) {
			// 恢复按钮状态
			fetchBtn.disabled = false;
			fetchBtn.textContent = '获取图标';
			
			if (iconUrl) {
				iconInput.value = iconUrl;
				showIconPreview(iconUrl);
				showStatus('图标获取成功', 'success');
			} else {
				showStatus('无法获取图标，请手动输入图标URL', 'error');
			}
		});
	}
	
	// 自动获取图标
	function autoFetchIcon(url, callback) {
		try {
			const urlObj = new URL(url);
			const domain = urlObj.hostname;
			
			// 常见的图标路径，按优先级排序
			const iconPaths = [
				`https://${domain}/favicon.ico`,
				`https://${domain}/favicon.png`,
				`https://${domain}/apple-touch-icon.png`,
				`https://${domain}/apple-touch-icon-precomposed.png`,
				`https://icons.duckduckgo.com/ip3/${domain}.ico`,
				`https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
				`https://${domain}/assets/favicon.ico`,
				`https://${domain}/static/favicon.ico`,
				`https://${domain}/images/favicon.ico`
			];
			
			// 依次尝试获取图标
			tryIconPaths(iconPaths, 0, callback);
			
		} catch (e) {
			console.error('URL解析错误:', e);
			if (callback) callback(null);
		}
	}
	
	// 依次尝试图标路径
	function tryIconPaths(iconPaths, index, callback) {
		if (index >= iconPaths.length) {
			if (callback) callback(null);
			return;
		}
		
		const iconUrl = iconPaths[index];
		const img = new Image();
		let isCompleted = false;
		
		// 设置超时处理
		const timeoutId = setTimeout(function() {
			if (!isCompleted) {
				isCompleted = true;
				console.log(`图标获取超时: ${iconUrl}`);
				tryIconPaths(iconPaths, index + 1, callback);
			}
		}, 2000); // 减少超时时间到2秒
		
		img.onload = function() {
			if (!isCompleted) {
				isCompleted = true;
				clearTimeout(timeoutId);
				
				// 检查图片尺寸是否有效
				if (this.naturalWidth > 0 && this.naturalHeight > 0) {
					console.log(`成功获取图标: ${iconUrl} (${this.naturalWidth}x${this.naturalHeight})`);
					if (callback) callback(iconUrl);
				} else {
					console.log(`图标尺寸无效: ${iconUrl}`);
					tryIconPaths(iconPaths, index + 1, callback);
				}
			}
		};
		
		img.onerror = function() {
			if (!isCompleted) {
				isCompleted = true;
				clearTimeout(timeoutId);
				console.log(`图标加载失败: ${iconUrl}`);
				tryIconPaths(iconPaths, index + 1, callback);
			}
		};
		
		// 添加CORS错误处理
		img.onabort = function() {
			if (!isCompleted) {
				isCompleted = true;
				clearTimeout(timeoutId);
				console.log(`图标加载被中止: ${iconUrl}`);
				tryIconPaths(iconPaths, index + 1, callback);
			}
		};
		
		// 开始加载图片
		try {
			img.src = iconUrl;
		} catch (e) {
			console.error(`设置图片源失败: ${iconUrl}`, e);
			if (!isCompleted) {
				isCompleted = true;
				clearTimeout(timeoutId);
				tryIconPaths(iconPaths, index + 1, callback);
			}
		}
	}
	
	// 显示图标预览
	function showIconPreview(iconUrl) {
		const preview = document.getElementById('icon-preview');
		const previewImage = document.getElementById('preview-image');
		
		if (iconUrl) {
			previewImage.src = iconUrl;
			preview.style.display = 'block';
			
			previewImage.onload = function() {
				// 图标加载成功
			};
			
			previewImage.onerror = function() {
				preview.style.display = 'none';
				showStatus('图标加载失败', 'error');
			};
		} else {
			preview.style.display = 'none';
		}
	}

	// 检查存储配额状态
	function checkStorageQuota() {
		if (window.localMediaStorage && window.localMediaStorage.getStorageInfo) {
			window.localMediaStorage.getStorageInfo().then(info => {
				if (info) {
					console.log('存储信息:', info);
					
					// 如果使用率超过80%，显示警告
					if (info.usagePercent > 80) {
						showStatus(`存储空间使用率已达 ${info.usagePercent}%，建议清理旧文件`, 'warning', 5000);
						
						// 提供清理选项
						if (confirm('存储空间不足，是否自动清理旧文件？')) {
							cleanupOldFiles();
						}
					}
				}
			}).catch(error => {
				console.error('获取存储信息失败:', error);
			});
		}
	}

	// 清理旧文件
	function cleanupOldFiles() {
		if (window.localMediaStorage && window.localMediaStorage.cleanupOldFiles) {
			window.localMediaStorage.cleanupOldFiles(3).then(result => {
				if (result && result.deleted > 0) {
					showStatus(result.message, 'success');
				} else {
					showStatus('没有需要清理的文件', 'info');
				}
			}).catch(error => {
				console.error('清理文件失败:', error);
				showStatus('清理文件失败: ' + error.message, 'error');
			});
		}
	}

	// ========== 收藏夹管理功能 ==========
	
	// 默认收藏夹数据（与index.html保持一致）
	const defaultBookmarks = [
		{ title: 'GitHub', url: 'https://github.com', icon: 'https://github.com/favicon.ico' },
		{ title: 'Google', url: 'https://www.google.com', icon: 'https://www.google.com/favicon.ico' },
		{ title: 'Bilibili', url: 'https://www.bilibili.com', icon: 'https://www.bilibili.com/favicon.ico' },
		{ title: '知乎', url: 'https://www.zhihu.com', icon: 'https://www.zhihu.com/favicon.ico' },
		{ title: '微博', url: 'https://weibo.com', icon: 'https://weibo.com/favicon.ico' },
		{ title: '淘宝', url: 'https://www.taobao.com', icon: 'https://www.taobao.com/favicon.ico' }
	];

	// 加载收藏夹数据
	function loadBookmarks() {
		if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
			chrome.storage.sync.get(['bookmarks'], function(result) {
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
				
				// 如果解析后的数据是有效数组，使用它；否则使用默认收藏夹
				const validBookmarks = Array.isArray(bookmarks) ? bookmarks : defaultBookmarks;
				renderBookmarks(validBookmarks);
				updateBookmarkCount(validBookmarks.length);
			});
		} else {
			// 备用方案：使用localStorage
			const savedBookmarks = localStorage.getItem('bookmarks');
			if (savedBookmarks) {
				try {
					const bookmarks = JSON.parse(savedBookmarks);
					// 如果解析后的数据是有效数组，使用它；否则使用默认收藏夹
					const validBookmarks = Array.isArray(bookmarks) ? bookmarks : defaultBookmarks;
					renderBookmarks(validBookmarks);
					updateBookmarkCount(validBookmarks.length);
				} catch (e) {
					// 解析失败时使用默认收藏夹
					renderBookmarks(defaultBookmarks);
					updateBookmarkCount(defaultBookmarks.length);
				}
			} else {
				// 没有保存的数据时使用默认收藏夹
				renderBookmarks(defaultBookmarks);
				updateBookmarkCount(defaultBookmarks.length);
			}
		}
	}

	// 保存收藏夹数据
	function saveBookmarks(bookmarks) {
		if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
			chrome.storage.sync.set({ bookmarks: bookmarks }, function() {
				console.log('收藏夹已保存到Chrome存储');
				showStatus('收藏夹已保存', 'success');
				
				// 同时保存到localStorage以确保index.js能够检测到变化
				localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
				
				// 通知index页面收藏夹已更新
				notifyBookmarksUpdated();
			});
		} else {
			// 备用方案：使用localStorage
			localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
			console.log('收藏夹已保存到localStorage');
			showStatus('收藏夹已保存', 'success');
			// 通知index页面收藏夹已更新
			notifyBookmarksUpdated();
		}
	}

	// 渲染收藏夹列表
	function renderBookmarks(bookmarks) {
		const bookmarksList = document.getElementById('bookmarks-list');
		
		if (!bookmarks || bookmarks.length === 0) {
			bookmarksList.innerHTML = `
				<div class="empty-bookmarks">
					暂无收藏的网页
				</div>
			`;
			return;
		}

		bookmarksList.innerHTML = bookmarks.map((bookmark, index) => {
			// 检查bookmark对象是否存在且有效
			if (!bookmark || typeof bookmark !== 'object') {
				return '';
			}
			
			return `
			<div class="bookmark-item" data-index="${index}">
				<img class="bookmark-icon" src="${bookmark.icon || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjOTk5Ii8+Cjwvc3ZnPgo='}" alt="${bookmark.title || '未知网站'}">
				<div class="bookmark-info">
					<div class="bookmark-title">${bookmark.title || '未知网站'}</div>
					<div class="bookmark-url">${bookmark.url || ''}</div>
				</div>
				<div class="bookmark-actions-group">
					<button class="bookmark-btn bookmark-pin-btn" data-index="${index}" ${index === 0 ? 'disabled' : ''}>⬆️</button>
					<button class="bookmark-btn bookmark-move-up-btn" data-index="${index}" ${index === 0 ? 'disabled' : ''}>↑</button>
					<button class="bookmark-btn bookmark-move-down-btn" data-index="${index}" ${index === bookmarks.length - 1 ? 'disabled' : ''}>↓</button>
					<button class="bookmark-btn bookmark-edit-btn" data-index="${index}" data-action="edit">编辑</button>
					<button class="bookmark-btn bookmark-delete-btn" data-index="${index}" data-action="delete">删除</button>
				</div>
			</div>
		`;}).join('');

		// 添加事件监听器
		bookmarksList.querySelectorAll('.bookmark-edit-btn').forEach(btn => {
			btn.addEventListener('click', function() {
				const index = parseInt(this.getAttribute('data-index'));
				editBookmark(index);
			});
		});

		bookmarksList.querySelectorAll('.bookmark-delete-btn').forEach(btn => {
			btn.addEventListener('click', function() {
				const index = parseInt(this.getAttribute('data-index'));
				deleteBookmark(index);
			});
		});

		// 添加置顶按钮事件监听器
		bookmarksList.querySelectorAll('.bookmark-pin-btn').forEach(btn => {
			btn.addEventListener('click', function() {
				const index = parseInt(this.getAttribute('data-index'));
				pinBookmark(index);
			});
		});

		// 添加上移按钮事件监听器
		bookmarksList.querySelectorAll('.bookmark-move-up-btn').forEach(btn => {
			btn.addEventListener('click', function() {
				const index = parseInt(this.getAttribute('data-index'));
				moveBookmarkUp(index);
			});
		});

		// 添加下移按钮事件监听器
		bookmarksList.querySelectorAll('.bookmark-move-down-btn').forEach(btn => {
			btn.addEventListener('click', function() {
				const index = parseInt(this.getAttribute('data-index'));
				moveBookmarkDown(index);
			});
		});

		// 为图标添加错误处理
		bookmarksList.querySelectorAll('.bookmark-icon').forEach(img => {
			img.addEventListener('error', function() {
				this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjOTk5Ii8+Cjwvc3ZnPgo=';
			});
		});

		// 为收藏项添加点击事件（打开链接）
		bookmarksList.querySelectorAll('.bookmark-item').forEach((item, index) => {
			item.addEventListener('click', function(e) {
				// 如果点击的是按钮，不触发打开链接
				if (e.target.closest('.bookmark-actions-group')) {
					return;
				}
				
				// 获取当前收藏夹数据
				if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
					chrome.storage.sync.get(['bookmarks'], function(result) {
						const bookmarksData = result.bookmarks || defaultBookmarks;
						const bookmark = bookmarksData[index];
						if (bookmark && bookmark.url) {
							// 在新标签页中打开链接
							if (typeof chrome !== 'undefined' && chrome.tabs) {
								chrome.tabs.create({ url: bookmark.url });
							} else {
								window.open(bookmark.url, '_blank');
							}
						}
					});
				} else {
					const savedBookmarks = localStorage.getItem('bookmarks');
					const bookmarksData = savedBookmarks ? JSON.parse(savedBookmarks) : defaultBookmarks;
					const bookmark = bookmarksData[index];
					if (bookmark && bookmark.url) {
						window.open(bookmark.url, '_blank');
					}
				}
			});
			
			// 添加鼠标悬停样式
			item.style.cursor = 'pointer';
		});
	}

	// 更新收藏夹计数
	function updateBookmarkCount(count) {
		const countElement = document.getElementById('bookmark-count');
		const clearAllBtn = document.getElementById('clear-all-bookmarks');
		const editOrderBtn = document.getElementById('edit-order-btn');
		const undoBtn = document.getElementById('undo-clear-btn');
		
		countElement.textContent = `共 ${count} 个收藏`;
		
		if (count > 0) {
			clearAllBtn.style.display = 'inline-block';
			editOrderBtn.style.display = 'inline-block';
		} else {
			clearAllBtn.style.display = 'none';
			editOrderBtn.style.display = 'none';
			// 如果收藏夹为空，隐藏撤销按钮
			if (undoBtn && !window.lastClearedBookmarks) {
				undoBtn.style.display = 'none';
			}
		}
	}

	// 添加收藏
	function addBookmark(title, url, icon) {
		// 获取当前收藏夹数据
		if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
			chrome.storage.sync.get(['bookmarks'], function(result) {
				const bookmarks = result.bookmarks || defaultBookmarks;
				const newBookmark = {
					title: title || '未知网站',
					url: url || '',
					icon: icon || `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`
				};
				
				bookmarks.push(newBookmark);
				saveBookmarks(bookmarks);
				renderBookmarks(bookmarks);
				updateBookmarkCount(bookmarks.length);
			});
		} else {
			const savedBookmarks = localStorage.getItem('bookmarks');
			const bookmarks = savedBookmarks ? JSON.parse(savedBookmarks) : defaultBookmarks;
			const newBookmark = {
				title: title || '未知网站',
				url: url || '',
				icon: icon || `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`
			};
			
			bookmarks.push(newBookmark);
			saveBookmarks(bookmarks);
			renderBookmarks(bookmarks);
			updateBookmarkCount(bookmarks.length);
		}
	}

	// 删除收藏
	function deleteBookmark(index) {
		if (confirm('确定要删除这个收藏吗？')) {
			if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
				chrome.storage.sync.get(['bookmarks'], function(result) {
					const bookmarks = (result.bookmarks && Array.isArray(result.bookmarks)) ? result.bookmarks : [];
					bookmarks.splice(index, 1);
					saveBookmarks(bookmarks);
					renderBookmarks(bookmarks);
					updateBookmarkCount(bookmarks.length);
					showStatus('收藏已删除', 'success');
				});
			} else {
				const savedBookmarks = localStorage.getItem('bookmarks');
				let bookmarks = [];
				if (savedBookmarks) {
					try {
						const parsed = JSON.parse(savedBookmarks);
						bookmarks = Array.isArray(parsed) ? parsed : [];
					} catch (e) {
						bookmarks = [];
					}
				}
				bookmarks.splice(index, 1);
				saveBookmarks(bookmarks);
				renderBookmarks(bookmarks);
				updateBookmarkCount(bookmarks.length);
				showStatus('收藏已删除', 'success');
			}
		}
	}

	// 编辑收藏
	function editBookmark(index) {
		if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
			chrome.storage.sync.get(['bookmarks'], function(result) {
				const bookmarks = (result.bookmarks && Array.isArray(result.bookmarks)) ? result.bookmarks : [];
				const bookmark = bookmarks[index];
				
				if (bookmark) {
					// 填充表单
					document.getElementById('bookmark-title').value = bookmark.title;
					document.getElementById('bookmark-url').value = bookmark.url;
					document.getElementById('bookmark-icon').value = bookmark.icon || '';
					
					// 设置编辑模式
					window.editingBookmarkIndex = index;
					
					// 显示编辑表单
					document.getElementById('bookmark-edit-form').style.display = 'block';
				}
			});
		} else {
			const savedBookmarks = localStorage.getItem('bookmarks');
			let bookmarks = [];
			if (savedBookmarks) {
				try {
					const parsed = JSON.parse(savedBookmarks);
					bookmarks = Array.isArray(parsed) ? parsed : [];
				} catch (e) {
					bookmarks = [];
				}
			}
			const bookmark = bookmarks[index];
			
			if (bookmark) {
				// 填充表单
				document.getElementById('bookmark-title').value = bookmark.title;
				document.getElementById('bookmark-url').value = bookmark.url;
				document.getElementById('bookmark-icon').value = bookmark.icon || '';
				
				// 设置编辑模式
				window.editingBookmarkIndex = index;
				
				// 显示编辑表单
				document.getElementById('bookmark-edit-form').style.display = 'block';
			}
		}
	}

	// 清空所有收藏
	function clearAllBookmarks() {
		if (confirm('确定要清空所有收藏吗？此操作可以撤销！')) {
			// 获取当前收藏夹数据用于撤销
			if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
				chrome.storage.sync.get(['bookmarks'], function(result) {
					const bookmarks = (result.bookmarks && Array.isArray(result.bookmarks)) ? result.bookmarks : [];
					
					// 保存到临时存储用于撤销
					window.lastClearedBookmarks = bookmarks;
					
					// 清空收藏夹
					const emptyBookmarks = [];
					saveBookmarks(emptyBookmarks);
					renderBookmarks(emptyBookmarks);
					updateBookmarkCount(0);
					
					// 显示撤销按钮
					const undoBtn = document.getElementById('undo-clear-btn');
					if (undoBtn) {
						undoBtn.style.display = 'inline-block';
					}
					
					showStatus('所有收藏已清空，可以撤销操作', 'info');
				});
			} else {
				const savedBookmarks = localStorage.getItem('bookmarks');
				let bookmarks = [];
				if (savedBookmarks) {
					try {
						const parsed = JSON.parse(savedBookmarks);
						bookmarks = Array.isArray(parsed) ? parsed : [];
					} catch (e) {
						bookmarks = [];
					}
				}
				
				// 保存到临时存储用于撤销
				window.lastClearedBookmarks = bookmarks;
				
				// 清空收藏夹
				const emptyBookmarks = [];
				saveBookmarks(emptyBookmarks);
				renderBookmarks(emptyBookmarks);
				updateBookmarkCount(0);
				
				// 显示撤销按钮
				const undoBtn = document.getElementById('undo-clear-btn');
				if (undoBtn) {
					undoBtn.style.display = 'inline-block';
				}
				
				showStatus('所有收藏已清空，可以撤销操作', 'info');
			}
		}
	}

	// 撤销清空收藏
	function undoClearBookmarks() {
		if (window.lastClearedBookmarks && Array.isArray(window.lastClearedBookmarks)) {
			console.log('开始撤销操作，恢复的收藏数据：', window.lastClearedBookmarks);
			
			// 直接恢复到localStorage和Chrome存储
			if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
				chrome.storage.sync.set({ bookmarks: window.lastClearedBookmarks }, function() {
					console.log('收藏夹已恢复到Chrome存储');
					localStorage.setItem('bookmarks', JSON.stringify(window.lastClearedBookmarks));
					
					// 重新加载和渲染
					loadBookmarks();
					
					// 清除临时数据
					window.lastClearedBookmarks = null;
					
					// 隐藏撤销按钮
					const undoBtn = document.getElementById('undo-clear-btn');
					if (undoBtn) {
						undoBtn.style.display = 'none';
					}
					
					showStatus('收藏夹已恢复', 'success');
				});
			} else {
				// 备用方案：使用localStorage
				localStorage.setItem('bookmarks', JSON.stringify(window.lastClearedBookmarks));
				console.log('收藏夹已恢复到localStorage');
				
				// 重新加载和渲染
				loadBookmarks();
				
				// 清除临时数据
				window.lastClearedBookmarks = null;
				
				// 隐藏撤销按钮
				const undoBtn = document.getElementById('undo-clear-btn');
				if (undoBtn) {
					undoBtn.style.display = 'none';
				}
				
				showStatus('收藏夹已恢复', 'success');
			}
		} else {
			console.log('无法撤销操作，lastClearedBookmarks:', window.lastClearedBookmarks);
			showStatus('无法撤销操作', 'error');
		}
	}

	// 上移收藏
	function moveBookmarkUp(index) {
		if (index <= 0) return; // 已经在第一个位置，无法上移
		
		if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
			chrome.storage.sync.get(['bookmarks'], function(result) {
				const bookmarks = (result.bookmarks && Array.isArray(result.bookmarks)) ? result.bookmarks : [];
				if (bookmarks.length > 1 && index > 0) {
					// 交换位置
					[bookmarks[index - 1], bookmarks[index]] = [bookmarks[index], bookmarks[index - 1]];
					saveBookmarks(bookmarks);
					renderBookmarks(bookmarks);
					showStatus('收藏已上移', 'success');
				}
			});
		} else {
			const savedBookmarks = localStorage.getItem('bookmarks');
			let bookmarks = [];
			if (savedBookmarks) {
				try {
					const parsed = JSON.parse(savedBookmarks);
					bookmarks = Array.isArray(parsed) ? parsed : [];
				} catch (e) {
					bookmarks = [];
				}
			}
			if (bookmarks.length > 1 && index > 0) {
				// 交换位置
				[bookmarks[index - 1], bookmarks[index]] = [bookmarks[index], bookmarks[index - 1]];
				saveBookmarks(bookmarks);
				renderBookmarks(bookmarks);
				showStatus('收藏已上移', 'success');
			}
		}
	}

	// 下移收藏
	function moveBookmarkDown(index) {
		if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
			chrome.storage.sync.get(['bookmarks'], function(result) {
				const bookmarks = (result.bookmarks && Array.isArray(result.bookmarks)) ? result.bookmarks : [];
				if (bookmarks.length > 1 && index < bookmarks.length - 1) {
					// 交换位置
					[bookmarks[index], bookmarks[index + 1]] = [bookmarks[index + 1], bookmarks[index]];
					saveBookmarks(bookmarks);
					renderBookmarks(bookmarks);
					showStatus('收藏已下移', 'success');
				}
			});
		} else {
			const savedBookmarks = localStorage.getItem('bookmarks');
			let bookmarks = [];
			if (savedBookmarks) {
				try {
					const parsed = JSON.parse(savedBookmarks);
					bookmarks = Array.isArray(parsed) ? parsed : [];
				} catch (e) {
					bookmarks = [];
				}
			}
			if (bookmarks.length > 1 && index < bookmarks.length - 1) {
				// 交换位置
				[bookmarks[index], bookmarks[index + 1]] = [bookmarks[index + 1], bookmarks[index]];
				saveBookmarks(bookmarks);
				renderBookmarks(bookmarks);
				showStatus('收藏已下移', 'success');
			}
		}
	}

	// 置顶收藏
	function pinBookmark(index) {
		if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
			chrome.storage.sync.get(['bookmarks'], function(result) {
				const bookmarks = (result.bookmarks && Array.isArray(result.bookmarks)) ? result.bookmarks : [];
				if (bookmarks.length > 1 && index > 0) {
					// 将当前项移到最前面
					const [pinnedBookmark] = bookmarks.splice(index, 1);
					bookmarks.unshift(pinnedBookmark);
					saveBookmarks(bookmarks);
					renderBookmarks(bookmarks);
					showStatus('收藏已置顶', 'success');
				}
			});
		} else {
			const savedBookmarks = localStorage.getItem('bookmarks');
			let bookmarks = [];
			if (savedBookmarks) {
				try {
					const parsed = JSON.parse(savedBookmarks);
					bookmarks = Array.isArray(parsed) ? parsed : [];
				} catch (e) {
					bookmarks = [];
				}
			}
			if (bookmarks.length > 1 && index > 0) {
				// 将当前项移到最前面
				const [pinnedBookmark] = bookmarks.splice(index, 1);
				bookmarks.unshift(pinnedBookmark);
				saveBookmarks(bookmarks);
				renderBookmarks(bookmarks);
				showStatus('收藏已置顶', 'success');
			}
		}
	}

	// 收藏当前页面
	function bookmarkCurrentPage() {
		if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
			chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
				if (tabs && tabs[0]) {
					const tab = tabs[0];
					const title = tab.title || '未知页面';
					const url = tab.url || '';
					const icon = tab.favIconUrl || `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`;
					
					if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
						// 填充表单并显示编辑区域
						document.getElementById('bookmark-title').value = title;
						document.getElementById('bookmark-url').value = url;
						document.getElementById('bookmark-icon').value = icon;
						
						// 设置为添加模式
						window.editingBookmarkIndex = -1;
						
						// 显示编辑表单
						document.getElementById('bookmark-edit-form').style.display = 'block';
					} else {
						showStatus('当前页面无法收藏', 'error');
					}
				} else {
					showStatus('无法获取当前页面信息', 'error');
				}
			});
		} else {
			// 非Chrome环境下的模拟
			showStatus('此功能仅在Chrome扩展中可用', 'error');
		}
	}

	// 关闭收藏夹编辑表单
	function closeBookmarkModal() {
		document.getElementById('bookmark-edit-form').style.display = 'none';
		document.getElementById('bookmark-title').value = '';
		document.getElementById('bookmark-url').value = '';
		document.getElementById('bookmark-icon').value = '';
		window.editingBookmarkIndex = -1;
	}

	// 保存收藏（从模态框）
	function saveBookmark() {
		const title = document.getElementById('bookmark-title').value.trim();
		const url = document.getElementById('bookmark-url').value.trim();
		const icon = document.getElementById('bookmark-icon').value.trim();
		
		if (!title || !url) {
			showStatus('请填写网站名称和地址', 'error');
			return;
		}
		
		// 验证URL格式
		try {
			new URL(url);
		} catch (e) {
			showStatus('请输入有效的网址', 'error');
			return;
		}
		
		if (window.editingBookmarkIndex !== undefined && window.editingBookmarkIndex >= 0) {
			// 编辑模式
			if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
				chrome.storage.sync.get(['bookmarks'], function(result) {
					const bookmarks = (result.bookmarks && Array.isArray(result.bookmarks)) ? result.bookmarks : [];
					bookmarks[window.editingBookmarkIndex] = { title, url, icon };
					saveBookmarks(bookmarks);
					renderBookmarks(bookmarks);
					closeBookmarkModal();
					showStatus('收藏已更新', 'success');
				});
			} else {
				const savedBookmarks = localStorage.getItem('bookmarks');
				let bookmarks = [];
				if (savedBookmarks) {
					try {
						const parsed = JSON.parse(savedBookmarks);
						bookmarks = Array.isArray(parsed) ? parsed : [];
					} catch (e) {
						bookmarks = [];
					}
				}
				bookmarks[window.editingBookmarkIndex] = { title, url, icon };
				saveBookmarks(bookmarks);
				renderBookmarks(bookmarks);
				closeBookmarkModal();
				showStatus('收藏已更新', 'success');
			}
		} else {
			// 添加模式
			if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
				chrome.storage.sync.get(['bookmarks'], function(result) {
					const bookmarks = (result.bookmarks && Array.isArray(result.bookmarks)) ? result.bookmarks : [];
					const newBookmark = { title, url, icon };
					
					// 检查是否已存在相同的URL
					const existingIndex = bookmarks.findIndex(b => b.url === url);
					if (existingIndex >= 0) {
						if (confirm('该网址已在收藏夹中，是否覆盖？')) {
							bookmarks[existingIndex] = newBookmark;
							showStatus('收藏已覆盖', 'success');
						} else {
							return;
						}
					} else {
						bookmarks.push(newBookmark);
						showStatus('收藏已添加', 'success');
					}
					
					saveBookmarks(bookmarks);
					renderBookmarks(bookmarks);
					updateBookmarkCount(bookmarks.length);
					closeBookmarkModal();
				});
			} else {
				const savedBookmarks = localStorage.getItem('bookmarks');
				let bookmarks = [];
				if (savedBookmarks) {
					try {
						const parsed = JSON.parse(savedBookmarks);
						bookmarks = Array.isArray(parsed) ? parsed : [];
					} catch (e) {
						bookmarks = [];
					}
				}
				const newBookmark = { title, url, icon };
				
				// 检查是否已存在相同的URL
				const existingIndex = bookmarks.findIndex(b => b.url === url);
				if (existingIndex >= 0) {
					if (confirm('该网址已在收藏夹中，是否覆盖？')) {
						bookmarks[existingIndex] = newBookmark;
						showStatus('收藏已覆盖', 'success');
					} else {
						return;
					}
				} else {
					bookmarks.push(newBookmark);
					showStatus('收藏已添加', 'success');
				}
				
				saveBookmarks(bookmarks);
				renderBookmarks(bookmarks);
				updateBookmarkCount(bookmarks.length);
				closeBookmarkModal();
			}
		}
	}

	// 初始化收藏夹功能
	function initBookmarks() {
		// 加载收藏夹
		loadBookmarks();
		
		// 绑定事件
		const addCurrentPageBtn = document.getElementById('add-current-page');
		const addCustomBookmarkBtn = document.getElementById('add-custom-bookmark');
		const clearAllBookmarksBtn = document.getElementById('clear-all-bookmarks');
		const editOrderBtn = document.getElementById('edit-order-btn');
		const undoClearBtn = document.getElementById('undo-clear-btn');
		const saveBookmarkBtn = document.getElementById('save-bookmark-btn');
		const cancelBookmarkBtn = document.getElementById('cancel-bookmark-btn');
		const bookmarkBarToggle = document.getElementById('bookmark-bar-toggle');
		const bookmarkSortOrder = document.getElementById('bookmark-sort-order');
		const exportBookmarksBtn = document.getElementById('export-bookmarks');
		const importBookmarksBtn = document.getElementById('import-bookmarks');
		const importBookmarksFile = document.getElementById('import-bookmarks-file');
		
		console.log('初始化收藏夹功能，检查元素是否存在：');
		console.log('addCurrentPageBtn:', addCurrentPageBtn);
		console.log('addCustomBookmarkBtn:', addCustomBookmarkBtn);
		console.log('saveBookmarkBtn:', saveBookmarkBtn);
		
		if (addCurrentPageBtn) {
			addCurrentPageBtn.addEventListener('click', bookmarkCurrentPage);
			console.log('已绑定收藏当前页面按钮事件');
		}
		if (addCustomBookmarkBtn) {
			addCustomBookmarkBtn.addEventListener('click', function() {
				console.log('点击添加自定义收藏按钮');
				// 清空表单
				document.getElementById('bookmark-title').value = '';
				document.getElementById('bookmark-url').value = '';
				document.getElementById('bookmark-icon').value = '';
				
				// 设置为添加模式
				window.editingBookmarkIndex = -1;
				
				// 显示编辑表单
				document.getElementById('bookmark-edit-form').style.display = 'block';
			});
			console.log('已绑定添加自定义收藏按钮事件');
		}
		if (clearAllBookmarksBtn) {
			clearAllBookmarksBtn.addEventListener('click', clearAllBookmarks);
		}
		if (editOrderBtn) {
			editOrderBtn.addEventListener('click', toggleEditMode);
		}
		if (undoClearBtn) {
			undoClearBtn.addEventListener('click', undoClearBookmarks);
		}
		if (saveBookmarkBtn) {
			saveBookmarkBtn.addEventListener('click', function() {
				console.log('点击保存收藏按钮');
				saveBookmark();
			});
			console.log('已绑定保存收藏按钮事件');
		}
		if (cancelBookmarkBtn) {
			cancelBookmarkBtn.addEventListener('click', closeBookmarkModal);
		}
		
		// 收藏夹栏开关事件
		if (bookmarkBarToggle) {
			bookmarkBarToggle.addEventListener('change', function() {
				const isEnabled = this.checked;
				saveBookmarkBarSetting(isEnabled);
				notifyIndexPageBookmarkBarChange(isEnabled);
				showStatus(isEnabled ? '收藏夹栏已开启' : '收藏夹栏已关闭', 'success');
			});
			
			// 加载收藏夹栏设置
			loadBookmarkBarSetting();
		}
		
		// 收藏夹排序事件
		if (bookmarkSortOrder) {
			bookmarkSortOrder.addEventListener('change', function() {
				const sortOrder = this.value;
				saveBookmarkSortOrder(sortOrder);
				applyBookmarkSort(sortOrder);
				showStatus('收藏夹排序已更新', 'success');
				// 通知index页面排序已变化
				notifyBookmarkSortChanged(sortOrder);
			});
			
			// 加载排序设置
			loadBookmarkSortOrder();
		}

		// 导出收藏夹功能
		if (exportBookmarksBtn) {
			exportBookmarksBtn.addEventListener('click', function() {
				exportBookmarks();
			});
		}

		// 导入收藏夹功能
		if (importBookmarksBtn) {
			importBookmarksBtn.addEventListener('click', function() {
				if (importBookmarksFile) {
					importBookmarksFile.click();
				}
			});
		}

		// 导入文件选择事件
		if (importBookmarksFile) {
			importBookmarksFile.addEventListener('change', function(e) {
				const file = e.target.files[0];
				if (file) {
					importBookmarksFromFile(file);
				}
				// 清空文件选择，允许重复选择同一文件
				this.value = '';
			});
		}
	}

	// 切换编辑模式
	function toggleEditMode() {
		const editOrderBtn = document.getElementById('edit-order-btn');
		const bookmarksList = document.getElementById('bookmarks-list');
		
		if (!editOrderBtn || !bookmarksList) return;
		
		const isCurrentlyEditing = bookmarksList.classList.contains('edit-mode');
		
		if (isCurrentlyEditing) {
			// 退出编辑模式
			bookmarksList.classList.remove('edit-mode');
			editOrderBtn.textContent = '编辑顺序';
			editOrderBtn.style.background = '#28a745';
			showStatus('已退出编辑模式', 'success');
		} else {
			// 进入编辑模式
			bookmarksList.classList.add('edit-mode');
			editOrderBtn.textContent = '完成编辑';
			editOrderBtn.style.background = '#dc3545';
			showStatus('已进入编辑模式，可以使用上移、下移和置顶按钮调整顺序', 'success');
		}
	}

	// 将关键函数暴露到全局作用域，确保HTML中的onclick能正常工作
	window.deleteBookmark = deleteBookmark;
	window.editBookmark = editBookmark;
	window.saveBookmark = saveBookmark;
	window.closeBookmarkModal = closeBookmarkModal;

	// ==================== 收藏夹栏开关功能 ====================
	
	// 保存收藏夹栏设置
	function saveBookmarkBarSetting(isEnabled) {
		// 同时保存到两个地方以确保兼容性
		const setting = { bookmarkBarEnabled: isEnabled };
		const visibleSetting = { bookmarkBarVisible: isEnabled };
		
		if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
			chrome.storage.sync.set(setting, function() {
				if (chrome.runtime.lastError) {
					console.error('保存收藏夹栏设置失败:', chrome.runtime.lastError);
				}
			});
			chrome.storage.sync.set(visibleSetting, function() {
				if (chrome.runtime.lastError) {
					console.error('保存收藏夹栏可见性设置失败:', chrome.runtime.lastError);
				}
			});
		} else {
			localStorage.setItem('bookmarkBarEnabled', JSON.stringify(isEnabled));
			localStorage.setItem('bookmarkBarVisible', JSON.stringify(isEnabled));
		}
	}
	
	// 加载收藏夹栏设置
	function loadBookmarkBarSetting() {
		const bookmarkBarToggle = document.getElementById('bookmark-bar-toggle');
		if (!bookmarkBarToggle) return;
		
		if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
			chrome.storage.sync.get(['bookmarkBarEnabled', 'bookmarkBarVisible'], function(result) {
				// 优先使用bookmarkBarVisible，如果不存在则使用bookmarkBarEnabled
				const isEnabled = result.bookmarkBarVisible !== undefined ? result.bookmarkBarVisible : 
								 (result.bookmarkBarEnabled !== undefined ? result.bookmarkBarEnabled : true);
				bookmarkBarToggle.checked = isEnabled;
			});
		} else {
			const savedEnabled = localStorage.getItem('bookmarkBarEnabled');
			const savedVisible = localStorage.getItem('bookmarkBarVisible');
			// 优先使用bookmarkBarVisible，如果不存在则使用bookmarkBarEnabled
			const isEnabled = savedVisible !== undefined ? JSON.parse(savedVisible) : 
								 (savedEnabled !== undefined ? JSON.parse(savedEnabled) : true);
			bookmarkBarToggle.checked = isEnabled;
		}
	}
	
	// 通知index页面收藏夹栏设置变化
	function notifyIndexPageBookmarkBarChange(isEnabled) {
		// 通过localStorage发送消息给index页面
		localStorage.setItem('bookmarkBarVisible', JSON.stringify(isEnabled));
		
		// 如果在Chrome扩展环境中，也通过消息传递
		if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
			chrome.runtime.sendMessage({
				type: 'bookmarkBarToggle',
				enabled: isEnabled
			});
		}
	}
	
	// 通知index页面收藏夹已更新
	function notifyBookmarksUpdated() {
		// 通过localStorage发送消息给index页面
		localStorage.setItem('bookmarksUpdated', JSON.stringify({
			timestamp: Date.now()
		}));
		
		// 如果在Chrome扩展环境中，也通过消息传递
		if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
			chrome.runtime.sendMessage({
				type: 'bookmarksUpdated'
			});
		}
	}
	
	// 通知index页面收藏夹排序已变化
	function notifyBookmarkSortChanged(sortOrder) {
		// 通过localStorage发送消息给index页面
		localStorage.setItem('bookmarkSortChanged', JSON.stringify({
			sortOrder: sortOrder,
			timestamp: Date.now()
		}));
		
		// 如果在Chrome扩展环境中，也通过消息传递
		if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
			chrome.runtime.sendMessage({
				type: 'bookmarkSortChanged',
				sortOrder: sortOrder
			});
		}
	}
	
	// ==================== 收藏夹导入导出功能 ====================
	
	// 导出收藏夹为JSON文件
	function exportBookmarks() {
		if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
			chrome.storage.sync.get(['bookmarks'], function(result) {
				const bookmarks = result.bookmarks || defaultBookmarks;
				downloadBookmarksJSON(bookmarks);
			});
		} else {
			const savedBookmarks = localStorage.getItem('bookmarks');
			const bookmarks = savedBookmarks ? JSON.parse(savedBookmarks) : defaultBookmarks;
			downloadBookmarksJSON(bookmarks);
		}
	}
	
	// 下载收藏夹JSON文件
	function downloadBookmarksJSON(bookmarks) {
		try {
			// 创建包含元数据的导出对象
			const exportData = {
				version: "1.0",
				exportDate: new Date().toISOString(),
				bookmarks: bookmarks
			};
			
			// 转换为JSON字符串
			const jsonString = JSON.stringify(exportData, null, 2);
			
			// 创建Blob对象
			const blob = new Blob([jsonString], { type: 'application/json' });
			
			// 创建下载链接
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `bookmarks_${new Date().toISOString().split('T')[0]}.json`;
			
			// 触发下载
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			
			// 清理URL对象
			URL.revokeObjectURL(url);
			
			showStatus('收藏夹导出成功', 'success');
		} catch (error) {
			console.error('导出收藏夹失败:', error);
			showStatus('导出收藏夹失败', 'error');
		}
	}
	
	// 从文件导入收藏夹
	function importBookmarksFromFile(file) {
		if (!file) return;
		
		// 检查文件类型
		if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
			showStatus('请选择JSON格式的收藏夹文件', 'error');
			return;
		}
		
		const reader = new FileReader();
		reader.onload = function(e) {
			try {
				const content = e.target.result;
				const importData = JSON.parse(content);
				
				// 验证导入数据的格式
				let bookmarks = [];
				if (importData.bookmarks && Array.isArray(importData.bookmarks)) {
					// 新格式（包含元数据）
					bookmarks = importData.bookmarks;
				} else if (Array.isArray(importData)) {
					// 旧格式（直接是收藏夹数组）
					bookmarks = importData;
				} else {
					throw new Error('无效的收藏夹文件格式');
				}
				
				// 验证每个收藏夹项的格式并标准化字段名
				const validBookmarks = bookmarks.filter(bookmark => {
					return bookmark && 
						   ((typeof bookmark.name === 'string' && bookmark.name.trim() !== '') || 
						    (typeof bookmark.title === 'string' && bookmark.title.trim() !== '')) &&
						   typeof bookmark.url === 'string' &&
						   bookmark.url.trim() !== '';
				}).map(bookmark => {
					// 标准化字段名，确保使用title字段
					return {
						title: bookmark.title || bookmark.name || '未知网站',
						url: bookmark.url,
						icon: bookmark.icon || `https://www.google.com/s2/favicons?domain=${new URL(bookmark.url).hostname}&sz=32`
					};
				});
				
				if (validBookmarks.length === 0) {
					throw new Error('文件中没有有效的收藏夹数据');
				}
				
				// 保存导入的收藏夹
				saveBookmarks(validBookmarks);
				renderBookmarks(validBookmarks);
				updateBookmarkCount(validBookmarks.length);
				
				// 通知index页面收藏夹已更新
				notifyBookmarksUpdated();
				
				showStatus(`成功导入 ${validBookmarks.length} 个收藏夹`, 'success');
				
			} catch (error) {
				console.error('导入收藏夹失败:', error);
				showStatus('导入收藏夹失败：' + error.message, 'error');
			}
		};
		
		reader.onerror = function() {
			console.error('读取文件失败');
			showStatus('读取文件失败', 'error');
		};
		
		reader.readAsText(file);
	}
	
	// ==================== 收藏夹排序功能 ====================
	
	// 保存收藏夹排序设置
	function saveBookmarkSortOrder(sortOrder) {
		const setting = { bookmarkSortOrder: sortOrder };
		
		if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
			chrome.storage.sync.set(setting, function() {
				if (chrome.runtime.lastError) {
					console.error('保存收藏夹排序设置失败:', chrome.runtime.lastError);
				}
			});
		} else {
			localStorage.setItem('bookmarkSortOrder', JSON.stringify(sortOrder));
		}
	}
	
	// 加载收藏夹排序设置
	function loadBookmarkSortOrder() {
		const bookmarkSortOrder = document.getElementById('bookmark-sort-order');
		if (!bookmarkSortOrder) return;
		
		if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
			chrome.storage.sync.get(['bookmarkSortOrder'], function(result) {
				const sortOrder = result.bookmarkSortOrder || 'default';
				bookmarkSortOrder.value = sortOrder;
			});
		} else {
			const saved = localStorage.getItem('bookmarkSortOrder');
			const sortOrder = saved ? JSON.parse(saved) : 'default';
			bookmarkSortOrder.value = sortOrder;
		}
	}
	
	// 应用收藏夹排序
	function applyBookmarkSort(sortOrder) {
		if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
			chrome.storage.sync.get(['bookmarks'], function(result) {
				let bookmarks = result.bookmarks || defaultBookmarks;
				bookmarks = sortBookmarks(bookmarks, sortOrder);
				saveBookmarks(bookmarks);
				renderBookmarks(bookmarks);
			});
		} else {
			const savedBookmarks = localStorage.getItem('bookmarks');
			let bookmarks = savedBookmarks ? JSON.parse(savedBookmarks) : defaultBookmarks;
			bookmarks = sortBookmarks(bookmarks, sortOrder);
			saveBookmarks(bookmarks);
			renderBookmarks(bookmarks);
		}
	}
	
	// 排序收藏夹
	function sortBookmarks(bookmarks, sortOrder) {
		const sortedBookmarks = [...bookmarks];
		
		switch (sortOrder) {
			case 'custom':
				// 编辑顺序保持当前顺序，通过上移、下移和置顶按钮实现
				break;
			case 'default':
			default:
				// 保持原有顺序
				break;
		}
		
		return sortedBookmarks;
	}

	// 初始化拖拽排序功能
	function initDragAndSort(container) {
		let draggedElement = null;
		let draggedIndex = null;
		let placeholder = null;

		// 清除之前的拖拽事件监听器，避免重复绑定
		container.querySelectorAll('.bookmark-item').forEach(item => {
			// 克隆节点以移除所有事件监听器
			const newItem = item.cloneNode(true);
			item.parentNode.replaceChild(newItem, item);
		});

		// 创建占位符元素
		function createPlaceholder() {
			const div = document.createElement('div');
			div.className = 'bookmark-item bookmark-placeholder';
			div.innerHTML = '<div style="padding: 10px; text-align: center; color: #3498db; font-size: 12px;">拖放到这里</div>';
			return div;
		}

		// 为所有收藏夹项添加拖拽事件
		container.querySelectorAll('.bookmark-item').forEach((item, index) => {
			const dragHandle = item.querySelector('.bookmark-drag-handle');
			
			// 只有点击拖拽手柄才能开始拖拽
			if (dragHandle) {
				// 确保拖拽手柄有正确的样式
				dragHandle.style.cursor = 'grab';
				
				dragHandle.addEventListener('mousedown', function(e) {
					e.preventDefault(); // 防止文本选择
					e.stopPropagation(); // 阻止事件冒泡
					this.style.cursor = 'grabbing';
					item.draggable = true;
					
					// 添加鼠标释放事件监听
					const mouseUpHandler = (e) => {
						e.preventDefault();
						e.stopPropagation();
						item.draggable = false;
						this.style.cursor = 'grab';
						document.removeEventListener('mouseup', mouseUpHandler);
					};
					document.addEventListener('mouseup', mouseUpHandler);
				});
			}
			
			item.addEventListener('dragstart', function(e) {
				// 只有在draggable为true时才允许拖拽
				if (!this.draggable) {
					e.preventDefault();
					return false;
				}
				
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
				const midpoint = rect.top + rect.height / 2;
				const isBefore = e.clientY < midpoint;
				
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
						let bookmarks = result.bookmarks || defaultBookmarks;
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
						saveBookmarks(bookmarks);
						renderBookmarks(bookmarks);
						
						// 通知index页面收藏夹排序变化
						notifyBookmarkSortChanged('custom');
						
						// 更新排序设置为自定义
						const sortOrderSelect = document.getElementById('bookmark-sort-order');
						if (sortOrderSelect) {
							sortOrderSelect.value = 'custom';
							saveBookmarkSortOrder('custom');
						}
						
						showStatus('收藏夹顺序已更新', 'success');
					});
				} else {
					const savedBookmarks = localStorage.getItem('bookmarks');
					let bookmarks = savedBookmarks ? JSON.parse(savedBookmarks) : defaultBookmarks;
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
					saveBookmarks(bookmarks);
					renderBookmarks(bookmarks);
					
					// 通知index页面收藏夹排序变化
					notifyBookmarkSortChanged('custom');
					
					// 更新排序设置为自定义
					const sortOrderSelect = document.getElementById('bookmark-sort-order');
					if (sortOrderSelect) {
						sortOrderSelect.value = 'custom';
						saveBookmarkSortOrder('custom');
					}
					
					showStatus('收藏夹顺序已更新', 'success');
				}
				
				return false;
			});

			item.addEventListener('dragenter', function(e) {
				// 确保占位符存在
				if (!placeholder) {
					placeholder = createPlaceholder();
				}
			});

			item.addEventListener('dragleave', function(e) {
				// 鼠标离开元素时的处理
			});
		});
	}

	// 初始化收藏夹功能
	document.addEventListener('DOMContentLoaded', function() {
		console.log('popup.js DOM加载完成，开始初始化...');
		initBookmarks();
		console.log('popup.js 初始化完成');
	});

	// 确保在Chrome扩展环境中也能正常工作
	if (document.readyState === 'loading') {
		// DOM还在加载中，等待DOMContentLoaded事件
		console.log('DOM正在加载中，等待DOMContentLoaded事件');
	} else {
		// DOM已经加载完成，直接初始化
		console.log('DOM已加载完成，直接初始化');
		initBookmarks();
	}

});