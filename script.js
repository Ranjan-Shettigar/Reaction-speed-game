const target = document.getElementById('target');
const ghostTarget = document.getElementById('ghost-target');
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
// Ghost replay variables
let gameStartTime = 0;
let currentReplay = [];
let ghostReplayData = [];
let ghostTimeouts = [];

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

        const containerWidth = gameContainer.clientWidth - 30;
        const containerHeight = gameContainer.clientHeight - 30;
        powerUp.style.left = `${Math.random() * containerWidth}px`;
        powerUp.style.top = `${Math.random() * containerHeight}px`;

        gameContainer.appendChild(powerUp);

        setTimeout(() => powerUp.remove(), 3000);

        powerUp.addEventListener('click', (e) => {
            e.stopPropagation();
            collectPowerUp(powerUpType);
            powerUp.remove();
        });
    }
}

function collectPowerUp(type) {
    powerUpsCollected++;
    activePowerUps.add(type);
    updatePowerUpIndicators();

    setTimeout(() => {
        activePowerUps.delete(type);
        updatePowerUpIndicators();
    }, powerUpTypes[type].duration);
}

function updatePowerUpIndicators() {
    powerUpsIndicator.innerHTML = '';
    activePowerUps.forEach(type => {
        const indicator = document.createElement('span');
        indicator.className = 'power-up-indicator';
        indicator.style.backgroundColor = powerUpTypes[type].color;
        indicator.title = type;
        powerUpsIndicator.appendChild(indicator);
    });
} function moveTarget() {
    const containerWidth = gameContainer.clientWidth - target.clientWidth;
    const containerHeight = gameContainer.clientHeight - target.clientHeight;

    const newX = Math.random() * containerWidth;
    const newY = Math.random() * containerHeight;

    // Record this position for ghost replay
    const timestamp = Date.now() - gameStartTime;
    currentReplay.push({
        time: timestamp,
        x: newX,
        y: newY,
        size: parseInt(target.style.width || '50', 10) || 50
    });

    target.style.left = `${newX}px`;
    target.style.top = `${newY}px`;
} function updateScore(basePoints) {
    let points = basePoints;
    if (activePowerUps.has('doublePoints')) points *= 2;

    const comboMultiplier = 1 + (currentCombo * 0.1);
    points = Math.round(points * comboMultiplier);

    score += points;
    scoreElement.textContent = score;

    // Check if the player just beat the high score
    if (score > highScore) {
        highScore = score;
        highScoreElement.textContent = highScore;
        checkGhostBeaten();
    }

    return points;
}

function updateCombo() {
    const currentTime = Date.now();
    if (currentTime - lastClickTime < 1000) {
        currentCombo++;
        highestCombo = Math.max(highestCombo, currentCombo);
        comboIndicator.textContent = `Combo x${currentCombo}!`;
        comboIndicator.style.display = 'block';
    } else {
        currentCombo = 0;
        comboIndicator.style.display = 'none';
    }
    lastClickTime = currentTime;
}

function updateTimer() {
    timeLeft--;
    timerElement.textContent = timeLeft;

    if (timeLeft <= 0) {
        endGame();
    }
}

function changeDifficulty() {
    const difficulty = document.getElementById('difficulty-select').value;
    const settings = difficultySettings[difficulty];

    target.style.width = `${settings.size}px`;
    target.style.height = `${settings.size}px`;

    clearInterval(gameInterval);
    gameInterval = setInterval(moveTarget, settings.interval);
} function endGame() {
    clearInterval(gameInterval);
    clearInterval(timerInterval);
    clearInterval(powerUpInterval);
    target.style.display = 'none';
    gameOverElement.style.display = 'block';

    document.getElementById('final-score').textContent = score;
    document.getElementById('highest-combo').textContent = highestCombo;
    document.getElementById('targets-hit').textContent = targetsHit;
    document.getElementById('powerups-collected').textContent = powerUpsCollected;
    // If this is a new high score, save this replay for the ghost
    if (score >= highScore) {
        console.log("New high score! Saving ghost replay data with", currentReplay.length, "movements");
        localStorage.setItem('ghostReplay', JSON.stringify(currentReplay));
        highScore = score;
        localStorage.setItem('highScore', highScore.toString());

        // Show a message that a new high score was achieved
        const newHighScoreMessage = document.createElement('div');
        newHighScoreMessage.textContent = 'New High Score!';
        newHighScoreMessage.style.color = '#ffdd00';
        newHighScoreMessage.style.fontSize = '24px';
        newHighScoreMessage.style.fontWeight = 'bold';
        newHighScoreMessage.style.marginBottom = '15px';
        gameOverElement.insertBefore(newHighScoreMessage, gameOverElement.firstChild);

        // Automatically show the replay after a small delay
        setTimeout(() => {
            showInstantReplay();
        }, 1500);
    }

    // Remove all power-ups
    document.querySelectorAll('.power-up').forEach(el => el.remove());

    // Clear ghost timeouts
    ghostTimeouts.forEach(t => clearTimeout(t));
    ghostTarget.style.display = 'none';
    document.getElementById('ghost-label').style.display = 'none';
} function startGame() {
    // Reset game state
    score = 0;
    timeLeft = 30;
    currentCombo = 0;
    highestCombo = 0;
    targetsHit = 0;
    powerUpsCollected = 0;
    activePowerUps.clear();
    currentReplay = [];
    gameStartTime = Date.now();

    // Update UI
    scoreElement.textContent = score;
    timerElement.textContent = timeLeft;
    target.style.display = 'block';
    gameOverElement.style.display = 'none';
    comboIndicator.style.display = 'none';
    
    // Check if ghost-beaten element exists before trying to hide it
    const ghostBeatenElement = document.getElementById('ghost-beaten');
    if (ghostBeatenElement) {
        ghostBeatenElement.style.display = 'none';
    }

    // Remove any existing power-ups from previous games
    document.querySelectorAll('.power-up').forEach(el => el.remove());

    // Clear any existing intervals
    clearInterval(gameInterval);
    clearInterval(timerInterval);
    clearInterval(powerUpInterval);

    // Start game loops
    changeDifficulty();
    moveTarget();
    timerInterval = setInterval(updateTimer, 1000);
    powerUpInterval = setInterval(spawnPowerUp, 2000);

    // Load ghost replay data and start ghost replay
    try {
        const storedGhostData = localStorage.getItem('ghostReplay');
        console.log("Retrieved ghost data from localStorage:", storedGhostData ? storedGhostData.substring(0, 50) + "..." : "null");

        ghostReplayData = storedGhostData ? JSON.parse(storedGhostData) : [];
        console.log("Parsed ghost data contains", ghostReplayData.length, "movements");

        startGhostReplay();
    } catch (e) {
        console.error("Error loading ghost data:", e);
        ghostReplayData = [];
    }
} function startGhostReplay() {
    // Clear any old ghost timeouts
    ghostTimeouts.forEach(t => clearTimeout(t));
    ghostTimeouts = [];

    // Always keep ghost hidden during regular gameplay
    ghostTarget.style.display = 'none';
    const ghostLabel = document.getElementById('ghost-label');
    ghostLabel.style.display = 'none';

    // Still load ghost data for later use in instant replay
    const ghostEnabled = document.getElementById('ghost-toggle').checked;

    // If ghost toggle is off or no ghost data exists, don't load ghost data
    if (!ghostEnabled || !ghostReplayData || ghostReplayData.length === 0) {
        return;
    }

    // Just store the data for later, but don't schedule any movement during gameplay
    console.log("Ghost data loaded with", ghostReplayData.length, "movements (will show only in replay)");
} function toggleGhost() {
    const ghostEnabled = document.getElementById('ghost-toggle').checked;

    if (ghostEnabled) {
        // Load ghost data but don't display it during gameplay
        ghostReplayData = JSON.parse(localStorage.getItem('ghostReplay')) || [];
        console.log("Ghost data loaded for replay (when requested)");
    } else {
        // Clear ghost data
        ghostTimeouts.forEach(t => clearTimeout(t));
        ghostReplayData = [];
    }

    // Save preference
    localStorage.setItem('ghostEnabled', ghostEnabled);
} function checkGhostBeaten() {
    // If ghost data exists and current score is greater than the saved high score
    const savedHighScore = parseInt(localStorage.getItem('highScore') || '0', 10);
    if (ghostReplayData && ghostReplayData.length > 0 && score > savedHighScore) {
        const ghostBeatenMsg = document.getElementById('ghost-beaten');
        ghostBeatenMsg.style.display = 'block';

        // Hide the message after animation completes
        setTimeout(() => {
            ghostBeatenMsg.style.display = 'none';
        }, 2000);
    }
}

function resetGhost() {
    // Clear ghost data
    localStorage.removeItem('ghostReplay');
    localStorage.removeItem('highScore');
    ghostReplayData = [];

    // Reset high score
    highScore = 0;
    localStorage.setItem('highScore', '0');
    highScoreElement.textContent = '0';

    // Show confirmation
    alert('Ghost data has been reset!');

    // Hide the game over screen and start a new game
    gameOverElement.style.display = 'none';
    startGame();
}

function recreateGameElements() {
    // Re-add the ghost-beaten element
    const ghostBeatenElement = document.createElement('div');
    ghostBeatenElement.id = 'ghost-beaten';
    ghostBeatenElement.textContent = 'You beat the ghost!';
    ghostBeatenElement.setAttribute('role', 'alert');
    ghostBeatenElement.setAttribute('aria-hidden', 'true');
    ghostBeatenElement.style.display = 'none';
    ghostBeatenElement.style.position = 'absolute';
    ghostBeatenElement.style.top = '50%';
    ghostBeatenElement.style.left = '50%';
    ghostBeatenElement.style.transform = 'translate(-50%, -50%)';
    ghostBeatenElement.style.background = 'rgba(0, 0, 0, 0.8)';
    ghostBeatenElement.style.color = '#4CAF50';
    ghostBeatenElement.style.fontSize = '28px';
    ghostBeatenElement.style.fontWeight = 'bold';
    ghostBeatenElement.style.fontFamily = 'Orbitron, sans-serif';
    ghostBeatenElement.style.padding = '15px 25px';
    ghostBeatenElement.style.borderRadius = '15px';
    ghostBeatenElement.style.zIndex = '10';
    gameContainer.appendChild(ghostBeatenElement);
    
    // Re-add the target element
    const targetElement = document.createElement('div');
    targetElement.id = 'target';
    targetElement.setAttribute('role', 'button');
    targetElement.setAttribute('aria-label', 'Target circle');
    targetElement.style.display = 'none';
    targetElement.style.width = '50px';
    targetElement.style.height = '50px';
    targetElement.style.background = 'radial-gradient(circle at 30% 30%, rgba(255, 68, 68, 1), rgba(255, 20, 20, 1))';
    targetElement.style.borderRadius = '50%';
    targetElement.style.position = 'absolute';
    targetElement.style.transition = 'all 0.2s ease';
    targetElement.style.boxShadow = '0 0 15px rgba(255, 68, 68, 0.7), 0 0 30px rgba(255, 68, 68, 0.3)';
    gameContainer.appendChild(targetElement);
    
    // Re-add the combo indicator
    const comboIndicatorElement = document.createElement('div');
    comboIndicatorElement.id = 'combo-indicator';
    comboIndicatorElement.setAttribute('aria-live', 'polite');
    comboIndicatorElement.style.position = 'absolute';
    comboIndicatorElement.style.top = '15px';
    comboIndicatorElement.style.left = '50%';
    comboIndicatorElement.style.transform = 'translateX(-50%)';
    comboIndicatorElement.style.fontSize = '28px';
    comboIndicatorElement.style.fontWeight = 'bold';
    comboIndicatorElement.style.fontFamily = 'Orbitron, sans-serif';
    gameContainer.appendChild(comboIndicatorElement);    // Update our global DOM references
    window.target = targetElement;
    window.comboIndicator = comboIndicatorElement;
    
    // Note: ghostTarget must be updated separately since ghostTargetElement
    // is defined in the showInstantReplay function, not here
    
    // Re-add the click event listener to the new target element
    targetElement.addEventListener('click', (e) => {
        e.stopPropagation();
        targetsHit++;
        const points = updateScore(10);
        createScorePopup(e.pageX - gameContainer.offsetLeft, e.pageY - gameContainer.offsetTop, points);
        updateCombo();
        moveTarget();
    });
}

function showInstantReplay() {
    // Hide game over screen
    gameOverElement.style.display = 'none';

    // Clear any existing ghost timeouts
    ghostTimeouts.forEach(t => clearTimeout(t));
    ghostTimeouts = [];    // Reset the game environment but don't start a new game    
    gameContainer.innerHTML = ''; // Clear container

    // Re-add necessary elements
    const ghostTargetElement = document.createElement('div');
    ghostTargetElement.id = 'ghost-target';
    ghostTargetElement.style.border = '2px dashed rgba(255, 255, 255, 0.6)';
    ghostTargetElement.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    ghostTargetElement.style.borderRadius = '50%';
    ghostTargetElement.style.position = 'absolute';
    ghostTargetElement.style.transition = 'all 0.2s ease';
    ghostTargetElement.style.boxShadow = '0 0 10px rgba(255,255,255,0.3)';
    gameContainer.appendChild(ghostTargetElement);
    
    // Update the global reference to ghost target
    window.ghostTarget = ghostTargetElement;    const ghostLabelElement = document.createElement('div');
    ghostLabelElement.id = 'ghost-label';
    ghostLabelElement.textContent = 'Top Score Replay';
    ghostLabelElement.style.display = 'block';
    ghostLabelElement.style.position = 'absolute';
    ghostLabelElement.style.top = '40px';
    ghostLabelElement.style.left = '50%';
    ghostLabelElement.style.transform = 'translateX(-50%)';
    ghostLabelElement.style.fontSize = '14px';
    ghostLabelElement.style.color = 'rgba(255, 255, 255, 0.7)';
    ghostLabelElement.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
    ghostLabelElement.style.padding = '3px 8px';
    ghostLabelElement.style.borderRadius = '5px';
    gameContainer.appendChild(ghostLabelElement);
    
    // Add all game elements and update DOM references
    recreateGameElements();
      // Add a back button
    const backButton = document.createElement('button');
    backButton.textContent = 'Back to Game';
    backButton.style.position = 'absolute';
    backButton.style.bottom = '20px';
    backButton.style.left = '50%';
    backButton.style.transform = 'translateX(-50%)';
    backButton.onclick = function () {
        // Clean up properly before reloading
        ghostTimeouts.forEach(t => clearTimeout(t));
        showInstantReplay.running = false;
        
        // Set flag in localStorage to show game over screen after reload
        localStorage.setItem('returnFromReplay', 'true');
        
        // Reload the page to reset everything properly
        window.location.reload();
    };
    gameContainer.appendChild(backButton);

    // Use the current replay data for instant replay
    let replayData;
    if (score >= highScore) {
        // If current score is a high score, use the current replay
        replayData = currentReplay;
    } else {
        // Otherwise use the stored high score replay
        replayData = JSON.parse(localStorage.getItem('ghostReplay')) || [];
    }

    // Mark that instant replay is running
    showInstantReplay.running = true;

    // No replay data available
    if (!replayData || replayData.length === 0) {
        ghostLabelElement.textContent = 'No replay data available';
        return;
    }

    // Schedule the ghost movements with a small initial delay
    setTimeout(() => {
        if (!showInstantReplay.running) return;

        const startTime = Date.now();
        replayData.forEach(record => {
            const t = setTimeout(() => {
                if (!showInstantReplay.running) return;

                ghostTargetElement.style.width = `${record.size}px`;
                ghostTargetElement.style.height = `${record.size}px`;
                ghostTargetElement.style.left = `${record.x}px`;
                ghostTargetElement.style.top = `${record.y}px`;
                ghostTargetElement.style.display = 'block';
            }, record.time);
            ghostTimeouts.push(t);
        });

        // Auto-return to game over screen when replay completes
        if (replayData.length > 0) {
            const lastRecord = replayData[replayData.length - 1];
            setTimeout(() => {
                if (showInstantReplay.running) {
                    gameOverElement.style.display = 'block';
                    showInstantReplay.running = false;
                }
            }, lastRecord.time + 2000); // 2 seconds after the last movement
        }
    }, 500);
}

// Initialize flag
showInstantReplay.running = false;

target.addEventListener('click', (e) => {
    e.stopPropagation();
    targetsHit++;
    const points = updateScore(10);
    createScorePopup(e.pageX - gameContainer.offsetLeft, e.pageY - gameContainer.offsetTop, points);
    updateCombo();
    moveTarget();
});        // Initialize high score from localStorage
const savedHighScore = localStorage.getItem('highScore');
if (savedHighScore) {
    highScore = parseInt(savedHighScore, 10);
    highScoreElement.textContent = highScore;
}

// Function to ensure all DOM references are valid
function refreshDOMReferences() {
    // Re-initialize all DOM element references
    const domElements = {
        'target': target,
        'ghost-target': ghostTarget,
        'score': scoreElement,
        'high-score': highScoreElement,
        'timer': timerElement,
        'game-over': gameOverElement,
        'final-score': finalScoreElement,
        'game-container': gameContainer,
        'combo-indicator': comboIndicator,
        'power-ups': powerUpsIndicator
    };

    // Refresh any invalid references
    for (const [id, elementRef] of Object.entries(domElements)) {
        if (!elementRef || !document.getElementById(id)) {
            console.log(`Refreshing DOM reference for ${id}`);
            window[id.replace(/-/g, '') + 'Element'] = document.getElementById(id);
        }
    }
}

// Initialize ghost toggle state
const ghostToggle = document.getElementById('ghost-toggle');
if (ghostToggle) {
    ghostToggle.checked = localStorage.getItem('ghostEnabled') !== 'false';
}

// Check if we're returning from replay
if (localStorage.getItem('returnFromReplay') === 'true') {
    // Clear the flag
    localStorage.removeItem('returnFromReplay');
    
    // Ensure all DOM references are valid
    refreshDOMReferences();
    
    // Show the game over screen directly
    gameOverElement.style.display = 'block';
} else {
    // Ensure all DOM references are valid
    refreshDOMReferences();
    
    // Start the game initially
    startGame();
}