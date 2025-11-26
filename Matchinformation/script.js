// =================================================================================
// SCRIPT.JS - Match Information Page (Double API + Embedded Player Traffic)
// =================================================================================

document.addEventListener("DOMContentLoaded", () => {
    console.log("--- Buffstreams Match Script Started ---");

    // ---------------------------
    // CONFIGURATION
    // ---------------------------
    const CONFIG = {
        apiPrimary: 'https://streamed.pk/api',
        apiBackup: 'https://topembed.pw/api.php?format=json',
        proxyUrl: 'https://corsproxy.io/?',
        watchPageBase: 'https://arkhan648.github.io/allinonewatchpage/',
        discordServerId: "1422384816472457288"
    };

    // ---------------------------
    // STATE & DOM ELEMENTS
    // ---------------------------
    const elements = {
        header: document.querySelector(".main-header"),
        title: document.getElementById("match-title"),
        description: document.getElementById("match-description"),
        countdown: document.getElementById("countdown-section"),
        streamsContainer: document.getElementById("streams-container"),
        showAllBtn: document.getElementById("show-all-sources-btn"),
        streamsSection: document.getElementById("streams-section"),
        stickyAd: document.getElementById("sticky-footer-ad"),
        closeAdBtn: document.getElementById("close-ad"),
        // Mobile Menu Elements
        mobileToggle: document.getElementById("mobile-toggle"),
        mobileSidebar: document.getElementById("mobile-sidebar"),
        mobileOverlay: document.getElementById("mobile-overlay"),
        closeSidebar: document.getElementById("close-sidebar")
    };

    // ---------------------------
    // MENU & HEADER LOGIC
    // ---------------------------
    // Sticky Header
    window.addEventListener("scroll", () => {
        if(elements.header) elements.header.classList.toggle("sticky", window.scrollY > 100);
    }, { passive: true });

    // Mobile Menu Toggles
    function toggleMenu() {
        if(!elements.mobileSidebar) return;
        const isActive = elements.mobileSidebar.classList.contains('active');
        elements.mobileSidebar.classList.toggle('active', !isActive);
        elements.mobileOverlay.classList.toggle('active', !isActive);
    }
    if(elements.mobileToggle) elements.mobileToggle.addEventListener('click', toggleMenu);
    if(elements.closeSidebar) elements.closeSidebar.addEventListener('click', toggleMenu);
    if(elements.mobileOverlay) elements.mobileOverlay.addEventListener('click', toggleMenu);

    // ---------------------------
    // HELPER FUNCTIONS
    // ---------------------------
    
    const generateBackupId = (event) => {
        const safeMatch = (event.match || event.event || "").toLowerCase().replace(/[^a-z0-9]/g, '');
        const safeSport = (event.sport || "").toLowerCase().trim();
        const unix = event.unix_timestamp;
        const uniqueString = `${unix}_${safeSport}_${safeMatch}`;
        return btoa(unescape(encodeURIComponent(uniqueString)));
    };

    function getChannelName(url, index) {
        try {
            const lastPart = url.substring(url.lastIndexOf('/') + 1);
            const decodedPart = decodeURIComponent(lastPart);
            const isGeneric = /^(ex)?\d{3,}$/.test(decodedPart) || decodedPart.length < 4 || decodedPart.includes('.php');
            return isGeneric ? `Stream Link ${index + 1}` : decodedPart.replace(/[-_]/g, ' ').toUpperCase();
        } catch (e) {
            return `Stream Link ${index + 1}`;
        }
    }

    // ---------------------------
    // PRIMARY API RENDERERS
    // ---------------------------
    function renderPrimaryStreamRow(stream, index, matchId, sourceName) {
        const row = document.createElement("a");
        row.className = "stream-row";
        
        // PRIMARY URL FORMAT: ?match=id/source/quality
        const quality = stream.hd ? 'hd' : 'sd';
        const streamNumber = stream.streamNo;
        const matchParam = `${matchId}/${sourceName}/${quality}${streamNumber}`;
        row.href = `${CONFIG.watchPageBase}?match=${matchParam}`;
        
        row.target = "_blank";
        row.rel = "nofollow noopener noreferrer";
        
        const qualityTagClass = stream.hd ? "hd" : "sd";
        const qualityText = stream.hd ? "HD" : "SD";
        const viewersHTML = stream.viewers > 0 
            ? `<div class="viewers-count"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>${stream.viewers}</div>`
            : '';
        const languageHTML = `<div class="stream-lang"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path></svg>${stream.language || "English"}</div>`;
        const openLinkIcon = `<svg class="open-arrow" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`;

        row.innerHTML = `
            <div class="stream-label">
                <span class="quality-tag ${qualityTagClass}">${qualityText}</span>
                <span>Stream ${index + 1}</span>
            </div>
            <div class="stream-meta">
                ${viewersHTML}
                ${languageHTML}
                ${openLinkIcon}
            </div>`;
        return row;
    }

    async function renderPrimarySource(source, matchId) {
        const sourceMeta = { alpha: "Most reliable (720p 30fps)", charlie: "Good backup", intel: "Large event coverage", admin: "Admin added streams", hotel: "Very high quality feeds", foxtrot: "Good quality", delta: "Reliable backup", echo: "Great quality overall" };
        const description = sourceMeta[source.source.toLowerCase()] || "Reliable streams";
        
        try {
            const res = await fetch(`${CONFIG.apiPrimary}/stream/${source.source}/${source.id}`);
            if (!res.ok) return null;
            let streams = await res.json();
            if (!streams || streams.length === 0) return null;
            
            streams.sort((a, b) => (b.hd - a.hd) || ((b.viewers || 0) - (a.viewers || 0)));
            
            const sourceContainer = document.createElement("div");
            sourceContainer.className = "stream-source";
            sourceContainer.innerHTML = `
                <div class="source-header">
                    <span class="source-name">${source.source.charAt(0).toUpperCase() + source.source.slice(1)}</span>
                    <span class="source-count">${streams.length} streams</span>
                </div>
                <small class="source-desc">✨ ${description}</small>`;
            
            const fragment = document.createDocumentFragment();
            streams.forEach((stream, i) => fragment.appendChild(renderPrimaryStreamRow(stream, i, matchId, source.source)));
            sourceContainer.appendChild(fragment);
            return sourceContainer;
        } catch (err) { return null; }
    }

    // ---------------------------
    // BACKUP API RENDERERS
    // ---------------------------
    function renderBackupSource(match, matchId) {
        const rawChannels = match.channels && (match.channels.channel || match.channels) ? (match.channels.channel || match.channels) : [];
        const channels = Array.isArray(rawChannels) ? rawChannels : [rawChannels];
        const validChannels = channels.map(c => typeof c === 'object' ? c.channel : c).filter(Boolean);

        if (validChannels.length === 0) return null;

        const sourceContainer = document.createElement("div");
        sourceContainer.className = "stream-source";
        // Renamed to generic "Fast Streams" to blend in
        sourceContainer.innerHTML = `
            <div class="source-header">
                <span class="source-name">Fast Streams</span>
                <span class="source-count">${validChannels.length} streams</span>
            </div>
            <small class="source-desc">✨ High reliability connections</small>`;
        
        const fragment = document.createDocumentFragment();
        
        validChannels.forEach((url, index) => {
            const row = document.createElement("a");
            row.className = "stream-row";
            
            // BACKUP URL FORMAT: ?id={MATCH_ID}&stream={ENCODED_URL}
            row.href = `${CONFIG.watchPageBase}?id=${matchId}&stream=${encodeURIComponent(url)}`;
            row.target = "_blank";
            row.rel = "nofollow noopener noreferrer";

            const channelName = getChannelName(url, index);
            const openLinkIcon = `<svg class="open-arrow" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`;
            
            row.innerHTML = `
                <div class="stream-label">
                    <span class="quality-tag sd">Live</span>
                    <span>${channelName}</span>
                </div>
                <div class="stream-meta">
                    <div class="stream-lang">Player</div>
                    ${openLinkIcon}
                </div>`;
            fragment.appendChild(row);
        });

        sourceContainer.appendChild(fragment);
        return sourceContainer;
    }

    // ---------------------------
    // CORE LOGIC: DOUBLE API LOAD
    // ---------------------------
    async function loadMatchDetails() {
        const urlParams = new URLSearchParams(window.location.search);
        const matchId = urlParams.get("id");
        
        if (!matchId) { 
            elements.title.innerHTML = "Error: Match ID not provided."; 
            return; 
        }

        elements.streamsContainer.innerHTML = "";
        
        // Header Buttons
        const skeletonHeader = elements.streamsSection.querySelector('.skeleton-header');
        if (skeletonHeader) {
            const headerHTML = `
                <button id="back-button" class="back-button-styled">
                    <span>&lt;-</span><span class="separator">•</span><span>Back to Schedule</span>
                </button>
                <div id="sources-summary">Loading available streams...</div>
            `;
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = headerHTML;
            skeletonHeader.replaceWith(...tempDiv.childNodes);
            
            document.getElementById("back-button").addEventListener("click", () => {
                 window.location.href = '../Schedule/?popular=true';
            });
        }

        // 1. PRIMARY API
        try {
            const res = await fetch(`${CONFIG.apiPrimary}/matches/all`);
            if (res.ok) {
                const allMatches = await res.json();
                const match = allMatches.find(m => String(m.id) === String(matchId));
                
                if (match) {
                    updatePageMetadata(match.title, match.date);
                    if (match.sources && match.sources.length > 0) {
                        renderSources(match.sources.map(s => renderPrimarySource(s, match.id)));
                    } else {
                        renderNoStreams();
                    }
                    return; 
                }
            }
        } catch (error) { console.warn("Primary API issue, trying backup..."); }

        // 2. BACKUP API
        try {
            const url = CONFIG.proxyUrl + encodeURIComponent(CONFIG.apiBackup);
            const res = await fetch(url);
            if (!res.ok) throw new Error("Backup API Error");
            const data = await res.json();
            
            let backupMatch = null;
            if (data && data.events) {
                for (const dateStr in data.events) {
                    const eventsList = Array.isArray(data.events[dateStr]) ? data.events[dateStr] : [data.events[dateStr]];
                    for (const event of eventsList) {
                        if(generateBackupId(event) === matchId) {
                            backupMatch = event;
                            break;
                        }
                    }
                    if(backupMatch) break;
                }
            }

            if (backupMatch) {
                const title = (backupMatch.match || backupMatch.event || "Unknown").replace(/ vs /i, ' v ');
                const date = (parseInt(backupMatch.unix_timestamp) * 1000);
                updatePageMetadata(title, date);
                
                const backupSourceEl = renderBackupSource(backupMatch, matchId);
                if(backupSourceEl) {
                    const sourcesSummaryEl = document.getElementById('sources-summary');
                    if (sourcesSummaryEl) sourcesSummaryEl.textContent = `Showing available streams`;
                    elements.streamsContainer.appendChild(backupSourceEl);
                } else {
                    renderNoStreams();
                }
                return;
            }

        } catch (error) { console.error("Backup API failed:", error); }

        // FAILURE
        elements.title.textContent = "Match Not Found";
        elements.description.textContent = "The match you are looking for could not be found. It may have been removed or finished.";
        elements.streamsContainer.innerHTML = '';
        const summary = document.getElementById('sources-summary');
        if(summary) summary.textContent = "Error";
    }

    function updatePageMetadata(title, dateTimestamp) {
        const fullTitle = `${title} Live Stream Links`;
        document.title = fullTitle;
        elements.title.textContent = fullTitle;
        elements.description.textContent = `To watch ${title} streams, scroll down and choose a stream link. If no links appear, the event may not be live yet.`;

        if (dateTimestamp > Date.now()) {
            elements.countdown.classList.remove("hidden");
            const interval = setInterval(() => {
                const diff = dateTimestamp - Date.now();
                if (diff <= 0) {
                    elements.countdown.classList.add("hidden");
                    clearInterval(interval);
                    window.location.reload();
                    return;
                }
                const days = Math.floor(diff / 86400000);
                const hrs = String(Math.floor((diff % 86400000) / 3600000)).padStart(2, "0");
                const mins = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
                const secs = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
                const dayString = days > 0 ? `${days}d ` : "";
                elements.countdown.textContent = `Event starts in: ${dayString}${hrs}h ${mins}m ${secs}s`;
            }, 1000);
        }
    }

    async function renderSources(promiseArray) {
        const sourceElements = (await Promise.all(promiseArray)).filter(Boolean);
        const totalSources = sourceElements.length;
        const sourcesSummaryEl = document.getElementById('sources-summary');

        if (totalSources === 0) {
            renderNoStreams();
            return;
        }

        const INITIAL_SOURCES_TO_SHOW = 4;
        if (sourcesSummaryEl) sourcesSummaryEl.textContent = `Found ${totalSources} sources • Showing top recommendations`;
        
        sourceElements.forEach((el, index) => {
            if (index >= INITIAL_SOURCES_TO_SHOW) el.classList.add('hidden-source');
            elements.streamsContainer.appendChild(el);
        });

        if (totalSources > INITIAL_SOURCES_TO_SHOW) {
            const remainingCount = totalSources - INITIAL_SOURCES_TO_SHOW;
            elements.showAllBtn.textContent = `Show ${remainingCount} more sources ⌄`;
            elements.showAllBtn.classList.remove('hidden');
            elements.showAllBtn.addEventListener('click', () => {
                document.querySelectorAll('.hidden-source').forEach(el => el.classList.remove('hidden-source'));
                elements.showAllBtn.classList.add('hidden');
                if (sourcesSummaryEl) sourcesSummaryEl.textContent = `Showing all ${totalSources} sources`;
            }, { once: true });
        }
    }

    function renderNoStreams() {
        const sourcesSummaryEl = document.getElementById('sources-summary');
        if (sourcesSummaryEl) sourcesSummaryEl.textContent = 'No sources available';
        elements.streamsContainer.innerHTML = `<div style="text-align:center; padding: 20px; color: #8b949e;">No active streams found. Check back closer to match time.</div>`;
    }

    async function loadDiscordWidget() {
        const apiUrl = `https://discord.com/api/guilds/${CONFIG.discordServerId}/widget.json`;
        const onlineCountEl = document.getElementById("discord-online-count");
        const membersListEl = document.getElementById("discord-members-list");
        const joinButton = document.getElementById("discord-join-button");
        const widgetContainer = document.getElementById("discord-widget-container");

        if (!widgetContainer) return;

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error('Failed');
            const data = await response.json();
            onlineCountEl.textContent = data.presence_count || '0';
            if (data.instant_invite && joinButton) joinButton.href = data.instant_invite;

            membersListEl.innerHTML = ''; 
            const fragment = document.createDocumentFragment();
            if (data.members && data.members.length > 0) {
                data.members.slice(0, 10).forEach(member => {
                    const li = document.createElement('li');
                    li.innerHTML = `<div class="member-avatar"><img src="${member.avatar_url}" alt="${member.username}"><span class="online-indicator"></span></div><span class="member-name">${member.username}</span>`;
                    fragment.appendChild(li);
                });
            } else {
                const li = document.createElement('li');
                li.textContent = "No members online";
                li.style.color = "#8b949e";
                fragment.appendChild(li);
            }
            if (data.instant_invite) {
                const moreLi = document.createElement('div');
                moreLi.className = 'more-members-link';
                moreLi.innerHTML = `<p>and more in our <a href="${data.instant_invite}" target="_blank" rel="noopener noreferrer">Discord!</a></p>`;
                fragment.appendChild(moreLi);
            }
            membersListEl.appendChild(fragment);
        } catch (error) {
            console.error("Discord widget error:", error);
            if (widgetContainer) widgetContainer.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:10px;">Widget Unavailable</p>';
        }
    }

    if (elements.closeAdBtn && elements.stickyAd) {
        elements.closeAdBtn.addEventListener("click", () => { 
            elements.stickyAd.style.display = "none"; 
        });
    }

    loadMatchDetails();
    loadDiscordWidget();
});