/**
 * AIfirede - Dashboard Manager
 * Charts, statistics, zone management and activity feed
 */

class DashboardManager {
  constructor() {
    this.charts = {};
    this.zones = this._initZones();
    this.activityLog = this._initActivityLog();
    this.chartColors = {
      danger: '#ef4444',
      warning: '#f59e0b',
      success: '#10b981',
      info: '#3b82f6',
      purple: '#8b5cf6',
      cyan: '#06b6d4',
      dangerAlpha: 'rgba(239, 68, 68, 0.2)',
      warningAlpha: 'rgba(245, 158, 11, 0.2)',
      successAlpha: 'rgba(16, 185, 129, 0.2)',
      infoAlpha: 'rgba(59, 130, 246, 0.2)',
    };
  }

  _initZones() {
    return [
      { id: 'zone-a1', name: 'Sảnh chính', floor: 'Tầng 1', temp: 26, humidity: 65, status: 'safe', cameras: 2, sensors: 4 },
      { id: 'zone-a2', name: 'Văn phòng A', floor: 'Tầng 2', temp: 25, humidity: 60, status: 'safe', cameras: 1, sensors: 3 },
      { id: 'zone-b1', name: 'Kho hàng', floor: 'Tầng hầm', temp: 28, humidity: 55, status: 'safe', cameras: 1, sensors: 5 },
      { id: 'zone-b2', name: 'Nhà bếp', floor: 'Tầng 1', temp: 34, humidity: 70, status: 'warning', cameras: 1, sensors: 3 },
      { id: 'zone-c1', name: 'Phòng Server', floor: 'Tầng 3', temp: 22, humidity: 45, status: 'safe', cameras: 1, sensors: 6 },
      { id: 'zone-d1', name: 'Bãi xe', floor: 'Ngoài trời', temp: 31, humidity: 75, status: 'safe', cameras: 1, sensors: 2 }
    ];
  }

  _initActivityLog() {
    const now = Date.now();
    return [
      { text: '<strong>Hệ thống AI</strong> đã phân tích 1,247 frames trong 10 phút qua', type: 'info', time: now - 30000 },
      { text: '<strong>Camera Sảnh chính</strong> đã được hiệu chỉnh thành công', type: 'success', time: now - 120000 },
      { text: '<strong>Cảnh báo khói</strong> tại Nhà bếp đã được xác nhận là báo động lầm', type: 'warning', time: now - 300000 },
      { text: '<strong>Sprinkler Khu B</strong> đã test thành công (kiểm tra định kỳ)', type: 'success', time: now - 900000 },
      { text: '<strong>Camera Phòng điện</strong> mất kết nối - đang kiểm tra', type: 'danger', time: now - 1800000 },
      { text: '<strong>Báo cáo hàng ngày</strong> đã được tạo tự động và gửi email', type: 'info', time: now - 3600000 },
      { text: '<strong>Cập nhật firmware</strong> cho 3 cảm biến nhiệt đã hoàn tất', type: 'success', time: now - 7200000 },
      { text: '<strong>Ca trực đêm</strong> bắt đầu - Trương Văn Nam tiếp nhận', type: 'info', time: now - 10800000 }
    ];
  }

  /**
   * Initialize all dashboard charts
   */
  initCharts() {
    this._createAlertTrendChart();
    this._createAlertTypeChart();
    this._createZoneRiskChart();
  }

  /**
   * Alert trend line chart (24h)
   */
  _createAlertTrendChart() {
    const ctx = document.getElementById('chart-alert-trend');
    if (!ctx) return;

    const labels = [];
    const fireData = [];
    const smokeData = [];
    const totalData = [];

    for (let i = 23; i >= 0; i--) {
      const h = new Date();
      h.setHours(h.getHours() - i);
      labels.push(h.getHours() + ':00');
      
      const fire = Math.floor(Math.random() * 3);
      const smoke = Math.floor(Math.random() * 2);
      fireData.push(fire);
      smokeData.push(smoke);
      totalData.push(fire + smoke + Math.floor(Math.random() * 2));
    }

    this.charts.alertTrend = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Tổng cảnh báo',
            data: totalData,
            borderColor: this.chartColors.info,
            backgroundColor: this.chartColors.infoAlpha,
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4
          },
          {
            label: 'Lửa',
            data: fireData,
            borderColor: this.chartColors.danger,
            backgroundColor: 'transparent',
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 0,
            borderDash: [5, 3]
          },
          {
            label: 'Khói',
            data: smokeData,
            borderColor: this.chartColors.warning,
            backgroundColor: 'transparent',
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 0,
            borderDash: [5, 3]
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#94a3b8',
              font: { size: 11, family: 'Inter' },
              padding: 15,
              usePointStyle: true,
              pointStyleWidth: 8
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
            ticks: { color: '#64748b', font: { size: 10 }, maxTicksLimit: 12 }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
            ticks: { color: '#64748b', font: { size: 10 }, stepSize: 1 },
            beginAtZero: true
          }
        },
        interaction: { intersect: false, mode: 'index' }
      }
    });
  }

  /**
   * Alert type doughnut chart
   */
  _createAlertTypeChart() {
    const ctx = document.getElementById('chart-alert-type');
    if (!ctx) return;

    this.charts.alertType = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Phát hiện lửa', 'Phát hiện khói', 'Chuyển động', 'Hệ thống', 'Camera'],
        datasets: [{
          data: [5, 12, 8, 3, 2],
          backgroundColor: [
            this.chartColors.danger,
            this.chartColors.warning,
            this.chartColors.purple,
            this.chartColors.info,
            this.chartColors.cyan
          ],
          borderWidth: 0,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#94a3b8',
              font: { size: 11, family: 'Inter' },
              padding: 12,
              usePointStyle: true,
              pointStyleWidth: 8
            }
          }
        }
      }
    });
  }

  /**
   * Zone risk bar chart
   */
  _createZoneRiskChart() {
    const ctx = document.getElementById('chart-zone-risk');
    if (!ctx) return;

    const zoneNames = this.zones.map(z => z.name);
    const riskData = this.zones.map(z => {
      if (z.status === 'danger') return 75 + Math.random() * 25;
      if (z.status === 'warning') return 40 + Math.random() * 20;
      return 5 + Math.random() * 15;
    });

    const barColors = riskData.map(v => {
      if (v >= 60) return this.chartColors.danger;
      if (v >= 30) return this.chartColors.warning;
      return this.chartColors.success;
    });

    this.charts.zoneRisk = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: zoneNames,
        datasets: [{
          label: 'Mức rủi ro (%)',
          data: riskData,
          backgroundColor: barColors,
          borderRadius: 6,
          borderSkipped: false,
          barThickness: 24
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
            ticks: { color: '#64748b', font: { size: 10 } },
            max: 100
          },
          y: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { size: 11, family: 'Inter' } }
          }
        }
      }
    });
  }

  /**
   * Render zone grid
   */
  renderZoneGrid(container) {
    container.innerHTML = '';
    
    this.zones.forEach(zone => {
      const card = document.createElement('div');
      card.className = `zone-card ${zone.status}`;
      card.innerHTML = `
        <div class="zone-header">
          <span class="zone-name">${zone.name}</span>
          <span class="zone-status-badge">${zone.status === 'safe' ? 'An toàn' : zone.status === 'warning' ? 'Cảnh báo' : 'Nguy hiểm'}</span>
        </div>
        <div class="zone-temp">${zone.temp}°C</div>
        <div class="zone-info">
          <div class="zone-info-item">
            <span>Tầng</span>
            <span>${zone.floor}</span>
          </div>
          <div class="zone-info-item">
            <span>Camera</span>
            <span>${zone.cameras} hoạt động</span>
          </div>
          <div class="zone-info-item">
            <span>Cảm biến</span>
            <span>${zone.sensors} thiết bị</span>
          </div>
          <div class="zone-info-item">
            <span>Độ ẩm</span>
            <span>${zone.humidity}%</span>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  /**
   * Render activity feed
   */
  renderActivityFeed(container, count = 8) {
    container.innerHTML = '';
    
    this.activityLog.slice(0, count).forEach(item => {
      const timeStr = this._formatTime(item.time);
      const div = document.createElement('div');
      div.className = 'activity-item';
      div.innerHTML = `
        <div class="activity-dot ${item.type}"></div>
        <div class="activity-text">${item.text}</div>
        <div class="activity-time">${timeStr}</div>
      `;
      container.appendChild(div);
    });
  }

  /**
   * Add activity to log
   */
  addActivity(text, type = 'info') {
    this.activityLog.unshift({
      text,
      type,
      time: Date.now()
    });
    
    if (this.activityLog.length > 50) {
      this.activityLog.pop();
    }
  }

  /**
   * Update zone temperatures with slight random variation
   */
  updateZoneTemps() {
    this.zones.forEach(zone => {
      zone.temp += (Math.random() - 0.5) * 0.5;
      zone.temp = Math.round(zone.temp * 10) / 10;
      zone.humidity += (Math.random() - 0.5) * 2;
      zone.humidity = Math.max(30, Math.min(95, Math.round(zone.humidity)));
    });
  }

  /**
   * Render zone map (building floor plan)
   */
  renderBuildingMap(container) {
    container.innerHTML = '';
    
    const map = document.createElement('div');
    map.className = 'building-map';
    
    const rooms = [
      { name: 'Sảnh chính', icon: '🏢', zone: this.zones[0] },
      { name: 'Phòng họp', icon: '📋', zone: { temp: 25, status: 'safe' } },
      { name: 'Nhà bếp', icon: '🍳', zone: this.zones[3] },
      { name: 'Kho hàng', icon: '📦', zone: this.zones[2] },
      { name: 'Văn phòng A', icon: '💼', zone: this.zones[1] },
      { name: 'Văn phòng B', icon: '💼', zone: { temp: 24, status: 'safe' } },
      { name: 'Server', icon: '🖥️', zone: this.zones[4] },
      { name: 'Phòng điện', icon: '⚡', zone: { temp: 30, status: 'safe' } },
      { name: 'WC', icon: '🚻', zone: { temp: 26, status: 'safe' } },
      { name: 'Cầu thang', icon: '🔺', zone: { temp: 27, status: 'safe' } },
      { name: 'Bãi xe', icon: '🚗', zone: this.zones[5] },
      { name: 'Sân thượng', icon: '☀️', zone: { temp: 33, status: 'safe' } },
    ];

    const grid = document.createElement('div');
    grid.className = 'floor-grid';

    rooms.forEach(room => {
      const roomEl = document.createElement('div');
      roomEl.className = `floor-room ${room.zone.status}`;
      roomEl.innerHTML = `
        <span class="floor-room-icon">${room.icon}</span>
        <span class="floor-room-name">${room.name}</span>
        <span class="floor-room-temp">${room.zone.temp}°C</span>
      `;
      roomEl.title = `${room.name} - ${room.zone.temp}°C`;
      grid.appendChild(roomEl);
    });

    map.appendChild(grid);

    // Legend
    const legend = document.createElement('div');
    legend.className = 'map-legend';
    legend.innerHTML = `
      <div class="legend-item"><div class="legend-color safe"></div> An toàn</div>
      <div class="legend-item"><div class="legend-color warning"></div> Cảnh báo</div>
      <div class="legend-item"><div class="legend-color danger"></div> Nguy hiểm</div>
    `;
    map.appendChild(legend);

    container.appendChild(map);
  }

  /**
   * Update stats cards on dashboard
   */
  updateStatsCards(cameraStats, alertStats, riskLevel, maxTemp) {
    const el = (id) => document.getElementById(id);
    
    if (el('stat-cameras')) el('stat-cameras').textContent = `${cameraStats.online}/${cameraStats.total}`;
    if (el('stat-alerts')) el('stat-alerts').textContent = alertStats.today || 0;
    if (el('stat-risk')) {
      el('stat-risk').textContent = riskLevel + '%';
      const card = el('stat-risk').closest('.stat-card');
      if (card) {
        card.className = `stat-card ${riskLevel >= 60 ? 'danger' : riskLevel >= 30 ? 'warning' : 'success'}`;
      }
    }
    if (el('stat-max-temp') && maxTemp !== undefined) {
      el('stat-max-temp').textContent = `${maxTemp}°C`;
      const card = el('stat-card-temp');
      if (card) {
        card.className = `stat-card ${maxTemp >= 100 ? 'danger' : maxTemp >= 65 ? 'warning' : 'info'}`;
      }
    }
  }

  _formatTime(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  }

  /**
   * Destroy all charts
   */
  destroyCharts() {
    Object.values(this.charts).forEach(chart => {
      if (chart && chart.destroy) chart.destroy();
    });
    this.charts = {};
  }
}

window.DashboardManager = DashboardManager;
