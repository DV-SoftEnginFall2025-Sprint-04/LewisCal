function parseICS(icsText) {
    const events = [];
    const lines = icsText.split(/\r?\n/);

    let currentEvent = null;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();

        // Skip empty lines
        if (!line) continue;

        // ICS line folding - handle continued lines
        while (i + 1 < lines.length && lines[i + 1].startsWith(" ")) {
            i++;
            line += lines[i].trim();
        }

        if (line === "BEGIN:VEVENT") {
            currentEvent = {};
        } 
        else if (line === "END:VEVENT") {
            if (currentEvent) {
                events.push(currentEvent);
            }
            currentEvent = null;
        }
        else if (currentEvent) {
            const colonIndex = line.indexOf(":");
            if (colonIndex > -1) {
                const key = line.substring(0, colonIndex).split(";")[0];
                const value = line.substring(colonIndex + 1).trim();

                switch (key) {
                    case "UID": 
                        currentEvent.uid = value; 
                        break;
                    case "SUMMARY": 
                        currentEvent.summary = value; 
                        break;
                    case "DESCRIPTION": 
                        currentEvent.description = value; 
                        break;
                    case "LOCATION": 
                        currentEvent.location = value; 
                        break;
                    case "DTSTART": 
                        currentEvent.start = parseICSTime(value); 
                        break;
                    case "DTEND": 
                        currentEvent.end = parseICSTime(value); 
                        break;
                    case "RRULE": 
                        currentEvent.rrule = value; 
                        break;
                }
            }
        }
    }

    return events;
}

function parseICSTime(dt) {
    try {
        if (dt.endsWith("Z")) {
            return new Date(dt).toISOString();
        } else if (dt.includes("T")) {
            return new Date(dt).toISOString();
        } else {
            // Format: YYYYMMDD
            return new Date(
                dt.substring(0, 4) + "-" +
                dt.substring(4, 6) + "-" +
                dt.substring(6, 8)
            ).toISOString();
        }
    } catch (error) {
        console.error('Error parsing time:', dt, error);
        return null;
    }
}

module.exports = { parseICS };
