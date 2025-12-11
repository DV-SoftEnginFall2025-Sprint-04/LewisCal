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

        const rawCategory = event.category || getCategoryForEvent(event);
        const category = rawCategory.toLowerCase().replace(/\s+/g, "-");
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
                displayEvents([]);
                return;
            }

            displayEvents(events);
            setMessage(`Loaded ${events.length} events from file.`, false);
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
