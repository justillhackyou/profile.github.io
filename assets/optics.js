/*
 * Edge displacement and channel separation inspired by nikdelvin/liquid-glass.
 * Copyright (c) 2025 Nikita Stadnik. MIT, see ../LIQUID-GLASS-LICENSE.txt.
 */
const svgNS = 'http://www.w3.org/2000/svg';
const maps = new Map();

function roundedEdgeMap(width, height) {
  const key = `${width}x${height}`;
  if (maps.has(key)) return maps.get(key);

  // Red encodes horizontal displacement, green encodes vertical displacement.
  // The flat center sits at 0.5 on both axes. The changing slope models a bevel.
  const stops = (size, channel) => {
    const color = value => channel === 'red' ? `rgb(${value},0,0)` : `rgb(0,${value},0)`;
    const depth = Math.min(13, size * .25);
    return [[0, 216], [depth * .3, 233], [depth * .65, 174], [depth, 128],
      [size - depth, 128], [size - depth * .65, 82], [size - depth * .3, 23], [size, 40]]
      .map(([offset, value]) => `<stop offset="${offset / size}" stop-color="${color(value)}"/>`).join('');
  };

  const map = `<svg xmlns="${svgNS}" width="${width}" height="${height}">
    <defs><linearGradient id="x">${stops(width, 'red')}</linearGradient>
    <linearGradient id="y" x2="0" y2="1">${stops(height, 'green')}</linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#x)"/>
    <rect width="100%" height="100%" fill="url(#y)" style="mix-blend-mode:screen"/>
  </svg>`;

  const uri = 'data:image/svg+xml,' + encodeURIComponent(map);
  if (maps.size >= 24) maps.delete(maps.keys().next().value);
  maps.set(key, uri);
  return uri;
}

function svgElement(tag, attributes) {
  const element = document.createElementNS(svgNS, tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  return element;
}

function createFilter(id, width, height, isNavigation) {
  const filter = svgElement('filter', {
    id, x: 0, y: 0, width, height,
    filterUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB'
  });
  filter.append(svgElement('feImage', {
    href: roundedEdgeMap(width, height), x: 0, y: 0, width, height, result: 'map'
  }));
  const displacement = (scale, result) => svgElement('feDisplacementMap', {
    in: 'SourceGraphic', in2: 'map', scale, xChannelSelector: 'R', yChannelSelector: 'G', result
  });

  if (isNavigation || !matchMedia('(pointer: fine)').matches) {
    filter.append(displacement(isNavigation ? 22 : 19, 'refracted'));
    return filter;
  }

  // Three nearby focal lengths are confined to the compact desktop call to action.
  const channels = [
    ['red', 22, '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0'],
    ['green', 20, '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0'],
    ['blue', 18, '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0']
  ];
  for (const [channel, scale, values] of channels) {
    const displaced = 'displaced-' + channel;
    filter.append(displacement(scale, displaced), svgElement('feColorMatrix', {
      in: displaced, type: 'matrix', values, result: channel
    }));
  }
  filter.append(
    svgElement('feBlend', { in: 'red', in2: 'green', mode: 'screen', result: 'red-green' }),
    svgElement('feBlend', { in: 'red-green', in2: 'blue', mode: 'screen' })
  );
  return filter;
}

export function enableOptics() {
  // Safari and Firefox can accept the URL syntax without rendering this backdrop.
  if (!/Chrom(?:ium|e)\//.test(navigator.userAgent) ||
      !CSS.supports('backdrop-filter', 'url("#liquid-optics-test")') ||
      !('ResizeObserver' in window)) return;

  const definitions = svgElement('defs', {});
  const svg = svgElement('svg', { width: 0, height: 0, 'aria-hidden': 'true' });
  svg.classList.add('optics-definitions');
  svg.append(definitions);
  document.body.prepend(svg);

  const elements = [...document.querySelectorAll('[data-lens]')];
  const visible = new Set(elements.filter(element => element.dataset.lens === 'navigation'));
  const geometry = new WeakMap();

  function updateVisibility(element) {
    element.toggleAttribute('data-refracting', !document.hidden && visible.has(element) && geometry.has(element));
  }

  const sizes = new ResizeObserver(entries => {
    for (const { target, contentRect } of entries) {
      const box = target.getBoundingClientRect();
      const width = Math.ceil(box.width || contentRect.width);
      const height = Math.ceil(box.height || contentRect.height);
      if (width < 40 || height < 35 || width * height > 40000) continue;
      const key = `${width}x${height}`;
      if (geometry.get(target) === key) continue;

      const id = 'liquid-optics-' + target.dataset.lens;
      const filter = createFilter(id, width, height, target.dataset.lens === 'navigation');
      const prior = document.getElementById(id);
      if (prior) prior.replaceWith(filter);
      else definitions.append(filter);

      geometry.set(target, key);
      target.style.setProperty('--refraction', `url("#${id}")`);
      updateVisibility(target);
    }
  });

  const intersection = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
      updateVisibility(entry.target);
    }
  });

  for (const element of elements) {
    sizes.observe(element);
    if (element.dataset.lens !== 'navigation') intersection.observe(element);
  }
  document.addEventListener('visibilitychange', () => elements.forEach(updateVisibility));
}
