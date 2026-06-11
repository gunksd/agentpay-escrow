import * as THREE from "three";

/* Cinematic night sea: stars, moon, shader ocean, sweeping lighthouse
   beam, drifting lantern fireflies. Built for 60fps: no postprocessing,
   glow via gradient sprites, DPR capped, renders only while visible. */

export type NightSea = {
  setPointer: (x: number, y: number) => void;
  setScroll: (p: number) => void;
  renderOnce: () => void;
  start: () => void;
  stop: () => void;
  dispose: () => void;
};

function glowTexture(inner: string, outer: string, size = 128): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.4, outer);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const OCEAN_VERT = /* glsl */ `
uniform float uTime;
varying vec2 vXY;
varying float vWave;
void main() {
  vec3 p = position;
  float w = sin(p.x * 0.35 + uTime * 0.85) * 0.13
          + sin(p.y * 0.45 - uTime * 0.55) * 0.11
          + sin((p.x + p.y) * 0.18 + uTime * 0.32) * 0.16;
  p.z += w;
  vXY = p.xy;
  vWave = w;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const OCEAN_FRAG = /* glsl */ `
precision mediump float;
uniform float uTime;
uniform float uBeam;
varying vec2 vXY;
varying float vWave;
void main() {
  /* vXY.y: 20 near camera .. -20 horizon */
  float far = smoothstep(20.0, -20.0, vXY.y);
  vec3 nearCol = vec3(0.016, 0.034, 0.055);
  vec3 farCol  = vec3(0.05, 0.09, 0.135);
  vec3 col = mix(nearCol, farCol, far);

  /* moonlight streak */
  float moonX = 5.2;
  float streak = exp(-pow((vXY.x - moonX) * 0.16, 2.0));
  float ripple = 0.6 + 0.4 * sin(vXY.y * 2.4 + uTime * 1.4 + vXY.x);
  col += vec3(0.32, 0.40, 0.50) * streak * ripple * (0.18 + far * 0.5);

  /* lantern-amber glints on wave crests near the beam side */
  float crest = smoothstep(0.16, 0.34, vWave);
  float beamSide = exp(-pow((vXY.x + 8.0) * 0.10, 2.0));
  col += vec3(0.55, 0.36, 0.12) * crest * beamSide * uBeam * 0.6;

  gl_FragColor = vec4(col, 1.0);
}`;

export function createNightSea(canvas: HTMLCanvasElement): NightSea {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor(new THREE.Color("#070c13"), 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x070c13, 0.028);

  const camera = new THREE.PerspectiveCamera(58, 2, 0.1, 120);
  const camBase = new THREE.Vector3(0, 2.3, 10);
  camera.position.copy(camBase);
  camera.lookAt(0, 1.6, -12);

  /* ---- stars ---- */
  const starCount = 1300;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const r = 60 + Math.random() * 30;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.42;
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = Math.abs(r * Math.cos(phi)) * 0.6 + 2;
    starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) - 20;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    size: 0.14,
    color: 0xbfd2e6,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    sizeAttenuation: true,
  });
  scene.add(new THREE.Points(starGeo, starMat));

  /* ---- moon ---- */
  const moonTex = glowTexture("rgba(255,250,235,1)", "rgba(190,200,225,0.28)", 256);
  const moon = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: moonTex, transparent: true, depthWrite: false }),
  );
  moon.position.set(9, 8.5, -36);
  moon.scale.setScalar(7.5);
  scene.add(moon);

  /* ---- ocean ---- */
  const oceanUniforms = {
    uTime: { value: 0 },
    uBeam: { value: 1 },
  };
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 40, 96, 48),
    new THREE.ShaderMaterial({
      vertexShader: OCEAN_VERT,
      fragmentShader: OCEAN_FRAG,
      uniforms: oceanUniforms,
    }),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, 0, -8);
  scene.add(ocean);

  /* ---- lighthouse beam ---- */
  const beamPivot = new THREE.Group();
  beamPivot.position.set(-13, 2.4, -24);
  const beamGeo = new THREE.CylinderGeometry(0.06, 1.7, 34, 14, 1, true);
  beamGeo.translate(0, -17, 0);
  beamGeo.rotateX(Math.PI / 2);
  const beam = new THREE.Mesh(
    beamGeo,
    new THREE.MeshBasicMaterial({
      color: 0xffd9a0,
      transparent: true,
      opacity: 0.10,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: false,
    }),
  );
  beamPivot.add(beam);
  scene.add(beamPivot);

  const lampTex = glowTexture("rgba(255,214,150,1)", "rgba(255,170,60,0.35)");
  const lamp = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: lampTex, transparent: true, depthWrite: false }),
  );
  lamp.position.copy(beamPivot.position);
  lamp.scale.setScalar(2.6);
  scene.add(lamp);

  /* ---- lantern fireflies ---- */
  const flyCount = 90;
  const flyTex = glowTexture("rgba(255,200,120,0.95)", "rgba(255,150,40,0.25)", 64);
  const flyGeo = new THREE.BufferGeometry();
  const flyPos = new Float32Array(flyCount * 3);
  const flySeed = new Float32Array(flyCount);
  for (let i = 0; i < flyCount; i++) {
    flyPos[i * 3] = (Math.random() - 0.5) * 44;
    flyPos[i * 3 + 1] = 0.4 + Math.random() * 5;
    flyPos[i * 3 + 2] = -2 - Math.random() * 30;
    flySeed[i] = Math.random() * Math.PI * 2;
  }
  flyGeo.setAttribute("position", new THREE.BufferAttribute(flyPos, 3));
  const flyMat = new THREE.PointsMaterial({
    size: 0.55,
    map: flyTex,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const flies = new THREE.Points(flyGeo, flyMat);
  scene.add(flies);

  /* ---- state & loop ---- */
  const pointer = { x: 0, y: 0 };
  let scrollP = 0;
  let raf = 0;
  let running = false;
  const clock = new THREE.Clock();

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== Math.floor(w * renderer.getPixelRatio())) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }

  function frame() {
    const t = clock.getElapsedTime();
    resize();

    oceanUniforms.uTime.value = t;
    beamPivot.rotation.y = Math.sin(t * 0.21) * 1.15 + 0.45;
    starMat.opacity = 0.72 + Math.sin(t * 0.7) * 0.13;

    const pos = flyGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < flyCount; i++) {
      const s = flySeed[i];
      let y = pos.getY(i) + 0.0035 + Math.sin(t * 0.8 + s) * 0.0012;
      if (y > 6.5) y = 0.3;
      pos.setY(i, y);
      pos.setX(i, pos.getX(i) + Math.sin(t * 0.4 + s) * 0.004);
    }
    pos.needsUpdate = true;

    /* pointer parallax + scroll dolly, eased */
    camera.position.x += (camBase.x + pointer.x * 0.9 - camera.position.x) * 0.045;
    camera.position.y +=
      (camBase.y + pointer.y * -0.35 + scrollP * 1.6 - camera.position.y) * 0.045;
    camera.position.z = camBase.z - scrollP * 2.2;
    camera.lookAt(0, 1.6 + scrollP * 0.8, -12);

    renderer.render(scene, camera);
    if (running) raf = requestAnimationFrame(frame);
  }

  return {
    setPointer(x, y) {
      pointer.x = x;
      pointer.y = y;
    },
    setScroll(p) {
      scrollP = p;
    },
    renderOnce() {
      resize();
      renderer.render(scene, camera);
    },
    start() {
      if (running) return;
      running = true;
      clock.start();
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    dispose() {
      this.stop();
      renderer.dispose();
      starGeo.dispose();
      flyGeo.dispose();
      beamGeo.dispose();
      ocean.geometry.dispose();
      (ocean.material as THREE.Material).dispose();
      moonTex.dispose();
      lampTex.dispose();
      flyTex.dispose();
    },
  };
}
