/*
 * Displacement and channel separation inspired by nikdelvin/liquid-glass.
 * Copyright (c) 2025 Nikita Stadnik. MIT, see ../LIQUID-GLASS-LICENSE.txt.
 */
const svgNS = 'http://www.w3.org/2000/svg';
const displacementTexture = new URL('./glass-displacement.png', import.meta.url).href;
const sampleBleed = { x: 67, y: 25 };

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
  const surface = dispersion && svgElement('feDisplacementMap', {
    in: 'SourceGraphic', in2: 'current', scale: 15,
    xChannelSelector: 'R', yChannelSelector: 'G', result: 'surface'
  });
  if (surface) {
    filter.append(svgElement('feTurbulence', {
      type: 'fractalNoise', baseFrequency: '.014 .041', numOctaves: 1, seed: 8, result: 'current'
    }), surface);
  }

  const strength = navigation ? 58 : 37;
  const layers = [];
  function displacement(shift, result) {
    const layer = svgElement('feDisplacementMap', {
      in: surface ? 'surface' : 'SourceGraphic', in2: 'bevel', scale: strength + shift,
      xChannelSelector: 'R', yChannelSelector: 'G', result
    });
    layers.push({ layer, shift });
    return layer;
  }

  if (!dispersion) {
    filter.append(displacement(0, 'refracted'));
    return { filter, strength, layers };
  }

  const channels = [
    ['red', 10, '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0'],
    ['green', 0, '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0'],
    ['blue', -8, '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0']
  ];
  for (const [channel, shift, values] of channels) {
    const displaced = 'displaced-' + channel;
    filter.append(displacement(shift, displaced), svgElement('feColorMatrix', {
      in: displaced, type: 'matrix', values, result: channel
    }));
  }
  filter.append(
    svgElement('feBlend', { in: 'red', in2: 'green', mode: 'screen', result: 'red-green' }),
    svgElement('feBlend', { in: 'red-green', in2: 'blue', mode: 'screen' })
  );
  return { filter, strength, layers, surface };
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
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const states = new Map(elements.map((element, index) => [element, {
    phase: index * 1.4,
    force: 0,
    direction: 0
  }]));
  let frame = 0;
  let lastFrame = 0;
  let scrollPosition = window.scrollY;
  let scrollForce = 0;

  function updateVisibility(element) {
    element.toggleAttribute('data-refracting', liveBackdrop && !document.hidden &&
      visible.has(element) && Boolean(states.get(element).sample));
  }

  function applyFilter(filter) {
    const previous = document.getElementById(filter.id);
    if (previous) previous.replaceWith(filter);
    else definitions.append(filter);
  }

  function requestRender() {
    if (!frame && !document.hidden && visible.size) frame = requestAnimationFrame(render);
  }

  function setStrength({ strength, layers }, flex) {
    for (const { layer, shift } of layers) {
      layer.setAttribute('scale', (strength + shift + flex).toFixed(2));
    }
  }

  function render(now) {
    frame = 0;
    if (document.hidden || !visible.size) return;

    const decay = Math.exp(-Math.min(64, now - lastFrame) / 410);
    lastFrame = now;
    const reduced = motion.matches;
    scrollForce *= decay;
    let settling = Math.abs(scrollForce) > .015;

    for (const element of visible) {
      const state = states.get(element);
      if (!state.sample) continue;

      state.force *= decay;
      settling ||= state.force > .015;

      const phase = reduced ? 0 : now / 790 + state.phase;
      const travel = reduced ? .24 : 1;
      const range = element.dataset.lens === 'navigation' ? 25 : 12;
      const drift = reduced ? 0 : Math.sin(phase * .87) * range;
      const height = reduced ? 0 : Math.sin(phase * 1.09 + .8) * 8;
      const x = drift + travel * (scrollForce * 13 + state.force * state.direction * 19);
      const y = height - travel * scrollForce * 8;
      state.image.setAttribute('x', (x - sampleBleed.x).toFixed(2));
      state.image.setAttribute('y', (y - sampleBleed.y).toFixed(2));

      const energy = travel * (Math.abs(scrollForce) + state.force);
      const edge = (reduced ? 0 : Math.sin(phase * 1.18) * 12) + energy * 16;
      const ripple = (reduced ? 9 : 18 + Math.sin(phase * .93) * 9) + energy * 12;
      state.sample.surface.setAttribute('scale', ripple.toFixed(2));
      setStrength(state.sample, edge);
      if (state.backdrop) setStrength(state.backdrop, edge);
    }
    if (!reduced || settling) requestRender();
  }

  const sizes = new ResizeObserver(entries => {
    for (const { target, borderBoxSize } of entries) {
      const size = borderBoxSize?.[0];
      const width = Math.ceil(size?.inlineSize ?? target.offsetWidth);
      const height = Math.ceil(size?.blockSize ?? target.offsetHeight);
      if (width < 40 || height < 34 || width * height > 65000) continue;
      const key = `${width}x${height}`;
      const state = states.get(target);
      if (state.geometry === key) continue;

      const kind = target.dataset.lens;
      const navigation = kind === 'navigation';
      const sampleId = 'liquid-sample-' + kind;
      const sample = target.querySelector('.lens-sample');
      state.sample = createFilter(sampleId, width, height, navigation, true);
      applyFilter(state.sample.filter);
      sample.setAttribute('viewBox', `0 0 ${width} ${height}`);
      state.image = sample.querySelector('image');
      state.image.setAttribute('x', -sampleBleed.x);
      state.image.setAttribute('y', -sampleBleed.y);
      state.image.setAttribute('width', width + sampleBleed.x * 2);
      state.image.setAttribute('height', height + sampleBleed.y * 2);
      state.image.setAttribute('filter', `url(#${sampleId})`);

      if (liveBackdrop) {
        const id = 'liquid-optics-' + kind;
        state.backdrop = createFilter(id, width, height, navigation, false);
        applyFilter(state.backdrop.filter);
        target.style.setProperty('--refraction', `url("#${id}")`);
      }
      state.geometry = key;
      updateVisibility(target);
    }
    requestRender();
  });

  const intersection = 'IntersectionObserver' in window &&
    new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
        updateVisibility(entry.target);
      }
      requestRender();
    });

  function touchGlass(event) {
    const element = event.currentTarget;
    const state = states.get(element);
    const bounds = element.getBoundingClientRect();
    state.direction = (event.clientX - bounds.left) / bounds.width * 2 - 1;
    state.force = Math.max(state.force, event.type === 'pointerdown' ? 1.2 : .34);
    requestRender();
  }

  for (const element of elements) {
    sizes.observe(element);
    if (element.dataset.lens !== 'navigation') {
      if (intersection) intersection.observe(element);
      else visible.add(element);
    }
    element.addEventListener('pointerdown', touchGlass);
    element.addEventListener('pointermove', touchGlass);
  }
  window.addEventListener('scroll', () => {
    const position = window.scrollY;
    scrollForce = Math.max(-1.25, Math.min(1.25, scrollForce + (position - scrollPosition) / 41));
    scrollPosition = position;
    requestRender();
  }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    elements.forEach(updateVisibility);
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else {
      requestRender();
    }
  });
  motion.addEventListener('change', requestRender);
}
