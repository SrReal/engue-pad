import { type PetInfo } from "./types";

export type AnimationEngine = {
  start: (canvas: HTMLCanvasElement, pet: PetInfo, image: HTMLImageElement) => void;
  stop: () => void;
  setState: (state: number) => void;
};

export function createAnimationEngine(): AnimationEngine {
  let ctx: CanvasRenderingContext2D | null = null;
  let currentPet: PetInfo | null = null;
  let currentImage: HTMLImageElement | null = null;
  let currentState = 0;
  let animFrame = 0;
  let frameIndex = 0;
  let running = false;

  function draw() {
    if (!running || !ctx || !currentPet || !currentImage) return;
    const { frameWidth, frameHeight, framesPerState, loopMs, states } = currentPet;
    const row = Math.min(Math.max(0, currentState), states.length - 1);
    if (row < 0) return;

    const totalFrames = framesPerState;
    const frameDuration = loopMs / totalFrames;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.drawImage(
      currentImage,
      frameIndex * frameWidth,
      row * frameHeight,
      frameWidth,
      frameHeight,
      0,
      0,
      ctx.canvas.width,
      ctx.canvas.height
    );

    if (Date.now() - animFrame > frameDuration) {
      animFrame = Date.now();
      frameIndex = (frameIndex + 1) % totalFrames;
    }

    requestAnimationFrame(draw);
  }

  return {
    start(canvas, pet, image) {
      if (running) return;
      ctx = canvas.getContext("2d");
      if (!ctx) return;
      currentPet = pet;
      currentImage = image;
      currentState = 0;
      animFrame = Date.now();
      frameIndex = 0;
      running = true;
      draw();
    },
    stop() {
      running = false;
      ctx = null;
      currentPet = null;
      currentImage = null;
    },
    setState(state) {
      currentState = state;
      frameIndex = 0;
      animFrame = Date.now();
    },
  };
}
