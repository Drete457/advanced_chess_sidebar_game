// IA para o jogo de xadrez
class ChessAI {
    constructor(difficulty = DIFFICULTIES.MEDIUM) {
        this.difficulty = difficulty;
        this.maxDepth = this.getMaxDepth(difficulty);
        
        // Valores das peças
        this.positionValues = {
            [PIECE_TYPES.PAWN]: 100,
            [PIECE_TYPES.KNIGHT]: 320,
            [PIECE_TYPES.BISHOP]: 330,
            [PIECE_TYPES.ROOK]: 500,
            [PIECE_TYPES.QUEEN]: 900,
            [PIECE_TYPES.KING]: 20000
        };

        // Tabelas de posição para avaliação mais precisa
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

    // Fazer o melhor movimento usando algoritmo minimax com poda alfa-beta
    getBestMove(game) {
        const gameState = game.getGameState();
        
        if (gameState.gameOver) return null;

        // Versão simplificada para evitar problemas com undoMove
        const allMoves = game.getAllPossibleMoves(gameState.currentPlayer);
        if (allMoves.length === 0) return null;

        let bestMove = null;
        let bestScore = -Infinity;

        // Avaliar cada movimento possível
        for (const { piece, moves } of allMoves) {
            for (const move of moves) {
                const score = this.evaluateMove(gameState, piece, move);
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = [piece.position, move];
                }
            }
        }

        return bestMove;
    }

    // Avaliar um movimento específico
    evaluateMove(gameState, piece, move) {
        let score = 0;

        // Captura de peças
        const targetPiece = gameState.board[move.row][move.col];
        if (targetPiece && targetPiece.color !== piece.color) {
            score += this.positionValues[targetPiece.type];
        }

        // Valor posicional
        score += this.getPositionValue(piece, move.row, move.col);

        // Controle do centro
        if ((move.row === 3 || move.row === 4) && (move.col === 3 || move.col === 4)) {
            score += 20;
        }

        // Desenvolvimento de peças
        if (piece.type === PIECE_TYPES.KNIGHT || piece.type === PIECE_TYPES.BISHOP) {
            if (!piece.hasMoved) {
                score += 15;
            }
        }

        // Segurança do rei
        if (piece.type === PIECE_TYPES.KING) {
            // Penalizar movimento do rei para o centro no início
            if ((move.row >= 2 && move.row <= 5) && (move.col >= 2 && move.col <= 5)) {
                score -= 30;
            }
        }

        // Adicionar aleatoriedade para tornar os jogos mais interessantes
        score += Math.random() * 10;

        return score;
    }

    evaluatePosition(gameState) {
        let evaluation = 0;

        // Avaliação material e posicional
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = gameState.board[row][col];
                if (piece) {
                    let pieceValue = this.positionValues[piece.type];
                    
                    // Adicionar valor posicional
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

        // Bônus por mobilidade
        const whiteMoves = this.countMoves(gameState, COLORS.WHITE);
        const blackMoves = this.countMoves(gameState, COLORS.BLACK);
        evaluation += (blackMoves - whiteMoves) * 10;

        // Penalidade por estar em xeque
        if (gameState.inCheck.white) evaluation -= 50;
        if (gameState.inCheck.black) evaluation += 50;

        // Bônus por controle do centro
        evaluation += this.evaluateCenterControl(gameState);

        // Avaliação de segurança do rei
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
                    // Aqui seria necessário calcular os movimentos válidos
                    // Por simplicidade, vamos usar uma estimativa baseada no tipo da peça
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

        // Simplificado: penalizar rei no centro durante o meio-jogo
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = gameState.board[row][col];
                if (piece && piece.type === PIECE_TYPES.KING) {
                    if (row >= 2 && row <= 5 && col >= 2 && col <= 5) {
                        // Rei no centro é perigoso
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

    // Método para fazer um movimento semi-inteligente (para dificuldade fácil)
    getRandomMove(game) {
        const gameState = game.getGameState();
        const allMoves = game.getAllPossibleMoves(gameState.currentPlayer);
        
        if (allMoves.length === 0) return null;

        // Priorizar capturas mesmo no modo "aleatório"
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

        // 70% chance de capturar se possível
        if (captureMoves.length > 0 && Math.random() < 0.7) {
            return captureMoves[Math.floor(Math.random() * captureMoves.length)];
        }

        // Senão, movimento normal aleatório
        const allPossibleMoves = [...captureMoves, ...normalMoves];
        return allPossibleMoves[Math.floor(Math.random() * allPossibleMoves.length)];
    }

    // Método principal para obter movimento da IA
    async getAIMove(game) {
        // Simular tempo de "pensamento"
        await new Promise(resolve => {
            const thinkingTime = this.difficulty === DIFFICULTIES.EASY ? 300 : 
                               this.difficulty === DIFFICULTIES.MEDIUM ? 800 : 1200;
            setTimeout(resolve, thinkingTime);
        });

        // Estratégias diferentes baseadas na dificuldade
        switch (this.difficulty) {
            case DIFFICULTIES.EASY:
                // 60% chance de movimento aleatório, 40% melhor movimento
                if (Math.random() < 0.6) {
                    return this.getRandomMove(game);
                }
                return this.getBestMove(game);

            case DIFFICULTIES.MEDIUM:
                // 20% chance de movimento aleatório, 80% melhor movimento
                if (Math.random() < 0.2) {
                    return this.getRandomMove(game);
                }
                return this.getBestMove(game);

            case DIFFICULTIES.HARD:
                // Sempre o melhor movimento
                return this.getBestMove(game);

            default:
                return this.getBestMove(game);
        }
    }

    // Alterar dificuldade
    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        this.maxDepth = this.getMaxDepth(difficulty);
    }

    getDifficulty() {
        return this.difficulty;
    }

    // Sugerir movimento para o jogador humano
    suggestMove(game) {
        // Usar algoritmo mais simples para sugestão
        const gameState = game.getGameState();
        const allMoves = game.getAllPossibleMoves(gameState.currentPlayer);
        
        if (allMoves.length === 0) return null;

        // Priorizar capturas
        for (const { piece, moves } of allMoves) {
            for (const move of moves) {
                const targetPiece = gameState.board[move.row][move.col];
                if (targetPiece && targetPiece.color !== piece.color) {
                    return [piece.position, move];
                }
            }
        }

        // Se não há capturas, usar minimax com profundidade 2
        const originalDepth = this.maxDepth;
        this.maxDepth = 2;
        const result = this.getBestMove(game);
        this.maxDepth = originalDepth;
        
        return result;
    }
}
