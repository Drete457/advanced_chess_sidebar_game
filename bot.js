// AI for chess game
class ChessAI {
    constructor(difficulty = DIFFICULTIES.MEDIUM) {
        this.difficulty = difficulty;
        this.maxDepth = this.getMaxDepth(difficulty);
        this.tt = new Map(); // transposition table
        
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

    // Choose the best move using minimax with alpha-beta pruning
    getBestMove(game) {
        if (this.tt.size > 10000) {
            this.tt.clear();
        }
        const gameState = game.getGameState();
        if (gameState.gameOver) return null;

        const aiColor = gameState.currentPlayer; // AI plays the side to move
        const maximizing = aiColor === COLORS.BLACK; // evaluation is positive for black

        const allMoves = this.orderMoves(game, game.getAllPossibleMoves(aiColor), maximizing, gameState);
        if (allMoves.length === 0) return null;

        let bestMove = null;
        let bestScore = maximizing ? -Infinity : Infinity;

        for (const { piece, moves } of allMoves) {
            for (const move of moves) {
                const promotionNeeded = piece.type === PIECE_TYPES.PAWN && (move.row === 0 || move.row === 7);
                const moveSuccess = promotionNeeded
                    ? game.makeMove(piece.position, move, PIECE_TYPES.QUEEN)
                    : game.makeMove(piece.position, move);

                if (!moveSuccess) continue;

                const score = this.minimax(game, this.maxDepth - 1, -Infinity, Infinity, !maximizing);
                game.undoMove();

                if (maximizing) {
                    if (score > bestScore) {
                        bestScore = score;
                        bestMove = [piece.position, move];
                    }
                } else {
                    if (score < bestScore) {
                        bestScore = score;
                        bestMove = [piece.position, move];
                    }
                }
            }
        }

        return bestMove;
    }

    minimax(game, depth, alpha, beta, maximizingPlayer) {
        const state = game.getGameState();

        const ttKey = this.getStateKey(state);
        const ttEntry = this.tt.get(ttKey);
        if (ttEntry && ttEntry.depth >= depth) {
            return ttEntry.value;
        }

        if (depth === 0 || state.gameOver) {
            const standPat = this.evaluatePosition(state);
            const q = this.quiescence(game, standPat, alpha, beta, maximizingPlayer);
            if (!state.gameOver) {
                this.tt.set(ttKey, { depth, value: q });
            }
            return q;
        }

        const currentColor = state.currentPlayer;
        const allMoves = this.orderMoves(game, game.getAllPossibleMoves(currentColor), maximizingPlayer, state);

        // No moves available -> checkmate or stalemate
        if (allMoves.length === 0) {
            if (state.inCheck[currentColor]) {
                // Mate is bad for the side to move
                return currentColor === COLORS.BLACK ? -20000 : 20000;
            }
            return 0; // stalemate
        }

        if (maximizingPlayer) {
            let value = -Infinity;
            for (const { piece, moves } of allMoves) {
                for (const move of moves) {
                    const promotionNeeded = piece.type === PIECE_TYPES.PAWN && (move.row === 0 || move.row === 7);
                    const moveSuccess = promotionNeeded
                        ? game.makeMove(piece.position, move, PIECE_TYPES.QUEEN)
                        : game.makeMove(piece.position, move);
                    if (!moveSuccess) continue;

                    value = Math.max(value, this.minimax(game, depth - 1, alpha, beta, false));
                    game.undoMove();
                    alpha = Math.max(alpha, value);
                    if (alpha >= beta) return value; // beta cut-off
                }
            }
            this.tt.set(ttKey, { depth, value });
            return value;
        }

        let value = Infinity;
        for (const { piece, moves } of allMoves) {
            for (const move of moves) {
                const promotionNeeded = piece.type === PIECE_TYPES.PAWN && (move.row === 0 || move.row === 7);
                const moveSuccess = promotionNeeded
                    ? game.makeMove(piece.position, move, PIECE_TYPES.QUEEN)
                    : game.makeMove(piece.position, move);
                if (!moveSuccess) continue;

                value = Math.min(value, this.minimax(game, depth - 1, alpha, beta, true));
                game.undoMove();
                beta = Math.min(beta, value);
                if (beta <= alpha) return value; // alpha cut-off
            }
        }
        this.tt.set(ttKey, { depth, value });
        return value;
    }

    quiescence(game, standPat, alpha, beta, maximizingPlayer) {
        let value = standPat;
        if (maximizingPlayer) {
            if (value > beta) return beta;
            if (value > alpha) alpha = value;
        } else {
            if (value < alpha) return alpha;
            if (value < beta) beta = value;
        }

        const state = game.getGameState();
        const capturesOnly = this.getCapturingMoves(game, state.currentPlayer);

        for (const { piece, moves } of capturesOnly) {
            for (const move of moves) {
                const promotionNeeded = piece.type === PIECE_TYPES.PAWN && (move.row === 0 || move.row === 7);
                const ok = promotionNeeded
                    ? game.makeMove(piece.position, move, PIECE_TYPES.QUEEN)
                    : game.makeMove(piece.position, move);
                if (!ok) continue;
                const score = this.quiescence(game, this.evaluatePosition(game.getGameState()), alpha, beta, !maximizingPlayer);
                game.undoMove();

                if (maximizingPlayer) {
                    if (score > value) value = score;
                    if (value > alpha) alpha = value;
                    if (alpha >= beta) return beta;
                } else {
                    if (score < value) value = score;
                    if (value < beta) beta = value;
                    if (beta <= alpha) return alpha;
                }
            }
        }
        return value;
    }

    orderMoves(game, allMoves, maximizing, state) {
        const scored = [];
        for (const { piece, moves } of allMoves) {
            const scoredMoves = moves.map(move => ({
                piece,
                move,
                score: this.moveScore(state, piece, move)
            }));
            scored.push({ piece, moves: scoredMoves });
        }
        // Flatten, sort, then regroup by piece
        const flat = scored.flatMap(entry => entry.moves.map(m => ({ piece: entry.piece, move: m.move, score: m.score })));
        flat.sort((a, b) => maximizing ? b.score - a.score : a.score - b.score);
        // Rebuild grouped structure expected by callers
        const grouped = [];
        flat.forEach(({ piece, move, score }) => {
            let bucket = grouped.find(g => g.piece === piece);
            if (!bucket) {
                bucket = { piece, moves: [], score };
                grouped.push(bucket);
            }
            bucket.moves.push(move);
        });
        return grouped;
    }

    moveScore(state, piece, move) {
        const target = state.board[move.row][move.col];
        let score = 0;
        if (target && target.color !== piece.color) {
            score += this.positionValues[target.type] * 10; // MVV-LVA style
            score -= this.positionValues[piece.type];
        }
        if (piece.type === PIECE_TYPES.PAWN && (move.row === 0 || move.row === 7)) {
            score += 500; // promotion bias
        }
        // Prefer central moves slightly
        if (move.row >= 2 && move.row <= 5 && move.col >= 2 && move.col <= 5) score += 5;
        return score;
    }

    getCapturingMoves(game, color) {
        const all = game.getAllPossibleMoves(color);
        return all.map(({ piece, moves }) => ({
            piece,
            moves: moves.filter(m => game.board[m.row][m.col] && game.board[m.row][m.col].color !== piece.color)
        })).filter(entry => entry.moves.length);
    }

    getStateKey(state) {
        const boardKey = state.board.map(row => row.map(p => {
            if (!p) return '.';
            return (p.type[0]) + (p.color === COLORS.WHITE ? 'w' : 'b');
        }).join('')).join('/');
        const toMove = state.currentPlayer === COLORS.WHITE ? 'w' : 'b';
        const castling = [
            state.castlingRights?.white?.kingside ? 'K' : '',
            state.castlingRights?.white?.queenside ? 'Q' : '',
            state.castlingRights?.black?.kingside ? 'k' : '',
            state.castlingRights?.black?.queenside ? 'q' : ''
        ].join('') || '-';
        const ep = state.enPassantTarget ? `${state.enPassantTarget.row}${state.enPassantTarget.col}` : '-';
        const halfmove = state.halfmoveClock ?? 0;
        const fullmove = state.fullmoveNumber ?? 1;
        return `${boardKey}|${toMove}|${castling}|${ep}|${halfmove}|${fullmove}`;
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
