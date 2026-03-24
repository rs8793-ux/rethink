(function () {
  'use strict';

  const btn = document.getElementById('upload-btn');
  const input = document.getElementById('upload-input');
  const forest = window.MYCO.forest;
  const api = window.MYCO.api;

  if (!btn || !input || !forest || !api) return;

  btn.addEventListener('click', () => input.click());

  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    input.value = '';
    if (!file || !file.type.startsWith('image/')) return;

    forest.setLeftMushroomLoading(true);
    api.generateMushroomFromImage(file)
      .then(function (imageUrl) {
        forest.setLeftMushroomImageUrl(imageUrl);
        forest.setLeftMushroomLoading(false);
      })
      .catch(function () {
        forest.setLeftMushroomLoading(false);
      });
  });
})();
