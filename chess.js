// Enumerations and constants for the chess game
const PIECE_TYPES = {
    KING: 'king',
    QUEEN: 'queen',
    ROOK: 'tower',
    BISHOP: 'bishop',
    KNIGHT: 'horse',
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

// Class to represent a chess piece
class Piece {
    constructor(type, color, position) {
        this.type = type;
        this.color = color;
        this.hasMoved = false;
        this.position = position;
    }

    // Unicode symbols for chess pieces
    getSymbol() {
        const symbols = {
            white: {
                king: '♔', queen: '♕', tower: '♖',
                bishop: '♗', horse: '♘', pawn: '♙'
            },
            black: {
                king: '♚', queen: '♛', tower: '♜',
                bishop: '♝', horse: '♞', pawn: '♟'
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

// Main chess game class
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
        this.halfmoveClock = 0; // 50-move rule counter (half-moves)
        this.positionCounts = new Map(); // repetition detection
        this.stateStack = [];
        this.recordPosition();
    }

    createInitialBoard() {
        const board = Array(8).fill(null).map(() => Array(8).fill(null));

        // Black pieces
        const backRankBlack = [PIECE_TYPES.ROOK, PIECE_TYPES.KNIGHT, PIECE_TYPES.BISHOP, PIECE_TYPES.QUEEN, 
                              PIECE_TYPES.KING, PIECE_TYPES.BISHOP, PIECE_TYPES.KNIGHT, PIECE_TYPES.ROOK];
        for (let col = 0; col < 8; col++) {
            board[0][col] = new Piece(backRankBlack[col], COLORS.BLACK, { row: 0, col });
            board[1][col] = new Piece(PIECE_TYPES.PAWN, COLORS.BLACK, { row: 1, col });
        }

        // White pieces
        const backRankWhite = [PIECE_TYPES.ROOK, PIECE_TYPES.KNIGHT, PIECE_TYPES.BISHOP, PIECE_TYPES.QUEEN, 
                              PIECE_TYPES.KING, PIECE_TYPES.BISHOP, PIECE_TYPES.KNIGHT, PIECE_TYPES.ROOK];
        for (let col = 0; col < 8; col++) {
            board[7][col] = new Piece(backRankWhite[col], COLORS.WHITE, { row: 7, col });
            board[6][col] = new Piece(PIECE_TYPES.PAWN, COLORS.WHITE, { row: 6, col });
        }

        return board;
    }

    // Get current game state
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
            enPassantTarget: this.enPassantTarget ? { ...this.enPassantTarget } : undefined,
            halfmoveClock: this.halfmoveClock,
            fullmoveNumber: Math.floor(this.moveHistory.length / 2) + 1
        };
    }

    // Select a square on the board
    selectSquare(row, col) {
        const piece = this.board[row][col];

        // If no piece is selected
        if (!this.selectedSquare) {
            if (piece && piece.color === this.currentPlayer) {
                this.selectedSquare = { row, col };
                this.validMoves = this.getValidMoves(piece);
                return { selected: this.selectedSquare, validMoves: this.validMoves };
            }
            return { selected: null, validMoves: [] };
        }

        // If clicked on the same square, deselect
        if (this.selectedSquare.row === row && this.selectedSquare.col === col) {
            this.selectedSquare = undefined;
            this.validMoves = [];
            return { selected: null, validMoves: [] };
        }

        // Check if it's a valid move
        const isValidMove = this.validMoves.some(move => move.row === row && move.col === col);
        if (isValidMove) {
            // Check if this move requires pawn promotion
            const movingPiece = this.board[this.selectedSquare.row][this.selectedSquare.col];
            const isPromotion = movingPiece.type === PIECE_TYPES.PAWN && (row === 0 || row === 7);
            
            if (isPromotion) {
                // Return special promotion state
                return { 
                    selected: this.selectedSquare, 
                    validMoves: this.validMoves,
                    needsPromotion: true,
                    promotionMove: { from: this.selectedSquare, to: { row, col } }
                };
            } else {
                this.makeMove(this.selectedSquare, { row, col });
                this.selectedSquare = undefined;
                this.validMoves = [];
                return { selected: null, validMoves: [] };
            }
        }

        // Select new piece if it belongs to current player
        if (piece && piece.color === this.currentPlayer) {
            this.selectedSquare = { row, col };
            this.validMoves = this.getValidMoves(piece);
            return { selected: this.selectedSquare, validMoves: this.validMoves };
        }

        // Deselect if clicked on invalid square
        this.selectedSquare = undefined;
        this.validMoves = [];
        return { selected: null, validMoves: [] };
    }

    // Make a move
    makeMove(from, to, promotionPiece) {
        if (!this.isValidPosition(from?.row, from?.col) || !this.isValidPosition(to?.row, to?.col)) {
            return false;
        }
        const piece = this.board[from.row][from.col];
        if (!piece) return false;

        // Snapshot state for undo
        this.stateStack.push(this.cloneState());

        const capturedPiece = this.board[to.row][to.col];
        let isEnPassant = false;
        let isCastling = false;

        const prevCastlingRights = JSON.parse(JSON.stringify(this.castlingRights));
        const prevEnPassantTarget = this.enPassantTarget ? { ...this.enPassantTarget } : undefined;
        const prevHalfmoveClock = this.halfmoveClock;
        const prevPieceHasMoved = piece.hasMoved;
        let prevRookHasMoved = false;

        // Check en passant
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

        // Check castling
        let rookFromCol;
        let rookToCol;
        if (piece.type === PIECE_TYPES.KING && Math.abs(to.col - from.col) === 2) {
            isCastling = true;
            rookFromCol = to.col > from.col ? 7 : 0;
            rookToCol = to.col > from.col ? to.col - 1 : to.col + 1;
            const rook = this.board[from.row][rookFromCol];
            if (rook) {
                prevRookHasMoved = rook.hasMoved;
                this.board[from.row][rookToCol] = rook;
                this.board[from.row][rookFromCol] = null;
                rook.position = { row: from.row, col: rookToCol };
                rook.hasMoved = true;
            }
        }

        // Move the piece
        this.board[to.row][to.col] = piece;
        this.board[from.row][from.col] = null;
        piece.position = to;
        piece.hasMoved = true;

        // Capture piece if present
        if (capturedPiece && !isEnPassant) {
            this.capturedPieces[capturedPiece.color].push(capturedPiece);
        }

        // Pawn promotion
        if (piece.type === PIECE_TYPES.PAWN && (to.row === 0 || to.row === 7)) {
            if (promotionPiece) {
                piece.type = promotionPiece;
            } else {
                piece.type = PIECE_TYPES.QUEEN; // Auto-promote to queen if not specified
            }
        }

        // Update castling rights for moving piece
        this.updateCastlingRights(piece, from);

        // Update castling rights if a rook was captured
        if (capturedPiece && capturedPiece.type === PIECE_TYPES.ROOK) {
            if (capturedPiece.color === COLORS.WHITE) {
                if (to.row === 7 && to.col === 0) this.castlingRights.white.queenside = false;
                if (to.row === 7 && to.col === 7) this.castlingRights.white.kingside = false;
            } else {
                if (to.row === 0 && to.col === 0) this.castlingRights.black.queenside = false;
                if (to.row === 0 && to.col === 7) this.castlingRights.black.kingside = false;
            }
        }

        // Set en passant target
        this.enPassantTarget = undefined;
        if (piece.type === PIECE_TYPES.PAWN && Math.abs(to.row - from.row) === 2) {
            this.enPassantTarget = {
                row: piece.color === COLORS.WHITE ? from.row - 1 : from.row + 1,
                col: from.col
            };
        }

        // Halfmove clock (50-move rule)
        if (piece.type === PIECE_TYPES.PAWN || capturedPiece || isEnPassant) {
            this.halfmoveClock = 0;
        } else {
            this.halfmoveClock += 1;
        }

        // Create move object
        const move = {
            from,
            to,
            piece: piece.clone(),
            capturedPiece: capturedPiece?.clone(),
            isEnPassant,
            isCastling,
            promotionPiece,
            notation: this.generateMoveNotation(piece, from, to, capturedPiece, isEnPassant, isCastling),
            prevCastlingRights,
            prevEnPassantTarget,
            prevHalfmoveClock,
            prevPieceHasMoved,
            rookFromCol,
            rookToCol,
            prevRookHasMoved
        };

        this.moveHistory.push(move);

        // Switch player
        this.currentPlayer = this.currentPlayer === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;

        // Check for check and checkmate
        this.updateCheckStatus();

        // Record position for repetition detection before draw checks that rely on it
        move.positionKey = this.recordPosition();
        this.checkGameEnd();

        return true;
    }

    // Complete a pawn promotion move
    makePromotionMove(from, to, promotionPiece) {
        const success = this.makeMove(from, to, promotionPiece);
        if (success) {
            this.selectedSquare = undefined;
            this.validMoves = [];
        }
        return success;
    }

    // Get valid moves for a piece
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

        // Filter moves that would leave the king in check
        return moves.filter(move => !this.wouldBeInCheck(piece.position, move));
    }

    getPawnMoves(piece) {
        const moves = [];
        const { row, col } = piece.position;
        const direction = piece.color === COLORS.WHITE ? -1 : 1;
        const startRow = piece.color === COLORS.WHITE ? 6 : 1;

        // Forward movement
        const frontRow = row + direction;
        if (this.isValidPosition(frontRow, col) && !this.board[frontRow][col]) {
            moves.push({ row: frontRow, col });

            // Initial double movement
            if (row === startRow) {
                const doubleFrontRow = row + 2 * direction;
                if (this.isValidPosition(doubleFrontRow, col) && !this.board[doubleFrontRow][col]) {
                    moves.push({ row: doubleFrontRow, col });
                }
            }
        }

        // Diagonal captures
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

        // Normal king movements
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

        // Castling
        if (!piece.hasMoved && !this.inCheck[piece.color]) {
            // Kingside castling
            if (this.castlingRights[piece.color].kingside) {
                const pathClear = !this.board[row][col + 1] && !this.board[row][col + 2];
                if (pathClear) {
                    const rook = this.board[row][7];
                    const oppColor = piece.color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
                    const safeSquares = !this.isSquareAttacked(row, col + 1, oppColor) &&
                                        !this.isSquareAttacked(row, col + 2, oppColor);
                    if (rook && !rook.hasMoved && safeSquares) {
                        moves.push({ row, col: col + 2 });
                    }
                }
            }

            // Queenside castling
            if (this.castlingRights[piece.color].queenside) {
                const pathClear = !this.board[row][col - 1] && !this.board[row][col - 2] && !this.board[row][col - 3];
                if (pathClear) {
                    const rook = this.board[row][0];
                    const oppColor = piece.color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
                    const safeSquares = !this.isSquareAttacked(row, col - 1, oppColor) &&
                                        !this.isSquareAttacked(row, col - 2, oppColor);
                    if (rook && !rook.hasMoved && safeSquares) {
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

    isSquareAttacked(row, col, byColor) {
        // Scan all pieces of the attacker color and see if they attack the square
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.board[r][c];
                if (piece && piece.color === byColor) {
                    const attacks = this.getPieceAttacks(piece);
                    if (attacks.some(pos => pos.row === row && pos.col === col)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    generatePositionKey() {
        const boardKey = this.board.map(row => row.map(piece => {
            if (!piece) return '.';
            const colorChar = piece.color === COLORS.WHITE ? 'w' : 'b';
            const typeChar = piece.type[0];
            return typeChar + colorChar;
        }).join('')).join('/');

        const toMove = this.currentPlayer === COLORS.WHITE ? 'w' : 'b';

        const castling = [
            this.castlingRights.white.kingside ? 'K' : '',
            this.castlingRights.white.queenside ? 'Q' : '',
            this.castlingRights.black.kingside ? 'k' : '',
            this.castlingRights.black.queenside ? 'q' : ''
        ].join('') || '-';

        const enPassant = this.enPassantTarget ? `${this.enPassantTarget.row}${this.enPassantTarget.col}` : '-';

        return `${boardKey}|${toMove}|${castling}|${enPassant}`;
    }

    recordPosition() {
        const key = this.generatePositionKey();
        const count = this.positionCounts.get(key) || 0;
        this.positionCounts.set(key, count + 1);
        return key;
    }

    getCastlingDiagnostics(color) {
        const reasons = { kingside: [], queenside: [] };
        const kingPos = this.findKing(color);
        if (!kingPos) return reasons;
        const king = this.board[kingPos.row][kingPos.col];
        const backRank = color === COLORS.WHITE ? 7 : 0;
        const opp = color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;

        const evaluateSide = (side) => {
            const rookCol = side === 'kingside' ? 7 : 0;
            const step = side === 'kingside' ? 1 : -1;
            const targetCol = side === 'kingside' ? 6 : 2;
            const throughCol = side === 'kingside' ? 5 : 3;
            const farCol = side === 'kingside' ? null : 1;

            const rook = this.board[backRank][rookCol];
            if (!rook || rook.type !== PIECE_TYPES.ROOK) reasons[side].push('Rook missing');
            if (rook && rook.hasMoved) reasons[side].push('Rook already moved');
            if (!king || king.hasMoved) reasons[side].push('King already moved');
            if (this.inCheck[color]) reasons[side].push('King is in check');

            if (this.board[backRank][kingPos.col + step]) reasons[side].push('Square next to king occupied');
            if (this.board[backRank][targetCol]) reasons[side].push('Destination square occupied');
            if (farCol !== null && this.board[backRank][farCol]) reasons[side].push('Path blocked');

            if (this.isSquareAttacked(backRank, kingPos.col + step, opp)) reasons[side].push('Square next to king is attacked');
            if (this.isSquareAttacked(backRank, targetCol, opp)) reasons[side].push('Destination square is attacked');
        };

        evaluateSide('kingside');
        evaluateSide('queenside');
        return reasons;
    }

    wouldBeInCheck(from, to) {
        const piece = this.board[from.row][from.col];
        const capturedPiece = this.board[to.row][to.col];

        let enPassantCapture = null;

        // Handle en passant capture removal during simulation
        if (piece.type === PIECE_TYPES.PAWN && this.enPassantTarget &&
            to.row === this.enPassantTarget.row && to.col === this.enPassantTarget.col &&
            !capturedPiece) {
            const capturedPawnRow = piece.color === COLORS.WHITE ? to.row + 1 : to.row - 1;
            enPassantCapture = this.board[capturedPawnRow][to.col];
            this.board[capturedPawnRow][to.col] = null;
        }

        // Make temporary move
        this.board[to.row][to.col] = piece;
        this.board[from.row][from.col] = null;

        const inCheck = this.isKingInCheck(piece.color);

        // Undo move
        this.board[from.row][from.col] = piece;
        this.board[to.row][to.col] = capturedPiece;
        if (enPassantCapture) {
            const capturedPawnRow = piece.color === COLORS.WHITE ? to.row + 1 : to.row - 1;
            this.board[capturedPawnRow][to.col] = enPassantCapture;
        }

        return inCheck;
    }

    // Check if the king is in check
    isKingInCheck(color) {
        const kingPosition = this.findKing(color);
        if (!kingPosition) return false;

        const opponentColor = color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;

        // Check attacks from all opponent pieces
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
        // Similar to movements, but without filtering for check
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
        // If the king moved
        if (piece.type === PIECE_TYPES.KING) {
            this.castlingRights[piece.color].kingside = false;
            this.castlingRights[piece.color].queenside = false;
        }

        // If a rook moved
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
                // Checkmate
                this.gameOver = true;
                this.winner = this.currentPlayer === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
            } else {
                // Stalemate draw
                this.gameOver = true;
                this.winner = 'draw';
            }
        }

        // Check other draw conditions
        if (this.isDrawByInsufficientMaterial() || this.isDrawByRepetition() || this.halfmoveClock >= 100) {
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

        // King vs King
        if (pieces.length === 2) return true;

        // King and Bishop vs King or King and Knight vs King
        if (pieces.length === 3) {
            const nonKingPieces = pieces.filter(p => p.type !== PIECE_TYPES.KING);
            return nonKingPieces.length === 1 && 
                   (nonKingPieces[0].type === PIECE_TYPES.BISHOP || nonKingPieces[0].type === PIECE_TYPES.KNIGHT);
        }

        return false;
    }

    isDrawByRepetition() {
        const key = this.generatePositionKey();
        const count = this.positionCounts.get(key) || 0;
        return count >= 3;
    }

    generateMoveNotation(piece, from, to, capturedPiece, isEnPassant, isCastling) {
        // Special notation for castling
        if (isCastling) {
            return to.col > from.col ? 'O-O' : 'O-O-O';
        }

        const files = 'abcdefgh';
        const ranks = '87654321';

        // Format: initial position - final position
        const fromSquare = files[from.col] + ranks[from.row];
        const toSquare = files[to.col] + ranks[to.row];
        
        let notation = fromSquare + ' - ' + toSquare;

        // Add piece type prefix for clarity (except pawns)
        if (piece.type !== PIECE_TYPES.PAWN) {
            let pieceSymbol = '';
            switch(piece.type) {
                case PIECE_TYPES.KING: pieceSymbol = 'K'; break;
                case PIECE_TYPES.QUEEN: pieceSymbol = 'Q'; break;
                case PIECE_TYPES.ROOK: pieceSymbol = 'T'; break; // Tower
                case PIECE_TYPES.BISHOP: pieceSymbol = 'B'; break;
                case PIECE_TYPES.KNIGHT: pieceSymbol = 'H'; break; // Horse
            }
            notation = pieceSymbol + ': ' + notation;
        }

        // Add capture indicator
        if (capturedPiece || isEnPassant) {
            notation += ' (x)';
        }

        // En passant
        if (isEnPassant) {
            notation += ' e.p.';
        }

        return notation;
    }

    // Undo last move
    undoMove() {
        if (this.moveHistory.length === 0) return false;

        // Drop last move from notation/history
        this.moveHistory.pop();

        const prevState = this.stateStack.pop();
        if (!prevState) return false;

        this.restoreState(prevState);
        this.updateCheckStatus();
        return true;
    }

    // Reset game
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
        this.halfmoveClock = 0;
        this.positionCounts = new Map();
        this.stateStack = [];
        this.recordPosition();
    }

    cloneState() {
        const cloneBoard = this.board.map(row => row.map(p => p ? p.clone() : null));
        const cloneCaptured = {
            white: this.capturedPieces.white.map(p => p.clone()),
            black: this.capturedPieces.black.map(p => p.clone())
        };
        return {
            board: cloneBoard,
            currentPlayer: this.currentPlayer,
            moveHistory: [...this.moveHistory],
            capturedPieces: cloneCaptured,
            gameOver: this.gameOver,
            winner: this.winner,
            inCheck: { ...this.inCheck },
            castlingRights: JSON.parse(JSON.stringify(this.castlingRights)),
            enPassantTarget: this.enPassantTarget ? { ...this.enPassantTarget } : undefined,
            halfmoveClock: this.halfmoveClock,
            positionCounts: new Map(this.positionCounts)
        };
    }

    restoreState(state) {
        this.board = state.board.map(row => row.map(p => p ? p.clone() : null));
        this.currentPlayer = state.currentPlayer;
        this.moveHistory = [...state.moveHistory];
        this.capturedPieces = {
            white: state.capturedPieces.white.map(p => p.clone()),
            black: state.capturedPieces.black.map(p => p.clone())
        };
        this.gameOver = state.gameOver;
        this.winner = state.winner;
        this.inCheck = { ...state.inCheck };
        this.castlingRights = JSON.parse(JSON.stringify(state.castlingRights));
        this.enPassantTarget = state.enPassantTarget ? { ...state.enPassantTarget } : undefined;
        this.halfmoveClock = state.halfmoveClock;
        this.positionCounts = new Map(state.positionCounts);
        this.selectedSquare = undefined;
        this.validMoves = [];
    }

    // Check if game is over
    isGameOver() {
        return this.gameOver;
    }

    // Get winner
    getWinner() {
        return this.winner;
    }

    // Get current player
    getCurrentPlayer() {
        return this.currentPlayer;
    }

    // Get move history
    getMoveHistory() {
        return [...this.moveHistory];
    }

    // Get selected square position
    getSelectedSquare() {
        return this.selectedSquare ? { ...this.selectedSquare } : undefined;
    }

    // Get current valid moves
    getValidMovesForSelected() {
        return [...this.validMoves];
    }

    // Check if in check
    isInCheck(color) {
        const checkColor = color || this.currentPlayer;
        return this.inCheck[checkColor];
    }

    // Get all pieces of a color
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

    // Get all possible moves for a color
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
