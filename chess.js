// Enumerações e constantes para o jogo de xadrez
const PIECE_TYPES = {
    KING: 'king',
    QUEEN: 'queen',
    ROOK: 'rook',
    BISHOP: 'bishop',
    KNIGHT: 'knight',
    PAWN: 'pawn'
};

const COLORS = {
    WHITE: 'white',
    BLACK: 'black'
};

const GAME_MODES = {
    HUMAN_VS_HUMAN: 'human-vs-human',
    HUMAN_VS_BOT: 'human-vs-bot'
};

const DIFFICULTIES = {
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard'
};

// Classe para representar uma peça
class Piece {
    constructor(type, color, position) {
        this.type = type;
        this.color = color;
        this.hasMoved = false;
        this.position = position;
    }

    // Símbolos Unicode para as peças
    getSymbol() {
        const symbols = {
            white: {
                king: '♔', queen: '♕', rook: '♖',
                bishop: '♗', knight: '♘', pawn: '♙'
            },
            black: {
                king: '♚', queen: '♛', rook: '♜',
                bishop: '♝', knight: '♞', pawn: '♟'
            }
        };
        return symbols[this.color][this.type];
    }

    clone() {
        const piece = new Piece(this.type, this.color, { ...this.position });
        piece.hasMoved = this.hasMoved;
        return piece;
    }
}

// Classe principal do jogo de xadrez
class ChessGame {
    constructor() {
        this.board = this.createInitialBoard();
        this.currentPlayer = COLORS.WHITE;
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.gameOver = false;
        this.winner = undefined;
        this.selectedSquare = undefined;
        this.validMoves = [];
        this.inCheck = { white: false, black: false };
        this.castlingRights = {
            white: { kingside: true, queenside: true },
            black: { kingside: true, queenside: true }
        };
        this.enPassantTarget = undefined;
    }

    createInitialBoard() {
        const board = Array(8).fill(null).map(() => Array(8).fill(null));

        // Peças pretas
        const backRankBlack = [PIECE_TYPES.ROOK, PIECE_TYPES.KNIGHT, PIECE_TYPES.BISHOP, PIECE_TYPES.QUEEN, 
                              PIECE_TYPES.KING, PIECE_TYPES.BISHOP, PIECE_TYPES.KNIGHT, PIECE_TYPES.ROOK];
        for (let col = 0; col < 8; col++) {
            board[0][col] = new Piece(backRankBlack[col], COLORS.BLACK, { row: 0, col });
            board[1][col] = new Piece(PIECE_TYPES.PAWN, COLORS.BLACK, { row: 1, col });
        }

        // Peças brancas
        const backRankWhite = [PIECE_TYPES.ROOK, PIECE_TYPES.KNIGHT, PIECE_TYPES.BISHOP, PIECE_TYPES.QUEEN, 
                              PIECE_TYPES.KING, PIECE_TYPES.BISHOP, PIECE_TYPES.KNIGHT, PIECE_TYPES.ROOK];
        for (let col = 0; col < 8; col++) {
            board[7][col] = new Piece(backRankWhite[col], COLORS.WHITE, { row: 7, col });
            board[6][col] = new Piece(PIECE_TYPES.PAWN, COLORS.WHITE, { row: 6, col });
        }

        return board;
    }

    // Obter o estado atual do jogo
    getGameState() {
        return {
            board: this.board.map(row => row.map(piece => piece?.clone() || null)),
            currentPlayer: this.currentPlayer,
            moveHistory: [...this.moveHistory],
            capturedPieces: {
                white: [...this.capturedPieces.white],
                black: [...this.capturedPieces.black]
            },
            gameOver: this.gameOver,
            winner: this.winner,
            inCheck: { ...this.inCheck },
            castlingRights: JSON.parse(JSON.stringify(this.castlingRights)),
            enPassantTarget: this.enPassantTarget ? { ...this.enPassantTarget } : undefined
        };
    }

    // Selecionar uma casa do tabuleiro
    selectSquare(row, col) {
        const piece = this.board[row][col];

        // Se não há peça selecionada
        if (!this.selectedSquare) {
            if (piece && piece.color === this.currentPlayer) {
                this.selectedSquare = { row, col };
                this.validMoves = this.getValidMoves(piece);
                return { selected: this.selectedSquare, validMoves: this.validMoves };
            }
            return { selected: null, validMoves: [] };
        }

        // Se clicou na mesma casa, deseleciona
        if (this.selectedSquare.row === row && this.selectedSquare.col === col) {
            this.selectedSquare = undefined;
            this.validMoves = [];
            return { selected: null, validMoves: [] };
        }

        // Verificar se é um movimento válido
        const isValidMove = this.validMoves.some(move => move.row === row && move.col === col);
        if (isValidMove) {
            this.makeMove(this.selectedSquare, { row, col });
            this.selectedSquare = undefined;
            this.validMoves = [];
            return { selected: null, validMoves: [] };
        }

        // Selecionar nova peça se for do jogador atual
        if (piece && piece.color === this.currentPlayer) {
            this.selectedSquare = { row, col };
            this.validMoves = this.getValidMoves(piece);
            return { selected: this.selectedSquare, validMoves: this.validMoves };
        }

        // Deselecionar se clicou em casa inválida
        this.selectedSquare = undefined;
        this.validMoves = [];
        return { selected: null, validMoves: [] };
    }

    // Fazer um movimento
    makeMove(from, to, promotionPiece) {
        const piece = this.board[from.row][from.col];
        if (!piece) return false;

        const capturedPiece = this.board[to.row][to.col];
        let isEnPassant = false;
        let isCastling = false;

        // Verificar en passant
        if (piece.type === PIECE_TYPES.PAWN && this.enPassantTarget && 
            to.row === this.enPassantTarget.row && to.col === this.enPassantTarget.col) {
            isEnPassant = true;
            const capturedPawnRow = piece.color === COLORS.WHITE ? to.row + 1 : to.row - 1;
            const capturedPawn = this.board[capturedPawnRow][to.col];
            if (capturedPawn) {
                this.capturedPieces[capturedPawn.color].push(capturedPawn);
                this.board[capturedPawnRow][to.col] = null;
            }
        }

        // Verificar roque
        if (piece.type === PIECE_TYPES.KING && Math.abs(to.col - from.col) === 2) {
            isCastling = true;
            const rookFromCol = to.col > from.col ? 7 : 0;
            const rookToCol = to.col > from.col ? to.col - 1 : to.col + 1;
            const rook = this.board[from.row][rookFromCol];
            if (rook) {
                this.board[from.row][rookToCol] = rook;
                this.board[from.row][rookFromCol] = null;
                rook.position = { row: from.row, col: rookToCol };
                rook.hasMoved = true;
            }
        }

        // Mover a peça
        this.board[to.row][to.col] = piece;
        this.board[from.row][from.col] = null;
        piece.position = to;
        piece.hasMoved = true;

        // Capturar peça se houver
        if (capturedPiece && !isEnPassant) {
            this.capturedPieces[capturedPiece.color].push(capturedPiece);
        }

        // Promoção de peão
        if (piece.type === PIECE_TYPES.PAWN && (to.row === 0 || to.row === 7)) {
            if (promotionPiece) {
                piece.type = promotionPiece;
            } else {
                piece.type = PIECE_TYPES.QUEEN; // Promoção automática para rainha se não especificado
            }
        }

        // Atualizar direitos de roque
        this.updateCastlingRights(piece, from);

        // Definir alvo en passant
        this.enPassantTarget = undefined;
        if (piece.type === PIECE_TYPES.PAWN && Math.abs(to.row - from.row) === 2) {
            this.enPassantTarget = {
                row: piece.color === COLORS.WHITE ? from.row - 1 : from.row + 1,
                col: from.col
            };
        }

        // Criar objeto do movimento
        const move = {
            from,
            to,
            piece: piece.clone(),
            capturedPiece: capturedPiece?.clone(),
            isEnPassant,
            isCastling,
            promotionPiece,
            notation: this.generateMoveNotation(piece, from, to, capturedPiece, isEnPassant, isCastling)
        };

        this.moveHistory.push(move);

        // Trocar jogador
        this.currentPlayer = this.currentPlayer === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;

        // Verificar xeque e xeque-mate
        this.updateCheckStatus();
        this.checkGameEnd();

        return true;
    }

    // Obter movimentos válidos para uma peça
    getValidMoves(piece) {
        const moves = [];

        switch (piece.type) {
            case PIECE_TYPES.PAWN:
                moves.push(...this.getPawnMoves(piece));
                break;
            case PIECE_TYPES.ROOK:
                moves.push(...this.getRookMoves(piece));
                break;
            case PIECE_TYPES.BISHOP:
                moves.push(...this.getBishopMoves(piece));
                break;
            case PIECE_TYPES.QUEEN:
                moves.push(...this.getQueenMoves(piece));
                break;
            case PIECE_TYPES.KING:
                moves.push(...this.getKingMoves(piece));
                break;
            case PIECE_TYPES.KNIGHT:
                moves.push(...this.getKnightMoves(piece));
                break;
        }

        // Filtrar movimentos que deixariam o rei em xeque
        return moves.filter(move => !this.wouldBeInCheck(piece.position, move));
    }

    getPawnMoves(piece) {
        const moves = [];
        const { row, col } = piece.position;
        const direction = piece.color === COLORS.WHITE ? -1 : 1;
        const startRow = piece.color === COLORS.WHITE ? 6 : 1;

        // Movimento para frente
        const frontRow = row + direction;
        if (this.isValidPosition(frontRow, col) && !this.board[frontRow][col]) {
            moves.push({ row: frontRow, col });

            // Movimento duplo inicial
            if (row === startRow) {
                const doubleFrontRow = row + 2 * direction;
                if (this.isValidPosition(doubleFrontRow, col) && !this.board[doubleFrontRow][col]) {
                    moves.push({ row: doubleFrontRow, col });
                }
            }
        }

        // Capturas diagonais
        for (const deltaCol of [-1, 1]) {
            const captureRow = row + direction;
            const captureCol = col + deltaCol;
            if (this.isValidPosition(captureRow, captureCol)) {
                const target = this.board[captureRow][captureCol];
                if (target && target.color !== piece.color) {
                    moves.push({ row: captureRow, col: captureCol });
                }
            }
        }

        // En passant
        if (this.enPassantTarget) {
            const { row: enRow, col: enCol } = this.enPassantTarget;
            if (row === enRow + (piece.color === COLORS.WHITE ? 1 : -1) && Math.abs(col - enCol) === 1) {
                moves.push({ row: enRow, col: enCol });
            }
        }

        return moves;
    }

    getRookMoves(piece) {
        const moves = [];
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

        for (const [deltaRow, deltaCol] of directions) {
            moves.push(...this.getLinearMoves(piece, deltaRow, deltaCol));
        }

        return moves;
    }

    getBishopMoves(piece) {
        const moves = [];
        const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

        for (const [deltaRow, deltaCol] of directions) {
            moves.push(...this.getLinearMoves(piece, deltaRow, deltaCol));
        }

        return moves;
    }

    getQueenMoves(piece) {
        return [...this.getRookMoves(piece), ...this.getBishopMoves(piece)];
    }

    getKingMoves(piece) {
        const moves = [];
        const { row, col } = piece.position;

        // Movimentos normais do rei
        for (let deltaRow = -1; deltaRow <= 1; deltaRow++) {
            for (let deltaCol = -1; deltaCol <= 1; deltaCol++) {
                if (deltaRow === 0 && deltaCol === 0) continue;
                
                const newRow = row + deltaRow;
                const newCol = col + deltaCol;
                
                if (this.isValidPosition(newRow, newCol)) {
                    const target = this.board[newRow][newCol];
                    if (!target || target.color !== piece.color) {
                        moves.push({ row: newRow, col: newCol });
                    }
                }
            }
        }

        // Roque
        if (!piece.hasMoved && !this.inCheck[piece.color]) {
            // Roque do lado do rei
            if (this.castlingRights[piece.color].kingside) {
                if (!this.board[row][col + 1] && !this.board[row][col + 2]) {
                    const rook = this.board[row][7];
                    if (rook && !rook.hasMoved) {
                        moves.push({ row, col: col + 2 });
                    }
                }
            }

            // Roque do lado da rainha
            if (this.castlingRights[piece.color].queenside) {
                if (!this.board[row][col - 1] && !this.board[row][col - 2] && !this.board[row][col - 3]) {
                    const rook = this.board[row][0];
                    if (rook && !rook.hasMoved) {
                        moves.push({ row, col: col - 2 });
                    }
                }
            }
        }

        return moves;
    }

    getKnightMoves(piece) {
        const moves = [];
        const { row, col } = piece.position;
        const knightMoves = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];

        for (const [deltaRow, deltaCol] of knightMoves) {
            const newRow = row + deltaRow;
            const newCol = col + deltaCol;

            if (this.isValidPosition(newRow, newCol)) {
                const target = this.board[newRow][newCol];
                if (!target || target.color !== piece.color) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        }

        return moves;
    }

    getLinearMoves(piece, deltaRow, deltaCol) {
        const moves = [];
        const { row, col } = piece.position;

        for (let i = 1; i < 8; i++) {
            const newRow = row + i * deltaRow;
            const newCol = col + i * deltaCol;

            if (!this.isValidPosition(newRow, newCol)) break;

            const target = this.board[newRow][newCol];
            if (!target) {
                moves.push({ row: newRow, col: newCol });
            } else {
                if (target.color !== piece.color) {
                    moves.push({ row: newRow, col: newCol });
                }
                break;
            }
        }

        return moves;
    }

    isValidPosition(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    // Verificar se o movimento deixaria o rei em xeque
    wouldBeInCheck(from, to) {
        // Fazer movimento temporário
        const piece = this.board[from.row][from.col];
        const capturedPiece = this.board[to.row][to.col];
        
        this.board[to.row][to.col] = piece;
        this.board[from.row][from.col] = null;

        // Verificar se o rei está em xeque
        const inCheck = this.isKingInCheck(piece.color);

        // Desfazer movimento
        this.board[from.row][from.col] = piece;
        this.board[to.row][to.col] = capturedPiece;

        return inCheck;
    }

    // Verificar se o rei está em xeque
    isKingInCheck(color) {
        const kingPosition = this.findKing(color);
        if (!kingPosition) return false;

        const opponentColor = color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;

        // Verificar ataques de todas as peças oponentes
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === opponentColor) {
                    const attacks = this.getPieceAttacks(piece);
                    if (attacks.some(pos => pos.row === kingPosition.row && pos.col === kingPosition.col)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    findKing(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.type === PIECE_TYPES.KING && piece.color === color) {
                    return { row, col };
                }
            }
        }
        return null;
    }

    getPieceAttacks(piece) {
        // Similar aos movimentos, mas sem filtrar por xeque
        switch (piece.type) {
            case PIECE_TYPES.PAWN:
                return this.getPawnAttacks(piece);
            case PIECE_TYPES.ROOK:
                return this.getRookMoves(piece);
            case PIECE_TYPES.BISHOP:
                return this.getBishopMoves(piece);
            case PIECE_TYPES.QUEEN:
                return this.getQueenMoves(piece);
            case PIECE_TYPES.KING:
                return this.getKingAttacks(piece);
            case PIECE_TYPES.KNIGHT:
                return this.getKnightMoves(piece);
            default:
                return [];
        }
    }

    getPawnAttacks(piece) {
        const attacks = [];
        const { row, col } = piece.position;
        const direction = piece.color === COLORS.WHITE ? -1 : 1;

        for (const deltaCol of [-1, 1]) {
            const attackRow = row + direction;
            const attackCol = col + deltaCol;
            if (this.isValidPosition(attackRow, attackCol)) {
                attacks.push({ row: attackRow, col: attackCol });
            }
        }

        return attacks;
    }

    getKingAttacks(piece) {
        const attacks = [];
        const { row, col } = piece.position;

        for (let deltaRow = -1; deltaRow <= 1; deltaRow++) {
            for (let deltaCol = -1; deltaCol <= 1; deltaCol++) {
                if (deltaRow === 0 && deltaCol === 0) continue;
                
                const newRow = row + deltaRow;
                const newCol = col + deltaCol;
                
                if (this.isValidPosition(newRow, newCol)) {
                    attacks.push({ row: newRow, col: newCol });
                }
            }
        }

        return attacks;
    }

    updateCastlingRights(piece, from) {
        // Se o rei se moveu
        if (piece.type === PIECE_TYPES.KING) {
            this.castlingRights[piece.color].kingside = false;
            this.castlingRights[piece.color].queenside = false;
        }

        // Se uma torre se moveu
        if (piece.type === PIECE_TYPES.ROOK) {
            if (from.col === 0) {
                this.castlingRights[piece.color].queenside = false;
            } else if (from.col === 7) {
                this.castlingRights[piece.color].kingside = false;
            }
        }
    }

    updateCheckStatus() {
        this.inCheck.white = this.isKingInCheck(COLORS.WHITE);
        this.inCheck.black = this.isKingInCheck(COLORS.BLACK);
    }

    checkGameEnd() {
        const hasValidMoves = this.hasValidMoves(this.currentPlayer);

        if (!hasValidMoves) {
            if (this.inCheck[this.currentPlayer]) {
                // Xeque-mate
                this.gameOver = true;
                this.winner = this.currentPlayer === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
            } else {
                // Empate por afogamento
                this.gameOver = true;
                this.winner = 'draw';
            }
        }

        // Verificar outras condições de empate
        if (this.isDrawByInsufficientMaterial() || this.isDrawByRepetition()) {
            this.gameOver = true;
            this.winner = 'draw';
        }
    }

    hasValidMoves(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color) {
                    const validMoves = this.getValidMoves(piece);
                    if (validMoves.length > 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    isDrawByInsufficientMaterial() {
        const pieces = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece) pieces.push(piece);
            }
        }

        // Rei vs Rei
        if (pieces.length === 2) return true;

        // Rei e Bispo vs Rei ou Rei e Cavalo vs Rei
        if (pieces.length === 3) {
            const nonKingPieces = pieces.filter(p => p.type !== PIECE_TYPES.KING);
            return nonKingPieces.length === 1 && 
                   (nonKingPieces[0].type === PIECE_TYPES.BISHOP || nonKingPieces[0].type === PIECE_TYPES.KNIGHT);
        }

        return false;
    }

    isDrawByRepetition() {
        // Implementação simplificada - na prática seria mais complexa
        return false;
    }

    generateMoveNotation(piece, from, to, capturedPiece, isEnPassant, isCastling) {
        if (isCastling) {
            return to.col > from.col ? 'O-O' : 'O-O-O';
        }

        const files = 'abcdefgh';
        const ranks = '87654321';

        let notation = '';

        // Tipo da peça (exceto peão)
        if (piece.type !== PIECE_TYPES.PAWN) {
            notation += piece.type.charAt(0).toUpperCase();
        }

        // Casa de origem (apenas se necessário para desambiguação)
        notation += files[from.col];
        if (piece.type === PIECE_TYPES.PAWN && capturedPiece) {
            // Para peões que capturam, sempre incluir a coluna de origem
        } else if (piece.type !== PIECE_TYPES.PAWN) {
            notation += ranks[from.row];
        }

        // Captura
        if (capturedPiece || isEnPassant) {
            notation += 'x';
        }

        // Casa de destino
        notation += files[to.col] + ranks[to.row];

        // En passant
        if (isEnPassant) {
            notation += ' e.p.';
        }

        return notation;
    }

    // Desfazer último movimento
    undoMove() {
        if (this.moveHistory.length === 0) return false;

        const lastMove = this.moveHistory.pop();
        const { from, to, piece, capturedPiece, isEnPassant, isCastling } = lastMove;

        // Restaurar a peça na posição original
        this.board[from.row][from.col] = piece;
        this.board[to.row][to.col] = capturedPiece || null;
        piece.position = from;

        // Desfazer en passant
        if (isEnPassant && capturedPiece) {
            const capturedPawnRow = piece.color === COLORS.WHITE ? to.row + 1 : to.row - 1;
            this.board[capturedPawnRow][to.col] = capturedPiece;
            this.capturedPieces[capturedPiece.color].pop();
        }

        // Desfazer roque
        if (isCastling) {
            const rookToCol = to.col > from.col ? 7 : 0;
            const rookFromCol = to.col > from.col ? to.col - 1 : to.col + 1;
            const rook = this.board[from.row][rookFromCol];
            if (rook) {
                this.board[from.row][rookToCol] = rook;
                this.board[from.row][rookFromCol] = null;
                rook.position = { row: from.row, col: rookToCol };
            }
        }

        // Remover peça capturada das peças capturadas
        if (capturedPiece && !isEnPassant) {
            this.capturedPieces[capturedPiece.color].pop();
        }

        // Trocar jogador
        this.currentPlayer = this.currentPlayer === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;

        // Resetar estado do jogo
        this.gameOver = false;
        this.winner = undefined;
        this.updateCheckStatus();

        return true;
    }

    // Resetar jogo
    resetGame() {
        this.board = this.createInitialBoard();
        this.currentPlayer = COLORS.WHITE;
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.gameOver = false;
        this.winner = undefined;
        this.selectedSquare = undefined;
        this.validMoves = [];
        this.inCheck = { white: false, black: false };
        this.castlingRights = {
            white: { kingside: true, queenside: true },
            black: { kingside: true, queenside: true }
        };
        this.enPassantTarget = undefined;
    }

    // Verificar se é final de jogo
    isGameOver() {
        return this.gameOver;
    }

    // Obter vencedor
    getWinner() {
        return this.winner;
    }

    // Obter jogador atual
    getCurrentPlayer() {
        return this.currentPlayer;
    }

    // Obter histórico de movimentos
    getMoveHistory() {
        return [...this.moveHistory];
    }

    // Obter posição do quadrado selecionado
    getSelectedSquare() {
        return this.selectedSquare ? { ...this.selectedSquare } : undefined;
    }

    // Obter movimentos válidos atuais
    getValidMovesForSelected() {
        return [...this.validMoves];
    }

    // Verificar se está em xeque
    isInCheck(color) {
        const checkColor = color || this.currentPlayer;
        return this.inCheck[checkColor];
    }

    // Obter todas as peças de uma cor
    getPiecesByColor(color) {
        const pieces = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color) {
                    pieces.push(piece);
                }
            }
        }
        return pieces;
    }

    // Obter todos os movimentos possíveis para uma cor
    getAllPossibleMoves(color) {
        const allMoves = [];
        const pieces = this.getPiecesByColor(color);
        
        for (const piece of pieces) {
            const moves = this.getValidMoves(piece);
            if (moves.length > 0) {
                allMoves.push({ piece, moves });
            }
        }
        
        return allMoves;
    }
}
