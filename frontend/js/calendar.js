//backend url
const BACKEND_URL = "https://lewiscalbackend-a2c5ctddhwcthehx.canadacentral-01.azurewebsites.net/api/refresh";

//update checking
async function checkForUpdates() {
    try {
        const res = await fetch(BACKEND_URL);
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

        const data = await res.json();
        if (data.updated && data.events) {
            displayEvents(data.events);
            setMessage("Calendar updated!", false);
        }
    } catch (err) {
        console.error("Failed to check for updates:", err);
        setMessage("Failed to refresh calendar.", true);
    }
}

async function fetchCalendarEvents() {
    try {
        const res = await fetch(BACKEND_URL);
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

        const data = await res.json();
        if (data.events) displayEvents(data.events);

        return data.events;
    } catch (err) {
        console.error("Failed to fetch calendar events:", err);
        setMessage("Failed to load calendar events.", true);
    }
}


//cleaner formatting
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
        //remove Google Meet info
        .replace(/Join with Google Meet:.*/gi, "")
        .replace(/https:\/\/meet\.google\.com\/\S+/gi, "")
        .replace(/More phone numbers:.*/gi, "")
        .replace(/Learn more about Meet.*/gi, "")
        .replace(/Dial:.*/gi, "")

        // Remove phone numbers
        .replace(/\+?1?\s*\(?\d{3}\)?[-\s]*\d{3}[-\s]*\d{4}/g, "")

        // Remove URLs
        .replace(/https?:\/\/\S+/gi, "")

        .replace(/Information provided by.*/gi, "")
        .replace(/Provided under license.*/gi, "")
        .replace(/\\n/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}


// display events
function displayEvents(events) {

    events = events.filter(e => e.start);
    
    const container = document.getElementById("events");
    if (!container) return;

    container.innerHTML = "";

    if (!events || events.length === 0) {
        container.innerHTML = "<p>No events found.</p>";
        return;
    }

    // event sort
    events.sort((a, b) => new Date(a.start) - new Date(b.start));

    events.forEach(event => {
        const card = document.createElement("div");
        card.className = "event-card";

        card.innerHTML = `
            <h3>${event.title || "Untitled Event"}</h3>

            <p><strong>Date:</strong> ${formatDate(event.start)}</p>

            ${event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ""}

            ${event.description ? `<p>${cleanDescription(event.description)}</p>` : ""}

            <p class="source-tag">${event.source}</p>
        `;

        container.appendChild(card);
    });
}


//validate calendar URL
function isValidCalendarUrl(url) {
    if (!url) return false;
    try {
        const u = new URL(url.trim());
        return u.protocol === "http:" || u.protocol === "https:";
    } catch {
        return false;
    }
}


//message handling
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
    el.textContent = msg;
    el.style.color = isError ? "#b91c1c" : "#064e3b";
}


//import calendar function
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

        displayEvents(data.events);
        setMessage(`Loaded ${data.events.length} events`, false);

    } catch (err) {
        console.error("Error importing:", err);
        setMessage("Network error importing calendar.", true);
    }
}


// load events on page load
document.addEventListener("DOMContentLoaded", () => {
    fetchCalendarEvents();
    getMessageEl();
});

//auto refresh
checkForUpdates();
setInterval(checkForUpdates, 60000);
