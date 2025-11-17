const express = require('express');
const cors = require('cors');
const refreshRoute = require('./routes/refresh');
const fetch = require('node-fetch');
const ical = require('ical');
const fs = require('fs');
const path = require('path');

const app = express();

// Enable CORS
app.use(cors());
app.use(express.json());


const PORT = process.env.PORT || 3001;

app.use("/api/refresh", refreshRoute);

app.get("/", (req, res) => {
    res.send("LewisCal is running");
});

app.post('/import-ics', async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: "Missing calendar URL" });
        }

        const response = await fetch(url);
        const icsText = await response.text();

        const events = ical.parseICS(icsText);

        res.json(events);

    } catch (error) {
        console.error("ICS import failed:", error);
        res.status(500).json({ error: "Failed to import calendar" });
    }
});

app.post('/api/save-calendar-url', (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: "Missing calendar URL" });
    }

    const storagePath = path.join(__dirname, 'storage.json');

    const data = { calendarUrl: url };

    fs.writeFile(storagePath, JSON.stringify(data, null, 2), (err) => {
        if (err) {
            console.error("Failed to save URL:", err);
            return res.status(500).json({ error: "Could not save URL" });
        }

        res.json({ success: true, message: "Calendar URL saved!" });
    });
});

app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
