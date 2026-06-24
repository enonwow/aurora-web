import * as THREE from "three";

const SOUND_MARKER_ICON = "\u266A";
const SOUND_SPECIFIC_ICON = "\u2B07";
const SOUND_EVERYWHERE_RING_COLOR = "#ff6d7f";

interface TextSpriteOptions {
  fillColor?: string;
  strokeColor?: string;
  backgroundFill?: string;
  backgroundStroke?: string;
  autoWidth?: boolean;
  minWidthPx?: number;
  maxWidthPx?: number;
  horizontalPaddingPx?: number;
}

export function createTextSprite(
  text: string,
  scaleFactor = 1,
  options: TextSpriteOptions = {}
): THREE.Sprite {
  const labelHeightPx = 96;
  const defaultLabelWidthPx = 256;
  const horizontalPaddingPx = options.horizontalPaddingPx ?? 24;
  const minWidthPx = options.minWidthPx ?? defaultLabelWidthPx;
  const maxWidthPx = options.maxWidthPx ?? 1400;
  const font = "700 30px Segoe UI";
  const canvas = document.createElement("canvas");
  let resolvedWidthPx = defaultLabelWidthPx;
  if (options.autoWidth) {
    const measureCanvas = document.createElement("canvas");
    const measureCtx = measureCanvas.getContext("2d");
    if (measureCtx) {
      measureCtx.font = font;
      const measuredTextWidth = Math.ceil(measureCtx.measureText(text).width);
      resolvedWidthPx = Math.min(
        Math.max(measuredTextWidth + horizontalPaddingPx * 2, minWidthPx),
        maxWidthPx
      );
    }
  }
  canvas.width = resolvedWidthPx;
  canvas.height = labelHeightPx;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = options.backgroundFill ?? "rgba(8, 20, 38, 0.92)";
    ctx.fillRect(0, 26, canvas.width, 44);
    ctx.strokeStyle = options.backgroundStroke ?? "rgba(95, 142, 194, 0.9)";
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 28, canvas.width - 4, 40);
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (options.strokeColor) {
      ctx.strokeStyle = options.strokeColor;
      ctx.lineWidth = 2;
      ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
    }
    ctx.fillStyle = options.fillColor ?? "#e6f1ff";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false
  });
  const sprite = new THREE.Sprite(material);
  const spriteHeight = 0.6 * scaleFactor;
  const spriteWidth = spriteHeight * (canvas.width / canvas.height);
  sprite.scale.set(spriteWidth, spriteHeight, 1);
  sprite.renderOrder = 1000;
  return sprite;
}

interface GlyphSpriteOptions {
  color: string;
  strokeColor?: string;
  fontSizePx?: number;
  weight?: number;
}

function createGlyphSprite(
  glyph: string,
  scaleFactor = 1,
  options: GlyphSpriteOptions
): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 192;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const fontSizePx = options.fontSizePx ?? 128;
    const weight = options.weight ?? 700;
    ctx.font = `${weight} ${fontSizePx}px "Segoe UI Symbol", "Segoe UI Emoji", "Segoe UI", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (options.strokeColor) {
      ctx.strokeStyle = options.strokeColor;
      ctx.lineWidth = Math.max(3, Math.round(fontSizePx * 0.07));
      ctx.strokeText(glyph, canvas.width / 2, canvas.height / 2);
    }
    ctx.fillStyle = options.color;
    ctx.fillText(glyph, canvas.width / 2, canvas.height / 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.64 * scaleFactor, 0.64 * scaleFactor, 1);
  sprite.renderOrder = 1002;
  return sprite;
}

function createDiceSprite(scaleFactor = 1): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 192;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width * 0.5, canvas.height * 0.58);
    ctx.rotate(-0.26);

    const size = 70;
    const half = size / 2;
    ctx.fillStyle = "#f4f8ff";
    ctx.strokeStyle = "#0f1725";
    ctx.lineWidth = 6;
    ctx.fillRect(-half, -half, size, size);
    ctx.strokeRect(-half, -half, size, size);

    ctx.fillStyle = "#121c2d";
    const pipRadius = 4.6;
    const pipOffset = size * 0.24;
    const pips: ReadonlyArray<readonly [number, number]> = [
      [-pipOffset, -pipOffset],
      [pipOffset, -pipOffset],
      [0, 0],
      [-pipOffset, pipOffset],
      [pipOffset, pipOffset]
    ];
    pips.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, pipRadius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.52 * scaleFactor, 0.52 * scaleFactor, 1);
  sprite.renderOrder = 1004;
  return sprite;
}

export function createSoundModeMarkerGroup(
  mode: "everywhere" | "random" | "specific",
  markerScale: number
): THREE.Group {
  const marker = new THREE.Group();
  const noteSprite = createGlyphSprite(SOUND_MARKER_ICON, markerScale * 0.74, {
    color: "#0e1219",
    strokeColor: "#f2f8ff",
    fontSizePx: 126
  });
  noteSprite.position.set(0, markerScale * 0.42, 0);
  marker.add(noteSprite);

  if (mode === "random") {
    const diceSprite = createDiceSprite(markerScale * 0.86);
    diceSprite.position.set(markerScale * 0.05, markerScale * -0.27, markerScale * 0.06);
    marker.add(diceSprite);
  } else if (mode === "specific") {
    const arrowSprite = createGlyphSprite(SOUND_SPECIFIC_ICON, markerScale * 0.5, {
      color: "#ff3f55",
      strokeColor: "#0e1219",
      fontSizePx: 106
    });
    arrowSprite.position.set(0, markerScale * -0.08, 0);
    marker.add(arrowSprite);
  } else {
    const everywhereRing = new THREE.Mesh(
      new THREE.TorusGeometry(
        Math.max(0.08, markerScale * 0.22),
        Math.max(0.01, markerScale * 0.03),
        8,
        36
      ),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(SOUND_EVERYWHERE_RING_COLOR),
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        depthTest: false
      })
    );
    everywhereRing.rotation.x = Math.PI / 2;
    everywhereRing.position.set(0, markerScale * -0.1, 0);
    everywhereRing.raycast = () => undefined;
    marker.add(everywhereRing);
  }

  marker.renderOrder = 1002;
  return marker;
}
