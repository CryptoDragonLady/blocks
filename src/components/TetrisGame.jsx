import React, { useState, useEffect, useCallback } from 'react';
import '../styles/TetrisGame.css';

const TETROMINOES = {
  I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
  J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
  L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
  O: [[1, 1], [1, 1]],
  S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
  T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
  Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]]
};

const COLORS = {
  I: '#00f0f0',
  J: '#0000f0',
  L: '#f0a000',
  O: '#f0f000',
  S: '#00f000',
  T: '#a000f0',
  Z: '#f00000'
};

const GAME_DURATION = 180; // 3 minutes in seconds

const NextPiece = ({ piece }) => {
  if (!piece) return null;
  
  const cells = [];
  const maxSize = 4;
  
  for (let y = 0; y < maxSize; y++) {
    for (let x = 0; x < maxSize; x++) {
      const isFilled = piece.shape[y]?.[x] ?? 0;
      cells.push(
        <div
          key={`${y}-${x}`}
          className={`preview-cell ${isFilled ? 'filled' : ''}`}
          style={{ backgroundColor: isFilled ? COLORS[piece.type] : undefined }}
        />
      );
    }
  }

  return (
    <div className="next-piece-container">
      <h2>Next Piece</h2>
      <div className="next-piece-preview">
        {cells}
      </div>
    </div>
  );
};

const TetrisGame = () => {
  const [board, setBoard] = useState(createEmptyBoard());
  const [currentPiece, setCurrentPiece] = useState(null);
  const [nextPiece, setNextPiece] = useState(null);
  const [currentPosition, setCurrentPosition] = useState({ x: 0, y: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [touchStart, setTouchStart] = useState(null);

  function createEmptyBoard() {
    return Array(20).fill().map(() => Array(10).fill(null));
  }

  const generatePiece = useCallback(() => {
    const pieces = Object.keys(TETROMINOES);
    const randomPiece = pieces[Math.floor(Math.random() * pieces.length)];
    return {
      shape: TETROMINOES[randomPiece],
      type: randomPiece
    };
  }, []);

  const checkCollision = useCallback((piece, position) => {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const newX = position.x + x;
          const newY = position.y + y;
          
          if (
            newX < 0 ||
            newX >= 10 ||
            newY >= 20 ||
            (newY >= 0 && board[newY][newX] !== null)
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }, [board]);

  const mergePieceWithBoard = useCallback(() => {
    const newBoard = board.map(row => [...row]);
    let hasBlocksAtTop = false;

    currentPiece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          const newY = currentPosition.y + y;
          const newX = currentPosition.x + x;
          if (newY >= 0) {
            newBoard[newY][newX] = currentPiece.type;
            if (newY <= 1) {
              hasBlocksAtTop = true;
            }
          }
        }
      });
    });

    return { newBoard, hasBlocksAtTop };
  }, [board, currentPiece, currentPosition]);

  const clearRows = useCallback((board) => {
    const newBoard = board.filter(row => row.some(cell => cell === null));
    const clearedLines = 20 - newBoard.length;
    const newRows = Array(clearedLines).fill().map(() => Array(10).fill(null));
    setScore(score => score + (clearedLines * 100));
    return [...newRows, ...newBoard];
  }, []);

  const movePiece = useCallback((dx, dy) => {
    if (!isPlaying || gameOver) return false;
    const newPosition = { x: currentPosition.x + dx, y: currentPosition.y + dy };
    if (!checkCollision(currentPiece, newPosition)) {
      setCurrentPosition(newPosition);
      return true;
    }
    return false;
  }, [currentPiece, currentPosition, checkCollision, isPlaying, gameOver]);

  const rotatePiece = useCallback(() => {
    if (!isPlaying || gameOver) return;
    const rotated = {
      ...currentPiece,
      shape: currentPiece.shape[0].map((_, i) =>
        currentPiece.shape.map(row => row[row.length - 1 - i]))
    };
    
    if (!checkCollision(rotated, currentPosition)) {
      setCurrentPiece(rotated);
    }
  }, [currentPiece, currentPosition, checkCollision, isPlaying, gameOver]);

  const startGame = () => {
    setBoard(createEmptyBoard());
    setCurrentPiece(null);
    setNextPiece(generatePiece());
    setCurrentPosition({ x: 3, y: -2 });
    setGameOver(false);
    setScore(0);
    setIsPlaying(true);
    setTimeLeft(GAME_DURATION);
  };

  const handleTouchStart = (e) => {
    if (!isPlaying || gameOver) return;
    const touch = e.touches[0];
    setTouchStart({
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    });
  };

  const handleTouchMove = (e) => {
    if (!touchStart || !isPlaying || gameOver) return;
    e.preventDefault();
  };

  const handleTouchEnd = (e) => {
    if (!touchStart || !isPlaying || gameOver) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    const deltaTime = Date.now() - touchStart.time;

    if (deltaTime < 500) { // Swipe must be completed within 500ms
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (Math.abs(deltaX) > 30) { // Minimum swipe distance
          if (deltaX > 0) {
            movePiece(1, 0); // Right
          } else {
            movePiece(-1, 0); // Left
          }
        }
      } else {
        // Vertical swipe
        if (deltaY > 30) { // Minimum swipe distance
          movePiece(0, 1); // Down
        } else if (deltaY < -30) {
          rotatePiece(); // Up (rotate)
        }
      }
    }
    setTouchStart(null);
  };

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (!isPlaying || gameOver) return;

      switch (event.key) {
        case 'ArrowLeft':
          movePiece(-1, 0);
          break;
        case 'ArrowRight':
          movePiece(1, 0);
          break;
        case 'ArrowDown':
          movePiece(0, 1);
          break;
        case 'ArrowUp':
          rotatePiece();
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [gameOver, movePiece, rotatePiece, isPlaying]);

  useEffect(() => {
    let timer;
    if (isPlaying && !gameOver && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(time => {
          if (time <= 1) {
            setGameOver(true);
            setIsPlaying(false);
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, gameOver, timeLeft]);

  useEffect(() => {
    let gameLoop;
    
    if (isPlaying && !gameOver) {
      if (!currentPiece) {
        const newPiece = nextPiece || generatePiece();
        const newPosition = { x: 3, y: -2 };
        
        if (checkCollision(newPiece, newPosition)) {
          setGameOver(true);
          setIsPlaying(false);
        } else {
          setCurrentPiece(newPiece);
          setCurrentPosition(newPosition);
          setNextPiece(generatePiece());
        }
        return;
      }

      gameLoop = setInterval(() => {
        if (!movePiece(0, 1)) {
          const { newBoard, hasBlocksAtTop } = mergePieceWithBoard();
          if (hasBlocksAtTop) {
            setBoard(newBoard);
            setGameOver(true);
            setIsPlaying(false);
          } else {
            setBoard(clearRows(newBoard));
            setCurrentPiece(null);
          }
        }
      }, 1000);
    }

    return () => {
      clearInterval(gameLoop);
    };
  }, [currentPiece, nextPiece, generatePiece, movePiece, mergePieceWithBoard, clearRows, checkCollision, gameOver, isPlaying]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const cells = [];
  for (let y = 0; y < 20; y++) {
    for (let x = 0; x < 10; x++) {
      let content = board[y][x];
      if (currentPiece && !gameOver) {
        currentPiece.shape.forEach((row, pieceY) => {
          row.forEach((value, pieceX) => {
            if (
              value &&
              pieceY + currentPosition.y === y &&
              pieceX + currentPosition.x === x
            ) {
              content = currentPiece.type;
            }
          });
        });
      }
      cells.push(
        <div
          key={`${y}-${x}`}
          className={`cell ${content ? 'filled' : ''}`}
          style={{ backgroundColor: content ? COLORS[content] : undefined }}
        />
      );
    }
  }

  return (
    <div className="tetris-container">
      <div className="game-info">
        <div className="score">Score: {score}</div>
        <div className="timer">Time: {formatTime(timeLeft)}</div>
        <NextPiece piece={nextPiece} />
      </div>
      <div 
        className="tetris-board"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {cells}
        {!isPlaying && (
          <button className="start-button" onClick={startGame}>
            {gameOver ? 'Play Again' : 'Start Game'}
          </button>
        )}
        {gameOver && <div className="game-over">Game Over!</div>}
      </div>
      {isPlaying && !gameOver && (
        <div className="mobile-controls">
          <button className="control-button left" onTouchStart={() => movePiece(-1, 0)}>
            ←
          </button>
          <button className="control-button right" onTouchStart={() => movePiece(1, 0)}>
            →
          </button>
          <button className="control-button down" onTouchStart={() => movePiece(0, 1)}>
            ↓
          </button>
          <button className="control-button rotate" onTouchStart={rotatePiece}>
            ↻
          </button>
        </div>
      )}
    </div>
  );
};

export default TetrisGame;