/* Vorschau-Leiste und Hinweis für Unterseiten, die erst nach der Designwahl entstehen */
(function () {
  'use strict';

  var current = document.body.getAttribute('data-vorschau');
  if (current) {
    var item = function (href, text, key, extra) {
      var cur = key === current ? ' aria-current="page"' : '';
      return '<a href="' + href + '"' + cur + (extra || '') + '>' + text + '</a>';
    };
    var bar = document.createElement('nav');
    bar.className = 'vz-bar';
    bar.setAttribute('aria-label', 'Designvorschläge');
    bar.innerHTML =
      item('../', '<span aria-hidden="true">←</span><span class="vz-home-text">Übersicht</span>', 'home', ' aria-label="Zur Übersicht"') +
      '<span class="vz-sep" aria-hidden="true"></span>' +
      '<span class="vz-label">Vorschlag</span>' +
      item('../design-a/', 'Design A', 'a') +
      item('../design-b/', 'Design B', 'b') +
      '<span class="vz-sep" aria-hidden="true"></span>' +
      '<a class="vz-cta" href="../wunschliste/">Wunschliste</a>';
    document.body.appendChild(bar);
  }

  var toast = document.createElement('div');
  toast.className = 'vz-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  document.body.appendChild(toast);
  var timer;

  document.addEventListener('click', function (e) {
    var link = e.target.closest('[data-soon]');
    if (!link) return;
    e.preventDefault();
    var page = link.getAttribute('data-soon');
    toast.textContent = (page ? 'Die Seite «' + page + '»' : 'Diese Unterseite') +
      ' wird nach der Designwahl umgesetzt.';
    toast.classList.add('is-visible');
    clearTimeout(timer);
    timer = setTimeout(function () { toast.classList.remove('is-visible'); }, 2600);
  });
})();
