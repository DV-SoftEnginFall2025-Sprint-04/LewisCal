async function checkForUpdates() {
    try {
        const res = await fetch("http://localhost:3001/api/refresh");
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        if (data.updated && data.events) {
            console.log("Updated calendar data:", data.events);
            displayEvents(data.events);
        }
    } catch (error) {
        console.error('Failed to check for updates:', error);
    }
}

async function fetchCalendarEvents() {
    try {
        const response = await fetch('http://localhost:3001/api/refresh');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        console.log('Events fetched:', data);
        if (data.events) displayEvents(data.events);
        return data.events;
    } catch (error) {
        console.error('Failed to fetch calendar events:', error);
    }
}

function displayEvents(events) {
    if (!events || events.length === 0) {
        console.log('No events to display');
        return;
    }
    events.forEach(event => {
        console.log(`Event: ${event.summary} at ${event.start}`);
    });
}

// ----------------- Validation + Import logic -----------------

/**
 * Validate that a URL is http(s) and likely points to an .ics resource.
 * Accepts .ics in pathname or filename; allows query strings.
 */
function isValidCalendarUrl(url) {
    if (!url || typeof url !== 'string') return false;
    try {
        const u = new URL(url.trim());
        if (!['http:', 'https:'].includes(u.protocol)) return false;
        // If pathname or href contains .ics (allow query strings)
        if (/\.ics(\?|$)/i.test(u.pathname + u.search)) return true;
        // fallback: some feeds use content negotiation without .ics extension — allow http(s) but mark less-certain
        return false;
    } catch (e) {
        return false;
    }
}

/**
 * Create or get the inline message element shown under the calendar input.
 */
function getMessageEl() {
    let el = document.getElementById('calendarMessage');
    if (!el) {
        const input = document.getElementById('calendarLink');
        el = document.createElement('div');
        el.id = 'calendarMessage';
        el.style.marginTop = '8px';
        el.style.fontSize = '0.95rem';
        input.parentNode.appendChild(el);
    }
    return el;
}

function setMessage(text, isError = false) {
    const el = getMessageEl();
    el.textContent = text;
    el.style.color = isError ? '#b91c1c' : '#064e3b';
}

/**
 * Import calendar via backend. Performs client-side validation first.
 * Uses backend endpoint at http://localhost:3001/import-ics
 */
async function importCalendar() {
    const inputEl = document.getElementById("calendarLink");
    const url = inputEl ? inputEl.value.trim() : '';

    if (!url) {
        setMessage('Please paste a calendar link first.', true);
        return;
    }

    if (!isValidCalendarUrl(url)) {
        setMessage('Invalid URL. Use an http(s) URL that points to a .ics file.', true);
        return;
    }

    setMessage('Importing calendar...');

    try {
        const response = await fetch('http://localhost:3001/import-ics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        if (!response.ok) {
            const errBody = await response.text().catch(() => response.statusText);
            console.error('Import failed:', response.status, errBody);
            setMessage('Failed to import calendar. See console for details.', true);
            return;
        }

        const events = await response.json();
        console.log("Imported events:", events);

        // events from some parsers may be an object keyed by uid — normalize to array
        const normalized = Array.isArray(events) ? events : Object.values(events || {});
        if (normalized.length === 0) {
            setMessage('No events were imported from the provided calendar.', true);
        } else {
            setMessage(`Imported ${normalized.length} events.`, false);
            displayEvents(normalized);
        }
    } catch (err) {
        console.error('Network or server error during import:', err);
        setMessage('Network error while importing calendar. See console for details.', true);
    }
}

// Real-time validation: enable/disable button and show hints
document.addEventListener('DOMContentLoaded', () => {
    fetchCalendarEvents();
    const input = document.getElementById('calendarLink');
    const button = input ? input.nextElementSibling : null; // current markup: input then button in same container

    if (!input) return;

    // initial message element creation
    getMessageEl();

    input.addEventListener('input', () => {
        const val = input.value.trim();
        if (!val) {
            setMessage('', false);
            if (button) button.disabled = false;
            return;
        }
        if (isValidCalendarUrl(val)) {
            setMessage('URL looks valid. You can import it.', false);
            if (button) button.disabled = false;
        } else {
            setMessage('URL does not look like a .ics link (must be http/https and contain .ics).', true);
            if (button) button.disabled = false; // still allow import in case some feeds don't use .ics extension
        }
    });
});

checkForUpdates(); // immediately on load
setInterval(checkForUpdates, 60000); // check every minute
