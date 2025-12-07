const express = require('express');
const cors = require('cors');
const refreshRoute = require('./routes/refresh');
const fs = require('fs');
const path = require('path');

const app = express();

const PORT = process.env.PORT || 3001;

//handle CORS
app.use(cors({
    origin: "*",   // allow all origins
    methods: ["GET", "POST"]
}));

app.use(express.json());

//routes
app.use("/api/refresh", refreshRoute);

app.get("/", (req, res) => {
    res.send("LewisCal Backend is Running");
});

//optioon to store calendar URL
app.post("/api/save-calendar-url", (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: "Missing calendar URL" });
    }

    const storagePath = path.join(__dirname, "storage.json");
    const data = { calendarUrl: url };

    fs.writeFile(storagePath, JSON.stringify(data, null, 2), (err) => {
        if (err) {
            console.error("Failed to save URL:", err);
            return res.status(500).json({ error: "Could not save URL" });
        }

        res.json({ success: true, message: "Calendar URL saved!" });
    });
});

//start server
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
