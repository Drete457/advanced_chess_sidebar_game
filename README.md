# 🏆 Advanced Chess Game

A feature-complete chess game built with HTML5, CSS3, and JavaScript. Fully functional offline with modern UI and comprehensive chess rules implementation.

## ✨ Features

### 🎮 Game Modes
- **Human vs Human**: Play against another player locally
- **Human vs Bot**: Play against AI with 3 difficulty levels
  - Easy: Basic moves
  - Medium: Strategic thinking
  - Hard: Advanced AI with deep analysis

### 🎯 Complete Chess Rules
- ✅ All piece movements (King, Queen, Rook/Tower, Bishop, Knight/Horse, Pawn)
- ✅ Special moves: Castling (O-O, O-O-O)
- ✅ En passant capture
- ✅ Pawn promotion with choice modal (Queen, Tower, Bishop, Horse)
- ✅ Check and checkmate detection
- ✅ Stalemate detection
- ✅ Move validation and legal move highlighting

### 🎨 Visual Features
- 🎨 Beautiful gradient background
- 🎨 Responsive chess board with hover effects
- 🎨 Piece highlighting and movement animations
- 🎨 Coordinate system (a-h, 1-8) with perfect alignment
- 🎨 Visual indicators for:
  - Selected pieces (green highlight)
  - Valid moves (blue dots)
  - Capture moves (red borders)
  - Last move highlight
  - Check warning (red blinking)

### 📊 Game Information
- ⏱️ Chess timer (15 minutes per player)
- 📜 Complete move history with player indicators
- 🔄 Auto-scrolling move history
- 🎯 Possible moves display
- 👥 Current player indicator
- 🏆 Captured pieces display

### 🎮 Controls & Shortcuts

#### Mouse Controls
- **Click piece**: Select/deselect pieces
- **Click highlighted square**: Move selected piece
- **Promotion modal**: Click desired piece during pawn promotion

#### Keyboard Shortcuts
- **New Game**: Click "New Game" button or use modal
- **Undo Move**: Click "Undo" button
- **Game Mode**: Use dropdown to switch between Human vs Human / Human vs Bot
- **AI Difficulty**: Select Easy/Medium/Hard when playing against bot

### 📱 Responsive Design
- 💻 Desktop: Full-featured layout with side panels
- 📱 Tablet: Adaptive layout for medium screens
- 📱 Mobile: Optimized for small screens with touch controls

### 🚀 Technical Features
- ⚡ Fully functional offline
- 🎯 No external dependencies
- 🎨 Modern CSS with animations and effects
- 🧠 Smart AI with strategic evaluation
- 📊 Comprehensive move notation (e.g., "H: g1 - f3", "K: e1 - g1 (Castling)")

## 🎯 How to Play

1. **Start**: Open `index.html` in any modern web browser
2. **Choose Mode**: Select Human vs Human or Human vs Bot
3. **Select Difficulty**: If playing against bot, choose difficulty level
4. **Make Moves**: Click pieces to select, then click destination squares
5. **Special Moves**: 
   - Castling: Move king two squares toward rook
   - En Passant: Capture pawn that just moved two squares
   - Promotion: Choose piece when pawn reaches end rank

## 🎮 Game Controls

### Piece Notation
- **K**: King
- **Q**: Queen  
- **T**: Tower (Rook)
- **B**: Bishop
- **H**: Horse (Knight)
- **Pawn**: No prefix

### Move Notation Examples
- `e2 - e4` (Pawn move)
- `H: g1 - f3` (Horse/Knight move)
- `K: e1 - g1 (Castling)` (Castling move)
- `T: a1 - d1 (x)` (Tower capture)

## 🛠️ Files Structure

```
chess/
├── index.html          # Main game interface
├── styles.css          # All styling and responsive design
├── chess.js            # Core chess engine and rules
├── bot.js               # AI implementation
├── game.js             # Game controller and UI management
└── README.md           # This file
```

## 🎨 Visual Highlights

- **Board**: 8x8 grid with alternating light/dark squares
- **Coordinates**: Clear a-h (files) and 1-8 (ranks) labels
- **Animations**: Smooth hover effects and piece movement
- **Responsive**: Adapts to different screen sizes
- **Professional**: Clean, modern design suitable for serious play

## 🏆 Perfect for

- ♟️ Chess enthusiasts of all levels
- 🎓 Learning chess rules and strategy
- 👥 Local multiplayer games
- 🤖 Practice against AI opponents
- 📱 Playing on any device (desktop, tablet, mobile)

---

**Enjoy your chess game! ♔♛♜♝♞♟**
