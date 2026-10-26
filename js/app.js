/* 随缘搜索 · 界面层 */
(function () {
  'use strict';

  var SY = window.SY;
  var $ = function (id) { return document.getElementById(id); };

  var settings, bookmarks;
  var videoUrls = {};
  var sugList = [], sugIndex = -1, sugTimer = null, sugAbort = null, sugSeq = 0, sugCache = {};
  var editEngineIndex = -1, editBookmarkIndex = -1;
  var mql = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var IS_EXTENSION = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
  var lastClock = '';
  var lastDate = '';
  var HISTORY_KEY = 'searchHistory';
  var wpUrls = {};
  var focalId = null;
  var longPressTimer = null;
  var lastProbeUrl = '';
  var lastBgSig = '';
  var wallGridDirty = true;
  var videoGridDirty = true;
  var historyItems = [];
  var ICON_CLOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>';

  var el = {};

  var GEAR = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.03 7.03 0 0 0-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96a.48.48 0 0 0-.59.22L2.74 8.87a.48.48 0 0 0 .12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94L2.86 14.5a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.3.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"/></svg>';

  var ICON_SEARCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></svg>';

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    el.bg = $('bg');
    el.bgImage = $('bgImage');
    el.bgVideo = $('bgVideo');
    el.scrim = $('scrim');
    el.clock = $('clock');
    el.clockH = $('clockH');
    el.clockM = $('clockM');
    el.clockS = $('clockS');
    el.clockSuffix = $('clockSuffix');
    el.clockColon2 = $('clockColon2');
    el.date = $('date');
    el.form = $('searchForm');
    el.query = $('query');
    el.engineBtn = $('engineBtn');
    el.engineIcon = $('engineIcon');
    el.engineMenu = $('engineMenu');
    el.suggestions = $('suggestions');
    el.dock = $('dock');
    el.dockScroll = $('dockScroll');
    el.dockExpand = $('dockExpand');
    el.settings = $('settings');
    el.toast = $('toast');

    Promise.all([
      SY.getSync([SY.SETTINGS_KEY]),
      SY.getSync([SY.BOOKMARKS_KEY, HISTORY_KEY])
    ]).then(function (results) {
      var settingsRes = results[0] || {};
      var bookmarksRes = results[1] || {};
      settings = SY.migrateSettings(settingsRes[SY.SETTINGS_KEY]);
      bookmarks = Array.isArray(bookmarksRes[SY.BOOKMARKS_KEY]) ? bookmarksRes[SY.BOOKMARKS_KEY] : SY.clone(SY.DEFAULT_BOOKMARKS);
      historyItems = Array.isArray(bookmarksRes[HISTORY_KEY]) ? bookmarksRes[HISTORY_KEY] : [];
      bookmarks = bookmarks.map(function (b) {
        if (!b || !b.icon) return b;
        if (/google\.com\/s2\/favicons/.test(b.icon) || b.icon.indexOf('img/sites/') === 0) {
          var copy = Object.assign({}, b);
          delete copy.icon;
          return copy;
        }
        return b;
      });
      return Promise.all([
        resolveWallpapers(),
        resolveVideos()
      ]);
    }).then(function () {
      if (settings.background.opacity === 0) {
        settings.background.opacity = 100;
        toast('背景不透明度为 0，已恢复为 100%');
      }
      if (el.date) el.date.style.fontSize = '';
      applyClockWeight();
      applyTheme();
      applyScrim();
      renderEngineButton();
      renderDock();
      syncSettingsUI();
      tick();
      setInterval(function () { if (!document.hidden) tick(); }, 1000);
      setInterval(function () {
        if (document.hidden || !settings || !settings.clock.blinkColon) return;
        el.clock.classList.toggle('colon-off');
      }, 500);
      bindEvents();

      applyLanguage();

      // 进入时轻量探测必应网络，失败用气泡提示（不弹浏览器对话框）
      (function () {
        var probe = new Image();
        var done = false;
        var timer = setTimeout(function () {
          if (done) return;
          done = true;
          toast('网络连接较慢，必应壁纸可能加载失败');
        }, 6000);
        probe.onload = function () { done = true; clearTimeout(timer); };
        probe.onerror = function () {
          if (done) return;
          done = true;
          clearTimeout(timer);
          toast('网络连接异常，必应壁纸可能无法加载');
        };
        probe.src = 'https://cn.bing.com/favicon.ico?d=' + Date.now();
      })();

      if (location.search.indexOf('debug') >= 0) {
        var dbg = document.createElement('pre');
        dbg.style.cssText = 'position:fixed;left:8px;top:8px;z-index:9999;max-width:48vw;max-height:60vh;overflow:auto;background:rgba(0,0,0,.78);color:#7CFF8A;font:11px/1.5 monospace;padding:10px;border-radius:8px;white-space:pre-wrap';
        document.body.appendChild(dbg);
        setInterval(function () {
          var b = settings.background;
          var v = el.bgVideo;
          dbg.textContent = JSON.stringify({
            type: b.type, wallpaperId: b.wallpaperId, opacity: b.opacity, scrim: settings.scrim,
            imageUrl: (el.bgImage.style.backgroundImage || '').slice(0, 100),
            imageInlineOpacity: el.bgImage.style.opacity,
            imageClass: el.bgImage.className,
            videos: (b.videos || []).length,
            videoSrc: (v.getAttribute('src') || '').slice(0, 60),
            videoReady: v.readyState,
            videoError: v.error ? v.error.code : null,
            videoShown: v.classList.contains('show'),
            videoPaused: v.paused
          }, null, 2);
        }, 600);
      }
      if (!settings.background.bing.url || settings.background.bing.date !== todayStamp()) {
        loadBing(settings.background.bing.mode || 'today', true);
      }

      // 诊断：内置壁纸缺失时给出明确提示，而不是静默空白
      var probeBuiltin = new Image();
      probeBuiltin.onerror = function () {
        toast('内置壁纸加载失败：请确认 img 目录与 index.html 在同一文件夹');
      };
      probeBuiltin.src = 'img/wallpaper-1.jpg';
    }).catch(function (err) {
      console.error('[随缘搜索] 初始化失败', err);
    });
  }

  /* ---------------- 时钟 ---------------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function tick() {
    if (!settings) return;
    var now = new Date();
    var h = now.getHours();
    if (!settings.clock.hour24) {
      var h24 = h;
      h = h % 12;           // 午夜 0 点保持 0
      if (h24 === 12) h = 12; // 中午 12 点仍是 12
    }
    var hh = settings.clock.hour24 ? pad(h) : String(h);
    var mm = pad(now.getMinutes());
    var ss = pad(now.getSeconds());
    var showSec = !!settings.clock.showSeconds;
    var text = hh + ':' + mm + (showSec ? ':' + ss : '');

    if (text !== lastClock) {
      lastClock = text;
      el.clockH.textContent = hh;
      el.clockM.textContent = mm;
      el.clockS.textContent = ss;
      el.clockS.hidden = !showSec;
      el.clockColon2.hidden = !showSec;
      el.clockSuffix.textContent = '';
    }
    if (!settings.clock.blinkColon) el.clock.classList.remove('colon-off');

    var dateText = settings.clock.showDate
      ? (now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日 ' + WEEK[now.getDay()])
      : '';
    if (dateText !== lastDate) {
      lastDate = dateText;
      el.date.textContent = dateText;
    }
    el.date.hidden = !dateText;
  }

  function applyClockWeight() {
    var w = (settings && settings.clock && typeof settings.clock.weight === 'number') ? settings.clock.weight : 200;
    document.documentElement.style.setProperty('--clock-weight', String(w));
    var chips = document.querySelectorAll('#weightChips button');
    Array.prototype.forEach.call(chips, function (b) {
      b.classList.toggle('active', parseInt(b.getAttribute('data-weight'), 10) === w);
    });
  }

  function resolvedTheme() {
    if (settings && settings.theme === 'auto') return (mql && mql.matches) ? 'dark' : 'light';
    return (settings && settings.theme) || 'light';
  }

  function applyTheme() {
    var dark = resolvedTheme() === 'dark';
    document.documentElement.classList.toggle('dark', dark);
    Array.prototype.forEach.call(document.querySelectorAll('#themeChips button'), function (b) {
      b.classList.toggle('active', b.getAttribute('data-theme') === settings.theme);
    });
    applyBackground();
  }

  var WEEK = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  function formatDate(d) {
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + WEEK[d.getDay()];
  }

  /* ---------------- 背景 ---------------- */
  function setImageLayer(url, op, blur, focal) {
    el.bgImage.style.backgroundImage = 'url("' + url + '")';
    el.bgImage.style.backgroundPosition = (focal.x * 100) + '% ' + (focal.y * 100) + '%';
    el.bgImage.style.opacity = String(op);
    el.bgImage.style.filter = blur ? 'blur(' + blur + 'px)' : 'none';
    el.bgImage.style.transform = blur ? 'scale(' + (1 + blur / 160) + ')' : 'none';
    el.bgImage.classList.add('show');
  }

  function applyBackground() {
    if (!settings) return;
    var b = settings.background;
    var vv = (b.type === 'video') ? currentVideo() : null;
    var sigWp = currentWallpaper();
    var sigFocal = (sigWp && sigWp.focal) || { x: 0.5, y: 0.5 };
    var sig = [b.type, b.solid, b.gradient.start, b.gradient.end, b.gradient.angle, b.opacity, b.blur,
      b.wallpaperId, wallpaperUrl(sigWp), sigFocal.x, sigFocal.y, b.videoId,
      vv ? (videoUrls[vv.id] || vv.url || '') : ''].join('|');
    if (sig === lastBgSig) return;
    lastBgSig = sig;

    document.body.classList.remove('video-bg');
    el.bgVideo.pause();
    el.bgVideo.classList.remove('show');
    el.bgVideo.style.opacity = '0';
    el.bgImage.classList.remove('show');
    el.bgImage.style.opacity = '0';
    el.bg.style.background = '';

    if (b.type === 'solid') {
      el.bg.style.background = b.solid;
      return;
    }
    if (b.type === 'gradient') {
      el.bg.style.background = 'linear-gradient(' + (b.gradient.angle || 135) + 'deg, ' + b.gradient.start + ', ' + b.gradient.end + ')';
      return;
    }

    var wp = currentWallpaper();
    var builtin = 'img/wallpaper-1.jpg';
    var imgUrl = wallpaperUrl(wp) || builtin;
    var focal = (wp && wp.focal) || { x: 0.5, y: 0.5 };
    var opNum = (typeof b.opacity === 'number' && isFinite(b.opacity)) ? b.opacity : 100;
    var op = opNum / 100;
    var blur = (typeof b.blur === 'number' && isFinite(b.blur)) ? b.blur : 0;

    if (b.type === 'video') {
      // 视频加载期间显示灰色底，不展示默认壁纸
      el.bg.style.background = '#1b1d22';

      var v = currentVideo();
      var vurl = v ? (videoUrls[v.id] || v.url || '') : '';
      if (!vurl) return;
      document.body.classList.add('video-bg');

      var video = el.bgVideo;
      if (video.getAttribute('src') !== vurl) video.setAttribute('src', vurl);
      video.style.opacity = String(op);
      video.style.filter = blur ? 'blur(' + blur + 'px)' : 'none';
      video.style.transform = blur ? 'scale(' + (1 + blur / 160) + ')' : 'none';

      var reveal = function () {
        if (video.getAttribute('src') !== vurl) return;
        if (video.readyState < 2) return;
        video.classList.add('show');
        el.bgImage.classList.remove('show');
        el.bgImage.style.opacity = '0';
      };

      video.addEventListener('loadeddata', reveal, { once: true });
      video.addEventListener('error', function () {
        setImageLayer(imgUrl, 1, 0, focal);
        video.classList.remove('show');
      }, { once: true });
      if (video.readyState >= 2) reveal();

      var p = video.play();
      if (p && p.catch) {
        p.catch(function () {
          if (video._autoplayHinted) return;
          video._autoplayHinted = true;
          toast('浏览器拦截了自动播放，点一下页面即可播放');
          var resume = function () {
            video.play().catch(function () {});
            document.removeEventListener('click', resume);
          };
          setTimeout(function () { document.addEventListener('click', resume); }, 100);
        });
      }
      return;
    }

    // 图片壁纸：先铺上，再探测是否真的能加载
    setImageLayer(imgUrl, op, blur, focal);

    if (imgUrl !== lastProbeUrl) {
      lastProbeUrl = imgUrl;
      var probe = new Image();
      probe.onerror = function () {
        if (imgUrl === builtin) return;
        if (b.wallpaperId === 'bing' && b.bing.url && b.bing.url.indexOf('api.bimg.cc') < 0) {
          b.bing.url = bingFallbackUrl(b.bing);
          applyBackground();
          return;
        }
        toast('这张壁纸加载失败，已回退到内置壁纸');
        setImageLayer(builtin, op, 0, { x: 0.5, y: 0.5 });
      };
      probe.src = imgUrl;
    }
  }

  function applyScrim() {
    el.scrim.style.opacity = (settings.scrim / 100);
  }

  /* ---------------- 引擎与搜索 ---------------- */
  function allEngines() {
    var out = SY.BUILTIN.slice();
    (settings.customEngines || []).forEach(function (e, i) {
      out.push({
        id: e.id || ('custom_' + i),
        name: e.name,
        icon: e.icon || SY.faviconFor((e.url || '').replace('%s', '')) || 'img/ico.ico',
        url: e.url,
        custom: true,
        index: i
      });
    });
    return out;
  }

  function currentEngine() {
    var list = allEngines();
    for (var i = 0; i < list.length; i++) if (list[i].id === settings.engine) return list[i];
    return list[0];
  }

  function renderEngineButton() {
    var e = currentEngine();
    el.engineIcon.src = e.icon || 'img/ico.ico';
    el.engineIcon.alt = e.name;
    attachIconFallback(el.engineIcon, e.name);
  }

  function renderEngineMenu() {
    var list = allEngines();
    el.engineMenu.innerHTML = list.map(function (e) {
      var check = e.id === settings.engine
        ? '<svg class="check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M20 6L9 17l-5-5"/></svg>'
        : '';
      return '<button type="button" data-engine="' + esc(e.id) + '">' +
        '<img src="' + esc(e.icon) + '" alt="">' +
        '<span>' + esc(trName(e.name)) + '</span>' + check + '</button>';
    }).join('');
    attachIconFallbacks(el.engineMenu);
  }

  function toggleEngineMenu(force) {
    var open = typeof force === 'boolean' ? force : el.engineMenu.hidden;
    if (open) renderEngineMenu();
    el.engineMenu.hidden = !open;
    el.engineBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function looksLikeUrl(text) {
    var t = String(text || '').trim();
    if (!t || /\s/.test(t)) return false;
    if (/^https?:\/\//i.test(t)) return true;
    if (/^localhost(:\d+)?(\/.*)?$/i.test(t)) return true;
    return /^[a-z0-9-]+(\.[a-z0-9-]+)+(\:\d+)?(\/.*)?$/i.test(t);
  }

  function toUrl(text) {
    var t = String(text || '').trim();
    return /^https?:\/\//i.test(t) ? t : 'https://' + t;
  }

  var HOMES = { bing: 'https://www.bing.com', google: 'https://www.google.com', baidu: 'https://www.baidu.com' };

  function engineHome(e) {
    if (!e) return 'https://www.bing.com';
    if (HOMES[e.id]) return HOMES[e.id];
    return e.homepage || String(e.url || '').split('?')[0] || 'https://www.bing.com';
  }

  function doSearch(text) {
    var q = String(text || '').trim();
    if (!q) { location.href = engineHome(currentEngine()); return; }
    if (looksLikeUrl(q)) { location.href = toUrl(q); return; }
    var e = currentEngine();
    var url = e.url && e.url.indexOf('%s') >= 0 ? e.url.replace('%s', encodeURIComponent(q)) : e.url;
    location.href = url;
  }

  /* ---------------- 搜索联想 ---------------- */
  function showSuggestions(list) {
    var next = (list || []).slice(0, 8);
    if (!el.suggestions.hidden && next.length && next.join('\u0001') === sugList.join('\u0001')) return;
    sugList = next;
    sugIndex = -1;
    if (!sugList.length) { hideSuggestions(); return; }
    el.suggestions.innerHTML = sugList.map(function (s, i) {
      return '<button type="button" data-sug="' + i + '">' + ICON_SEARCH + '<span>' + esc(s) + '</span></button>';
    }).join('');
    el.suggestions.hidden = false;
    highlightSuggestion();
  }

  function hideSuggestions() {
    el.suggestions.hidden = true;
    el.suggestions.innerHTML = '';
    sugList = [];
    sugIndex = -1;
  }

  function highlightSuggestion() {
    var nodes = el.suggestions.querySelectorAll('button');
    for (var i = 0; i < nodes.length; i++) nodes[i].classList.toggle('active', i === sugIndex);
  }

  function onQueryInput() {
    var q = el.query.value.trim();
    clearTimeout(sugTimer);
    if (sugAbort) { try { sugAbort.abort(); } catch (e) {} sugAbort = null; }
    if (!q) { hideSuggestions(); showHistory(); return; }
    if (sugCache[q]) showSuggestions(sugCache[q].slice(0, 8));
    sugTimer = setTimeout(function () { fetchSuggestions(q); }, 20);
  }

  function dedupe(list) {
    var seen = {}, out = [];
    (list || []).forEach(function (s) {
      s = String(s || '').trim();
      if (!s || seen[s]) return;
      seen[s] = 1;
      out.push(s);
    });
    return out;
  }

  function fetchSuggestions(q) {
    var key = String(q || '').trim();
    if (!key) { hideSuggestions(); return; }

    var seq = ++sugSeq;
    var shown = false;
    var merged = [];

    function accept(list) {
      if (seq !== sugSeq || !Array.isArray(list) || !list.length) return;
      merged = dedupe(merged.concat(list));
      if (!merged.length) return;
      shown = true;
      if (merged.length >= 4) {
        sugCache[key] = merged.slice(0, 12);
        if (Object.keys(sugCache).length > 60) sugCache = {};
      }
      showSuggestions(merged.slice(0, 8));
    }

    if (sugCache[key]) accept(sugCache[key]);
    if (!IS_EXTENSION) jsonpSuggestions(key, accept);

    if (sugAbort) { try { sugAbort.abort(); } catch (e) {} }
    sugAbort = new AbortController();
    var signal = sugAbort.signal;
    setTimeout(function () { try { sugAbort.abort(); } catch (e) {} }, 1400);

    var tasks = [
      fetchJson('https://api.bing.com/osjson.aspx?query=' + encodeURIComponent(key) + '&mkt=zh-CN', signal)
        .then(function (data) { if (Array.isArray(data) && Array.isArray(data[1])) accept(data[1]); }),
      fetchJson('https://suggestqueries.google.com/complete/search?client=firefox&q=' + encodeURIComponent(key), signal)
        .then(function (data) { if (Array.isArray(data) && Array.isArray(data[1])) accept(data[1]); }),
      fetchBaiduSuggest(key, signal).then(accept)
    ];

    Promise.allSettled(tasks).then(function () {
      if (seq === sugSeq && !shown) hideSuggestions();
    });
  }

  function fetchBaiduSuggest(q, signal) {
    return fetch('https://suggestion.baidu.com/su?wd=' + encodeURIComponent(q) + '&ie=utf-8', {
      signal: signal,
      credentials: 'omit'
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }).then(function (text) {
      var m = text.match(/s:(\[[^\]]*\])/);
      return m ? JSON.parse(m[1]) : [];
    });
  }

  function jsonpSuggestions(q, cb) {
    var name = '__sySug' + Date.now() + Math.floor(Math.random() * 1000);
    var script = document.createElement('script');
    var done = false;
    function finish(list) {
      if (done) return;
      done = true;
      try { delete window[name]; } catch (e) { window[name] = undefined; }
      if (script.parentNode) script.parentNode.removeChild(script);
      cb(list || []);
    }
    window[name] = function (data) {
      finish(data && Array.isArray(data.s) ? data.s : []);
    };
    script.src = 'https://suggestion.baidu.com/su?wd=' + encodeURIComponent(q) + '&cb=' + name + '&ie=utf-8';
    script.onerror = function () { finish([]); };
    document.head.appendChild(script);
    setTimeout(function () { finish([]); }, 2600);
  }

  function fetchJson(url, signal) {
    return fetch(url, { signal: signal, credentials: 'omit' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }).then(function (text) { return JSON.parse(text); });
  }

  /* ---------------- Dock ---------------- */
  function renderDock() {
    var html = bookmarks.slice(0, 10).map(function (b) {
      var icon = b.icon || SY.faviconFor(b.url);
      var inner = icon
        ? '<img src="' + esc(icon) + '" data-host="' + esc(SY.hostOf(b.url)) + '" alt="">'
        : '<span class="letter">' + esc(firstChar(b.title)) + '</span>';
      return '<button type="button" class="dock-item" data-url="' + esc(b.url) + '" title="' + esc(b.title) + '">' + inner + '</button>';
    }).join('');

    el.dockScroll.innerHTML = html;
    attachIconFallbacks(el.dockScroll);
    requestAnimationFrame(updateDockOverflow);
  }

  function updateDockOverflow() {
    if (!el.dockScroll) return;
    var items = Array.prototype.slice.call(el.dockScroll.children);
    items.forEach(function (it) { it.style.display = ''; });
    el.dockExpand.hidden = true;

    var style = getComputedStyle(el.dockScroll);
    var gap = parseFloat(style.columnGap || style.gap || '12') || 12;

    function fitCount(avail) {
      var total = 0, fit = 0;
      items.forEach(function (it) {
        var w = it.getBoundingClientRect().width;
        var need = total + (fit ? gap : 0) + w;
        if (need <= avail + 1) { total = need; fit++; }
      });
      return fit;
    }

    var fit = fitCount(el.dockScroll.clientWidth);
    var needsExpand = fit < items.length || bookmarks.length > 10;
    if (!needsExpand) {
      el.dockExpand.hidden = true;
      el.dock.classList.remove('has-overflow');
      return;
    }

    el.dockExpand.hidden = false;
    el.dock.classList.add('has-overflow');
    fit = fitCount(el.dockScroll.clientWidth);
    items.forEach(function (it, i) { if (i >= fit) it.style.display = 'none'; });
  }

  function firstChar(s) {
    s = String(s || '?').trim();
    return s ? s.charAt(0) : '?';
  }

  function attachIconFallback(img, label) {
    if (!img) return;
    var host = img.getAttribute('data-host') || '';
    var sources = [];
    function push(u) {
      if (u && sources.indexOf(u) < 0) sources.push(u);
    }
    push(img.getAttribute('src'));
    if (host) {
      push('https://favicon.im/' + host);
      push('https://' + host + '/favicon.ico');
    }
    var idx = 0;
    var timer = null;
    var done = false;

    function finish() {
      if (done) return;
      done = true;
      clearTimeout(timer);
      var parent = img.parentNode;
      if (!parent) return;
      var span = document.createElement('span');
      span.className = 'letter';
      span.textContent = firstChar(label);
      if (img.parentNode) img.parentNode.removeChild(img);
      parent.appendChild(span);
    }

    function arm() {
      clearTimeout(timer);
      timer = setTimeout(function () {
        if (!img.complete || img.naturalWidth === 0) next();
      }, 2500);
    }

    function next() {
      if (done) return;
      idx += 1;
      if (idx >= sources.length) { finish(); return; }
      img.src = sources[idx];
      arm();
    }

    img.addEventListener('error', next);
    img.addEventListener('load', function () {
      if (img.naturalWidth > 0) clearTimeout(timer);
    });
    if (!sources.length) { finish(); return; }
    arm();
  }

  function attachIconFallbacks(root) {
    var imgs = root.querySelectorAll('img');
    Array.prototype.forEach.call(imgs, function (img) {
      var host = img.closest('[title]');
      attachIconFallback(img, host ? host.getAttribute('title') : '?');
    });
  }

  function bookmarkKey(url) {
    try {
      var u = new URL(url);
      var host = u.hostname.replace(/^www\./i, '').toLowerCase();
      var path = u.pathname.replace(/\/+$/, '');
      return host + path + u.search;
    } catch (e) {
      return String(url || '').trim().toLowerCase();
    }
  }

  function dedupeBookmarks(list) {
    var seen = {};
    return (list || []).filter(function (b) {
      if (!b || !b.url) return false;
      var k = bookmarkKey(b.url);
      if (seen[k]) return false;
      seen[k] = 1;
      return true;
    });
  }

  function renderDockPanel() {
    var grid = $('dockPanelGrid');
    grid.innerHTML = bookmarks.map(function (b) {
      var icon = b.icon || SY.faviconFor(b.url);
      return '<button type="button" class="more-item" data-url="' + esc(b.url) + '" title="' + esc(b.title) + '">' +
        '<span class="more-icon">' +
        (icon ? '<img src="' + esc(icon) + '" data-host="' + esc(SY.hostOf(b.url)) + '" alt="">' : '<span class="letter">' + esc(firstChar(b.title)) + '</span>') +
        '</span>' +
        '<span class="more-name"><span>' + esc(b.title) + '</span></span>' +
        '</button>';
    }).join('') || '<div class="empty" style="grid-column:1/-1">还没有收藏</div>';
    attachIconFallbacks(grid);
    layoutDockPanel();
    requestAnimationFrame(function () {
      Array.prototype.forEach.call(grid.querySelectorAll('.more-name'), function (el) {
        var inner = el.firstElementChild;
        if (!inner) return;
        var over = inner.scrollWidth - el.clientWidth;
        if (over > 2) {
          el.classList.add('marquee');
          el.style.setProperty('--shift', (-over) + 'px');
        }
      });
    });
  }

  function layoutDockPanel() {
    var grid = $('dockPanelGrid');
    if (!grid || $('dockPanel').hidden) return;
    var small = window.innerHeight < 640;
    var gap = small ? 8 : 12, minW = small ? 64 : 84;
    var row = small ? 52 : 78;
    var cols = Math.floor((grid.clientWidth + gap) / (minW + gap));
    cols = Math.max(5, Math.min(7, cols));
    grid.style.setProperty('--cols', cols);
    grid.style.setProperty('--row', row + 'px');
    grid.style.setProperty('--gap', gap + 'px');
    grid.style.height = (5 * row + 4 * gap) + 'px';
  }

  function openDockPanel() {
    el.form.hidden = true;
    $('dockPanel').hidden = false;
    renderDockPanel();
    requestAnimationFrame(layoutDockPanel);
  }

  function closeDockPanel() {
    $('dockPanel').hidden = true;
    el.form.hidden = false;
  }

  function openMoreModal() {
    var grid = $('moreGrid');
    grid.innerHTML = bookmarks.map(function (b) {
      var icon = b.icon || SY.faviconFor(b.url);
      return '<button type="button" class="more-item" data-url="' + esc(b.url) + '" title="' + esc(b.title) + '">' +
        '<span class="more-icon">' +
        (icon ? '<img src="' + esc(icon) + '" data-host="' + esc(SY.hostOf(b.url)) + '" alt="">' : '<span class="letter">' + esc(firstChar(b.title)) + '</span>') +
        '</span>' +
        '<span class="more-name"><span>' + esc(b.title) + '</span></span>' +
        '</button>';
    }).join('') || '<div class="empty">还没有收藏</div>';
    attachIconFallbacks(grid);
    openModal('moreModal');
    requestAnimationFrame(function () {
      Array.prototype.forEach.call(grid.querySelectorAll('.more-name'), function (el) {
        var inner = el.firstElementChild;
        if (!inner) return;
        var over = inner.scrollWidth - el.clientWidth;
        if (over > 2) {
          el.classList.add('marquee');
          el.style.setProperty('--shift', (-over) + 'px');
        }
      });
    });
  }

  /* ---------------- 设置界面 ---------------- */
  function pauseBgVideo() {
    if (el.bgVideo && !el.bgVideo.paused) el.bgVideo.pause();
  }

  function resumeBgVideo() {
    if (el.bgVideo && settings && settings.background.type === 'video') {
      var p = el.bgVideo.play();
      if (p && p.catch) p.catch(function () {});
    }
  }

  function openSettings() {
    syncSettingsUI();
    el.settings.hidden = false;
    var panel = el.settings.querySelector('.settings-panel');
    if (panel) panel.focus();
  }

  function closeSettings() {
    el.settings.hidden = true;
    resumeBgVideo();
  }

  function switchTab(name) {
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (t) {
      t.classList.toggle('active', t.getAttribute('data-tab') === name);
    });
    Array.prototype.forEach.call(document.querySelectorAll('.panel'), function (p) {
      p.classList.toggle('active', p.getAttribute('data-panel') === name);
    });
  }

  function syncSettingsUI() {
    var b = settings.background;
    var c = settings.clock;

    // 引擎
    var cards = allEngines().map(function (e) {
      return '<button type="button" class="engine-card' + (e.id === settings.engine ? ' active' : '') + '" data-engine="' + esc(e.id) + '">' +
        '<img src="' + esc(e.icon) + '" alt="">' +
        '<span>' + esc(trName(e.name)) + '</span></button>';
    }).join('');
    $('engineCards').innerHTML = cards;
    attachIconFallbacks($('engineCards'));

    renderCustomEngineList();


    Array.prototype.forEach.call(document.querySelectorAll('#themeChips button'), function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-theme') === settings.theme);
    });

    // 背景
    Array.prototype.forEach.call(document.querySelectorAll('#bgTypes button'), function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-type') === b.type);
    });
    $('solidColor').value = b.solid;
    $('solidHex').textContent = b.solid;
    $('gradientStart').value = b.gradient.start;
    $('gradientEnd').value = b.gradient.end;
    $('gradientAngle').value = String(b.gradient.angle || 135);
    if (wallGridDirty) { renderWallGrid(); wallGridDirty = false; } else { updateWallSelection(); }
    if (videoGridDirty) { renderVideoGrid(); videoGridDirty = false; } else { updateVideoSelection(); }
    renderBingCard();
    $('bgOpacity').value = b.opacity;
    $('opacityVal').textContent = b.opacity + '%';
    $('bgBlur').value = b.blur;
    $('blurVal').textContent = b.blur + 'px';
    $('scrimRange').value = settings.scrim;
    $('scrimVal').textContent = settings.scrim + '%';

    Array.prototype.forEach.call(document.querySelectorAll('[data-bg-panel]'), function (panel) {
      var types = (panel.getAttribute('data-bg-panel') || '').split(' ');
      panel.hidden = types.indexOf(b.type) < 0;
    });

    // 时间
    $('showDate').setAttribute('aria-pressed', c.showDate ? 'true' : 'false');
    $('hour24').setAttribute('aria-pressed', c.hour24 ? 'true' : 'false');
    $('showSeconds').setAttribute('aria-pressed', c.showSeconds ? 'true' : 'false');
    $('blinkColon').setAttribute('aria-pressed', c.blinkColon ? 'true' : 'false');
    applyClockWeight();

    $('historyToggle').setAttribute('aria-pressed', settings.history ? 'true' : 'false');
    if ($('languageSelect')) $('languageSelect').value = settings.language || 'auto';
    $('openFocusToggle').setAttribute('aria-pressed', settings.openFocus !== false ? 'true' : 'false');

    renderBookmarkList();
  }

  function renderCustomEngineList() {
    var list = settings.customEngines || [];
    var wrap = $('customEngineList');
    if (!list.length) {
      wrap.innerHTML = '<div class="empty">还没有自定义引擎</div>';
      return;
    }
    wrap.innerHTML = list.map(function (e, i) {
      return '<div class="list-row">' +
        '<img src="' + esc(e.icon || 'img/ico.ico') + '" data-host="' + esc(SY.hostOf((e.url || '').replace('%s', ''))) + '" alt="">' +
        '<div class="list-main"><div class="list-title">' + esc(trName(e.name)) + '</div><div class="list-sub">' + esc(e.url) + '</div></div>' +
        '<div class="list-actions">' +
        '<button type="button" class="mini" data-edit-engine="' + i + '" title="编辑">✎</button>' +
        '<button type="button" class="mini danger" data-del-engine="' + i + '" title="删除">✕</button>' +
        '</div></div>';
    }).join('');
    attachIconFallbacks(wrap);
  }

  function importBrowserBookmarks() {
    if (!IS_EXTENSION || !chrome.bookmarks || !chrome.bookmarks.getTree) {
      toast('仅扩展模式支持导入浏览器收藏夹');
      return;
    }
    chrome.bookmarks.getTree(function (tree) {
      var found = [];
      (function walk(nodes) {
        (nodes || []).forEach(function (n) {
          if (n.url && /^https?:/i.test(n.url)) {
            found.push({ title: n.title || n.url, url: n.url, icon: '' });
          }
          if (n.children) walk(n.children);
        });
      })(tree || []);

      var seen = {};
      bookmarks.forEach(function (b) { seen[bookmarkKey(b.url)] = 1; });
      var added = [];
      found.forEach(function (b) {
        var k = bookmarkKey(b.url);
        if (seen[k]) return;
        seen[k] = 1;
        added.push(b);
      });

      if (!added.length) { toast('没有新的收藏可导入'); return; }

      // 同步存储单项约 8KB，按体积截断，避免写入失败
      var merged = bookmarks.concat(added);
      while (added.length && JSON.stringify(merged).length > 7000) {
        added.pop();
        merged = bookmarks.concat(added);
      }
      if (!added.length) { toast('收藏夹已接近同步容量上限'); return; }

      bookmarks = merged;
      saveBookmarks();
      renderDock();
      renderBookmarkList();
      syncSettingsUI();
      toast('已导入 ' + added.length + ' 条收藏');
    });
  }

  function renderBookmarkList() {
    var wrap = $('bmList');
    if (!bookmarks.length) {
      wrap.innerHTML = '<div class="empty">还没有收藏，点右上角添加</div>';
      return;
    }
    wrap.innerHTML = bookmarks.map(function (b, i) {
      return '<div class="list-row">' +
        '<img src="' + esc(b.icon || 'img/ico.ico') + '" data-host="' + esc(SY.hostOf(b.url)) + '" alt="">' +
        '<div class="list-main"><div class="list-title">' + esc(b.title) + '</div><div class="list-sub">' + esc(b.url) + '</div></div>' +
        '<div class="list-actions">' +
        '<button type="button" class="mini" data-move-bm="' + i + '" data-dir="-1" title="上移"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
        '<button type="button" class="mini" data-move-bm="' + i + '" data-dir="1" title="下移"' + (i === bookmarks.length - 1 ? ' disabled' : '') + '>↓</button>' +
        '<button type="button" class="mini" data-top-bm="' + i + '" title="移至顶部"' + (i === 0 ? ' disabled' : '') + '>⤒</button>' +
        '<button type="button" class="mini" data-edit-bm="' + i + '" title="编辑">✎</button>' +
        '<button type="button" class="mini danger" data-del-bm="' + i + '" title="删除">✕</button>' +
        '</div></div>';
    }).join('');
    attachIconFallbacks(wrap);
  }

  /* ---------------- 弹窗 ---------------- */
  function openModal(id) {
    var node = $(id);
    if (!node) return;
    node.hidden = false;
    var input = node.querySelector('input');
    if (input) setTimeout(function () { input.focus(); }, 30);
  }

  function closeModal(id) {
    var node = $(id);
    if (node) node.hidden = true;
  }

  function openEngineModal(index) {
    editEngineIndex = typeof index === 'number' ? index : -1;
    var e = editEngineIndex >= 0 ? settings.customEngines[editEngineIndex] : null;
    $('engineModalTitle').textContent = e ? '编辑引擎' : '添加引擎';
    $('engName').value = e ? e.name : '';
    $('engUrl').value = e ? e.url : '';
    $('engIcon').value = e && e.icon ? e.icon : '';
    openModal('engineModal');
  }

  function saveEngine() {
    var name = $('engName').value.trim();
    var url = $('engUrl').value.trim();
    var icon = $('engIcon').value.trim();
    if (!name) return toast('请填写名称');
    if (url.indexOf('%s') < 0) return toast('URL 需要包含 %s');
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    try { new URL(url.replace('%s', 'x')); } catch (e) { return toast('URL 格式不正确'); }

    var item = {
      id: editEngineIndex >= 0 ? (settings.customEngines[editEngineIndex].id || 'custom_' + Date.now()) : 'custom_' + Date.now(),
      name: name,
      url: url,
      icon: icon || SY.faviconFor(url.replace('%s', ''))
    };
    if (editEngineIndex >= 0) settings.customEngines[editEngineIndex] = item;
    else settings.customEngines.push(item);

    closeModal('engineModal');
    saveNow();
    renderEngineButton();
    syncSettingsUI();
    toast('已保存');
  }

  function openBookmarkModal(index) {
    editBookmarkIndex = typeof index === 'number' ? index : -1;
    var b = editBookmarkIndex >= 0 ? bookmarks[editBookmarkIndex] : null;
    $('bmModalTitle').textContent = b ? '编辑收藏' : '添加收藏';
    $('bmTitle').value = b ? b.title : '';
    $('bmUrl').value = b ? b.url : '';
    $('bmIcon').value = b && b.icon ? b.icon : '';
    openModal('bmModal');
  }

  function saveBookmark() {
    var title = $('bmTitle').value.trim();
    var url = $('bmUrl').value.trim();
    if (!title) return toast('请填写名称');
    if (!url) return toast('请填写网址');
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    try { new URL(url); } catch (e) { return toast('网址格式不正确'); }

    var item = {
      title: title,
      url: url,
      icon: $('bmIcon').value.trim() || SY.faviconFor(url)
    };
    if (editBookmarkIndex >= 0) bookmarks[editBookmarkIndex] = item;
    else bookmarks.push(item);

    closeModal('bmModal');
    saveBookmarks();
    renderDock();
    renderBookmarkList();
    toast('已保存');
  }

  /* ---------------- 持久化 ---------------- */
  function serializableSettings() {
    var out = SY.clone(settings);
    out.background.video = SY.mediaMeta(settings.background.video);
    return out;
  }

  var saveNow = SY.debounce(function () {
    SY.setSync({ suiYuanSettings: serializableSettings() });
  }, 260);

  function saveBookmarks() {
    SY.setSync({ bookmarks: bookmarks }).then(function () {});
  }

  /* ---------------- 事件 ---------------- */
  var i18nEntries = null;

  function detectLang() {
    var pref = (settings && settings.language) || 'auto';
    var nav = (navigator.language || 'zh-CN').toLowerCase();
    var isTw = /tw|hk|mo|hant/.test(nav);
    if (pref === 'auto') {
      if (nav.indexOf('zh') === 0) return isTw ? 'zh-Hant' : 'zh-Hans';
      if (nav.indexOf('fr') === 0) return 'fr';
      if (nav.indexOf('ru') === 0) return 'ru';
      if (nav.indexOf('es') === 0) return 'es';
      if (nav.indexOf('ar') === 0) return 'ar';
      return 'en';
    }
    if (pref === 'zh') return isTw ? 'zh-Hant' : 'zh-Hans';
    if (pref === 'zh-Hans' || pref === 'zh-Hant') return pref;
    return pref;
  }

  var NAME_I18N = {
    en: { '必应': 'Bing', '谷歌': 'Google', '百度': 'Baidu', '默认视频': 'Default video', '默认壁纸 · 晨光': 'Dawn', '默认壁纸 · 日落': 'Sunset', '默认壁纸 · 海底': 'Underwater', '内置壁纸 · 亮色': 'Light', '内置壁纸 · 暗色': 'Dark' },
    fr: { '必应': 'Bing', '谷歌': 'Google', '百度': 'Baidu', '默认视频': 'Vidéo par défaut', '默认壁纸 · 晨光': 'Aube', '默认壁纸 · 日落': 'Coucher de soleil', '默认壁纸 · 海底': 'Sous-marin', '内置壁纸 · 亮色': 'Clair', '内置壁纸 · 暗色': 'Sombre' },
    ru: { '必应': 'Bing', '谷歌': 'Google', '百度': 'Baidu', '默认视频': 'Видео по умолчанию', '默认壁纸 · 晨光': 'Рассвет', '默认壁纸 · 日落': 'Закат', '默认壁纸 · 海底': 'Подводный мир', '内置壁纸 · 亮色': 'Светлая', '内置壁纸 · 暗色': 'Тёмная' },
    es: { '必应': 'Bing', '谷歌': 'Google', '百度': 'Baidu', '默认视频': 'Vídeo predeterminado', '默认壁纸 · 晨光': 'Amanecer', '默认壁纸 · 日落': 'Atardecer', '默认壁纸 · 海底': 'Bajo el mar', '内置壁纸 · 亮色': 'Claro', '内置壁纸 · 暗色': 'Oscuro' },
    ar: { '必应': 'Bing', '谷歌': 'Google', '百度': 'Baidu', '默认视频': 'فيديو افتراضي', '默认壁纸 · 晨光': 'فجر', '默认壁纸 · 日落': 'غروب', '默认壁纸 · 海底': 'تحت الماء', '内置壁纸 · 亮色': 'فاتح', '内置壁纸 · 暗色': 'داكن' }
  };

  function trName(s) {
    if (!s) return s;
    var lang = detectLang();
    if (lang === 'zh-Hans') return s;
    var d = NAME_I18N[lang] || {};
    var e = NAME_I18N.en || {};
    return d[s] || e[s] || s;
  }

  function collectI18nEntries() {
    i18nEntries = [];
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var p = node.parentNode;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (p.closest && p.closest('#languageSelect, script, style, [data-i18n-skip]')) return NodeFilter.FILTER_REJECT;
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    while (walker.nextNode()) {
      i18nEntries.push({ node: walker.currentNode, orig: walker.currentNode.nodeValue });
    }
    ['placeholder', 'title', 'aria-label'].forEach(function (attr) {
      document.querySelectorAll('[' + attr + ']').forEach(function (el) {
        if (el.closest('#languageSelect, [data-i18n-skip]')) return;
        i18nEntries.push({ el: el, attr: attr, orig: el.getAttribute(attr) });
      });
    });
  }

  function applyLanguage() {
    if (!settings) return;
    if (!i18nEntries) collectI18nEntries();
    var lang = detectLang();
    var dict = (window.SY && SY.I18N && SY.I18N[lang]) || null;
    var en = (window.SY && SY.I18N && SY.I18N.en) || {};
    i18nEntries.forEach(function (e) {
      var key = String(e.orig).trim();
      var val;
      if (lang === 'zh-Hans') val = key;
      else val = (dict && dict[key] != null) ? dict[key] : (en[key] != null ? en[key] : key);
      if (e.el) {
        e.el.setAttribute(e.attr, val);
      } else {
        var lead = e.orig.match(/^\s*/)[0];
        var trail = e.orig.match(/\s*$/)[0];
        e.node.nodeValue = lead + val + trail;
      }
    });
    document.documentElement.lang = lang === 'zh-Hant' ? 'zh-Hant' : (lang === 'zh-Hans' ? 'zh-CN' : lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title = (lang === 'zh-Hans') ? '随缘搜索' : ((dict && dict['随缘搜索']) || en['随缘搜索'] || 'SuiYuan Search');
    var sel = $('languageSelect');
    if (sel) sel.value = settings.language || 'auto';
    try {
      wallGridDirty = true;
      videoGridDirty = true;
      if (el.settings && !el.settings.hidden) syncSettingsUI();
    } catch (e) {}
  }

  function rafThrottle(fn) {
    var queued = false;
    var lastEvent = null;
    return function (e) {
      lastEvent = e;
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        fn(lastEvent);
      });
    };
  }

  function bindEvents() {
    // 时钟/设置
    el.engineBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleEngineMenu();
    });

    el.engineMenu.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-engine]');
      if (!btn) return;
      settings.engine = btn.getAttribute('data-engine');
      saveNow();
      renderEngineButton();
      renderEngineMenu();
      toggleEngineMenu(false);
      el.query.focus();
    });

    el.form.addEventListener('submit', function (e) {
      e.preventDefault();
      var typed = el.query.value.trim();
      if (typed && !looksLikeUrl(typed)) recordHistory(typed);
      if (sugIndex >= 0 && sugList[sugIndex]) {
        doSearch(sugList[sugIndex]);
        return;
      }
      doSearch(el.query.value);
    });

    el.form.addEventListener('click', function (e) {
      if (e.target === el.query || e.target.closest('button')) return;
      el.query.focus();
    });

    el.query.addEventListener('focus', function () {
      if (!el.query.value.trim()) showHistory();
    });

    el.query.addEventListener('input', onQueryInput);

    el.query.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') {
        if (!sugList.length) return;
        e.preventDefault();
        sugIndex = (sugIndex + 1) % sugList.length;
        highlightSuggestion();
      } else if (e.key === 'ArrowUp') {
        if (!sugList.length) return;
        e.preventDefault();
        sugIndex = sugIndex <= 0 ? sugList.length - 1 : sugIndex - 1;
        highlightSuggestion();
      } else if (e.key === 'Escape') {
        if (!el.suggestions.hidden) { hideSuggestions(); e.stopPropagation(); }
        else el.query.blur();
      }
    });

    el.suggestions.addEventListener('click', function (e) {
      var clear = e.target.closest('#clearHistory');
      if (clear) {
        historyItems = [];
        saveHistory();
        hideSuggestions();
        return;
      }
      var hist = e.target.closest('[data-hist]');
      if (hist) {
        var hi = parseInt(hist.getAttribute('data-hist'), 10);
        if (historyItems[hi]) doSearch(historyItems[hi]);
        return;
      }
      var btn = e.target.closest('[data-sug]');
      if (!btn) return;
      var i = parseInt(btn.getAttribute('data-sug'), 10);
      if (sugList[i]) doSearch(sugList[i]);
    });

    document.addEventListener('click', function (e) {
      if (!el.form.contains(e.target)) toggleEngineMenu(false);
      if (!el.suggestions.contains(e.target) && e.target !== el.query) hideSuggestions();
    });

    document.addEventListener('keydown', function (e) {
      var typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement && document.activeElement.tagName);
      var mod = e.ctrlKey || e.metaKey;
      if (mod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        el.query.focus();
        return;
      }
      if (e.key === '/' && !typing && el.settings.hidden) {
        e.preventDefault();
        el.query.focus();
        return;
      }
      if (mod && /^[1-9]$/.test(e.key)) {
        var list = allEngines();
        var idx = parseInt(e.key, 10) - 1;
        if (list[idx]) {
          e.preventDefault();
          settings.engine = list[idx].id;
          saveNow();
          renderEngineButton();
          toast('已切换到 ' + list[idx].name);
        }
        return;
      }
      if (e.key === 'Escape') {
        var openModalEl = document.querySelector('.modal:not([hidden])');
        if (openModalEl) { closeModal(openModalEl.id); return; }
        if (!el.settings.hidden) { closeSettings(); return; }
      }
    });

    // Dock
    el.dock.addEventListener('click', function (e) {
      var item = e.target.closest('.dock-item');
      if (!item) return;
      if (item.getAttribute('data-action') === 'settings') { openSettings(); return; }
      var url = item.getAttribute('data-url');
      if (url) location.href = url;
    });

    el.dockExpand.addEventListener('click', function (e) {
      e.stopPropagation();
      if ($('dockPanel').hidden) openDockPanel();
      else closeDockPanel();
    });

    window.addEventListener('resize', function () {
      if (!$('dockPanel').hidden) layoutDockPanel();
    });

    $('dockPanelGrid').addEventListener('click', function (e) {
      var item = e.target.closest('[data-url]');
      if (item) location.href = item.getAttribute('data-url');
    });

    document.addEventListener('click', function (e) {
      if (!$('dockPanel').hidden && !e.target.closest('#dockPanel') && !e.target.closest('#dockExpand')) {
        closeDockPanel();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !$('dockPanel').hidden) closeDockPanel();
    });

    $('confirmOk').addEventListener('click', function () {
      var cb = confirmCallback;
      confirmCallback = null;
      closeModal('confirmModal');
      if (cb) cb();
    });

    $('moreGrid').addEventListener('click', function (e) {
      var item = e.target.closest('[data-url]');
      if (item) location.href = item.getAttribute('data-url');
    });

    // 设置开关
    document.addEventListener('click', function (e) {
      var closer = e.target.closest('[data-close]');
      if (closer) {
        var id = closer.getAttribute('data-close');
        if (id === 'settings') closeSettings();
        else closeModal(id);
      }
      var tab = e.target.closest('.tab');
      if (tab) switchTab(tab.getAttribute('data-tab'));
    });

    // 搜索引擎选择
    $('engineCards').addEventListener('click', function (e) {
      var card = e.target.closest('[data-engine]');
      if (!card) return;
      settings.engine = card.getAttribute('data-engine');
      saveNow();
      renderEngineButton();
      syncSettingsUI();
    });

    $('addEngineBtn').addEventListener('click', function () { openEngineModal(-1); });
    $('engSave').addEventListener('click', saveEngine);

    $('customEngineList').addEventListener('click', function (e) {
      var del = e.target.closest('[data-del-engine]');
      var edit = e.target.closest('[data-edit-engine]');
      if (edit) { openEngineModal(parseInt(edit.getAttribute('data-edit-engine'), 10)); return; }
      if (del) {
        var i = parseInt(del.getAttribute('data-del-engine'), 10);
        askConfirm('删除这个引擎？', function () {
          settings.customEngines.splice(i, 1);
        if (settings.engine.indexOf('custom_') === 0) settings.engine = 'bing';
        saveNow();
        renderEngineButton();
        syncSettingsUI();
        toast('已删除');
        });
      }
    });

    $('themeChips').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-theme]');
      if (!btn) return;
      settings.theme = btn.getAttribute('data-theme');
      applyTheme();
      syncThemeChips();
      saveNow();
    });

    [el.clock, el.date].forEach(function (node) {
      node.addEventListener('click', function () {
        settings.theme = resolvedTheme() === 'dark' ? 'light' : 'dark';
        applyTheme();
        syncThemeChips();
        saveNow();
        toast(settings.theme === 'dark' ? '深色模式' : '浅色模式');
      });
    });

    // 壁纸库
    $('imageFile').addEventListener('change', function () {
      var files = Array.prototype.slice.call(this.files || []);
      this.value = '';
      uploadWallpapers(files);
    });

    $('bingCard').addEventListener('click', function () { selectWallpaper('bing'); });

    $('wallGrid').addEventListener('click', function (e) {
      var del = e.target.closest('[data-del-wall]');
      if (del) { e.stopPropagation(); deleteWallpaper(del.getAttribute('data-del-wall')); return; }
      var item = e.target.closest('[data-wall]');
      if (item) selectWallpaper(item.getAttribute('data-wall'));
    });

    $('wallGrid').addEventListener('pointerdown', function (e) {
      var item = e.target.closest('[data-wall]');
      if (!item || e.target.closest('[data-del-wall]')) return;
      var id = item.getAttribute('data-wall');
      clearTimeout(longPressTimer);
      longPressTimer = setTimeout(function () { openFocal(id); }, 550);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (evt) {
      $('wallGrid').addEventListener(evt, function () { clearTimeout(longPressTimer); });
    });

    $('focalStage').addEventListener('click', function (e) {
      var r = this.getBoundingClientRect();
      var x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      var y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      this.dataset.fx = x;
      this.dataset.fy = y;
      updateFocalDot(x, y);
    });

    $('focalSave').addEventListener('click', saveFocal);

    // 视频壁纸
    $('videoFile').addEventListener('change', function () {
      var files = Array.prototype.slice.call(this.files || []);
      this.value = '';
      uploadVideos(files);
    });

    $('videoGrid').addEventListener('click', function (e) {
      var del = e.target.closest('[data-del-video]');
      if (del) { e.stopPropagation(); deleteVideo(del.getAttribute('data-del-video')); return; }
      var item = e.target.closest('[data-video]');
      if (item) selectVideo(item.getAttribute('data-video'));
    });

    $('bingToday').addEventListener('click', function () { loadBing('today'); toast('已更新今日必应壁纸'); });
    $('bingShuffle').addEventListener('click', function () { loadBing('random'); toast('已换一张'); });
    $('bingDownload').addEventListener('click', downloadBingNow);

    $('bingUhd').addEventListener('click', function () {
      if (this.disabled) return;
      var bg = settings.background.bing;
      var desired = !bg.uhd;
      var prev = bg.uhd;
      var settled = false;
      setUhdBusy(true);

      var guard = setTimeout(function () { fail(); }, 8000);

      function commit(newUrl) {
        if (settled) return;
        settled = true;
        clearTimeout(guard);
        bg.uhd = desired;
        bg.url = newUrl;
        if (settings.background.wallpaperId === 'bing') applyBackground();
        syncSettingsUI();
        saveNow();
        setUhdBusy(false);
        toast(desired ? '已切换 4K 原图' : '已切换 1080p');
      }

      function fail() {
        if (settled) return;
        settled = true;
        clearTimeout(guard);
        bg.uhd = prev;
        setUhdBusy(false);
        syncSettingsUI();
        toast('4K 加载失败，已保持原设置');
      }

      // 有微软 base：优先切微软 UHD/1080p 原图
      if (bg.base) {
        var newUrl = bingPhotoUrl(bg.base, desired);
        var probe = new Image();
        probe.onload = function () { commit(newUrl); };
        probe.onerror = fail;
        probe.src = newUrl;
        return;
      }

      // 没有微软 base（网页跨域）：直接切 bimg 的 uhd 参数，立即生效，不必等加载
      bg.uhd = desired;
      bg.url = bingFallbackUrl({ mode: bg.mode, uhd: desired });
      if (settings.background.wallpaperId === 'bing') applyBackground();
      syncSettingsUI();
      saveNow();
      setUhdBusy(false);
      clearTimeout(guard);
      settled = true;
      toast(desired ? '已切换到 4K 直出图' : '已切换到 1080p 直出图');
    });

    function setUhdBusy(on) {
      var b = $('bingUhd');
      if (!b) return;
      b.classList.toggle('loading', on);
      b.disabled = on;
      b.setAttribute('aria-busy', on ? 'true' : 'false');
    }

    $('resetBackground').addEventListener('click', function () {
      settings.background = SY.clone(SY.DEFAULT_SETTINGS.background);
      wallGridDirty = true;
      videoGridDirty = true;
      wpUrls = {};
      videoUrls = {};
      resolveWallpapers();
      resolveVideos();
      applyBackground();
      syncSettingsUI();
      saveNow();
      toast('背景设置已重置');
    });

    $('weightChips').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-weight]');
      if (!btn) return;
      settings.clock.weight = parseInt(btn.getAttribute('data-weight'), 10) || 200;
      applyClockWeight();
      saveNow();
    });

    $('openFocusToggle').addEventListener('click', function () {
      settings.openFocus = !settings.openFocus;
      this.setAttribute('aria-pressed', settings.openFocus ? 'true' : 'false');
      saveNow();
    });

    $('languageSelect').addEventListener('change', function () {
      settings.language = this.value;
      applyLanguage();
      saveNow();
    });

    $('historyToggle').addEventListener('click', function () {
      settings.history = !settings.history;
      this.setAttribute('aria-pressed', settings.history ? 'true' : 'false');
      if (!settings.history) hideSuggestions();
      saveNow();
    });

    $('exportConfig').addEventListener('click', exportConfig);
    $('importConfigFile').addEventListener('change', function () {
      var file = this.files && this.files[0];
      this.value = '';
      importConfig(file);
    });

    // 背景
    $('bgTypes').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-type]');
      if (!btn) return;
      settings.background.type = btn.getAttribute('data-type');
      saveNow();
      applyBackground();
      syncSettingsUI();
    });

    $('solidColor').addEventListener('input', function () {
      settings.background.solid = this.value;
      $('solidHex').textContent = this.value;
      applyBackground();
      saveNow();
    });

    $('gradientStart').addEventListener('input', function () {
      settings.background.gradient.start = this.value;
      applyBackground();
      saveNow();
    });

    $('gradientEnd').addEventListener('input', function () {
      settings.background.gradient.end = this.value;
      applyBackground();
      saveNow();
    });

    $('gradientAngle').addEventListener('change', function () {
      settings.background.gradient.angle = parseInt(this.value, 10);
      applyBackground();
      saveNow();
    });

    $('bgOpacity').addEventListener('input', rafThrottle(function (e) {
      settings.background.opacity = parseInt(e.target.value, 10);
      $('opacityVal').textContent = e.target.value + '%';
      applyBackground();
      saveNow();
    }));

    $('bgBlur').addEventListener('input', rafThrottle(function (e) {
      settings.background.blur = parseInt(e.target.value, 10);
      $('blurVal').textContent = e.target.value + 'px';
      applyBackground();
      saveNow();
    }));

    $('scrimRange').addEventListener('input', rafThrottle(function (e) {
      settings.scrim = parseInt(e.target.value, 10);
      $('scrimVal').textContent = e.target.value + '%';
      applyScrim();
      saveNow();
    }));

    // 时间
    [['showDate', 'showDate'], ['hour24', 'hour24'], ['showSeconds', 'showSeconds'], ['blinkColon', 'blinkColon']].forEach(function (pair) {
      var id = pair[0], key = pair[1];
      $(id).addEventListener('click', function () {
        settings.clock[key] = !settings.clock[key];
        this.setAttribute('aria-pressed', settings.clock[key] ? 'true' : 'false');
        tick();
        saveNow();
      });
    });

    // 收藏夹
    $('addBmBtn').addEventListener('click', function () { openBookmarkModal(-1); });
    $('bmSave').addEventListener('click', saveBookmark);

    $('bmList').addEventListener('click', function (e) {
      var move = e.target.closest('[data-move-bm]');
      var edit = e.target.closest('[data-edit-bm]');
      var del = e.target.closest('[data-del-bm]');
      var topBtn = e.target.closest('[data-top-bm]');
      if (topBtn) {
        var ti = parseInt(topBtn.getAttribute('data-top-bm'), 10);
        if (ti > 0 && ti < bookmarks.length) {
          var item = bookmarks.splice(ti, 1)[0];
          bookmarks.unshift(item);
          saveBookmarks();
          renderDock();
          renderBookmarkList();
          toast('已移至顶部');
        }
        return;
      }
      if (move) {
        var i = parseInt(move.getAttribute('data-move-bm'), 10);
        var dir = parseInt(move.getAttribute('data-dir'), 10);
        var j = i + dir;
        if (j < 0 || j >= bookmarks.length) return;
        var tmp = bookmarks[i]; bookmarks[i] = bookmarks[j]; bookmarks[j] = tmp;
        saveBookmarks();
        renderDock();
        renderBookmarkList();
        return;
      }
      if (edit) { openBookmarkModal(parseInt(edit.getAttribute('data-edit-bm'), 10)); return; }
      if (del) {
        var k = parseInt(del.getAttribute('data-del-bm'), 10);
        askConfirm('删除这条收藏？', function () {
          bookmarks.splice(k, 1);
        saveBookmarks();
        renderDock();
        renderBookmarkList();
        toast('已删除');
        });
      }
    });

    $('clearBmBtn').addEventListener('click', function () {
      askConfirm('清空收藏夹？只会清空本扩展的快捷方式，不影响浏览器收藏夹。', function () {
        bookmarks = [];
        saveBookmarks();
        renderDock();
        renderBookmarkList();
        syncSettingsUI();
        toast('收藏夹已清空');
      });
    });

    $('importBrowserBm').addEventListener('click', importBrowserBookmarks);

    $('exportBmBtn').addEventListener('click', function () {
      var blob = new Blob([JSON.stringify(bookmarks, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'suiyuan-bookmarks.json';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
      toast('已导出');
    });

    $('importBmFile').addEventListener('change', function () {
      var file = this.files && this.files[0];
      this.value = '';
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var data = JSON.parse(String(reader.result));
          if (!Array.isArray(data)) throw new Error('格式不正确');
          var cleaned = data.filter(function (b) { return b && b.url; }).map(function (b) {
            return { title: b.title || b.url, url: b.url, icon: b.icon || SY.faviconFor(b.url) };
          });
          if (!cleaned.length) throw new Error('没有有效条目');
          bookmarks = dedupeBookmarks(cleaned);
          saveBookmarks();
          renderDock();
          renderBookmarkList();
          toast('已导入 ' + cleaned.length + ' 条');
        } catch (err) { toast('导入失败：' + err.message); }
      };
      reader.readAsText(file);
    });

    $('resetAll').addEventListener('click', function () {
      askConfirm('恢复默认设置？收藏夹不会被删除。', function () {
      settings = SY.clone(SY.DEFAULT_SETTINGS);
      wpUrls = {};
      videoUrls = {};
      applyBackground();
      applyScrim();
      tick();
      syncSettingsUI();
      saveNow();
      toast('已恢复默认');
      });
    });

    el.bgVideo.addEventListener('error', function () {
      var code = el.bgVideo.error ? el.bgVideo.error.code : 0;
      if (code === 4) toast('这个视频的编码不受支持，请换 H.264 的 mp4 或 VP9 的 webm');
      else if (code) toast('视频加载失败（错误码 ' + code + '）');
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) pauseBgVideo();
      else resumeBgVideo();
    });

    window.addEventListener('resize', updateDockOverflow);

    if (mql) {
      var onScheme = function () { if (settings.theme === 'auto') applyTheme(); };
      if (mql.addEventListener) mql.addEventListener('change', onScheme);
      else if (mql.addListener) mql.addListener(onScheme);
    }

    // 初次聚焦（桌面端，可在设置中关闭）
    var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (settings.openFocus === false || coarse) {
      try { el.query.removeAttribute('autofocus'); el.query.blur(); } catch (e) {}
    } else {
      var focusTries = 0;
      var tryFocus = function () {
        focusTries++;
        try { window.focus(); } catch (e) {}
        try { el.query.focus({ preventScroll: true }); } catch (e) {}
        if (document.activeElement !== el.query && focusTries < 10) setTimeout(tryFocus, 120);
      };
      setTimeout(tryFocus, 80);
      window.addEventListener('load', function () { setTimeout(tryFocus, 60); });
      document.addEventListener('visibilitychange', function () {
        if (!document.hidden) setTimeout(tryFocus, 80);
      });
      window.addEventListener('pageshow', function () { setTimeout(tryFocus, 80); });
    }
  }

  /* ---------------- 壁纸库 ---------------- */
  function getWallpaper(id) {
    var b = settings.background;
    if (id === 'bing') return { id: 'bing', kind: 'bing', name: '必应每日', url: b.bing.url, focal: b.bing.focal };
    for (var i = 0; i < b.wallpapers.length; i++) if (b.wallpapers[i].id === id) return b.wallpapers[i];
    return b.wallpapers[0];
  }

  function currentWallpaper() {
    return getWallpaper(settings.background.wallpaperId);
  }

  function wallpaperUrl(wp) {
    if (!wp) return '';
    if (wp.kind === 'bing' || wp.kind === 'builtin') return wp.url || '';
    return wpUrls[wp.id] || wp.url || '';
  }

  function resolveWallpapers() {
    var list = settings.background.wallpapers || [];
    var jobs = [];
    list.forEach(function (w) {
      if (w.kind === 'local' && w.savedName) {
        jobs.push(SY.resolveMedia(w).then(function (u) { wpUrls[w.id] = u; }));
      }
    });
    return Promise.all(jobs);
  }

  function renderWallGrid() {
    var b = settings.background;
    $('wallGrid').innerHTML = (b.wallpapers || []).map(function (w) {
      var url = wallpaperUrl(w);
      var del = w.kind === 'local'
        ? '<span class="wall-del" data-del-wall="' + esc(w.id) + '" title="删除">×</span>'
        : '';
      return '<button type="button" class="wall-item' + (b.wallpaperId === w.id ? ' active' : '') + '" data-wall="' + esc(w.id) + '">' +
        (url ? '<img src="' + esc(url) + '" alt="" loading="lazy" decoding="async">' : '<span class="wall-empty">预览加载中…</span>') +
        '<span class="wall-name">' + esc(trName(w.name) || '未命名') + '</span>' +
        del + '</button>';
    }).join('');
  }

  function renderBingCard() {
    var b = settings.background;
    var card = $('bingCard');
    if (!card) return;
    var img = $('bingCardImg');
    if (b.bing.url) {
      if (img.getAttribute('src') !== b.bing.url) img.setAttribute('src', b.bing.url);
      img.hidden = false;
    } else {
      img.hidden = true;
    }
    card.classList.toggle('active', b.type === 'image' && b.wallpaperId === 'bing');
    $('bingCopy').textContent = b.bing.copyright || '';
    $('bingCopy').hidden = !b.bing.copyright;
    $('bingUhd').setAttribute('aria-pressed', b.bing.uhd ? 'true' : 'false');
  }

  function ensureVisible() {
    var b = settings.background;
    if (typeof b.opacity !== 'number' || !isFinite(b.opacity) || b.opacity <= 0) {
      b.opacity = 100;
      toast('不透明度为 0，已恢复到 100%');
    }
  }

  function updateWallSelection() {
    var b = settings.background;
    Array.prototype.forEach.call(document.querySelectorAll('#wallGrid .wall-item'), function (el) {
      el.classList.toggle('active', el.getAttribute('data-wall') === b.wallpaperId);
    });
    Array.prototype.forEach.call(document.querySelectorAll('#bgTypes button'), function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-type') === b.type);
    });
    var bingCard = $('bingCard');
    if (bingCard) bingCard.classList.toggle('active', b.type === 'image' && b.wallpaperId === 'bing');
  }

  function updateVideoSelection() {
    var b = settings.background;
    Array.prototype.forEach.call(document.querySelectorAll('#videoGrid .wall-item'), function (el) {
      el.classList.toggle('active', el.getAttribute('data-video') === b.videoId);
    });
    Array.prototype.forEach.call(document.querySelectorAll('#bgTypes button'), function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-type') === b.type);
    });
  }

  function syncThemeChips() {
    Array.prototype.forEach.call(document.querySelectorAll('#themeChips button'), function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-theme') === settings.theme);
    });
  }

  function selectWallpaper(id) {
    var b = settings.background;
    ensureVisible();
    if (b.wallpaperId === id) {
      // 同一张图：已经是图片背景时才进入取点，否则先把类型切回图片
      if (b.type === 'image') { openFocal(id); return; }
      b.type = 'image';
      applyBackground();
      syncSettingsUI();
      saveNow();
      return;
    }
    b.wallpaperId = id;
    b.type = 'image';
    if (id === 'bing' && (!b.bing.url || b.bing.date !== todayStamp())) {
      loadBing(b.bing.mode || 'today');
      return;
    }
    applyBackground();
    updateWallSelection();
    saveNow();
  }

  function uploadWallpapers(files) {
    if (!files.length) return;
    var chain = Promise.resolve();
    var firstId = '';
    files.forEach(function (file) {
      chain = chain.then(function () {
        if (!/^image\//.test(file.type)) return null;
        if (file.size > 25 * 1024 * 1024) { toast('图片不能超过 25MB'); return null; }
        return SY.saveMedia(file, 'image').then(function (meta) {
          var id = 'w_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
          var item = {
            id: id, kind: 'local', name: file.name,
            savedName: meta.savedName, type: meta.type, size: meta.size,
            focal: { x: 0.5, y: 0.5 }
          };
          settings.background.wallpapers.push(item);
          wallGridDirty = true;
          return SY.resolveMedia(item).then(function (u) {
            wpUrls[id] = u;
            if (!firstId) firstId = id;
          });
        });
      });
    });
    chain.then(function () {
      ensureVisible();
      if (firstId) settings.background.wallpaperId = firstId;
      settings.background.type = 'image';
      applyBackground();
      syncSettingsUI();
      saveNow();
      toast('已添加 ' + files.length + ' 张壁纸');
    }).catch(function () { toast('图片添加失败'); });
  }

  function deleteWallpaper(id) {
    askConfirm('删除这张壁纸？', function () { doDeleteWallpaper(id); });
  }

  function doDeleteWallpaper(id) {
    var b = settings.background;
    b.wallpapers = b.wallpapers.filter(function (w) { return w.id !== id; });
    wallGridDirty = true;
    delete wpUrls[id];
    if (b.wallpaperId === id) b.wallpaperId = b.wallpapers[0].id;
    applyBackground();
    syncSettingsUI();
    saveNow();
    toast('已删除');
  }

  function openFocal(id) {
    var wp = getWallpaper(id);
    var url = wallpaperUrl(wp);
    if (!url) { toast('这张壁纸还没有加载完成'); return; }
    focalId = id;
    var f = (wp && wp.focal) || { x: 0.5, y: 0.5 };
    var stage = $('focalStage');
    stage.style.backgroundImage = 'url("' + url + '")';
    stage.dataset.fx = f.x;
    stage.dataset.fy = f.y;
    updateFocalDot(f.x, f.y);
    openModal('focalModal');
  }

  function updateFocalDot(x, y) {
    var stage = $('focalStage');
    stage.style.backgroundPosition = (x * 100) + '% ' + (y * 100) + '%';
    var dot = $('focalDot');
    dot.style.left = (x * 100) + '%';
    dot.style.top = (y * 100) + '%';
  }

  function saveFocal() {
    var stage = $('focalStage');
    var wp = getWallpaper(focalId);
    var f = {
      x: parseFloat(stage.dataset.fx || '0.5'),
      y: parseFloat(stage.dataset.fy || '0.5')
    };
    if (focalId === 'bing') settings.background.bing.focal = f;
    else if (wp) wp.focal = f;
    applyBackground();
    closeModal('focalModal');
    saveNow();
    toast('缩放中心已保存');
  }

  /* ---------------- 视频壁纸 ---------------- */
  function currentVideo() {
    var b = settings.background;
    for (var i = 0; i < b.videos.length; i++) if (b.videos[i].id === b.videoId) return b.videos[i];
    return b.videos[0] || null;
  }

  function resolveVideos() {
    var b = settings.background;
    var jobs = [];
    (b.videos || []).forEach(function (v) {
      if (v.savedName) {
        jobs.push(SY.resolveMedia(v).then(function (u) { videoUrls[v.id] = u; }));
      }
    });
    return Promise.all(jobs);
  }

  function renderVideoGrid() {
    var b = settings.background;
    var list = b.videos || [];
    var grid = $('videoGrid');
    if (!grid) return;
    if (!list.length) {
      grid.innerHTML = '<div class="empty" style="grid-column:1/-1">还没有视频壁纸，点右上角添加</div>';
      return;
    }
    grid.innerHTML = list.map(function (v) {
      var url = videoUrls[v.id] || v.url || '';
      return '<button type="button" class="wall-item' + (b.videoId === v.id ? ' active' : '') + '" data-video="' + esc(v.id) + '">' +
        (url ? '<video src="' + esc(url) + '#t=0.1" muted preload="metadata" playsinline disablepictureinpicture disableremoteplayback></video>' : '<span class="wall-empty">加载中…</span>') +
        '<span class="wall-badge">▶</span>' +
        '<span class="wall-name">' + esc(trName(v.name) || '视频') + '</span>' +
        (v.kind === 'builtin' ? '' : '<span class="wall-del" data-del-video="' + esc(v.id) + '" title="删除">×</span>') +
        '</button>';
    }).join('');
  }

  function uploadVideos(files) {
    if (!files.length) return;
    var chain = Promise.resolve();
    var firstId = '';
    files.forEach(function (file) {
      chain = chain.then(function () {
        if (!/^video\//.test(file.type)) return null;
        if (file.size > 200 * 1024 * 1024) { toast('视频不能超过 200MB'); return null; }
        return SY.saveMedia(file, 'video').then(function (meta) {
          var id = 'v_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
          var item = {
            id: id, kind: 'video', name: file.name,
            savedName: meta.savedName, type: meta.type, size: meta.size
          };
          settings.background.videos.push(item);
          videoGridDirty = true;
          return SY.resolveMedia(item).then(function (u) {
            videoUrls[id] = u;
            if (!firstId) firstId = id;
          });
        });
      });
    });
    chain.then(function () {
      ensureVisible();
      if (firstId) {
        settings.background.videoId = firstId;
        settings.background.type = 'video';
      }
      applyBackground();
      syncSettingsUI();
      saveNow();
      toast('已添加 ' + files.length + ' 个视频');
    }).catch(function () { toast('视频添加失败'); });
  }

  function selectVideo(id) {
    ensureVisible();
    settings.background.videoId = id;
    settings.background.type = 'video';
    applyBackground();
    updateVideoSelection();
    saveNow();
  }

  function deleteVideo(id) {
    var b = settings.background;
    var target = b.videos.filter(function (v) { return v.id === id; })[0];
    if (target && target.kind === 'builtin') { toast('默认视频不可删除'); return; }
    askConfirm('删除这个视频壁纸？', function () { doDeleteVideo(id); });
  }

  function doDeleteVideo(id) {
    var b = settings.background;
    b.videos = b.videos.filter(function (v) { return v.id !== id; });
    videoGridDirty = true;
    delete videoUrls[id];
    if (b.videoId === id) {
      b.videoId = b.videos.length ? b.videos[0].id : '';
      if (!b.videos.length) b.type = 'image';
    }
    applyBackground();
    syncSettingsUI();
    saveNow();
    toast('已删除');
  }

  /* ---------------- 必应每日壁纸 ---------------- */
  var BING_API = 'https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8';

  function todayStamp() {
    var d = new Date();
    return '' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
  }

  function bingPhotoUrl(base, uhd) {
    return base + (uhd ? '_UHD.jpg' : '_1920x1080.jpg');
  }

  function applyBingData(data, index) {
    var imgs = (data && data.images) || [];
    if (!imgs.length) throw new Error('empty');
    var item = imgs[index % imgs.length];
    var bg = settings.background.bing;
    bg.base = 'https://www.bing.com' + item.urlbase;
    bg.copyright = item.copyright || '';
    bg.url = bingPhotoUrl(bg.base, bg.uhd);
    bg.date = todayStamp();
  }

  function fetchBingJson(url, ms) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, ms || 5000);
    return fetch(url, { cache: 'no-store', signal: ctrl.signal })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) { clearTimeout(timer); return d; }, function (e) { clearTimeout(timer); throw e; });
  }

  function bingFallbackUrl(bg) {
    return 'https://api.bimg.cc/' + (bg.mode === 'random' ? 'random' : 'today') +
      '?w=1920&h=1080&mkt=zh-CN&uhd=' + (bg.uhd ? 'true' : 'false') +
      '&d=' + (bg.mode === 'random' ? Date.now() : todayStamp());
  }

  function loadBing(mode, silent) {
    var bg = settings.background.bing;
    bg.mode = mode === 'random' ? 'random' : 'today';

    var url = BING_API;
    var attempts = [
      fetchBingJson(url, 2500),
      fetchBingJson('https://api.allorigins.win/raw?url=' + encodeURIComponent(url), 3000),
      fetchBingJson('https://corsproxy.io/?url=' + encodeURIComponent(url), 3000)
    ];
    return Promise.any(attempts)
      .then(function (data) {
        var count = (data.images || []).length || 1;
        applyBingData(data, bg.mode === 'today' ? 0 : Math.floor(Math.random() * count));
        finish(true);
        return true;
      })
      .catch(function () {
        bg.base = '';
        bg.copyright = '';
        bg.date = todayStamp();
        bg.url = bingFallbackUrl(bg);
        finish(false);
        return false;
      });

    function finish(ok) {
      wallGridDirty = true;
      applyBackground();
      syncSettingsUI();
      saveNow();
      if (!silent && !ok) toast('网页版读不到必应接口，已用直出图代替');
    }
  }

  function downloadBingNow() {
    var bg = settings.background.bing;
    var url = bg.url;
    if (!url) { loadBing(bg.mode || 'today'); return; }
    var name = '必应壁纸-' + todayStamp() + '.jpg';

    fetch(url)
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); })
      .then(function (blob) {
        // 下载到本地
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);

        // 同时存入壁纸库
        var file = new File([blob], name, { type: blob.type || 'image/jpeg' });
        return SY.saveMedia(file, 'image').then(function (meta) {
          var id = 'w_bing_' + Date.now();
          var item = {
            id: id, kind: 'local', name: name,
            savedName: meta.savedName, type: meta.type, size: meta.size,
            focal: { x: 0.5, y: 0.5 }
          };
          settings.background.wallpapers.push(item);
          wallGridDirty = true;
          return SY.resolveMedia(item).then(function (u) {
            wpUrls[id] = u;
            syncSettingsUI();
            saveNow();
            toast('已下载并加入壁纸库');
          });
        });
      })
      .catch(function () { window.open(url, '_blank'); });
  }

  /* ---------------- 搜索历史 ---------------- */
  function saveHistory() {
    var obj = {};
    obj[HISTORY_KEY] = historyItems.slice(0, 12);
    SY.setSync(obj);
  }

  function recordHistory(q) {
    q = String(q || '').trim();
    if (!q) return;
    historyItems = [q].concat(historyItems.filter(function (x) { return x !== q; })).slice(0, 12);
    saveHistory();
  }

  function showHistory() {
    if (!settings.history || !historyItems.length) { hideSuggestions(); return; }
    el.suggestions.innerHTML = historyItems.map(function (h, i) {
      return '<button type="button" data-hist="' + i + '">' + ICON_CLOCK + '<span>' + esc(h) + '</span></button>';
    }).join('') + '<div class="sug-foot"><button type="button" id="clearHistory">清空搜索历史</button></div>';
    el.suggestions.hidden = false;
    sugList = [];
    sugIndex = -1;
  }

  /* ---------------- 配置导入导出 ---------------- */
  function blobToDataUrl(blob) {
    return new Promise(function (resolve) {
      var fr = new FileReader();
      fr.onload = function () { resolve(fr.result); };
      fr.onerror = function () { resolve(''); };
      fr.readAsDataURL(blob);
    });
  }

  function dataUrlToBlob(dataUrl) {
    return fetch(dataUrl).then(function (r) { return r.blob(); });
  }

  function exportConfig() {
    var withMedia = $('exportMedia').checked;
    var payload = {
      app: 'SuiYuan-Search',
      version: 4,
      exportedAt: new Date().toISOString(),
      settings: serializableSettings(),
      bookmarks: bookmarks,
      history: historyItems,
      media: {}
    };
    var jobs = [];

    if (withMedia) {
      (settings.background.wallpapers || []).forEach(function (w) {
        if (w.kind !== 'local' || !w.savedName) return;
        jobs.push(SY.resolveMedia(w).then(function (u) {
          if (!u) return;
          return fetch(u).then(function (r) { return r.blob(); }).then(blobToDataUrl).then(function (d) {
            if (d) payload.media[w.id] = d;
          });
        }));
      });
      (settings.background.videos || []).forEach(function (v) {
        if (!v.savedName) return;
        jobs.push(SY.resolveMedia(v).then(function (u) {
          if (!u) return;
          return fetch(u).then(function (r) { return r.blob(); }).then(blobToDataUrl).then(function (d) {
            if (d) payload.media[v.id] = d;
          });
        }));
      });
    }

    Promise.all(jobs).then(function () {
      var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'suiyuan-config.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
      toast(withMedia ? '配置（含媒体）已导出' : '配置已导出');
    });
  }

  function importConfig(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(String(reader.result));
        if (data.settings) settings = SY.migrateSettings(data.settings);
        if (Array.isArray(data.bookmarks)) bookmarks = data.bookmarks;
        if (Array.isArray(data.history)) historyItems = data.history.slice(0, 12);
        wallGridDirty = true;
        videoGridDirty = true;

        var media = data.media || {};
        var jobs = Object.keys(media).map(function (key) {
          return dataUrlToBlob(media[key]).then(function (blob) {
            var ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
            var f = new File([blob], key + '.' + ext, { type: blob.type });
            var v = (settings.background.videos || []).filter(function (x) { return x.id === key; })[0];
            return SY.saveMedia(f, v ? 'video' : 'image').then(function (meta) {
              if (v) {
                v.savedName = meta.savedName;
                v.type = meta.type;
                v.size = meta.size;
                delete v.url;
                return;
              }
              var w = settings.background.wallpapers.filter(function (x) { return x.id === key; })[0];
              if (w) {
                w.savedName = meta.savedName;
                w.type = meta.type;
                w.size = meta.size;
                delete w.url;
              } else if (key === 'video') {
                settings.background.video = meta;
              }
            });
          });
        });

        Promise.all(jobs)
          .then(function () { return resolveWallpapers(); })
          .then(function () { return resolveVideos(); })
          .then(function () {
            applyTheme();
            applyScrim();
            renderEngineButton();
            renderDock();
            syncSettingsUI();
            tick();
            var obj = { suiYuanSettings: serializableSettings(), bookmarks: bookmarks };
            obj[HISTORY_KEY] = historyItems;
            SY.setSync(obj);
            toast('配置已导入');
          });
      } catch (e) {
        toast('导入失败：' + e.message);
      }
    };
    reader.readAsText(file);
  }

  /* ---------------- 工具 ---------------- */
  function esc(s) { return SY.escapeHtml(s); }

  var confirmCallback = null;

  function askConfirm(text, onOk) {
    $('confirmText').textContent = text;
    confirmCallback = onOk;
    openModal('confirmModal');
  }

  function toast(message) {
    el.toast.textContent = message;
    el.toast.hidden = false;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () { el.toast.hidden = true; }, 2000);
  }
})();
