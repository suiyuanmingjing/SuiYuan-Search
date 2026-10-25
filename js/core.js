/* 随缘搜索 · 数据层：存储、迁移、媒体 */
(function (global) {
  'use strict';

  var SETTINGS_KEY = 'suiYuanSettings';
  var BOOKMARKS_KEY = 'bookmarks';
  var LS_PREFIX = 'suiyuan:';

  function hasChrome() {
    return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync;
  }

  var BUILTIN = [
    { id: 'bing', name: '必应', icon: 'img/bing.png', url: 'https://www.bing.com/search?q=%s' },
    { id: 'google', name: '谷歌', icon: 'img/Google.png', url: 'https://www.google.com/search?q=%s' },
    { id: 'baidu', name: '百度', icon: 'img/baidu.png', url: 'https://www.baidu.com/s?wd=%s' }
  ];

  var DEFAULT_BOOKMARKS = [
    { title: 'GitHub', url: 'https://github.com' },
    { title: 'Google', url: 'https://www.google.com' },
    { title: 'Bilibili', url: 'https://www.bilibili.com' },
    { title: '知乎', url: 'https://www.zhihu.com' },
    { title: '微博', url: 'https://weibo.com' },
    { title: '淘宝', url: 'https://www.taobao.com' }
  ];

  var DEFAULT_SETTINGS = {
    engine: 'bing',
    customEngines: [],
    theme: 'auto',
    background: {
      type: 'video',
      solid: '#1b2430',
      gradient: { start: '#141e30', end: '#243b55', angle: 135 },
      video: null,
      videos: [
        { id: 'builtin-video', kind: 'builtin', name: '默认视频', url: 'video/default.mp4' }
      ],
      videoId: 'builtin-video',
      opacity: 100,
      blur: 0,
      wallpaperId: 'builtin-1',
      wallpapers: [
        { id: 'builtin-1', kind: 'builtin', name: '默认壁纸 · 晨光', url: 'img/wallpaper-1.jpg', focal: { x: 0.5, y: 0.5 } },
        { id: 'builtin-2', kind: 'builtin', name: '默认壁纸 · 日落', url: 'img/wallpaper-2.jpg', focal: { x: 0.5, y: 0.5 } },
        { id: 'builtin-3', kind: 'builtin', name: '默认壁纸 · 海底', url: 'img/wallpaper-3.jpg', focal: { x: 0.5, y: 0.5 } }
      ],
      bing: {
        url: '', base: '', copyright: '', date: '',
        uhd: false, mode: 'today', focal: { x: 0.5, y: 0.5 }
      }
    },
    history: true,
    language: 'auto',
    openFocus: true,
    dockPosition: 'bottom',
    clock: { showDate: true, hour24: true, showSeconds: false, blinkColon: false, weight: 200 },
    scrim: 18
  };

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function getSync(keys) {
    return new Promise(function (resolve) {
      if (hasChrome()) {
        chrome.storage.sync.get(keys, function (res) { resolve(res || {}); });
        return;
      }
      var out = {};
      keys.forEach(function (k) {
        var raw = localStorage.getItem(LS_PREFIX + k);
        if (raw != null) {
          try { out[k] = JSON.parse(raw); } catch (e) { out[k] = raw; }
        }
      });
      resolve(out);
    });
  }

  function setSync(obj) {
    return new Promise(function (resolve) {
      if (hasChrome()) {
        chrome.storage.sync.set(obj, function () { resolve(); });
        return;
      }
      Object.keys(obj).forEach(function (k) {
        try { localStorage.setItem(LS_PREFIX + k, JSON.stringify(obj[k])); } catch (e) {}
      });
      resolve();
    });
  }

  function migrateSettings(raw) {
    var s = clone(DEFAULT_SETTINGS);
    if (!raw || typeof raw !== 'object') return s;

    if (raw.engine) s.engine = raw.engine;
    else if (raw.searchEngine) s.engine = raw.searchEngine;

    if (Array.isArray(raw.customEngines)) {
      s.customEngines = raw.customEngines.filter(function (e) { return e && e.url && e.name; });
    }
    if (raw.theme === 'light' || raw.theme === 'dark' || raw.theme === 'auto') s.theme = raw.theme;
    if (typeof raw.history === 'boolean') s.history = raw.history;
    if (typeof raw.language === 'string') s.language = raw.language;
    if (typeof raw.openFocus === 'boolean') s.openFocus = raw.openFocus;
    if (raw.dockPosition === 'top' || raw.dockPosition === 'bottom') s.dockPosition = raw.dockPosition;

    var bg = raw.background;
    if (typeof bg === 'string') {
      if (['solid', 'gradient', 'image', 'video', 'bing'].indexOf(bg) >= 0) s.background.type = bg;
    } else if (bg && typeof bg === 'object') {
      if (bg.type) s.background.type = bg.type === 'default' ? 'image' : bg.type;
      if (bg.solid) s.background.solid = bg.solid;
      if (bg.gradient) s.background.gradient = Object.assign(s.background.gradient, bg.gradient);
      if (bg.video) s.background.video = bg.video;
      if (Array.isArray(bg.videos)) s.background.videos = bg.videos.filter(function (v) { return v && v.id; });
      if (typeof bg.videoId === 'string') s.background.videoId = bg.videoId;
      if (typeof bg.opacity === 'number') s.background.opacity = bg.opacity;
      if (typeof bg.blur === 'number') s.background.blur = bg.blur;

      if (Array.isArray(bg.wallpapers) && bg.wallpapers.length) {
        s.background.wallpapers = bg.wallpapers.filter(function (w) { return w && w.id; });
        s.background.wallpaperId = bg.wallpaperId || s.background.wallpapers[0].id;
      } else {
        // 旧数据迁移：单张图片 / 必应来源
        var legacy = bg.image;
        if (legacy) {
          s.background.wallpapers.push({
            id: 'w_legacy', kind: 'local', name: legacy.name || '我的图片',
            savedName: legacy.savedName, url: legacy.url, focal: { x: 0.5, y: 0.5 }
          });
          s.background.wallpaperId = 'w_legacy';
        }
        if (bg.source === 'bing' || bg.type === 'bing' || bg.bingUrl) {
          s.background.bing.url = bg.bingUrl || bg.bing && bg.bing.url || '';
          s.background.bing.base = bg.bingBase || '';
          s.background.bing.copyright = bg.bingCopyright || '';
          s.background.bing.date = bg.bingDate || '';
          s.background.bing.mode = bg.bingMode || 'today';
          s.background.bing.uhd = !!bg.bingUhd;
          s.background.wallpaperId = 'bing';
        }
      }

      if (bg.bing) {
        var nb = bg.bing;
        if (typeof nb.url === 'string') s.background.bing.url = nb.url;
        if (typeof nb.base === 'string') s.background.bing.base = nb.base;
        if (typeof nb.copyright === 'string') s.background.bing.copyright = nb.copyright;
        if (typeof nb.date === 'string') s.background.bing.date = nb.date;
        if (typeof nb.uhd === 'boolean') s.background.bing.uhd = nb.uhd;
        if (nb.mode === 'today' || nb.mode === 'random') s.background.bing.mode = nb.mode;
        if (nb.focal) s.background.bing.focal = nb.focal;
      }

      if (typeof bg.bingUhd === 'boolean') s.background.bing.uhd = bg.bingUhd;
      if (typeof bg.bingMode === 'string') s.background.bing.mode = bg.bingMode;
      if (typeof bg.bingUrl === 'string' && bg.bingUrl) s.background.bing.url = bg.bingUrl;
      if (typeof bg.bingCopyright === 'string') s.background.bing.copyright = bg.bingCopyright;
      if (typeof bg.bingBase === 'string') s.background.bing.base = bg.bingBase;
    }

    if (raw.solidColor) s.background.solid = raw.solidColor;
    if (raw.gradientStart) s.background.gradient.start = raw.gradientStart;
    if (raw.gradientEnd) s.background.gradient.end = raw.gradientEnd;
    if (raw.gradientDirection) s.background.gradient.angle = parseInt(raw.gradientDirection, 10) || 135;
    if (raw.imageLight) s.background.image = raw.imageLight;
    else if (raw.image && !s.background.image) s.background.image = raw.image;
    if (raw.video) s.background.video = raw.video;
    if (typeof raw.imageOpacity === 'number') s.background.opacity = raw.imageOpacity;
    if (typeof raw.imageBlur === 'number') s.background.blur = raw.imageBlur;
    if (!s.background.image && raw.imageDark) s.background.image = raw.imageDark;

    if (raw.clock) s.clock = Object.assign(s.clock, raw.clock);
    if (typeof raw.showSeconds === 'boolean') s.clock.showSeconds = raw.showSeconds;
    if (raw.titleDisplay === 'none') s.clock.showDate = false;
    if (typeof raw.scrim === 'number') s.scrim = raw.scrim;

    if (['solid', 'gradient', 'image', 'video'].indexOf(s.background.type) < 0) s.background.type = 'image';
    if (!s.background.wallpapers || !s.background.wallpapers.length) {
      s.background.wallpapers = clone(DEFAULT_SETTINGS.background.wallpapers);
    }
    if (!Array.isArray(s.background.videos)) s.background.videos = [];
    if (!s.background.videos.length && s.background.video && s.background.video.savedName) {
      s.background.videos.push({
        id: 'v_legacy', kind: 'video', name: s.background.video.name || '我的视频',
        savedName: s.background.video.savedName, type: s.background.video.type, size: s.background.video.size
      });
      s.background.videoId = 'v_legacy';
    }
    s.background.videos.forEach(function (v) {
      if (v.id === 'builtin-video' || v.url === 'video/default.mp4') v.kind = 'builtin';
    });
    if (!s.background.videoId && s.background.videos.length) s.background.videoId = s.background.videos[0].id;
    if (s.background.type === 'video' && !s.background.videos.length) s.background.type = 'image';

    // 旧数据只有 bing 字段、没有壁纸数组时，恢复「必应每日」的选择
    if (s.background.bing.url && !(Array.isArray(bg.wallpapers) && bg.wallpapers.length) &&
        (bg.wallpaperId === 'bing' || !bg.wallpaperId)) {
      s.background.wallpaperId = 'bing';
    }

    // 旧的内置亮/暗壁纸：升级为新的三张默认壁纸 + 默认视频
    var onlyOldBuiltin = s.background.wallpapers.length > 0 && s.background.wallpapers.every(function (w) {
      return w.id === 'builtin-light' || w.id === 'builtin-dark';
    });
    if (onlyOldBuiltin) {
      s.background.wallpapers = clone(DEFAULT_SETTINGS.background.wallpapers);
      s.background.wallpaperId = 'builtin-1';
      if (!s.background.videos.length) {
        s.background.videos = clone(DEFAULT_SETTINGS.background.videos);
        s.background.videoId = DEFAULT_SETTINGS.background.videoId;
        s.background.type = 'video';
      }
    }

    var ids = s.background.wallpapers.map(function (w) { return w.id; });
    if (ids.indexOf(s.background.wallpaperId) < 0 && s.background.wallpaperId !== 'bing') {
      s.background.wallpaperId = s.background.wallpapers[0].id;
    }

    return s;
  }

  function saveMedia(file, kind) {
    var ext = (file.name.split('.').pop() || 'bin').toLowerCase();
    var name = kind + '_' + Date.now() + '_' + Math.floor(Math.random() * 1000) + '.' + ext;
    var ms = global.localMediaStorage;
    var job = ms && ms.put ? ms.put(name, file, file.type) : Promise.resolve(false);
    return job.then(function () {
      return { savedName: name, name: file.name, type: file.type, size: file.size };
    });
  }

  function resolveMedia(ref) {
    if (!ref) return Promise.resolve('');
    if (typeof ref === 'string') return Promise.resolve(ref);
    if (ref.dataUrl) return Promise.resolve(ref.dataUrl);
    if (ref.savedName && global.localMediaStorage) {
      return global.localMediaStorage.get(ref.savedName).then(function (blob) {
        return blob ? URL.createObjectURL(blob) : (ref.url || '');
      }).catch(function () { return ref.url || ''; });
    }
    return Promise.resolve(ref.url || '');
  }

  function mediaMeta(ref) {
    if (!ref || typeof ref !== 'object') return ref;
    if (!ref.savedName) return ref;
    return { savedName: ref.savedName, name: ref.name, type: ref.type, size: ref.size };
  }

  function hostOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return url || ''; }
  }

  function faviconFor(url) {
    var host = hostOf(url || '');
    if (!host) return '';
    return 'https://favicon.im/' + host;
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }

  global.SY = {
    SETTINGS_KEY: SETTINGS_KEY,
    BOOKMARKS_KEY: BOOKMARKS_KEY,
    BUILTIN: BUILTIN,
    DEFAULT_BOOKMARKS: DEFAULT_BOOKMARKS,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    getSync: getSync,
    setSync: setSync,
    migrateSettings: migrateSettings,
    saveMedia: saveMedia,
    resolveMedia: resolveMedia,
    mediaMeta: mediaMeta,
    clone: clone,
    hostOf: hostOf,
    faviconFor: faviconFor,
    escapeHtml: escapeHtml,
    debounce: debounce
  };
})(window);
