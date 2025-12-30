// Main chess game controller
class ChessGameController {
    constructor() {
        this.game = new ChessGame();
        this.ai = new ChessAI(DIFFICULTIES.MEDIUM);
        this.gameMode = GAME_MODES.HUMAN_VS_HUMAN;
        this.isAITurn = false;
        this.selectedSquare = null;
        this.validMoves = [];
        this.promotionResolver = null;
        this.isBoardFlipped = false;
        this.soundEnabled = true;
        this.timeControlMinutes = 15;
        this.sounds = {};
        this.timers = {
            white: this.timeControlMinutes * 60,
            black: this.timeControlMinutes * 60
        };
        this.timerInterval = null;
        this.isTimerRunning = false;
        this.preferencesKey = 'ac_sidebar_chess_prefs';
        this.boardSquares = null;

        this.loadPreferences();
        this.initSounds();

        this.initializeGame();
        this.setupEventListeners();
    }

    initializeGame() {
        this.applyTheme(this.currentTheme || 'classic');
        this.syncControls();
        this.renderBoard();
        this.updateGameInfo();
        this.updateMoveHistory();
        this.updateCapturedPieces();
        this.updatePossibleMoves();
        this.startTimer();
    }

    applyTheme(theme) {
        document.body.classList.remove('theme-dark', 'theme-contrast');
        if (theme === 'dark') {
            document.body.classList.add('theme-dark');
        } else if (theme === 'contrast') {
            document.body.classList.add('theme-contrast');
        }
        this.currentTheme = theme;
    }

    setupEventListeners() {
        // Game controls
        document.getElementById('gameMode').addEventListener('change', (e) => {
            this.gameMode = e.target.value;
            this.toggleDifficultySelector();
            this.resetGame();
        });

        document.getElementById('difficulty').addEventListener('change', (e) => {
            this.ai.setDifficulty(e.target.value);
        });

        document.getElementById('newGame').addEventListener('click', () => {
            this.resetGame();
        });

        document.getElementById('undoMove').addEventListener('click', () => {
            this.undoMove();
        });

        document.getElementById('flipBoard').addEventListener('click', () => {
            this.isBoardFlipped = !this.isBoardFlipped;
            this.savePreferences();
            this.renderBoard();
            this.updatePossibleMoves();
        });

        document.getElementById('timeControl').addEventListener('change', (e) => {
            this.timeControlMinutes = parseInt(e.target.value, 10);
            this.savePreferences();
            this.resetGame();
        });

        document.getElementById('soundToggle').addEventListener('change', (e) => {
            this.soundEnabled = e.target.checked;
            this.savePreferences();
        });

        document.getElementById('themeSelect').addEventListener('change', (e) => {
            this.applyTheme(e.target.value);
            this.savePreferences();
        });

        // Promotion modal
        document.querySelectorAll('.promotion-piece').forEach(button => {
            button.addEventListener('click', (e) => {
                const pieceType = e.target.dataset.piece;
                this.resolvePromotion(pieceType);
            });
        });

        // Game over modal
        document.getElementById('newGameFromModal').addEventListener('click', () => {
            this.hideModal('gameOverModal');
            this.resetGame();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            const promotionOpen = !document.getElementById('promotionModal').classList.contains('hidden');
            if (promotionOpen) {
                const key = e.key.toLowerCase();
                if (['q','r','b','n'].includes(key)) {
                    e.preventDefault();
                    const map = { q: 'queen', r: 'tower', b: 'bishop', n: 'horse' };
                    this.resolvePromotion(map[key]);
                    return;
                }
                if (key === 'escape') {
                    e.preventDefault();
                    this.resolvePromotion('queen');
                    return;
                }
            }

            switch (e.key) {
                case 'r':
                case 'R':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.resetGame();
                    }
                    break;
                case 'z':
                case 'Z':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.undoMove();
                    }
                    break;
            }
        });

        // Close promotion by clicking backdrop (defaults to Queen)
        const promotionModal = document.getElementById('promotionModal');
        promotionModal.addEventListener('click', (e) => {
            if (e.target === promotionModal) {
                this.resolvePromotion('queen');
            }
        });
    }

    toggleDifficultySelector() {
        const difficultySelect = document.getElementById('difficulty');
        const difficultyGroup = document.getElementById('difficultyGroup');
        if (this.gameMode === GAME_MODES.HUMAN_VS_BOT) {
            difficultySelect.style.display = 'inline-block';
            if (difficultyGroup) difficultyGroup.style.display = 'flex';
        } else {
            difficultySelect.style.display = 'none';
            if (difficultyGroup) difficultyGroup.style.display = 'none';
        }
    }

    renderBoard() {
        const boardElement = document.getElementById('chessBoard');
        if (!this.boardSquares) {
            this.boardSquares = [];
            for (let displayRow = 0; displayRow < 8; displayRow++) {
                for (let displayCol = 0; displayCol < 8; displayCol++) {
                    const square = document.createElement('div');
                    square.className = `square ${(displayRow + displayCol) % 2 === 0 ? 'light' : 'dark'}`;
                    this.boardSquares.push(square);
                    boardElement.appendChild(square);
                }
            }
        }

        this.updateBoardContent();

        // Update coordinates based on orientation
        const ranks = this.isBoardFlipped ? ['1','2','3','4','5','6','7','8'] : ['8','7','6','5','4','3','2','1'];
        const files = this.isBoardFlipped ? ['h','g','f','e','d','c','b','a'] : ['a','b','c','d','e','f','g','h'];
        const ranksEl = document.getElementById('ranksLeft');
        const filesEl = document.getElementById('filesBottom');
        if (ranksEl) {
            ranksEl.innerHTML = ranks.map(r => `<span>${r}</span>`).join('');
        }
        if (filesEl) {
            filesEl.innerHTML = files.map(f => `<span>${f}</span>`).join('');
        }
    }

    updateBoardContent() {
        const gameState = this.game.getGameState();

        for (let displayRow = 0; displayRow < 8; displayRow++) {
            for (let displayCol = 0; displayCol < 8; displayCol++) {
                const index = displayRow * 8 + displayCol;
                const square = this.boardSquares[index];
                const row = this.isBoardFlipped ? 7 - displayRow : displayRow;
                const col = this.isBoardFlipped ? 7 - displayCol : displayCol;

                square.dataset.row = row;
                square.dataset.col = col;
                square.innerHTML = '';
                square.classList.remove('selected', 'valid-move', 'capture-move', 'last-move', 'check');

                const piece = gameState.board[row][col];
                if (piece) {
                    const pieceElement = document.createElement('span');
                    pieceElement.className = 'piece';
                    pieceElement.textContent = piece.getSymbol();
                    pieceElement.dataset.color = piece.color;
                    pieceElement.dataset.type = piece.type;
                    square.appendChild(pieceElement);
                }

                if (this.selectedSquare && this.selectedSquare.row === row && this.selectedSquare.col === col) {
                    square.classList.add('selected');
                }

                if (this.validMoves.some(move => move.row === row && move.col === col)) {
                    if (piece && piece.color !== this.game.getCurrentPlayer()) {
                        square.classList.add('capture-move');
                    } else {
                        square.classList.add('valid-move');
                    }
                }

                if (gameState.moveHistory.length > 0) {
                    const lastMove = gameState.moveHistory[gameState.moveHistory.length - 1];
                    if ((lastMove.from.row === row && lastMove.from.col === col) ||
                        (lastMove.to.row === row && lastMove.to.col === col)) {
                        square.classList.add('last-move');
                    }
                }

                if (piece && piece.type === PIECE_TYPES.KING && gameState.inCheck[piece.color]) {
                    square.classList.add('check');
                }

                if (!square._bound) {
                    square.addEventListener('click', (e) => {
                        const target = e.currentTarget;
                        const r = Number(target.dataset.row);
                        const c = Number(target.dataset.col);
                        this.handleSquareClick(r, c);
                    });
                    square._bound = true;
                }
            }
        }
    }

    async handleSquareClick(row, col) {
        if (this.isAITurn) return;

        const result = this.game.selectSquare(row, col);
        this.selectedSquare = result.selected;
        this.validMoves = result.validMoves;

        // Hint why castling might not be available when selecting the king
        const pickedPiece = this.game.board[row][col];
        if (pickedPiece && pickedPiece.type === PIECE_TYPES.KING && this.selectedSquare) {
            const diag = this.game.getCastlingDiagnostics(pickedPiece.color);
            const blocks = [];
            const hasKingside = this.validMoves.some(m => Math.abs(m.col - col) === 2 && m.col > col);
            const hasQueenside = this.validMoves.some(m => Math.abs(m.col - col) === 2 && m.col < col);
            if (!hasKingside && diag.kingside.length) blocks.push(`Kingside: ${diag.kingside[0]}`);
            if (!hasQueenside && diag.queenside.length) blocks.push(`Queenside: ${diag.queenside[0]}`);
            if (blocks.length) {
                this.updateGameStatus(blocks.join(' | '));
            }
        }

        this.renderBoard();
        this.updatePossibleMoves();

        // Check if pawn promotion is needed
        if (result.needsPromotion) {
            const promotionPiece = await this.showPromotionModal();
            const moveSuccess = this.game.makePromotionMove(
                result.promotionMove.from, 
                result.promotionMove.to, 
                promotionPiece
            );
            
            if (moveSuccess) {
                this.selectedSquare = null;
                this.validMoves = [];
                await this.handleMoveComplete();
            }
            return;
        }

        // If a move was made (non-promotion)
        if (!this.selectedSquare && this.validMoves.length === 0) {
            await this.handleMoveComplete();
        }
    }

    async handleMoveComplete() {
        this.renderBoard(); // Update board visually
        this.updateGameInfo();
        this.updateMoveHistory();
        this.updateCapturedPieces();
        this.updatePossibleMoves();

        // Audio feedback based on last move
        const history = this.game.getMoveHistory();
        const lastMove = history[history.length - 1];
        if (lastMove) {
            if (this.game.isGameOver()) {
                this.playSound('gameover');
            } else if (this.game.isInCheck()) {
                this.playSound('check');
            } else if (lastMove.capturedPiece) {
                this.playSound('capture');
            } else {
                this.playSound('move');
            }
        }

        // Check game end
        if (this.game.isGameOver()) {
            this.handleGameEnd();
            return;
        }

        // If AI mode and now it's bot's turn
        if (this.gameMode === GAME_MODES.HUMAN_VS_BOT && 
            this.game.getCurrentPlayer() === COLORS.BLACK) {
            await this.makeAIMove();
        }
    }

    async makeAIMove() {
        this.isAITurn = true;
        this.updateGameStatus('AI thinking...');

        try {
            const aiMove = await this.ai.getAIMove(this.game);
            
            if (aiMove && aiMove.length === 2) {
                const [from, to] = aiMove;
                
                // Check if AI move is pawn promotion
                const piece = this.game.board[from.row][from.col];
                const isPromotion = piece && piece.type === PIECE_TYPES.PAWN && (to.row === 0 || to.row === 7);
                
                let moveSuccess;
                if (isPromotion) {
                    // AI always promotes to queen
                    moveSuccess = this.game.makeMove(from, to, PIECE_TYPES.QUEEN);
                } else {
                    moveSuccess = this.game.makeMove(from, to);
                }
                
                if (moveSuccess) {
                    // Small pause for better visual experience
                    await new Promise(resolve => setTimeout(resolve, 100));
                    await this.handleMoveComplete();
                    this.renderBoard(); // Ensure board is rendered after AI move
                } else {
                    console.error('AI move failed to execute');
                    this.updateGameStatus('AI move failed - continue playing');
                }
            } else {
                console.error('AI returned invalid move:', aiMove);
                this.updateGameStatus('AI found no moves - continue playing');
            }
        } catch (error) {
            console.error('AI move error:', error);
            this.updateGameStatus('AI error - continue playing');
        } finally {
            this.isAITurn = false;
        }
    }

    updateGameInfo() {
        const currentPlayerText = document.getElementById('currentPlayerText');
        const gameStatus = document.getElementById('gameStatus');
        
        const currentPlayer = this.game.getCurrentPlayer();
        const playerName = currentPlayer === COLORS.WHITE ? 'White' : 'Black';
        
        currentPlayerText.textContent = playerName;

        if (this.game.isInCheck()) {
            this.updateGameStatus(`${playerName} in CHECK!`);
            gameStatus.style.background = 'var(--check-bg)';
            gameStatus.style.color = 'var(--check-text)';
        } else {
            this.updateGameStatus(`${playerName}'s turn`);
            gameStatus.style.background = 'var(--status-bg)';
            gameStatus.style.color = 'var(--status-text)';
        }
    }

    updateGameStatus(message) {
        document.getElementById('gameStatus').textContent = message;
    }

    updateMoveHistory() {
        const moveHistoryElement = document.getElementById('moveHistory');
        const moveHistory = this.game.getMoveHistory();
        
        moveHistoryElement.innerHTML = '';

        for (let i = 0; i < moveHistory.length; i += 2) {
            const whiteMove = moveHistory[i];
            const blackMove = moveHistory[i + 1];
            const moveNumber = Math.floor(i / 2) + 1;

            const row = document.createElement('div');
            row.className = 'move-item grouped';

            const number = document.createElement('span');
            number.className = 'move-number';
            number.textContent = `${moveNumber}.`;
            row.appendChild(number);

            const whiteSpan = document.createElement('span');
            whiteSpan.className = 'move-text white-move';
            whiteSpan.textContent = whiteMove ? whiteMove.notation : '';
            row.appendChild(whiteSpan);

            const blackSpan = document.createElement('span');
            blackSpan.className = 'move-text black-move';
            blackSpan.textContent = blackMove ? blackMove.notation : '';
            row.appendChild(blackSpan);

            if (i === moveHistory.length - 1 || i + 1 === moveHistory.length - 1) {
                row.classList.add('current');
            }

            moveHistoryElement.appendChild(row);
        }

        // Multiple approaches to ensure scroll to bottom works reliably
        requestAnimationFrame(() => {
            // Primary approach: scroll to bottom
            moveHistoryElement.scrollTop = moveHistoryElement.scrollHeight;
            
            // Fallback: scroll last element into view
            const lastMove = moveHistoryElement.lastElementChild;
            if (lastMove) {
                lastMove.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'end',
                    inline: 'nearest'
                });
            }
            
            // Extra fallback after a small delay
            setTimeout(() => {
                moveHistoryElement.scrollTop = moveHistoryElement.scrollHeight;
            }, 100);
        });
    }

    updateCapturedPieces() {
        const gameState = this.game.getGameState();
        
        const capturedWhiteElement = document.getElementById('capturedWhite');
        const capturedBlackElement = document.getElementById('capturedBlack');
        
        capturedWhiteElement.innerHTML = '';
        capturedBlackElement.innerHTML = '';

        // Captured white pieces (show in black section)
        gameState.capturedPieces.white.forEach(piece => {
            const pieceElement = document.createElement('span');
            pieceElement.className = 'captured-piece';
            pieceElement.textContent = piece.getSymbol();
            capturedBlackElement.appendChild(pieceElement);
        });

        // Captured black pieces (show in white section)
        gameState.capturedPieces.black.forEach(piece => {
            const pieceElement = document.createElement('span');
            pieceElement.className = 'captured-piece';
            pieceElement.textContent = piece.getSymbol();
            capturedWhiteElement.appendChild(pieceElement);
        });
    }

    updatePossibleMoves() {
        const possibleMovesElement = document.getElementById('possibleMoves');
        possibleMovesElement.innerHTML = '';

        if (this.selectedSquare) {
            const files = 'abcdefgh';
            const ranks = '87654321';

            this.validMoves.forEach(move => {
                const moveElement = document.createElement('span');
                moveElement.className = 'possible-move';
                moveElement.textContent = files[move.col] + ranks[move.row];
                possibleMovesElement.appendChild(moveElement);
            });

            if (this.validMoves.length === 0) {
                possibleMovesElement.innerHTML = '<span style="color: #666;">No valid moves</span>';
            }
        } else {
            possibleMovesElement.innerHTML = '<span style="color: #666;">Select a piece to see moves</span>';
        }
    }

    startTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        this.timerInterval = setInterval(() => {
            if (!this.isTimerRunning || this.game.isGameOver()) return;

            const currentPlayer = this.game.getCurrentPlayer();
            this.timers[currentPlayer]--;

            this.updateTimerDisplay();

            if (this.timers[currentPlayer] <= 0) {
                this.handleTimeOut(currentPlayer);
            }
        }, 1000);

        this.isTimerRunning = true;
    }

    playSound(type) {
        if (!this.soundEnabled || !this.sounds[type]) return;

        const audio = this.sounds[type].cloneNode();
        audio.volume = 0.25;
        audio.play().catch(() => {});
    }

    initSounds() {
        const profiles = {
            move: { freq: 540, duration: 0.08 },
            capture: { freq: 320, duration: 0.12 },
            check: { freq: 760, duration: 0.18 },
            gameover: { freq: 200, duration: 0.35 }
        };

        Object.keys(profiles).forEach(type => {
            const audio = new Audio();
            audio.volume = 0.25;
            audio.src = this.generateToneDataURL(profiles[type]);
            this.sounds[type] = audio;
        });
    }

    generateToneDataURL(profile) {
        const sampleRate = 8000;
        const numSamples = Math.floor(sampleRate * profile.duration);
        const samples = new Int16Array(numSamples);

        for (let i = 0; i < numSamples; i++) {
            const t = i / sampleRate;
            const value = Math.sin(2 * Math.PI * profile.freq * t) * Math.exp(-3 * t);
            samples[i] = Math.max(-32768, Math.min(32767, Math.floor(value * 32767)));
        }

        const wavBytes = this.createWav(samples, sampleRate);
        const binary = String.fromCharCode.apply(null, wavBytes);
        return `data:audio/wav;base64,${btoa(binary)}`;
    }

    createWav(samples, sampleRate) {
        const buffer = new ArrayBuffer(44 + samples.length * 2);
        const view = new DataView(buffer);

        const writeString = (offset, str) => {
            for (let i = 0; i < str.length; i++) {
                view.setUint8(offset + i, str.charCodeAt(i));
            }
        };

        writeString(0, 'RIFF');
        view.setUint32(4, 36 + samples.length * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, samples.length * 2, true);

        for (let i = 0; i < samples.length; i++) {
            view.setInt16(44 + i * 2, samples[i], true);
        }

        return new Uint8Array(buffer);
    }

    updateTimerDisplay() {
        const whiteTimer = document.getElementById('whiteTimer');
        const blackTimer = document.getElementById('blackTimer');

        whiteTimer.textContent = this.formatTime(this.timers.white);
        blackTimer.textContent = this.formatTime(this.timers.black);

        // Highlight current player's timer
        whiteTimer.style.fontWeight = this.game.getCurrentPlayer() === COLORS.WHITE ? 'bold' : 'normal';
        blackTimer.style.fontWeight = this.game.getCurrentPlayer() === COLORS.BLACK ? 'bold' : 'normal';

        whiteTimer.classList.toggle('low-time', this.timers.white <= 10);
        blackTimer.classList.toggle('low-time', this.timers.black <= 10);
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    handleTimeOut(player) {
        this.isTimerRunning = false;
        const winner = player === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
        this.showGameOverModal(`Time's up! ${winner === COLORS.WHITE ? 'White' : 'Black'} wins!`);
    }

    handleGameEnd() {
        this.isTimerRunning = false;
        
        if (this.game.isGameOver()) {
            const winner = this.game.getWinner();
            let message = '';

            if (winner === 'draw') {
                const reason = this.game.getGameState().drawReason;
                message = reason ? `Draw: ${reason}` : 'Draw!';
            } else {
                const winnerName = winner === COLORS.WHITE ? 'White' : 'Black';
                if (this.game.isInCheck(winner === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE)) {
                    message = `Checkmate! ${winnerName} wins!`;
                } else {
                    message = `${winnerName} wins!`;
                }
            }

            this.showGameOverModal(message);
            this.showNotification('Game Over', message);
        }
    }

    showNotification(title, message) {
        try {
            if (typeof chrome !== 'undefined' && chrome.notifications && chrome.notifications.create) {
                chrome.notifications.create('', {
                    type: 'basic',
                    iconUrl: 'icons/icon128.png',
                    title,
                    message
                });
            }
        } catch (e) {
            // Ignore notification failures to avoid noisy logs
            const originalTitle = document.title;
            document.title = `${title}: ${message}`;
            setTimeout(() => { document.title = originalTitle; }, 3000);
        }
    }

    showGameOverModal(message) {
        document.getElementById('gameOverTitle').textContent = 'Game Over';
        document.getElementById('gameOverMessage').textContent = message;
        this.showModal('gameOverModal');
    }

    showPromotionModal() {
        return new Promise((resolve) => {
            this.promotionResolver = resolve;
            this.showModal('promotionModal');
        });
    }

    resolvePromotion(pieceType) {
        this.hideModal('promotionModal');
        if (this.promotionResolver) {
            this.promotionResolver(pieceType);
            this.promotionResolver = null;
        }
    }

    showModal(modalId) {
        document.getElementById(modalId).classList.remove('hidden');
    }

    hideModal(modalId) {
        document.getElementById(modalId).classList.add('hidden');
    }

    undoMove() {
        if (this.game.getMoveHistory().length === 0) return;

        // In AI mode, undo two moves (player and AI)
        if (this.gameMode === GAME_MODES.HUMAN_VS_BOT && this.game.getMoveHistory().length >= 2) {
            this.game.undoMove(); // Undo AI move
            this.game.undoMove(); // Undo player move
        } else {
            this.game.undoMove();
        }

        this.selectedSquare = null;
        this.validMoves = [];
        this.renderBoard();
        this.updateGameInfo();
        this.updateMoveHistory();
        this.updateCapturedPieces();
        this.updatePossibleMoves();
    }

    resetGame() {
        this.game.resetGame();
        this.selectedSquare = null;
        this.validMoves = [];
        this.isAITurn = false;
        this.timers = { 
            white: this.timeControlMinutes * 60, 
            black: this.timeControlMinutes * 60 
        };
        
        this.renderBoard();
        this.updateGameInfo();
        this.updateMoveHistory();
        this.updateCapturedPieces();
        this.updatePossibleMoves();
        this.updateTimerDisplay();
        this.startTimer();
        
        this.hideModal('gameOverModal');
        this.hideModal('promotionModal');
    }

    loadPreferences() {
        try {
            const raw = localStorage.getItem(this.preferencesKey);
            if (!raw) return;
            const prefs = JSON.parse(raw);
            if (typeof prefs.flip === 'boolean') this.isBoardFlipped = prefs.flip;
            if (typeof prefs.sound === 'boolean') this.soundEnabled = prefs.sound;
            if (typeof prefs.time === 'number') this.timeControlMinutes = prefs.time;
            if (typeof prefs.theme === 'string') this.currentTheme = prefs.theme;
        } catch (e) {
            // Ignore corrupt storage
        }
    }

    savePreferences() {
        const prefs = {
            flip: this.isBoardFlipped,
            sound: this.soundEnabled,
            time: this.timeControlMinutes,
            theme: this.currentTheme || 'classic'
        };
        try {
            localStorage.setItem(this.preferencesKey, JSON.stringify(prefs));
        } catch (e) {
            // Storage may be unavailable (quota/permissions); fail silently
        }
    }

    syncControls() {
        const soundToggle = document.getElementById('soundToggle');
        if (soundToggle) soundToggle.checked = this.soundEnabled;

        const timeControl = document.getElementById('timeControl');
        if (timeControl) timeControl.value = String(this.timeControlMinutes);

        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) themeSelect.value = this.currentTheme || 'classic';
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    const gameController = new ChessGameController();
    
    // Make globally available for debugging
    window.chessGame = gameController;
});
