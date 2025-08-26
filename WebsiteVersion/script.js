class SudokuGame {
    constructor() {
        this.grid = Array(9).fill().map(() => Array(9).fill(0));
        this.solution = Array(9).fill().map(() => Array(9).fill(0));
        this.mistakes = 0;
        this.maxMistakes = 3;
        this.difficulty = "Easy";
        this.startTime = Date.now();
        this.timerRunning = true;
        
        this.gameMode = "single";
        this.isMultiplayer = false;
        this.currentPlayer = 1;
        this.player1Mistakes = 0;
        this.player2Mistakes = 0;
        
        this.spotifyConnected = false;
        this.currentSong = "No song playing";
        this.isMusicPlaying = false;
        this.currentTrackId = null;
        this.trackTempo = 120;
        this.trackEnergy = 0.5;
        this.songStartTime = 0;
        
        this.soundWaves = Array(50).fill().map(() => Math.random() * 0.5 + 0.3);
        this.waveAnimationRunning = true;
        
        this.difficultySettings = {
            "Easy": 35,
            "Medium": 45,
            "Hard": 55,
            "Stupidly Hard": 60,
            "Impossibly Hard": 70
        };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.generatePuzzle();
        this.updateTimer();
        this.animateWaves();
        this.checkThemeChange();
    }
    
    setupEventListeners() {
        document.querySelectorAll('.cell').forEach(cell => {
            cell.addEventListener('input', (e) => this.validateInput(e));
            cell.addEventListener('click', (e) => this.onCellClick(e));
            cell.addEventListener('keydown', (e) => this.onKeyDown(e));
        });
        
        document.getElementById('mode-select').addEventListener('change', (e) => {
            this.changeMode(e.target.value);
        });
        
        document.getElementById('difficulty-select').addEventListener('change', (e) => {
            this.changeDifficulty(e.target.value);
        });
        
        document.getElementById('spotify-btn').addEventListener('click', () => {
            this.connectSpotify();
        });
    }
    
    validateInput(event) {
        const cell = event.target;
        let value = cell.value;
        
        if (value.length > 1) {
            value = value.slice(-1);
            cell.value = value;
        }
        
        if (value && (!/^[1-9]$/.test(value))) {
            cell.value = '';
            return;
        }
        
        if (value) {
            setTimeout(() => this.checkNumber(cell), 0);
        }
    }
    
    onCellClick(event) {
        const cell = event.target;
        if (cell.classList.contains('wrong')) {
            cell.value = '';
            cell.classList.remove('wrong');
            cell.classList.add('empty');
        }
    }
    
    onKeyDown(event) {
        const cell = event.target;
        if (event.key === 'Backspace' && cell.classList.contains('wrong')) {
            cell.value = '';
            cell.classList.remove('wrong');
            cell.classList.add('empty');
        }
    }
    
    checkNumber(cell) {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        const value = parseInt(cell.value);
        
        if (this.isMultiplayer) {
            const currentMistakes = this.currentPlayer === 1 ? this.player1Mistakes : this.player2Mistakes;
            if (currentMistakes >= this.maxMistakes) return;
        } else {
            if (this.mistakes >= this.maxMistakes) return;
        }
        
        if (!value || cell.classList.contains('prefilled')) {
            return;
        }
        
        if (value === this.solution[row][col]) {
            cell.classList.remove('wrong', 'empty');
            if (this.isMultiplayer) {
                cell.classList.add(this.currentPlayer === 1 ? 'player1' : 'player2');
                this.switchPlayer();
            } else {
                cell.classList.add('correct');
            }
            cell.disabled = true;
            this.checkSolution();
        } else {
            cell.classList.remove('empty', 'correct', 'player1', 'player2');
            cell.classList.add('wrong');
            
            if (this.isMultiplayer) {
                if (this.currentPlayer === 1) {
                    this.player1Mistakes++;
                } else {
                    this.player2Mistakes++;
                }
                this.updateMultiplayerDisplay();
                
                if ((this.currentPlayer === 1 && this.player1Mistakes >= this.maxMistakes) ||
                    (this.currentPlayer === 2 && this.player2Mistakes >= this.maxMistakes)) {
                    const winner = this.currentPlayer === 1 ? "Player 2" : "Player 1";
                    alert(`${winner} wins! Loading new game...`);
                    this.newGame();
                } else {
                    this.switchPlayer();
                }
            } else {
                this.mistakes++;
                this.updateMistakeDisplay();
                
                if (this.mistakes >= this.maxMistakes) {
                    this.timerRunning = false;
                    alert("Sorry you failed! Loading new game...");
                    this.newGame();
                }
            }
        }
    }
    
    isValid(grid, row, col, num) {
        for (let j = 0; j < 9; j++) {
            if (grid[row][j] === num) return false;
        }
        
        for (let i = 0; i < 9; i++) {
            if (grid[i][col] === num) return false;
        }
        
        const startRow = Math.floor(row / 3) * 3;
        const startCol = Math.floor(col / 3) * 3;
        for (let i = startRow; i < startRow + 3; i++) {
            for (let j = startCol; j < startCol + 3; j++) {
                if (grid[i][j] === num) return false;
            }
        }
        
        return true;
    }
    
    fillGrid() {
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                if (this.grid[i][j] === 0) {
                    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
                    this.shuffleArray(numbers);
                    
                    for (const num of numbers) {
                        if (this.isValid(this.grid, i, j, num)) {
                            this.grid[i][j] = num;
                            if (this.fillGrid()) {
                                return true;
                            }
                            this.grid[i][j] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }
    
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    
    generatePuzzle() {
        this.mistakes = 0;
        this.player1Mistakes = 0;
        this.player2Mistakes = 0;
        this.currentPlayer = 1;
        this.startTime = Date.now();
        this.timerRunning = true;
        
        this.grid = Array(9).fill().map(() => Array(9).fill(0));
        
        this.fillGrid();
        
        this.solution = this.grid.map(row => [...row]);
        
        const cellsToRemove = this.difficultySettings[this.difficulty];
        this.removeCells(cellsToRemove);
        
        this.updateDisplay();
        this.updateMistakeDisplay();
        if (this.isMultiplayer) {
            this.updateMultiplayerDisplay();
        }
    }
    
    removeCells(count) {
        const positions = [];
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                positions.push([i, j]);
            }
        }
        this.shuffleArray(positions);
        
        for (let i = 0; i < Math.min(count, positions.length); i++) {
            const [row, col] = positions[i];
            this.grid[row][col] = 0;
        }
    }
    
    updateDisplay() {
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            const value = this.grid[row][col];
            
            cell.value = value || '';
            cell.disabled = false;
            cell.classList.remove('prefilled', 'correct', 'wrong', 'player1', 'player2', 'empty');
            
            if (value !== 0) {
                cell.classList.add('prefilled');
                cell.disabled = true;
            } else {
                cell.classList.add('empty');
            }
        });
    }
    
    updateMistakeDisplay() {
        document.getElementById('mistakes').textContent = `Mistakes: ${this.mistakes}/${this.maxMistakes}`;
    }
    
    updateMultiplayerDisplay() {
        document.getElementById('mistakes').textContent = 
            `P1: ${this.player1Mistakes}/${this.maxMistakes} | P2: ${this.player2Mistakes}/${this.maxMistakes}`;
        
        const playerLabel = document.getElementById('player-turn');
        const playerColor = this.currentPlayer === 1 ? 'var(--player1-color)' : 'var(--player2-color)';
        playerLabel.textContent = `Player ${this.currentPlayer}'s Turn`;
        playerLabel.style.color = playerColor;
    }
    
    switchPlayer() {
        if (!this.isMultiplayer) return;
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        this.updateMultiplayerDisplay();
    }
    
    changeMode(mode) {
        this.gameMode = mode;
        this.isMultiplayer = (mode === "multiplayer");
        this.newGame();
    }
    
    changeDifficulty(difficulty) {
        this.difficulty = difficulty;
        this.newGame();
    }
    
    newGame() {
        this.generatePuzzle();
    }
    
    updateTimer() {
        if (this.timerRunning) {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            document.getElementById('timer').textContent = 
                `Time: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        setTimeout(() => this.updateTimer(), 1000);
    }
    
    checkSolution() {
        const cells = document.querySelectorAll('.cell');
        const currentGrid = Array(9).fill().map(() => Array(9).fill(0));
        
        cells.forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            const value = parseInt(cell.value) || 0;
            currentGrid[row][col] = value;
        });
        
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                if (currentGrid[i][j] === 0) return false;
                
                const temp = currentGrid[i][j];
                currentGrid[i][j] = 0;
                if (!this.isValid(currentGrid, i, j, temp)) {
                    currentGrid[i][j] = temp;
                    return false;
                }
                currentGrid[i][j] = temp;
            }
        }
        
        this.timerRunning = false;
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        alert(`Congratulations! Puzzle solved in ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}!`);
        this.newGame();
        return true;
    }
    
    connectSpotify() {
        const authWindow = window.open('/spotify-auth', 'spotify-auth', 
            'width=500,height=600,scrollbars=yes,resizable=yes');
        
        window.addEventListener('message', (event) => {
            if (event.data === 'spotify-connected') {
                this.spotifyConnected = true;
                const spotifyBtn = document.getElementById('spotify-btn');
                spotifyBtn.textContent = "Connected!";
                spotifyBtn.classList.remove('demo');
                spotifyBtn.classList.add('connected');
                this.getCurrentSong();
            }
        });
        
        if (!authWindow) {
            alert('Please allow popups for this site to connect to Spotify');
        }
    }
    
    getCurrentSong() {
        if (!this.spotifyConnected) return;
        
        fetch('/spotify-current-song')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Spotify API error');
                }
                return response.json();
            })
            .then(data => {
                if (data && data.item) {
                    const track = data.item;
                    const artist = track.artists[0].name;
                    const song = track.name;
                    const trackId = track.id;
                    this.isMusicPlaying = data.is_playing;
                    
                    if (trackId !== this.currentTrackId) {
                        this.currentTrackId = trackId;
                        this.trackTempo = 120;
                        this.trackEnergy = 0.6;
                    }
                    
                    if (this.isMusicPlaying) {
                        const progressMs = data.progress_ms || 0;
                        this.songStartTime = Date.now() - progressMs;
                        this.currentSong = `♪ ${artist} - ${song}`;
                    } else {
                        this.currentSong = `⏸ ${artist} - ${song} (Paused)`;
                    }
                } else {
                    this.currentSong = "No song playing";
                    this.isMusicPlaying = false;
                }
                
                document.getElementById('song-info').textContent = this.currentSong;
            })
            .catch(error => {
                console.error('Spotify API error:', error);
                this.currentSong = "Spotify connection lost";
                this.isMusicPlaying = false;
                document.getElementById('song-info').textContent = this.currentSong;
            });
        
        if (this.spotifyConnected) {
            setTimeout(() => this.getCurrentSong(), 2000);
        }
    }
    
    animateWaves() {
        if (!this.waveAnimationRunning) return;
        
        const canvas = document.getElementById('wave-canvas');
        const ctx = canvas.getContext('2d');
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        const waveColor = getComputedStyle(document.documentElement).getPropertyValue('--wave-color');
        const barWidth = canvasWidth / this.soundWaves.length;
        
        for (let i = 0; i < this.soundWaves.length; i++) {
            const x = i * barWidth;
            const waveHeight = Math.max(8, this.soundWaves[i] * (canvasHeight - 5));
            const centerY = canvasHeight / 2;
            
            ctx.fillStyle = waveColor;
            ctx.fillRect(
                x + 1.5, 
                centerY - waveHeight / 2,
                barWidth - 3, 
                waveHeight
            );
        }
        
        if (this.isMusicPlaying) {
            const beatIntensity = 0.6 + 0.3 * Math.sin(Date.now() * 0.001 * (this.trackTempo / 60.0) * 2 * Math.PI);
            this.soundWaves.push(Math.random() * 0.5 + beatIntensity);
        } else {
            this.soundWaves.push(Math.random() * 0.1 + 0.05);
        }
        this.soundWaves.shift();
        
        setTimeout(() => this.animateWaves(), 120);
    }
    
    checkThemeChange() {
        setTimeout(() => this.checkThemeChange(), 2000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SudokuGame();
}); 
