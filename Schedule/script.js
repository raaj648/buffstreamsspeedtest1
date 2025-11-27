document.addEventListener("DOMContentLoaded", function() {
    console.log("--- Buffstreams Schedule Script Started ---");

    // --- 1. AFFILIATE & GEO CONFIGURATION ---
    const GEO_OFFERS = {
        'US': { img: 'YOUR_USA_IMAGE_URL_HERE.jpg', link: 'YOUR_USA_AFFILIATE_LINK_HERE', cta: 'Claim $500 Bonus', label: 'EXCLUSIVE' },
        'GB': { img: 'YOUR_UK_IMAGE_URL_HERE.jpg', link: 'YOUR_UK_AFFILIATE_LINK_HERE', cta: 'Bet £10 Get £30', label: 'UK SPECIAL' },
        'CA': { img: 'YOUR_CANADA_IMAGE_URL_HERE.jpg', link: 'YOUR_CANADA_AFFILIATE_LINK_HERE', cta: 'Get $200 Free Bet', label: 'BONUS' },
        'GR': { img: 'YOUR_CANADA_IMAGE_URL_HERE.jpg', link: 'YOUR_GREECE_AFFILIATE_LINK_HERE', cta: 'Claim Bonus Now', label: 'OFFER' },
        'default': { img: '../test.jpg', link: 'YOUR_GLOBAL_AFFILIATE_LINK_HERE', cta: 'Join & Win Big', label: 'SPONSORED' }
    };
    const FALLBACK_OFFER = { img: 'YOUR_FALLBACK_IMAGE_URL_HERE.jpg', link: 'YOUR_FALLBACK_AFFILIATE_LINK_HERE', cta: 'Play Now', label: 'PROMO' };

    let currentAffiliateOffer = GEO_OFFERS['default'];
    
    // --- 2. GEO-DETECTION ---
    async function initGeoLogic() {
        let detectedCountry = null;
        try {
            const res = await fetch('https://get.geojs.io/v1/ip/country.json?_=' + new Date().getTime());
            if (!res.ok) throw new Error('GeoJS failed');
            const data = await res.json();
            if (data.country) detectedCountry = data.country.toUpperCase();
        } catch (e1) {
            try {
                const res2 = await fetch('https://api.country.is');
                if (!res2.ok) throw new Error('Country.is failed');
                const data2 = await res2.json();
                if (data2.country) detectedCountry = data2.country.toUpperCase();
            } catch (e2) {
                currentAffiliateOffer = FALLBACK_OFFER;
                return;
            }
        }

        if (detectedCountry && GEO_OFFERS.hasOwnProperty(detectedCountry)) {
            currentAffiliateOffer = GEO_OFFERS[detectedCountry];
        } else {
            currentAffiliateOffer = GEO_OFFERS['default'];
        }
        
        // Only re-render if we already have matches and the first render happened
        if(allMatches.length > 0) {
            // We just update the affiliate cards in place to avoid full reflow
            document.querySelectorAll('.match-card.affiliate-card').forEach(card => {
                const newCard = createAffiliateCard();
                card.replaceWith(newCard);
            });
        }
    }
    initGeoLogic();

    // --- 4. CORE SCHEDULE LOGIC ---
    const CONFIG = {
        apiPrimary: 'https://streamed.pk/api',
        apiBackup: 'https://topembed.pw/api.php?format=json',
        proxyUrl: 'https://corsproxy.io/?', 
        primaryTimeout: 4000,
        sportDurations: {
            'football': 150, 'basketball': 165, 'american-football': 210, 
            'baseball': 210, 'hockey': 160, 'fight': 300, 'motor-sports': 180, 
            'tennis': 240, 'cricket': 480, 'golf': 480, 'rugby': 130, 
            'darts': 180, 'other': 180
        }
    };

    let allMatches = []; 
    let currentFilters = { live: false, popular: false, sport: 'all' };

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
        finishedSection: document.getElementById("finished-matches-section"),
        finishedContainer: document.getElementById("finished-container"),
        toggleFinishedBtn: document.getElementById("toggle-finished-btn"),
        finishedBtnText: document.getElementById("finished-btn-text")
    };

    if (!elements.matchesContainer) return;

    // Utility Functions
    const formatViewers = (num) => {
        if (!num) return '';
        if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
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
        const safeMatch = (event.match || event.event || "").toLowerCase().replace(/[^a-z0-9]/g, '');
        const safeSport = (event.sport || "").toLowerCase().trim();
        const unix = event.unix_timestamp;
        return btoa(unescape(encodeURIComponent(`${unix}_${safeSport}_${safeMatch}`)));
    };

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

    // --- API Fetching ---
    async function fetchPrimaryAPI() {
        try {
            const allRes = await fetch(`${CONFIG.apiPrimary}/matches/all`);
            if(!allRes.ok) throw new Error(`Primary API Error`);
            const allData = await allRes.json();
            const nowSec = Date.now() / 1000;

            return allData.map(m => {
                return {
                    id: m.id, title: m.title, date: m.date, category: normalizeCategory(m.category),
                    isLive: false, popular: m.popular || false, viewers: m.viewers || 0,
                    sources: m.sources || [], posterUrl: buildPrimaryPosterUrl(m), source: 'primary'
                };
            }).filter(m => {
                const durationMins = CONFIG.sportDurations[m.category] || 180;
                const diffMinutes = (nowSec - (m.date / 1000)) / 60;
                if (diffMinutes > 1440) return true;
                if (diffMinutes > (durationMins + 30) && m.viewers === 0) return false;
                return true;
            });
        } catch (e) { return []; }
    }

    async function fetchBackupAPI() {
        try {
            const url = CONFIG.proxyUrl + encodeURIComponent(CONFIG.apiBackup);
            const res = await fetch(url);
            if(!res.ok) throw new Error(`Backup API Error`);
            const data = await res.json();
            const backupMatches = [];
            const nowSec = Date.now() / 1000;

            if (data && data.events) {
                for (const dateStr in data.events) {
                    const rawEvents = Array.isArray(data.events[dateStr]) ? data.events[dateStr] : [data.events[dateStr]];
                    rawEvents.forEach(event => {
                        if(!event.sport || !event.match || !event.unix_timestamp) return;
                        const sportKey = normalizeCategory(event.sport);
                        const unix = parseInt(event.unix_timestamp);
                        const durationMins = CONFIG.sportDurations[sportKey] || 180;
                        const diffMinutes = (nowSec - unix) / 60;
                        
                        if (diffMinutes > (durationMins + 30)) return; 
                        
                        backupMatches.push({
                            id: generateBackupId(event),
                            title: (event.match || event.event || "Unknown").replace(/ vs /i, ' v '),
                            date: unix * 1000, category: sportKey, isLive: (diffMinutes >= 0 && diffMinutes < durationMins),
                            popular: false, viewers: 0, sources: [], posterUrl: "../Fallbackimage.webp", source: 'backup'
                        });
                    });
                }
            }
            return backupMatches;
        } catch (e) { return []; }
    }

    // SPEED FIX: Delayed & Throttled Viewer Check
    // We delay this function to run ONLY after the main paint is done.
    async function fetchAndUpdateViewers() {
        const now = Date.now();
        const liveMatchesForApiCall = allMatches.filter(match => {
            if (match.source !== 'primary' || !match.sources || match.sources.length === 0) return false;
            return match.date <= now; 
        });

        if (liveMatchesForApiCall.length === 0) return;

        // Process only 5 matches at a time to save network
        const processBatch = async (batch) => {
             const streamFetchPromises = batch.flatMap(match =>
                match.sources.map(source =>
                    fetch(`${CONFIG.apiPrimary}/stream/${source.source}/${source.id}`)
                    .then(res => res.ok ? res.json() : [])
                    .then(streams => ({ matchId: match.id, streams }))
                    .catch(() => ({ matchId: match.id, streams: [] }))
                )
            );
            
            const results = await Promise.allSettled(streamFetchPromises);
            let needsRerender = false;
            
            results.forEach(result => {
                if (result.status === 'fulfilled' && result.value) {
                    const { matchId, streams } = result.value;
                    let totalViewers = 0;
                    if (Array.isArray(streams)) {
                        streams.forEach(stream => {
                            if (stream.viewers) totalViewers += stream.viewers;
                        });
                    }
                    if (totalViewers > 0) {
                        const matchInArray = allMatches.find(m => m.id == matchId);
                        if (matchInArray && matchInArray.viewers !== totalViewers) {
                            matchInArray.viewers = totalViewers;
                            matchInArray.isLive = true; 
                            needsRerender = true;
                        }
                    }
                }
            });

            if (needsRerender) {
                // We only re-render if we found viewers to update UI
                // We use requestAnimationFrame to not block
                requestAnimationFrame(() => renderMatches(true));
            }
        };

        // Split into chunks of 3 matches
        const chunkSize = 3;
        for (let i = 0; i < liveMatchesForApiCall.length; i += chunkSize) {
            const chunk = liveMatchesForApiCall.slice(i, i + chunkSize);
            await processBatch(chunk);
            // Wait 200ms between chunks to breathe
            await new Promise(r => setTimeout(r, 200));
        }
    }

    async function loadMatches() {
        if(elements.matchesContainer) elements.matchesContainer.innerHTML = '';
        if(elements.finishedContainer) elements.finishedContainer.innerHTML = '';
        if(elements.skeletonLoader) elements.skeletonLoader.style.display = 'block';

        // Fetch Primary First (Fastest)
        try {
            const primaryData = await fetchPrimaryAPI();
            allMatches = primaryData;
            
            // Initial render with just primary data to show content ASAP
            renderMatches(); 
            
            // Then fetch backup in background
            fetchBackupAPI().then(backupMatches => {
                const merged = [...allMatches];
                backupMatches.forEach(bm => {
                    const fp = getMatchFingerprint(bm.category, bm.title);
                    const isDuplicate = allMatches.some(pm => {
                        const titleMatch = getMatchFingerprint(pm.category, pm.title) === fp;
                        const timeDiff = Math.abs(pm.date - bm.date);
                        return titleMatch && timeDiff < 7200000; 
                    });
                    if (!isDuplicate) merged.push(bm);
                });
                allMatches = merged;
                populateCategoryDropdown();
                renderMatches();
                
                // SPEED FIX: Delay viewer check by 6 seconds to clear TBT
                setTimeout(fetchAndUpdateViewers, 6000);
            });
            
        } catch (error) {
            console.error(error);
        }

        populateCategoryDropdown();
        handleURLParams();
    }

    // --- CARD CREATION ---
    // Added 'index' parameter for LCP optimization
    function createMatchCard(match, index) {
        const card = document.createElement('a');
        card.href = `../Matchinformation/?id=${match.id}`;
        card.className = 'match-card';
        
        const img = document.createElement('img');
        img.className = 'match-poster';
        // SPEED FIX: Explicit width/height
        img.width = 444; 
        img.height = 250;
        
        // SPEED FIX: LCP Optimization
        // First 3 images are eager, rest are lazy
        if (index < 3) {
            img.loading = "eager";
            img.fetchPriority = "high";
            img.src = match.posterUrl; // Load immediately
        } else {
            img.loading = "lazy";
            img.decoding = "async";
            img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
            img.dataset.src = match.posterUrl;
        }

        img.alt = match.title;
        img.onerror = function() { this.src = "../Fallbackimage.webp"; };
        
        const now = Date.now();
        const start = match.date;
        const durationMins = CONFIG.sportDurations[match.category] || 180;
        const end = start + (durationMins * 60 * 1000);
        const startOfToday = new Date(); startOfToday.setHours(0,0,0,0);
        const is247 = match.date < startOfToday.getTime();

        let isActuallyLive = match.isLive || (now >= start && now <= end) || (match.viewers > 0);
        let isFinished = (now > end) && !is247 && !isActuallyLive;

        const dateObj = new Date(match.date);
        const timeStr = dateObj.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit', hour12: true});

        const badgeDiv = document.createElement('div');
        if (match.viewers > 0) {
            badgeDiv.className = 'status-badge viewer-badge';
            badgeDiv.innerHTML = `<span>${formatViewers(match.viewers)}</span><svg class="viewer-icon" width="14" height="14" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"></path></svg>`;
        } else if (isActuallyLive || is247) {
            badgeDiv.className = 'status-badge live'; badgeDiv.innerHTML = `<span>LIVE</span>`;
        } else if (isFinished) {
            badgeDiv.className = 'status-badge finished'; badgeDiv.innerHTML = `<span>FINISHED</span>`;
        } else {
            badgeDiv.className = 'status-badge date'; badgeDiv.textContent = timeStr;
        }
        card.appendChild(badgeDiv);

        if (match.popular && match.source === 'primary') {
            const popBadge = document.createElement('div');
            popBadge.className = 'popular-badge';
            popBadge.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.83 2.33C12.5 1.5 11.5 1.5 11.17 2.33L9.45 7.1C9.33 7.44 9.04 7.7 8.69 7.78L3.65 8.63C2.8 8.75 2.47 9.71 3.06 10.27L6.92 13.9C7.17 14.14 7.28 14.49 7.2 14.85L6.15 19.81C5.97 20.66 6.77 21.3 7.55 20.89L11.79 18.53C12.11 18.35 12.49 18.35 12.81 18.53L17.05 20.89C17.83 21.3 18.63 20.66 18.45 19.81L17.4 14.85C17.32 14.49 17.43 14.14 17.68 13.9L21.54 10.27C22.13 9.71 21.8 8.75 20.95 8.63L15.91 7.78C15.56 7.7 15.27 7.44 15.15 7.1L13.43 2.33Z"/></svg>`;
            card.appendChild(popBadge);
        }
        
        card.appendChild(img);
        
        let bottomMetaText;
        if (is247) bottomMetaText = "24/7 Stream";
        else if (match.viewers > 0 || isActuallyLive) bottomMetaText = `Started: ${timeStr}`;
        else if (isFinished) bottomMetaText = `Started: ${timeStr}`;
        else bottomMetaText = dateObj.toLocaleDateString();

        const infoDiv = document.createElement('div');
        infoDiv.className = 'match-info';
        infoDiv.innerHTML = `<div class="match-title">${match.title}</div><div class="match-meta-row"><span class="match-category">${match.category}</span><span>${bottomMetaText}</span></div>`;
        card.appendChild(infoDiv);
        return card;
    }

    function createAffiliateCard() {
        const card = document.createElement('a');
        card.href = currentAffiliateOffer.link;
        card.target = "_blank";
        card.rel = "nofollow noopener";
        card.className = 'match-card affiliate-card'; 
        card.ariaLabel = "Sponsored Offer";

        const img = document.createElement('img');
        img.className = 'match-poster';
        img.src = currentAffiliateOffer.img;
        img.alt = "Exclusive Bonus";
        img.width = 444; 
        img.height = 250;
        img.decoding = "async";
        // Affiliate card is always first, so eager load
        img.loading = "eager"; 
        img.fetchPriority = "high";

        const badgeDiv = document.createElement('div');
        badgeDiv.className = 'status-badge';
        badgeDiv.style.background = 'linear-gradient(90deg, #d4af37, #f2d06b)';
        badgeDiv.style.color = '#000';
        badgeDiv.innerHTML = `<span>${currentAffiliateOffer.label}</span>`;
        card.appendChild(badgeDiv);
        
        card.appendChild(img);

        const infoDiv = document.createElement('div');
        infoDiv.className = 'match-info';
        infoDiv.innerHTML = `
            <div class="match-title" style="color: #d4af37;">${currentAffiliateOffer.cta}</div>
            <div class="match-meta-row">
                <span class="match-category">BETTING</span>
                <span>Verified Offer</span>
            </div>
        `;
        card.appendChild(infoDiv);
        
        return card;
    }

    // SPEED FIX: Chunked Rendering to avoid Main Thread Blocking
    function renderMatches(isUpdate = false) {
        if(!elements.matchesContainer) return;
        
        // Prepare data
        const now = Date.now();
        const todayDateObj = new Date();
        todayDateObj.setHours(0,0,0,0);
        const startOfToday = todayDateObj.getTime();

        let filtered = allMatches.filter(m => {
            if (currentFilters.sport !== 'all' && m.category !== currentFilters.sport) return false;
            const durationMins = CONFIG.sportDurations[m.category] || 180;
            const end = m.date + (durationMins * 60 * 1000);
            const is247 = m.date < startOfToday;
            const isLive = (m.viewers > 0) || (m.isLive) || (now >= m.date && now <= end);
            m.isRefFinished = (now > end) && !is247 && !isLive;
            if (currentFilters.live && !isLive) return false;
            if (currentFilters.popular && !m.popular) return false;
            return true;
        });

        // Separation Logic
        let finishedMatches = filtered.filter(m => m.isRefFinished);
        let activeMatches = filtered.filter(m => !m.isRefFinished);

        finishedMatches.sort((a, b) => b.date - a.date || a.title.localeCompare(b.title));
        let liveRanked = activeMatches.filter(m => m.viewers > 0).sort((a, b) => b.viewers - a.viewers || b.date - a.date);
        let others = activeMatches.filter(m => !m.viewers || m.viewers === 0);
        let stream247 = others.filter(m => m.date < startOfToday).sort((a, b) => b.date - a.date);
        let standardSchedule = others.filter(m => m.date >= startOfToday).sort((a, b) => a.date - b.date);

        // Clear existing only if not a partial update (or just clear to be safe/simple)
        elements.matchesContainer.innerHTML = '';
        if(elements.finishedContainer) elements.finishedContainer.innerHTML = '';
        if(elements.skeletonLoader) elements.skeletonLoader.style.display = 'none';

        if (activeMatches.length === 0) {
            elements.msgContainer.style.display = 'block';
            elements.msgContainer.textContent = "No live or upcoming matches found.";
        } else {
            elements.msgContainer.style.display = 'none';
        }

        // --- RENDER QUEUE ---
        // We push tasks to a queue and execute them in chunks
        const renderQueue = [];

        // Helper to push section creation to queue
        const queueSection = (title, matches, isFirst = false) => {
            renderQueue.push(() => {
                const section = document.createElement('div');
                section.className = 'date-section';
                section.innerHTML = `<h2 class="section-header">${title}</h2>`;
                const grid = document.createElement('div');
                grid.className = 'results-grid';
                
                // Add Affiliate card to every section
                grid.appendChild(createAffiliateCard());

                matches.forEach((m, idx) => {
                    // Global index logic for LCP: Only the very first section's top items get priority
                    const globalIdx = isFirst ? idx : 99; 
                    grid.appendChild(createMatchCard(m, globalIdx));
                });
                
                section.appendChild(grid);
                elements.matchesContainer.appendChild(section);
            });
        };

        // 1. Live
        if (liveRanked.length > 0) queueSection("LIVE NOW", liveRanked, true);

        // 2. Upcoming
        if (standardSchedule.length > 0) {
            const grouped = {};
            const todayStr = todayDateObj.toDateString();
            standardSchedule.forEach(m => {
                const d = new Date(m.date);
                let key = (d.toDateString() === todayStr) ? "TODAY" : d.toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'});
                if(!grouped[key]) grouped[key] = [];
                grouped[key].push(m);
            });
            Object.keys(grouped).forEach((key, i) => {
                // If there were no live matches, the first upcoming section is "First"
                queueSection(key, grouped[key], liveRanked.length === 0 && i === 0);
            });
        }

        // 3. 24/7
        if (stream247.length > 0) queueSection("24/7 Live Streams", stream247, false);

        // 4. Finished (Separate container)
        if (finishedMatches.length > 0) {
             renderQueue.push(() => {
                elements.finishedSection.style.display = 'block';
                const div = document.createElement('div');
                div.className = 'date-section';
                div.innerHTML = `<h2 class="section-header">Finished</h2>`;
                const grid = document.createElement('div');
                grid.className = 'results-grid';
                grid.appendChild(createAffiliateCard());
                finishedMatches.forEach(m => grid.appendChild(createMatchCard(m, 99)));
                div.appendChild(grid);
                elements.finishedContainer.appendChild(div);
             });
        } else {
            renderQueue.push(() => {
                const msg = document.createElement('div');
                msg.className = 'no-finished-msg';
                msg.textContent = "No recently finished match available.";
                elements.finishedContainer.appendChild(msg);
            });
        }

        // --- EXECUTE QUEUE IN CHUNKS ---
        const executeChunk = () => {
            if (renderQueue.length === 0) {
                // Done rendering, setup IntersectionObserver for lazy loading
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
                document.querySelectorAll('img.match-poster[data-src]').forEach(img => observer.observe(img));
                return;
            }

            // Render 1 task (one section) per frame
            const task = renderQueue.shift();
            task();
            
            // Schedule next task
            // We use setTimeout to break the call stack and let main thread breathe
            setTimeout(executeChunk, 0); 
        };

        // Start Rendering
        executeChunk();

        const sportName = currentFilters.sport === 'all' ? 'All Sports' : currentFilters.sport.toUpperCase();
        if(elements.categoryTitle) elements.categoryTitle.textContent = `${sportName} SCHEDULE`;
    }

    // --- OTHER UI EVENTS ---
    function populateCategoryDropdown() {
        const sports = new Set(['all']);
        allMatches.forEach(m => sports.add(m.category));
        const priorities = ['football', 'basketball', 'american-football', 'fight', 'motor-sports', 'baseball', 'hockey'];
        const sortedSports = [...sports].sort((a, b) => {
            if(a === 'all') return -1; if(b === 'all') return 1;
            const idxA = priorities.indexOf(a), idxB = priorities.indexOf(b);
            if(idxA !== -1 && idxB !== -1) return idxA - idxB;
            if(idxA !== -1) return -1; if(idxB !== -1) return 1;
            return a.localeCompare(b);
        });
        if(elements.categorySelect) {
            elements.categorySelect.innerHTML = sortedSports.map(s => 
                `<option value="${s}">${s === 'all' ? 'All Sports' : s.replace(/-/g, ' ').toUpperCase()}</option>`
            ).join('');
            elements.categorySelect.value = currentFilters.sport;
        }
    }

    if(elements.toggleFinishedBtn) {
        elements.toggleFinishedBtn.addEventListener('click', () => {
            const isHidden = elements.finishedContainer.style.display === 'none';
            elements.finishedContainer.style.display = isHidden ? 'block' : 'none';
            elements.toggleFinishedBtn.classList.toggle('active', isHidden);
            elements.finishedBtnText.textContent = isHidden ? "Hide Finished Matches" : "Check Finished Matches";
        });
    }

    // SPEED FIX: Throttled Scroll
    let isScrolling = false;
    window.addEventListener("scroll", () => {
        if (!isScrolling) {
            window.requestAnimationFrame(() => {
                if(elements.header) elements.header.classList.toggle("sticky", window.scrollY > 100);
                isScrolling = false;
            });
            isScrolling = true;
        }
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
        history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`); 
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

    // --- MOBILE MENU LOGIC ---
    const mobileMenuElements = {
        toggle: document.getElementById('mobile-toggle'),
        sidebar: document.getElementById('mobile-sidebar'),
        overlay: document.getElementById('mobile-overlay'),
        closeBtn: document.getElementById('close-sidebar')
    };

    function toggleMobileMenu() {
        if(mobileMenuElements.sidebar && mobileMenuElements.overlay) {
            mobileMenuElements.sidebar.classList.toggle('active');
            mobileMenuElements.overlay.classList.toggle('active');
        }
    }

    if(mobileMenuElements.toggle) {
        mobileMenuElements.toggle.addEventListener('click', toggleMobileMenu);
    }
    
    if(mobileMenuElements.closeBtn) {
        mobileMenuElements.closeBtn.addEventListener('click', toggleMobileMenu);
    }
    
    if(mobileMenuElements.overlay) {
        mobileMenuElements.overlay.addEventListener('click', toggleMobileMenu);
    }

    loadMatches();
});
