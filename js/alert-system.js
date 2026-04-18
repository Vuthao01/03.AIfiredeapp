/**
 * AIfirede - Alert System
 * Multi-level alert management with sound, notifications and automated responses
 */

class AlertSystem {
  constructor() {
    this.alerts = [];
    this.maxAlerts = 100;
    this.soundEnabled = true;
    this.notificationsEnabled = true;
    this.autoResponseEnabled = true;
    this.lastAlertTime = 0;
    this.alertCooldown = 5000; // 5 seconds between same-type alerts
    this.onAlert = null;
    this.onEmergency = null;
    this.audioCtx = null;

    // Pre-generate some demo alerts
    this._generateDemoAlerts();
    
    // Request notification permission
    this._requestNotificationPermission();
  }

  /**
   * Process detection result and create alerts if needed
   * v2: Uses temporal confirmation - only alerts on CONFIRMED detections
   */
  processDetection(result, cameraId, cameraName) {
    const now = Date.now();
    const fireCooldown = 15000;  // 15 seconds between fire alerts
    const smokeCooldown = 30000; // 30 seconds between smoke alerts
    const emergencyCooldown = 20000;

    // Fire detection alert - ONLY if confirmed by temporal analysis
    if (result.fire.detected && result.fire.confirmed && result.fire.confidence >= 50) {
      if (now - this.lastAlertTime > fireCooldown) {
        const severity = result.fire.confidence >= 75 ? 'critical' : 'warning';
        this.createAlert({
          type: 'fire',
          severity,
          title: severity === 'critical' ? '🔥 PHÁT HIỆN CHÁY!' : '⚠️ Cảnh báo lửa',
          description: `AI xác nhận phát hiện lửa tại ${cameraName} với độ tin cậy ${result.fire.confidence}% (đã xác thực qua nhiều frame)`,
          camera: cameraId,
          cameraName,
          confidence: result.fire.confidence,
          autoResponse: severity === 'critical'
        });
        this.lastAlertTime = now;
      }
    }

    // Smoke detection alert - ONLY if confirmed
    if (result.smoke.detected && result.smoke.confirmed && result.smoke.confidence >= 45) {
      if (now - this.lastAlertTime > smokeCooldown) {
        this.createAlert({
          type: 'smoke',
          severity: result.smoke.confidence >= 65 ? 'warning' : 'caution',
          title: '💨 Phát hiện khói',
          description: `AI xác nhận phát hiện khói tại ${cameraName} với độ tin cậy ${result.smoke.confidence}% (phân biệt với nền tĩnh)`,
          camera: cameraId,
          cameraName,
          confidence: result.smoke.confidence,
          autoResponse: false
        });
        this.lastAlertTime = now;
      }
    }

    // Temperature detection alert
    const highTemp = 65; // Threshold for Warning
    const criticalTemp = 100; // Threshold for Critical
    if (result.temperature >= highTemp) {
      if (now - this.lastAlertTime > fireCooldown) { // share same cooldown spacing as fire
        const severity = result.temperature >= criticalTemp ? 'critical' : 'warning';
        this.createAlert({
          type: 'fire', // using fire icon
          severity,
          title: severity === 'critical' ? '🌡️ NHIỆT ĐỘ KHẨN CẤP!' : '🌡️ Cảnh báo cảm biến nhiệt',
          description: `Cảm biến nhiệt tại ${cameraName} ghi nhận mức ${result.temperature}°C vượt ngưỡng an toàn.`,
          camera: cameraId,
          cameraName,
          confidence: 100, // It's a sensor value, so 100%
          autoResponse: severity === 'critical'
        });
        this.lastAlertTime = now;
      }
    }

    // High risk emergency - higher threshold
    if (result.overallRisk >= 80 && result.fire.confirmed && now - this.lastAlertTime > emergencyCooldown) {
      this.triggerEmergency({
        camera: cameraId,
        cameraName,
        risk: result.overallRisk,
        fire: result.fire,
        smoke: result.smoke
      });
    }
  }

  /**
   * Create a new alert
   */
  createAlert(data) {
    const alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: data.type || 'general',
      severity: data.severity || 'caution', // critical, warning, caution
      title: data.title,
      description: data.description,
      camera: data.camera,
      cameraName: data.cameraName,
      confidence: data.confidence || 0,
      timestamp: Date.now(),
      status: 'new', // new, acknowledged, resolved
      autoResponse: data.autoResponse || false,
      actions: []
    };

    // Add to front of array
    this.alerts.unshift(alert);
    if (this.alerts.length > this.maxAlerts) {
      this.alerts.pop();
    }

    // Play sound
    if (this.soundEnabled) {
      this._playAlertSound(alert.severity);
    }

    // Browser notification
    if (this.notificationsEnabled) {
      this._sendNotification(alert);
    }

    // Toast notification
    this._showToast(alert);

    // Auto response for critical alerts
    if (this.autoResponseEnabled && alert.autoResponse) {
      this._executeAutoResponse(alert);
    }

    // Callback
    if (this.onAlert) {
      this.onAlert(alert);
    }

    return alert;
  }

  /**
   * Trigger emergency mode
   */
  triggerEmergency(data) {
    if (this.onEmergency) {
      this.onEmergency(data);
    }
    
    // Show emergency modal
    const overlay = document.getElementById('emergency-overlay');
    if (overlay) {
      overlay.classList.add('active');
      
      const detailsEl = overlay.querySelector('.emergency-details');
      if (detailsEl) {
        detailsEl.innerHTML = `
          <div class="emergency-detail-row">
            <span class="label">Camera:</span>
            <span class="value">${data.cameraName}</span>
          </div>
          <div class="emergency-detail-row">
            <span class="label">Mức độ rủi ro:</span>
            <span class="value text-danger">${data.risk}%</span>
          </div>
          <div class="emergency-detail-row">
            <span class="label">Phát hiện lửa:</span>
            <span class="value">${data.fire.detected ? `Có (${data.fire.confidence}%)` : 'Không'}</span>
          </div>
          <div class="emergency-detail-row">
            <span class="label">Phát hiện khói:</span>
            <span class="value">${data.smoke.detected ? `Có (${data.smoke.confidence}%)` : 'Không'}</span>
          </div>
          <div class="emergency-detail-row">
            <span class="label">Thời gian:</span>
            <span class="value">${new Date().toLocaleTimeString('vi-VN')}</span>
          </div>
        `;
      }
    }

    // Play emergency siren
    if (this.soundEnabled) {
      this._playEmergencySiren();
    }
  }

  /**
   * Dismiss emergency
   */
  dismissEmergency() {
    const overlay = document.getElementById('emergency-overlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
    this._stopSound();
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.status = 'acknowledged';
    }
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.status = 'resolved';
    }
  }

  /**
   * Play alert sound using Web Audio API
   */
  _playAlertSound(severity) {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (severity === 'critical') {
        osc.frequency.value = 880;
        osc.type = 'square';
        gain.gain.value = 0.15;
        
        // Pulsing effect
        const now = this.audioCtx.currentTime;
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(660, now + 0.15);
        osc.frequency.setValueAtTime(880, now + 0.3);
        osc.frequency.setValueAtTime(660, now + 0.45);
        
        osc.start(now);
        osc.stop(now + 0.6);
      } else if (severity === 'warning') {
        osc.frequency.value = 660;
        osc.type = 'triangle';
        gain.gain.value = 0.1;
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.3);
      } else {
        osc.frequency.value = 440;
        osc.type = 'sine';
        gain.gain.value = 0.08;
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.2);
      }
    } catch(e) {
      // Audio not available
    }
  }

  /**
   * Play emergency siren
   */
  _playEmergencySiren() {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      
      osc.type = 'sawtooth';
      gain.gain.value = 0.12;

      const now = this.audioCtx.currentTime;
      // Siren sweep
      for (let i = 0; i < 4; i++) {
        osc.frequency.setValueAtTime(400, now + i * 0.5);
        osc.frequency.linearRampToValueAtTime(800, now + i * 0.5 + 0.25);
        osc.frequency.linearRampToValueAtTime(400, now + i * 0.5 + 0.5);
      }

      osc.start(now);
      osc.stop(now + 2);
      
      this._currentSiren = osc;
    } catch(e) {}
  }

  _stopSound() {
    try {
      if (this._currentSiren) {
        this._currentSiren.stop();
        this._currentSiren = null;
      }
    } catch(e) {}
  }

  /**
   * Send browser notification
   */
  _sendNotification(alert) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`AIfirede - ${alert.title}`, {
        body: alert.description,
        icon: '🔥',
        tag: alert.id,
        requireInteraction: alert.severity === 'critical'
      });
    }
  }

  /**
   * Request notification permission
   */
  _requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  /**
   * Show toast notification
   */
  _showToast(alert) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const iconMap = {
      critical: 'fa-fire',
      warning: 'fa-exclamation-triangle',
      caution: 'fa-info-circle'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${alert.severity === 'critical' ? 'danger' : alert.severity}`;
    toast.innerHTML = `
      <i class="fas ${iconMap[alert.severity] || 'fa-bell'} toast-icon"></i>
      <div class="toast-content">
        <div class="toast-title">${alert.title}</div>
        <div class="toast-message">${alert.description}</div>
      </div>
      <button class="toast-close" onclick="this.closest('.toast').remove()">
        <i class="fas fa-times"></i>
      </button>
      <div class="toast-progress"></div>
    `;

    container.appendChild(toast);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
      }
    }, 5000);
  }

  /**
   * Execute automatic response for critical alerts
   */
  _executeAutoResponse(alert) {
    alert.actions.push({
      action: 'Kích hoạt sprinkler tự động',
      time: Date.now(),
      status: 'executed'
    });
    alert.actions.push({
      action: 'Mở cửa thoát hiểm',
      time: Date.now(),
      status: 'executed'
    });
    alert.actions.push({
      action: 'Gửi thông báo đến đội PCCC',
      time: Date.now(),
      status: 'pending'
    });
  }

  /**
   * Generate demo alerts for initial display
   */
  _generateDemoAlerts() {
    const now = Date.now();
    const demoAlerts = [
      {
        type: 'system', severity: 'caution',
        title: 'Hệ thống khởi động',
        description: 'AIfirede đã khởi động thành công. Tất cả module hoạt động bình thường.',
        camera: null, cameraName: 'Hệ thống',
        confidence: 100, timestamp: now - 60000
      },
      {
        type: 'camera', severity: 'caution',
        title: 'Camera offline',
        description: 'Camera "Phòng điện" (cam-6) đã mất kết nối.',
        camera: 'cam-6', cameraName: 'Phòng điện',
        confidence: 0, timestamp: now - 300000
      },
      {
        type: 'smoke', severity: 'warning',
        title: '💨 Phát hiện khói nhẹ',
        description: 'Phát hiện khói nhẹ tại Nhà bếp, có thể do hoạt động nấu ăn.',
        camera: 'cam-7', cameraName: 'Nhà bếp',
        confidence: 35, timestamp: now - 1800000
      },
      {
        type: 'maintenance', severity: 'caution',
        title: 'Bảo trì camera',
        description: 'Camera "Sân thượng" (cam-9) đang được bảo trì định kỳ.',
        camera: 'cam-9', cameraName: 'Sân thượng',
        confidence: 0, timestamp: now - 3600000
      }
    ];

    demoAlerts.forEach(data => {
      this.alerts.push({
        id: `alert-demo-${Math.random().toString(36).substr(2, 5)}`,
        ...data,
        status: data.severity === 'warning' ? 'acknowledged' : 'resolved',
        autoResponse: false,
        actions: []
      });
    });
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity) {
    return this.alerts.filter(a => a.severity === severity);
  }

  /**
   * Get recent alerts (last N)
   */
  getRecent(count = 10) {
    return this.alerts.slice(0, count);
  }

  /**
   * Get alert statistics
   */
  getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    const todayAlerts = this.alerts.filter(a => a.timestamp >= todayMs);
    
    return {
      total: this.alerts.length,
      today: todayAlerts.length,
      critical: this.alerts.filter(a => a.severity === 'critical' && a.status !== 'resolved').length,
      warning: this.alerts.filter(a => a.severity === 'warning' && a.status !== 'resolved').length,
      unresolved: this.alerts.filter(a => a.status !== 'resolved').length,
      newAlerts: this.alerts.filter(a => a.status === 'new').length
    };
  }

  /**
   * Render alert list in a container
   */
  renderAlertList(container, count = 10) {
    const alerts = this.getRecent(count);
    container.innerHTML = '';

    if (alerts.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-dim)"><i class="fas fa-check-circle" style="font-size:2rem;margin-bottom:0.5rem;display:block;color:var(--color-success)"></i>Không có cảnh báo mới</div>';
      return;
    }

    alerts.forEach(alert => {
      const timeAgo = this._timeAgo(alert.timestamp);
      const card = document.createElement('div');
      card.className = `alert-card ${alert.severity} ${alert.status === 'new' ? 'new' : ''}`;
      
      const iconMap = {
        fire: 'fa-fire',
        smoke: 'fa-smog',
        camera: 'fa-video-slash',
        system: 'fa-cog',
        maintenance: 'fa-wrench'
      };

      card.innerHTML = `
        <div class="alert-icon">
          <i class="fas ${iconMap[alert.type] || 'fa-bell'}"></i>
        </div>
        <div class="alert-content">
          <div class="alert-title">${alert.title}</div>
          <div class="alert-desc">${alert.description}</div>
          <div class="alert-meta">
            <span><i class="far fa-clock"></i> ${timeAgo}</span>
            ${alert.cameraName ? `<span><i class="fas fa-video"></i> ${alert.cameraName}</span>` : ''}
            ${alert.confidence ? `<span><i class="fas fa-brain"></i> ${alert.confidence}%</span>` : ''}
          </div>
        </div>
      `;

      container.appendChild(card);
    });
  }

  /**
   * Time ago helper
   */
  _timeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Vừa xong';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
    return `${Math.floor(seconds / 86400)} ngày trước`;
  }
}

window.AlertSystem = AlertSystem;
