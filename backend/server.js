const express = require('express');
const cors = require('cors');
const refreshRoute = require('./routes/refresh');

const app = express();

// Enable CORS
app.use(cors());

const PORT = process.env.PORT || 3001;

app.use("/api/refresh", refreshRoute);

app.get("/", (req, res) => {
    res.send("LewisCal is running");
});

app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
