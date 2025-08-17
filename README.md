# Advanced Chess - Sidebar Game

A Chrome extension that offers a complete chess experience directly in the browser sidebar, optimized for players of all levels.

## 📋 Overview

This extension transforms Chrome's sidebar into an advanced chess platform, allowing you to play without interrupting your browsing. With support for human vs human and human vs bot modes, it offers a feature-rich experience.

## 🎯 Main Features

### 🎮 Game Modes
- **Human vs Human**: Local game for two players
- **Human vs Bot**: Artificial intelligence with 3 difficulty levels
  - **Easy**: Basic AI, ideal for beginners
  - **Medium**: Intermediate AI with moderate strategies
  - **Hard**: Advanced AI with deep analysis

### ♛ Game Features
- **Complete chess engine** with all official rules
- **Automatic detection** of check, checkmate and stalemate
- **Pawn promotion** with interactive piece selection
- **Castling** and **en passant** implemented
- **Complete move history** with algebraic notation
- **Undo system** for moves
- **Integrated timer** (15 minutes per player by default)

### 🎨 Interface and UX
- **Responsive design** optimized for sidebar (900px+ width)
- **Interactive board** with coordinates (a-h, 1-8)
- **Visual highlights** for valid moves and captures
- **Smooth animations** for piece movement
- **Captured pieces** displayed in real time
- **Move suggestions** available
- **Visual indicators** for check and last move

### ⚡ Performance and Compatibility
- **Manifest V3** - Compatible with latest specifications
- **Native Chrome Sidebar API**
- **No external dependencies** - Works offline
- **No data collection** - Completely private
- **Performance optimized** - Pure vanilla JavaScript

## 📁 Project Structure

```
chess/
├── manifest.json              # Chrome extension configuration
├── background.js              # Service worker for sidebar management
├── index.html                 # Main game interface
├── styles.css                 # Styles optimized for sidebar
├── chess.js                   # Chess engine and game logic
├── bot.js                     # Bot artificial intelligence
├── game.js                    # Main controller and UI
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
- **Board representation**: 8x8 array with piece objects
- **Move validation**: Specific algorithms per piece type
- **Check detection**: King threat analysis
- **Move generation**: Real-time valid moves list
- **Game state**: Complete position and history tracking

### Artificial Intelligence (`bot.js`)
- **Minimax algorithm** with alpha-beta pruning
- **Variable depth** based on difficulty:
  - Easy: 2 levels of depth
  - Medium: 3 levels of depth  
  - Hard: 4+ levels with optimizations
- **Evaluation function** considers:
  - Material value of pieces
  - Strategic positioning
  - Center control
  - King safety
  - Pawn structure

### Responsive Interface (`styles.css`)
- **CSS Grid** for board layout
- **Flexbox** for UI components
- **Media queries** for different sidebar sizes
- **CSS Custom Properties** for themes
- **CSS Animations** for visual feedback

### State Management (`game.js`)
- **Event listeners** for user interaction
- **State management** for current game mode
- **Timer management** with setInterval
- **Optimized DOM manipulation**
- **Modal handling** for promotions and game end

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
    hard: { depth: 4, randomness: 0.05 }
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

### v1.0.0 (Initial Release)
- ✅ Complete chess engine
- ✅ Human vs Human mode
- ✅ Human vs Bot mode (3 difficulties)
- ✅ Responsive sidebar interface
- ✅ Timer system
- ✅ Move history
- ✅ Check/checkmate detection
- ✅ Pawn promotion
- ✅ Manifest V3 compliance

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
