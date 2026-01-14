
const API_KEY = '581144cc'; // <-- REPLACE with your key
const BASE_URL = 'https://www.omdbapi.com/'; // OMDb base URL. :contentReference[oaicite:5]{index=5}

/* DOM */
const qInput = document.getElementById('query');
const typeSelect = document.getElementById('type');
const yearInput = document.getElementById('year');
const searchBtn = document.getElementById('searchBtn');
const resultsEl = document.getElementById('results');
const statusEl = document.getElementById('status');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageInfo = document.getElementById('pageInfo');

let currentPage = 1;
let totalPages = 0;
let lastQuery = '';

/* helper: build URL */
function buildUrl(params = {}) {
  const url = new URL(BASE_URL);
  url.searchParams.set('apikey', API_KEY);
  Object.keys(params).forEach(k => {
    if (params[k] !== '' && params[k] != null) url.searchParams.set(k, params[k]);
  });
  return url.toString();
}

/* debounce helper to avoid too many requests while typing */
function debounce(fn, wait = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

/* show loading */
function setLoading(loading=true) {
  if (loading) {
    statusEl.innerHTML = `<span class="loading">Searching…</span>`;
  } else {
    statusEl.textContent = '';
  }
}

/* render empty / error */
function showMessage(msg, isError=false) {
  resultsEl.innerHTML = `<div class="${isError ? 'err' : 'muted'}">${msg}</div>`;
  pageInfo.textContent = `Page 0 of 0`;
  prevBtn.disabled = nextBtn.disabled = true;
}

/* render result cards */
function renderResults(list) {
  if (!Array.isArray(list) || list.length === 0) {
    showMessage('No results found.');
    return;
  }
  resultsEl.innerHTML = '';
  list.forEach(item => {
    const el = document.createElement('article');
    el.className = 'card-item';
    // poster fallback
    const poster = (item.Poster && item.Poster !== 'N/A') ? item.Poster : '';
    const img = document.createElement('img');
    img.className = 'poster';
    img.alt = `${item.Title} poster`;
    img.src = poster || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="%230a0a0a"/><text x="50%" y="50%" font-size="18" fill="%239aa4b2" alignment-baseline="middle" text-anchor="middle">No Poster</text></svg>';
    el.appendChild(img);
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = item.Title;
    el.appendChild(title);
    const subtitle = document.createElement('div');
    subtitle.className = 'subtitle';
    subtitle.textContent = `${item.Year} • ${item.Type}`;
    el.appendChild(subtitle);

    // optional: clicking opens IMDb page (if imdbID present)
    if (item.imdbID) {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => {
        window.open(`https://www.imdb.com/title/${item.imdbID}/`, '_blank');
      });
    }

    resultsEl.appendChild(el);
  });
}

/* perform search using OMDb 's' endpoint (search) */
async function searchMovies(query, options = {}) {
  if (!query || query.trim().length < 1) {
    showMessage('Please enter a movie title to search.');
    return;
  }

  const page = options.page || 1;
  setLoading(true);
  try {
    const params = { s: query.trim(), page: page };
    if (options.type) params.type = options.type;
    if (options.year) params.y = options.year;
    const url = buildUrl(params);

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Network error: ${res.status}`);
    const data = await res.json();

    // OMDb returns { Response: "False", Error: "Movie not found!" } when no results
    if (data.Response === 'False') {
      showMessage(data.Error || 'No results found.');
      setLoading(false);
      return;
    }

    // data.Search is an array and data.totalResults is string number
    const list = data.Search || [];
    const totalResults = parseInt(data.totalResults || (list.length), 10);
    totalPages = Math.ceil(totalResults / 10);

    renderResults(list);
    pageInfo.textContent = `Page ${page} of ${totalPages}`;
    prevBtn.disabled = page <= 1;
    nextBtn.disabled = page >= totalPages;

    currentPage = page;
    lastQuery = query;
    setLoading(false);
  } catch (err) {
    console.error(err);
    showMessage('Request failed. Check console for details.', true);
    setLoading(false);
  }
}

/* wire up UI */
const doSearch = debounce(() => {
  currentPage = 1;
  const q = qInput.value;
  const t = typeSelect.value;
  const y = yearInput.value;
  searchMovies(q, { page: 1, type: t || undefined, year: y || undefined });
}, 350);

qInput.addEventListener('input', doSearch);
typeSelect.addEventListener('change', doSearch);
yearInput.addEventListener('input', doSearch);

searchBtn.addEventListener('click', (e) => {
  e.preventDefault();
  doSearch();
});

prevBtn.addEventListener('click', () => {
  if (currentPage > 1) {
    const q = lastQuery;
    const t = typeSelect.value;
    const y = yearInput.value;
    searchMovies(q, { page: currentPage - 1, type: t || undefined, year: y || undefined });
  }
});

nextBtn.addEventListener('click', () => {
  if (currentPage < totalPages) {
    const q = lastQuery;
    const t = typeSelect.value;
    const y = yearInput.value;
    searchMovies(q, { page: currentPage + 1, type: t || undefined, year: y || undefined });
  }
});

/* initial hint */
showMessage('Enter a title and press Search (or type to search).');
