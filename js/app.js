/**
 * AIfirede - Main Application Controller
 * Initializes all modules, handles routing, state management, and real-time loop
 */

class FireGuardApp {
  constructor() {
    this.currentPage = 'dashboard';
    this.detector = new FireDetector();
    this.cameraManager = new CameraManager();
    this.alertSystem = new AlertSystem();
    this.dashboard = new DashboardManager();
    this.reportManager = new ReportManager();

    this.analysisInterval = null;
    this.clockInterval = null;
    this.statsInterval = null;
    this.isAnalyzing = false;
    this.frameCount = 0;

    // Controls state
    this.controls = {
      sprinklerA: false,
      sprinklerB: false,
      sprinklerC: false,
      exitDoors: false,
      alarmSiren: false,
      ventilation: true,
      emergencyLights: false,
      autoMode: true,
      sensitivity: 65,
    };
  }

  /**
   * Initialize the application
   */
  async init() {
    console.log('🔥 AIfirede initializing...');

    // Setup navigation
    this._setupNavigation();

    // Setup clock
    this._startClock();

    // Initialize dashboard page
    this._initDashboard();

    // Setup emergency modal
    this._setupEmergencyModal();

    // Start with dashboard
    this.navigateTo('dashboard');

    // Setup alert callback
    this.alertSystem.onAlert = (alert) => {
      this._onNewAlert(alert);
    };

    this.alertSystem.onEmergency = (data) => {
      this.dashboard.addActivity(
        `<strong>🚨 KHẨN CẤP!</strong> Phát hiện cháy tại ${data.cameraName} - Rủi ro ${data.risk}%`,
        'danger'
      );
    };

    // Periodic zone temperature updates
    this.statsInterval = setInterval(() => {
      this.dashboard.updateZoneTemps();
      this._updateAlertBadge();
    }, 10000);

    console.log('✅ AIfirede ready!');
  }

  /**
   * Setup sidebar navigation
   */
  _setupNavigation() {
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        this.navigateTo(page);
      });
    });
  }

  /**
   * Navigate to a page
   */
  navigateTo(pageName) {
    // Update active nav
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-item[data-page="${pageName}"]`);
    if (activeNav) activeNav.classList.add('active');

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    // Show target page
    const page = document.getElementById(`page-${pageName}`);
    if (page) {
      page.classList.add('active');
    }

    // Update header
    const titleMap = {
      'dashboard': 'Tổng Quan',
      'cameras': 'Camera Trực Tiếp',
      'map': 'Bản Đồ Khu Vực',
      'alerts': 'Cảnh Báo',
      'reports': 'Báo Cáo Sự Cố',
      'controls': 'Điều Khiển Thiết Bị',
      'settings': 'Cài Đặt Hệ Thống'
    };

    const headerTitle = document.getElementById('header-title');
    if (headerTitle) headerTitle.textContent = titleMap[pageName] || pageName;

    // Initialize page content
    this._initPage(pageName);

    this.currentPage = pageName;
  }

  /**
   * Initialize page-specific content
   */
  _initPage(pageName) {
    switch (pageName) {
      case 'dashboard':
        this._initDashboard();
        break;
      case 'cameras':
        this._initCameraPage();
        break;
      case 'map':
        this._initMapPage();
        break;
      case 'alerts':
        this._initAlertsPage();
        break;
      case 'reports':
        this._initReportsPage();
        break;
      case 'controls':
        this._initControlsPage();
        break;
      case 'settings':
        this._initSettingsPage();
        break;
    }
  }

  /**
   * Initialize Dashboard
   */
  _initDashboard() {
    // Render dashboard camera
    const cameraContainer = document.getElementById('dashboard-camera-container');
    if (cameraContainer && !cameraContainer.hasChildNodes()) {
      this.cameraManager.renderDashboardCamera(cameraContainer);
      
      // Start webcam
      const videoEl = document.getElementById('dashboard-video');
      if (videoEl) {
        this.cameraManager.startWebcam(videoEl).then(success => {
          if (success) {
            this._startAIAnalysis(videoEl, 'dashboard');
          }
        });
      }
    }

    // Update stats
    const camStats = this.cameraManager.getStats();
    const alertStats = this.alertSystem.getStats();
    this.dashboard.updateStatsCards(camStats, alertStats, this.detector.lastResult.overallRisk, this.detector.lastResult.temperature);

    // Render zone grid
    const zoneContainer = document.getElementById('dashboard-zone-grid');
    if (zoneContainer) this.dashboard.renderZoneGrid(zoneContainer);

    // Render alerts
    const alertContainer = document.getElementById('dashboard-alerts');
    if (alertContainer) this.alertSystem.renderAlertList(alertContainer, 5);

    // Render activity feed
    const activityContainer = document.getElementById('dashboard-activity');
    if (activityContainer) this.dashboard.renderActivityFeed(activityContainer);

    // Init charts
    setTimeout(() => {
      this.dashboard.destroyCharts();
      this.dashboard.initCharts();
    }, 100);
  }

  /**
   * Initialize Camera Page
   */
  _initCameraPage() {
    const container = document.getElementById('camera-grid-container');
    if (!container) return;

    // Setup layout buttons
    document.querySelectorAll('.layout-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const layout = btn.dataset.layout;
        this.cameraManager.renderCameraGrid(container, layout);

        // Re-attach webcam
        setTimeout(() => {
          const videoEl = document.getElementById('video-cam-1');
          if (videoEl) {
            this.cameraManager.startWebcam(videoEl).then(success => {
              if (success) this._startAIAnalysis(videoEl, 'cam-1');
            });
          }
        }, 100);
      });
    });

    // Default render
    this.cameraManager.renderCameraGrid(container, '2x2');

    // Start webcam for cam-1
    setTimeout(() => {
      const videoEl = document.getElementById('video-cam-1');
      if (videoEl) {
        this.cameraManager.startWebcam(videoEl).then(success => {
          if (success) this._startAIAnalysis(videoEl, 'cam-1');
        });
      }
    }, 200);
  }

  /**
   * Initialize Map Page
   */
  _initMapPage() {
    const container = document.getElementById('building-map-container');
    if (container) {
      this.dashboard.renderBuildingMap(container);
    }
  }

  /**
   * Initialize Alerts Page
   */
  _initAlertsPage() {
    const container = document.getElementById('alerts-full-list');
    if (container) {
      this.alertSystem.renderAlertList(container, 50);
    }
  }

  /**
   * Initialize Reports Page
   */
  _initReportsPage() {
    const container = document.getElementById('reports-table-container');
    if (container) {
      this.reportManager.renderReportsTable(container);
    }

    // Setup filter buttons
    document.querySelectorAll('.report-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.report-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.reportManager.setFilter(btn.dataset.filter);
        this.reportManager.renderReportsTable(container);
      });
    });
  }

  /**
   * Initialize Controls Page
   */
  _initControlsPage() {
    // Bind toggle switches
    document.querySelectorAll('.device-toggle').forEach(toggle => {
      const key = toggle.dataset.control;
      if (key && this.controls[key] !== undefined) {
        toggle.checked = this.controls[key];
      }

      toggle.addEventListener('change', (e) => {
        const controlKey = e.target.dataset.control;
        this.controls[controlKey] = e.target.checked;
        
        const statusText = e.target.closest('.control-card')?.querySelector('.device-status');
        if (statusText) {
          statusText.textContent = e.target.checked ? 'Đang hoạt động' : 'Tắt';
          statusText.style.color = e.target.checked ? 'var(--color-success)' : 'var(--text-dim)';
        }

        this.dashboard.addActivity(
          `<strong>${controlKey}</strong> đã được ${e.target.checked ? 'BẬT' : 'TẮT'}`,
          e.target.checked ? 'success' : 'warning'
        );
      });
    });

    // Sensitivity slider
    const sensitivitySlider = document.getElementById('sensitivity-slider');
    if (sensitivitySlider) {
      sensitivitySlider.value = this.controls.sensitivity;
      sensitivitySlider.addEventListener('input', (e) => {
        this.controls.sensitivity = parseInt(e.target.value);
        const label = document.getElementById('sensitivity-value');
        if (label) label.textContent = this.controls.sensitivity + '%';
        
        // Update detector threshold
        this.detector.updateSettings({
          firePixelThreshold: 0.01 - (this.controls.sensitivity / 10000)
        });
      });
    }
  }

  /**
   * Initialize Settings Page
   */
  _initSettingsPage() {
    // Sound toggle
    const soundToggle = document.getElementById('setting-sound');
    if (soundToggle) {
      soundToggle.checked = this.alertSystem.soundEnabled;
      soundToggle.addEventListener('change', (e) => {
        this.alertSystem.soundEnabled = e.target.checked;
      });
    }

    // Notification toggle
    const notifToggle = document.getElementById('setting-notifications');
    if (notifToggle) {
      notifToggle.checked = this.alertSystem.notificationsEnabled;
      notifToggle.addEventListener('change', (e) => {
        this.alertSystem.notificationsEnabled = e.target.checked;
      });
    }

    // Auto response toggle
    const autoToggle = document.getElementById('setting-auto-response');
    if (autoToggle) {
      autoToggle.checked = this.alertSystem.autoResponseEnabled;
      autoToggle.addEventListener('change', (e) => {
        this.alertSystem.autoResponseEnabled = e.target.checked;
      });
    }
  }

  /**
   * Start AI analysis loop
   */
  _startAIAnalysis(videoElement, cameraId) {
    if (this.analysisInterval) {
      cancelAnimationFrame(this.analysisInterval);
    }

    this.isAnalyzing = true;

    const analyze = () => {
      if (!this.isAnalyzing) return;

      this.frameCount++;

      // Analyze every 3rd frame for performance
      if (this.frameCount % 3 === 0) {
        const result = this.detector.analyze(videoElement);

        // Update overlay
        this.cameraManager.updateDetectionOverlay(cameraId, result, this.detector);

        // Process alerts
        const cam = this.cameraManager.getCamera('cam-1') || { name: 'Sảnh chính' };
        this.alertSystem.processDetection(result, cameraId, cam.name);

        // Update dashboard stats periodically
        if (this.frameCount % 30 === 0) {
          const camStats = this.cameraManager.getStats();
          const alertStats = this.alertSystem.getStats();
          this.dashboard.updateStatsCards(camStats, alertStats, result.overallRisk, result.temperature);
        }
      }

      this.analysisInterval = requestAnimationFrame(analyze);
    };

    analyze();
  }

  /**
   * Handle new alert
   */
  _onNewAlert(alert) {
    // Update alert badge in sidebar
    this._updateAlertBadge();

    // Update alerts list if visible
    const alertContainer = document.getElementById('dashboard-alerts');
    if (alertContainer && this.currentPage === 'dashboard') {
      this.alertSystem.renderAlertList(alertContainer, 5);
    }

    // Add to activity log
    this.dashboard.addActivity(
      `<strong>${alert.title}</strong> - ${alert.cameraName || 'Hệ thống'}`,
      alert.severity === 'critical' ? 'danger' : alert.severity
    );

    // Update activity feed if visible
    const activityContainer = document.getElementById('dashboard-activity');
    if (activityContainer && this.currentPage === 'dashboard') {
      this.dashboard.renderActivityFeed(activityContainer);
    }

    // Create report for critical alerts
    if (alert.severity === 'critical') {
      this.reportManager.createFromDetection({
        title: alert.title,
        type: alert.type,
        severity: alert.severity,
        camera: alert.camera,
        cameraName: alert.cameraName,
        confidence: alert.confidence,
        description: alert.description
      });
    }

    // Update system status
    this._updateSystemStatus(alert.severity === 'critical');
  }

  /**
   * Update alert badge count
   */
  _updateAlertBadge() {
    const badge = document.getElementById('alert-badge');
    const stats = this.alertSystem.getStats();
    if (badge) {
      const count = stats.newAlerts + stats.critical;
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
  }

  /**
   * Update system status indicator
   */
  _updateSystemStatus(isAlert = false) {
    const statusEl = document.getElementById('system-status');
    if (statusEl) {
      if (isAlert) {
        statusEl.className = 'system-status alert';
        statusEl.innerHTML = '<span class="status-dot"></span> CẢNH BÁO';
      } else {
        statusEl.className = 'system-status online';
        statusEl.innerHTML = '<span class="status-dot"></span> Hoạt động';
      }
    }
  }

  /**
   * Setup emergency modal
   */
  _setupEmergencyModal() {
    const confirmBtn = document.getElementById('emergency-confirm');
    const dismissBtn = document.getElementById('emergency-dismiss');

    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        this.alertSystem.dismissEmergency();
        // Activate all emergency systems
        this.controls.sprinklerA = true;
        this.controls.sprinklerB = true;
        this.controls.exitDoors = true;
        this.controls.alarmSiren = true;
        this.controls.emergencyLights = true;
        
        this.dashboard.addActivity(
          '<strong>🚨 Chế độ khẩn cấp</strong> đã được kích hoạt - Tất cả hệ thống PCCC đã bật',
          'danger'
        );

        this._showToastMessage('Đã kích hoạt tất cả hệ thống PCCC!', 'danger');
      });
    }

    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => {
        this.alertSystem.dismissEmergency();
        this.dashboard.addActivity(
          '<strong>Cảnh báo khẩn cấp</strong> đã được bỏ qua bởi người vận hành',
          'warning'
        );
      });
    }
  }

  /**
   * Show toast message
   */
  _showToastMessage(message, type = 'info') {
    this.alertSystem._showToast({
      severity: type === 'danger' ? 'critical' : type,
      title: 'AIfirede',
      description: message
    });
  }

  /**
   * Show report detail
   */
  showReportDetail(reportId) {
    // Simple: scroll/highlight - could be a modal in full version
    console.log('View report:', reportId);
  }

  /**
   * Start system clock
   */
  _startClock() {
    const updateClock = () => {
      const el = document.getElementById('header-clock');
      if (el) {
        const now = new Date();
        el.textContent = now.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }) + ' - ' + now.toLocaleDateString('vi-VN', {
          weekday: 'short',
          day: '2-digit',
          month: '2-digit'
        });
      }
    };

    updateClock();
    this.clockInterval = setInterval(updateClock, 1000);
  }

  /**
   * Cleanup
   */
  destroy() {
    this.isAnalyzing = false;
    if (this.analysisInterval) cancelAnimationFrame(this.analysisInterval);
    if (this.clockInterval) clearInterval(this.clockInterval);
    if (this.statsInterval) clearInterval(this.statsInterval);
    this.cameraManager.stopAll();
    this.dashboard.destroyCharts();
  }
}

// Initialize app when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new FireGuardApp();
  window.app.init();
});
