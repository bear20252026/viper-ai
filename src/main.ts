/**
 * VIPER AI — AI-Native Flight Simulator
 * 
 * Main entry point. Initializes the engine, world, combat, AI, and UI.
 * Every game function is registered as an AI-callable tool.
 */

import * as THREE from "three";
import { FlightEngine } from "./engine/flight.js";
import { WorldEngine } from "./world/world.js";
import { CombatSystem } from "./combat/combat.js";
import { registerAllTools } from "./tools/index.js";
import { registry } from "./core/registry.js";
import { gameState } from "./core/state.js";
import { bus, GameEvents } from "./core/events.js";
import { AIBackend } from "./ai/backend.js";
import { AIPanel } from "./ui/ai-panel.js";
import { HUD } from "./ui/hud.js";
import { Menu } from "./ui/menu.js";
import type { GameMode } from "./ui/menu.js";

class Game {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private flightEngine!: FlightEngine;
  private worldEngine!: WorldEngine;
  private combatSystem!: CombatSystem;
  private aiBackend!: AIBackend;
  private aiPanel!: AIPanel;
  private hud!: HUD;
  private menu!: Menu;
  private clock = new THREE.Clock();
  private aircraftMesh: THREE.Group | null = null;
  private lastHudUpdate = 0;

  constructor() {
    this.initRenderer();
    this.initScene();
    this.initEngines();
    this.initAI();
    this.initUI();
    this.initInput();
    this.registerTools();
    this.startLoop();
    this.hideLoader();
  }

  private initRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    document.getElementById("app")!.appendChild(this.renderer.domElement);

    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private initScene(): void {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 100000);
    this.camera.position.set(0, 50, 100);
    this.camera.lookAt(0, 0, 0);

    // Create simple aircraft mesh
    this.aircraftMesh = this.createAircraftMesh();
    this.scene.add(this.aircraftMesh);
  }

  private createAircraftMesh(): THREE.Group {
    const group = new THREE.Group();

    // Fuselage
    const bodyGeo = new THREE.CylinderGeometry(1.2, 0.6, 16, 8);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x4a5568 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    group.add(body);

    // Nose cone
    const noseGeo = new THREE.ConeGeometry(0.6, 3, 8);
    noseGeo.rotateX(-Math.PI / 2);
    const nose = new THREE.Mesh(noseGeo, bodyMat);
    nose.position.z = -9.5;
    nose.castShadow = true;
    group.add(nose);

    // Wings
    const wingGeo = new THREE.BoxGeometry(10, 0.15, 3);
    const wing = new THREE.Mesh(wingGeo, bodyMat);
    wing.position.set(0, 0, 1);
    wing.castShadow = true;
    group.add(wing);

    // Tail
    const tailGeo = new THREE.BoxGeometry(4, 0.12, 2);
    const tail = new THREE.Mesh(tailGeo, bodyMat);
    tail.position.set(0, 0.5, 7);
    tail.castShadow = true;
    group.add(tail);

    // Vertical stabilizer
    const vstabGeo = new THREE.BoxGeometry(0.12, 3, 2);
    const vstab = new THREE.Mesh(vstabGeo, bodyMat);
    vstab.position.set(0, 1.5, 7);
    vstab.castShadow = true;
    group.add(vstab);

    // Canopy
    const canopyGeo = new THREE.SphereGeometry(1, 8, 6);
    const canopyMat = new THREE.MeshPhongMaterial({ color: 0x88ccff, transparent: true, opacity: 0.4, shininess: 100 });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.8, -2);
    canopy.scale.set(0.8, 0.6, 1.5);
    group.add(canopy);

    // Engine glow
    const engineGeo = new THREE.CylinderGeometry(0.5, 0.4, 0.5, 8);
    engineGeo.rotateX(Math.PI / 2);
    const engineMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
    const engine = new THREE.Mesh(engineGeo, engineMat);
    engine.position.set(0, 0, 8.2);
    group.add(engine);

    return group;
  }

  private initEngines(): void {
    this.flightEngine = new FlightEngine("f16c");
    this.worldEngine = new WorldEngine(this.scene);
    this.combatSystem = new CombatSystem();
  }

  private initAI(): void {
    // Read AI config from localStorage or use defaults
    const savedConfig = localStorage.getItem("viper-ai-config");
    const config = savedConfig ? JSON.parse(savedConfig) : {
      apiUrl: "",
      apiKey: "",
      model: "gpt-4o-mini",
    };
    this.aiBackend = new AIBackend(config);
    this.aiPanel = new AIPanel(this.aiBackend);
  }

  private initUI(): void {
    this.hud = new HUD();
    this.menu = new Menu();

    this.menu.setModeSelectHandler((mode) => this.startGame(mode));

    // Show menu after loader
    setTimeout(() => {
      this.menu.show();
    }, 500);

    // Update tool count display
    document.querySelector("#tool-count span")!.textContent = String(registry.count);
  }

  private initInput(): void {
    // Keyboard input for manual flight
    const keys: Record<string, boolean> = {};
    window.addEventListener("keydown", (e) => {
      keys[e.code] = true;
      this.updateKeyboardControls(keys);
    });
    window.addEventListener("keyup", (e) => {
      keys[e.code] = false;
      this.updateKeyboardControls(keys);
    });

    // Escape to pause/resume
    window.addEventListener("keydown", (e) => {
      if (e.code === "Escape") {
        if (gameState.state.paused) {
          this.resumeGame();
        } else {
          this.pauseGame();
        }
      }
    });
  }

  private updateKeyboardControls(keys: Record<string, boolean>): void {
    if (gameState.state.paused) return;

    const pitch = (keys["KeyS"] ? 1 : 0) - (keys["KeyW"] ? 1 : 0);
    const roll = (keys["KeyD"] ? 1 : 0) - (keys["KeyA"] ? 1 : 0);
    const yaw = (keys["KeyE"] ? 1 : 0) - (keys["KeyQ"] ? 1 : 0);
    const throttleUp = keys["ShiftLeft"] ? 0.02 : 0;
    const throttleDown = keys["ControlLeft"] ? 0.02 : 0;

    const current = this.flightEngine.getControls();
    const throttle = Math.max(0, Math.min(1, current.throttle + throttleUp - throttleDown));

    this.flightEngine.setControls({
      pitch: pitch * 0.5,
      roll: roll * 0.5,
      yaw: yaw * 0.3,
      throttle,
    });
  }

  private registerTools(): void {
    registerAllTools(this.flightEngine, this.worldEngine, this.combatSystem);
    console.log(`[Game] ${registry.count} AI tools registered`);
    document.querySelector("#tool-count span")!.textContent = String(registry.count);
  }

  private startGame(mode: GameMode): void {
    this.menu.hide();
    this.hud.show();
    gameState.start("flying");
    gameState.state.mode = "flying";

    // Configure based on mode
    switch (mode) {
      case "free":
        this.flightEngine.reset(new THREE.Vector3(0, 0, 0));
        this.worldEngine.setEnvironment("nellis");
        this.worldEngine.setWeather("clear");
        this.worldEngine.setTimeOfDay("afternoon");
        break;
      case "dogfight":
        this.flightEngine.reset(new THREE.Vector3(0, 2000, 0));
        this.worldEngine.setEnvironment("nellis");
        this.worldEngine.setWeather("clear");
        this.worldEngine.setTimeOfDay("afternoon");
        this.flightEngine.setControls({ throttle: 0.8, gearDown: false });
        // Spawn bandits
        this.spawnBandits(2, "pilot");
        break;
      case "carrier":
        this.flightEngine.reset(new THREE.Vector3(0, 18, 0));
        this.worldEngine.setEnvironment("carrier");
        this.worldEngine.setWeather("clear");
        this.worldEngine.setTimeOfDay("afternoon");
        break;
      case "landing":
        this.flightEngine.reset(new THREE.Vector3(0, 600, -8000));
        this.flightEngine.setControls({ throttle: 0.3, gearDown: true, flaps: 1, speedBrake: true });
        this.worldEngine.setEnvironment("nellis");
        this.worldEngine.setWeather("clear");
        this.worldEngine.setTimeOfDay("afternoon");
        break;
      case "campaign":
        this.flightEngine.reset(new THREE.Vector3(0, 0, 0));
        this.worldEngine.setEnvironment("nellis");
        this.worldEngine.setWeather("clear");
        this.worldEngine.setTimeOfDay("afternoon");
        break;
    }

    this.aiPanel.addMessage("system", `Game started in ${mode} mode. ${registry.count} AI tools available.`);
    this.aiPanel.addMessage("ai", this.getModeGreeting(mode));
  }

  private spawnBandits(count: number, skill: string): void {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist = 5000 + Math.random() * 3000;
      this.combatSystem.addBandit({
        id: `bandit-${i + 1}`,
        aircraftType: ["mig29", "su57", "fa18e"][Math.floor(Math.random() * 3)],
        position: {
          x: Math.cos(angle) * dist,
          y: 2000 + Math.random() * 2000,
          z: Math.sin(angle) * dist,
        },
        altitude: 2000 + Math.random() * 2000,
        heading: Math.random() * 360,
        speed: 150 + Math.random() * 100,
        skill,
        alive: true,
        locked: false,
      });
    }
  }

  private getModeGreeting(mode: GameMode): string {
    const greetings: Record<GameMode, string> = {
      free: "Free flight started! I'm ready to assist. Try asking me to take off, change the weather, or fly to a waypoint.",
      dogfight: "Dogfight started! Bandits are inbound. Ask me to check bandit positions, arm weapons, or engage.",
      campaign: "Campaign mission started. I'll help you complete objectives. Ask for status or objectives anytime.",
      carrier: "Carrier launch mode! I can help you configure for launch or practice carrier landings.",
      landing: "Landing practice started. I'm configured for final approach. Ask me to adjust your approach or go around.",
    };
    return greetings[mode];
  }

  private pauseGame(): void {
    gameState.state.paused = true;
    bus.emit(GameEvents.GAME_PAUSE);
    this.aiPanel.addMessage("system", "Game paused. Press Escape or use AI to resume.");
  }

  private resumeGame(): void {
    gameState.state.paused = false;
    bus.emit(GameEvents.GAME_RESUME);
  }

  private startLoop(): void {
    this.renderer.setAnimationLoop(() => this.update());
  }

  private update(): void {
    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05) * gameState.state.timeScale;

    if (!gameState.state.paused && gameState.state.mode === "flying") {
      // Update flight physics
      const aircraftState = this.flightEngine.update(dt);
      gameState.aircraft = aircraftState;

      // Update world
      this.worldEngine.update(dt);

      // Update combat
      this.combatSystem.update(dt);

      // Update mission time
      gameState.state.time += dt;

      // Update aircraft mesh position
      if (this.aircraftMesh) {
        this.aircraftMesh.position.set(
          aircraftState.position.x,
          aircraftState.position.y,
          aircraftState.position.z
        );
        this.aircraftMesh.rotation.set(
          aircraftState.attitude.pitch,
          aircraftState.attitude.yaw,
          aircraftState.attitude.roll,
          "YXZ"
        );

        // Afterburner effect
        const engineGlow = this.aircraftMesh.children[6] as THREE.Mesh;
        if (engineGlow) {
          const mat = engineGlow.material as THREE.MeshBasicMaterial;
          if (aircraftState.afterburner) {
            mat.color.setHex(0xff3300);
            engineGlow.scale.set(1.5, 1.5, 2);
          } else {
            mat.color.setHex(0xff6600);
            engineGlow.scale.set(1, 1, 1);
          }
        }
      }

      // Update camera (chase cam)
      this.updateCamera(aircraftState);

      // Update HUD at 10Hz
      this.lastHudUpdate += rawDt;
      if (this.lastHudUpdate > 0.1) {
        this.hud.update();
        this.lastHudUpdate = 0;
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  private updateCamera(aircraftState: import("./core/types.js").AircraftState): void {
    const offset = new THREE.Vector3(0, 8, 25);
    offset.applyEuler(new THREE.Euler(
      aircraftState.attitude.pitch * 0.3,
      aircraftState.attitude.yaw,
      aircraftState.attitude.roll * 0.3,
      "YXZ"
    ));

    const targetPos = new THREE.Vector3(
      aircraftState.position.x + offset.x,
      aircraftState.position.y + offset.y,
      aircraftState.position.z + offset.z
    );

    this.camera.position.lerp(targetPos, 0.05);
    this.camera.lookAt(
      aircraftState.position.x,
      aircraftState.position.y,
      aircraftState.position.z
    );
  }

  private hideLoader(): void {
    const loader = document.getElementById("loader")!;
    loader.classList.add("hidden");
    setTimeout(() => loader.remove(), 600);
  }
}

// Start the game
new Game();
