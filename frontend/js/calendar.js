async function checkForUpdates() {
    try {
        const res = await fetch("http://localhost:3001/api/refresh");
        
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        
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
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Events fetched:', data);
        
        if (data.events) {
            displayEvents(data.events);
        }
        
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

// Call on page load
document.addEventListener('DOMContentLoaded', fetchCalendarEvents);

checkForUpdates(); // immediately on load
setInterval(checkForUpdates, 60000); // check every minute
