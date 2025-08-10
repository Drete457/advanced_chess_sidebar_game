// AI for chess game
class ChessAI {
    constructor(difficulty = DIFFICULTIES.MEDIUM) {
        this.difficulty = difficulty;
        this.maxDepth = this.getMaxDepth(difficulty);
        
        // Piece values
        this.positionValues = {
            [PIECE_TYPES.PAWN]: 100,
            [PIECE_TYPES.KNIGHT]: 320,
            [PIECE_TYPES.BISHOP]: 330,
            [PIECE_TYPES.ROOK]: 500,
            [PIECE_TYPES.QUEEN]: 900,
            [PIECE_TYPES.KING]: 20000
        };

        // Position tables for more accurate evaluation
        this.positionTables = {
            [PIECE_TYPES.PAWN]: [
                [0,  0,  0,  0,  0,  0,  0,  0],
                [50, 50, 50, 50, 50, 50, 50, 50],
                [10, 10, 20, 30, 30, 20, 10, 10],
                [5,  5, 10, 25, 25, 10,  5,  5],
                [0,  0,  0, 20, 20,  0,  0,  0],
                [5, -5,-10,  0,  0,-10, -5,  5],
                [5, 10, 10,-20,-20, 10, 10,  5],
                [0,  0,  0,  0,  0,  0,  0,  0]
            ],
            [PIECE_TYPES.KNIGHT]: [
                [-50,-40,-30,-30,-30,-30,-40,-50],
                [-40,-20,  0,  0,  0,  0,-20,-40],
                [-30,  0, 10, 15, 15, 10,  0,-30],
                [-30,  5, 15, 20, 20, 15,  5,-30],
                [-30,  0, 15, 20, 20, 15,  0,-30],
                [-30,  5, 10, 15, 15, 10,  5,-30],
                [-40,-20,  0,  5,  5,  0,-20,-40],
                [-50,-40,-30,-30,-30,-30,-40,-50]
            ],
            [PIECE_TYPES.BISHOP]: [
                [-20,-10,-10,-10,-10,-10,-10,-20],
                [-10,  0,  0,  0,  0,  0,  0,-10],
                [-10,  0,  5, 10, 10,  5,  0,-10],
                [-10,  5,  5, 10, 10,  5,  5,-10],
                [-10,  0, 10, 10, 10, 10,  0,-10],
                [-10, 10, 10, 10, 10, 10, 10,-10],
                [-10,  5,  0,  0,  0,  0,  5,-10],
                [-20,-10,-10,-10,-10,-10,-10,-20]
            ],
            [PIECE_TYPES.ROOK]: [
                [0,  0,  0,  0,  0,  0,  0,  0],
                [5, 10, 10, 10, 10, 10, 10,  5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [0,  0,  0,  5,  5,  0,  0,  0]
            ],
            [PIECE_TYPES.QUEEN]: [
                [-20,-10,-10, -5, -5,-10,-10,-20],
                [-10,  0,  0,  0,  0,  0,  0,-10],
                [-10,  0,  5,  5,  5,  5,  0,-10],
                [-5,  0,  5,  5,  5,  5,  0, -5],
                [0,  0,  5,  5,  5,  5,  0, -5],
                [-10,  5,  5,  5,  5,  5,  0,-10],
                [-10,  0,  5,  0,  0,  0,  0,-10],
                [-20,-10,-10, -5, -5,-10,-10,-20]
            ],
            [PIECE_TYPES.KING]: [
                [-30,-40,-40,-50,-50,-40,-40,-30],
                [-30,-40,-40,-50,-50,-40,-40,-30],
                [-30,-40,-40,-50,-50,-40,-40,-30],
                [-30,-40,-40,-50,-50,-40,-40,-30],
                [-20,-30,-30,-40,-40,-30,-30,-20],
                [-10,-20,-20,-20,-20,-20,-20,-10],
                [20, 20,  0,  0,  0,  0, 20, 20],
                [20, 30, 10,  0,  0, 10, 30, 20]
            ]
        };
    }

    getMaxDepth(difficulty) {
        switch (difficulty) {
            case DIFFICULTIES.EASY: return 2;
            case DIFFICULTIES.MEDIUM: return 3;
            case DIFFICULTIES.HARD: return 4;
            default: return 3;
        }
    }

    // Make the best move using optimized evaluation algorithm
    getBestMove(game) {
        const gameState = game.getGameState();
        
        if (gameState.gameOver) return null;

        // Get all possible moves with optimization
        const allMoves = game.getAllPossibleMoves(gameState.currentPlayer);
        if (allMoves.length === 0) return null;

        let bestMove = null;
        let bestScore = -Infinity;

        // Collect and evaluate all moves
        const moveEvaluations = [];
        for (const { piece, moves } of allMoves) {
            for (const move of moves) {
                const score = this.evaluateMove(gameState, piece, move);
                moveEvaluations.push({
                    from: piece.position,
                    to: move,
                    score: score,
                    piece: piece
                });
            }
        }

        // Sort moves by score (best first) for better performance
        moveEvaluations.sort((a, b) => b.score - a.score);

        // Select the best move (with some difficulty-based variation)
        const topMoves = moveEvaluations.slice(0, Math.max(1, Math.floor(moveEvaluations.length * 0.3)));
        
        if (this.difficulty === DIFFICULTIES.EASY && topMoves.length > 3) {
            // Easy mode: sometimes pick from top 3 moves randomly
            const randomIndex = Math.floor(Math.random() * Math.min(3, topMoves.length));
            const selectedMove = topMoves[randomIndex];
            return [selectedMove.from, selectedMove.to];
        } else {
            // Medium/Hard: pick the absolute best move
            const bestEval = moveEvaluations[0];
            return [bestEval.from, bestEval.to];
        }
    }

    // Evaluate a specific move with enhanced strategic considerations
    evaluateMove(gameState, piece, move) {
        let score = 0;

        // Piece capture value
        const targetPiece = gameState.board[move.row][move.col];
        if (targetPiece && targetPiece.color !== piece.color) {
            score += this.positionValues[targetPiece.type];
            
            // Bonus for capturing higher value pieces with lower value pieces
            const valueGain = this.positionValues[targetPiece.type] - this.positionValues[piece.type];
            if (valueGain > 0) {
                score += valueGain * 0.5;
            }
        }

        // Positional value improvement
        const currentPositionValue = this.getPositionValue(piece, piece.position.row, piece.position.col);
        const newPositionValue = this.getPositionValue(piece, move.row, move.col);
        score += (newPositionValue - currentPositionValue) * 0.5;

        // Center control bonus
        if ((move.row === 3 || move.row === 4) && (move.col === 3 || move.col === 4)) {
            score += 25;
        }

        // Extended center control
        if (move.row >= 2 && move.row <= 5 && move.col >= 2 && move.col <= 5) {
            score += 10;
        }

        // Piece development bonus (for pieces that haven't moved)
        if ((piece.type === PIECE_TYPES.KNIGHT || piece.type === PIECE_TYPES.BISHOP) && !piece.hasMoved) {
            score += 20;
        }

        // Castle early game bonus
        if (piece.type === PIECE_TYPES.KING && Math.abs(move.col - piece.position.col) === 2) {
            score += 30; // Castling bonus
        }

        // King safety considerations
        if (piece.type === PIECE_TYPES.KING) {
            // Penalize king moves to center in early/mid game
            if ((move.row >= 2 && move.row <= 5) && (move.col >= 2 && move.col <= 5)) {
                score -= 40;
            }
            // Bonus for king staying on back rank early
            if ((piece.color === COLORS.WHITE && move.row === 7) || 
                (piece.color === COLORS.BLACK && move.row === 0)) {
                score += 15;
            }
        }

        // Pawn structure considerations
        if (piece.type === PIECE_TYPES.PAWN) {
            // Bonus for pawn advancement
            const advancement = piece.color === COLORS.WHITE ? (6 - move.row) : (move.row - 1);
            score += advancement * 5;
            
            // Bonus for central pawns
            if (move.col >= 3 && move.col <= 4) {
                score += 10;
            }
        }

        // Threat and defense evaluation
        score += this.evaluateThreats(gameState, piece, move);

        // Add controlled randomness based on difficulty
        const randomFactor = this.difficulty === DIFFICULTIES.EASY ? 20 : 
                             this.difficulty === DIFFICULTIES.MEDIUM ? 10 : 5;
        score += (Math.random() - 0.5) * randomFactor;

        return score;
    }

    // Evaluate threats created or defended by a move
    evaluateThreats(gameState, piece, move) {
        let score = 0;

        // Simple threat evaluation: check if move attacks enemy pieces
        const directions = this.getPieceDirections(piece.type);
        
        for (const [deltaRow, deltaCol] of directions) {
            const targetRow = move.row + deltaRow;
            const targetCol = move.col + deltaCol;
            
            if (this.isValidPosition(targetRow, targetCol)) {
                const targetPiece = gameState.board[targetRow][targetCol];
                if (targetPiece && targetPiece.color !== piece.color) {
                    // Bonus for threatening enemy pieces
                    score += this.positionValues[targetPiece.type] * 0.1;
                }
            }
        }

        return score;
    }

    // Get movement directions for different piece types
    getPieceDirections(pieceType) {
        switch (pieceType) {
            case PIECE_TYPES.PAWN:
                return [[-1, -1], [-1, 1], [1, -1], [1, 1]]; // Diagonal attacks only
            case PIECE_TYPES.ROOK:
                return [[0, 1], [0, -1], [1, 0], [-1, 0]];
            case PIECE_TYPES.BISHOP:
                return [[1, 1], [1, -1], [-1, 1], [-1, -1]];
            case PIECE_TYPES.QUEEN:
                return [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
            case PIECE_TYPES.KING:
                return [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
            case PIECE_TYPES.KNIGHT:
                return [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
            default:
                return [];
        }
    }

    // Helper method to check if position is valid
    isValidPosition(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    evaluatePosition(gameState) {
        let evaluation = 0;

        // Material and positional evaluation
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = gameState.board[row][col];
                if (piece) {
                    let pieceValue = this.positionValues[piece.type];
                    
                    // Add positional value
                    const positionValue = this.getPositionValue(piece, row, col);
                    pieceValue += positionValue;
                    
                    if (piece.color === COLORS.BLACK) {
                        evaluation += pieceValue;
                    } else {
                        evaluation -= pieceValue;
                    }
                }
            }
        }

        // Mobility bonus
        const whiteMoves = this.countMoves(gameState, COLORS.WHITE);
        const blackMoves = this.countMoves(gameState, COLORS.BLACK);
        evaluation += (blackMoves - whiteMoves) * 10;

        // Check penalty
        if (gameState.inCheck.white) evaluation -= 50;
        if (gameState.inCheck.black) evaluation += 50;

        // Center control bonus
        evaluation += this.evaluateCenterControl(gameState);

        // King safety evaluation
        evaluation += this.evaluateKingSafety(gameState);

        return evaluation;
    }

    getPositionValue(piece, row, col) {
        const table = this.positionTables[piece.type];
        const adjustedRow = piece.color === COLORS.WHITE ? 7 - row : row;
        return table[adjustedRow][col];
    }

    countMoves(gameState, color) {
        let moveCount = 0;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = gameState.board[row][col];
                if (piece && piece.color === color) {
                    // Here we would need to calculate valid moves
                    // For simplicity, we'll use an estimate based on piece type
                    moveCount += this.estimateMoveCount(piece.type);
                }
            }
        }
        
        return moveCount;
    }

    estimateMoveCount(pieceType) {
        switch (pieceType) {
            case PIECE_TYPES.PAWN: return 2;
            case PIECE_TYPES.KNIGHT: return 4;
            case PIECE_TYPES.BISHOP: return 7;
            case PIECE_TYPES.ROOK: return 10;
            case PIECE_TYPES.QUEEN: return 15;
            case PIECE_TYPES.KING: return 3;
            default: return 0;
        }
    }

    evaluateCenterControl(gameState) {
        let evaluation = 0;
        const centerSquares = [
            { row: 3, col: 3 }, { row: 3, col: 4 },
            { row: 4, col: 3 }, { row: 4, col: 4 }
        ];

        for (const square of centerSquares) {
            const piece = gameState.board[square.row][square.col];
            if (piece) {
                const value = piece.type === PIECE_TYPES.PAWN ? 20 : 10;
                if (piece.color === COLORS.BLACK) {
                    evaluation += value;
                } else {
                    evaluation -= value;
                }
            }
        }

        return evaluation;
    }

    evaluateKingSafety(gameState) {
        let evaluation = 0;

        // Simplified: penalize king in center during mid-game
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = gameState.board[row][col];
                if (piece && piece.type === PIECE_TYPES.KING) {
                    if (row >= 2 && row <= 5 && col >= 2 && col <= 5) {
                        // King in center is dangerous
                        const penalty = 30;
                        if (piece.color === COLORS.BLACK) {
                            evaluation -= penalty;
                        } else {
                            evaluation += penalty;
                        }
                    }
                }
            }
        }

        return evaluation;
    }

    // Method to make a semi-intelligent move (for easy difficulty)
    getRandomMove(game) {
        const gameState = game.getGameState();
        const allMoves = game.getAllPossibleMoves(gameState.currentPlayer);
        
        if (allMoves.length === 0) return null;

        // Prioritize captures even in "random" mode
        const captureMoves = [];
        const normalMoves = [];

        for (const { piece, moves } of allMoves) {
            for (const move of moves) {
                const targetPiece = gameState.board[move.row][move.col];
                if (targetPiece && targetPiece.color !== piece.color) {
                    captureMoves.push([piece.position, move]);
                } else {
                    normalMoves.push([piece.position, move]);
                }
            }
        }

        // 70% chance to capture if possible
        if (captureMoves.length > 0 && Math.random() < 0.7) {
            return captureMoves[Math.floor(Math.random() * captureMoves.length)];
        }

        // Otherwise, random normal move
        const allPossibleMoves = [...captureMoves, ...normalMoves];
        return allPossibleMoves[Math.floor(Math.random() * allPossibleMoves.length)];
    }

    // Main method to get AI move
    async getAIMove(game) {
        // Simulate "thinking" time
        await new Promise(resolve => {
            const thinkingTime = this.difficulty === DIFFICULTIES.EASY ? 300 : 
                               this.difficulty === DIFFICULTIES.MEDIUM ? 800 : 1200;
            setTimeout(resolve, thinkingTime);
        });

        // Different strategies based on difficulty
        switch (this.difficulty) {
            case DIFFICULTIES.EASY:
                // 60% chance of random move, 40% best move
                if (Math.random() < 0.6) {
                    return this.getRandomMove(game);
                }
                return this.getBestMove(game);

            case DIFFICULTIES.MEDIUM:
                // 20% chance of random move, 80% best move
                if (Math.random() < 0.2) {
                    return this.getRandomMove(game);
                }
                return this.getBestMove(game);

            case DIFFICULTIES.HARD:
                // Always best move
                return this.getBestMove(game);

            default:
                return this.getBestMove(game);
        }
    }

    // Change difficulty
    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        this.maxDepth = this.getMaxDepth(difficulty);
    }

    getDifficulty() {
        return this.difficulty;
    }

    // Suggest move for human player
    suggestMove(game) {
        // Use simpler algorithm for suggestions
        const gameState = game.getGameState();
        const allMoves = game.getAllPossibleMoves(gameState.currentPlayer);
        
        if (allMoves.length === 0) return null;

        // Prioritize captures
        for (const { piece, moves } of allMoves) {
            for (const move of moves) {
                const targetPiece = gameState.board[move.row][move.col];
                if (targetPiece && targetPiece.color !== piece.color) {
                    return [piece.position, move];
                }
            }
        }

        // If no captures, use minimax with depth 2
        const originalDepth = this.maxDepth;
        this.maxDepth = 2;
        const result = this.getBestMove(game);
        this.maxDepth = originalDepth;
        
        return result;
    }
}
