/* Chủ đề sáng/tối cho cả ba trang. Tách riêng vì trước đây khối này bị chép
   nguyên văn vào app.js, gia.js và privacy.js — sửa một chỗ là lệch hai chỗ kia.

   Quy tắc: lần đầu vào trang luôn đi theo hệ thống. Chỉ khi người dùng tự gạt
   công tắc thì lựa chọn đó mới được ghi nhớ, và từ đó trang thôi đi theo hệ thống. */
(function () {
  'use strict';

  var STORE = 'brain-site-theme';
  var root = document.documentElement;
  var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function saved() {
    try { var v = localStorage.getItem(STORE); return v === 'light' || v === 'dark' ? v : null; }
    catch (e) { return null; }   // cửa sổ ẩn danh: coi như chưa chọn gì
  }
  function systemDark() { return !!(media && media.matches); }
  function effective() { return saved() || (systemDark() ? 'dark' : 'light'); }

  function paint() {
    var choice = saved();
    if (choice) root.setAttribute('data-theme', choice);
    else root.removeAttribute('data-theme');   // không có lựa chọn thì CSS tự theo hệ thống

    var dark = effective() === 'dark';
    var boxes = document.querySelectorAll('[data-theme-switch]');
    for (var i = 0; i < boxes.length; i++) {
      boxes[i].setAttribute('aria-checked', String(dark));
      boxes[i].setAttribute('title', dark ? 'Đang dùng chế độ tối' : 'Đang dùng chế độ sáng');
    }
  }

  function toggle() {
    var next = effective() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(STORE, next); } catch (e) { /* vẫn đổi được cho tới khi tải lại */ }
    root.setAttribute('data-theme', next);
    paint();
  }

  function bind() {
    var boxes = document.querySelectorAll('[data-theme-switch]');
    for (var i = 0; i < boxes.length; i++) boxes[i].addEventListener('click', toggle);
    paint();
  }

  // Chưa tự chọn thì bám theo hệ thống ngay cả khi nó đổi lúc trang đang mở.
  if (media) {
    var follow = function () { if (!saved()) paint(); };
    if (media.addEventListener) media.addEventListener('change', follow);
    else if (media.addListener) media.addListener(follow);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
