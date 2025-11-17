async function checkForUpdates() {
    const res = await fetch("http://localhost:3001/api/refresh"); // replace with azure hosted url later
    const data = await res.json();

    if (data.updated) {
        console.log("Updated calendar data:", data.events);
        //need to display updated events in the calendar UI
    }
}

async function fetchCalendarEvents() {
    try {
        const response = await fetch('http://localhost:3001/api/refresh');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const events = await response.json();
        console.log('Events fetched:', events);
        
        // Process and display events
        displayEvents(events);
        
        return events;
    } catch (error) {
        console.error('Failed to fetch calendar events:', error);
    }
}

function displayEvents(events) {
    // Add your event display logic here
    events.forEach(event => {
        console.log(`Event: ${event.summary} at ${event.start}`);
    });
}

// Call on page load
document.addEventListener('DOMContentLoaded', fetchCalendarEvents);

checkForUpdates(); // immediately on load
setInterval(checkForUpdates, 60000); // check every minute
