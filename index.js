require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');

const app = express();
app.use(cors({
  origin: '*' // Temporarily allowing all origins to debug connection
}));
app.use(express.json());

const PORT = process.env.PORT || 5000;
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'mock' });

// Mock database of songs
const mockDatabase = [
    { id: '1', title: 'Aashiqui 2 Theme', artist: 'Mithoon', genre: 'Bollywood', mood: 'Romantic', energy: 'Low', bpm: 90, image: 'https://i.scdn.co/image/ab67616d0000b2734a946b5a593361df4b5b7668' },
    { id: '2', title: 'Sanam Teri Kasam', artist: 'Ankit Tiwari', genre: 'Bollywood', mood: 'Sad', energy: 'Medium', bpm: 100, image: 'https://i.scdn.co/image/ab67616d0000b273b067d5e4b600d810fec6550f' },
    { id: '3', title: 'Levitating', artist: 'Dua Lipa', genre: 'Pop', mood: 'Happy', energy: 'High', bpm: 103, image: 'https://i.scdn.co/image/ab67616d0000b273bd22dee1e1b8b7ed6ebf1cf5' },
    { id: '4', title: 'Blinding Lights', artist: 'The Weeknd', genre: 'Synthpop', mood: 'Energetic', energy: 'High', bpm: 171, image: 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36' },
    { id: '5', title: 'Lofi Study', artist: 'Chillhop', genre: 'Lofi', mood: 'Focus', energy: 'Low', bpm: 70, image: 'https://i.scdn.co/image/ab67616d0000b273a216db81a97d919ad77d33b3' },
    { id: '6', title: 'Gym Motivation', artist: 'Various', genre: 'Electronic', mood: 'Workout', energy: 'High', bpm: 130, image: 'https://i.scdn.co/image/ab67616d0000b27375a069811f26fae3b3fbaf32' },
    { id: '7', title: 'Perfect', artist: 'Ed Sheeran', genre: 'Pop', mood: 'Romantic', energy: 'Low', bpm: 95, image: 'https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96' },
    { id: '8', title: 'Eye of the Tiger', artist: 'Survivor', genre: 'Rock', mood: 'Workout', energy: 'High', bpm: 109, image: 'https://i.scdn.co/image/ab67616d0000b273b5bd57e51c890a200ea7603c' },
    { id: '9', title: 'Weightless', artist: 'Marconi Union', genre: 'Ambient', mood: 'Relax', energy: 'Low', bpm: 60, image: 'https://i.scdn.co/image/ab67616d0000b2738ea0b5710ea161049b4c023d' },
    { id: '10', title: 'Don\'t Stop Me Now', artist: 'Queen', genre: 'Rock', mood: 'Happy', energy: 'High', bpm: 156, image: 'https://i.scdn.co/image/ab67616d0000b273e319baafd16e84f0408af2a0' },
    { id: '11', title: 'Uptown Funk', artist: 'Mark Ronson ft. Bruno Mars', genre: 'Funk', mood: 'Party', energy: 'High', bpm: 115, image: 'https://i.scdn.co/image/ab67616d0000b273e86c0cc247cf77ec8d3ce16b' },
    { id: '12', title: 'Beethoven Piano Sonata 14', artist: 'Beethoven', genre: 'Classical', mood: 'Focus', energy: 'Low', bpm: 75, image: 'https://i.scdn.co/image/ab67616d0000b273a553075c2e307ee15c1e5509' },
    { id: '13', title: 'Deep Sleep', artist: 'Calm Music', genre: 'Ambient', mood: 'Relax', energy: 'Low', bpm: 50, image: 'https://i.scdn.co/image/ab67616d0000b273b5220c324eb29ef973347f3b' },
    { id: '14', title: 'Life is a Highway', artist: 'Tom Cochrane', genre: 'Rock', mood: 'Happy', energy: 'High', bpm: 103, image: 'https://i.scdn.co/image/ab67616d0000b273b7a5a8a68b55615d8628b030' },
    { id: '15', title: 'Shut Up and Dance', artist: 'WALK THE MOON', genre: 'Pop', mood: 'Happy', energy: 'High', bpm: 128, image: 'https://i.scdn.co/image/ab67616d0000b273b5b630a905be800c73df65e9' },
    { id: '16', title: 'Here Comes The Sun', artist: 'The Beatles', genre: 'Rock', mood: 'Happy', energy: 'Medium', bpm: 129, image: 'https://i.scdn.co/image/ab67616d0000b273e86c0cc247cf77ec8d3ce16b' },
    { id: '17', title: 'Put Your Records On', artist: 'Corinne Bailey Rae', genre: 'R&B', mood: 'Happy', energy: 'Medium', bpm: 95, image: 'https://i.scdn.co/image/ab67616d0000b2734a946b5a593361df4b5b7668' }
];

// Phase 3: In-memory session store for dynamic vibe calibration
const activeSessions = {};

// 1. Vibe Mapping Service (Rule-based)
const vibeMap = {
    'discover': { targetEnergy: 'Medium', targetMood: 'Happy' },
    'focus': { targetEnergy: 'Low', targetMood: 'Focus' },
    'relax': { targetEnergy: 'Low', targetMood: 'Relax' },
    'workout': { targetEnergy: 'High', targetMood: 'Workout' },
    'party': { targetEnergy: 'High', targetMood: 'Party' },
    'roadtrip': { targetEnergy: 'High', targetMood: 'Happy' }
};

app.post('/api/vibe/map', (req, res) => {
    const { vibeId } = req.body;
    
    if (!vibeId || !vibeMap[vibeId]) {
        return res.status(400).json({ error: 'Invalid or missing vibe ID' });
    }

    const audioTraits = vibeMap[vibeId];
    res.json({ audioTraits });
});

// Phase 2: NLP Intent Extraction via Groq
app.post('/api/vibe/nlp', async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Missing text input' });

    try {
        if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'mock') {
            // Mock response if no key is provided
            console.log(`[Mock Groq] Parsing vibe for: "${text}"`);
            const mockTraits = {
                targetEnergy: text.toLowerCase().includes('workout') || text.toLowerCase().includes('upbeat') ? 'High' : 'Low',
                targetMood: text.toLowerCase().includes('sad') ? 'Sad' : 'Happy'
            };
            return res.json({ audioTraits: mockTraits, explanation: `Mocked: Extracted ${mockTraits.targetEnergy} energy.` });
        }

        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "You are a music vibe extractor. Map the user's natural language vibe to two audio traits: 'targetEnergy' (Low, Medium, High) and 'targetMood' (Happy, Sad, Focus, Romantic, Energetic, Workout, Relax, Party). Output ONLY valid JSON in the format: { \"targetEnergy\": \"...\", \"targetMood\": \"...\" }." },
                { role: "user", content: text }
            ],
            model: "llama-3.1-8b-instant",
            temperature: 0.2,
            response_format: { type: "json_object" }
        });

        const traits = JSON.parse(completion.choices[0].message.content);
        res.json({ audioTraits: traits, explanation: 'Parsed via Groq LLM' });
    } catch (error) {
        console.error('Groq Error:', error);
        res.status(500).json({ error: 'Failed to process vibe via LLM' });
    }
});

// Phase 3: Vibe Calibration Service (Real-time Feedback)
app.post('/api/vibe/feedback', (req, res) => {
    const { sessionId, action, trackId } = req.body;
    
    if (!sessionId || !activeSessions[sessionId]) {
        return res.status(400).json({ error: 'Invalid or expired session' });
    }

    const session = activeSessions[sessionId];
    const track = mockDatabase.find(t => t.id === trackId);
    
    if (!track) {
        return res.status(400).json({ error: 'Track not found' });
    }

    // Dynamic adjustment logic based on user action
    if (action === 'skip') {
        // If user skips a track, move energy in the opposite direction
        if (track.energy === 'High' && session.audioTraits.targetEnergy === 'High') {
            session.audioTraits.targetEnergy = 'Medium';
        } else if (track.energy === 'Medium' && session.audioTraits.targetEnergy === 'Medium') {
            session.audioTraits.targetEnergy = 'Low';
        } else if (track.energy === 'Low' && session.audioTraits.targetEnergy === 'Low') {
            session.audioTraits.targetEnergy = 'Medium';
        }
    } else if (action === 'like') {
        // Reinforce mood and energy
        session.audioTraits.targetMood = track.mood;
        session.audioTraits.targetEnergy = track.energy;
    }

    res.json({ success: true, updatedTraits: session.audioTraits });
});

// 2. Recommendation Filtering Engine
app.post('/api/recommendations', (req, res) => {
    const { sessionId, audioTraits } = req.body;
    
    if (!audioTraits && !sessionId) {
        // Return standard popular tracks if no vibe is set
        return res.json({ recommendations: mockDatabase.slice(0, 3) });
    }

    let traitsToUse = audioTraits;

    // Phase 3: Handle Session Context
    if (sessionId) {
        if (!activeSessions[sessionId]) {
            // Initialize new session
            activeSessions[sessionId] = { audioTraits: audioTraits ? { ...audioTraits } : null };
        } else if (audioTraits !== undefined) {
            // Update session with new explicit vibe or clear it if null
            activeSessions[sessionId].audioTraits = audioTraits ? { ...audioTraits } : null;
        }
        if (activeSessions[sessionId] && activeSessions[sessionId].audioTraits) {
            // Use dynamically calibrated traits
            traitsToUse = activeSessions[sessionId].audioTraits;
        }
    }

    if (!traitsToUse) {
        return res.json({ recommendations: mockDatabase.slice(0, 3) });
    }

    // Strict match (both energy and mood)
    let filteredTracks = mockDatabase.filter(track => 
        track.energy === traitsToUse.targetEnergy && track.mood === traitsToUse.targetMood
    );

    // Fallback 1: Match only by mood
    if (filteredTracks.length === 0) {
        filteredTracks = mockDatabase.filter(track => track.mood === traitsToUse.targetMood);
    }
    
    // Fallback 2: Match only by energy
    if (filteredTracks.length === 0) {
        filteredTracks = mockDatabase.filter(track => track.energy === traitsToUse.targetEnergy).slice(0, 3);
    }

    // Fallback 3: Return defaults if absolutely no matches
    if (filteredTracks.length === 0) {
        filteredTracks = mockDatabase.slice(0, 3);
    }

    res.json({ recommendations: filteredTracks, activeTraits: traitsToUse });
});

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
