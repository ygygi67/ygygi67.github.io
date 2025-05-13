const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// In-memory storage (replace with a database in production)
let songQueue = [];
let pendingSongs = [];
let isSystemEnabled = true;

// Routes
app.get('/api/queue', (req, res) => {
    res.json({
        queue: songQueue,
        pending: pendingSongs,
        isSystemEnabled
    });
});

app.post('/api/queue', (req, res) => {
    const { title, requester, link } = req.body;
    
    if (!title || !requester) {
        return res.status(400).json({ 
            success: false, 
            message: 'Title and requester are required' 
        });
    }

    const newSong = {
        id: Date.now().toString(),
        title,
        requester,
        link: link || '',
        played: false,
        timestamp: new Date().toISOString()
    };
    
    // Add to pending songs by default
    pendingSongs.push(newSong);
    
    console.log('New song added:', newSong); // Debug log
    console.log('Current pending songs:', pendingSongs); // Debug log
    
    res.json({ success: true, song: newSong });
});

app.post('/api/approve/:id', (req, res) => {
    const songId = req.params.id;
    const songIndex = pendingSongs.findIndex(song => song.id === songId);
    
    if (songIndex !== -1) {
        const song = pendingSongs[songIndex];
        songQueue.push(song);
        pendingSongs.splice(songIndex, 1);
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, message: 'Song not found' });
    }
});

app.post('/api/reject/:id', (req, res) => {
    const songId = req.params.id;
    const songIndex = pendingSongs.findIndex(song => song.id === songId);
    
    if (songIndex !== -1) {
        pendingSongs[songIndex].status = 'rejected';
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, message: 'Song not found' });
    }
});

app.post('/api/played/:id', (req, res) => {
    const songId = req.params.id;
    const song = songQueue.find(song => song.id === songId);
    
    if (song) {
        song.played = true;
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, message: 'Song not found' });
    }
});

app.delete('/api/song/:id', (req, res) => {
    const songId = req.params.id;
    const queueIndex = songQueue.findIndex(s => s.id === songId);
    const pendingIndex = pendingSongs.findIndex(s => s.id === songId);
    
    if (queueIndex !== -1) {
        songQueue.splice(queueIndex, 1);
    }
    if (pendingIndex !== -1) {
        pendingSongs.splice(pendingIndex, 1);
    }
    
    res.json({ success: true });
});

app.post('/api/system/toggle', (req, res) => {
    isSystemEnabled = !isSystemEnabled;
    res.json({ success: true, isSystemEnabled });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        message: 'Internal server error',
        error: err.message 
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 