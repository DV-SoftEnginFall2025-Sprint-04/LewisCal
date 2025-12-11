// backend URL
const BACKEND_URL = "https://lewiscalbackend-a2c5ctddhwcthehx.canadacentral-01.azurewebsites.net/api/refresh";


// cleanup functions
function formatDate(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date)) return "N/A";

    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}

function cleanDescription(text) {
    if (!text) return "";

    return text
        // google meet issues
        .replace(/Join with Google Meet:.*/gi, "")
        .replace(/https:\/\/meet\.google\.com\/\S+/gi, "")
        .replace(/More phone numbers:.*/gi, "")
        .replace(/Learn more about Meet.*/gi, "")
        .replace(/Dial:.*/gi, "")

        // no phone numbers
        .replace(/\+?1?\s*\(?\d{3}\)?[-\s]*\d{3}[-\s]*\d{4}/g, "")

        // remove urls
        .replace(/https?:\/\/\S+/gi, "")

        // remove common footer text
        .replace(/Information provided by.*/gi, "")
        .replace(/Provided under license.*/gi, "")

        // cleaner formatting
        .replace(/\\n/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function getCategoryForEvent(event) {
    const text = (
        (event.title || "") + " " + (event.description || "")
    ).toLowerCase();

    if (text.includes("class") || text.includes("lecture") || text.includes("exam")) {
        return "school";
    }
    if (text.includes("meeting") || text.includes("shift") || text.includes("work")) {
        return "work";
    }
    if (text.includes("birthday") || text.includes("party") || text.includes("dinner")) {
        return "personal";
    }

    return "other";
}

function parseICS(icsText) {
    const events = [];
    if (!icsText) return events;
    
    const rawLines = icsText.replace(/\r\n/g, "\n").split("\n");

    const lines = [];
    for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i];
        if (line.startsWith(" ") && lines.length > 0) {
            lines[lines.length - 1] += line.slice(1);
        } else {
            lines.push(line);
        }
    }

    let currentEvent = null;

    for (const line of lines) {
        if (line.startsWith("BEGIN:VEVENT")) {
            currentEvent = { title: "", start: null, location: "", description: "" };
        } else if (line.startsWith("END:VEVENT")) {
            if (currentEvent && currentEvent.start) {
                events.push(currentEvent);
            }
            currentEvent = null;
        } else if (currentEvent) {
            if (line.startsWith("SUMMARY:")) {
                currentEvent.title = line.slice("SUMMARY:".length).trim();
            } else if (line.startsWith("LOCATION:")) {
                currentEvent.location = line.slice("LOCATION:".length).trim();
            } else if (line.startsWith("DESCRIPTION:")) {
                currentEvent.description = line.slice("DESCRIPTION:".length).trim();
            } else if (line.startsWith("DTSTART")) {
                const parts = line.split(":");
                const value = parts[parts.length - 1].trim();
                currentEvent.start = parseICSDate(value);
            }
        }
    }

    return events;
}

function parseICSDate(value) {
    if (!value) return null;

    // date-only: 20250110
    if (/^\d{8}$/.test(value)) {
        const year = value.slice(0, 4);
        const month = value.slice(4, 6);
        const day = value.slice(6, 8);
        return new Date(`${year}-${month}-${day}T00:00:00`);
    }

    if (/^\d{8}T\d{6}Z?$/.test(value)) {
        const year = value.slice(0, 4);
        const month = value.slice(4, 6);
        const day = value.slice(6, 8);
        const hour = value.slice(9, 11);
        const min = value.slice(11, 13);
        const sec = value.slice(13, 15);
        return new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}Z`);
    }

    const d = new Date(value);
    return isNaN(d) ? null : d;
}

// event display function (supports per-calendar rendering)
function displayEvents(events, calendarId = 'default') {

    // remove events without start date
    events = (events || []).filter(e => e && e.start);

    const container = document.getElementById("events");
    if (!container) return;

    // remove previously-rendered events for this calendar to avoid duplicates
    const prev = container.querySelectorAll(`[data-calendar-id="${calendarId}"]`);
    prev.forEach(n => n.remove());

    if (!events || events.length === 0) {
        // if nothing else shown, show a placeholder
        if (container.children.length === 0) container.innerHTML = "<p>No events found.</p>";
        return;
    }

    // sort events by date
    events.sort((a, b) => new Date(a.start) - new Date(b.start));

    // event cards (append to existing list)
    events.forEach(event => {
        const card = document.createElement("div");
        card.className = "event-card";
        card.dataset.calendarId = calendarId;

        const rawCategory = event.category || getCategoryForEvent(event);
        const category = rawCategory.toLowerCase().replace(/\s+/g, "-");
        card.classList.add(`event-category-${category}`);

        card.innerHTML = `
            <h3>${event.title || "Untitled Event"}</h3>
            <p><strong>Date:</strong> ${formatDate(event.start)}</p>
            ${event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ""}
            ${event.description ? `<p>${cleanDescription(event.description)}</p>` : ""}
        `;

        // respect stored visibility
        const cal = getCalendarsFromStorage().find(c => c.id === calendarId);
        if (cal && cal.visible === false) card.classList.add('hidden');

        container.appendChild(card);
    });
}

// --- calendar storage and UI helpers ---
function getCalendarsFromStorage() {
    try {
        const raw = localStorage.getItem('calendars');
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}
function saveCalendarsToStorage(list) {
    localStorage.setItem('calendars', JSON.stringify(list));
}

function addCalendarEntry(url, name, events) {
    const list = getCalendarsFromStorage();
    const existing = list.find(c => c.url === url);
    if (existing) {
        // update events if provided
        if (events) {
            existing.events = events;
            saveCalendarsToStorage(list);
        }
        return existing.id;
    }
    const id = `cal_${Date.now()}_${Math.floor(Math.random()*1000)}`;
    const entry = { id, url, name: name || url.replace(/^https?:\/\//, '').split(/[/?#]/)[0], visible: true };
    if (events) entry.events = events;
    list.push(entry);
    saveCalendarsToStorage(list);
    renderCalendars();
    return id;
}

function renderCalendars() {
    const container = document.getElementById('calendarsList');
    if (!container) return;
    const list = getCalendarsFromStorage();
    container.innerHTML = '';
    if (list.length === 0) {
        container.innerHTML = '<div class="calendar-item"><div class="calendar-name">No calendars imported</div></div>';
        return;
    }

    list.forEach(cal => {
        const item = document.createElement('div');
        item.className = 'calendar-item';
        item.dataset.calendarId = cal.id;

        const meta = document.createElement('div');
        meta.className = 'calendar-meta';

        const name = document.createElement('div');
        name.className = 'calendar-name';
        name.title = cal.url;
        name.textContent = cal.name || cal.url;
        meta.appendChild(name);

        const actions = document.createElement('div');
        actions.className = 'calendar-actions';

        const toggle = document.createElement('div');
        toggle.className = 'toggle' + (cal.visible ? ' on' : '');
        toggle.setAttribute('role', 'switch');
        toggle.setAttribute('aria-checked', !!cal.visible);
        const knob = document.createElement('div');
        knob.className = 'knob';
        toggle.appendChild(knob);
        toggle.addEventListener('click', () => toggleCalendarVisibility(cal.id));
        actions.appendChild(toggle);

        // per-calendar delete button
        const delBtn = document.createElement('button');
        delBtn.className = 'delete-btn';
        delBtn.textContent = 'Delete';
        delBtn.title = 'Delete this calendar';
        delBtn.addEventListener('click', (e) => { e.stopPropagation(); removeCalendar(cal.id); });
        actions.appendChild(delBtn);
        item.appendChild(meta);
        item.appendChild(actions);
        container.appendChild(item);
    });
}

/**
 * Remove a specific calendar by id: remove storage entry, DOM events, and notify backend
 */
async function removeCalendar(id) {
    const list = getCalendarsFromStorage();
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) return;
    const cal = list[idx];
    if (!confirm(`Delete calendar:\n${cal.url}\nThis will remove stored events for this calendar.`)) return;

    // try backend deletion with url payload
    try {
        let base = BACKEND_URL;
        const apiIdx = BACKEND_URL.indexOf('/api');
        if (apiIdx !== -1) base = BACKEND_URL.slice(0, apiIdx);
        const deleteUrl = base + '/delete-ics';
        await fetch(deleteUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: cal.url })
        }).catch(() => {});
    } catch (e) {
        console.warn('Backend delete failed for', cal.url, e);
    }

    // remove events of this calendar from DOM
    const events = document.querySelectorAll(`[data-calendar-id="${id}"]`);
    events.forEach(ev => ev.remove());

    // remove from storage and re-render
    list.splice(idx, 1);
    saveCalendarsToStorage(list);
    renderCalendars();

    // update global delete button state
    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) deleteBtn.disabled = list.length === 0;

    // if this calendar was stored in the legacy single `calendarURL`, clear it
    try {
        const savedUrl = localStorage.getItem('calendarURL');
        if (savedUrl && savedUrl === cal.url) localStorage.removeItem('calendarURL');
    } catch (e) {
        console.warn('Could not access localStorage to clear legacy calendarURL', e);
    }

    setMessage('Calendar removed.', false);
}

function toggleCalendarVisibility(id) {
    const list = getCalendarsFromStorage();
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) return;
    list[idx].visible = !list[idx].visible;
    saveCalendarsToStorage(list);
    renderCalendars();

    const events = document.querySelectorAll(`[data-calendar-id="${id}"]`);
    events.forEach(ev => {
        if (list[idx].visible) ev.classList.remove('hidden');
        else ev.classList.add('hidden');
    });
}


// validate url function
function isValidCalendarUrl(url) {
    if (!url) return false;
    try {
        const u = new URL(url.trim());
        return u.protocol === "http:" || u.protocol === "https:";
    } catch {
        return false;
    }
}


// message display functions
function getMessageEl() {
    let el = document.getElementById("calendarMessage");
    if (!el) {
        const input = document.getElementById("calendarLink");
        el = document.createElement("div");
        el.id = "calendarMessage";
        el.style.marginTop = "8px";
        input.parentNode.appendChild(el);
    }
    return el;
}

function setMessage(msg, isError = false) {
    const el = getMessageEl();
    if (!el) return;

    el.textContent = msg;

    if (msg) {
        el.classList.add('show');
        el.classList.remove('error', 'success');
        
        if (isError) {
            el.classList.add('error');
        } else {
            el.classList.add('success');
            // auto-dismiss success messages after 5 seconds
            setTimeout(() => {
                if (el.classList.contains('success')) {
                    el.classList.remove('show');
                }
            }, 5000);
        }
    } else {
        el.classList.remove('show', 'error', 'success');
    }
}


// import calendar function
async function importCalendar() {
    const inputEl = document.getElementById("calendarLink");
    const url = inputEl.value.trim();

    if (!url) {
        setMessage("Please paste a calendar link.", true);
        return;
    }

    if (!isValidCalendarUrl(url)) {
        setMessage("Invalid calendar URL.", true);
        return;
    }

    setMessage("Importing calendar...");

    try {
        const fullUrl = `${BACKEND_URL}?url=${encodeURIComponent(url)}`;
        const res = await fetch(fullUrl);
        const data = await res.json();

        if (data.error) {
            setMessage("Error loading calendar: " + data.error, true);
            return;
        }

        // create or reuse a calendar entry and display events under that id
        const name = url.replace(/^https?:\/\//, '').split(/[/?#]/)[0];
        const calId = addCalendarEntry(url, name);
        displayEvents(data.events, calId);
        setMessage(`Loaded ${data.events.length} events`, false);

        //save url for legacy support
        localStorage.setItem("calendarURL", url);

        // clear the input box so user knows import succeeded
        try {
            inputEl.value = "";
        } catch (e) {}

        // enable global delete button
        const deleteBtn = document.getElementById('deleteBtn');
        if (deleteBtn) deleteBtn.disabled = false;

    } catch (err) {
        console.error("Error importing:", err);
        setMessage("Network error importing calendar.", true);
    }
}

// delete imported calendar (clears saved URL, UI, and notifies backend if available)
async function deleteCalendar() {
    const btn = document.getElementById('deleteBtn');
    if (!confirm('Delete the imported calendar and remove displayed events?')) return;

    if (btn) btn.disabled = true;
    setMessage('Deleting calendar...', false);

    try {
        // best-effort notify backend: derive base from BACKEND_URL
        let base = BACKEND_URL;
        const apiIdx = BACKEND_URL.indexOf('/api');
        if (apiIdx !== -1) base = BACKEND_URL.slice(0, apiIdx);
        const deleteUrl = base + '/delete-ics';

        await fetch(deleteUrl, { method: 'POST' }).catch(() => {});
    } catch (err) {
        console.warn('Backend delete request failed:', err);
    }

    // clear local saved URL and UI
    // remove legacy single URL
    const savedUrl = localStorage.getItem('calendarURL');
    if (savedUrl) localStorage.removeItem('calendarURL');

    // remove any stored calendar entries so they do not reappear after refresh
    localStorage.removeItem('calendars');

    // clear displayed events
    const events = document.getElementById('events');
    if (events) events.innerHTML = '';

    // update UI list
    renderCalendars();

    setMessage('Imported calendar deleted.', false);
    if (btn) btn.disabled = true;
}

// import calendar from uploaded .ics file
function importCalendarFile() {
    const fileInput = document.getElementById("calendarFile");
    const file = fileInput && fileInput.files[0];

    if (!file) {
        setMessage("Please choose a .ics file to upload.", true);
        return;
    }

    if (!file.name.toLowerCase().endsWith(".ics")) {
        setMessage("Please upload a valid .ics calendar file.", true);
        return;
    }

    setMessage("Importing calendar file...");

    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const icsText = e.target.result;
            const events = parseICS(icsText);

            if (!events || events.length === 0) {
                setMessage("No events found in this .ics file.", true);
                displayEvents([], 'file_' + Date.now());
                return;
            }

            // normalize events (convert Date objects to ISO strings)
            const normalized = events.map(ev => ({
                ...ev,
                start: ev.start && ev.start.toISOString ? ev.start.toISOString() : ev.start
            }));

            // store this local file as a calendar entry (persist events) and render
            const fileUrl = 'local-file:' + file.name + ':' + Date.now();
            const fileId = addCalendarEntry(fileUrl, file.name, normalized);
            displayEvents(normalized, fileId);
            setMessage(`Loaded ${events.length} events from file.`, false);

            // enable global delete button
            const deleteBtnFile = document.getElementById('deleteBtn');
            if (deleteBtnFile) deleteBtnFile.disabled = false;
        } catch (err) {
            console.error("Error parsing .ics file:", err);
            setMessage("Error reading calendar file.", true);
        }
    };

    reader.onerror = () => {
        console.error("FileReader error");
        setMessage("Error reading calendar file.", true);
    };

    reader.readAsText(file);
}

// auto refresh function updated to check for stored url
async function checkForUpdates() {
    try {
        const calendars = getCalendarsFromStorage();
        if (!calendars || calendars.length === 0) {
            // legacy single-url support
            const savedUrl = localStorage.getItem("calendarURL");
            if (!savedUrl) return;
            const fullUrl = `${BACKEND_URL}?url=${encodeURIComponent(savedUrl)}`;
            const res = await fetch(fullUrl);
            if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
            const data = await res.json();
            if (data.updated && data.events) {
                displayEvents(data.events, 'default');
                setMessage("Calendar updated!", false);
            }
            return;
        }

        // fetch updates for each stored calendar
        for (const cal of calendars) {
            try {
                // skip update fetch for local-file imports (they are stored locally)
                if (cal.url && cal.url.startsWith('local-file:')) continue;

                const fullUrl = `${BACKEND_URL}?url=${encodeURIComponent(cal.url)}`;
                const res = await fetch(fullUrl);
                if (!res.ok) continue;
                const data = await res.json();
                if (data.updated && data.events) {
                    displayEvents(data.events, cal.id);
                    setMessage(`Calendar "${cal.name}" updated!`, false);
                }
            } catch (e) {
                console.warn('Failed to refresh calendar', cal.url, e);
            }
        }

    } catch (err) {
        console.error("Failed to refresh calendar:", err);
    }
}


//page load: check for saved URL and load events
document.addEventListener("DOMContentLoaded", async () => {
    const savedUrl = localStorage.getItem("calendarURL");
    const calendars = getCalendarsFromStorage();

    // render stored calendars UI
    renderCalendars();

    if (calendars && calendars.length > 0) {
        // load events for each stored calendar (use persisted events for local files)
        for (const cal of calendars) {
            try {
                if (cal.events && Array.isArray(cal.events)) {
                    // stored events (from file import) - ensure start values are dates/iso strings
                    displayEvents(cal.events, cal.id);
                    continue;
                }

                // otherwise try fetching from backend (URL-based calendars)
                const fullUrl = `${BACKEND_URL}?url=${encodeURIComponent(cal.url)}`;
                const res = await fetch(fullUrl);
                if (!res.ok) continue;
                const data = await res.json();
                if (data && data.events) displayEvents(data.events, cal.id);
            } catch (e) {
                console.warn('Load error for', cal.url, e);
            }
        }
    } else if (savedUrl) {
        // legacy single-url support: add as calendar entry and fetch
        const id = addCalendarEntry(savedUrl, savedUrl.replace(/^https?:\/\//, '').split(/[/?#]/)[0]);
        try {
            const fullUrl = `${BACKEND_URL}?url=${encodeURIComponent(savedUrl)}`;
            const res = await fetch(fullUrl);
            const data = await res.json();
            if (data && data.events) displayEvents(data.events, id);
        } catch (e) {
            console.error('Load error:', e);
        }
    }

    getMessageEl();
    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) deleteBtn.disabled = !(savedUrl || (calendars && calendars.length > 0));
});

// auto-refresh every 60 seconds
setInterval(checkForUpdates, 60000);
