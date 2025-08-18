import tkinter as tk
from tkinter import messagebox
import random
import time
import sys
import math
import threading
try:
    import spotipy
    from spotipy.oauth2 import SpotifyOAuth
    SPOTIFY_AVAILABLE = True
except ImportError:
    SPOTIFY_AVAILABLE = False

class SudokuGame:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Sudoku Game")
        self.root.geometry("550x700")
        
        self.is_dark_mode = self.detect_dark_mode()
        self.setup_colors()
        
        self.root.configure(bg=self.bg_color)
        
        self.grid = [[0 for _ in range(9)] for _ in range(9)]
        self.entries = [[None for _ in range(9)] for _ in range(9)]
        self.mistakes = 0
        self.max_mistakes = 3
        self.difficulty = "Easy"
        self.start_time = time.time()
        self.timer_running = True
        
        self.spotify_connected = False
        self.current_song = "No song playing"
        self.spotify_client = None
        self.sound_waves = []
        self.wave_animation_running = False
        self.is_music_playing = False
        self.current_track_id = None
        self.track_tempo = 120
        self.track_energy = 0.5
        self.song_start_time = 0
        
        self.difficulty_settings = {
            "Easy": 35,
            "Medium": 45,
            "Hard": 55,
            "Stupidly Hard": 60,
            "Impossibly Hard": 70
        }
        
        self.create_widgets()
        self.generate_puzzle()
        
        self.check_theme_change()
        
        self.init_sound_waves()
    
    def init_sound_waves(self):
        self.sound_waves = [random.uniform(0.3, 0.8) for _ in range(50)]
        self.wave_animation_running = True
    
    def animate_waves(self):
        if not self.wave_animation_running:
            return
        
        self.wave_canvas.delete("all")
        
        canvas_width = 400
        canvas_height = 80
        
        wave_color = '#00AAFF' if self.is_dark_mode else '#0066CC'
        bar_width = canvas_width / len(self.sound_waves)
        
        for i, amplitude in enumerate(self.sound_waves):
            x = i * bar_width
            wave_height = max(8, amplitude * (canvas_height - 5))
            center_y = canvas_height / 2
            
            self.wave_canvas.create_rectangle(
                x + 1.5, center_y - wave_height/2,
                x + bar_width - 1.5, center_y + wave_height/2,
                fill=wave_color, outline=wave_color
            )
        
        if self.is_music_playing:
            beat_intensity = 0.6 + 0.3 * math.sin(time.time() * (self.track_tempo / 60.0) * 2 * math.pi)
            self.sound_waves = self.sound_waves[1:] + [random.uniform(0.4, beat_intensity)]
        else:
            self.sound_waves = self.sound_waves[1:] + [random.uniform(0.05, 0.15)]
        
        self.root.after(120, self.animate_waves)
    
    def detect_dark_mode(self):
        try:
            if sys.platform == "darwin":
                import subprocess
                result = subprocess.run(['defaults', 'read', '-g', 'AppleInterfaceStyle'], 
                                      capture_output=True, text=True)
                return result.stdout.strip() == 'Dark'
            else:
                return True
        except:
            return True
    
    def setup_colors(self):
        if self.is_dark_mode:
            self.bg_color = '#1E1E1E'
            self.grid_bg = '#2D2D2D'
            self.text_color = '#FFFFFF'
            self.empty_cell_bg = '#3A3A3A'
            self.empty_cell_fg = '#FFFFFF'
            self.prefilled_bg = '#4A4A4A'
            self.prefilled_fg = '#CCCCCC'
            self.timer_color = '#00AAFF'
            self.mistake_color = '#FF6666'
        else:
            self.bg_color = '#FFFFFF'
            self.grid_bg = '#F0F0F0'
            self.text_color = '#000000'
            self.empty_cell_bg = '#FFFFFF'
            self.empty_cell_fg = '#000000'
            self.prefilled_bg = '#E8E8E8'
            self.prefilled_fg = '#333333'
            self.timer_color = '#0066CC'
            self.mistake_color = '#CC0000'
        
    def create_widgets(self):
        self.main_frame = tk.Frame(self.root, bg=self.grid_bg)
        self.main_frame.pack(pady=15)
        
        self.subgrids = [[None for _ in range(3)] for _ in range(3)]
        
        for box_row in range(3):
            for box_col in range(3):
                subgrid = tk.Frame(self.main_frame, bg=self.grid_bg, bd=3, relief='solid')
                subgrid.grid(row=box_row, column=box_col, padx=3, pady=3)
                self.subgrids[box_row][box_col] = subgrid
        
        for i in range(9):
            for j in range(9):
                box_row, box_col = i // 3, j // 3
                cell_row, cell_col = i % 3, j % 3
                
                entry = tk.Entry(self.subgrids[box_row][box_col], width=3, justify='center', 
                               font=('Arial', 20, 'bold'), bd=2, relief='solid')
                entry.grid(row=cell_row, column=cell_col, padx=3, pady=3)
                entry.bind('<KeyRelease>', lambda e, r=i, c=j: self.validate_input(e, r, c))
                entry.bind('<Button-1>', lambda e, r=i, c=j: self.on_click(r, c))
                self.entries[i][j] = entry
        
        self.diff_frame = tk.Frame(self.root, bg=self.bg_color)
        self.diff_frame.pack(pady=10)
        
        self.diff_label = tk.Label(self.diff_frame, text="Difficulty:", font=('Arial', 14, 'bold'), 
                                  bg=self.bg_color, fg=self.text_color)
        self.diff_label.pack(side=tk.LEFT, padx=5)
        
        self.difficulty_var = tk.StringVar(value=self.difficulty)
        self.difficulty_menu = tk.OptionMenu(self.diff_frame, self.difficulty_var, 
                                           "Easy", "Medium", "Hard", "Stupidly Hard", "Impossibly Hard",
                                           command=self.change_difficulty)
        self.difficulty_menu.config(font=('Arial', 12))
        self.difficulty_menu.pack(side=tk.LEFT, padx=5)
        
        self.timer_label = tk.Label(self.root, text="Time: 00:00", 
                                   font=('Arial', 16, 'bold'), fg=self.timer_color, bg=self.bg_color)
        self.timer_label.pack(pady=10)
        
        self.mistake_label = tk.Label(self.root, text=f"Mistakes: {self.mistakes}/{self.max_mistakes}", 
                                    font=('Arial', 16, 'bold'), fg=self.mistake_color, bg=self.bg_color)
        self.mistake_label.pack(pady=15)
        
        spotify_frame = tk.Frame(self.root, bg=self.bg_color)
        spotify_frame.pack(pady=5)
        
        if SPOTIFY_AVAILABLE:
            self.spotify_btn = tk.Button(spotify_frame, text="Connect Spotify", 
                                        command=self.connect_spotify,
                                        font=('Arial', 12, 'bold'), bg='#1DB954', fg='white')
            self.spotify_btn.pack(pady=5)
        else:
            tk.Label(spotify_frame, text="Install spotipy for Spotify integration", 
                    font=('Arial', 10), bg=self.bg_color, fg=self.text_color).pack()
        
        self.song_label = tk.Label(self.root, text=self.current_song, 
                                  font=('Arial', 12), fg=self.text_color, bg=self.bg_color)
        self.song_label.pack(pady=5)
        
        canvas_bg = '#2A2A2A' if self.is_dark_mode else '#F5F5F5'
        self.wave_canvas = tk.Canvas(self.root, height=80, width=400, bg=canvas_bg, 
                                   highlightthickness=1, highlightcolor='#555555')
        self.wave_canvas.pack(pady=10)
        
        self.update_timer()
        
        self.root.after(500, self.animate_waves)
    
    def validate_input(self, event, row, col):
        value = event.widget.get()
        
        if value:
            if len(value) > 1:
                value = value[-1]
                event.widget.delete(0, tk.END)
                event.widget.insert(0, value)
            
            if not value.isdigit() or not (1 <= int(value) <= 9):
                event.widget.delete(0, tk.END)
                return
            
            self.root.after_idle(lambda: self.check_number(row, col))
    
    def check_number(self, row, col):
        if self.mistakes >= self.max_mistakes:
            return
            
        entry = self.entries[row][col]
        value = entry.get()
        
        if not value or entry['state'] == 'readonly':
            return
        
        num = int(value)
        
        temp_grid = [[0 for _ in range(9)] for _ in range(9)]
        for i in range(9):
            for j in range(9):
                if self.grid[i][j] != 0:
                    temp_grid[i][j] = self.grid[i][j]
                elif self.entries[i][j]['bg'] == '#0066FF':
                    cell_value = self.entries[i][j].get()
                    if cell_value:
                        temp_grid[i][j] = int(cell_value)
        
        if self.is_valid(temp_grid, row, col, num):
            entry.config(bg='#0066FF', fg='white', state='readonly', font=('Arial', 20, 'bold'))
            self.root.after_idle(self.check_solution)
        else:
            entry.config(bg='#FF3333', fg='white', state='normal', font=('Arial', 20, 'bold'))
            self.mistakes += 1
            self.mistake_label.config(text=f"Mistakes: {self.mistakes}/{self.max_mistakes}")
            
            if self.mistakes >= self.max_mistakes:
                self.timer_running = False
                messagebox.showinfo("Game Over", "Sorry you failed! Loading new game...")
                self.new_game()
    
    def on_click(self, row, col):
        entry = self.entries[row][col]
        if entry['bg'] == '#FF3333':
            entry.delete(0, tk.END)
            entry.config(bg=self.empty_cell_bg, fg=self.empty_cell_fg, state='normal')
    
    def is_valid(self, grid, row, col, num):
        for j in range(9):
            if grid[row][j] == num:
                return False
        
        for i in range(9):
            if grid[i][col] == num:
                return False
        
        start_row, start_col = 3 * (row // 3), 3 * (col // 3)
        for i in range(start_row, start_row + 3):
            for j in range(start_col, start_col + 3):
                if grid[i][j] == num:
                    return False
        
        return True
    

    
    def generate_puzzle(self):
        self.mistakes = 0
        self.mistake_label.config(text=f"Mistakes: {self.mistakes}/{self.max_mistakes}")
        
        self.grid = [[0 for _ in range(9)] for _ in range(9)]
        self.fill_grid()
        
        cells_to_remove = self.difficulty_settings[self.difficulty]
        self.remove_cells(cells_to_remove)
        
        self.update_display()
    
    def fill_grid(self):
        for i in range(9):
            for j in range(9):
                if self.grid[i][j] == 0:
                    numbers = list(range(1, 10))
                    random.shuffle(numbers)
                    for num in numbers:
                        if self.is_valid(self.grid, i, j, num):
                            self.grid[i][j] = num
                            if self.fill_grid():
                                return True
                            self.grid[i][j] = 0
                    return False
        return True
    
    def remove_cells(self, count):
        positions = [(i, j) for i in range(9) for j in range(9)]
        random.shuffle(positions)
        
        for i in range(min(count, len(positions))):
            row, col = positions[i]
            self.grid[row][col] = 0
    
    def has_unique_solution(self):
        # Create a copy of the grid
        test_grid = [row[:] for row in self.grid]
        solutions = [0]  # Use list to allow modification in nested function
        
        def count_solutions(grid):
            if solutions[0] > 1:
                return  # Stop if more than one solution found
                
            for i in range(9):
                for j in range(9):
                    if grid[i][j] == 0:
                        for num in range(1, 10):
                            if self.is_valid(grid, i, j, num):
                                grid[i][j] = num
                                count_solutions(grid)
                                grid[i][j] = 0
                        return
            solutions[0] += 1
        
        count_solutions(test_grid)
        return solutions[0] == 1
    
    def update_display(self):
        for i in range(9):
            for j in range(9):
                self.entries[i][j].config(state='normal')
                self.entries[i][j].delete(0, tk.END)
                if self.grid[i][j] != 0:
                    self.entries[i][j].insert(0, str(self.grid[i][j]))
                    self.entries[i][j].config(state='readonly', bg=self.prefilled_bg, fg=self.prefilled_fg, font=('Arial', 20, 'bold'))
                else:
                    self.entries[i][j].config(state='normal', bg=self.empty_cell_bg, fg=self.empty_cell_fg, font=('Arial', 20, 'bold'))
    
    def new_game(self):
        self.mistakes = 0
        self.mistake_label.config(text=f"Mistakes: {self.mistakes}/{self.max_mistakes}")
        self.start_time = time.time()
        self.timer_running = True
        self.generate_puzzle()
    
    def change_difficulty(self, selected_difficulty):
        self.difficulty = selected_difficulty
        self.new_game()
    
    def update_timer(self):
        if self.timer_running:
            elapsed = int(time.time() - self.start_time)
            minutes = elapsed // 60
            seconds = elapsed % 60
            self.timer_label.config(text=f"Time: {minutes:02d}:{seconds:02d}")
        self.root.after(1000, self.update_timer)
    
    def check_theme_change(self):
        current_dark_mode = self.detect_dark_mode()
        if current_dark_mode != self.is_dark_mode:
            self.is_dark_mode = current_dark_mode
            self.setup_colors()
            self.update_theme()
        self.root.after(2000, self.check_theme_change)
    
    def update_theme(self):
        # Update root background
        self.root.configure(bg=self.bg_color)
        
        # Update main frame and subgrids
        self.main_frame.configure(bg=self.grid_bg)
        for row in self.subgrids:
            for subgrid in row:
                subgrid.configure(bg=self.grid_bg)
        
        # Update difficulty frame and label
        self.diff_frame.configure(bg=self.bg_color)
        self.diff_label.configure(bg=self.bg_color, fg=self.text_color)
        
        # Update timer and mistake labels
        self.timer_label.configure(bg=self.bg_color, fg=self.timer_color)
        self.mistake_label.configure(bg=self.bg_color, fg=self.mistake_color)
        
        # Update song label and canvas
        self.song_label.configure(bg=self.bg_color, fg=self.text_color)
        self.wave_canvas.configure(bg=self.bg_color)
        
        # Update all grid entries
        for i in range(9):
            for j in range(9):
                entry = self.entries[i][j]
                if entry['state'] == 'readonly' and entry['bg'] not in ['#0066FF', '#FF3333']:
                    # Pre-filled cell
                    entry.configure(bg=self.prefilled_bg, fg=self.prefilled_fg)
                elif entry['bg'] not in ['#0066FF', '#FF3333']:
                    # Empty cell
                    entry.configure(bg=self.empty_cell_bg, fg=self.empty_cell_fg)
    
    def connect_spotify(self):
        try:
            # Spotify credentials (replace with your own)
            client_id = "c50c18c34e2c4d4ba972320ee0e60f9e"
            client_secret = "d2ba1ebb5e104f3f835b9c4ef6402d72"
            redirect_uri = "http://127.0.0.1:8080"
            
            if client_secret == "your_client_secret_here":
                messagebox.showinfo("Spotify Setup", 
                                   "To connect Spotify:\n\n" +
                                   "1. Go to https://developer.spotify.com/dashboard\n" +
                                   "2. Create a new app\n" +
                                   "3. Get your Client ID and Client Secret\n" +
                                   "4. Set redirect URI to: http://127.0.0.1:8080\n" +
                                   "5. Replace the credentials in the code\n\n" +
                                   "For now, enjoy the demo sound waves!")
                
                # Enable demo mode
                self.spotify_connected = True
                self.current_song = "♪ Demo Mode - Awesome Beats"
                self.spotify_btn.config(text="Demo Mode Active", bg='#FF6600')
                self.song_label.config(text=self.current_song)
                self.demo_music_mode()
                return
            
            # Real Spotify connection
            scope = "user-read-currently-playing user-read-playback-state"
            import os
            cache_path = os.path.expanduser("~/.spotify_cache")
            sp_oauth = SpotifyOAuth(client_id=client_id,
                                   client_secret=client_secret,
                                   redirect_uri=redirect_uri,
                                   scope=scope,
                                   cache_path=cache_path,
                                   open_browser=True)
            
            self.spotify_client = spotipy.Spotify(auth_manager=sp_oauth)
            self.spotify_connected = True
            self.spotify_btn.config(text="Connected!", bg='#1DB954')
            self.get_current_song()
            
        except Exception as e:
            messagebox.showerror("Connection Error", f"Failed to connect to Spotify: {str(e)}")
            # Fall back to demo mode
            self.spotify_connected = True
            self.current_song = "♪ Demo Mode - Connection Failed"
            self.spotify_btn.config(text="Demo Mode", bg='#FF6600')
            self.song_label.config(text=self.current_song)
            self.demo_music_mode()
    
    def get_current_song(self):
        if not self.spotify_client:
            return
        
        try:
            current = self.spotify_client.current_playback()
            if current and current['item']:
                track = current['item']
                artist = track['artists'][0]['name']
                song = track['name']
                track_id = track['id']
                self.is_music_playing = current['is_playing']
                
                # Set new track ID
                if track_id != self.current_track_id:
                    self.current_track_id = track_id
                    # Use default values to avoid API permission issues
                    self.track_tempo = 120
                    self.track_energy = 0.6
                
                # Track song timing for beat sync
                if self.is_music_playing:
                    progress_ms = current.get('progress_ms', 0)
                    self.song_start_time = time.time() - (progress_ms / 1000.0)
                    self.current_song = f"♪ {artist} - {song}"
                else:
                    self.current_song = f"⏸ {artist} - {song} (Paused)"
            else:
                self.current_song = "No song playing"
                self.is_music_playing = False
            
            self.song_label.config(text=self.current_song)
            
        except Exception as e:
            self.current_song = "Spotify connection lost"
            self.is_music_playing = False
            self.song_label.config(text=self.current_song)
        
        # Update every 2 seconds for better sync
        if self.spotify_connected:
            self.root.after(2000, self.get_current_song)
    
    def demo_music_mode(self):
        if not self.spotify_connected:
            return
        
        # Simulate changing songs every 30 seconds
        demo_songs = [
            "♪ Demo Mode - Awesome Beats",
            "♪ Chill Vibes - Relaxing Tunes", 
            "♪ Energetic Flow - Power Music",
            "♪ Focus Mode - Concentration"
        ]
        
        current_song = random.choice(demo_songs)
        self.current_song = current_song
        self.is_music_playing = True  # Demo mode always playing
        self.song_label.config(text=self.current_song)
        
        # Update wave intensity randomly
        base_intensity = random.uniform(0.4, 0.9)
        for i in range(len(self.sound_waves)):
            self.sound_waves[i] = base_intensity * random.uniform(0.5, 1.3)
        
        # Continue demo mode
        if self.spotify_connected:
            self.root.after(30000, self.demo_music_mode)
    
    def check_solution(self):
        # Get current grid state
        current_grid = [[0 for _ in range(9)] for _ in range(9)]
        
        for i in range(9):
            for j in range(9):
                value = self.entries[i][j].get()
                if value:
                    current_grid[i][j] = int(value)
        
        # Check if complete and valid
        for i in range(9):
            for j in range(9):
                if current_grid[i][j] == 0:
                    return False
                
                # Temporarily remove current number to check validity
                temp = current_grid[i][j]
                current_grid[i][j] = 0
                if not self.is_valid(current_grid, i, j, temp):
                    current_grid[i][j] = temp
                    return False
                current_grid[i][j] = temp
        
        # Puzzle completed successfully
        self.timer_running = False
        elapsed = int(time.time() - self.start_time)
        minutes = elapsed // 60
        seconds = elapsed % 60
        messagebox.showinfo("Congratulations!", f"Puzzle solved in {minutes:02d}:{seconds:02d}!")
        self.new_game()
        return True
    
    def run(self):
        self.root.mainloop()

if __name__ == "__main__":
    game = SudokuGame()
    game.run()
