require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const cookieSession = require('cookie-session');
const bodyParser = require('body-parser');
const path = require('path');

const User = require('./models/User');

const app = express();

// --- DB CONNECTION ---
// Ensure you set MONGO_URI in .env
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// --- MIDDLEWARE ---
app.use(bodyParser.json());
app.use(
  cookieSession({
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    keys: [process.env.COOKIE_KEY || 'secret_key']
  })
);
app.use(passport.initialize());
app.use(passport.session());

// --- STATIC FILES ---
// Serve the frontend files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// --- PASSPORT CONFIG ---
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id).then(user => {
    done(null, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/auth/google/callback',
      proxy: true
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const existingUser = await User.findOne({ googleId: profile.id });
        if (existingUser) {
          return done(null, existingUser);
        }
        const user = await new User({
          googleId: profile.id,
          displayName: profile.displayName
        }).save();
        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

// --- AUTH ROUTES ---
app.get(
  '/auth/google',
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })
);

app.get(
  '/auth/google/callback',
  passport.authenticate('google'),
  (req, res) => {
    res.redirect('/');
  }
);

app.get('/api/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

app.get('/api/current_user', (req, res) => {
  res.send(req.user);
});

// --- GAME API ROUTES ---

// Update Score logic
app.post('/api/game-result', async (req, res) => {
  if (!req.user) {
    return res.status(401).send({ error: 'You must log in to save stats.' });
  }

  const { difficulty, result } = req.body; // difficulty: 'easy'|'medium'|'hard', result: 'win'|'lose'

  if (!['easy', 'medium', 'hard'].includes(difficulty)) {
    return res.status(400).send({ error: 'Invalid difficulty' });
  }

  try {
    const user = await User.findById(req.user.id);
    
    if (result === 'win') {
      // Increment current streak
      user.streaks[difficulty] += 1;
      
      // Update max streak if current exceeds it
      if (user.streaks[difficulty] > user.streaks.maxStreaks[difficulty]) {
        user.streaks.maxStreaks[difficulty] = user.streaks[difficulty];
      }
    } else if (result === 'lose') {
      // Reset current streak to 0
      user.streaks[difficulty] = 0;
    }

    await user.save();
    res.send(user);
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: 'Database update failed' });
  }
});

// Leaderboard logic
app.get('/api/leaderboard', async (req, res) => {
  const { difficulty } = req.query;

  if (!['easy', 'medium', 'hard'].includes(difficulty)) {
    return res.status(400).send({ error: 'Invalid difficulty' });
  }

  // Dynamic sort key, e.g., 'streaks.maxStreaks.easy'
  const sortKey = `streaks.maxStreaks.${difficulty}`;
  
  try {
    const leaders = await User.find({})
      .sort({ [sortKey]: -1 }) // Sort descending by maxStreak of that difficulty
      .limit(10)
      .select(`displayName streaks.maxStreaks.${difficulty}`); // Optimize selection

    // Map to cleaner format
    const formatted = leaders.map(l => ({
      name: l.displayName,
      score: l.streaks.maxStreaks[difficulty]
    }));

    res.send(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: 'Fetch failed' });
  }
});

// Fallback for SPA (though we are serving static files, this ensures hitting / refreshes index.html)
app.get('*', (req, res) => {
    // If request is not an api call, serve index
    if (!req.path.startsWith('/api') && !req.path.startsWith('/auth')) {
        res.sendFile(path.resolve(__dirname, '../public', 'index.html'));
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});