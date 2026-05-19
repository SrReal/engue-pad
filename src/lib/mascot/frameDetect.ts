/**
 * Detects how many frames per row actually have non-transparent content
 * by scanning the spritesheet with a canvas.
 */
export function detectSpriteFrames(
  image: HTMLImageElement,
  frameWidth: number,
  frameHeight: number
): number[] {
  if (!image.naturalWidth || !image.naturalHeight || frameWidth <= 0 || frameHeight <= 0) {
    return [];
  }

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];

  ctx.drawImage(image, 0, 0);

  const rows = Math.floor(image.naturalHeight / frameHeight);
  const maxCols = Math.floor(image.naturalWidth / frameWidth);
  const framesPerRow: number[] = [];

  for (let row = 0; row < rows; row++) {
    let framesInRow = 0;
    for (let col = 0; col < maxCols; col++) {
      const x = col * frameWidth;
      const y = row * frameHeight;
      const imageData = ctx.getImageData(x, y, frameWidth, frameHeight);
      const data = imageData.data;
      let hasContent = false;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 10) {
          hasContent = true;
          break;
        }
      }
      if (hasContent) {
        framesInRow = col + 1;
      }
      // Stop early if we find 2 consecutive empty frames
      // (most sprite sheets have all frames at the start, then blank)
      if (!hasContent && col > 0) {
        // Check next frame too
        const nextX = (col + 1) * frameWidth;
        if (nextX + frameWidth <= image.naturalWidth) {
          const nextImageData = ctx.getImageData(nextX, y, frameWidth, frameHeight);
          const nextData = nextImageData.data;
          let nextHasContent = false;
          for (let j = 3; j < nextData.length; j += 4) {
            if (nextData[j] > 10) {
              nextHasContent = true;
              break;
            }
          }
          if (!nextHasContent) {
            break;
          }
        } else {
          break;
        }
      }
    }
    framesPerRow.push(framesInRow);
  }

  return framesPerRow;
}
