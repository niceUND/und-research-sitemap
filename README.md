# UND Research Site Map

An interactive, collapsible map of every page under [und.edu/research](https://und.edu/research/index.html): 132 pages, nested by URL folder. Each page shows its URL, a one-sentence summary, its last-updated date, any redirect, and the links that leave /research.

Open `index.html` in a browser, or enable GitHub Pages for this repo.

## What's here

| Path | Contents |
|---|---|
| `index.html` | The D3 map. Standalone, with the data built in. |
| `data/sitemap.json` | Crawl data: page tree, summaries, dates, redirects, outbound links and sitewide links. |
| `src/template.html` | The page without its data. |
| `scripts/build_page.py` | Rebuilds `index.html` from the template and the data. |
| `scripts/crawl.js` | The in-browser crawler used to collect the raw data. |

## How the data was gathered (crawled Sept. 24, 2026)

- `scripts/crawl.js` was run in a browser on und.edu. It follows every link under /research and records each page's status, final URL, `dc.date.modified` (the date the CMS last published it), meta description and content links.
- Summaries were written by hand from each page's description and body text.
- Sitewide header, footer, login and social links are listed once, not per page.
- Links to other domains, including other *.und.edu subdomains, could not be checked for redirects from the browser. They are marked "not checked."

## Updating

Edit `data/sitemap.json` (for example, a summary), then regenerate the page:

```sh
python3 scripts/build_page.py
```

## Findings at time of crawl

- 1 redirecting page: `/research/behavioral-health/` redirects to the Research home page.
- 28 pages not updated in over 2 years.
- 3 broken staff-directory links, on Events & Site Visits, Contact Us (Grants & Funding) and Policy Updates.

Built with [D3.js](https://d3js.org) v7. Created with Claude (Anthropic) in Cowork.
