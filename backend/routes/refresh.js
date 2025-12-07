// updated to add error handling for bad urls, missing fields, bad fetches
// and to merge in hardcoded scholarship events
//return everything in the unified event object format
//should be ready for pasting calendar link

const express = require('express');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { parseICS, createEventObject } = require('../utils/parseICS');

const router = express.Router();

//hardcoded celebration of scholarship events
const scholarshipEvents = [
    createEventObject({
        id: "sch-001",
        title: "Celebration of Scholarship Opening Ceremony",
        start: "2025-04-15T13:00:00.000Z",
        end: "2025-04-15T14:00:00.000Z",
        location: "Lewis University",
        description: "Opening event for the Celebration of Scholarship.",
        source: "scholarship"
    }),
    createEventObject({
        id: "sch-002",
        title: "Capstone Team Poster Session",
        start: "2025-04-15T15:00:00.000Z",
        end: "2025-04-15T17:00:00.000Z",
        location: "St. Charles Borromeo",
        description: "Students present their capstone projects.",
        source: "scholarship"
    })
];

// refresh route
router.get('/', async (req, res) => {
    try {
        //local or user-provided URL
        const calendarURL = req.query.url;  

        let icsContent = "";

        //user-provided URL
        if (calendarURL && calendarURL.startsWith("http")) {
            try {
                const response = await fetch(calendarURL);

                if (!response.ok) {
                    return res.status(400).json({
                        error: "Invalid calendar link.",
                        status: response.status
                    });
                }

                icsContent = await response.text();
            } catch (err) {
                return res.status(500).json({
                    error: "Unable to fetch calendar URL.",
                    details: err.message
                });
            }
        } 
        //fallback to local calendar.ics file
        else {
            const calendarPath = path.join(__dirname, '..', 'calendar.ics');

            if (!fs.existsSync(calendarPath)) {
                return res.status(404).json({
                    error: "Local calendar.ics file not found.",
                    path: calendarPath
                });
            }

            icsContent = fs.readFileSync(calendarPath, 'utf-8');
        }

        // parse ICS content
        const parsedEvents = parseICS(icsContent);

        // marge scholarship events
        const allEvents = [...parsedEvents, ...scholarshipEvents];

        res.json({
            updated: true,
            totalEvents: allEvents.length,
            importedEvents: parsedEvents.length,
            scholarshipEvents: scholarshipEvents.length,
            events: allEvents
        });

    } catch (error) {
        console.error("Refresh Route Error:", error);

        res.status(500).json({
            error: "Unable to refresh calendar.",
            details: error.message
        });
    }
});

module.exports = router;
