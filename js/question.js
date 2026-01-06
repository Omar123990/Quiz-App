import {
  ANIMATION_DURATION,
  QUESTION_TRANSITION_DELAY,
  TIMER_DURATION,
  TIMER_WARNING_THRESHOLD,
  ANSWER_KEYS,
} from './constants.js';
import { soundManager } from './sounds.js';

export default class Question {
  constructor(quiz, container, onQuizEnd) {
    this.quiz = quiz;
    this.container = container;
    this.onQuizEnd = onQuizEnd;
    this.questionData = quiz.getCurrentQuestion();
    this.index = quiz.currentQuestionIndex;
    this.question = this.decodeHtml(this.questionData.question);
    this.correctAnswer = this.decodeHtml(this.questionData.correct_answer);
    this.category = this.decodeHtml(this.questionData.category);
    this.wrongAnswers = this.questionData.incorrect_answers.map((a) =>
      this.decodeHtml(a)
    );
    this.allAnswers = this.shuffleAnswers();
    this.answered = false;
    this.timerInterval = null;
    this.timeRemaining = TIMER_DURATION;
    this.keyboardHandler = null;
  }


  decodeHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.documentElement.textContent;
  }


  shuffleAnswers() {
    const allAnswers = [...this.wrongAnswers, this.correctAnswer];

    for (let i = allAnswers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allAnswers[i], allAnswers[j]] = [allAnswers[j], allAnswers[i]];
    }

    return allAnswers;
  }

  getProgress() {
    return Math.round(((this.index + 1) / this.quiz.numberOfQuestions) * 100);
  }

  getDifficultyIcon() {
    const icons = {
      easy: 'fa-face-smile',
      medium: 'fa-face-meh',
      hard: 'fa-skull',
    };
    return icons[this.quiz.difficulty] || 'fa-gauge-high';
  }

  displayQuestion() {
    const questionMarkUp = `
      <div class="game-card question-card" role="region" aria-label="Round ${this.index + 1} of ${this.quiz.numberOfQuestions}">
        
        <!-- XP Progress Bar -->
        <div class="xp-bar-container">
          <div class="xp-bar-header">
            <span class="xp-label"><i class="fa-solid fa-bolt"></i> Progress</span>
            <span class="xp-value">Round ${this.index + 1}/${this.quiz.numberOfQuestions}</span>
          </div>
          <div class="xp-bar">
            <div class="xp-bar-fill" style="width: ${this.getProgress()}%" role="progressbar" aria-valuenow="${this.getProgress()}" aria-valuemin="0" aria-valuemax="100"></div>
          </div>
        </div>

        <!-- Stats Row -->
        <div class="stats-row">
          <div class="stat-badge category">
            <i class="fa-solid fa-bookmark"></i>
            <span>${this.category}</span>
          </div>
          <div class="stat-badge difficulty ${this.quiz.difficulty}">
            <i class="fa-solid ${this.getDifficultyIcon()}"></i>
            <span>${this.quiz.difficulty}</span>
          </div>
          <div class="stat-badge timer" aria-live="polite" aria-label="Time remaining">
            <i class="fa-solid fa-stopwatch"></i>
            <span class="timer-value">${this.timeRemaining}</span>s
          </div>
          <div class="stat-badge counter">
            <i class="fa-solid fa-gamepad"></i>
            <span>${this.index + 1}/${this.quiz.numberOfQuestions}</span>
          </div>
        </div>

        <!-- Question Text -->
        <h2 class="question-text" id="questionText">${this.question}</h2>

        <!-- Answer Grid -->
        <div class="answers-grid" role="listbox" aria-labelledby="questionText">
          ${this.allAnswers
            .map(
              (choice, i) => `
            <button 
              class="answer-btn"
              role="option" 
              tabindex="0" 
              data-index="${i}"
              data-answer="${choice.replace(/"/g, '&quot;')}"
              aria-label="Answer ${i + 1}: ${choice}. Press ${i + 1} to select."
            >
              <span class="answer-key">${i + 1}</span>
              <span class="answer-text">${choice}</span>
            </button>
          `
            )
            .join('')}
        </div>

        <!-- Keyboard Hint -->
        <p class="keyboard-hint">
          <i class="fa-regular fa-keyboard"></i> Press 1-${this.allAnswers.length} to select
        </p>

        <!-- Score Panel -->
        <div class="score-panel">
          <div class="score-item">
            <div class="score-item-label">Score</div>
            <div class="score-item-value">${this.quiz.score}</div>
          </div>
        </div>
      </div>
    `;

    this.container.innerHTML = questionMarkUp;
    this.addEventListeners();
    this.startTimer();
  }

  addEventListeners() {
    const allChoices = document.querySelectorAll('.answer-btn');

    allChoices.forEach((choice) => {
      choice.addEventListener('click', () => {
        this.checkAnswer(choice);
      });

      choice.addEventListener('keydown', (eventInfo) => {
        if (eventInfo.key === 'Enter' || eventInfo.key === ' ') {
          eventInfo.preventDefault();
          this.checkAnswer(choice);
        }
      });
    });

    this.keyboardHandler = (eventInfo) => {
      if (ANSWER_KEYS.includes(eventInfo.key)) {
        const index = parseInt(eventInfo.key, 10) - 1;
        if (index < allChoices.length) {
          this.checkAnswer(allChoices[index]);
        }
      }
    };

    document.addEventListener('keydown', this.keyboardHandler);
  }

  removeEventListeners() {
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
      this.keyboardHandler = null;
    }
  }

  startTimer() {
    const timerDisplay = document.querySelector('.timer-value');
    const timerContainer = document.querySelector('.stat-badge.timer');

    this.timerInterval = setInterval(() => {
      this.timeRemaining -= 1;

      if (timerDisplay) {
        timerDisplay.textContent = this.timeRemaining;
      }

      if (this.timeRemaining <= TIMER_WARNING_THRESHOLD) {
        timerContainer?.classList.add('warning');
        soundManager.playWarning();
      }

      if (this.timeRemaining <= 0) {
        this.stopTimer();
        if (!this.answered) {
          soundManager.playTimeUp();
          this.handleTimeUp();
        }
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  handleTimeUp() {
    this.answered = true;
    this.removeEventListeners();
    this.quiz.resetStreak();

    const allChoices = document.querySelectorAll('.answer-btn');
    allChoices.forEach((choice) => {
      const choiceText = choice.dataset.answer;
      if (choiceText === this.correctAnswer) {
        choice.classList.add('correct');
      } else {
        choice.classList.add('disabled');
      }
    });

    const questionCard = this.container.querySelector('.question-card');
    if (questionCard) {
      const scorePanel = questionCard.querySelector('.score-panel');
      const timeUpMsg = document.createElement('div');
      timeUpMsg.className = 'time-up-message';
      timeUpMsg.innerHTML = '<i class=\"fa-solid fa-clock\"></i> TIME\'S UP!';
      scorePanel.before(timeUpMsg);
    }

    this.animateQuestion(ANIMATION_DURATION);
  }


  checkAnswer(choiceElement) {
    if (this.answered) return;

    this.answered = true;
    this.stopTimer();
    this.removeEventListeners();

    const selectedAnswer = choiceElement.dataset.answer;
    const isCorrect = selectedAnswer.toLowerCase() === this.correctAnswer.toLowerCase();

    const allChoices = document.querySelectorAll('.answer-btn');
    allChoices.forEach((choice) => {
      if (choice !== choiceElement) {
        choice.classList.add('disabled');
      }
    });

    if (isCorrect) {
      choiceElement.classList.add('correct');
      this.quiz.incrementScore();
      this.quiz.incrementStreak();
      soundManager.playCorrect();
    } else {
      choiceElement.classList.add('wrong');
      this.quiz.resetStreak();
      soundManager.playWrong();

      this.highlightCorrectAnswer();
    }

    this.animateQuestion(ANIMATION_DURATION);
  }

  highlightCorrectAnswer() {
    const allChoices = document.querySelectorAll('.answer-btn');
    allChoices.forEach((choice) => {
      const choiceText = choice.dataset.answer;
      if (choiceText === this.correctAnswer) {
        choice.classList.add('correct-reveal');
        choice.classList.remove('disabled');
      }
    });
  }


  getNextQuestion() {
    if (this.quiz.nextQuestion()) {
      const nextQuestion = new Question(this.quiz, this.container, this.onQuizEnd);
      nextQuestion.displayQuestion();
    } else {
      this.container.innerHTML = this.quiz.endQuiz();

      const tryAgain = document.querySelector('.btn-restart');
      if (tryAgain) {
        tryAgain.addEventListener('click', () => {
          tryAgain.classList.add('loading');
          tryAgain.innerHTML = '<i class="fa-solid fa-spinner"></i> Loading...';
          
          setTimeout(() => {
            this.onQuizEnd();
          }, 500);
        });
      }
    }
  }


  animateQuestion(duration) {
    setTimeout(() => {
      const questionCard = this.container.querySelector('.question-card');
      if (questionCard) {
        questionCard.classList.add('exit');
      }

      setTimeout(() => {
        this.getNextQuestion();
      }, duration);
    }, QUESTION_TRANSITION_DELAY);
  }
}
