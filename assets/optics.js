/*
 * Displacement and channel separation inspired by nikdelvin/liquid-glass.
 * Copyright (c) 2025 Nikita Stadnik. MIT, see ../LIQUID-GLASS-LICENSE.txt.
 */
const svgNS = 'http://www.w3.org/2000/svg';
const displacementTexture = new URL('./glass-displacement.png', import.meta.url).href;

function svgElement(tag, attributes) {
  const element = document.createElementNS(svgNS, tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  return element;
}

function createFilter(id, width, height, navigation, dispersion) {
  const filter = svgElement('filter', {
    id, x: 0, y: 0, width, height,
    filterUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB'
  });
  filter.append(svgElement('feImage', {
    href: displacementTexture, x: 0, y: 0, width, height,
    preserveAspectRatio: 'none', result: 'bevel'
  }));
  const displacement = (scale, result) => svgElement('feDisplacementMap', {
    in: 'SourceGraphic', in2: 'bevel', scale, xChannelSelector: 'R', yChannelSelector: 'G', result
  });

  const strength = navigation ? 58 : 37;
  if (!dispersion) {
    filter.append(displacement(strength, 'refracted'));
    return filter;
  }

  const channels = [
    ['red', 10, '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0'],
    ['green', 0, '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0'],
    ['blue', -8, '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0']
  ];
  for (const [channel, shift, values] of channels) {
    const displaced = 'displaced-' + channel;
    filter.append(displacement(strength + shift, displaced), svgElement('feColorMatrix', {
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
  if (!('ResizeObserver' in window)) return;

  // Chromium can refract live page content. Every engine can filter the local
  // wallpaper sample through an SVG image, including Safari and Firefox.
  const liveBackdrop = /Chrom(?:ium|e)\//.test(navigator.userAgent) &&
    CSS.supports('backdrop-filter', 'url("#liquid-optics-test")');
  const definitions = svgElement('defs', {});
  const svg = svgElement('svg', { width: 0, height: 0, 'aria-hidden': 'true' });
  svg.classList.add('optics-definitions');
  svg.append(definitions);
  document.body.prepend(svg);

  const elements = [...document.querySelectorAll('[data-lens]')];
  const visible = new Set(elements.filter(element => element.dataset.lens === 'navigation'));
  const geometry = new WeakMap();

  function updateVisibility(element) {
    element.toggleAttribute('data-refracting', liveBackdrop && !document.hidden &&
      visible.has(element) && geometry.has(element));
  }

  function applyFilter(filter) {
    const previous = document.getElementById(filter.id);
    if (previous) previous.replaceWith(filter);
    else definitions.append(filter);
  }

  const sizes = new ResizeObserver(entries => {
    for (const { target, borderBoxSize } of entries) {
      const size = borderBoxSize?.[0];
      const width = Math.ceil(size?.inlineSize ?? target.offsetWidth);
      const height = Math.ceil(size?.blockSize ?? target.offsetHeight);
      if (width < 40 || height < 34 || width * height > 65000) continue;
      const key = `${width}x${height}`;
      if (geometry.get(target) === key) continue;

      const kind = target.dataset.lens;
      const navigation = kind === 'navigation';
      const sampleId = 'liquid-sample-' + kind;
      const sample = target.querySelector('.lens-sample');
      applyFilter(createFilter(sampleId, width, height, navigation, true));
      sample.setAttribute('viewBox', `0 0 ${width} ${height}`);
      sample.querySelector('image').setAttribute('filter', `url(#${sampleId})`);

      if (liveBackdrop) {
        const id = 'liquid-optics-' + kind;
        applyFilter(createFilter(id, width, height, navigation, false));
        target.style.setProperty('--refraction', `url("#${id}")`);
      }
      geometry.set(target, key);
      updateVisibility(target);
    }
  });

  const intersection = liveBackdrop && 'IntersectionObserver' in window &&
    new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
        updateVisibility(entry.target);
      }
    });

  for (const element of elements) {
    sizes.observe(element);
    if (element.dataset.lens !== 'navigation') {
      if (intersection) intersection.observe(element);
      else visible.add(element);
    }
  }
  if (liveBackdrop) {
    document.addEventListener('visibilitychange', () => elements.forEach(updateVisibility));
  }
}
