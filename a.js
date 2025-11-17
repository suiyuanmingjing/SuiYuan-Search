document.addEventListener('DOMContentLoaded', function() {
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
	
	// 标题点击事件 - 切换暗色模式
	searchTitle.addEventListener('click', function() {
		// 显示遮蔽层
		transitionOverlay.style.opacity = '1';
		transitionOverlay.style.visibility = 'visible';
		
		// 延迟切换模式，等待遮蔽层动画
		setTimeout(() => {
			isDarkMode = !isDarkMode;
			if (isDarkMode) {
				document.body.classList.add('dark-mode');
			} else {
				document.body.classList.remove('dark-mode');
			}
			
			// 延迟隐藏遮蔽层
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
	
	// 点击选项切换激活状态
	dropdownItems.forEach(item => {
		item.addEventListener('click', function(e) {
			e.stopPropagation();
			
			// 移除所有激活状态
			dropdownItems.forEach(i => i.classList.remove('active'));
			
			// 添加当前激活状态
			this.classList.add('active');
			
			// 关闭下拉菜单
			circleDropdown.classList.remove('active');
			
			// 切换搜索引擎
			const engine = this.getAttribute('data-engine');
			switchSearchEngine(engine);
		});
	});
	
	// 切换搜索引擎函数
	function switchSearchEngine(engine) {
		const circleDropdown = document.querySelector('.circle-dropdown');
		
		// 更新左侧圆形容器的data-engine属性
		circleDropdown.setAttribute('data-engine', engine);
		
		switch(engine) {
			case 'bing':
				textContent.setAttribute('data-placeholder', '必应搜索');
				console.log('已切换到必应搜索');
				break;
			case 'google':
				textContent.setAttribute('data-placeholder', '谷歌搜索');
				console.log('已切换到谷歌搜索');
				break;
			case 'baidu':
				textContent.setAttribute('data-placeholder', '百度搜索');
				console.log('已切换到百度搜索');
				break;
		}
		
		// 如果输入框为空，立即更新placeholder显示
		if (textContent.textContent.trim() === '') {
			// 强制重新渲染placeholder
			const temp = textContent.textContent;
			textContent.textContent = temp;
		}
	}
	
	// 点击页面其他地方关闭下拉菜单
	document.addEventListener('click', function() {
		circleDropdown.classList.remove('active');
	});
	
	// 阻止下拉菜单内部点击事件冒泡
	document.querySelector('.dropdown-menu').addEventListener('click', function(e) {
		e.stopPropagation();
	});
	
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
	
	// 执行搜索函数
	function performSearch() {
		const searchText = textContent.textContent.trim();
		if (searchText === '') {
			alert('请输入搜索内容');
			return;
		}
		
		// 获取当前选中的搜索引擎
		const activeItem = document.querySelector('.dropdown-item.active');
		const engine = activeItem.getAttribute('data-engine');
		
		let searchUrl = '';
		switch(engine) {
			case 'bing':
				searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(searchText)}`;
				break;
			case 'google':
				searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchText)}`;
				break;
			case 'baidu':
				searchUrl = `https://www.baidu.com/s?wd=${encodeURIComponent(searchText)}`;
				break;
		}
		
		// 在新窗口打开搜索结果
		if (searchUrl) {
			window.open(searchUrl, '_blank');
			// 清空搜索框
			textContent.textContent = '';
		}
	}
	
	// 搜索或进入官网函数
	function performSearchOrGoHome() {
		const searchText = textContent.textContent.trim();
		
		// 获取当前选中的搜索引擎
		const activeItem = document.querySelector('.dropdown-item.active');
		const engine = activeItem.getAttribute('data-engine');
		
		let targetUrl = '';
		
		if (searchText === '') {
			// 如果搜索框为空，进入搜索引擎官网
			switch(engine) {
				case 'bing':
					targetUrl = 'https://www.bing.com';
					console.log('进入必应官网');
					break;
				case 'google':
					targetUrl = 'https://www.google.com';
					console.log('进入谷歌官网');
					break;
				case 'baidu':
					targetUrl = 'https://www.baidu.com';
					console.log('进入百度官网');
					break;
			}
		} else {
			// 如果有搜索内容，执行搜索
			switch(engine) {
				case 'bing':
					targetUrl = `https://www.bing.com/search?q=${encodeURIComponent(searchText)}`;
					console.log('使用必应搜索:', searchText);
					break;
				case 'google':
					targetUrl = `https://www.google.com/search?q=${encodeURIComponent(searchText)}`;
					console.log('使用谷歌搜索:', searchText);
					break;
				case 'baidu':
					targetUrl = `https://www.baidu.com/s?wd=${encodeURIComponent(searchText)}`;
					console.log('使用百度搜索:', searchText);
					break;
			}
		}
		
		// 在新窗口打开目标页面
		if (targetUrl) {
			window.open(targetUrl, '_blank');
			
			// 如果执行了搜索（有搜索内容），清空搜索框
			if (searchText !== '') {
				textContent.textContent = '';
			}
		}
	}
});