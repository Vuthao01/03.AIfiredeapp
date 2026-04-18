/**
 * AIfirede - Camera Manager
 * Handles webcam access, simulated cameras, and camera grid display
 */

class CameraManager {
  constructor() {
    this.cameras = [];
    this.activeStream = null;
    this.gridLayout = '2x2';
    this.isRecording = false;
    this.onCameraUpdate = null;
    
    // Initialize simulated camera data
    this._initializeCameras();
  }

  _initializeCameras() {
    this.cameras = [
      { 
        id: 'cam-1', 
        name: 'Sảnh chính - Tầng 1', 
        location: 'Tầng 1 - Khu A',
        type: 'webcam',
        status: 'online',
        recording: true,
        hasAI: true,
        stream: null,
        videoElement: null,
        lastDetection: null
      },
      { 
        id: 'cam-2', 
        name: 'Kho hàng B2', 
        location: 'Tầng hầm - Khu B',
        type: 'simulated',
        status: 'online',
        recording: true,
        hasAI: true,
        stream: null,
        videoElement: null,
        lastDetection: null
      },
      { 
        id: 'cam-3', 
        name: 'Phòng Server', 
        location: 'Tầng 3 - Khu C',
        type: 'simulated',
        status: 'online',
        recording: true,
        hasAI: true,
        stream: null,
        videoElement: null,
        lastDetection: null
      },
      { 
        id: 'cam-4', 
        name: 'Bãi xe ngoài trời', 
        location: 'Ngoài trời - Khu D',
        type: 'simulated',
        status: 'online',
        recording: false,
        hasAI: true,
        stream: null,
        videoElement: null,
        lastDetection: null
      },
      { 
        id: 'cam-5', 
        name: 'Hành lang tầng 2', 
        location: 'Tầng 2 - Khu A',
        type: 'simulated',
        status: 'online',
        recording: true,
        hasAI: false,
        stream: null,
        videoElement: null,
        lastDetection: null
      },
      { 
        id: 'cam-6', 
        name: 'Phòng điện', 
        location: 'Tầng 1 - Khu C',
        type: 'simulated',
        status: 'offline',
        recording: false,
        hasAI: true,
        stream: null,
        videoElement: null,
        lastDetection: null
      },
      { 
        id: 'cam-7', 
        name: 'Nhà bếp', 
        location: 'Tầng 1 - Khu B',
        type: 'simulated',
        status: 'online',
        recording: true,
        hasAI: true,
        stream: null,
        videoElement: null,
        lastDetection: null
      },
      { 
        id: 'cam-8', 
        name: 'Cầu thang thoát hiểm', 
        location: 'Tầng 1-5 - Khu A',
        type: 'simulated',
        status: 'online',
        recording: true,
        hasAI: false,
        stream: null,
        videoElement: null,
        lastDetection: null
      },
      { 
        id: 'cam-9', 
        name: 'Sân thượng', 
        location: 'Tầng 5 - Mái',
        type: 'simulated',
        status: 'maintenance',
        recording: false,
        hasAI: false,
        stream: null,
        videoElement: null,
        lastDetection: null
      }
    ];
  }

  /**
   * Start webcam for the first camera
   */
  async startWebcam(videoElement) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'environment' },
        audio: false
      });
      
      videoElement.srcObject = stream;
      await videoElement.play();
      
      this.activeStream = stream;
      this.cameras[0].stream = stream;
      this.cameras[0].videoElement = videoElement;
      this.cameras[0].status = 'online';
      
      return true;
    } catch (err) {
      console.warn('Webcam access denied:', err.message);
      this.cameras[0].status = 'offline';
      return false;
    }
  }

  /**
   * Create a simulated camera feed using canvas animation
   */
  createSimulatedFeed(canvasElement, cameraId) {
    const cam = this.cameras.find(c => c.id === cameraId);
    if (!cam || cam.status === 'offline' || cam.status === 'maintenance') return null;

    const ctx = canvasElement.getContext('2d');
    canvasElement.width = 640;
    canvasElement.height = 480;

    const renderFrame = () => {
      if (cam.status !== 'online') return;
      
      this._drawSimulatedScene(ctx, cam, canvasElement.width, canvasElement.height);
      cam._animFrame = requestAnimationFrame(renderFrame);
    };

    cam.videoElement = canvasElement;
    renderFrame();
    return canvasElement;
  }

  /**
   * Draw a simulated security camera scene
   */
  _drawSimulatedScene(ctx, cam, w, h) {
    const t = Date.now() * 0.001;

    // Dark background with slight noise
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    // Grid floor lines
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i < w; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, h);
      ctx.stroke();
    }
    for (let i = 0; i < h; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(w, i);
      ctx.stroke();
    }

    // Scene-specific elements based on camera name
    const seed = cam.id.charCodeAt(cam.id.length - 1);
    
    // Simulated structures (walls, furniture)
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(50, h * 0.3, w * 0.3, h * 0.5);
    ctx.fillRect(w * 0.6, h * 0.2, w * 0.25, h * 0.6);

    // Simulated light sources
    const gradient = ctx.createRadialGradient(
      w * 0.3 + Math.sin(t * 0.5) * 20, h * 0.2, 10,
      w * 0.3, h * 0.2, 150
    );
    gradient.addColorStop(0, 'rgba(255, 200, 100, 0.08)');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Moving object simulation (person/shadow)
    const objX = (w * 0.3 + Math.sin(t * 0.3 + seed) * w * 0.25);
    const objY = h * 0.55 + Math.sin(t * 0.5 + seed) * 20;
    
    ctx.fillStyle = 'rgba(100, 120, 160, 0.15)';
    ctx.beginPath();
    ctx.ellipse(objX, objY + 30, 15, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(80, 100, 140, 0.3)';
    ctx.fillRect(objX - 8, objY - 25, 16, 40);
    ctx.beginPath();
    ctx.arc(objX, objY - 30, 10, 0, Math.PI * 2);
    ctx.fill();

    // Noise effect
    const noiseData = ctx.getImageData(0, 0, w, h);
    const pixels = noiseData.data;
    for (let i = 0; i < pixels.length; i += 40) {
      const noise = (Math.random() - 0.5) * 8;
      pixels[i] += noise;
      pixels[i + 1] += noise;
      pixels[i + 2] += noise;
    }
    ctx.putImageData(noiseData, 0, 0);

    // Timestamp overlay
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN');
    const dateStr = now.toLocaleDateString('vi-VN');
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillText(`${dateStr} ${timeStr}`, 10, h - 10);
    ctx.fillText(cam.name, w - ctx.measureText(cam.name).width - 10, h - 10);
  }

  /**
   * Render camera grid in a container
   */
  renderCameraGrid(container, layout = '2x2', onCameraClick = null) {
    container.innerHTML = '';
    
    const visibleCameras = layout === '1x1' ? this.cameras.slice(0, 1) :
                           layout === '2x2' ? this.cameras.slice(0, 4) :
                           this.cameras;

    container.className = `camera-page-grid layout-${layout}`;

    visibleCameras.forEach((cam, idx) => {
      const feed = this._createCameraFeedElement(cam, idx);
      if (onCameraClick) {
        feed.addEventListener('click', () => onCameraClick(cam));
      }
      container.appendChild(feed);

      // Start simulated feeds
      if (cam.type === 'simulated' && cam.status === 'online') {
        const canvas = feed.querySelector('canvas');
        if (canvas) {
          this.createSimulatedFeed(canvas, cam.id);
        }
      }
    });
  }

  /**
   * Create a camera feed DOM element
   */
  _createCameraFeedElement(cam) {
    const div = document.createElement('div');
    div.className = `camera-feed ${cam.status !== 'online' ? '' : ''}`; 
    div.dataset.cameraId = cam.id;

    if (cam.status === 'offline' || cam.status === 'maintenance') {
      div.innerHTML = `
        <div class="camera-placeholder">
          <i class="fas ${cam.status === 'offline' ? 'fa-video-slash' : 'fa-wrench'}"></i>
          <span>${cam.name}</span>
          <span style="font-size:0.7rem;color:var(--text-dim)">${cam.status === 'offline' ? 'Mất kết nối' : 'Đang bảo trì'}</span>
        </div>
        <div class="camera-label">
          <span>${cam.name}</span>
        </div>
      `;
      return div;
    }

    const mediaEl = cam.type === 'webcam' 
      ? `<video id="video-${cam.id}" autoplay playsinline muted></video>`
      : `<canvas id="canvas-${cam.id}"></canvas>`;

    div.innerHTML = `
      ${mediaEl}
      <div class="camera-overlay">
        <div class="camera-label">
          <span class="live-dot"></span>
          <span>${cam.name}</span>
        </div>
        <div class="camera-status">
          ${cam.recording ? '<span class="cam-badge recording"><i class="fas fa-circle" style="font-size:6px"></i> REC</span>' : ''}
          ${cam.hasAI ? '<span class="cam-badge"><i class="fas fa-brain"></i> AI</span>' : ''}
          ${cam.hasAI ? `<span class="cam-badge temp-badge" id="temp-badge-${cam.id}"><i class="fas fa-thermometer-half"></i> 28°C</span>` : ''}
        </div>
        <div class="camera-ai-overlay" id="ai-overlay-${cam.id}">
          <div class="ai-status">
            <i class="fas fa-shield-alt"></i>
            <span id="ai-status-text-${cam.id}">Đang phân tích...</span>
          </div>
          <div class="confidence-bar">
            <div class="confidence-fill safe" id="confidence-bar-${cam.id}" style="width: 0%"></div>
          </div>
        </div>
      </div>
      <div id="detection-boxes-${cam.id}" style="position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none"></div>
    `;

    return div;
  }

  /**
   * Render single camera for dashboard preview
   */
  renderDashboardCamera(container) {
    const cam = this.cameras[0];
    container.innerHTML = '';

    const feed = document.createElement('div');
    feed.className = 'camera-feed';
    feed.style.aspectRatio = 'auto';
    feed.style.height = '100%';

    if (cam.type === 'webcam') {
      feed.innerHTML = `
        <video id="dashboard-video" autoplay playsinline muted style="width:100%;height:100%;object-fit:cover"></video>
        <div class="camera-overlay">
          <div class="camera-label">
            <span class="live-dot"></span>
            <span>${cam.name}</span>
          </div>
          <div class="camera-status">
            <span class="cam-badge recording"><i class="fas fa-circle" style="font-size:6px"></i> LIVE</span>
            <span class="cam-badge"><i class="fas fa-brain"></i> AI</span>
            <span class="cam-badge temp-badge" id="temp-badge-dashboard"><i class="fas fa-thermometer-half"></i> 28°C</span>
          </div>
          <div class="camera-ai-overlay" id="ai-overlay-dashboard">
            <div class="ai-status">
              <i class="fas fa-shield-alt"></i>
              <span id="ai-status-dashboard">Đang phân tích...</span>
            </div>
            <div class="confidence-bar">
              <div class="confidence-fill safe" id="confidence-bar-dashboard" style="width: 0%"></div>
            </div>
          </div>
        </div>
        <div id="detection-boxes-dashboard" style="position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none"></div>
      `;
    } else {
      feed.innerHTML = `
        <canvas id="dashboard-canvas" style="width:100%;height:100%"></canvas>
        <div class="camera-overlay">
          <div class="camera-label">
            <span class="live-dot"></span>
            <span>${cam.name}</span>
          </div>
          <div class="camera-ai-overlay" id="ai-overlay-dashboard">
            <div class="ai-status">
              <i class="fas fa-shield-alt"></i>
              <span id="ai-status-dashboard">Đang phân tích...</span>
            </div>
            <div class="confidence-bar">
              <div class="confidence-fill safe" id="confidence-bar-dashboard" style="width: 0%"></div>
            </div>
          </div>
        </div>
      `;
    }

    container.appendChild(feed);
    return feed;
  }

  /**
   * Update AI detection overlay on a camera
   */
  updateDetectionOverlay(cameraId, result, detector) {
    const statusEl = document.getElementById(`ai-status-text-${cameraId}`) || 
                     document.getElementById(`ai-status-${cameraId}`);
    const barEl = document.getElementById(`confidence-bar-${cameraId}`);
    const boxesEl = document.getElementById(`detection-boxes-${cameraId}`);
    const feedEl = document.querySelector(`[data-camera-id="${cameraId}"]`);

    if (!result) return;

    const riskInfo = detector.getRiskLevel(result.overallRisk);

    // Update status text
    if (statusEl) {
      statusEl.textContent = riskInfo.label;
      statusEl.style.color = riskInfo.color;
    }

    // Update confidence bar
    if (barEl) {
      barEl.style.width = result.overallRisk + '%';
      barEl.className = `confidence-fill ${riskInfo.level === 'safe' ? 'safe' : riskInfo.level === 'caution' ? 'safe' : riskInfo.level === 'warning' ? 'warning' : 'danger'}`;
    }

    // Update alert state on feed
    if (feedEl) {
      feedEl.classList.toggle('alert-active', result.overallRisk >= 50);
    }

    // Update Temperature badge
    const tempBadgeId = cameraId === 'cam-1' ? 'temp-badge-dashboard' : `temp-badge-${cameraId}`;
    const tempBadge1 = document.getElementById(tempBadgeId);
    const tempBadge2 = document.getElementById(`temp-badge-${cameraId}`); // For the grid view
    
    [tempBadge1, tempBadge2].forEach(badge => {
      if (badge && result.temperature) {
        badge.innerHTML = `<i class="fas fa-thermometer-half"></i> ${result.temperature}°C`;
        // Color coding for temperature
        if (result.temperature >= 100) {
          badge.style.color = '#ef4444'; // critical red
          badge.style.borderColor = '#ef4444';
          badge.classList.add('pulse'); // Optionally add pulse effect in CSS
        } else if (result.temperature >= 65) {
          badge.style.color = '#f59e0b'; // warning orange
          badge.style.borderColor = '#f59e0b';
          badge.classList.remove('pulse');
        } else {
          badge.style.color = ''; // default
          badge.style.borderColor = '';
          badge.classList.remove('pulse');
        }
      }
    });

    // Draw detection bounding boxes
    if (boxesEl) {
      boxesEl.innerHTML = '';
      if (result.fire.detected && result.fire.regions) {
        result.fire.regions.forEach(region => {
          const box = document.createElement('div');
          box.className = 'detection-box';
          box.style.left = (region.x * 100) + '%';
          box.style.top = (region.y * 100) + '%';
          box.style.width = (region.w * 100) + '%';
          box.style.height = (region.h * 100) + '%';
          box.innerHTML = `<div class="detection-label">🔥 Lửa ${Math.round(region.intensity * 100)}%</div>`;
          boxesEl.appendChild(box);
        });
      }
      if (result.smoke.detected && result.smoke.regions) {
        result.smoke.regions.forEach(region => {
          const box = document.createElement('div');
          box.className = 'detection-box';
          box.style.borderColor = 'var(--color-warning)';
          box.style.left = (region.x * 100) + '%';
          box.style.top = (region.y * 100) + '%';
          box.style.width = (region.w * 100) + '%';
          box.style.height = (region.h * 100) + '%';
          box.innerHTML = `<div class="detection-label" style="background:var(--color-warning)">💨 Khói</div>`;
          boxesEl.appendChild(box);
        });
      }
    }
  }

  /**
   * Get camera statistics
   */
  getStats() {
    return {
      total: this.cameras.length,
      online: this.cameras.filter(c => c.status === 'online').length,
      offline: this.cameras.filter(c => c.status === 'offline').length,
      maintenance: this.cameras.filter(c => c.status === 'maintenance').length,
      recording: this.cameras.filter(c => c.recording).length,
      withAI: this.cameras.filter(c => c.hasAI).length
    };
  }

  /**
   * Stop all camera feeds
   */
  stopAll() {
    if (this.activeStream) {
      this.activeStream.getTracks().forEach(t => t.stop());
    }
    this.cameras.forEach(cam => {
      if (cam._animFrame) {
        cancelAnimationFrame(cam._animFrame);
      }
    });
  }

  /**
   * Get camera by ID
   */
  getCamera(id) {
    return this.cameras.find(c => c.id === id);
  }
}

window.CameraManager = CameraManager;
