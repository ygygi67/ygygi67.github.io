const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();

// Get port from environment variable or use 3000 as default
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

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

// Add new route for simple form submission
app.post('/add', (req, res) => {
    const { song } = req.body;
    
    if (!song) {
        return res.status(400).json({ 
            success: false, 
            message: 'Song title is required' 
        });
    }

    const newSong = {
        id: Date.now().toString(),
        title: song,
        requester: 'ผู้ใช้',
        link: '',
        played: false,
        timestamp: new Date().toISOString()
    };
    
    pendingSongs.push(newSong);
    
    console.log('New song added:', newSong);
    console.log('Current pending songs:', pendingSongs);
    
    res.json({ success: true, song: newSong });
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
    
    pendingSongs.push(newSong);
    
    console.log('New song added:', newSong);
    console.log('Current pending songs:', pendingSongs);
    
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

// Serve the main HTML file for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
    console.log(`Server running on port ${port}`);
}); 