// UND Research crawler — run in the browser's developer console while on any und.edu page.
//
// It follows every link under https://und.edu/research/ (same-origin fetches, so no
// CORS issues), then checks und.edu links that point outside /research for redirects.
// When it finishes it copies the raw crawl JSON to the clipboard (Chrome/Edge `copy()`),
// and leaves it on window.CRAWL for inspection.
//
// Links to other domains (including other *.und.edu subdomains) can't be fetched from
// the page, so their redirect status is not checked.

(async () => {
  const START = 'https://und.edu/research/index.html';
  const inScope = u => /^https:\/\/und\.edu\/research\//.test(u) &&
    !/\.(pdf|docx?|xlsx?|pptx?|jpg|png|zip|mp4)$/i.test(u);
  const norm = (href, base) => {
    try {
      const u = new URL(href, base); u.hash = '';
      let s = u.href;
      if (u.hostname === 'und.edu' && s.endsWith('/')) s += 'index.html';
      return s.replace(/^http:\/\/und\.edu/, 'https://und.edu');
    } catch { return null; }
  };

  const pages = {}, seen = new Set([START]), queue = [START];

  async function crawlOne(url) {
    let r;
    try { r = await fetch(url, { credentials: 'omit' }); }
    catch (e) { pages[url] = { url, error: String(e) }; return; }
    const p = { url, status: r.status, finalUrl: r.url };
    p.redirected = r.redirected || norm(r.url) !== url;
    const ct = r.headers.get('content-type') || '';
    if (!ct.includes('html')) { p.nonHtml = ct; pages[url] = p; return; }

    const d = new DOMParser().parseFromString(await r.text(), 'text/html');
    const meta = n => d.querySelector(`meta[name="${n}"],meta[property="${n}"]`)?.content || null;
    p.title = d.title;
    p.h1 = d.querySelector('h1')?.textContent.trim();
    p.desc = meta('Description') || meta('description') || meta('og:description');
    p.modified = meta('dc.date.modified');            // set by the CMS on publish
    try {
      p.crumbs = JSON.parse(d.querySelector('script[type="application/ld+json"]').textContent)
        .itemListElement.map(i => i.name);
    } catch {}

    // Content links only: header/footer are sitewide and collected separately.
    const main = d.querySelector('#main-content') || d.body;
    p.text = (main.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 700);
    const links = [], seenL = new Set();
    main.querySelectorAll('a[href]').forEach(a => {
      const h = a.getAttribute('href');
      if (/^(mailto|tel|javascript):/i.test(h) || h.startsWith('#')) return;
      const u = norm(h, p.finalUrl || url);
      if (!u || seenL.has(u)) return;
      seenL.add(u);
      links.push({ u, t: a.textContent.replace(/\s+/g, ' ').trim().slice(0, 80) });
    });
    p.links = links;
    pages[url] = p;

    const fin = norm(p.finalUrl);
    for (const u of [fin, ...links.map(l => l.u)]) {
      if (u && inScope(u) && !seen.has(u)) { seen.add(u); queue.push(u); }
    }
  }

  while (queue.length) {
    await Promise.all(queue.splice(0, 6).map(crawlOne));
    console.log(`crawled ${Object.keys(pages).length}, queued ${queue.length}`);
  }

  // Check und.edu links outside /research for redirects and dates.
  const outs = new Set();
  Object.values(pages).forEach(p => (p.links || []).forEach(l => { if (!pages[l.u]) outs.add(l.u); }));
  const sameOrigin = [...outs].filter(u => u.startsWith('https://und.edu/') &&
    !/\.(pdf|docx?|xlsx?|jpg|png)$/i.test(u));
  const out = {};
  for (let i = 0; i < sameOrigin.length; i += 8) {
    await Promise.all(sameOrigin.slice(i, i + 8).map(async u => {
      try {
        const r = await fetch(u, { credentials: 'omit' });
        const ct = r.headers.get('content-type') || '';
        let title = null, modified = null, desc = null;
        if (ct.includes('html')) {
          const d = new DOMParser().parseFromString(await r.text(), 'text/html');
          title = d.title;
          modified = d.querySelector('meta[name="dc.date.modified"]')?.content || null;
          desc = d.querySelector('meta[name="Description"],meta[name="description"]')?.content || null;
        }
        out[u] = { status: r.status, finalUrl: r.url, redirected: r.redirected, title, modified, desc };
      } catch (e) { out[u] = { error: String(e) }; }
    }));
  }

  // Sitewide header and footer links from the landing page.
  const landing = new DOMParser().parseFromString(await (await fetch(START)).text(), 'text/html');
  const grab = sel => [...landing.querySelectorAll(sel + ' a[href]')]
    .map(a => ({ u: norm(a.getAttribute('href'), START),
                 t: a.textContent.replace(/\s+/g, ' ').trim() || a.getAttribute('aria-label') || a.title }))
    .filter(x => x.u);
  const site = { header: grab('header.header--global'), footer: grab('footer.footer--global') };

  window.CRAWL = { crawled: new Date().toISOString(), pages: Object.values(pages), out, site };
  if (typeof copy === 'function') copy(JSON.stringify(window.CRAWL));
  console.log(`Done: ${window.CRAWL.pages.length} pages. Raw JSON copied to clipboard and saved on window.CRAWL.`);
})();
