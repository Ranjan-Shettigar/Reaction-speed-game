const target = document.getElementById('target');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const timerElement = document.getElementById('timer');
const gameOverElement = document.getElementById('game-over');
const finalScoreElement = document.getElementById('final-score');
const gameContainer = document.getElementById('game-container');
const comboIndicator = document.getElementById('combo-indicator');
const powerUpsIndicator = document.getElementById('power-ups');

let score = 0;
let highScore = 0;
let timeLeft = 30;
let gameInterval;
let timerInterval;
let powerUpInterval;
let currentCombo = 0;
let highestCombo = 0;
let targetsHit = 0;
let powerUpsCollected = 0;
let activePowerUps = new Set();
let lastClickTime = 0;
let difficultySettings = {
    easy: { interval: 1500, size: 50 },
    medium: { interval: 1000, size: 40 },
    hard: { interval: 750, size: 30 },
    impossible: { interval: 500, size: 20 }
};

const powerUpTypes = {
    doublePoints: { color: '#ffdd00', duration: 5000, symbol: '2x' },
    slowMotion: { color: '#00ffff', duration: 3000, symbol: '⏰' },
    bigTarget: { color: '#ff00ff', duration: 4000, symbol: '⭕' }
};

function createScorePopup(x, y, points) {
    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.textContent = `+${points}`;
    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
    gameContainer.appendChild(popup);
    
    setTimeout(() => popup.remove(), 1000);
}

function spawnPowerUp() {
    if (Math.random() < 0.3) { // 30% chance to spawn power-up
        const powerUp = document.createElement('div');
        powerUp.className = 'power-up';
        const powerUpType = Object.keys(powerUpTypes)[Math.floor(Math.random() * Object.keys(powerUpTypes).length)];
        powerUp.dataset.type = powerUpType;
        powerUp.style.backgroundColor = powerUpTypes[powerUpType].color;
        
        const containerWidth = gameContainer.clientWidth - difficultySettings.hard.size;
        const containerHeight = gameContainer.clientHeight - difficultySettings.hard.size;
        
        const x = Math.random() * containerWidth;
        const y = Math.random() * containerHeight;
        
        powerUp.style.left = `${x}px`;
        powerUp.style.top = `${y}px`;
        
        gameContainer.appendChild(powerUp);
        
        setTimeout(() => {
            powerUp.remove();
        }, powerUpTypes[powerUpType].duration);
    }
}

function updateScore(points) {
    score += points;
    scoreElement.textContent = `Score: ${score}`;
    
    createScorePopup(target.offsetLeft, target.offsetTop, points);
    
    currentCombo++;
    if (currentCombo > highestCombo) {
        highestCombo = currentCombo;
        comboIndicator.textContent = `Combo: ${highestCombo}`;
    }
}

function resetCombo() {
    currentCombo = 0;
    comboIndicator.textContent = '';
}

function startGame() {
    score = 0;
    timeLeft = 30;
    activePowerUps.clear();
    gameContainer.innerHTML = '';
    gameContainer.appendChild(target);
    resetCombo();
    
    highScore = Math.max(highScore, score);
    highScoreElement.textContent = `High Score: ${highScore}`;
    
    gameInterval = setInterval(() => {
        moveTarget();
        spawnPowerUp();
    }, difficultySettings.hard.interval);
    
    timerInterval = setInterval(() => {
        timeLeft--;
        timerElement.textContent = `Time: ${timeLeft}`;
        
        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
    
    gameStartTime = Date.now();
    currentReplay = [];
    
    // load ghost data
    ghostReplayData = JSON.parse(localStorage.getItem('ghostReplay')) || [];
    startGhostReplay();
}

function endGame() {
    clearInterval(gameInterval);
    clearInterval(timerInterval);
    
    gameOverElement.style.display = 'block';
    finalScoreElement.textContent = `Final Score: ${score}`;
    
    // if new high score, save this run
    if (score >= highScore) {
        localStorage.setItem('ghostReplay', JSON.stringify(currentReplay));
    }
}

function moveTarget() {
    const containerWidth = gameContainer.clientWidth - target.clientWidth;
    const containerHeight = gameContainer.clientHeight - target.clientHeight;
    
    const newX = Math.random() * containerWidth;
    const newY = Math.random() * containerHeight;
    
    // record this move
    currentReplay.push({
        time: Date.now() - gameStartTime,
        x: newX, y: newY,
        size: target.clientWidth
    });
    
    target.style.left = `${newX}px`;
    target.style.top = `${newY}px`;
}

// schedule the ghost’s movement
function startGhostReplay() {
    // clear old timers
    ghostTimeouts.forEach(t => clearTimeout(t));
    ghostTimeouts = [];
    ghostTarget.style.display = 'none';
    
    ghostReplayData.forEach(record => {
        const t = setTimeout(() => {
            ghostTarget.style.width = `${record.size}px`;
            ghostTarget.style.height = `${record.size}px`;
            ghostTarget.style.left = `${record.x}px`;
            ghostTarget.style.top = `${record.y}px`;
            ghostTarget.style.display = 'block';
        }, record.time);
        ghostTimeouts.push(t);
    });
}
