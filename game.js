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
        this.timers = {
            white: 15 * 60, // 15 minutes in seconds
            black: 15 * 60
        };
        this.timerInterval = null;
        this.isTimerRunning = false;

        this.initializeGame();
        this.setupEventListeners();
    }

    initializeGame() {
        this.renderBoard();
        this.updateGameInfo();
        this.updateMoveHistory();
        this.updateCapturedPieces();
        this.updatePossibleMoves();
        this.startTimer();
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
    }

    toggleDifficultySelector() {
        const difficultySelect = document.getElementById('difficulty');
        if (this.gameMode === GAME_MODES.HUMAN_VS_BOT) {
            difficultySelect.style.display = 'inline-block';
        } else {
            difficultySelect.style.display = 'none';
        }
    }

    renderBoard() {
        const boardElement = document.getElementById('chessBoard');
        boardElement.innerHTML = '';

        const gameState = this.game.getGameState();

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.row = row;
                square.dataset.col = col;

                const piece = gameState.board[row][col];
                if (piece) {
                    const pieceElement = document.createElement('span');
                    pieceElement.className = 'piece';
                    pieceElement.textContent = piece.getSymbol();
                    pieceElement.dataset.color = piece.color;
                    pieceElement.dataset.type = piece.type;
                    square.appendChild(pieceElement);
                }

                // Add special classes
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

                // Highlight last move
                if (gameState.moveHistory.length > 0) {
                    const lastMove = gameState.moveHistory[gameState.moveHistory.length - 1];
                    if ((lastMove.from.row === row && lastMove.from.col === col) ||
                        (lastMove.to.row === row && lastMove.to.col === col)) {
                        square.classList.add('last-move');
                    }
                }

                // Highlight king in check
                if (piece && piece.type === PIECE_TYPES.KING && gameState.inCheck[piece.color]) {
                    square.classList.add('check');
                }

                square.addEventListener('click', () => this.handleSquareClick(row, col));
                boardElement.appendChild(square);
            }
        }
    }

    async handleSquareClick(row, col) {
        if (this.isAITurn) return;

        const result = this.game.selectSquare(row, col);
        this.selectedSquare = result.selected;
        this.validMoves = result.validMoves;

        this.renderBoard();
        this.updatePossibleMoves();

        // If a move was made
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
                
                const moveSuccess = this.game.makeMove(from, to);
                
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
            gameStatus.style.background = '#ffebee';
            gameStatus.style.color = '#c62828';
        } else {
            this.updateGameStatus(`${playerName}'s turn`);
            gameStatus.style.background = '#e3f2fd';
            gameStatus.style.color = '#1976d2';
        }
    }

    updateGameStatus(message) {
        document.getElementById('gameStatus').textContent = message;
    }

    updateMoveHistory() {
        const moveHistoryElement = document.getElementById('moveHistory');
        const moveHistory = this.game.getMoveHistory();
        
        moveHistoryElement.innerHTML = '';

        for (let i = 0; i < moveHistory.length; i++) {
            const move = moveHistory[i];
            const moveElement = document.createElement('div');
            moveElement.className = 'move-item';
            
            const moveNumber = Math.floor(i / 2) + 1;
            const isWhite = i % 2 === 0;
            
            if (isWhite) {
                moveElement.textContent = `${moveNumber}. ${move.notation}`;
            } else {
                moveElement.textContent = `${moveNumber}... ${move.notation}`;
            }

            if (i === moveHistory.length - 1) {
                moveElement.classList.add('current');
            }

            moveHistoryElement.appendChild(moveElement);
        }

        // Scroll to last move
        moveHistoryElement.scrollTop = moveHistoryElement.scrollHeight;
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

    updateTimerDisplay() {
        const whiteTimer = document.getElementById('whiteTimer');
        const blackTimer = document.getElementById('blackTimer');

        whiteTimer.textContent = this.formatTime(this.timers.white);
        blackTimer.textContent = this.formatTime(this.timers.black);

        // Highlight current player's timer
        whiteTimer.style.fontWeight = this.game.getCurrentPlayer() === COLORS.WHITE ? 'bold' : 'normal';
        blackTimer.style.fontWeight = this.game.getCurrentPlayer() === COLORS.BLACK ? 'bold' : 'normal';
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
                message = 'Draw!';
            } else {
                const winnerName = winner === COLORS.WHITE ? 'White' : 'Black';
                if (this.game.isInCheck(winner === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE)) {
                    message = `Checkmate! ${winnerName} wins!`;
                } else {
                    message = `${winnerName} wins!`;
                }
            }

            this.showGameOverModal(message);
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
        this.timers = { white: 15 * 60, black: 15 * 60 };
        
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
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    const gameController = new ChessGameController();
    
    // Make globally available for debugging
    window.chessGame = gameController;
});
