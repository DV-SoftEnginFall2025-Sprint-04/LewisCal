async function checkForUpdates() {
    const res = await fetch("http://localhost:3001/api/refresh"); // replace with azure hosted url later
    const data = await res.json();

    if (data.updated) {
        console.log("Updated calendar data:", data.events);
        //need to display updated events in the calendar UI
    }
}

checkForUpdates(); // immediately on load
setInterval(checkForUpdates, 60000); // check every minute
