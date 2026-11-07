/**
 * Livery System — aircraft paint, finishes, canopy, bobbleheads.
 * All visual customization is exposed as AI-callable tools.
 */

import * as THREE from "three";

export interface LiveryPreset {
  id: string;
  name: string;
  baseColor: string;
  accentColor: string;
  inkColor: string;
  finish: "gloss" | "satin" | "matte" | "metal" | "pearl" | "chrome";
  pattern: "solid" | "candy" | "titanium" | "carbon" | "hologram" | "kintsugi" | "onyx" | "deco" | "carrara" | "starburst" | "outrun" | "tiger" | "dazzle" | "arctic" | "nebula" | "aurora" | "phoenix" | "sakura" | "circuit";
  emissive?: string;
  emissiveIntensity?: number;
  description: string;
}

export const LIVERIES: Record<string, LiveryPreset> = {
  // Standard
  stock: {
    id: "stock", name: "Stock Gray", baseColor: "#4a5568", accentColor: "#2d3748", inkColor: "#1a202c",
    finish: "matte", pattern: "solid", description: "Standard tactical gray paint scheme",
  },
  // F-16 special paints
  candy_apple: {
    id: "candy_apple", name: "Candy Apple", baseColor: "#cc0000", accentColor: "#8b0000", inkColor: "#4a0000",
    finish: "gloss", pattern: "candy", emissive: "#ff0000", emissiveIntensity: 0.1, description: "Deep candy apple red with metallic flake",
  },
  pearl_graphite: {
    id: "pearl_graphite", name: "Pearl Graphite", baseColor: "#2d2d2d", accentColor: "#1a1a1a", inkColor: "#0d0d0d",
    finish: "pearl", pattern: "solid", description: "Dark graphite with pearl effect",
  },
  titanium: {
    id: "titanium", name: "Titanium", baseColor: "#8a8a8a", accentColor: "#6b6b6b", inkColor: "#4a4a4a",
    finish: "metal", pattern: "titanium", description: "Brushed titanium finish",
  },
  forged_carbon: {
    id: "forged_carbon", name: "Forged Carbon", baseColor: "#1a1a1a", accentColor: "#0d0d0d", inkColor: "#000000",
    finish: "satin", pattern: "carbon", description: "Forged carbon fiber texture",
  },
  hologram: {
    id: "hologram", name: "Hologram", baseColor: "#4a90d9", accentColor: "#2d6bb5", inkColor: "#1a4a8a",
    finish: "pearl", pattern: "hologram", emissive: "#00d4ff", emissiveIntensity: 0.3, description: "Iridescent holographic effect",
  },
  kintsugi: {
    id: "kintsugi", name: "Kintsugi", baseColor: "#f5e6d3", accentColor: "#d4a574", inkColor: "#8b6914",
    finish: "gloss", pattern: "kintsugi", description: "Japanese gold repair pottery aesthetic",
  },
  onyx_filigree: {
    id: "onyx_filigree", name: "Onyx Filigree", baseColor: "#0d0d0d", accentColor: "#1a1a1a", inkColor: "#c0a060",
    finish: "gloss", pattern: "onyx", description: "Black onyx with gold filigree accents",
  },
  deco: {
    id: "deco", name: "Deco", baseColor: "#1a1a2e", accentColor: "#e94560", inkColor: "#ffd700",
    finish: "gloss", pattern: "deco", description: "Art deco geometric patterns",
  },
  carrara: {
    id: "carrara", name: "Carrara", baseColor: "#f0f0f0", accentColor: "#d4d4d4", inkColor: "#808080",
    finish: "gloss", pattern: "carrara", description: "White Carrara marble effect",
  },
  starburst: {
    id: "starburst", name: "Starburst", baseColor: "#0a0a0a", accentColor: "#ff6600", inkColor: "#ffcc00",
    finish: "metal", pattern: "starburst", emissive: "#ff6600", emissiveIntensity: 0.2, description: "Radiating starburst pattern",
  },
  outrun: {
    id: "outrun", name: "Outrun", baseColor: "#1a0a2e", accentColor: "#ff006e", inkColor: "#00d4ff",
    finish: "gloss", pattern: "outrun", emissive: "#ff006e", emissiveIntensity: 0.3, description: "Synthwave retro-futuristic sunset grid",
  },
  seventies: {
    id: "seventies", name: "Seventies", baseColor: "#c4a35a", accentColor: "#8b4513", inkColor: "#2d1b00",
    finish: "satin", pattern: "solid", description: "1970s earth tone stripes",
  },
  old_tiger: {
    id: "old_tiger", name: "Old Tiger", baseColor: "#2d2d2d", accentColor: "#ff8c00", inkColor: "#000000",
    finish: "matte", pattern: "tiger", description: "Classic tiger meet paint scheme",
  },
  swiss: {
    id: "swiss", name: "Swiss", baseColor: "#ff0000", accentColor: "#ffffff", inkColor: "#000000",
    finish: "gloss", pattern: "deco", description: "Swiss Air Force-inspired red and white",
  },
  bauhaus: {
    id: "bauhaus", name: "Bauhaus", baseColor: "#f0f0f0", accentColor: "#ff0000", inkColor: "#000000",
    finish: "matte", pattern: "deco", description: "Bauhaus geometric primary colors",
  },
  vanguard: {
    id: "vanguard", name: "Vanguard", baseColor: "#1a1a2e", accentColor: "#e94560", inkColor: "#16213e",
    finish: "gloss", pattern: "solid", description: "Dark tactical with red accent",
  },
  spraycan: {
    id: "spraycan", name: "Spraycan", baseColor: "#0d0d0d", accentColor: "#ff00ff", inkColor: "#00ff00",
    finish: "matte", pattern: "dazzle", emissive: "#ff00ff", emissiveIntensity: 0.2, description: "Street art graffiti style",
  },
  dazzle: {
    id: "dazzle", name: "Dazzle", baseColor: "#1a1a1a", accentColor: "#f0f0f0", inkColor: "#808080",
    finish: "matte", pattern: "dazzle", description: "WWI-era dazzle camouflage",
  },
  arctic_flare: {
    id: "arctic_flare", name: "Arctic Flare", baseColor: "#e0e0e0", accentColor: "#ff6600", inkColor: "#2d2d2d",
    finish: "matte", pattern: "solid", description: "Arctic white with high-vis orange",
  },
  ultraviolet: {
    id: "ultraviolet", name: "Ultraviolet", baseColor: "#2d1b4e", accentColor: "#7b2ff7", inkColor: "#00d4ff",
    finish: "pearl", pattern: "hologram", emissive: "#7b2ff7", emissiveIntensity: 0.2, description: "Deep purple with UV-reactive accents",
  },
  tiger_shark: {
    id: "tiger_shark", name: "Tiger Shark", baseColor: "#1a1a2e", accentColor: "#00d4ff", inkColor: "#ffffff",
    finish: "gloss", pattern: "tiger", description: "Shark mouth nose art inspired",
  },
  peregrine: {
    id: "peregrine", name: "Peregrine", baseColor: "#2d2d2d", accentColor: "#c0a060", inkColor: "#1a1a1a",
    finish: "satin", pattern: "solid", description: "Peregrine falcon inspired earth tones",
  },
  glacier: {
    id: "glacier", name: "Glacier", baseColor: "#e8f4f8", accentColor: "#87ceeb", inkColor: "#4a90d9",
    finish: "gloss", pattern: "solid", description: "Glacier ice blue and white",
  },
  // Shop/special
  mirage: {
    id: "mirage", name: "Mirage", baseColor: "#1a1a2e", accentColor: "#ff6600", inkColor: "#00d4ff",
    finish: "pearl", pattern: "hologram", emissive: "#ff6600", emissiveIntensity: 0.25, description: "Heat mirage shimmer effect",
  },
  oil_slick: {
    id: "oil_slick", name: "Oil Slick", baseColor: "#0d0d0d", accentColor: "#1a1a1a", inkColor: "#4a90d9",
    finish: "pearl", pattern: "hologram", emissive: "#4a90d9", emissiveIntensity: 0.15, description: "Rainbow oil slick iridescence",
  },
  night_stalker: {
    id: "night_stalker", name: "Night Stalker", baseColor: "#0a0a0a", accentColor: "#1a1a1a", inkColor: "#000000",
    finish: "matte", pattern: "solid", emissive: "#00ff00", emissiveIntensity: 0.05, description: "Stealth black with NVG-compatible glow",
  },
  desert_aggressor: {
    id: "desert_aggressor", name: "Desert Aggressor", baseColor: "#c4a35a", accentColor: "#8b7355", inkColor: "#4a3a2a",
    finish: "matte", pattern: "dazzle", description: "Desert aggressor camouflage pattern",
  },
  royale: {
    id: "royale", name: "Royale", baseColor: "#1a1a2e", accentColor: "#c9a063", inkColor: "#0d0d0d",
    finish: "gloss", pattern: "solid", description: "Luxurious royal gold accents",
  },
  raven: {
    id: "raven", name: "Raven", baseColor: "#0a0a0a", accentColor: "#1a1a1a", inkColor: "#2d2d2d",
    finish: "satin", pattern: "solid", description: "Deep black raven feather finish",
  },
  ember: {
    id: "ember", name: "Ember", baseColor: "#1a0a0a", accentColor: "#cc3300", inkColor: "#ff6600",
    finish: "metal", pattern: "starburst", emissive: "#ff3300", emissiveIntensity: 0.3, description: "Glowing ember coals effect",
  },
  tide: {
    id: "tide", name: "Tide", baseColor: "#0a2a3a", accentColor: "#00d4ff", inkColor: "#1a5a7a",
    finish: "gloss", pattern: "solid", emissive: "#00d4ff", emissiveIntensity: 0.1, description: "Ocean tide blue gradient",
  },
  lava_flow: {
    id: "lava_flow", name: "Lava Flow", baseColor: "#0a0a0a", accentColor: "#ff3300", inkColor: "#ffcc00",
    finish: "gloss", pattern: "kintsugi", emissive: "#ff3300", emissiveIntensity: 0.4, description: "Volcanic lava cracking through obsidian",
  },
  nebula: {
    id: "nebula", name: "Nebula", baseColor: "#0a0a1a", accentColor: "#7b2ff7", inkColor: "#00d4ff",
    finish: "pearl", pattern: "hologram", emissive: "#7b2ff7", emissiveIntensity: 0.25, description: "Deep space nebula clouds",
  },
  amethyst: {
    id: "amethyst", name: "Amethyst", baseColor: "#4a1a6b", accentColor: "#9b59b6", inkColor: "#2d0a4a",
    finish: "pearl", pattern: "solid", description: "Amethyst crystal purple",
  },
  abyss: {
    id: "abyss", name: "Abyss", baseColor: "#000a1a", accentColor: "#001a3a", inkColor: "#000000",
    finish: "satin", pattern: "solid", emissive: "#001a3a", emissiveIntensity: 0.05, description: "Deep ocean abyss darkness",
  },
  storm_cell: {
    id: "storm_cell", name: "Storm Cell", baseColor: "#1a1a2e", accentColor: "#4a4a6a", inkColor: "#00d4ff",
    finish: "metal", pattern: "dazzle", emissive: "#00d4ff", emissiveIntensity: 0.15, description: "Storm clouds with lightning accents",
  },
  aurora: {
    id: "aurora", name: "Aurora", baseColor: "#0a1a2a", accentColor: "#00ff88", inkColor: "#00d4ff",
    finish: "pearl", pattern: "hologram", emissive: "#00ff88", emissiveIntensity: 0.3, description: "Northern lights aurora borealis",
  },
  glitch: {
    id: "glitch", name: "Glitch", baseColor: "#0a0a0a", accentColor: "#ff006e", inkColor: "#00ff00",
    finish: "gloss", pattern: "dazzle", emissive: "#ff006e", emissiveIntensity: 0.2, description: "Digital glitch art aesthetic",
  },
  neon_drip: {
    id: "neon_drip", name: "Neon Drip", baseColor: "#0a0a0a", accentColor: "#ff00ff", inkColor: "#00ffff",
    finish: "gloss", pattern: "deco", emissive: "#ff00ff", emissiveIntensity: 0.3, description: "Neon paint drip effect",
  },
  koi_tide: {
    id: "koi_tide", name: "Koi Tide", baseColor: "#f0f0f0", accentColor: "#ff6600", inkColor: "#0066cc",
    finish: "gloss", pattern: "deco", description: "Japanese koi fish and water",
  },
  irezumi: {
    id: "irezumi", name: "Irezumi", baseColor: "#0a0a0a", accentColor: "#cc0000", inkColor: "#0066cc",
    finish: "gloss", pattern: "deco", description: "Traditional Japanese tattoo art",
  },
  wyrm: {
    id: "wyrm", name: "Wyrm", baseColor: "#1a0a2e", accentColor: "#00ff88", inkColor: "#000000",
    finish: "gloss", pattern: "kintsugi", emissive: "#00ff88", emissiveIntensity: 0.2, description: "Dragon wyrm scales",
  },
  sakura_storm: {
    id: "sakura_storm", name: "Sakura Storm", baseColor: "#f5e6e8", accentColor: "#ffb7c5", inkColor: "#cc6680",
    finish: "pearl", pattern: "solid", description: "Cherry blossom storm pink",
  },
  phoenix: {
    id: "phoenix", name: "Phoenix", baseColor: "#1a0a0a", accentColor: "#ff6600", inkColor: "#ffcc00",
    finish: "gloss", pattern: "starburst", emissive: "#ff6600", emissiveIntensity: 0.35, description: "Phoenix rising flames",
  },
  comet: {
    id: "comet", name: "Comet", baseColor: "#0a0a1a", accentColor: "#00d4ff", inkColor: "#ffffff",
    finish: "metal", pattern: "starburst", emissive: "#00d4ff", emissiveIntensity: 0.2, description: "Comet tail streaks",
  },
  raijin: {
    id: "raijin", name: "Raijin", baseColor: "#0a0a1a", accentColor: "#ffcc00", inkColor: "#ff0000",
    finish: "gloss", pattern: "dazzle", emissive: "#ffcc00", emissiveIntensity: 0.2, description: "Japanese thunder god lightning",
  },
  circuit: {
    id: "circuit", name: "Circuit", baseColor: "#0a1a0a", accentColor: "#00ff00", inkColor: "#003300",
    finish: "satin", pattern: "deco", emissive: "#00ff00", emissiveIntensity: 0.15, description: "Circuit board trace pattern",
  },
  comic_pop: {
    id: "comic_pop", name: "Comic Pop", baseColor: "#ffffff", accentColor: "#ff006e", inkColor: "#000000",
    finish: "gloss", pattern: "deco", description: "Pop art comic book style",
  },
};

export interface FinishParams {
  color: string;
  metalness: number;
  roughness: number;
  emissive?: string;
  emissiveIntensity?: number;
}

export function getFinishParams(finish: string): FinishParams {
  switch (finish) {
    case "gloss": return { color: "#ffffff", metalness: 0.3, roughness: 0.1 };
    case "satin": return { color: "#ffffff", metalness: 0.4, roughness: 0.4 };
    case "matte": return { color: "#ffffff", metalness: 0.1, roughness: 0.8 };
    case "metal": return { color: "#ffffff", metalness: 0.9, roughness: 0.3 };
    case "pearl": return { color: "#ffffff", metalness: 0.5, roughness: 0.2 };
    case "chrome": return { color: "#ffffff", metalness: 1.0, roughness: 0.05 };
    default: return { color: "#ffffff", metalness: 0.3, roughness: 0.5 };
  }
}

export class LiverySystem {
  private currentLivery: LiveryPreset = LIVERIES.stock;
  private aircraftMesh: THREE.Group | null = null;
  private bodyMaterials: THREE.MeshLambertMaterial[] = [];

  setAircraftMesh(mesh: THREE.Group): void {
    this.aircraftMesh = mesh;
    this.applyLivery(this.currentLivery);
  }

  applyLivery(livery: LiveryPreset): void {
    this.currentLivery = livery;
    if (!this.aircraftMesh) return;

    const finish = getFinishParams(livery.finish);
    const baseColor = new THREE.Color(livery.baseColor);
    const accentColor = new THREE.Color(livery.accentColor);
    const inkColor = new THREE.Color(livery.inkColor);

    // Apply to body materials (skip transparent canopy and engine glow)
    const bodyParts: THREE.Mesh[] = [];
    for (const child of this.aircraftMesh.children) {
      if (child instanceof THREE.Mesh) {
        const mesh = child as THREE.Mesh;
        const mat = mesh.material as THREE.MeshLambertMaterial;
        if (mat && !mat.transparent) {
          bodyParts.push(mesh);
        }
      }
    }

    for (let i = 0; i < bodyParts.length; i++) {
      const mesh = bodyParts[i] as THREE.Mesh;
      const mat = mesh.material as THREE.MeshLambertMaterial;
      
      // Mix colors based on part index
      let color: THREE.Color;
      if (i === 0) {
        // Fuselage — base color
        color = baseColor.clone();
      } else if (i === 1) {
        // Nose — accent
        color = accentColor.clone();
      } else if (i % 3 === 0) {
        color = accentColor.clone().lerp(baseColor, 0.5);
      } else {
        color = baseColor.clone();
      }

      mat.color.copy(color);
      // MeshLambertMaterial doesn't have metalness/roughness — use emissive for effect
      if (livery.finish === "metal" || livery.finish === "chrome") {
        mat.emissive = new THREE.Color(livery.baseColor).multiplyScalar(0.3);
      } else if (livery.finish === "pearl") {
        mat.emissive = new THREE.Color(livery.baseColor).multiplyScalar(0.15);
      }
      
      if (livery.emissive) {
        mat.emissive = new THREE.Color(livery.emissive);
        mat.emissiveIntensity = livery.emissiveIntensity ?? 0.1;
      } else {
        mat.emissive = new THREE.Color(0x000000);
        mat.emissiveIntensity = 0;
      }
    }
  }

  getLivery(): LiveryPreset {
    return this.currentLivery;
  }

  getAvailableLiveries(): LiveryPreset[] {
    return Object.values(LIVERIES);
  }

  getLiveriesByCategory(category: "standard" | "special" | "shop"): LiveryPreset[] {
    const standard = ["stock", "candy_apple", "pearl_graphite", "titanium", "forged_carbon", "hologram", "kintsugi", "onyx_filigree", "deco", "carrara", "starburst", "outrun", "seventies", "old_tiger", "swiss", "bauhaus", "vanguard", "spraycan", "dazzle", "arctic_flare", "ultraviolet", "tiger_shark", "peregrine", "glacier"];
    const shop = ["mirage", "oil_slick", "night_stalker", "desert_aggressor", "royale", "raven", "ember", "tide", "lava_flow", "nebula", "amethyst", "abyss", "storm_cell", "aurora", "glitch", "neon_drip", "koi_tide", "irezumi", "wyrm", "sakura_storm", "phoenix", "comet", "raijin", "circuit", "comic_pop"];
    
    switch (category) {
      case "standard": return standard.map(id => LIVERIES[id]).filter(Boolean);
      case "special": return standard.map(id => LIVERIES[id]).filter(Boolean);
      case "shop": return shop.map(id => LIVERIES[id]).filter(Boolean);
      default: return [];
    }
  }
}

// LIVERIES is already exported above
