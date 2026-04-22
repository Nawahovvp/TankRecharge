/**
 * UI-RENDERERS.JS
 * Table rendering and UI update logic.
 */

function renderStandardTable(rows) {
  const tbody = document.getElementById('mainTbody');
  document.getElementById('tableCount').textContent = `(${rows.length} รายการ)`;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="empty-icon">🔍</div><p>ไม่พบข้อมูลที่ตรงกับตัวกรอง</p></div></td></tr>`;
    return;
  }

  const getQty = (items, lbl) => {
    const f = items.filter(it => it.product === lbl);
    if (!f.length) return `<div style="text-align:center; color:var(--border)">-</div>`;
    const sumQty = f.reduce((sum, it) => sum + (it.qty || 0), 0);
    if (sumQty <= 0) return `<div style="text-align:center; color:var(--border)">-</div>`;
    const k = labelToKey(lbl);
    const cls = k === 'N2' ? 'badge-n2' : k === 'O2L' ? 'badge-o2' : 'badge-o2s';
    return `<div style="text-align:center;"><span class="badge ${cls}" style="min-width:35px; text-align:center;">${sumQty}</span></div>`;
  };

  tbody.innerHTML = rows.map(r => {
    const imgHTML = r.image
      ? `<img src="${esc(r.image)}" class="img-thumb" alt="Invoice" referrerpolicy="no-referrer" onclick="openLightbox(this.src)" />`
      : `<span class="no-image">—</span>`;
    const sid = escAttr(r.invDeliveryID);
    
    const items = detailCache[currentSystem + '_' + r.invDeliveryID] || [];

    let manageHTML = '-';
    if (currentUser && String(currentUser.Auth).trim().toLowerCase() === 'admin') {
      manageHTML = `
        <button class="btn btn-success btn-sm" onclick="openEditModal('${esc(r.invDeliveryID)}')">✏️ แก้ไข</button>
        <button class="btn btn-danger btn-sm" style="margin-left:6px;" onclick="confirmDelete('${esc(r.invDeliveryID)}')">🗑️ ลบ</button>
      `;
    }

    return `
      <tr>
        <td style="display:none;"></td>
        <td style="display:none;"></td>
        <td>${formatDisplayDate(r.date)}</td>
        <td><strong>${esc(r.invDeliveryID)}</strong></td>
        <td class="hide-mobile">${imgHTML}</td>
        <td>${getQty(items, 'ไนโตรเจน 1.5 Q')}</td>
        <td>${getQty(items, 'ออกซิเจน 1.5 Q')}</td>
        <td>${getQty(items, 'ออกซิเจน 0.5 Q')}</td>
        <td style="text-align:left;white-space:nowrap;">
          ${manageHTML}
        </td>
      </tr>`;
  }).join('');
}

function renderRecTableGrouped(groupedRows) {
  const tbody = document.getElementById('mainTbody');
  const totalCount = groupedRows.reduce((sum, g) => sum + g.invoices.length, 0);
  document.getElementById('tableCount').textContent = `(${totalCount} รายการ)`;

  if (!groupedRows.length) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="empty-icon">🔍</div><p>ไม่พบข้อมูลที่ตรงกับตัวกรอง</p></div></td></tr>`;
    return;
  }

  const getQtyLinkGroup = (invoices, lbl) => {
    let els = [];
    const k = labelToKey(lbl);
    const cls = k === 'N2' ? 'badge-n2' : k === 'O2L' ? 'badge-o2' : 'badge-o2s';
    
    for (const inv of invoices) {
      const items = detailCache['Recripte_' + inv.invDeliveryID] || [];
      const filtered = items.filter(it => it.product === lbl);
      const sumQty = filtered.reduce((sum, it) => sum + (it.qty || 0), 0);
      
      if (sumQty > 0) {
        const invIDText = showFullInvoiceInfo ? ` (${esc(inv.invDeliveryID)})` : '';
        const textContent = `${sumQty}${invIDText}`;
        let imgEmoji = '';
        if (inv.image) {
          imgEmoji = `<button onclick="openLightbox('${esc(inv.image)}'); event.stopPropagation();" 
            style="background:rgba(99,179,237,0.15); border:1px solid rgba(99,179,237,0.3); border-radius:6px; cursor:pointer; width:26px; height:26px; display:flex; align-items:center; justify-content:center; color:var(--accent1); padding:0; margin-left:6px;" title="ดูรูปภาพ">📸</button>`;
        }
        els.push(`
          <div style="margin-bottom:6px; text-align:center; display:flex; align-items:center; justify-content:center;">
            <span class="badge ${cls}" style="display:inline-flex; align-items:center; padding:4px 10px; border:1px solid rgba(255,255,255,0.1);">
              <span style="font-weight:700; font-size:1rem;">${textContent}</span>
              ${imgEmoji}
            </span>
          </div>`);
      }
    }
    return els.length > 0 ? els.join('') : `<div style="text-align:center; color:var(--border)">-</div>`;
  };

  tbody.innerHTML = groupedRows.map(g => {
    const dateID = escAttr(g.date);
    return `
      <tr style="cursor:pointer;" onclick="toggleGroupDetail('${esc(g.date)}', this)">
        <td><strong class="expand-icon" style="color:var(--accent-rec); margin-right:8px;">▶</strong></td>
        <td style="display:none;"></td>
        <td><strong style="color:var(--accent-rec);">${formatDisplayDate(g.date)}</strong></td>
        <td style="display:none;"></td>
        <td class="hide-mobile" style="display:none;"></td>
        <td>${getQtyLinkGroup(g.invoices, 'ไนโตรเจน 1.5 Q')}</td>
        <td>${getQtyLinkGroup(g.invoices, 'ออกซิเจน 1.5 Q')}</td>
        <td>${getQtyLinkGroup(g.invoices, 'ออกซิเจน 0.5 Q')}</td>
        <td style="display:none;"></td>
      </tr>
      <tr class="detail-row"><td colspan="9">
        <div class="detail-inner" id="group-detail-${dateID}">
          <div class="detail-table-wrap" id="group-detail-content-${dateID}"></div>
        </div>
      </td></tr>`;
  }).join('');
}

function renderSummaryTable(rows) {
  const tbody = document.getElementById('mainTbody');
  tbody.parentElement.classList.add('compact-table');
  document.getElementById('tableCount').textContent = `(${rows.length} รายการ)`;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="empty-icon">🔍</div><p>ไม่พบข้อมูลที่ตรงกับตัวกรอง</p></div></td></tr>`;
    return;
  }

  const getQtyTank = (items, lbl) => {
    const f = items.filter(it => it.product === lbl);
    if (!f.length) return `<div style="text-align:center; color:var(--border)">-</div>`;
    const sumQty = f.reduce((sum, it) => sum + (it.qty || 0), 0);
    if (sumQty <= 0) return `<div style="text-align:center; color:var(--border)">-</div>`;
    return `<div style="text-align:center;"><strong style="font-size:1.15rem; color:var(--accent1);">${sumQty}</strong></div>`;
  };

  const getQtyRecGroup = (invoices, lbl) => {
    const els = [];
    const statusColor = 'var(--accent-rec)';
    for (const inv of invoices) {
      const items = detailCache['Recripte_' + inv.invDeliveryID] || [];
      const filtered = items.filter(it => it.product === lbl);
      const sumQty = filtered.reduce((sum, it) => sum + (it.qty || 0), 0);
      if (sumQty > 0) {
        const invIDText = showFullInvoiceInfo ? ` (${esc(inv.invDeliveryID)})` : '';
        const textContent = `${sumQty}${invIDText}`;
        const content = inv.image 
           ? `<a href="#" onclick="openLightbox('${esc(inv.image)}'); return false;" style="color:var(--accent-rec); text-decoration:none;">${textContent} 🖼️</a>`
           : textContent;
        els.push(`<div style="margin-bottom:4px; text-align:center;"><strong style="font-size:1.15rem; color:${statusColor}; cursor:${inv.image ? 'pointer':'default'};">${content}</strong></div>`);
      }
    }
    return els.length > 0 ? els.join('') : `<div style="text-align:center; color:var(--border)">-</div>`;
  };

  tbody.innerHTML = rows.map((r, idx) => {
    if (r.type === 'Tank') {
      const items = detailCache['Tank_' + r.rec.invDeliveryID] || [];
      const imgHTML = r.rec.image ? `<img src="${esc(r.rec.image)}" class="img-thumb" style="width:36px;height:36px;" alt="Inv" referrerpolicy="no-referrer" onclick="openLightbox(this.src); event.stopPropagation();" />` : '<span class="no-image">—</span>';
      return `
         <tr class="row-tank">
           <td style="text-align:center;"></td>
           <td><span class="badge" style="background:var(--accent1);color:#000;font-size:0.7rem;padding:2px 8px;">ส่งอัด</span></td>
           <td><strong style="color:var(--text-primary);">${esc(r.rec.invDeliveryID)}</strong></td>
           <td>${formatDisplayDate(r.date)}</td>
           <td class="hide-mobile">${imgHTML}</td>
           <td style="text-align:center;">${getQtyTank(items, 'ไนโตรเจน 1.5 Q')}</td>
           <td style="text-align:center;">${getQtyTank(items, 'ออกซิเจน 1.5 Q')}</td>
           <td style="text-align:center;">${getQtyTank(items, 'ออกซิเจน 0.5 Q')}</td>
           <td style="display:none;"></td>
         </tr>`;
    } else {
      const detailID = `summ-detail-${idx}`;
      const clickHandler = `toggleSummDetail('Recripte','${esc(r.date)}',${idx},this)`;
      return `
        <tr class="row-recripte" style="cursor:pointer;" onclick="${clickHandler}">
           <td style="text-align:center;"><strong class="expand-icon" style="color:var(--text-muted);">▶</strong></td>
           <td><span class="badge" style="background:var(--accent-rec);color:#fff;font-size:0.7rem;padding:2px 8px;">ส่งคืน</span></td>
           <td style="text-align:center; color:var(--text-muted)">-</td>
           <td>${formatDisplayDate(r.date)}</td>
           <td class="hide-mobile"></td>
           <td style="text-align:center;">${getQtyRecGroup(r.invoices, 'ไนโตรเจน 1.5 Q')}</td>
           <td style="text-align:center;">${getQtyRecGroup(r.invoices, 'ออกซิเจน 1.5 Q')}</td>
           <td style="text-align:center;">${getQtyRecGroup(r.invoices, 'ออกซิเจน 0.5 Q')}</td>
           <td style="display:none;"></td>
        </tr>
        <tr class="detail-row"><td colspan="9">
          <div class="detail-inner" id="${detailID}">
            <div class="detail-table-wrap" id="${detailID}-content"></div>
          </div>
        </tr>`;
    }
  }).join('');
}

function toggleSummDetail(type, id, idx, rowEl) {
  const detailEl = document.getElementById(`summ-detail-${idx}`);
  if (!detailEl) return;
  const isOpen = detailEl.classList.toggle('open');
  const icon = rowEl.querySelector('.expand-icon');
  if (icon) {
    icon.textContent = isOpen ? '▼' : '▶';
    icon.style.color = isOpen ? 'var(--accent1)' : 'var(--text-muted)';
  }

  if (isOpen) {
    const contentWrap = document.getElementById(`summ-detail-${idx}-content`);
    let allItems = [];
    if (type === 'Tank') {
      allItems = (detailCache['Tank_' + id] || []).map(it => ({ ...it, invID: id }));
    } else {
      const date = id;
      const recInvs = (allDataset.recMain || []).filter(r => r.date === date);
      for (const inv of recInvs) {
        const det = detailCache['Recripte_' + inv.invDeliveryID] || [];
        det.forEach(d => allItems.push({ ...d, invID: inv.invDeliveryID }));
      }
    }

    if (!allItems.length) { contentWrap.innerHTML = '<p>ยังไม่มีรายการ</p>'; return; }
    const isAdmin = currentUser && String(currentUser.Auth).trim().toLowerCase() === 'admin';
    const accentColor = type === 'Tank' ? 'var(--accent1)' : 'var(--accent-rec)';

    contentWrap.innerHTML = `
      <table class="detail-sub-table">
        <thead>
          <tr>
            <th>เลขที่ใบกำกับ</th>
            <th>สินค้า</th>
            <th style="text-align:center;">จำนวน (ถัง)</th>
            ${isAdmin ? '<th style="text-align:left;">จัดการ</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${allItems.map(it => {
            let actionsHTML = '';
            if (isAdmin) {
              const editAction = `openEditModal('${esc(it.invID)}','${type}')`;
              const deleteAction = `confirmDelete('${esc(it.invID)}','${type}')`;
              actionsHTML = `
                <td style="text-align:left;">
                  <button class="btn btn-success btn-sm" style="padding:4px 8px; font-size:0.8rem;" onclick="event.stopPropagation(); ${editAction}">✏️ แก้ไข</button>
                  <button class="btn btn-danger btn-sm" style="padding:4px 8px; font-size:0.8rem; margin-left:4px;" onclick="event.stopPropagation(); ${deleteAction}">🗑️ ลบ</button>
                </td>
              `;
            }
            const cls = badgeClass(it.product);
            const colorStyle = `color:${accentColor}; font-weight:700;`;
            return `
              <tr>
                <td><strong style="${colorStyle}">${esc(it.invID)}</strong></td>
                <td><span class="badge ${cls}">${esc(it.product)}</span></td>
                <td style="text-align:center;"><strong style="${colorStyle}">${it.qty}</strong></td>
                ${actionsHTML}
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>`;
  }
}

function toggleGroupDetail(date, row) {
  const dateID = escAttr(date);
  const el = document.getElementById('group-detail-' + dateID);
  if (!el) return;
  const isOpen = el.classList.toggle('open');
  const strong = row.querySelector('.expand-icon');
  if (strong) strong.textContent = isOpen ? '▼' : '▶';

  if (isOpen) {
    const c = document.getElementById('group-detail-content-' + dateID);
    const invoices = (allDataset.recMain || []).filter(r => r.date === date);
    let allItems = [];
    for (const inv of invoices) {
      const details = detailCache['Recripte_' + inv.invDeliveryID] || [];
      details.forEach(d => allItems.push({ ...d, invID: inv.invDeliveryID }));
    }
    if (!allItems.length) { c.innerHTML = '<p>ยังไม่มีรายการ</p>'; return; }
    const isAdmin = currentUser && String(currentUser.Auth).trim().toLowerCase() === 'admin';
    c.innerHTML = `
      <table class="detail-sub-table">
        <thead>
          <tr>
            <th>เลขที่ใบกำกับ</th>
            <th>สินค้า</th>
            <th style="text-align:center;">จำนวน (ถัง)</th>
            ${isAdmin ? '<th style="text-align:left;">จัดการ</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${allItems.map(it => {
            let actionsHTML = '';
            if (isAdmin) {
              actionsHTML = `
                <td style="text-align:left;">
                  <button class="btn btn-success btn-sm" style="padding:4px 8px; font-size:0.8rem;" onclick="openEditModal('${esc(it.invID)}')">✏️ แก้ไข</button>
                  <button class="btn btn-danger btn-sm" style="padding:4px 8px; font-size:0.8rem; margin-left:4px;" onclick="confirmDelete('${esc(it.invID)}')">🗑️ ลบ</button>
                </td>
              `;
            }
            const cls = badgeClass(it.product);
            const colorStyle = cls === 'badge-n2' ? 'color:var(--accent-n2);' : cls === 'badge-o2' ? 'color:var(--accent-o2);' : 'color:var(--accent-o2s);';
            return `
              <tr>
                <td><strong style="${colorStyle}">${esc(it.invID)}</strong></td>
                <td><span class="badge ${cls}">${esc(it.product)}</span></td>
                <td style="text-align:center;"><strong style="${colorStyle}">${it.qty}</strong></td>
                ${actionsHTML}
              </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  }
}

function toggleDetail(invID, btn) {
  const el = document.getElementById('detail-' + escAttr(invID));
  if (!el) return;
  const isOpen = el.classList.toggle('open');
  btn.textContent = isOpen ? '▼' : '▶';

  if (isOpen) {
    const items = detailCache[currentSystem + '_' + invID] || [];
    const c = document.getElementById('detail-content-' + escAttr(invID));
    if (!items.length) { c.innerHTML = '<p>ยังไม่มีรายการ</p>'; return; }
    c.innerHTML = `<table class="detail-sub-table"><thead><tr><th>สินค้า</th><th style="text-align:center;">จำนวน (ถัง)</th><th>วันที่</th></tr></thead>
      <tbody>${items.map(it => {
        const cls = badgeClass(it.product);
        const colorStyle = cls === 'badge-n2' ? 'color:var(--accent-n2);' : cls === 'badge-o2' ? 'color:var(--accent-o2);' : 'color:var(--accent-o2s);';
        return `<tr>
          <td><span class="badge ${cls}">${esc(it.product)}</span></td>
          <td style="text-align:center;"><strong style="${colorStyle}">${it.qty}</strong></td>
          <td>${formatDisplayDate(it.date)}</td>
        </tr>`;
      }).join('')}</tbody></table>`;
  }
}

