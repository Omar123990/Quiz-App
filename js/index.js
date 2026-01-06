import Question from './question.js';
import Quiz from './quiz.js';
import { soundManager } from './sounds.js';
import { MIN_QUESTIONS, MAX_QUESTIONS, DEFAULT_DIFFICULTY } from './constants.js';


const quizOptionsForm = document.getElementById('quizOptions');
const playerNameInput = document.getElementById('playerName');
const categoryInput = document.getElementById('categoryMenu');
const difficultyOptions = document.getElementById('difficultyOptions');
const questionsNumber = document.getElementById('questionsNumber');
const startQuizBtn = document.getElementById('startQuiz');
const questionsContainer = document.querySelector('.questions-container');


let currentQuiz = null;


function showLoading() {
  const loadingHtml = `
    <div class="loading-overlay">
      <div class="loading-spinner"></div>
      <p class="loading-text">Loading Questions...</p>
    </div>
  `;
  questionsContainer.innerHTML = loadingHtml;
}


function hideLoading() {
  const loadingOverlay = questionsContainer.querySelector('.loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.remove();
  }
}


function showError(message) {
  const errorHtml = `
    <div class="game-card error-card">
      <div class="error-icon">
        <i class="fa-solid fa-triangle-exclamation"></i>
      </div>
      <h3 class="error-title">Oops! Something went wrong</h3>
      <p class="error-message">${message}</p>
      <button class="btn-play retry-btn">
        <i class="fa-solid fa-rotate-right"></i> Try Again
      </button>
    </div>
  `;
  questionsContainer.innerHTML = errorHtml;

  const retryBtn = questionsContainer.querySelector('.retry-btn');
  retryBtn?.addEventListener('click', resetToStart);
}


function validateForm() {
  const numberOfQuestions = parseInt(questionsNumber.value, 10);

  if (!questionsNumber.value || isNaN(numberOfQuestions)) {
    return {
      isValid: false,
      error: 'Please enter the number of questions.',
    };
  }

  if (numberOfQuestions < MIN_QUESTIONS) {
    return {
      isValid: false,
      error: `Minimum ${MIN_QUESTIONS} question required.`,
    };
  }

  if (numberOfQuestions > MAX_QUESTIONS) {
    return {
      isValid: false,
      error: `Maximum ${MAX_QUESTIONS} questions allowed.`,
    };
  }

  return { isValid: true, error: null };
}


function showFormError(message) {
  const existingError = quizOptionsForm.querySelector('.form-error');
  existingError?.remove();

  const errorDiv = document.createElement('div');
  errorDiv.className = 'form-error';
  errorDiv.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${message}`;
  startQuizBtn.parentNode.insertBefore(errorDiv, startQuizBtn);

  setTimeout(() => {
    errorDiv.style.opacity = '0';
    errorDiv.style.transform = 'translateY(-10px)';
    setTimeout(() => errorDiv.remove(), 300);
  }, 3000);
}


function resetToStart() {
  questionsContainer.innerHTML = '';
  categoryInput.value = '';
  difficultyOptions.value = DEFAULT_DIFFICULTY;
  questionsNumber.value = '';
  quizOptionsForm.classList.remove('hidden');
  currentQuiz = null;
}


async function startQuiz() {
  const validation = validateForm();
  if (!validation.isValid) {
    showFormError(validation.error);
    return;
  }

  // Initialize sound (must be after user interaction)
  soundManager.init();

  // Get form values
  const playerName = playerNameInput.value.trim() || 'Player';
  const category = categoryInput.value;
  const difficulty = difficultyOptions.value;
  const numberOfQuestions = parseInt(questionsNumber.value, 10);

  // Create quiz instance
  currentQuiz = new Quiz(category, difficulty, numberOfQuestions, playerName);

  // Hide form and show loading
  quizOptionsForm.classList.add('hidden');
  showLoading();

  try {
    // Fetch questions
    await currentQuiz.getQuestions();
    hideLoading();

    // Check if we got questions
    if (currentQuiz.questions.length === 0) {
      throw new Error('No questions received from the API.');
    }

    // Display first question
    const firstQuestion = new Question(currentQuiz, questionsContainer, resetToStart);
    firstQuestion.displayQuestion();
  } catch (error) {
    hideLoading();
    showError(error.message || 'Failed to load questions. Please try again.');
  }
}


startQuizBtn.addEventListener('click', startQuiz);

questionsNumber.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    startQuiz();
  }
});
