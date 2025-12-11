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


// event display function
function displayEvents(events) {

    // remove events without start date
    events = events.filter(e => e.start);

    const container = document.getElementById("events");
    if (!container) return;

    container.innerHTML = "";

    if (!events || events.length === 0) {
        container.innerHTML = "<p>No events found.</p>";
        return;
    }

    // sort events by date
    events.sort((a, b) => new Date(a.start) - new Date(b.start));

    // event cards
    events.forEach(event => {
        const card = document.createElement("div");
        card.className = "event-card";

        const category = (event.category || "other").toLowerCase().replace(/\s+/g, "-");
        card.classList.add(`event-category-${category}`);

        card.innerHTML = `
            <h3>${event.title || "Untitled Event"}</h3>
            <p><strong>Date:</strong> ${formatDate(event.start)}</p>
            ${event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ""}
            ${event.description ? `<p>${cleanDescription(event.description)}</p>` : ""}
        `;

        container.appendChild(card);
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
    el.textContent = msg;
    el.style.color = isError ? "#b91c1c" : "#064e3b";
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

        //display events
        displayEvents(data.events);
        setMessage(`Loaded ${data.events.length} events`, false);

        //save url so it doesnt refresh and lose it
        localStorage.setItem("calendarURL", url);

    } catch (err) {
        console.error("Error importing:", err);
        setMessage("Network error importing calendar.", true);
    }
}


// auto refresh function updated to check for stored url
async function checkForUpdates() {
    try {
        const savedUrl = localStorage.getItem("calendarURL");

        if (!savedUrl) {
            console.log("No calendar URL saved. Skipping refresh.");
            return;
        }

        const fullUrl = `${BACKEND_URL}?url=${encodeURIComponent(savedUrl)}`;
        const res = await fetch(fullUrl);

        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

        const data = await res.json();

        if (data.updated && data.events) {
            displayEvents(data.events);
            setMessage("Calendar updated!", false);
        }

    } catch (err) {
        console.error("Failed to refresh calendar:", err);
    }
}


//page load: check for saved URL and load events
document.addEventListener("DOMContentLoaded", () => {
    const savedUrl = localStorage.getItem("calendarURL");

    if (savedUrl) {
        const fullUrl = `${BACKEND_URL}?url=${encodeURIComponent(savedUrl)}`;
        fetch(fullUrl)
            .then(res => res.json())
            .then(data => {
                if (data.events) displayEvents(data.events);
            })
            .catch(err => console.error("Load error:", err));
    }

    getMessageEl();
});

// auto-refresh every 60 seconds
setInterval(checkForUpdates, 60000);
