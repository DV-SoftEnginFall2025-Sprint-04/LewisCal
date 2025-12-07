const request = require('supertest');
const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, '..', 'server.js');
const calendarPath = path.join(__dirname, '..', 'calendar.ics');

let app;

beforeAll(() => {
  app = require('../server'); // server.js must export the Express app
});

test('GET /api/refresh returns JSON with updated and events', async () => {
  const res = await request(app)
    .get('/api/refresh')
    .expect(200)
    .expect('Content-Type', /json/);

  expect(res.body).toHaveProperty('updated');
  expect(res.body).toHaveProperty('events');
});

test('refresh detects file-time changes on calendar.ics', async () => {
  // baseline call
  const first = await request(app).get('/api/refresh').expect(200);
  const originalStat = fs.statSync(calendarPath);
  const originalAtime = originalStat.atime;
  const originalMtime = originalStat.mtime;

  // bump mtime forward by 2 seconds to simulate update
  const newMtime = new Date(originalMtime.getTime() + 2000);
  fs.utimesSync(calendarPath, originalAtime, newMtime);

  // allow a small pause so the OS/filesystem registers the time change
  await new Promise(resolve => setTimeout(resolve, 300));

  // subsequent call should report updated = true (backend must check file mtime)
  const second = await request(app).get('/api/refresh').expect(200);
  expect(second.body).toHaveProperty('updated');
  expect(second.body.updated).toBeTruthy();

  // restore original times
  fs.utimesSync(calendarPath, originalAtime, originalMtime);
});