(function () {
  'use strict';

  const COMPLEMENT_KEYS = ['giving_tendency', 'energy_direction', 'need_for_space'];
  const RESONANCE_KEYS = ['depth', 'emotional_density', 'vulnerability'];
  const MIN_SCORE = 0.5;
  const TOP_N = 3;

  function clamp(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
  }

  function getDim(obj, key) {
    return clamp(obj[key]);
  }

  /**
   * Complement: opposite = good. Score = |userA - userB| (higher difference = better).
   * Resonance: similar = good. Score = 1 - |userA - userB|.
   * Combined score 0.0–1.0: average of complement and resonance contributions.
   */
  function computeCompatibility(userA, userB) {
    let complementSum = 0;
    for (let i = 0; i < COMPLEMENT_KEYS.length; i++) {
      const a = getDim(userA, COMPLEMENT_KEYS[i]);
      const b = getDim(userB, COMPLEMENT_KEYS[i]);
      complementSum += Math.abs(a - b);
    }
    const complementScore = COMPLEMENT_KEYS.length ? complementSum / COMPLEMENT_KEYS.length : 0;

    let resonanceSum = 0;
    for (let j = 0; j < RESONANCE_KEYS.length; j++) {
      const a = getDim(userA, RESONANCE_KEYS[j]);
      const b = getDim(userB, RESONANCE_KEYS[j]);
      resonanceSum += 1 - Math.abs(a - b);
    }
    const resonanceScore = RESONANCE_KEYS.length ? resonanceSum / RESONANCE_KEYS.length : 0;

    return (complementScore + resonanceScore) / 2;
  }

  function findBestMatches(currentUser, allUsers) {
    if (!currentUser || !Array.isArray(allUsers) || allUsers.length === 0) return [];

    const withScores = allUsers.map(function (user) {
      return { user: user, score: computeCompatibility(currentUser, user) };
    });

    return withScores
      .filter(function (entry) { return entry.score >= MIN_SCORE; })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, TOP_N);
  }

  // Demo: 3 fake user profiles with different dimension values
  const FAKE_USERS = [
    {
      id: 'fake_1',
      openness: 0.2,
      vulnerability: 0.7,
      energy_direction: 0.9,
      giving_tendency: 0.85,
      emotional_density: 0.6,
      need_for_space: 0.3,
      protective_instinct: 0.4,
      depth: 0.75
    },
    {
      id: 'fake_2',
      openness: 0.6,
      vulnerability: 0.4,
      energy_direction: 0.2,
      giving_tendency: 0.25,
      emotional_density: 0.5,
      need_for_space: 0.8,
      protective_instinct: 0.6,
      depth: 0.5
    },
    {
      id: 'fake_3',
      openness: 0.5,
      vulnerability: 0.5,
      energy_direction: 0.5,
      giving_tendency: 0.5,
      emotional_density: 0.5,
      need_for_space: 0.5,
      protective_instinct: 0.5,
      depth: 0.5
    }
  ];

  function runDemo() {
    try {
      const raw = localStorage.getItem('myco_dimensions');
      if (!raw) return;
      const currentUser = JSON.parse(raw);
      const matches = findBestMatches(currentUser, FAKE_USERS);
      console.log('MYCO match results (top ' + TOP_N + ', score >= ' + MIN_SCORE + '):', matches);
    } catch (e) {
      console.warn('MYCO matching demo:', e);
    }
  }

  window.MYCO = window.MYCO || {};
  window.MYCO.matching = {
    computeCompatibility: computeCompatibility,
    findBestMatches: findBestMatches,
    runDemo: runDemo,
    FAKE_USERS: FAKE_USERS
  };

  // When forest is already visible (e.g. return visit), run demo once matching.js has loaded
  if (typeof document !== 'undefined' && document.getElementById) {
    function tryRun() {
      const forestPage = document.getElementById('forest-page');
      if (forestPage && !forestPage.hidden && localStorage.getItem('myco_dimensions')) {
        runDemo();
      }
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryRun);
    } else {
      tryRun();
    }
  }
})();
