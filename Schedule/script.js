document.addEventListener("DOMContentLoaded", function() {
    console.log("--- Buffstreams Schedule Script Started ---");

    // --- CONFIGURATION ---
    const CONFIG = {
        apiPrimary: 'https://streamed.pk/api',
        apiBackup: 'https://topembed.pw/api.php?format=json',
        proxyUrl: 'https://corsproxy.io/?', 
        primaryTimeout: 4000,
        // Durations used to determine if a match is finished
        sportDurations: {
            'football': 150, 'basketball': 165, 'american-football': 210, 
            'baseball': 210, 'hockey': 160, 'fight': 300, 'motor-sports': 180, 
            'tennis': 240, 'cricket': 480, 'golf': 480, 'rugby': 130, 
            'darts': 180, 'other': 180
        }
    };

    // --- STATE ---
    let allMatches = []; 
    let currentFilters = { live: false, popular: false, sport: 'all' };

    // --- DOM ELEMENTS ---
    const elements = {
        header: document.querySelector(".main-header"),
        filterBar: document.getElementById("filter-bar"),
        matchesContainer: document.getElementById("matches-container"),
        msgContainer: document.getElementById("message-container"),
        categoryTitle: document.getElementById("category-title"),
        categorySelect: document.getElementById("category-select"),
        filterToggleBtn: document.getElementById("filter-toggle"),
        activeFilters: document.getElementById("active-filters-container"),
        skeletonLoader: document.getElementById("skeleton-loader"),
        
        // Finished Matches Section
        finishedSection: document.getElementById("finished-matches-section"),
        finishedContainer: document.getElementById("finished-container"),
        toggleFinishedBtn: document.getElementById("toggle-finished-btn"),
        finishedBtnText: document.getElementById("finished-btn-text")
    };

    if (!elements.matchesContainer) return;

    // --- UTILITY ---
    const formatViewers = (num) => {
        if (!num) return '';
        if (num >= 1000) {
            return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
        }
        return num;
    };

    const normalizeCategory = (cat) => {
        if (!cat) return 'other';
        cat = cat.toLowerCase().trim();
        if (cat === 'soccer') return 'football';
        if (cat === 'nfl' || cat === 'cfb' || cat === 'american football') return 'american-football';
        if (cat === 'nba' || cat === 'ncaab') return 'basketball';
        if (cat === 'mlb') return 'baseball';
        if (cat === 'nhl' || cat === 'ice hockey') return 'hockey';
        if (cat === 'f1' || cat === 'nascar' || cat === 'motorsport') return 'motor-sports';
        if (cat === 'boxing' || cat === 'mma' || cat === 'ufc') return 'fight';
        return cat;
    };

    const getMatchFingerprint = (category, title) => {
        let s = (title || "").toLowerCase();
        s = s.replace(/\s+v\s+/g, ' vs ').replace(/\s+vs\.?\s+/g, ' vs '); 
        return normalizeCategory(category) + "_" + s.replace(/[^a-z0-9]/g, ''); 
    };

    const generateBackupId = (event) => {
        // Normalize match title for ID consistency
        const safeMatch = (event.match || event.event || "").toLowerCase().replace(/[^a-z0-9]/g, '');
        const safeSport = (event.sport || "").toLowerCase().trim();
        const unix = event.unix_timestamp;
        const uniqueString = `${unix}_${safeSport}_${safeMatch}`;
        return btoa(unescape(encodeURIComponent(uniqueString)));
    };

    // --- API 1: PRIMARY (With Filter) ---
    function buildPrimaryPosterUrl(match) {
        if (match.teams?.home?.badge && match.teams?.away?.badge) {
            return `${CONFIG.apiPrimary}/images/poster/${match.teams.home.badge}/${match.teams.away.badge}.webp`;
        }
        if (match.poster) {
            const p = String(match.poster || "").trim();
            if (p.startsWith("http")) return p;
            if (p.startsWith("/")) return `https://streamed.pk${p.endsWith(".webp")?p:p+".webp"}`;
            return `${CONFIG.apiPrimary}/images/proxy/${p}.webp`;
        }
        return "../Fallbackimage.webp";
    }

    async function fetchPrimaryAPI() {
        try {
            const allRes = await fetch(`${CONFIG.apiPrimary}/matches/all`);
            if(!allRes.ok) throw new Error(`Primary Match API Error: ${allRes.status}`);
            
            const allData = await allRes.json();
            const nowSec = Date.now() / 1000;

            return allData.map(m => {
                return {
                    id: m.id,
                    title: m.title,
                    date: m.date, 
                    category: normalizeCategory(m.category),
                    isLive: false,
                    popular: m.popular || false,
                    viewers: m.viewers || 0,
                    sources: m.sources || [],
                    posterUrl: buildPrimaryPosterUrl(m),
                    source: 'primary'
                };
            }).filter(m => {
                // FILTERING LOGIC FOR PRIMARY API
                
                // 1. If it has live viewers, KEEP IT (regardless of time)
                if (m.viewers > 0) return true;

                const durationMins = CONFIG.sportDurations[m.category] || 180;
                const matchStartSec = m.date / 1000;
                const diffMinutes = (nowSec - matchStartSec) / 60;

                // 2. If it looks like a 24/7 stream (started > 24 hours ago), KEEP IT
                if (diffMinutes > 1440) return true;

                // 3. If time passed is greater than duration + 30 mins buffer, REMOVE IT
                if (diffMinutes > (durationMins + 30)) {
                    return false; 
                }

                // Otherwise (Upcoming or currently playing within time limits), KEEP IT
                return true;
            });

        } catch (e) {
            throw e;
        }
    }

    // --- API 2: BACKUP (With strict 30min cleanup) ---
    async function fetchBackupAPI() {
        try {
            const url = CONFIG.proxyUrl + encodeURIComponent(CONFIG.apiBackup);
            const res = await fetch(url);
            if(!res.ok) throw new Error(`Backup API Error: ${res.status}`);
            
            const data = await res.json();
            const backupMatches = [];
            const nowSec = Date.now() / 1000;

            if (data && data.events) {
                for (const dateStr in data.events) {
                    const rawEvents = data.events[dateStr];
                    const eventsList = Array.isArray(rawEvents) ? rawEvents : [rawEvents];
                    
                    eventsList.forEach(event => {
                        if(!event.sport || !event.match || !event.unix_timestamp) return;

                        const sportKey = normalizeCategory(event.sport);
                        const unix = parseInt(event.unix_timestamp);
                        const durationMins = CONFIG.sportDurations[sportKey] || 180;
                        const diffMinutes = (nowSec - unix) / 60;
                        
                        // STRICT RULE: Remove if ended > 30 mins ago (From Backup API Only)
                        if (diffMinutes > (durationMins + 30)) {
                            return; 
                        }

                        const isLive = (diffMinutes >= 0 && diffMinutes < durationMins);
                        
                        backupMatches.push({
                            id: generateBackupId(event),
                            title: (event.match || event.event || "Unknown").replace(/ vs /i, ' v '),
                            date: unix * 1000, 
                            category: sportKey,
                            isLive: isLive,
                            popular: false,
                            viewers: 0, 
                            sources: [],
                            posterUrl: "../Fallbackimage.webp",
                            source: 'backup'
                        });
                    });
                }
            }
            return backupMatches;
        } catch (e) {
            console.error("Backup API Failed:", e);
            return [];
        }
    }

    // --- VIEWER FETCH TECHNIQUE ---
    async function fetchAndUpdateViewers() {
        const now = Date.now();
        const liveMatchesForApiCall = allMatches.filter(match => {
            if (match.source !== 'primary' || !match.sources || match.sources.length === 0) return false;
            return match.date <= now; 
        });

        if (liveMatchesForApiCall.length === 0) return;

        console.log(`Checking viewers for ${liveMatchesForApiCall.length} potential live matches...`);

        const streamFetchPromises = liveMatchesForApiCall.flatMap(match =>
            match.sources.map(source =>
                fetch(`${CONFIG.apiPrimary}/stream/${source.source}/${source.id}`)
                .then(res => res.ok ? res.json() : [])
                .then(streams => ({ matchId: match.id, streams }))
                .catch(() => ({ matchId: match.id, streams: [] }))
            )
        );

        const results = await Promise.allSettled(streamFetchPromises);
        const viewerCounts = {};

        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
                const { matchId, streams } = result.value;
                if (!viewerCounts[matchId]) viewerCounts[matchId] = 0;
                if (Array.isArray(streams)) {
                    streams.forEach(stream => {
                        if (stream.viewers && typeof stream.viewers === 'number') {
                            viewerCounts[matchId] += stream.viewers;
                        }
                    });
                }
            }
        });

        let needsRerender = false;
        Object.keys(viewerCounts).forEach(matchId => {
            const totalViewers = viewerCounts[matchId];
            if (totalViewers > 0) {
                const matchInArray = allMatches.find(m => m.id == matchId);
                if (matchInArray && matchInArray.viewers !== totalViewers) {
                    matchInArray.viewers = totalViewers;
                    matchInArray.isLive = true; 
                    needsRerender = true;
                }
            }
        });

        if (needsRerender) {
            renderMatches();
        }
    }

    // --- LOAD & MERGE ---
    async function loadMatches() {
        if(elements.matchesContainer) elements.matchesContainer.innerHTML = '';
        if(elements.finishedContainer) elements.finishedContainer.innerHTML = '';
        if(elements.skeletonLoader) elements.skeletonLoader.style.display = 'block';

        const backupPromise = fetchBackupAPI();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Primary API Timeout")), CONFIG.primaryTimeout)
        );

        let primaryMatches = [];
        try {
            primaryMatches = await Promise.race([fetchPrimaryAPI(), timeoutPromise]);
        } catch (error) {
            console.warn("Skipping Primary API:", error.message);
            primaryMatches = []; 
        }

        const backupMatches = await backupPromise;
        
        // Merge
        const merged = [...primaryMatches];
        backupMatches.forEach(bm => {
            const fp = getMatchFingerprint(bm.category, bm.title);
            const isDuplicate = primaryMatches.some(pm => {
                const titleMatch = getMatchFingerprint(pm.category, pm.title) === fp;
                const timeDiff = Math.abs(pm.date - bm.date);
                return titleMatch && timeDiff < 7200000; 
            });
            if (!isDuplicate) merged.push(bm);
        });

        allMatches = merged;
        populateCategoryDropdown();
        handleURLParams(); // Initial Render
        
        fetchAndUpdateViewers();
    }

    function populateCategoryDropdown() {
        const sports = new Set(['all']);
        allMatches.forEach(m => sports.add(m.category));
        
        const priorities = ['football', 'basketball', 'american-football', 'fight', 'motor-sports', 'baseball', 'hockey'];
        const sortedSports = [...sports].sort((a, b) => {
            if(a === 'all') return -1;
            if(b === 'all') return 1;
            const idxA = priorities.indexOf(a);
            const idxB = priorities.indexOf(b);
            if(idxA !== -1 && idxB !== -1) return idxA - idxB;
            if(idxA !== -1) return -1;
            if(idxB !== -1) return 1;
            return a.localeCompare(b);
        });

        if(elements.categorySelect) {
            elements.categorySelect.innerHTML = sortedSports.map(s => 
                `<option value="${s}">${s === 'all' ? 'All Sports' : s.replace(/-/g, ' ').toUpperCase()}</option>`
            ).join('');
            elements.categorySelect.value = currentFilters.sport;
        }
    }

    function createMatchCard(match) {
        const card = document.createElement('a');
        card.href = `../Matchinformation/?id=${match.id}`;
        card.className = 'match-card';
        
        const img = document.createElement('img');
        img.className = 'match-poster';
        img.loading = "lazy";
        img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"; 
        img.dataset.src = match.posterUrl;
        img.alt = match.title;
        img.onerror = function() { this.src = "../Fallbackimage.webp"; };
        
        const now = Date.now();
        const start = match.date;
        const durationMins = CONFIG.sportDurations[match.category] || 180;
        const end = start + (durationMins * 60 * 1000);
        
        const startOfToday = new Date();
        startOfToday.setHours(0,0,0,0);
        const is247 = match.date < startOfToday.getTime();

        let isActuallyLive = match.isLive || (now >= start && now <= end) || (match.viewers > 0);
        let isFinished = (now > end) && !is247 && !isActuallyLive;

        const dateObj = new Date(match.date);
        const timeStr = dateObj.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit', hour12: true});
        const dateStr = dateObj.toLocaleDateString();

        const badgeDiv = document.createElement('div');
        
        if (match.viewers > 0) {
            badgeDiv.className = 'status-badge viewer-badge';
            badgeDiv.innerHTML = `<span>${formatViewers(match.viewers)}</span>
            <svg class="viewer-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"></path>
            </svg>`;
        }
        else if (isActuallyLive || is247) {
            badgeDiv.className = 'status-badge live';
            badgeDiv.innerHTML = `<span>LIVE</span>`;
        } 
        else if (isFinished) {
            badgeDiv.className = 'status-badge finished';
            badgeDiv.innerHTML = `<span>FINISHED</span>`;
        } 
        else {
            badgeDiv.className = 'status-badge date';
            badgeDiv.textContent = timeStr;
        }

        card.appendChild(badgeDiv);

        if (match.popular && match.source === 'primary') {
            const popBadge = document.createElement('div');
            popBadge.className = 'popular-badge';
            popBadge.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.83 2.33C12.5 1.5 11.5 1.5 11.17 2.33L9.45 7.1C9.33 7.44 9.04 7.7 8.69 7.78L3.65 8.63C2.8 8.75 2.47 9.71 3.06 10.27L6.92 13.9C7.17 14.14 7.28 14.49 7.2 14.85L6.15 19.81C5.97 20.66 6.77 21.3 7.55 20.89L11.79 18.53C12.11 18.35 12.49 18.35 12.81 18.53L17.05 20.89C17.83 21.3 18.63 20.66 18.45 19.81L17.4 14.85C17.32 14.49 17.43 14.14 17.68 13.9L21.54 10.27C22.13 9.71 21.8 8.75 20.95 8.63L15.91 7.78C15.56 7.7 15.27 7.44 15.15 7.1L13.43 2.33Z"/></svg>`;
            card.appendChild(popBadge);
        }
        
        card.appendChild(img);

        const infoDiv = document.createElement('div');
        infoDiv.className = 'match-info';
        
        let bottomMetaText;
        if (is247) bottomMetaText = "24/7 Stream";
        else if (match.viewers > 0 || isActuallyLive) bottomMetaText = `Started: ${timeStr}`;
        else if (isFinished) bottomMetaText = `Started: ${timeStr}`;
        else bottomMetaText = dateStr;

        infoDiv.innerHTML = `
            <div class="match-title">${match.title}</div>
            <div class="match-meta-row">
                <span class="match-category">${match.category}</span>
                <span>${bottomMetaText}</span>
            </div>
        `;
        card.appendChild(infoDiv);
        return card;
    }

    function renderMatches() {
        if(!elements.matchesContainer) return;
        elements.matchesContainer.innerHTML = '';
        if(elements.finishedContainer) elements.finishedContainer.innerHTML = '';
        if(elements.skeletonLoader) elements.skeletonLoader.style.display = 'none';

        const now = Date.now();
        const todayDateObj = new Date();
        todayDateObj.setHours(0,0,0,0);
        const startOfToday = todayDateObj.getTime();

        // 1. FILTER
        let filtered = allMatches.filter(m => {
            if (currentFilters.sport !== 'all' && m.category !== currentFilters.sport) return false;
            
            const durationMins = CONFIG.sportDurations[m.category] || 180;
            const end = m.date + (durationMins * 60 * 1000);
            const is247 = m.date < startOfToday;
            const isLive = (m.viewers > 0) || (m.isLive) || (now >= m.date && now <= end);

            // "Finished" Definition: Time passed, not 24/7, not live
            m.isRefFinished = (now > end) && !is247 && !isLive;

            // If user explicitly wants only "LIVE" matches, hide finished
            if (currentFilters.live && !isLive) return false;
            
            if (currentFilters.popular && !m.popular) return false;
            return true;
        });

        // 2. SEPARATION LOGIC
        let finishedMatches = filtered.filter(m => m.isRefFinished);
        let activeMatches = filtered.filter(m => !m.isRefFinished);

        // 3. EMPTY STATE CHECK (Active Matches Only)
        if (activeMatches.length === 0) {
            elements.msgContainer.style.display = 'block';
            elements.msgContainer.textContent = "No live or upcoming matches found.";
        } else {
            elements.msgContainer.style.display = 'none';
        }

        // 4. SORTING
        finishedMatches.sort((a, b) => {
            const dateDiff = b.date - a.date;
            if (dateDiff !== 0) return dateDiff;
            return a.title.localeCompare(b.title);
        });

        liveRanked = activeMatches.filter(m => m.viewers > 0);
        let others = activeMatches.filter(m => !m.viewers || m.viewers === 0);
        let stream247 = others.filter(m => m.date < startOfToday);
        let standardSchedule = others.filter(m => m.date >= startOfToday);

        liveRanked.sort((a, b) => {
            const vDiff = b.viewers - a.viewers;
            if (vDiff !== 0) return vDiff;
            return b.date - a.date; 
        });
        stream247.sort((a, b) => b.date - a.date);
        standardSchedule.sort((a, b) => a.date - b.date);

        // 5. RENDERING MAIN CONTENT (Active Matches)
        const fragment = document.createDocumentFragment();

        if (liveRanked.length > 0) {
            const section = document.createElement('div');
            section.className = 'date-section';
            section.innerHTML = `<h2 class="section-header">LIVE NOW</h2>`;
            const grid = document.createElement('div');
            grid.className = 'results-grid';
            liveRanked.forEach(m => grid.appendChild(createMatchCard(m)));
            section.appendChild(grid);
            fragment.appendChild(section);
        }

        if (standardSchedule.length > 0) {
            const uniqueKeys = [];
            const todayStr = todayDateObj.toDateString();

            standardSchedule.forEach(m => {
                const d = new Date(m.date);
                let key;
                if (d.toDateString() === todayStr) key = "TODAY";
                else key = d.toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'});
                if(!uniqueKeys.includes(key)) uniqueKeys.push(key);
            });

            uniqueKeys.forEach(key => {
                const section = document.createElement('div');
                section.className = 'date-section';
                section.innerHTML = `<h2 class="section-header">${key}</h2>`;
                const grid = document.createElement('div');
                grid.className = 'results-grid';
                
                const ms = standardSchedule.filter(m => {
                    const d = new Date(m.date);
                    let k;
                    if (d.toDateString() === todayStr) k = "TODAY";
                    else k = d.toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'});
                    return k === key;
                });

                ms.forEach(m => grid.appendChild(createMatchCard(m)));
                section.appendChild(grid);
                fragment.appendChild(section);
            });
        }

        if (stream247.length > 0) {
            const section = document.createElement('div');
            section.className = 'date-section';
            section.innerHTML = `<h2 class="section-header">24/7 Live Streams</h2>`;
            const grid = document.createElement('div');
            grid.className = 'results-grid';
            stream247.forEach(m => grid.appendChild(createMatchCard(m)));
            section.appendChild(grid);
            fragment.appendChild(section);
        }

        elements.matchesContainer.appendChild(fragment);

        // 6. RENDERING FINISHED SECTION (Always Visible Button logic)
        // Force display block for the container wrapper
        elements.finishedSection.style.display = 'block'; 
        
        // Create the "Finished" header structure
        const finishedSectionDiv = document.createElement('div');
        finishedSectionDiv.className = 'date-section';
        finishedSectionDiv.innerHTML = `<h2 class="section-header">Finished</h2>`;

        if (finishedMatches.length > 0) {
            const grid = document.createElement('div');
            grid.className = 'results-grid';
            finishedMatches.forEach(m => grid.appendChild(createMatchCard(m)));
            finishedSectionDiv.appendChild(grid);
        } else {
            // No finished matches available text
            const msg = document.createElement('div');
            msg.className = 'no-finished-msg';
            msg.textContent = "No recently finished match available.";
            finishedSectionDiv.appendChild(msg);
        }
        
        elements.finishedContainer.appendChild(finishedSectionDiv);

        // Lazy Load
        const observer = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if(e.isIntersecting) {
                    const img = e.target;
                    if(img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        observer.unobserve(img);
                    }
                }
            });
        });
        const allImages = document.querySelectorAll('img.match-poster');
        allImages.forEach(img => observer.observe(img));
        
        const sportName = currentFilters.sport === 'all' ? 'All Sports' : currentFilters.sport.toUpperCase();
        if(elements.categoryTitle) elements.categoryTitle.textContent = `${sportName} SCHEDULE`;
    }

    // --- FINISHED TOGGLE LOGIC ---
    if(elements.toggleFinishedBtn) {
        elements.toggleFinishedBtn.addEventListener('click', () => {
            const isHidden = elements.finishedContainer.style.display === 'none';
            elements.finishedContainer.style.display = isHidden ? 'block' : 'none';
            elements.toggleFinishedBtn.classList.toggle('active', isHidden);
            elements.finishedBtnText.textContent = isHidden ? "Hide Finished Matches" : "Check Finished Matches";
        });
    }

    // --- EVENTS ---
    window.addEventListener("scroll", () => {
        if(elements.header) elements.header.classList.toggle("sticky", window.scrollY > 100);
    }, { passive: true });

    function handleURLParams() {
        const params = new URLSearchParams(window.location.search);
        currentFilters.sport = params.get('sport') || 'all';
        currentFilters.live = params.get('live') === 'true';
        currentFilters.popular = params.get('popular') === 'true';
        
        if(elements.categorySelect) elements.categorySelect.value = currentFilters.sport;
        const liveBtn = document.querySelector('[data-filter="live"]');
        const popBtn = document.querySelector('[data-filter="popular"]');
        if(liveBtn) liveBtn.classList.toggle('active', currentFilters.live);
        if(popBtn) popBtn.classList.toggle('active', currentFilters.popular);
        
        updateActiveFilters();
        renderMatches();
    }

    function updateURL() {
        const params = new URLSearchParams();
        if(currentFilters.sport !== 'all') params.set('sport', currentFilters.sport);
        if(currentFilters.live) params.set('live', 'true');
        if(currentFilters.popular) params.set('popular', 'true');
        
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        history.replaceState(null, '', newUrl); 
        renderMatches();
        updateActiveFilters();
    }

    function updateActiveFilters() {
        if(!elements.activeFilters) return;
        elements.activeFilters.innerHTML = '';
        const addTag = (label, type) => {
            const tag = document.createElement('div');
            tag.className = 'active-filter-tag';
            tag.innerHTML = `<span>${label}</span><button class="remove-filter-btn">&times;</button>`;
            tag.querySelector('button').onclick = () => {
                if(type === 'sport') currentFilters.sport = 'all';
                else currentFilters[type] = false;
                if(elements.categorySelect) elements.categorySelect.value = currentFilters.sport;
                document.querySelector(`[data-filter="${type}"]`)?.classList.remove('active');
                updateURL();
            };
            elements.activeFilters.appendChild(tag);
        };
        if(currentFilters.live) addTag('Live', 'live');
        if(currentFilters.popular) addTag('Popular', 'popular');
    }

    if(elements.categorySelect) {
        elements.categorySelect.addEventListener('change', (e) => {
            currentFilters.sport = e.target.value;
            updateURL();
        });
    }

    if(elements.filterToggleBtn) {
        elements.filterToggleBtn.addEventListener('click', () => {
            elements.filterBar.classList.toggle('is-expanded');
        });
    }

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const type = e.target.dataset.filter;
            currentFilters[type] = !currentFilters[type];
            e.target.classList.toggle('active');
            updateURL();
        });
    });

    window.addEventListener('popstate', handleURLParams);

    // Initial Load
    loadMatches();
});