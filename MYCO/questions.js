(function () {
  'use strict';

  const QUESTIONS = [
    "Your friends think of you when ____. Not because you're useful — because you're you.",
    "Describe something you did that no one noticed. Just something recent.",
    "When your energy is gone, what exactly do you do to recover? Be specific.",
    "The last time you felt truly held by someone — what did they do? Or not do?",
    "There's something you've been thinking about for weeks and haven't told anyone. What is it?",
    "The last time you turned down an invitation — why, specifically? Not 'I was tired.'",
    "What kind of conversation makes you suddenly talk a lot? Describe the feeling, not the topic.",
    "You have a habit you've kept for a long time and never explained to anyone. What is it?",
    "What makes you go suddenly quiet? Not sad — just quiet.",
    "What are you afraid of? The specific private one only you know."
  ];

  const STORAGE_KEY = 'myco_dimensions';
  const DONE_KEY = 'myco_questions_done';
  const PHOTO_DONE_KEY = 'myco_photo_done';
  const PENDING_SELFIE_KEY = 'myco_pending_selfie';

  const photoPage = document.getElementById('photo-page');
  const page = document.getElementById('questions-page');
  const forestPage = document.getElementById('forest-page');
  const questionText = document.getElementById('question-text');
  const questionInput = document.getElementById('question-input');
  const nextBtn = document.getElementById('question-next');
  const progressEl = document.getElementById('question-progress');
  const photoPageInput = document.getElementById('photo-page-input');

  let currentIndex = 0;
  let answers = [];

  function hideAllOverlays() {
    if (photoPage) photoPage.classList.add('hidden');
    if (page) page.classList.add('hidden');
  }

  function showForest() {
    hideAllOverlays();
    if (forestPage) {
      forestPage.hidden = false;
      window.dispatchEvent(new Event('resize'));
      if (window.MYCO && window.MYCO.forest && typeof window.MYCO.forest.redraw === 'function') {
        window.MYCO.forest.redraw();
      }
      if (window.MYCO && window.MYCO.matching && typeof window.MYCO.matching.runDemo === 'function') {
        window.MYCO.matching.runDemo();
      }
      usePendingSelfieIfAny();
    }
  }

  function usePendingSelfieIfAny() {
    try {
      const dataUrl = sessionStorage.getItem(PENDING_SELFIE_KEY);
      if (!dataUrl || !window.MYCO || !window.MYCO.api || !window.MYCO.forest) return;
      sessionStorage.removeItem(PENDING_SELFIE_KEY);
      const arr = dataUrl.split(',');
      const mime = (arr[0].match(/:(.*?);/) || [])[1] || 'image/jpeg';
      const bstr = atob(arr[1] || '');
      const u8arr = new Uint8Array(bstr.length);
      for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
      const file = new File([u8arr], 'selfie.jpg', { type: mime });
      window.MYCO.forest.setLeftMushroomLoading(true);
      window.MYCO.api.generateMushroomFromImage(file).then(function (url) {
        window.MYCO.forest.setLeftMushroomImageUrl(url);
        window.MYCO.forest.setLeftMushroomLoading(false);
      }).catch(function () {
        window.MYCO.forest.setLeftMushroomLoading(false);
      });
    } catch (e) {}
  }

  function showQuestions() {
    if (forestPage) forestPage.hidden = true;
    if (photoPage) photoPage.classList.add('hidden');
    if (page) page.classList.remove('hidden');
  }

  function showPhotoPage() {
    if (forestPage) forestPage.hidden = true;
    if (page) page.classList.add('hidden');
    if (photoPage) photoPage.classList.remove('hidden');
  }

  function renderProgress() {
    if (!progressEl) return;
    progressEl.innerHTML = '';
    for (let i = 0; i < QUESTIONS.length; i++) {
      const dot = document.createElement('span');
      dot.className = 'question-progress-dot' + (i <= currentIndex ? ' filled' : '');
      dot.setAttribute('aria-hidden', 'true');
      progressEl.appendChild(dot);
    }
  }

  function renderQuestion() {
    if (currentIndex >= QUESTIONS.length) return;
    if (questionText) questionText.textContent = QUESTIONS[currentIndex];
    if (questionInput) {
      questionInput.value = '';
      questionInput.placeholder = '';
      questionInput.focus();
    }
    updateNextVisibility();
    renderProgress();
  }

  function updateNextVisibility() {
    if (!nextBtn) return;
    const hasText = questionInput && questionInput.value.trim().length > 0;
    nextBtn.classList.toggle('visible', hasText);
    nextBtn.tabIndex = hasText ? 0 : -1;
  }

  function goNext() {
    const text = questionInput && questionInput.value.trim();
    if (!text) return;

    answers[currentIndex] = text;
    currentIndex += 1;

    if (currentIndex >= QUESTIONS.length) {
      submitAll();
      return;
    }

    renderQuestion();
  }

  function submitAll() {
    const api = window.MYCO && window.MYCO.api;
    if (api && typeof api.analyzeDimensions === 'function') {
      api.analyzeDimensions(answers).then(function (dimensions) {
        if (dimensions != null) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dimensions));
          } catch (e) {}
        }
        localStorage.setItem(DONE_KEY, '1');
        showForest();
      }).catch(function () {
        localStorage.setItem(DONE_KEY, '1');
        showForest();
      });
    } else {
      localStorage.setItem(DONE_KEY, '1');
      showForest();
    }
  }

  function attachQuestionListeners() {
    if (questionInput) {
      questionInput.addEventListener('input', updateNextVisibility);
      questionInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (nextBtn.classList.contains('visible')) goNext();
        }
      });
    }
    if (nextBtn) nextBtn.addEventListener('click', goNext);
  }

  function onPhotoSelected(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = function () {
      try {
        sessionStorage.setItem(PENDING_SELFIE_KEY, reader.result);
      } catch (e) {}
      try {
        localStorage.setItem(PHOTO_DONE_KEY, '1');
      } catch (e) {}
      showQuestions();
      attachQuestionListeners();
      renderQuestion();
    };
    reader.readAsDataURL(file);
  }

  function init() {
    try {
      if (localStorage.getItem(DONE_KEY) || localStorage.getItem(STORAGE_KEY)) {
        showForest();
        return;
      }
      if (localStorage.getItem(PHOTO_DONE_KEY)) {
        showQuestions();
        attachQuestionListeners();
        renderQuestion();
        return;
      }
    } catch (e) {}

    showPhotoPage();
    if (photoPageInput) {
      photoPageInput.addEventListener('change', function () {
        var f = photoPageInput.files && photoPageInput.files[0];
        if (f) onPhotoSelected(f);
        photoPageInput.value = '';
      });
    }

    if (questionInput) {
      questionInput.addEventListener('input', updateNextVisibility);
      questionInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (nextBtn.classList.contains('visible')) goNext();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', goNext);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
