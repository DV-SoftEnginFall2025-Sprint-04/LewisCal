const express = require('express');
const fs = require('fs');
const path = require('path');
const { parseICS } = require('../utils/parseICS');

const router = express.Router();

router.get('/', (req, res) => {
    try {
        // Use relative path to calendar.ics
        const calendarPath = path.join(__dirname, '..', 'calendar.ics');
        
        // Check if file exists
        if (!fs.existsSync(calendarPath)) {
            return res.status(404).json({ 
                error: 'Calendar file not found',
                path: calendarPath 
            });
        }
        
        // Read and parse the ICS file
        const icsContent = fs.readFileSync(calendarPath, 'utf-8');
        const events = parseICS(icsContent);
        
        // Return events
        res.json({ 
            updated: true, 
            events: events,
            count: events.length
        });
    } catch (error) {
        console.error('Error in refresh route:', error);
        res.status(500).json({ 
            error: 'Unable to refresh calendar.',
            details: error.message 
        });
    }
});

module.exports = router;
