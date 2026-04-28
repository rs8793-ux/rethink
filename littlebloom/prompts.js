/* =====================================================
   LITTLE BLOOM · prompts.js
   Uses qwen/qwen-image-edit for scene stripping.

   Core purpose: Output ONLY the child's marks (crayon,
   marker, pencil, paint) on a flat background. Remove
   people, furniture, walls, floors, room, watermarks.
   Reconstruct occluded strokes. Do not invent new art.
   ===================================================== */

const POLISH_SCENE_STRIP = `EDIT INSTRUCTION — You must output a NEW image file. The output must look like a scan of a child's drawing on blank paper, not a photograph of a room.

MANDATORY REMOVALS (if any of these appear in the input, they must be GONE in the output):
• Every human: full bodies, children, adults, faces, hair, clothing, skin, hands, arms, legs, silhouettes, reflections of people.
• The entire room/scene: floor, ceiling, doors, windows, furniture, toys, photo depth-of-field, wall texture behind the art (except reconstructing covered strokes).
• ALL stock-photo or licensing watermarks: diagonal repeating text, semi-transparent stripes, "shutterstock"/"getty"/"alamy"-style overlays, grid lines, corner logos, date stamps, camera UI.

SPECIAL CASE — Child standing in front of a wall/floor drawing:
Remove the child completely. Treat the mural as the only subject: reconstruct the drawing as if it were on a flat sheet—inpaint areas the child covered using surrounding visible marks. Do not leave any part of the person.

KEEP ONLY:
The child's own marks (crayon, marker, pencil, chalk, paint) — same shapes and colors, no new characters or objects invented.

OUTPUT FORMAT:
One flat, evenly lit image: ONLY those marks on uniform off-white / white (#fffff8–#ffffff). No photo grain from the room, no shadows from people, no watermarks, no picture frames unless the mode asks for a frame. Preserve approximate composition and aspect ratio of the artwork region.`;

const POLISH_MODES = {

  clean: {
    label: 'Clean Extract',
    resultLabel: 'Clean Extract',
    usesAI: true,
    progressSteps: [
      { at: 15, text: 'Analyzing the photo...' },
      { at: 28, text: 'Detecting room, furniture & obstructions...' },
      { at: 45, text: 'Stripping scene—keeping only the drawing...' },
      { at: 65, text: 'Reconstructing hidden strokes...' },
      { at: 82, text: 'Flattening to clean paper...' },
      { at: 95, text: 'Almost done...' },
    ],
    textPrompt:
      `You are analyzing a photo of a child's drawing in a real room. List (1) everything that is NOT part of the child's marks: people, furniture, walls, floor, objects, watermarks. (2) What is blocking or covering any part of the drawing. (3) List the drawn elements: colors, shapes, subjects. Keep it concise—3-4 short sentences.`,
    imagePrompt: (desc) =>
      `${POLISH_SCENE_STRIP}\n\nScene notes from vision analysis (use only to decide what to erase / inpaint; still obey all mandatory removals above): ${desc || 'not provided'}`,
  },

  brighten: {
    label: 'Extract & Brighten',
    resultLabel: 'Extracted & Brightened',
    usesAI: true,
    progressSteps: [
      { at: 15, text: 'Analyzing the photo...' },
      { at: 28, text: 'Removing room & furniture...' },
      { at: 48, text: 'Isolating the drawing...' },
      { at: 65, text: 'Boosting drawing colors...' },
      { at: 88, text: 'Final touches...' },
    ],
    textPrompt:
      `Same as clean extract: note room/furniture vs child's marks, blockers, and which drawn colors look faded. 3-4 short sentences.`,
    imagePrompt: (desc) =>
      `${POLISH_SCENE_STRIP}\n\nAfter isolation on white/light paper only: make ONLY the child's colors slightly more vivid—do not change shapes or add elements.\n\nScene notes: ${desc || 'not provided'}`,
  },

  frame: {
    label: 'Frame It',
    resultLabel: 'Framed Artwork',
    usesAI: false,
    progressSteps: [
      { at: 30, text: 'Preparing the frame...' },
      { at: 60, text: 'Mounting the artwork...' },
      { at: 90, text: 'Done!' },
    ],
    textPrompt: '',
    imagePrompt: () => '',
  },

  print: {
    label: 'Extract for Print',
    resultLabel: 'Print Ready',
    usesAI: true,
    progressSteps: [
      { at: 12, text: 'Analyzing the photo...' },
      { at: 26, text: 'Stripping furniture & room...' },
      { at: 44, text: 'Extracting artwork only...' },
      { at: 60, text: 'Cleaning edges & watermarks...' },
      { at: 76, text: 'Optimizing for print...' },
      { at: 90, text: 'Almost ready...' },
    ],
    textPrompt:
      `Note furniture/room vs drawing, blockers, imperfections. 3-4 short sentences.`,
    imagePrompt: (desc) =>
      `${POLISH_SCENE_STRIP}\n\nThen for print: crisp edges on the drawing, uniform white surround, slightly boost saturation for ink—zero new content, same composition.\n\nScene notes: ${desc || 'not provided'}`,
  },
};

function buildPolishTextPrompt(mode) {
  const config = POLISH_MODES[mode] || POLISH_MODES.clean;
  if (!config.textPrompt) return '';
  return `You are analyzing a photo of a child's drawing. ${config.textPrompt}`;
}

function buildPolishImagePrompt(mode, descriptionFromGPT) {
  const config = POLISH_MODES[mode] || POLISH_MODES.clean;
  const raw = String(descriptionFromGPT || '');
  const noTitle = raw.replace(/TITLE:\s*.+/i, '').trim();
  const clipped = noTitle.length > 500 ? noTitle.slice(0, 500) + '…' : noTitle;
  return config.imagePrompt(clipped);
}

/** When GPT vision analysis fails (demo / network): image model still gets explicit strip instructions. */
const POLISH_IMAGE_NOTES_NO_VISION = `Automated scene description is unavailable. From the pixels alone: (1) Delete every person—children and adults—faces, bodies, limbs, clothing, hair. (2) Delete every stock-photo watermark, diagonal stripe, semi-transparent overlay text, and logo. (3) Delete room context—walls as photograph, floor, furniture—except reconstruct the child's drawn lines that were on the wall or paper. (4) Deliver ONLY the drawing on clean white off-white paper, evenly lit, as a flat illustration—never return the original photo with the person still visible.`;

function buildPolishImagePromptForFailedVision(mode) {
  return buildPolishImagePrompt(mode, POLISH_IMAGE_NOTES_NO_VISION);
}

function getPolishMode(mode) {
  return POLISH_MODES[mode] || POLISH_MODES.clean;
}
