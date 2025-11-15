function parseICS(icsText) {
    const events = [];
    const lines = icsText.split(/\r?\n/);

    let currentEvent = null;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // ics line folding
        while (i + 1 < lines.length && lines[i + 1].startsWith(" ")) {
            line += lines[i + 1].trim();
            i++;
        }

        if (line === "BEGIN:VEVENT") {
            currentEvent = {};
        } 
        else if (line === "END:VEVENT") {
            if (currentEvent) events.push(currentEvent);
            currentEvent = null;
        }
        else if (currentEvent) {
            const [key, ...rest] = line.split(":");
            const value = rest.join(":").trim();

            switch (key) {
                case "UID": currentEvent.uid = value; break;
                case "SUMMARY": currentEvent.summary = value; break;
                case "DESCRIPTION": currentEvent.description = value; break;
                case "LOCATION": currentEvent.location = value; break;
                case "DTSTART": currentEvent.start = parseICSTime(value); break;
                case "DTEND": currentEvent.end = parseICSTime(value); break;
                case "RRULE": currentEvent.rrule = value; break;
            }
        }
    }

    return events;
}

function parseICSTime(dt) {
    if (dt.endsWith("Z")) {
        return new Date(dt).toISOString();
    } else {
        return new Date(
            dt.substring(0,4) + "-" +
            dt.substring(4,6) + "-" +
            dt.substring(6,8) + "T" +
            dt.substring(9,11) + ":" +
            dt.substring(11,13) + ":00"
        ).toISOString();
    }
}

module.exports = { parseICS };
