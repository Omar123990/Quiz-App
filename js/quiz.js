

import {
  API_BASE_URL,
  API_SUCCESS_CODE,
  STORAGE_KEY_HIGH_SCORES,
  MAX_HIGH_SCORES,
  TIMER_DURATION,
} from './constants.js';
import { soundManager } from './sounds.js';

export default class Quiz {
  constructor(category, difficulty, numberOfQuestions, playerName = 'Player') {
    this.category = category;
    this.difficulty = difficulty;
    this.numberOfQuestions = parseInt(numberOfQuestions, 10);
    this.playerName = playerName;
    this.score = 0;
    this.streak = 0;
    this.maxStreak = 0;
    this.questions = [];
    this.currentQuestionIndex = 0;
    this.timerDuration = TIMER_DURATION;
    this.startTime = null;
  }

  async getQuestions() {
    try {
      const url = this.buildApiUrl();
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      if (data.response_code !== API_SUCCESS_CODE) {
        throw new Error(this.getApiErrorMessage(data.response_code));
      }

      this.questions = data.results;
      this.startTime = Date.now();
      return this.questions;
    } catch (error) {
      console.error('Failed to fetch questions:', error);
      throw error;
    }
  }

  buildApiUrl() {
    const params = new URLSearchParams({
      amount: this.numberOfQuestions,
      difficulty: this.difficulty,
    });

    if (this.category) {
      params.append('category', this.category);
    }

    return `${API_BASE_URL}?${params.toString()}`;
  }

  getApiErrorMessage(code) {
    const errorMessages = {
      1: 'Not enough questions available for your criteria. Try reducing the number or changing category.',
      2: 'Invalid parameter in request.',
      3: 'Session token not found.',
      4: 'Session token exhausted. Please try again.',
    };
    return errorMessages[code] || 'An unknown error occurred.';
  }


  incrementScore() {
    this.score += 1;
  }

 
  incrementStreak() {
    this.streak += 1;
    if (this.streak > this.maxStreak) {
      this.maxStreak = this.streak;
    }
  }


  resetStreak() {
    this.streak = 0;
  }


  getCurrentQuestion() {
    if (this.currentQuestionIndex < this.questions.length) {
      return this.questions[this.currentQuestionIndex];
    }
    return null;
  }


  nextQuestion() {
    this.currentQuestionIndex += 1;
    return this.currentQuestionIndex < this.questions.length;
  }


  isComplete() {
    return this.currentQuestionIndex >= this.questions.length;
  }


  getScorePercentage() {
    return Math.round((this.score / this.numberOfQuestions) * 100);
  }


  saveHighScore() {
    const highScores = this.getHighScores();
    const newScore = {
      name: this.playerName,
      score: this.score,
      total: this.numberOfQuestions,
      percentage: this.getScorePercentage(),
      difficulty: this.difficulty,
      category: this.category || 'Any',
      date: new Date().toLocaleDateString(),
    };

    highScores.push(newScore);
    highScores.sort((a, b) => b.percentage - a.percentage);
    highScores.splice(MAX_HIGH_SCORES);

    localStorage.setItem(STORAGE_KEY_HIGH_SCORES, JSON.stringify(highScores));
  }

  getHighScores() {
    try {
      const scores = localStorage.getItem(STORAGE_KEY_HIGH_SCORES);
      return scores ? JSON.parse(scores) : [];
    } catch {
      return [];
    }
  }


  isHighScore() {
    const highScores = this.getHighScores();
    if (highScores.length < MAX_HIGH_SCORES) return true;
    return this.getScorePercentage() > highScores[highScores.length - 1].percentage;
  }


  endQuiz() {
    soundManager.playComplete();
    const percentage = this.getScorePercentage();
    const isNewHighScore = this.isHighScore();

    if (isNewHighScore) {
      this.saveHighScore();
    }

    const highScores = this.getHighScores();

    const leaderboardMarkup = highScores.length > 0 ? `
      <div class="leaderboard">
        <h4 class="leaderboard-title">
          <i class="fa-solid fa-trophy"></i> Leaderboard
        </h4>
        <ul class="leaderboard-list">
          ${highScores.slice(0, 10).map((hs, i) => {
            let rankClass = '';
            if (i === 0) rankClass = 'gold';
            else if (i === 1) rankClass = 'silver';
            else if (i === 2) rankClass = 'bronze';
            
            return `
              <li class="leaderboard-item ${rankClass}">
                <span class="leaderboard-rank">#${i + 1}</span>
                <span class="leaderboard-name">${hs.name}</span>
                <span class="leaderboard-score">${hs.percentage}%</span>
              </li>
            `;
          }).join('')}
        </ul>
      </div>
    ` : '';

    return `
      <div class="game-card results-card" role="dialog" aria-labelledby="gameResult">
        <h2 id="gameResult" class="results-title">Quiz Complete!</h2>
        <p class="results-score-display">${this.score}/${this.numberOfQuestions}</p>
        <p class="results-percentage">${percentage}% Accuracy</p>
        
        ${isNewHighScore ? `
          <div class="new-record-badge">
            <i class="fa-solid fa-star"></i> New High Score!
          </div>
        ` : ''}
        
        ${leaderboardMarkup}
        
        <div class="action-buttons">
          <button class="btn-restart" aria-label="Play again">
            <i class="fa-solid fa-rotate-right"></i> Play Again
          </button>
        </div>
      </div>
    `;
  }


  reset() {
    this.score = 0;
    this.streak = 0;
    this.maxStreak = 0;
    this.questions = [];
    this.currentQuestionIndex = 0;
    this.startTime = null;
  }
}
