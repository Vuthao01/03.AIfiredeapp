/**
 * AIfirede - Fire Detection Engine v2.0
 * Advanced fire/smoke detection with:
 * - Multi-rule HSV fire detection with skin-tone rejection
 * - Flickering analysis (real fire flickers, static objects don't)
 * - Background learning for smoke (only detect NEW gray areas)
 * - Temporal confirmation (require N consecutive frames before alert)
 * - Dynamic motion-correlated detection
 */

class FireDetector {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.prevFrame = null;
    this.prevPrevFrame = null;
    this.backgroundModel = null;
    this.backgroundFrameCount = 0;
    this.backgroundLearningFrames = 60; // Learn background for first 60 frames (~2-3 sec)
    this.detectionHistory = [];
    this.maxHistory = 60;

    // Temporal confirmation buffers
    this._fireFrameBuffer = []; // track fire confidence per-frame
    this._smokeFrameBuffer = [];
    this._bufferSize = 15; // ~0.5 sec at 30fps
    this._fireConfirmThreshold = 8;  // need 8/15 frames with fire to confirm
    this._smokeConfirmThreshold = 10; // need 10/15 frames with smoke to confirm

    // Flickering analysis
    this._intensityHistory = []; // per-region intensity tracking
    this._flickerWindowSize = 20;

    // Grid for region-based fire detection history (for static object rejection)
    this._gridFirePersistence = null;
    this._gridSize = { cols: 10, rows: 8 };

    // Detection thresholds (tuned to reduce false positives)
    this.settings = {
      // Fire detection - stricter HSV rules
      fireHueMin: 0,
      fireHueMax: 35,        // Narrower: only red-orange-yellow
      fireSatMin: 130,        // Higher saturation required (was 100)
      fireValMin: 180,        // Brighter pixels only (was 150)
      fireRedMin: 150,        // Red channel minimum (was 120)

      // Smoke detection - much stricter
      smokeMinGray: 100,      // Higher minimum (was 80)
      smokeMaxGray: 190,      // Narrower range (was 200)
      smokeSatMax: 20,        // Lower max saturation (was 30)
      smokeGrayTolerance: 15, // Tighter gray check (was 25)

      // Motion
      motionThreshold: 35,    // Higher threshold (was 30)

      // Pixel ratios - much higher thresholds
      firePixelThreshold: 0.015,   // 1.5% of pixels needed (was 0.5%)
      smokePixelThreshold: 0.06,   // 6% of pixels needed (was 2%)
      motionPixelThreshold: 0.04,

      // Detection confidence thresholds
      fireConfidenceMin: 50,       // Min confidence to trigger (was 30)
      smokeConfidenceMin: 45,      // Min confidence to trigger (was 25)

      // Smoothing
      confidenceSmoothing: 0.8,    // Higher = more smoothing, less jitter (was 0.7)
      analysisScale: 0.2,          // Slightly smaller for speed (was 0.25)

      // Skin tone rejection
      skinToneReject: true,

      // Static object rejection
      staticRejectFrames: 90,      // If fire-colored region doesn't change in 90 frames, ignore it
    };

    this.lastResult = {
      fire: { detected: false, confidence: 0, confirmed: false, regions: [] },
      smoke: { detected: false, confidence: 0, confirmed: false, regions: [] },
      motion: { detected: false, level: 0 },
      overallRisk: 0,
      temperature: 28, // Default 28°C
      timestamp: Date.now()
    };
  }

  /**
   * Analyze a video frame for fire and smoke
   */
  analyze(source) {
    if (!source || (source.tagName === 'VIDEO' && source.readyState < 2)) {
      return this.lastResult;
    }

    const width = Math.floor((source.videoWidth || source.width) * this.settings.analysisScale);
    const height = Math.floor((source.videoHeight || source.height) * this.settings.analysisScale);
    if (width <= 0 || height <= 0) return this.lastResult;

    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.drawImage(source, 0, 0, width, height);

    let imageData;
    try {
      imageData = this.ctx.getImageData(0, 0, width, height);
    } catch (e) {
      return this.lastResult;
    }

    const pixels = imageData.data;
    const totalPixels = width * height;

    // === PHASE 1: Learn background model (first N frames) ===
    this._updateBackgroundModel(pixels, totalPixels);

    // === PHASE 2: Motion detection (needed for smoke validation) ===
    const motionResult = this._detectMotion(pixels, totalPixels, width, height);

    // === PHASE 3: Fire detection with multi-rule filtering ===
    const fireResult = this._detectFire(pixels, totalPixels, width, height, motionResult);

    // === PHASE 4: Smoke detection with background subtraction ===
    const smokeResult = this._detectSmoke(pixels, totalPixels, width, height, motionResult);

    // === PHASE 5: Temporal confirmation ===
    const fireConfirmed = this._temporalConfirm(
      this._fireFrameBuffer, fireResult.rawConfidence, this._fireConfirmThreshold
    );
    const smokeConfirmed = this._temporalConfirm(
      this._smokeFrameBuffer, smokeResult.rawConfidence, this._smokeConfirmThreshold
    );

    // Store frames
    this.prevPrevFrame = this.prevFrame;
    this.prevFrame = new Uint8ClampedArray(pixels);

    // === PHASE 6: Calculate Temperature ===
    const currentTemp = this._estimateTemperature(fireConfirmed, fireResult, this.lastResult.temperature);

    // === PHASE 7: Calculate overall risk ===
    // Only use confirmed detections for risk score
    const fireConf = fireConfirmed ? fireResult.confidence : fireResult.confidence * 0.2;
    const smokeConf = smokeConfirmed ? smokeResult.confidence : smokeResult.confidence * 0.15;
    const motionBonus = motionResult.level > 20 ? motionResult.level * 0.05 : 0;

    // Heat penalty - High heat adds heavily to risk
    const heatRisk = Math.max(0, (currentTemp - 45) / 2);

    const rawRisk = Math.min(100, fireConf * 0.65 + smokeConf * 0.25 + motionBonus + heatRisk);

    const smoothedRisk = this.lastResult.overallRisk * this.settings.confidenceSmoothing +
      rawRisk * (1 - this.settings.confidenceSmoothing);

    const result = {
      fire: {
        detected: fireConfirmed && fireResult.confidence >= this.settings.fireConfidenceMin,
        confidence: Math.round(fireResult.confidence),
        confirmed: fireConfirmed,
        regions: fireResult.regions,
        pixelRatio: fireResult.pixelRatio
      },
      smoke: {
        detected: smokeConfirmed && smokeResult.confidence >= this.settings.smokeConfidenceMin,
        confidence: Math.round(smokeResult.confidence),
        confirmed: smokeConfirmed,
        regions: smokeResult.regions,
        pixelRatio: smokeResult.pixelRatio
      },
      motion: {
        detected: motionResult.level > 15,
        level: Math.round(motionResult.level)
      },
      overallRisk: Math.round(smoothedRisk),
      temperature: Math.round(currentTemp),
      timestamp: Date.now()
    };

    this.detectionHistory.push(result);
    if (this.detectionHistory.length > this.maxHistory) {
      this.detectionHistory.shift();
    }

    this.lastResult = result;
    return result;
  }

  // ===========================================================================
  // FIRE DETECTION v2 - with skin rejection, flickering, static rejection
  // ===========================================================================
  _detectFire(pixels, totalPixels, width, height, motionResult) {
    let firePixels = 0;
    const cols = this._gridSize.cols;
    const rows = this._gridSize.rows;
    const cellW = Math.floor(width / cols);
    const cellH = Math.floor(height / rows);
    const gridCounts = new Array(cols * rows).fill(0);
    const gridTotals = new Array(cols * rows).fill(0);

    // Initialize persistence grid
    if (!this._gridFirePersistence) {
      this._gridFirePersistence = new Array(cols * rows).fill(0);
    }

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];

      const pixelIdx = i / 4;
      const px = pixelIdx % width;
      const py = Math.floor(pixelIdx / width);
      const gx = Math.min(Math.floor(px / cellW), cols - 1);
      const gy = Math.min(Math.floor(py / cellH), rows - 1);
      const gi = gy * cols + gx;
      gridTotals[gi]++;

      // === RULE 1: Fire color in HSV ===
      const hsv = this._rgbToHsv(r, g, b);
      const h = hsv[0], s = hsv[1], v = hsv[2];

      const isFireHue = (h <= this.settings.fireHueMax) || (h >= 345);
      const isFireSat = s >= this.settings.fireSatMin;
      const isFireVal = v >= this.settings.fireValMin;

      if (!isFireHue || !isFireSat || !isFireVal) continue;

      // === RULE 2: RGB channel rules (fire has R >> G > B) ===
      if (r < this.settings.fireRedMin) continue;
      if (r <= g) continue;         // Red must be dominant
      if (g <= b) continue;         // Green must be > blue for fire
      if (r - b < 80) continue;     // Need significant red-blue gap
      if (r - g < 30) continue;     // Need some red-green gap

      // === RULE 3: Skin tone rejection ===
      if (this.settings.skinToneReject && this._isSkinTone(r, g, b, h, s, v)) {
        continue;
      }

      // === RULE 4: Very bright white/yellow rejection (overhead lights) ===
      if (r > 240 && g > 220 && b > 180) continue; // Too white/bright

      // Passed all filters
      firePixels++;
      gridCounts[gi]++;
    }

    const pixelRatio = firePixels / totalPixels;
    let confidence = 0;

    if (pixelRatio > this.settings.firePixelThreshold) {
      // Base confidence from pixel coverage
      confidence = Math.min(80, (pixelRatio / 0.08) * 60);

      // === BOOST: Spatial concentration ===
      const maxGridRatio = Math.max(...gridCounts.map((c, i) => gridTotals[i] > 0 ? c / gridTotals[i] : 0));
      if (maxGridRatio > 0.15) {
        confidence += 10;
      }

      // === BOOST: Motion correlation (real fire areas have motion) ===
      if (motionResult.level > 15) {
        confidence += 8;
      } else {
        // No motion = probably not real fire → penalize heavily
        confidence *= 0.4;
      }

      // === PENALTY: Static object rejection ===
      // If fire-colored pixels persist in the SAME grid cells for too long, it's static
      let staticCells = 0;
      let activeCells = 0;
      for (let gi = 0; gi < cols * rows; gi++) {
        const ratio = gridTotals[gi] > 0 ? gridCounts[gi] / gridTotals[gi] : 0;
        if (ratio > 0.05) {
          activeCells++;
          this._gridFirePersistence[gi]++;
          if (this._gridFirePersistence[gi] > this.settings.staticRejectFrames) {
            staticCells++;
          }
        } else {
          // Decay persistence
          this._gridFirePersistence[gi] = Math.max(0, this._gridFirePersistence[gi] - 2);
        }
      }

      // If most fire cells are static (persistent), reduce confidence
      if (activeCells > 0 && staticCells / activeCells > 0.7) {
        confidence *= 0.15; // Heavily penalize static "fire"
      }

      // === BOOST: Flickering detection ===
      const flickerScore = this._detectFlickering(pixelRatio);
      if (flickerScore > 0.3) {
        confidence += 15; // Real fire flickers
      }

      confidence = Math.min(100, Math.max(0, confidence));
    }

    const regions = this._findRegions(gridCounts, gridTotals, cols, rows, cellW, cellH, 0.12, width, height);

    return { confidence, rawConfidence: confidence, pixelRatio, regions };
  }

  // ===========================================================================
  // SMOKE DETECTION v2 - with background subtraction & motion correlation
  // ===========================================================================
  _detectSmoke(pixels, totalPixels, width, height, motionResult) {
    // Don't detect smoke during background learning phase
    if (this.backgroundFrameCount < this.backgroundLearningFrames) {
      return { confidence: 0, rawConfidence: 0, pixelRatio: 0, regions: [] };
    }

    let smokePixels = 0;
    let newSmokePixels = 0; // Pixels that are gray NOW but weren't in background
    const cols = this._gridSize.cols;
    const rows = this._gridSize.rows;
    const cellW = Math.floor(width / cols);
    const cellH = Math.floor(height / rows);
    const gridCounts = new Array(cols * rows).fill(0);
    const gridTotals = new Array(cols * rows).fill(0);

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];

      const pixelIdx = i / 4;
      const px = pixelIdx % width;
      const py = Math.floor(pixelIdx / width);
      const gx = Math.min(Math.floor(px / cellW), cols - 1);
      const gy = Math.min(Math.floor(py / cellH), rows - 1);
      const gi = gy * cols + gx;
      gridTotals[gi]++;

      // === RULE 1: Current pixel is grayish ===
      const avg = (r + g + b) / 3;
      const tol = this.settings.smokeGrayTolerance;
      const isGray = Math.abs(r - avg) < tol && Math.abs(g - avg) < tol && Math.abs(b - avg) < tol;
      const isInRange = avg >= this.settings.smokeMinGray && avg <= this.settings.smokeMaxGray;

      const hsv = this._rgbToHsv(r, g, b);
      const isLowSat = hsv[1] <= this.settings.smokeSatMax;

      if (!isGray || !isInRange || !isLowSat) continue;

      smokePixels++;

      // === RULE 2: Background subtraction - was this pixel gray in background too? ===
      if (this.backgroundModel) {
        const bgR = this.backgroundModel[i];
        const bgG = this.backgroundModel[i + 1];
        const bgB = this.backgroundModel[i + 2];
        const bgAvg = (bgR + bgG + bgB) / 3;
        const bgIsGray = Math.abs(bgR - bgAvg) < tol && Math.abs(bgG - bgAvg) < tol && Math.abs(bgB - bgAvg) < tol;
        const bgInRange = bgAvg >= this.settings.smokeMinGray && bgAvg <= this.settings.smokeMaxGray;

        if (bgIsGray && bgInRange) {
          // This pixel was ALREADY gray in background → NOT new smoke
          continue;
        }

        // Check significant brightness change from background
        const brightDiff = Math.abs(avg - bgAvg);
        if (brightDiff < 20) {
          // Too similar to background → skip
          continue;
        }
      }

      // This pixel is NEW smoke (not in background)
      newSmokePixels++;
      gridCounts[gi]++;
    }

    const pixelRatio = newSmokePixels / totalPixels;
    let confidence = 0;

    if (pixelRatio > this.settings.smokePixelThreshold) {
      // Base confidence
      confidence = Math.min(70, (pixelRatio / 0.15) * 45);

      // === BOOST: Smoke in upper portion ===
      const upperRows = Math.ceil(rows / 3);
      let upperSmoke = 0, upperTotal = 0;
      for (let gy = 0; gy < upperRows; gy++) {
        for (let gx = 0; gx < cols; gx++) {
          upperSmoke += gridCounts[gy * cols + gx];
          upperTotal += gridTotals[gy * cols + gx];
        }
      }
      if (upperTotal > 0 && (upperSmoke / upperTotal) > 0.08) {
        confidence += 15;
      }

      // === BOOST: Motion correlation (smoke = moving gray mass) ===
      if (motionResult.level > 10) {
        confidence += 10;
      } else {
        // No motion = probably static gray surfaces → penalize
        confidence *= 0.3;
      }

      // === BOOST: Spreading check (smoke area grows over time) ===
      const prevSmokeRatio = this.lastResult.smoke.pixelRatio || 0;
      if (pixelRatio > prevSmokeRatio * 1.1) {
        confidence += 5; // Growing = more likely real smoke
      }

      confidence = Math.min(100, Math.max(0, confidence));
    }

    const regions = this._findRegions(gridCounts, gridTotals, cols, rows, cellW, cellH, 0.10, width, height);

    return { confidence, rawConfidence: confidence, pixelRatio, regions };
  }

  // ===========================================================================
  // MOTION DETECTION - per-grid with magnitude
  // ===========================================================================
  _detectMotion(pixels, totalPixels, width, height) {
    if (!this.prevFrame) {
      return { level: 0, gridMotion: null };
    }

    let motionPixels = 0;
    const cols = this._gridSize.cols;
    const rows = this._gridSize.rows;
    const cellW = Math.floor(width / cols);
    const cellH = Math.floor(height / rows);
    const gridMotion = new Array(cols * rows).fill(0);
    const gridTotal = new Array(cols * rows).fill(0);

    // Sample every 2nd pixel for speed
    for (let i = 0; i < pixels.length; i += 8) {
      const diff = Math.abs(pixels[i] - this.prevFrame[i]) +
        Math.abs(pixels[i + 1] - this.prevFrame[i + 1]) +
        Math.abs(pixels[i + 2] - this.prevFrame[i + 2]);

      const pixelIdx = i / 4;
      const px = pixelIdx % width;
      const py = Math.floor(pixelIdx / width);
      const gx = Math.min(Math.floor(px / cellW), cols - 1);
      const gy = Math.min(Math.floor(py / cellH), rows - 1);
      const gi = gy * cols + gx;
      gridTotal[gi]++;

      if (diff > this.settings.motionThreshold * 3) {
        motionPixels++;
        gridMotion[gi]++;
      }
    }

    const sampledPixels = Math.ceil(totalPixels / 2);
    const motionRatio = motionPixels / sampledPixels;
    const level = Math.min(100, (motionRatio / this.settings.motionPixelThreshold) * 50);

    return { level, gridMotion, gridTotal };
  }

  // ===========================================================================
  // SKIN TONE REJECTION
  // ===========================================================================
  _isSkinTone(r, g, b, h, s, v) {
    // Multiple skin tone detection rules:

    // Rule 1: HSV-based skin detection
    // Skin hue: 0-50, saturation: 50-170, value: 100-255
    if (h >= 0 && h <= 50 && s >= 40 && s <= 170 && v >= 100) {
      // Additional RGB checks for skin
      if (r > 95 && g > 40 && b > 20) {
        if (r > g && r > b) {
          if (Math.abs(r - g) > 15) {
            // Check skin-specific ratios
            const rgRatio = r / (g + 1);
            const rbRatio = r / (b + 1);
            if (rgRatio > 1.05 && rgRatio < 1.8 && rbRatio > 1.2 && rbRatio < 3.5) {
              return true;
            }
          }
        }
      }
    }

    // Rule 2: YCbCr-based (more robust)
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const cb = 128 - 0.169 * r - 0.331 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.419 * g - 0.081 * b;
    if (cr > 133 && cr < 173 && cb > 77 && cb < 127 && y > 80) {
      return true;
    }

    return false;
  }

  // ===========================================================================
  // FLICKERING DETECTION (real fire flickers in intensity)
  // ===========================================================================
  _detectFlickering(currentFireRatio) {
    this._intensityHistory.push(currentFireRatio);
    if (this._intensityHistory.length > this._flickerWindowSize) {
      this._intensityHistory.shift();
    }

    if (this._intensityHistory.length < 10) return 0;

    // Calculate variance of fire pixel ratio over time
    const mean = this._intensityHistory.reduce((a, b) => a + b, 0) / this._intensityHistory.length;
    if (mean < 0.005) return 0; // Too little fire to analyze

    const variance = this._intensityHistory.reduce((a, b) => a + (b - mean) ** 2, 0) / this._intensityHistory.length;
    const cv = Math.sqrt(variance) / (mean + 0.0001); // Coefficient of variation

    // Real fire has CV between 0.1 and 0.8 (moderate flickering)
    // Static objects have CV ~ 0 (no change)
    // Random noise has very high CV
    if (cv >= 0.08 && cv <= 0.9) {
      return Math.min(1, cv * 2);
    }

    return 0;
  }

  // ===========================================================================
  // TEMPORAL CONFIRMATION
  // ===========================================================================
  _temporalConfirm(buffer, confidence, threshold) {
    buffer.push(confidence > 25 ? 1 : 0);
    if (buffer.length > this._bufferSize) {
      buffer.shift();
    }

    if (buffer.length < this._bufferSize) return false;

    const positiveFrames = buffer.reduce((a, b) => a + b, 0);
    return positiveFrames >= threshold;
  }

  // ===========================================================================
  // BACKGROUND MODEL (adaptive)
  // ===========================================================================
  _updateBackgroundModel(pixels, totalPixels) {
    this.backgroundFrameCount++;

    if (!this.backgroundModel) {
      // First frame → initialize
      this.backgroundModel = new Float32Array(pixels.length);
      for (let i = 0; i < pixels.length; i++) {
        this.backgroundModel[i] = pixels[i];
      }
      return;
    }

    // Exponential moving average for background
    // Fast learning during initial phase, slow adaptation after
    const alpha = this.backgroundFrameCount <= this.backgroundLearningFrames ? 0.1 : 0.002;

    for (let i = 0; i < pixels.length; i += 4) {
      this.backgroundModel[i] = this.backgroundModel[i] * (1 - alpha) + pixels[i] * alpha;
      this.backgroundModel[i + 1] = this.backgroundModel[i + 1] * (1 - alpha) + pixels[i + 1] * alpha;
      this.backgroundModel[i + 2] = this.backgroundModel[i + 2] * (1 - alpha) + pixels[i + 2] * alpha;
    }
  }

  // ===========================================================================
  // HELPER: Find regions from grid
  // ===========================================================================
  _findRegions(gridCounts, gridTotals, gridCols, gridRows, cellW, cellH, threshold, frameW, frameH) {
    const regions = [];
    const scale = 1 / this.settings.analysisScale;

    for (let gy = 0; gy < gridRows; gy++) {
      for (let gx = 0; gx < gridCols; gx++) {
        const gi = gy * gridCols + gx;
        if (gridTotals[gi] > 0 && (gridCounts[gi] / gridTotals[gi]) > threshold) {
          regions.push({
            x: (gx * cellW * scale) / (frameW * scale),
            y: (gy * cellH * scale) / (frameH * scale),
            w: (cellW * scale) / (frameW * scale),
            h: (cellH * scale) / (frameH * scale),
            intensity: gridCounts[gi] / gridTotals[gi]
          });
        }
      }
    }

    return this._mergeRegions(regions);
  }

  /**
   * Merge overlapping or adjacent regions
   */
  _mergeRegions(regions) {
    if (regions.length <= 1) return regions;

    const merged = [];
    const used = new Set();

    for (let i = 0; i < regions.length; i++) {
      if (used.has(i)) continue;
      let r = { ...regions[i] };

      for (let j = i + 1; j < regions.length; j++) {
        if (used.has(j)) continue;
        const r2 = regions[j];
        if (Math.abs(r.x - r2.x) <= r.w * 1.5 && Math.abs(r.y - r2.y) <= r.h * 1.5) {
          const newX = Math.min(r.x, r2.x);
          const newY = Math.min(r.y, r2.y);
          r = {
            x: newX,
            y: newY,
            w: Math.max(r.x + r.w, r2.x + r2.w) - newX,
            h: Math.max(r.y + r.h, r2.y + r2.h) - newY,
            intensity: Math.max(r.intensity, r2.intensity)
          };
          used.add(j);
        }
      }
      merged.push(r);
    }

    return merged.slice(0, 5);
  }

  /**
   * Convert RGB to HSV
   */
  _rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;

    let h = 0;
    if (d !== 0) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h = Math.round(h * 60);
      if (h < 0) h += 360;
    }

    const s = max === 0 ? 0 : Math.round((d / max) * 255);
    const v = Math.round(max * 255);
    return [h, s, v];
  }

  // ===========================================================================
  // SIMULATE THERMAL SENSOR DATA
  // ===========================================================================
  _estimateTemperature(fireConfirmed, fireResult, lastTemp) {
    if (isNaN(lastTemp)) lastTemp = 28;
    
    // Normal ambient variation (25 - 30 deg)
    const baseAmbient = 28 + Math.sin(Date.now() / 5000) * 1.5;
    
    let targetTemp = baseAmbient;

    if (fireConfirmed && fireResult.pixelRatio > 0.01) {
      // Heat generation grows exponentially with fire area size and confidence
      // If pixel ratio is 5% (~0.05), we estimate large fire -> ~600 C
      const areaSeverity = Math.min(10, fireResult.pixelRatio / 0.01); // 1 = small, 10 = massive
      
      const fireHeat = 50 + (areaSeverity * areaSeverity * 6); // Ranging from 56°C to 650°C
      const confMult = fireResult.confidence / 100;

      targetTemp = Math.max(targetTemp, fireHeat * confMult);
    }

    // Smooth temperature changes (thermal inertia)
    let currentTemp = lastTemp;
    if (targetTemp > currentTemp) { // Heats up reasonably fast
      currentTemp += (targetTemp - currentTemp) * 0.035; 
    } else { // Cools down slowly
      currentTemp -= (currentTemp - targetTemp) * 0.015; 
    }

    // Keep within bounds
    return Math.max(10, Math.min(850, currentTemp));
  }

  /**
   * Get risk level string
   */
  getRiskLevel(risk) {
    if (risk >= 70) return { level: 'critical', label: 'NGUY HIỂM', color: '#ef4444' };
    if (risk >= 45) return { level: 'warning', label: 'CẢNH BÁO', color: '#f59e0b' };
    if (risk >= 20) return { level: 'caution', label: 'CHÚ Ý', color: '#3b82f6' };
    return { level: 'safe', label: 'AN TOÀN', color: '#10b981' };
  }

  /**
   * Update detection settings
   */
  updateSettings(newSettings) {
    Object.assign(this.settings, newSettings);
  }

  /**
   * Reset background model (call when camera changes)
   */
  resetBackground() {
    this.backgroundModel = null;
    this.backgroundFrameCount = 0;
    this._gridFirePersistence = null;
    this._intensityHistory = [];
    this._fireFrameBuffer = [];
    this._smokeFrameBuffer = [];
    this.prevFrame = null;
    this.prevPrevFrame = null;
  }

  /**
   * Get detection statistics
   */
  getStats() {
    if (this.detectionHistory.length === 0) return null;

    const fireDetections = this.detectionHistory.filter(r => r.fire.detected).length;
    const smokeDetections = this.detectionHistory.filter(r => r.smoke.detected).length;
    const avgRisk = this.detectionHistory.reduce((a, r) => a + r.overallRisk, 0) / this.detectionHistory.length;

    return {
      totalFrames: this.detectionHistory.length,
      fireDetections,
      smokeDetections,
      avgRisk: Math.round(avgRisk),
      fireRate: Math.round((fireDetections / this.detectionHistory.length) * 100),
      smokeRate: Math.round((smokeDetections / this.detectionHistory.length) * 100),
      backgroundReady: this.backgroundFrameCount >= this.backgroundLearningFrames
    };
  }
}

window.FireDetector = FireDetector;
