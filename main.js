/* === Theme Toggle === */
(function () {
  'use strict';
  var STORAGE_KEY = 'ca-theme';
  var saved = localStorage.getItem(STORAGE_KEY);
  if (saved) document.documentElement.setAttribute('data-theme', saved);

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.querySelector('.theme-toggle');
    if (!btn) return;

    function isDark() {
      var dt = document.documentElement.getAttribute('data-theme');
      if (dt === 'dark') return true;
      if (dt === 'light') return false;
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    function updateLabel() {
      btn.setAttribute('aria-label', isDark() ? 'Switch to light mode' : 'Switch to dark mode');
    }
    updateLabel();

    btn.addEventListener('click', function () {
      var next = isDark() ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem(STORAGE_KEY, next);
      updateLabel();
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateLabel);
  });
})();

/* === Back to Top === */
(function () {
  'use strict';
  var btt = document.getElementById('back-to-top');
  if (btt) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 600) {
        btt.classList.add('visible');
      } else {
        btt.classList.remove('visible');
      }
    }, { passive: true });
    btt.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      var skip = document.querySelector('.skip-link');
      if (skip) {
        setTimeout(function () { skip.focus(); }, 300);
      }
    });
  }
})();

/* === Latest News Feed === */
(function () {
  'use strict';

  function formatDate(dateStr) {
    var d = new Date(dateStr + 'T12:00:00');
    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  function renderNews(items) {
    var el = document.getElementById('latest-news');
    if (!el || items.length === 0) {
      if (el) el.innerHTML = '<p style="text-align:center;color:var(--ca-gray-700);">No news yet.</p>';
      return;
    }
    var html = '<div class="news-grid">';
    items.forEach(function (item) {
      html += '<article class="news-card">';
      html += '<div class="news-card-meta">';
      html += '<time class="news-card-date" datetime="' + item.date + '">' + formatDate(item.date) + '</time>';
      if (item.type) html += '<span class="news-badge news-badge-type">' + item.type + '</span>';
      html += '</div>';
      html += '<h3 class="news-card-title"><a href="' + item.url + '">' + item.title + '</a></h3>';
      html += '<p class="news-card-summary">' + item.summary + '</p>';
      html += '</article>';
    });
    html += '</div>';
    el.innerHTML = html;
  }

  fetch('posts/posts.json')
    .then(function (r) { return r.json(); })
    .then(function (posts) {
      var items = posts.map(function (p) {
        return { date: p.date, title: p.title, summary: p.summary, type: p.type || '', url: 'news.html#post/' + p.slug };
      });
      items.sort(function (a, b) { return b.date.localeCompare(a.date); });
      renderNews(items.slice(0, 8));
    })
    .catch(function () {
      var el = document.getElementById('latest-news');
      if (el) el.innerHTML = '<p style="text-align:center;color:var(--ca-gray-700);">Unable to load news.</p>';
    });
})();
