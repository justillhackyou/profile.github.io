/* Refraction adapted from https://github.com/nikdelvin/liquid-glass
 * Copyright (c) 2025 Nikita Stadnik. MIT; see ../LIQUID-GLASS-LICENSE.txt.
 * Keep the original React application and its event handlers untouched.
 */
(() => {
  "use strict";
  const ua = navigator.userAgent;
  const chromium = /Chrom(?:e|ium)\//.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  if (!chromium || !window.CSS || !CSS.supports("backdrop-filter", 'url("data:image/svg+xml,%3Csvg/%3E#glass")') || !window.ResizeObserver) return;
  const target = ".topbar, .hero-main";
  const sizes = new WeakMap();
  const observed = new Set();
  const svgURI = (svg) => "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  function displacementMap(w, h, radius, depth) {
    const px = Math.ceil(radius / w * 15);
    const py = Math.ceil(radius / h * 15);
    return svgURI(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs>
        <linearGradient id="x" x1="${px}%" x2="${100-px}%" y1="0" y2="0"><stop stop-color="#f00"/><stop offset="1" stop-color="#000"/></linearGradient>
        <linearGradient id="y" x1="0" x2="0" y1="${py}%" y2="${100-py}%"><stop stop-color="#0f0"/><stop offset="1" stop-color="#000"/></linearGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="#808080"/>
      <g style="filter:blur(2px);isolation:isolate">
        <rect width="${w}" height="${h}" fill="#000080"/>
        <rect width="${w}" height="${h}" fill="url(#x)" style="mix-blend-mode:screen"/>
        <rect width="${w}" height="${h}" fill="url(#y)" style="mix-blend-mode:screen"/>
        <rect x="${depth}" y="${depth}" width="${w-depth*2}" height="${h-depth*2}" rx="${Math.max(1,radius-depth/2)}" fill="#808080" style="filter:blur(${depth}px)"/>
      </g>
    </svg>`);
  }
  function filterURL(w,h,radius,depth,strength,aberration) {
    const map = displacementMap(w,h,radius,depth);
    const channel = (key,amount,matrix) => `<feDisplacementMap in="SourceGraphic" in2="map" scale="${amount}" xChannelSelector="R" yChannelSelector="G" result="d${key}"/><feColorMatrix in="d${key}" type="matrix" values="${matrix}" result="${key}"/>`;
    return svgURI(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <filter id="glass" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
        <feImage href="${map}" x="0" y="0" width="${w}" height="${h}" result="map"/>
        ${channel("r",strength+aberration*2,"1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0")}
        ${channel("g",strength+aberration,"0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0")}
        ${channel("b",strength,"0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0")}
        <feBlend in="r" in2="g" mode="screen" result="rg"/><feBlend in="rg" in2="b" mode="screen"/>
      </filter>
    </svg>`) + "#glass";
  }
  function redraw(el) {
    const w = Math.round(el.clientWidth), h = Math.round(el.clientHeight);
    if (w < 30 || h < 30 || w*h > 950000) {
      el.style.removeProperty("--liquid-refraction");
      sizes.delete(el);
      return;
    }
    const radius = Math.min(Math.round(parseFloat(getComputedStyle(el).borderTopLeftRadius)||28),Math.floor(Math.min(w,h)/2));
    const compact = el.classList.contains("topbar");
    const depth = Math.min(compact ? 9 : 15, Math.floor(Math.min(w,h)/4));
    const key = [w,h,radius,depth].join(":");
    if (sizes.get(el) === key) return;
    sizes.set(el,key);
    const url = filterURL(w,h,radius,depth,compact ? 19 : 32,1.3);
    el.style.setProperty("--liquid-refraction", `blur(1.5px) url("${url}") blur(${compact?7:5}px) saturate(145%)`);
  }
  const resize = new ResizeObserver(entries => entries.forEach(({target:el}) => redraw(el)));
  let pending = false;
  function scan() {
    pending = false;
    for (const el of observed) if (!el.isConnected) {
      resize.unobserve(el); observed.delete(el); sizes.delete(el);
    }
    document.querySelectorAll(target).forEach(el => {
      if (observed.has(el)) return;
      observed.add(el); resize.observe(el); redraw(el);
    });
  }
  const observer = new MutationObserver(() => {
    if (!pending) { pending = true; requestAnimationFrame(scan); }
  });
  const root = document.getElementById("root");
  if (root) {
    observer.observe(root,{childList:true,subtree:true});
    scan();
    window.addEventListener("pagehide", event => {
      if (!event.persisted) { observer.disconnect(); resize.disconnect(); observed.clear(); }
    });
  }
})();
