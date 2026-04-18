/**
 * AIfirede - Report Manager
 * Incident report generation, history, and export
 */

class ReportManager {
  constructor() {
    this.reports = this._generateDemoReports();
    this.currentFilter = 'all';
  }

  _generateDemoReports() {
    const now = Date.now();
    return [
      {
        id: 'RPT-2026-001',
        title: 'Phát hiện khói tại Nhà bếp',
        type: 'smoke',
        severity: 'warning',
        status: 'resolved',
        camera: 'cam-7',
        cameraName: 'Nhà bếp',
        zone: 'Khu B - Tầng 1',
        confidence: 65,
        description: 'Hệ thống AI phát hiện khói nhẹ từ camera Nhà bếp. Sau kiểm tra xác nhận do hoạt động nấu ăn, không phải sự cố cháy.',
        timestamp: now - 1800000,
        resolvedAt: now - 1200000,
        responseTime: '1m 30s',
        actions: [
          { action: 'AI phân tích phát hiện khói', time: now - 1800000, status: 'completed' },
          { action: 'Cảnh báo gửi đến nhân viên trực', time: now - 1795000, status: 'completed' },
          { action: 'Nhân viên kiểm tra hiện trường', time: now - 1500000, status: 'completed' },
          { action: 'Xác nhận: Báo động lầm (nấu ăn)', time: now - 1200000, status: 'completed' }
        ]
      },
      {
        id: 'RPT-2026-002',
        title: 'Camera Phòng điện mất kết nối',
        type: 'system',
        severity: 'low',
        status: 'investigating',
        camera: 'cam-6',
        cameraName: 'Phòng điện',
        zone: 'Khu C - Tầng 1',
        confidence: 0,
        description: 'Camera giám sát phòng điện đã mất kết nối. Đang kiểm tra kết nối mạng và nguồn điện camera.',
        timestamp: now - 7200000,
        resolvedAt: null,
        responseTime: '45s',
        actions: [
          { action: 'Hệ thống phát hiện camera offline', time: now - 7200000, status: 'completed' },
          { action: 'Thông báo đội kỹ thuật', time: now - 7195000, status: 'completed' },
          { action: 'Kiểm tra kết nối mạng', time: now - 6000000, status: 'in-progress' }
        ]
      },
      {
        id: 'RPT-2026-003',
        title: 'Cảnh báo nhiệt độ cao - Phòng Server',
        type: 'temperature',
        severity: 'warning',
        status: 'resolved',
        camera: 'cam-3',
        cameraName: 'Phòng Server',
        zone: 'Khu C - Tầng 3',
        confidence: 85,
        description: 'Nhiệt độ phòng server tăng đột biến lên 38°C. Hệ thống làm mát đã được kích hoạt tự động.',
        timestamp: now - 86400000,
        resolvedAt: now - 82800000,
        responseTime: '12s',
        actions: [
          { action: 'Cảm biến phát hiện nhiệt độ cao', time: now - 86400000, status: 'completed' },
          { action: 'Kích hoạt hệ thống làm mát bổ sung', time: now - 86398000, status: 'completed' },
          { action: 'Nhiệt độ trở lại bình thường (24°C)', time: now - 82800000, status: 'completed' }
        ]
      },
      {
        id: 'RPT-2026-004',
        title: 'Kiểm tra PCCC định kỳ',
        type: 'maintenance',
        severity: 'low',
        status: 'resolved',
        camera: null,
        cameraName: 'Tất cả',
        zone: 'Toàn bộ tòa nhà',
        confidence: 100,
        description: 'Kiểm tra định kỳ hệ thống PCCC bao gồm: sprinkler, đầu báo khói, bình chữa cháy, cửa thoát hiểm.',
        timestamp: now - 172800000,
        resolvedAt: now - 158400000,
        responseTime: 'N/A',
        actions: [
          { action: 'Kiểm tra 24 đầu sprinkler - OK', time: now - 172800000, status: 'completed' },
          { action: 'Kiểm tra 18 đầu báo khói - 1 cần thay', time: now - 169200000, status: 'completed' },
          { action: 'Kiểm tra 12 bình chữa cháy - OK', time: now - 165600000, status: 'completed' },
          { action: 'Kiểm tra 6 cửa thoát hiểm - OK', time: now - 162000000, status: 'completed' },
          { action: 'Thay thế đầu báo khói #14 tầng 3', time: now - 158400000, status: 'completed' }
        ]
      },
      {
        id: 'RPT-2026-005',
        title: 'Phát hiện lửa - Kho hàng B2 (Demo)',
        type: 'fire',
        severity: 'critical',
        status: 'resolved',
        camera: 'cam-2',
        cameraName: 'Kho hàng B2',
        zone: 'Khu B - Tầng hầm',
        confidence: 92,
        description: 'Hệ thống AI phát hiện lửa tại khu vực kho hàng B2. Sprinkler tự động đã kích hoạt. Đội PCCC đã được thông báo.',
        timestamp: now - 604800000,
        resolvedAt: now - 603000000,
        responseTime: '8s',
        actions: [
          { action: 'AI phát hiện lửa (92% confidence)', time: now - 604800000, status: 'completed' },
          { action: 'Kích hoạt sprinkler khu B tự động', time: now - 604798000, status: 'completed' },
          { action: 'Mở cửa thoát hiểm tầng hầm', time: now - 604797000, status: 'completed' },
          { action: 'Thông báo đội PCCC nội bộ', time: now - 604796000, status: 'completed' },
          { action: 'Liên hệ 114 (Cứu hỏa)', time: now - 604795000, status: 'completed' },
          { action: 'Lửa được dập tắt hoàn toàn', time: now - 603000000, status: 'completed' }
        ]
      }
    ];
  }

  /**
   * Create new report from detection
   */
  createFromDetection(data) {
    const report = {
      id: `RPT-${new Date().getFullYear()}-${String(this.reports.length + 1).padStart(3, '0')}`,
      title: data.title || 'Sự cố phát hiện bởi AI',
      type: data.type || 'fire',
      severity: data.severity || 'warning',
      status: 'active',
      camera: data.camera,
      cameraName: data.cameraName,
      zone: data.zone || 'Chưa xác định',
      confidence: data.confidence || 0,
      description: data.description || '',
      timestamp: Date.now(),
      resolvedAt: null,
      responseTime: null,
      actions: [{
        action: `AI phát hiện ${data.type === 'fire' ? 'lửa' : 'khói'} (${data.confidence}%)`,
        time: Date.now(),
        status: 'completed'
      }]
    };

    this.reports.unshift(report);
    return report;
  }

  /**
   * Render reports table
   */
  renderReportsTable(container) {
    const filtered = this.currentFilter === 'all' 
      ? this.reports 
      : this.reports.filter(r => r.status === this.currentFilter);

    container.innerHTML = `
      <table class="report-table">
        <thead>
          <tr>
            <th>Mã báo cáo</th>
            <th>Sự cố</th>
            <th>Khu vực</th>
            <th>Mức độ</th>
            <th>Trạng thái</th>
            <th>Thời gian</th>
            <th>Phản hồi</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(r => `
            <tr onclick="window.app?.showReportDetail('${r.id}')" style="cursor:pointer">
              <td class="text-mono" style="color:var(--color-info)">${r.id}</td>
              <td>
                <div style="font-weight:500">${r.title}</div>
                <div style="font-size:0.75rem;color:var(--text-dim);margin-top:2px">${r.cameraName}</div>
              </td>
              <td>${r.zone}</td>
              <td><span class="severity-badge ${r.severity}">${r.severity === 'critical' ? 'Nghiêm trọng' : r.severity === 'warning' ? 'Cảnh báo' : 'Thấp'}</span></td>
              <td><span class="status-badge ${r.status}">${r.status === 'resolved' ? 'Đã giải quyết' : r.status === 'active' ? 'Đang xử lý' : 'Đang điều tra'}</span></td>
              <td style="font-size:0.82rem">${new Date(r.timestamp).toLocaleDateString('vi-VN')} ${new Date(r.timestamp).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</td>
              <td style="font-family:'JetBrains Mono',monospace;font-size:0.82rem">${r.responseTime || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  /**
   * Render report detail modal
   */
  renderReportDetail(reportId, container) {
    const report = this.reports.find(r => r.id === reportId);
    if (!report) return;

    container.innerHTML = `
      <div style="padding:var(--space-xl)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-xl)">
          <div>
            <h2 style="font-size:1.2rem;font-weight:700;margin-bottom:4px">${report.title}</h2>
            <span class="text-mono text-info" style="font-size:0.85rem">${report.id}</span>
          </div>
          <div style="display:flex;gap:var(--space-sm)">
            <span class="severity-badge ${report.severity}">${report.severity === 'critical' ? 'Nghiêm trọng' : report.severity === 'warning' ? 'Cảnh báo' : 'Thấp'}</span>
            <span class="status-badge ${report.status}">${report.status === 'resolved' ? 'Đã giải quyết' : 'Đang xử lý'}</span>
          </div>
        </div>

        <p style="color:var(--text-secondary);margin-bottom:var(--space-xl);line-height:1.6">${report.description}</p>

        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-md);margin-bottom:var(--space-xl)">
          <div style="background:var(--bg-glass);border-radius:var(--border-radius-md);padding:var(--space-md)">
            <div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:4px">Camera</div>
            <div style="font-weight:600">${report.cameraName}</div>
          </div>
          <div style="background:var(--bg-glass);border-radius:var(--border-radius-md);padding:var(--space-md)">
            <div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:4px">Khu vực</div>
            <div style="font-weight:600">${report.zone}</div>
          </div>
          <div style="background:var(--bg-glass);border-radius:var(--border-radius-md);padding:var(--space-md)">
            <div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:4px">Độ tin cậy AI</div>
            <div style="font-weight:600">${report.confidence}%</div>
          </div>
        </div>

        <h3 style="font-size:0.95rem;font-weight:600;margin-bottom:var(--space-md)"><i class="fas fa-list-check" style="color:var(--color-info);margin-right:8px"></i>Lịch sử xử lý</h3>
        <div style="border-left:2px solid var(--border-color);margin-left:12px;padding-left:var(--space-lg)">
          ${report.actions.map(a => `
            <div style="margin-bottom:var(--space-md);position:relative">
              <div style="position:absolute;left:-27px;top:4px;width:10px;height:10px;border-radius:50%;background:${a.status === 'completed' ? 'var(--color-success)' : a.status === 'in-progress' ? 'var(--color-warning)' : 'var(--text-dim)'}"></div>
              <div style="font-size:0.88rem;font-weight:500">${a.action}</div>
              <div style="font-size:0.75rem;color:var(--text-dim);margin-top:2px">${new Date(a.time).toLocaleTimeString('vi-VN')}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Export report as HTML
   */
  exportReport(reportId) {
    const report = this.reports.find(r => r.id === reportId);
    if (!report) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Báo cáo ${report.id}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          h1 { color: #ef4444; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #f5f5f5; }
          .badge { padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; }
          .critical { background: #fee2e2; color: #ef4444; }
          .warning { background: #fef3c7; color: #f59e0b; }
        </style>
      </head>
      <body>
        <h1>🔥 AIfirede - Báo Cáo Sự Cố</h1>
        <h2>${report.title}</h2>
        <p><strong>Mã báo cáo:</strong> ${report.id}</p>
        <p><strong>Thời gian:</strong> ${new Date(report.timestamp).toLocaleString('vi-VN')}</p>
        <p><strong>Khu vực:</strong> ${report.zone}</p>
        <p><strong>Camera:</strong> ${report.cameraName}</p>
        <p><strong>Mức độ:</strong> <span class="badge ${report.severity}">${report.severity}</span></p>
        <p>${report.description}</p>
        <h3>Lịch sử xử lý</h3>
        <table>
          <thead><tr><th>Thời gian</th><th>Hành động</th><th>Trạng thái</th></tr></thead>
          <tbody>
            ${report.actions.map(a => `<tr><td>${new Date(a.time).toLocaleTimeString('vi-VN')}</td><td>${a.action}</td><td>${a.status}</td></tr>`).join('')}
          </tbody>
        </table>
        <p style="color:#999;margin-top:40px">Báo cáo được tạo tự động bởi AIfirede - ${new Date().toLocaleString('vi-VN')}</p>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.id}_report.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Get report statistics
   */
  getStats() {
    return {
      total: this.reports.length,
      critical: this.reports.filter(r => r.severity === 'critical').length,
      resolved: this.reports.filter(r => r.status === 'resolved').length,
      active: this.reports.filter(r => r.status === 'active').length,
      avgResponseTime: '2.3s'
    };
  }

  setFilter(filter) {
    this.currentFilter = filter;
  }
}

window.ReportManager = ReportManager;
