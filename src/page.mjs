const site = 'https://hikmatullo.dev/';
const description = 'Hikmatullo Gofurjonov — first-year Software Engineering student at ITPU, Uzbekistan, and independent systems developer working across software, Android, GSM, and embedded hardware.';
const escapes = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const html = value => String(value).replace(/[&<>"']/g, character => escapes[character]);
const list = values => values.map(value => `<li>${html(value)}</li>`).join('');
const tags = values => `<ul class="tags">${list(values)}</ul>`;
const external = (url, label, className = '') =>
  `<a class="${className}" href="${html(url)}" target="_blank" rel="noopener noreferrer">${html(label)}</a>`;
const svg = paths => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const icons = {
  theme: svg('<g class="sun"><circle cx="12" cy="12" r="3.5"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5"/></g><path class="moon" d="M20.8 15.1A9.1 9.1 0 0 1 8.9 3.2a9.1 9.1 0 1 0 11.9 11.9Z"/>'),
  close: svg('<path d="m6 6 12 12M18 6 6 18"/>'),
  copy: svg('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>')
};
const navigation = [
  ['work', 'Work'], ['systems', 'Systems'], ['social-hub', 'GitHub'],
  ['profile', 'Profile'], ['contact', 'Contact']
];

function project(project) {
  return `<article class="project">
    <p class="eyebrow">${html(project.date)}</p>
    <h3>${html(project.title)}</h3>
    <p class="project-copy">${html(project.description)}</p>
    ${tags(project.tags)}
    <a class="text-action" href="#${project.id}-context" data-project="${project.id}">View project<span class="sr-only"> — ${html(project.title)}</span></a>
    <section class="project-context" id="${project.id}-context" aria-label="${html(project.title)} project context">
      <h4>Project context</h4><ul>${list(project.context)}</ul>
    </section>
  </article>`;
}

function projectDialog(project) {
  return `<template id="dialog-${project.id}">
    <p class="eyebrow">${html(project.date)}</p>
    <h2 id="dialog-title">${html(project.title)}</h2>
    <p>${html(project.description)}</p>
    <h3>Recorded stack</h3>${tags(project.tags)}
    <h3>Project context</h3><ul class="context-list">${list(project.context)}</ul>
  </template>`;
}

function sectionHeading(id, label, title, copy) {
  return `<header class="section-heading">
    <div><p class="eyebrow">${label}</p><h2 id="${id}">${title}</h2></div>
    <p>${copy}</p>
  </header>`;
}

export function renderPage({ profile, hardware, perspective, projects, skills, timeline, languages, interests, contact }) {
  const phone = contact.phone.replace(/\s/g, '');
  const channels = [
    ['Telegram', contact.telegram, contact.telegramUrl, 'Primary messaging'],
    ['GitHub', '@' + contact.github, contact.githubUrl, 'Repositories & open source'],
    ['Instagram', contact.instagram, contact.instagramUrl, 'Hardware photos & mobile updates'],
    ['Phone', contact.phone, 'tel:' + phone, 'Direct mobile contact']
  ];
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#100f14">
  <meta name="color-scheme" content="dark light">
  <meta name="description" content="${html(description)}">
  <meta property="og:title" content="${html(profile.name)} | System Developer">
  <meta property="og:description" content="${html(description)}">
  <meta property="og:url" content="${site}">
  <meta property="og:type" content="website">
  <meta property="og:image" content="${site}assets/wallpaper-desktop.webp">
  <meta name="twitter:card" content="summary_large_image">
  <title>${html(profile.name)} | System Developer</title>
  <link rel="canonical" href="${site}">
  <link rel="icon" href="./assets/portrait.webp" type="image/webp">
  <link rel="preload" href="./assets/instrument-serif.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="./assets/site.css">
  <script>document.documentElement.classList.add('js');try{if(localStorage.getItem('hikmatullo-theme')==='light'){document.documentElement.dataset.theme='light';document.querySelector('meta[name="theme-color"]').content='#ebe9e8'}}catch{}</script>
  <script type="module" src="./assets/site.js"></script>
</head>
<body>
  <picture class="wallpaper" aria-hidden="true">
    <source media="(max-width: 680px) and (orientation: portrait)" srcset="./assets/wallpaper-mobile.webp" width="768" height="1178">
    <img src="./assets/wallpaper-desktop.webp" width="1920" height="1080" alt="" fetchpriority="high">
  </picture>
  <a class="skip-link" href="#top">Skip to content</a>
  <header class="masthead">
    <div class="header-inner shell">
      <a class="wordmark" href="#top">hikmatullo<span>.dev</span></a>
      <nav class="lens navigation" data-lens="navigation" aria-label="Main navigation">
        <span class="optics" aria-hidden="true"></span>
        ${navigation.map(([id, label]) => `<a href="#${id}">${label}</a>`).join('')}
        <button class="theme-switch js-only" type="button" aria-label="Light theme" aria-pressed="false">${icons.theme}</button>
      </nav>
    </div>
  </header>
  <main id="top" tabindex="-1">
    <section class="hero shell" aria-labelledby="hero-title">
      <p class="hero-location eyebrow"><span></span>Fergana, Uzbekistan</p>
      <h1 id="hero-title">Hikmatullo <br>Gofurjonov</h1>
      <div class="hero-intro">
        <p class="profession">${html(profile.title)}</p>
        <p class="intro-copy">I build software, Android tools, and hardware systems in Uzbekistan.</p>
      </div>
      <div class="hero-actions">
        <a class="lens action action-primary" data-lens="action" href="#work"><span class="optics" aria-hidden="true"></span><span class="action-label">Explore my work</span></a>
        ${external(contact.telegramUrl, 'Telegram', 'action action-secondary')}
      </div>
      <div class="hero-base">
        <p><span class="eyebrow">Education</span><strong>IT Park University</strong><span>Software Engineering, Year 1 of 4</span></p>
        <p><span class="eyebrow">Focus</span><strong>Software & hardware</strong><span>Android, GSM & embedded systems</span></p>
      </div>
      <figure class="identity">
        <img src="./assets/portrait.webp" alt="Hikmatullo Gofurjonov’s avatar" width="480" height="480" decoding="async">
        <figcaption>Student <span>·</span> Developer <span>·</span> Security Specialist</figcaption>
      </figure>
    </section>
    <div class="content">
      <div class="shell">
        <section id="work" class="section" aria-labelledby="work-title">
          ${sectionHeading('work-title', 'Portfolio', 'Selected work', 'Desktop utilities, Android servicing, automation, and hands-on hardware research.')}
          <div class="projects">${projects.map(project).join('\n')}</div>
        </section>
        <section id="systems" class="section" aria-labelledby="systems-title">
          ${sectionHeading('systems-title', 'Technical skills', 'Tools & systems', 'Languages, interfaces, Android internals, and embedded experimentation.')}
          <div class="columns systems-columns">
            <div><h3>Languages & core focus</h3>${tags(skills)}</div>
            <div><h3>Engineering toolkit</h3>
              <dl class="specs">
                <div><dt>Desktop & systems</dt><dd>.NET 10, WPF, C#, Python, system tooling</dd></div>
                <div><dt>Android internals</dt><dd>Kernel compilation, custom ROMs, KernelSU, Fastboot</dd></div>
                <div><dt>GSM & device service</dt><dd>Firmware operations, schematics diagnostics, FRP & bypass</dd></div>
                <div><dt>Embedded hardware lab</dt><dd>Raspberry Pi Pico 2 (RP2350), USB-PHY, usbliter8, hardware auditing</dd></div>
              </dl>
            </div>
          </div>
          <h3 class="subheading">Engineering timeline</h3>
          <ol class="timeline">${timeline.map(item => `<li><span class="eyebrow">${html(item.year)}</span><h4>${html(item.title)}</h4><p>${html(item.copy)}</p></li>`).join('')}</ol>
        </section>
        <section id="social-hub" class="section" aria-labelledby="github-title">
          ${sectionHeading('github-title', 'Open source', 'GitHub', 'Browse public repositories and look up GitHub profiles.')}
          <div class="github">
            <div class="github-head">
              <div><h3>GitHub profile</h3>${external(contact.githubUrl, '@' + contact.github, 'text-action')}</div>
              <form class="github-form js-only" id="github-form">
                <label class="sr-only" for="github-user">GitHub username</label>
                <input id="github-user" name="username" value="${html(contact.github)}" maxlength="39" required autocomplete="off" autocapitalize="off" spellcheck="false">
                <button class="action action-secondary" type="submit">Search</button>
              </form>
            </div>
            <p id="github-status" role="status" class="feedback"></p>
            <div id="github-results"></div>
          </div>
          <div class="social-note">
            <p>Follow hardware, device lab, and student life updates on ${external(contact.instagramUrl, 'Instagram')}. Reach me directly on ${external(contact.telegramUrl, 'Telegram')}.</p>
          </div>
        </section>
        <section id="profile" class="section" aria-labelledby="profile-title">
          ${sectionHeading('profile-title', 'Education & profile', 'Beyond the work', 'Academic foundation, working environment, spoken languages, and personal interests.')}
          <div class="columns">
            <div>
              <h3>Background & academics</h3>
              <p>${html(profile.academicDetails)}</p>
              <p>${html(profile.base)} · ${html(profile.role)}</p>
              <h4>Spoken languages & fluency</h4>${tags(languages)}
            </div>
            <div>
              <h3>Hardware rig & environment</h3>
              <dl class="specs">${hardware.devices.map(device => `<div><dt>${html(device.name)}</dt><dd>${html(device.role)}</dd></div>`).join('')}</dl>
              <h4>Operating systems</h4>${tags(hardware.operatingSystems)}
              <h4>GSM & board repair tools</h4>${tags(hardware.gsmArsenal)}
            </div>
          </div>
          <div class="perspective">
            <div><h3>Aesthetics, gaming & the Dark Forest</h3>
              <dl class="specs">${interests.map(item => `<div><dt>${html(item.title)}</dt><dd>${html(item.copy)}</dd></div>`).join('')}</dl>
            </div>
            <figure><blockquote>“${html(perspective.philosophyQuote)}”</blockquote><figcaption>${html(perspective.philosophyAuthor)}</figcaption></figure>
          </div>
        </section>
        <section id="contact" class="section contact" aria-labelledby="contact-title">
          ${sectionHeading('contact-title', 'Contact', 'Get in touch', 'Direct channels for engineering, device service inquiries, and project collaboration.')}
          <div class="contact-grid">
            ${channels.map(([label, value, url, note]) => `<div class="contact-item">
              <div><p class="eyebrow">${label}</p>
                ${url.startsWith('tel:') ? `<a class="contact-value" href="${html(url)}">${html(value)}</a>` : external(url, value, 'contact-value')}
                <p>${note}</p>
              </div>
              <button class="icon-action js-only" type="button" data-copy="${html(value)}" aria-label="Copy ${label} contact">${icons.copy}</button>
            </div>`).join('')}
          </div>
          <div class="contact-toolbar">
            <a class="action action-secondary" href="./assets/hikmatullo-gofurjonov.vcf" download>Save contact</a>
            <button class="action action-secondary js-only" type="button" data-share>Share site</button>
            <button class="action action-secondary js-only" type="button" data-print>Print résumé</button>
            <details class="contact-qr">
              <summary class="action action-secondary">Telegram QR</summary>
              <figure><img src="./assets/telegram-qr.png" alt="QR code for Telegram at ${html(contact.telegram)}" width="144" height="144" loading="lazy"><figcaption>Scan to chat on Telegram</figcaption></figure>
            </details>
          </div>
          <p class="feedback" id="contact-status" role="status"></p>
        </section>
        <footer class="footer">
          <p>© <span data-year>2026</span> ${html(profile.name)}</p>
          ${external('https://unsplash.com/photos/abstract-glass-structure-with-iridescent-light-reflections-sC2Twgvu3lg', 'Photography by Rohit Choudhari')}
          <a href="#top">Back to top</a>
        </footer>
      </div>
    </div>
  </main>
  <dialog id="project-dialog" aria-labelledby="dialog-title">
    <div class="dialog-bar"><form method="dialog"><button class="icon-action" aria-label="Close project details" autofocus>${icons.close}</button></form></div>
    <div class="dialog-body"></div>
  </dialog>
  ${projects.map(projectDialog).join('\n')}
</body>
</html>
`;
}

export function renderVCard({ profile, contact }) {
  return [
    'BEGIN:VCARD', 'VERSION:3.0', 'N:Gofurjonov;Hikmatullo;;;', `FN:${profile.name}`,
    `TITLE:${profile.title}`, `TEL;TYPE=CELL:${contact.phone.replace(/\s/g, '')}`,
    `URL:${site}`, `URL:${contact.telegramUrl}`, `URL:${contact.githubUrl}`,
    `URL:${contact.instagramUrl}`, 'END:VCARD', ''
  ].join('\r\n');
}
