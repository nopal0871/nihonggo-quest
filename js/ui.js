/* ui.js — helper DOM kecil yang dipakai kedua halaman (tanpa framework, tanpa build). */
(function (global) {
  'use strict';

  function append(node, children) {
    if (children === null || children === undefined || children === false) return;
    if (Array.isArray(children)) { children.forEach((c) => append(node, c)); return; }
    node.appendChild(children.nodeType ? children : document.createTextNode(String(children)));
  }

  // h('button', { class: 'btn', onclick: fn }, 'Teks')
  function h(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach((key) => {
        const value = attrs[key];
        if (value === null || value === undefined || value === false) return;
        if (key === 'class') node.className = value;
        else if (key === 'html') node.innerHTML = value; // hanya untuk string statis milik kita
        else if (key.indexOf('on') === 0 && typeof value === 'function') node.addEventListener(key.slice(2), value);
        else node.setAttribute(key, value === true ? '' : value);
      });
    }
    append(node, children);
    return node;
  }

  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const canSpeak = () => 'speechSynthesis' in global && 'SpeechSynthesisUtterance' in global;

  global.UI = { h, shuffle, canSpeak };
})(window);
