import { enableOptics } from './optics.js?v=dock';

const documentRoot = document.documentElement;
const themeSwitch = document.querySelector('.theme-switch');
const themeColor = document.querySelector('meta[name="theme-color"]');
const siteUrl = document.querySelector('link[rel="canonical"]').href;

function setTheme(light) {
  documentRoot.dataset.theme = light ? 'light' : 'dark';
  themeSwitch.setAttribute('aria-pressed', String(light));
  themeColor.content = light ? '#ebe9e8' : '#100f14';
}

setTheme(documentRoot.dataset.theme === 'light');
themeSwitch.addEventListener('click', () => {
  const light = documentRoot.dataset.theme !== 'light';
  setTheme(light);
  try {
    localStorage.setItem('hikmatullo-theme', light ? 'light' : 'dark');
  } catch {
    // The theme still applies when browsing without storage.
  }
});

const navigation = document.querySelector('.navigation');
const navLinks = Array.from(navigation.querySelectorAll('a'));
const syncActive = id => {
  const index = navLinks.findIndex(link => link.hash === '#' + id);
  navigation.toggleAttribute('data-active', index >= 0);
  if (index >= 0) navigation.style.setProperty('--active-index', index);
  for (const [position, link] of navLinks.entries()) {
    if (position === index) link.setAttribute('aria-current', 'location');
    else if (link.hasAttribute('aria-current')) link.removeAttribute('aria-current');
  }
};
navigation.addEventListener('click', event => {
  const link = event.target.closest('a');
  if (link) syncActive(link.hash.slice(1));
});
syncActive(location.hash.slice(1));

if ('IntersectionObserver' in window) {
  const sections = navLinks.map(link => document.getElementById(link.hash.slice(1))).reverse();
  const inReadingArea = new Set();
  const readingArea = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) inReadingArea.add(entry.target);
      else inReadingArea.delete(entry.target);
    }
    const active = sections.find(section => inReadingArea.has(section));
    syncActive(active?.id);
  }, { rootMargin: '-20% 0px -46% 0px' });
  for (const section of sections) readingArea.observe(section);

  if (matchMedia('(prefers-reduced-motion: no-preference)').matches) {
    const reveal = new IntersectionObserver(entries => {
      for (const { isIntersecting, target } of entries) {
        if (!isIntersecting) continue;
        target.setAttribute('data-revealed', '');
        reveal.unobserve(target);
      }
    }, { threshold: .18 });
    for (const element of document.querySelectorAll('.section-heading, .project, .contact-methods')) {
      reveal.observe(element);
    }
  }
}

const dialog = document.querySelector('#project-dialog');
const dialogBody = dialog.querySelector('.dialog-body');
if (typeof dialog.showModal === 'function') {
  document.querySelector('.projects').addEventListener('click', event => {
    const trigger = event.target.closest('[data-project]');
    if (!trigger || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const template = document.getElementById('dialog-' + trigger.dataset.project);
    if (!template) return;
    event.preventDefault();
    dialogBody.replaceChildren(template.content.cloneNode(true));
    dialog.showModal();
  });
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
} else {
  documentRoot.classList.add('no-dialog');
}

const githubForm = document.querySelector('#github-form');
const githubUser = document.querySelector('#github-user');
const githubStatus = document.querySelector('#github-status');
const githubResults = document.querySelector('#github-results');
let githubRequest;

function element(tag, value, className) {
  const node = document.createElement(tag);
  if (value != null) node.textContent = value;
  if (className) node.className = className;
  return node;
}

function githubLink(path, label) {
  const link = element('a', label);
  link.href = 'https://github.com/' + path.split('/').map(encodeURIComponent).join('/');
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}

function renderGitHub(profile, repositories) {
  const summary = element('div', null, 'github-profile');
  if (Number.isInteger(profile.id) && profile.id > 0) {
    const avatar = new Image(48, 48);
    avatar.alt = '';
    avatar.decoding = 'async';
    avatar.src = `https://avatars.githubusercontent.com/u/${profile.id}?s=96`;
    avatar.addEventListener('error', () => avatar.remove(), { once: true });
    summary.append(avatar);
  }
  const identity = element('div');
  const name = githubLink(profile.login, profile.name || '@' + profile.login);
  name.className = 'text-action';
  identity.append(name);
  if (profile.bio) identity.append(element('p', profile.bio));
  summary.append(identity);

  const stats = element('div', null, 'github-stats');
  for (const [key, label] of [['public_repos', 'Public repos'], ['followers', 'Followers'], ['following', 'Following']]) {
    const stat = element('span');
    stat.append(element('strong', profile[key]), ' ' + label);
    stats.append(stat);
  }
  githubResults.replaceChildren(summary, stats);
  if (repositories === null) return;
  if (!repositories.length) {
    githubStatus.textContent = 'No public repositories.';
    return;
  }

  const list = element('ul', null, 'github-repos');
  for (const repo of repositories) {
    const item = element('li');
    const link = githubLink(repo.full_name, repo.name);
    if (repo.description) link.append(element('span', repo.description));
    if (repo.language) link.append(element('span', repo.language));
    item.append(link);
    list.append(item);
  }
  githubResults.append(list);
}

async function loadGitHub(username) {
  if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username)) {
    githubStatus.textContent = 'Enter a valid GitHub username.';
    return;
  }
  githubRequest?.abort();
  const request = new AbortController();
  githubRequest = request;
  const timeout = setTimeout(() => {
    githubStatus.textContent = 'GitHub took too long to respond. Please try again.';
    request.abort();
  }, 10000);
  const endpoint = 'https://api.github.com/users/' + encodeURIComponent(username);
  githubStatus.textContent = 'Loading GitHub data…';
  githubResults.replaceChildren();
  githubForm.setAttribute('aria-busy', 'true');

  try {
    const options = { signal: request.signal };
    const profileResponse = await fetch(endpoint, options);
    if (!profileResponse.ok) {
      throw new Error(profileResponse.status === 404 ? 'GitHub user not found.' : 'GitHub is temporarily unavailable. Please try again.');
    }
    const profile = await profileResponse.json();
    if (request.signal.aborted) return;
    renderGitHub(profile, null);
    const reposResponse = await fetch(endpoint + '/repos?sort=updated&per_page=6', options);
    if (request.signal.aborted) return;
    if (!reposResponse.ok) {
      githubStatus.textContent = 'Repositories could not be loaded. Please try again.';
      return;
    }
    const repositories = await reposResponse.json();
    if (request.signal.aborted) return;
    githubStatus.textContent = '';
    renderGitHub(profile, repositories);
  } catch (error) {
    if (request.signal.aborted) return;
    githubStatus.textContent = error instanceof TypeError ? 'Could not connect to GitHub. Please try again.' : error.message;
  } finally {
    clearTimeout(timeout);
    if (githubRequest === request) githubForm.removeAttribute('aria-busy');
  }
}

const owner = githubUser.value;
let githubVisibility;
if ('IntersectionObserver' in window) {
  githubVisibility = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    githubVisibility.disconnect();
    loadGitHub(owner);
  }, { rootMargin: '100px' });
  githubVisibility.observe(githubForm);
} else {
  loadGitHub(owner);
}
githubForm.addEventListener('submit', event => {
  event.preventDefault();
  githubVisibility?.disconnect();
  loadGitHub(githubUser.value.trim());
});

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // A browser may expose Clipboard while denying writes for this tab.
    }
  }
  const field = element('textarea');
  field.value = text;
  field.readOnly = true;
  field.className = 'sr-only';
  const previous = document.activeElement;
  document.body.append(field);
  field.select();
  try {
    return document.execCommand('copy');
  } finally {
    field.remove();
    previous?.focus({ preventScroll: true });
  }
}

const contactStatus = document.querySelector('#contact-status');
const copyTimers = new WeakMap();
async function reportCopy(text, success) {
  let copied = false;
  try {
    copied = await copyText(text);
  } catch {
    // Leave the public value available for manual selection in the dialog below.
  }
  contactStatus.textContent = copied ? success : 'Automatic copying is unavailable.';
  if (!copied) window.prompt('Copy this text:', text);
  return copied;
}

document.querySelector('#contact').addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.copy) {
    if (await reportCopy(button.dataset.copy, 'Copied to clipboard.')) {
      button.setAttribute('data-copied', '');
      clearTimeout(copyTimers.get(button));
      copyTimers.set(button, setTimeout(() => button.removeAttribute('data-copied'), 1800));
    }
  } else if (button.hasAttribute('data-share')) {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Hikmatullo Gofurjonov', url: siteUrl });
        return;
      } catch (error) {
        if (error.name === 'AbortError') return;
      }
    }
    await reportCopy(siteUrl, 'Site link copied to clipboard.');
  } else if (button.hasAttribute('data-print')) {
    window.print();
  }
});

document.querySelector('[data-year]').textContent = new Date().getFullYear();
enableOptics();
