# Advanced Chess - Sidebar Game

Chrome extension that brings a full chess experience to the browser side panel, now with themes, sounds, board flip, saved preferences, and improved accessibility/AI handling.

## 📋 Overview

This extension transforms Chrome's sidebar into an advanced chess platform, allowing you to play without interrupting your browsing. With support for human vs human and human vs bot modes, it offers a feature-rich experience.

## 🎯 Main Features

### 🎮 Game Modes
- **Human vs Human**
- **Human vs Bot**: AI with 3 difficulty levels (Easy, Medium, Hard)

### ♛ Game Rules
- Official rules: check/checkmate/stalemate, en passant, castling, promotion
- Draws: insufficient material, threefold repetition, 50-move rule
- Undo with full state restoration

### 🤖 AI
- Minimax with alpha-beta pruning, positional evaluation, move ordering, and quiescence
- Depth per difficulty (2/3/3 plies) with async yielding to keep the UI responsive
- Explicit color handling so the bot only moves its own side

### 🎨 Interface and UX
- **Responsive board** with `clamp()` sizing and optional flip
- **Themes**: classic, dark, high-contrast
- **Sound toggle** with move/capture/check/gameover cues
- **Time controls** presets (5, 10, 15, 30 minutes)
- **Preferences persistence** (theme, sound, flip, time)
- **Grouped move history** by move number with improved contrast per theme
- **Castling hints** explaining unavailability
- Promotion modal with shortcuts (Q/R/B/N) and labels
- Control labels, move list, and captured pieces tuned for readability

### ⚡ Performance and Compatibility
- **Manifest V3** (side panel API)
- Works fully offline, no external dependencies
- Privacy-first (no data collection)

## 📁 Project Structure

```
chess/
├── manifest.json              # Chrome extension configuration
├── background.js              # Service worker for sidebar management
├── index.html                 # Main game interface and controls (themes, flip, timers, sound)
├── styles.css                 # Responsive styles, themes, accessibility
├── chess.js                   # Chess engine and game logic
├── bot.js                     # Bot artificial intelligence
├── game.js                    # Main controller, UI, persistence, sounds
├── icons/                     # Extension icons
│   ├── icon16.png            # 16x16 icon
│   ├── icon32.png            # 32x32 icon
│   ├── icon48.png            # 48x48 icon
│   ├── icon128.png           # 128x128 icon
│   └── chess_logo_*.svg      # SVG logos (various versions)
└── README.md                  # Project documentation
```

## 🔧 Technical Details

### Manifest V3 Configuration
```json
{
  "manifest_version": 3,
  "permissions": ["sidePanel"],
  "action": { "default_title": "Open Chess Game" },
  "side_panel": { "default_path": "index.html" },
  "background": { "service_worker": "background.js" }
}
```

### Chess Engine (`chess.js`)
- 8x8 board with pieces, move validation per piece
- King safety in simulations (en passant, castling transit squares)
- Draws: threefold repetition, 50-move rule, insufficient material
- Full state saved for undo (castling rights, en passant, halfmove clock, hasMoved)

### Artificial Intelligence (`bot.js`)
- Minimax + alpha-beta, depth by difficulty (2/3/3) with transposition table and move ordering
- Positional evaluation (material, tables, center, king safety, pawn structure) and quiescence
- Async best-move path to avoid UI stalls on harder searches
- AI turn is bound to its configured color

### Interface (`index.html`, `styles.css`, `game.js`)
- Responsive board sizing via CSS variables and `clamp()`
- Themes (classic/dark/high-contrast) and sound toggle
- Flip board with corrected selection on flipped layouts
- Grouped move list, castling hints, and higher-contrast move/captured displays
- Promotion shortcuts (Q/R/B/N) and labeled buttons
- Time controls (5/10/15/30) and low-time highlight
- Preferences persisted in `localStorage`

### State Management (`game.js`)
- Event handling, timers, persistence, sounds
- AI turn coordination bound to AI color with async scheduling for hard searches
- Promotion flow with modal shortcuts

## 🚀 Installation and Development

### User Installation
1. Download/clone the repository
2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the project folder

### Local Development
```bash
# Clone repository
git clone [repository-url]
cd chess

# No build process - extension ready to use
# Modify files directly and reload extension
```

### Development Structure
- **No bundlers** - Vanilla JavaScript
- **No preprocessors** - Pure CSS
- **No frameworks** - Optimized performance
- **Manual hot reload** via Chrome DevTools

## ⚙️ Configuration and Customization

### Modify Bot Difficulties
Edit `bot.js`:
```javascript
const DIFFICULTY_SETTINGS = {
  easy: { depth: 2, randomness: 0.3 },
  medium: { depth: 3, randomness: 0.15 },
  hard: { depth: 3, randomness: 0.05 }
};
```

### Adjust Default Timer
Edit `game.js`:
```javascript
const DEFAULT_TIME_MINUTES = 15; // Change as needed
```

### Customize Board Colors
Edit `styles.css`:
```css
.square.light { background-color: #f0d9b5; }
.square.dark { background-color: #b58863; }
```

### Modify Minimum Sidebar Width
Edit `styles.css`:
```css
body { min-width: 900px; } /* Change as needed */
```

## 🐛 Debugging and Troubleshooting

### Common Issues
1. **Icons don't appear**: Check if PNGs exist in `icons/` folder
2. **Sidebar doesn't open**: Check manifest permissions
3. **Bot doesn't work**: Check console for JavaScript errors
4. **Broken layout**: Check minimum sidebar width

### DevTools
- **Sidebar debugging**: Right-click sidebar → "Inspect"
- **Background script**: `chrome://extensions/` → "Details" → "Inspect views"
- **Performance**: Chrome DevTools → Performance tab

### Logging
```javascript
// Enable detailed logs in game.js
const DEBUG_MODE = true;
```

## 📊 Performance Metrics

### Typical Benchmarks
- **Load time**: < 100ms
- **Click response**: < 16ms
- **Move calculation (Easy)**: < 50ms
- **Move calculation (Hard)**: < 500ms
- **Memory usage**: < 10MB

### Implemented Optimizations
- **Event delegation** to reduce listeners
- **Animation debouncing**
- **Lazy loading** of heavy calculations
- **Memory cleanup** on state changes

## 🔒 Security and Privacy

### Content Security Policy
```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self';"
}
```

### Privacy
- **No user tracking**
- **No external analytics**
- **No game data collection**
- **Complete local processing**
- **No network connections** during gameplay

## 📈 Metrics and Analytics

### Data Not Collected
- Game moves
- Play time
- User preferences
- Performance data
- System information

### Internal Monitoring
- Local error logs only
- No external telemetry
- Optional debugging via DevTools

## 🤝 Contributing

### Guidelines
1. Maintain Manifest V3 compatibility
2. Preserve offline functionality
3. Optimize for performance
4. Follow existing code standards
5. Test on different resolutions

### Areas for Contribution
- Bot AI improvements
- New visual themes
- Performance optimizations
- Additional features
- Automated testing

## 📝 Changelog

### v2.0.0
- ✅ AI bound to its color so the bot never moves the player's pieces
- ✅ Hard difficulty capped to depth 3 with async yielding to keep the UI responsive
- ✅ Improved readability for move list, captured pieces, and control labels across themes
- ✅ Flip-board selection fix for accurate targeting when flipped

### v1.1.0
- ✅ Themes (classic/dark/high-contrast)
- ✅ Sound toggle with cues
- ✅ Flip board
- ✅ Time controls presets and persistence
- ✅ Move history grouping and castling hints
- ✅ Rule completeness: threefold, 50-move rule, safer castling/en passant

### v1.0.0
- Initial release

## 📄 License

This project is under MIT license. See the LICENSE file for details.

## 🆘 Support

For bugs, suggestions or contributions:
1. Open an issue in the repository
2. Describe the problem in detail
3. Include steps to reproduce
4. Attach screenshots if applicable

---

**Developed to provide the best chess experience in Chrome's sidebar** ♔
