const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parseICS } = require('../utils/parseICS');

const router = express.Router();

let lastHash = null;
let lastEvents = [];

// local or remote calendar source
const calendarSource = "C:\\Users\\Ilias Yeck\\Documents\\GitHub\\LewisCal\\backend\\calendar.ics";


router.get("/", async (req, res) => {
    try {
        let icsText;

        if (calendarSource.startsWith("http")) {
            const response = await fetch(calendarSource);
            icsText = await response.text();
        } else {
            icsText = fs.readFileSync(calendarSource, "utf8");
        }

        const newHash = crypto.createHash("sha256").update(icsText).digest("hex");

        if (newHash !== lastHash) {
            lastHash = newHash;
            lastEvents = parseICS(icsText);

            return res.json({
                updated: true,
                events: lastEvents
            });
        }

        res.json({ updated: false });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Unable to refresh calendar." });
    }
});

module.exports = router;
