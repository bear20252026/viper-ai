/**
 * World Engine — terrain, sky, weather, time-of-day, and environments.
 * Manages the Three.js scene, lighting, atmosphere, and environmental state.
 */

import * as THREE from "three";
import type { WorldState, WeatherState, TimeOfDayState } from "../core/types.js";
import { gameState } from "../core/state.js";
import { bus, GameEvents } from "../core/events.js";

/** Environment presets inspired by VIPER 11 */
export interface EnvironmentPreset {
  id: string;
  name: string;
  terrainColor: number;
  skyColor: number;
  groundColor: number;
  waterLevel: number;
  hasWater: boolean;
  hasSnow: boolean;
  fogDensity: number;
  ambientIntensity: number;
  sunColor: number;
  sunIntensity: number;
}

export const ENVIRONMENTS: Record<string, EnvironmentPreset> = {
  nellis: {
    id: "nellis",
    name: "Nellis AFB",
    terrainColor: 0xc4a35a,
    skyColor: 0x87ceeb,
    groundColor: 0x8b7355,
    waterLevel: -100,
    hasWater: false,
    hasSnow: false,
    fogDensity: 0.0003,
    ambientIntensity: 0.4,
    sunColor: 0xfff5e0,
    sunIntensity: 1.2,
  },
  hill: {
    id: "hill",
    name: "Hill AFB",
    terrainColor: 0x6b8e4e,
    skyColor: 0x87ceeb,
    groundColor: 0x5a7a3e,
    waterLevel: -10,
    hasWater: true,
    hasSnow: false,
    fogDensity: 0.0004,
    ambientIntensity: 0.45,
    sunColor: 0xfff5e0,
    sunIntensity: 1.1,
  },
  keywest: {
    id: "keywest",
    name: "NAS Key West",
    terrainColor: 0x2e8b57,
    skyColor: 0x87ceeb,
    groundColor: 0x3cb371,
    waterLevel: 0,
    hasWater: true,
    hasSnow: false,
    fogDensity: 0.0002,
    ambientIntensity: 0.5,
    sunColor: 0xffecd0,
    sunIntensity: 1.3,
  },
  fallon: {
    id: "fallon",
    name: "NAS Fallon",
    terrainColor: 0xc4a35a,
    skyColor: 0x87ceeb,
    groundColor: 0xa0926b,
    waterLevel: -100,
    hasWater: false,
    hasSnow: false,
    fogDensity: 0.0003,
    ambientIntensity: 0.4,
    sunColor: 0xfff5e0,
    sunIntensity: 1.2,
  },
  miramar: {
    id: "miramar",
    name: "MCAS Miramar",
    terrainColor: 0x8b7355,
    skyColor: 0x87ceeb,
    groundColor: 0x9b8b6b,
    waterLevel: 0,
    hasWater: true,
    hasSnow: false,
    fogDensity: 0.0003,
    ambientIntensity: 0.45,
    sunColor: 0xfff5e0,
    sunIntensity: 1.1,
  },
  edwards: {
    id: "edwards",
    name: "Edwards AFB",
    terrainColor: 0xd4b896,
    skyColor: 0x87ceeb,
    groundColor: 0xc4a882,
    waterLevel: -100,
    hasWater: false,
    hasSnow: false,
    fogDensity: 0.0002,
    ambientIntensity: 0.4,
    sunColor: 0xfff5e0,
    sunIntensity: 1.3,
  },
  elmendorf: {
    id: "elmendorf",
    name: "JBER Elmendorf",
    terrainColor: 0xffffff,
    skyColor: 0xb0c4de,
    groundColor: 0xf0f0f0,
    waterLevel: 0,
    hasWater: true,
    hasSnow: true,
    fogDensity: 0.0005,
    ambientIntensity: 0.35,
    sunColor: 0xe8e8ff,
    sunIntensity: 0.8,
  },
  carrier: {
    id: "carrier",
    name: "Pacific / USS Carl Vinson",
    terrainColor: 0x1a3a5c,
    skyColor: 0x87ceeb,
    groundColor: 0x2a4a6c,
    waterLevel: 0,
    hasWater: true,
    hasSnow: false,
    fogDensity: 0.0002,
    ambientIntensity: 0.45,
    sunColor: 0xfff5e0,
    sunIntensity: 1.2,
  },
};

/** Weather presets */
export const WEATHER_PRESETS: Record<string, Partial<WeatherState>> = {
  clear: {
    preset: "clear",
    rainIntensity: 0,
    cloudCoverage: 0.2,
    cloudBase: 3000,
    cloudTop: 6000,
    turbulence: 0.05,
  },
  scattered: {
    preset: "scattered",
    rainIntensity: 0,
    cloudCoverage: 0.5,
    cloudBase: 2000,
    cloudTop: 5000,
    turbulence: 0.15,
  },
  overcast: {
    preset: "overcast",
    rainIntensity: 0,
    cloudCoverage: 0.9,
    cloudBase: 800,
    cloudTop: 3000,
    turbulence: 0.3,
  },
  rain: {
    preset: "rain",
    rainIntensity: 0.7,
    cloudCoverage: 0.95,
    cloudBase: 500,
    cloudTop: 2500,
    turbulence: 0.4,
  },
  storm: {
    preset: "storm",
    rainIntensity: 1.0,
    cloudCoverage: 1.0,
    cloudBase: 400,
    cloudTop: 8000,
    turbulence: 0.8,
  },
};

/** Time-of-day presets */
export const TIME_PRESETS: Record<string, Partial<TimeOfDayState>> = {
  morning: { preset: "morning", sunAzimuth: 90, sunElevation: 25, ambientLight: 0.6 },
  afternoon: { preset: "afternoon", sunAzimuth: 180, sunElevation: 45, ambientLight: 1.0 },
  golden: { preset: "golden", sunAzimuth: 250, sunElevation: 12, ambientLight: 0.7 },
  sunset: { preset: "sunset", sunAzimuth: 270, sunElevation: 5, ambientLight: 0.5 },
  dusk: { preset: "dusk", sunAzimuth: 290, sunElevation: -2, ambientLight: 0.3 },
  night: { preset: "night", sunAzimuth: 0, sunElevation: -30, ambientLight: 0.1 },
};

export class WorldEngine {
  private scene: THREE.Scene;
  private sunLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private hemiLight: THREE.HemisphereLight;
  private fog: THREE.FogExp2;
  private terrain: THREE.Mesh | null = null;
  private water: THREE.Mesh | null = null;
  private clouds: THREE.Group | null = null;
  private rain: THREE.Points | null = null;
  private currentEnv: EnvironmentPreset;
  private time = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.currentEnv = ENVIRONMENTS.nellis;

    // Lighting
    this.sunLight = new THREE.DirectionalLight(0xfff5e0, 1.2);
    this.sunLight.position.set(1000, 2000, 1000);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 100;
    this.sunLight.shadow.camera.far = 5000;
    this.sunLight.shadow.camera.left = -2000;
    this.sunLight.shadow.camera.right = 2000;
    this.sunLight.shadow.camera.top = 2000;
    this.sunLight.shadow.camera.bottom = -2000;
    scene.add(this.sunLight);

    this.ambientLight = new THREE.AmbientLight(0x404060, 0.4);
    scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x8b7355, 0.3);
    scene.add(this.hemiLight);

    // Fog
    this.fog = new THREE.FogExp2(0x87ceeb, 0.0003);
    scene.fog = this.fog;
    scene.background = new THREE.Color(0x87ceeb);

    this.createTerrain();
    this.createWater();
    this.createClouds();
  }

  get environment(): EnvironmentPreset {
    return this.currentEnv;
  }

  /** Create simple terrain mesh */
  private createTerrain(): void {
    if (this.terrain) {
      this.scene.remove(this.terrain);
      this.terrain.geometry.dispose();
    }

    const size = 50000;
    const segments = 128;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    // Add gentle hills
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const height = Math.sin(x * 0.0005) * Math.cos(z * 0.0003) * 80
        + Math.sin(x * 0.001 + z * 0.0007) * 30
        + Math.sin(x * 0.002) * Math.cos(z * 0.002) * 10;
      pos.setY(i, height);
    }
    geometry.computeVertexNormals();

    const material = new THREE.MeshLambertMaterial({
      color: this.currentEnv.terrainColor,
      flatShading: false,
    });

    this.terrain = new THREE.Mesh(geometry, material);
    this.terrain.receiveShadow = true;
    this.scene.add(this.terrain);
  }

  /** Create water plane */
  private createWater(): void {
    if (this.water) {
      this.scene.remove(this.water);
      this.water.geometry.dispose();
    }

    if (!this.currentEnv.hasWater) {
      this.water = null;
      return;
    }

    const geometry = new THREE.PlaneGeometry(80000, 80000);
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshPhongMaterial({
      color: 0x1a5276,
      transparent: true,
      opacity: 0.85,
      shininess: 100,
      specular: 0x88ccff,
    });

    this.water = new THREE.Mesh(geometry, material);
    this.water.position.y = this.currentEnv.waterLevel;
    this.scene.add(this.water);
  }

  /** Create cloud layer */
  private createClouds(): void {
    if (this.clouds) {
      this.scene.remove(this.clouds);
    }

    this.clouds = new THREE.Group();
    const cloudMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.7,
    });

    for (let i = 0; i < 40; i++) {
      const size = 200 + Math.random() * 600;
      const cloudGeo = new THREE.SphereGeometry(size, 8, 6);
      const cloud = new THREE.Mesh(cloudGeo, cloudMaterial);
      cloud.position.set(
        (Math.random() - 0.5) * 30000,
        2000 + Math.random() * 3000,
        (Math.random() - 0.5) * 30000
      );
      cloud.scale.set(1, 0.3 + Math.random() * 0.3, 1);
      cloud.rotation.y = Math.random() * Math.PI;
      this.clouds.add(cloud);
    }

    this.scene.add(this.clouds);
  }

  /** Create rain particle system */
  private createRain(): void {
    if (this.rain) {
      this.scene.remove(this.rain);
      return;
    }

    const count = 5000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 2000;
      positions[i * 3 + 1] = Math.random() * 1000;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2000;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xaaaacc,
      size: 2,
      transparent: true,
      opacity: 0.6,
    });

    this.rain = new THREE.Points(geometry, material);
    this.scene.add(this.rain);
  }

  /** Switch environment */
  setEnvironment(envId: string): void {
    const env = ENVIRONMENTS[envId];
    if (!env) return;
    this.currentEnv = env;

    // Update scene
    (this.terrain!.material as THREE.MeshLambertMaterial).color.setHex(env.terrainColor);
    (this.scene.background as THREE.Color).setHex(env.skyColor);
    this.fog.color.setHex(env.skyColor);
    this.fog.density = env.fogDensity;
    this.sunLight.color.setHex(env.sunColor);
    this.sunLight.intensity = env.sunIntensity;
    this.ambientLight.intensity = env.ambientIntensity;
    this.hemiLight.color.setHex(env.skyColor);
    this.hemiLight.groundColor.setHex(env.groundColor);

    // Water
    if (env.hasWater && !this.water) {
      this.createWater();
    } else if (!env.hasWater && this.water) {
      this.scene.remove(this.water);
      this.water = null;
    }

    gameState.updateWorld({ environment: envId });
    bus.emit(GameEvents.ENVIRONMENT_CHANGE, { environment: envId });
  }

  /** Set weather preset */
  setWeather(preset: string): void {
    const weather = WEATHER_PRESETS[preset];
    if (!weather) return;

    gameState.updateWorld({ weather: { ...gameState.world.weather, ...weather } });

    // Update clouds visibility
    if (this.clouds) {
      const coverage = weather.cloudCoverage ?? 0.3;
      this.clouds.visible = coverage > 0.05;
      this.clouds.children.forEach((child, i) => {
        child.visible = i < Math.floor(coverage * this.clouds!.children.length);
      });
    }

    // Rain
    if ((weather.rainIntensity ?? 0) > 0.05) {
      if (!this.rain) this.createRain();
      (this.rain!.material as THREE.PointsMaterial).opacity = weather.rainIntensity! * 0.6;
    } else if (this.rain) {
      this.scene.remove(this.rain);
      this.rain = null;
    }

    // Visibility affects fog
    const visibility = preset === "rain" ? 5500 : preset === "storm" ? 3000 : 20000;
    this.fog.density = visibility > 10000 ? 0.0002 : 1 / (visibility * 3);

    bus.emit(GameEvents.WEATHER_CHANGE, { weather: preset });
  }

  /** Set time of day */
  setTimeOfDay(preset: string): void {
    const tod = TIME_PRESETS[preset];
    if (!tod) return;

    gameState.updateWorld({ timeOfDay: { ...gameState.world.timeOfDay, ...tod } });

    const azimuth = (tod.sunAzimuth ?? 180) * (Math.PI / 180);
    const elevation = (tod.sunElevation ?? 45) * (Math.PI / 180);
    const dist = 5000;

    this.sunLight.position.set(
      dist * Math.cos(elevation) * Math.sin(azimuth),
      dist * Math.sin(elevation),
      dist * Math.cos(elevation) * Math.cos(azimuth)
    );

    // Color temperature based on elevation
    if (tod.sunElevation! < 5) {
      this.sunLight.color.setHex(0xff6633);
      this.sunLight.intensity = 0.5;
    } else if (tod.sunElevation! < 15) {
      this.sunLight.color.setHex(0xffaa55);
      this.sunLight.intensity = 0.8;
    } else {
      this.sunLight.color.setHex(this.currentEnv.sunColor);
      this.sunLight.intensity = this.currentEnv.sunIntensity;
    }

    this.ambientLight.intensity = tod.ambientLight ?? 0.5;

    // Night sky
    if (preset === "night") {
      this.scene.background = new THREE.Color(0x0a0a1a);
      this.fog.color.setHex(0x0a0a1a);
    } else if (preset === "dusk") {
      this.scene.background = new THREE.Color(0x2a1a3a);
      this.fog.color.setHex(0x2a1a3a);
    } else {
      this.scene.background = new THREE.Color(this.currentEnv.skyColor);
      this.fog.color.setHex(this.currentEnv.skyColor);
    }

    bus.emit(GameEvents.TIME_CHANGE, { timeOfDay: preset });
  }

  /** Get terrain height at position */
  getTerrainHeight(x: number, z: number): number {
    return Math.sin(x * 0.0005) * Math.cos(z * 0.0003) * 80
      + Math.sin(x * 0.001 + z * 0.0007) * 30
      + Math.sin(x * 0.002) * Math.cos(z * 0.002) * 10;
  }

  /** Per-frame update */
  update(dt: number): void {
    this.time += dt;

    // Animate clouds
    if (this.clouds) {
      this.clouds.children.forEach((cloud, i) => {
        cloud.position.x += Math.sin(this.time * 0.01 + i) * 2;
        cloud.position.z += Math.cos(this.time * 0.008 + i) * 1.5;
      });
    }

    // Animate rain
    if (this.rain) {
      const positions = this.rain.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        let y = positions.getY(i);
        y -= dt * 800;
        if (y < 0) y = 1000;
        positions.setY(i, y);
      }
      positions.needsUpdate = true;
    }

    // Animate water
    if (this.water) {
      this.water.position.y = this.currentEnv.waterLevel + Math.sin(this.time * 0.3) * 0.5;
    }
  }

  /** Get current world state for tools */
  getWorldState(): WorldState {
    return { ...gameState.world };
  }
}

