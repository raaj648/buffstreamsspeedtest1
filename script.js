// --- [v7.1 - BUFFSTREAMS HOMEPAGE - DUAL API + DYNAMIC SPORT TIMING] ---

document.addEventListener("DOMContentLoaded", function() {

    // --- 1. STICKY HEADER LOGIC ---
    (function setupStickyHeader() {
        const header = document.querySelector(".main-header");
        const triggerEl = document.querySelector(".categories-container") || document.querySelector(".search-and-schedule-container");
        
        if (!header || !triggerEl) return;
        
        window.addEventListener("scroll", function() {
            window.requestAnimationFrame(() => {
                const triggerPoint = triggerEl.offsetTop;
                header.classList.toggle("sticky", window.scrollY > triggerPoint);
            });
        }, { passive: true });
    })();

    // --- 2. MOBILE SIDEBAR MENU LOGIC ---
    (function setupMobileMenu() {
        const toggleBtn = document.getElementById('mobile-toggle');
        const closeBtn = document.getElementById('close-sidebar');
        const sidebar = document.getElementById('mobile-sidebar');
        const overlay = document.getElementById('mobile-overlay');
        
        if(!toggleBtn || !sidebar || !overlay) return;

        function toggleMenu() {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
            document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
        }

        toggleBtn.addEventListener('click', toggleMenu);
        if(closeBtn) closeBtn.addEventListener('click', toggleMenu);
        overlay.addEventListener('click', toggleMenu);
    })();

    // --- 3. STICKY FOOTER AD LOGIC ---
    (function setupStickyFooterAd() {
        const adPlaceholder = document.getElementById('sticky-ad-placeholder');
        if (!adPlaceholder) return;

        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
        let adContent = '';

        if (isMobile) {
            adContent = `
            <div id="sticky-footer-ad">
              <div class="ad-content">
                <span class="emoji">📲</span>
                <span class="cta-text">Get App!</span>
                <a href="https://tinyurl.com/BuffstreamsApp" class="download-btn" rel="nofollow" target="_blank">⬇ Download</a>
              </div>
              <span id="close-ad">&#10060;</span>
            </div>`;
        } else {
            adContent = `
            <div id="sticky-footer-ad">
              <div class="ad-content">
                <span class="emoji">📺</span>
                <span class="cta-text">Free Prime Video</span>
                <a href="https://www.amazon.com/tryprimefree?tag=YOUR_TAG_HERE" class="download-btn amazon-btn" rel="nofollow sponsored" target="_blank">Start Trial</a>
              </div>
              <span id="close-ad">&#10060;</span>
            </div>`;
        }

        adPlaceholder.innerHTML = adContent;
        adPlaceholder.classList.add('active');

        const closeBtn = document.getElementById('close-ad');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                adPlaceholder.style.display = 'none';
            });
        }
    })();
});

window.addEventListener('load', function() {

    const CONFIG = {
        apiPrimary: 'https://streamed.pk/api',
        apiBackup: 'https://topembed.pw/api.php?format=json',
        discordServerId: '1422384816472457288',
        discordFallbackInvite: 'https://discord.gg/buffstreams',
    };

    // --- 4. SCROLL ANIMATION LOGIC ---
    (function setupScrollAnimations() {
        const animatedElements = document.querySelectorAll('.animate-on-scroll');
        if (!animatedElements.length) return;
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.1 });
            animatedElements.forEach(element => observer.observe(element));
        } else {
            animatedElements.forEach(el => el.classList.add('is-visible'));
        }
    })();

    // --- 5. SEARCH REDIRECT ---
    (function setupSearchRedirect() {
        const searchTrigger = document.getElementById('search-trigger');
        if (searchTrigger) {
            searchTrigger.addEventListener('click', function() {
                window.location.href = '/SearchResult/?focus=true';
            });
        }
    })();

    // --- 6. DISCORD FETCHER ---
    (function fetchDiscordInvite() {
        const apiUrl = `https://discord.com/api/guilds/${CONFIG.discordServerId}/widget.json`;
        const discordButton = document.getElementById("discord-join-link");
        if (!discordButton) return;
        fetch(apiUrl)
            .then(res => res.ok ? res.json() : Promise.reject('API fetch failed'))
            .then(data => {
                if (data.instant_invite) discordButton.href = data.instant_invite;
                else discordButton.href = CONFIG.discordFallbackInvite;
            })
            .catch(() => {
                discordButton.href = CONFIG.discordFallbackInvite;
            });
    })();
    
    // --- 7. HYBRID CATEGORY LOGIC (Dual API + Dynamic Timing) ---
    (async function initializeHybridCategorySorting() {
        const categoriesGrid = document.querySelector('.categories-grid');
        if (!categoriesGrid) return;

        // Static Category Data
        const staticCategoryData = [
            { name: 'Basketball', href: '/Schedule/?sport=basketball', imgSrc: './Images/Basketball.webp', key: 'basketball' },
            { name: 'Football', href: '/Schedule/?sport=football', imgSrc: './Images/Football.webp', key: 'football' },
            { name: 'American Football', href: '/Schedule/?sport=american-football', imgSrc: './Images/American-football.webp', key: 'american-football' },
            { name: 'Hockey', href: '/Schedule/?sport=hockey', imgSrc: './Images/Hockey.webp', key: 'hockey' },
            { name: 'Baseball', href: '/Schedule/?sport=baseball', imgSrc: './Images/Baseball.webp', key: 'baseball' },
            { name: 'Motor-sports', href: '/Schedule/?sport=motor-sports', imgSrc: './Images/Motor-sport.webp', key: 'motor-sports' },
            { name: 'Fight', href: '/Schedule/?sport=fight', imgSrc: './Images/Fight.webp', key: 'fight' },
            { name: 'Tennis', href: '/Schedule/?sport=tennis', imgSrc: './Images/Tennis.webp', key: 'tennis' },
            { name: 'Rugby', href: '/Schedule/?sport=rugby', imgSrc: './Images/Rugby.webp', key: 'rugby' },
            { name: 'Golf', href: '/Schedule/?sport=golf', imgSrc: './Images/Golf.webp', key: 'golf' },
            { name: 'Billiards', href: '/Schedule/?sport=billiards', imgSrc: './Images/Billiards.webp', key: 'billiards' },
            { name: 'AFL', href: '/Schedule/?sport=afl', imgSrc: './Images/AFL.webp', key: 'afl' },
            { name: 'Darts', href: '/Schedule/?sport=darts', imgSrc: './Images/Darts.webp', key: 'darts' },
            { name: 'Cricket', href: '/Schedule/?sport=cricket', imgSrc: './Images/Cricket.webp', key: 'cricket' },
            { name: 'Other', href: '/Schedule/?sport=other', imgSrc: './Images/Other.webp', key: 'other' }
        ];

        // Normalizer to map API categories to our keys
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

        // [NEW] DYNAMIC LIVE DURATIONS (Minutes)
        // Adjust these values to define how long a match stays "Live" in the backup API
        const SPORT_DURATIONS = {
            'football': 150,          // 2.5 hours (Standard + Extra time)
            'basketball': 165,        // 2.75 hours (NBA games run long)
            'american-football': 210, // 3.5 hours (NFL games are very long)
            'baseball': 210,          // 3.5 hours (No clock, can run long)
            'hockey': 160,            // 2 hours 40 mins
            'fight': 300,             // 5 hours (UFC Main cards usually cover the whole event time)
            'motor-sports': 180,      // 3 hours (F1 race time limit)
            'tennis': 240,            // 4 hours (Grand slam matches vary wildy, 4h is safe buffer)
            'cricket': 480,           // 8 hours (ODIs are long, T20s shorter, 8h covers most)
            'golf': 480,              // 8 hours (Tournament days are long)
            'rugby': 130,             // 2 hours 10 mins
            'darts': 180,             // 3 hours
            'billiards': 180,         // 3 hours
            'afl': 180,               // 3 hours
            'other': 180              // Default Fallback
        };

        // --- BACKUP API: Fetch Match Counts ---
        async function fetchBackupCounts() {
            try {
                // Using corsproxy.io to route the request
                const proxyUrl = 'https://corsproxy.io/?';
                const targetUrl = CONFIG.apiBackup;
                const finalUrl = proxyUrl + encodeURIComponent(targetUrl);

                const response = await fetch(finalUrl);
                if (!response.ok) throw new Error('Backup API failed');
                const data = await response.json();
                
                const now = Math.floor(Date.now() / 1000);
                const counts = {};

                if (data && data.events) {
                    for (const date in data.events) {
                        data.events[date].forEach(event => {
                            if (!event.sport) return;
                            
                            const key = normalizeCategory(event.sport);
                            
                            // [UPDATED] Get specific duration for this sport, or default to 180
                            const durationMinutes = SPORT_DURATIONS[key] || 180;
                            
                            const diffMinutes = (now - event.unix_timestamp) / 60;
                            
                            // Check against the specific sport duration
                            if (diffMinutes >= 0 && diffMinutes < durationMinutes) {
                                counts[key] = (counts[key] || 0) + 1;
                            }
                        });
                    }
                }
                return counts;
            } catch (e) {
                console.warn("Backup API (Counts) failed or CORS issue:", e);
                return {};
            }
        }

        // --- PRIMARY API: Fetch Viewers from Streamed.pk ---
        async function fetchPrimaryViewers() {
            const matchesRes = await fetch(`${CONFIG.apiPrimary}/matches/live`);
            if (!matchesRes.ok) throw new Error('Primary Matches API failed');
            const liveMatches = await matchesRes.json();
            
            if (liveMatches.length === 0) return {};

            const streamPromises = liveMatches.flatMap(match =>
                match.sources.map(source =>
                    fetch(`${CONFIG.apiPrimary}/stream/${source.source}/${source.id}`)
                        .then(res => res.ok ? res.json() : [])
                        .then(streams => ({ category: match.category, streams }))
                        .catch(() => ({ category: match.category, streams: [] }))
                )
            );

            const results = await Promise.all(streamPromises);
            
            const viewerCounts = {};
            results.forEach(item => {
                const key = normalizeCategory(item.category);
                if (!viewerCounts[key]) viewerCounts[key] = 0;
                item.streams.forEach(stream => {
                    if (typeof stream.viewers === 'number') {
                        viewerCounts[key] += stream.viewers;
                    }
                });
            });
            return viewerCounts;
        }

        // --- Helper: Timeout Wrapper ---
        const fetchWithTimeout = (promise, ms) => {
            const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms));
            return Promise.race([promise, timeout]);
        };

        // --- MAIN LOGIC ---
        let finalCategoryData = [...staticCategoryData];
        let backupCounts = {};

        try {
            // 1. Fetch Backup (Matches) immediately
            const backupPromise = fetchBackupCounts();
            
            // 2. Fetch Primary (Viewers) with 4s timeout
            const primaryViewers = await fetchWithTimeout(fetchPrimaryViewers(), 4000);
            
            // 3. Wait for Backup
            backupCounts = await backupPromise;

            // --- SUCCESS: Sort by VIEWERS ---
            finalCategoryData = finalCategoryData.map(cat => ({
                ...cat,
                viewers: primaryViewers[cat.key] || 0,
                matchCount: backupCounts[cat.key] || 0
            }));
            
            finalCategoryData.sort((a, b) => b.viewers - a.viewers);

        } catch (error) {
            console.log("Primary API failed or timed out. Switching to Match Count sort.");
            
            // --- FAILOVER: Sort by MATCH COUNTS ---
            if (Object.keys(backupCounts).length === 0) {
                 backupCounts = await fetchBackupCounts();
            }

            finalCategoryData = finalCategoryData.map(cat => ({
                ...cat,
                viewers: 0,
                matchCount: backupCounts[cat.key] || 0
            }));

            // Sort by available live matches
            finalCategoryData.sort((a, b) => b.matchCount - a.matchCount);
        }

        // --- RENDER ---
        const formatViewers = (num) => {
            if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
            return num;
        };

        const createCategoryCard = (category) => {
            const card = document.createElement('a');
            card.href = category.href;
            card.className = 'category-card';
    
            const img = document.createElement('img');
            img.src = category.imgSrc;
            img.alt = `${category.name} Logo`;
            img.loading = 'lazy';
            img.width = 90;
            img.height = 90;
            
            const span = document.createElement('span');
            span.textContent = category.name;
            
            card.appendChild(img);
            card.appendChild(span);
    
            // Badge 1: Live Viewers (Red) - From Primary
            if (category.viewers > 0) {
                const vBadge = document.createElement('div');
                vBadge.className = 'live-badge';
                const eyeIconSVG = `<svg class="viewer-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"></path></svg>`;
                vBadge.innerHTML = `<span>${formatViewers(category.viewers)}</span>${eyeIconSVG}`;
                card.appendChild(vBadge);
                setTimeout(() => vBadge.classList.add('visible'), 50);
            }

            // Badge 2: Match Count (Blue) - From Backup
            if (category.matchCount > 0) {
                const cBadge = document.createElement('div');
                cBadge.className = 'count-badge';
                cBadge.innerHTML = `<span>${category.matchCount} Matches</span>`;
                card.appendChild(cBadge);
                setTimeout(() => cBadge.classList.add('visible'), 50);
            }

            return card;
        };

        categoriesGrid.innerHTML = '';
        finalCategoryData.forEach((category, index) => {
            const card = createCategoryCard(category);
            if (index < 4) { 
                const img = card.querySelector('img');
                if(img) { img.loading = 'eager'; img.fetchPriority = 'high'; }
            }
            categoriesGrid.appendChild(card);
        });
    })();
});