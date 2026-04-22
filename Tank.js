/**
 * TANK.JS
 * Main application controller, state management, and event listeners.
 */

// Global State
let currentSystem = 'Tank';
let allDataset   = null;
let detailCache  = {};
let editingInvID = null;
let imageBase64  = null;
let imageFilename = '';
let filterProduct = 'all';
let debounceTimer = null;
let showFullInvoiceInfo = false;
let editingSystem = null;

// Tab Switching
function switchSystem(sys) {
  if (currentSystem === sys) return;
  currentSystem = sys;

  document.getElementById('tab-Tank').classList.remove('active');
  document.getElementById('tab-Recripte').classList.remove('active');
  document.getElementById('tab-Summary').classList.remove('active');
  document.getElementById('tab-' + sys).classList.add('active');

  const isTank = (sys === 'Tank');
  const isSumm = (sys === 'Summary');
  const isRec  = (sys === 'Recripte');
  
  document.getElementById('mainTitle').textContent = isTank ? 'ระบบส่งอัดท่อ' : isSumm ? 'สรุปข้อมูล / ยอดค้างส่ง' : 'ระบบส่งคืนท่อ';
  document.getElementById('subTitle').textContent = isTank ? 'บันทึกและติดตามการส่งอัดท่อ ไนโตรเจน / ออกซิเจน' : isSumm ? 'เปรียบเทียบยอดค้างส่งและไทม์ไลน์ล่าสุด' : 'บันทึกและติดตามการส่งคืนท่อสำเร็จ';
  
  const isAdmin = currentUser && String(currentUser.Auth).trim().toLowerCase() === 'admin';
  document.getElementById('addBtn').style.display = (isSumm || !isAdmin) ? 'none' : 'inline-flex';
  
  document.getElementById('thStatus').style.display = isSumm ? 'table-cell' : 'none';
  document.getElementById('thManage').style.display = isSumm ? 'none' : 'table-cell';

  if (!isSumm) {
    document.getElementById('addBtn').innerHTML = isTank ? '➕ เพิ่มใบส่งอัด' : '➕ เพิ่มใบส่งคืน';
    document.getElementById('addBtn').style.background = isTank 
      ? 'linear-gradient(135deg, var(--accent1), var(--accent2))' 
      : 'linear-gradient(135deg, var(--accent-rec), #f97316)';
    document.getElementById('addBtn').style.boxShadow = isTank
      ? '0 4px 18px rgba(99,179,237,0.35)'
      : '0 4px 18px rgba(234,88,12,0.35)';
  }
  if (isSumm) {
    document.getElementById('thDate').textContent = 'เลขที่ใบส่งอัด';
    document.getElementById('thInv').textContent = 'วันที่';
  } else {
    document.getElementById('thDate').textContent = 'วันที่';
    document.getElementById('thInv').textContent = isRec ? 'เลขที่ Invoice' : 'เลขที่ใบส่งอัด';
  }

  document.getElementById('tableTitleText').textContent = isTank ? 'รายการส่งอัดท่อ' : isSumm ? 'ไทม์ไลน์ล่าสุด' : 'รายการส่งคืนท่อ';
  document.getElementById('statLabel1').textContent = isTank ? 'ใบส่งอัดทั้งหมด' : 'ใบส่งคืนทั้งหมด';
  document.getElementById('cardTotal').style.display = isSumm ? 'none' : 'flex';
  
  document.getElementById('lblN2').textContent = isSumm ? 'N₂ 1.5Q ค้างส่ง' : 'N₂ 1.5Q รวม';
  document.getElementById('lblO2L').textContent = isSumm ? 'O₂ 1.5Q ค้างส่ง' : 'O₂ 1.5Q รวม';
  document.getElementById('lblO2S').textContent = isSumm ? 'O₂ 0.5Q ค้างส่ง' : 'O₂ 0.5Q รวม';

  const isGroupedRec = (sys === 'Recripte');

  // Explicitly set all headers
  document.getElementById('thExp').style.display = isTank ? 'none' : 'table-cell';
  document.getElementById('thStatus').style.display = isSumm ? 'table-cell' : 'none';
  document.getElementById('thInv').style.display = isGroupedRec ? 'none' : 'table-cell';
  document.getElementById('thImg').style.display = isGroupedRec ? 'none' : 'table-cell';
  document.getElementById('thManage').style.display = (isGroupedRec || isSumm) ? 'none' : 'table-cell';

  const table  = document.getElementById('mainTable');
  if (isSumm) table.classList.add('compact-table'); else table.classList.remove('compact-table');

  document.getElementById('summarySwitchContainer').style.display = (isSumm || isRec) ? 'flex' : 'none';
  processLocalData();
}

function toggleFullInvoiceInfo(checked) {
  showFullInvoiceInfo = checked;
  processLocalData();
}

function setProductFilter(prod, btn) {
  filterProduct = prod;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  processLocalData();
}

function clearFilters() {
  filterProduct = 'all';
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  const allBtn = document.querySelector('.filter-chip');
  if (allBtn) allBtn.classList.add('active');
  loadData();
}

function processLocalData() {
  if (!allDataset) return;
  detailCache = {}; 
  const buildCache = (arr, sys) => {
    for (const d of (arr || [])) {
      const k = sys + '_' + d.invDeliveryID;
      if (!detailCache[k]) detailCache[k] = [];
      detailCache[k].push(d);
    }
  };
  buildCache(allDataset.tankDetail, 'Tank');
  buildCache(allDataset.recDetail, 'Recripte');

  updateStats(); 
  let rowsToRender = [];

  if (currentSystem === 'Tank' || currentSystem === 'Recripte') {
    const mainArr = currentSystem === 'Tank' ? allDataset.tankMain : allDataset.recMain;
    rowsToRender = (mainArr || []).filter(r => {
      if (filterProduct === 'all') return true;
      const items = detailCache[currentSystem + '_' + r.invDeliveryID] || [];
      return items.some(it => it.product === filterProduct && it.qty > 0);
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (currentSystem === 'Recripte') {
      const groupedRecMap = {};
      for (const r of (mainArr || [])) {
        if (!groupedRecMap[r.date]) groupedRecMap[r.date] = [];
        groupedRecMap[r.date].push(r);
      }
      const groupedRecList = Object.keys(groupedRecMap).map(d => ({
        date: d,
        invoices: groupedRecMap[d]
      })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      renderRecTableGrouped(groupedRecList);
    } else {
      renderStandardTable(rowsToRender);
    }
  } else {
    const summArr = [];
    const tMain = allDataset.tankMain || [];
    for (const t of tMain) {
      if (filterProduct !== 'all') {
        const items = detailCache['Tank_' + t.invDeliveryID] || [];
        if (!items.some(it => it.product === filterProduct && it.qty > 0)) continue;
      }
      summArr.push({ type: 'Tank', date: t.date, rec: t });
    }
    const rMain = allDataset.recMain || [];
    const recByDate = {};
    for (const r of rMain) {
      if (filterProduct !== 'all') {
        const items = detailCache['Recripte_' + r.invDeliveryID] || [];
        if (!items.some(it => it.product === filterProduct && it.qty > 0)) continue;
      }
      if (!recByDate[r.date]) recByDate[r.date] = [];
      recByDate[r.date].push(r);
    }
    for (const date in recByDate) {
      summArr.push({ type: 'Recripte', date: date, invoices: recByDate[date] });
    }
    summArr.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    renderSummaryTable(summArr);
  }
}

function updateStats() {
  if (!allDataset) return;
  const isGroupedRec = (currentSystem === 'Recripte');
  const isTank = (currentSystem === 'Tank');
  const isSumm = (currentSystem === 'Summary');

  if (currentSystem === 'Tank' || currentSystem === 'Recripte') {
    const mainArr = currentSystem === 'Tank' ? allDataset.tankMain : allDataset.recMain;
    const detArr  = currentSystem === 'Tank' ? allDataset.tankDetail : allDataset.recDetail;
    document.getElementById('statTotal').textContent = (mainArr || []).length;
    let n2 =0, o2l=0, o2s=0;
    for (const r of (detArr || [])) {
      if (r.product.includes('ไนโตรเจน')) n2 += Number(r.qty) || 0;
      else if (r.product.includes('0.5')) o2s += Number(r.qty) || 0;
      else if (r.product.includes('ออกซิเจน')) o2l += Number(r.qty) || 0;
    }
    document.getElementById('statN2').textContent = n2;
    document.getElementById('statO2L').textContent = o2l;
    document.getElementById('statO2S').textContent = o2s;
  } else {
    const tMain = allDataset.tankMain || [];
    document.getElementById('statTotal').textContent = tMain.length; 
    let tN2=0, tO2L=0, tO2S=0;
    for (const r of (allDataset.tankDetail || [])) {
      if (r.product.includes('ไนโตรเจน')) tN2 += Number(r.qty) || 0;
      else if (r.product.includes('0.5')) tO2S += Number(r.qty) || 0;
      else if (r.product.includes('ออกซิเจน')) tO2L += Number(r.qty) || 0;
    }
    let rN2=0, rO2L=0, rO2S=0;
    for (const r of (allDataset.recDetail || [])) {
      if (r.product.includes('ไนโตรเจน')) rN2 += Number(r.qty) || 0;
      else if (r.product.includes('0.5')) rO2S += Number(r.qty) || 0;
      else if (r.product.includes('ออกซิเจน')) rO2L += Number(r.qty) || 0;
    }
    const outN2 = Math.max(0, tN2 - rN2);
    const outO2L = Math.max(0, tO2L - rO2L);
    const outO2S = Math.max(0, tO2S - rO2S);
    document.getElementById('statN2').textContent = outN2;
    document.getElementById('statO2L').textContent = outO2L;
    document.getElementById('statO2S').textContent = outO2S;
    
    let latestTankDate = '';
    for (const r of tMain) { if (!latestTankDate || r.date > latestTankDate) latestTankDate = r.date; }
    let lN2 = 0, lO2L = 0, lO2S = 0;
    if (latestTankDate) {
       const latestInvs = tMain.filter(r => r.date === latestTankDate).map(r => r.invDeliveryID);
       for (const r of (allDataset.tankDetail || [])) {
          if (latestInvs.includes(r.invDeliveryID)) {
             if (r.product.includes('ไนโตรเจน')) lN2 += Number(r.qty) || 0;
             else if (r.product.includes('0.5')) lO2S += Number(r.qty) || 0;
             else if (r.product.includes('ออกซิเจน')) lO2L += Number(r.qty) || 0;
          }
       }
    }
    const iconN2 = document.getElementById('statN2').parentElement.previousElementSibling;
    const iconO2L = document.getElementById('statO2L').parentElement.previousElementSibling;
    const iconO2S = document.getElementById('statO2S').parentElement.previousElementSibling;
    if (outN2 !== lN2) iconN2.classList.add('blink'); else iconN2.classList.remove('blink');
    if (outO2L !== lO2L) iconO2L.classList.add('blink'); else iconO2L.classList.remove('blink');
    if (outO2S !== lO2S) iconO2S.classList.add('blink'); else iconO2S.classList.remove('blink');
  }
}

// Modals
function openAddModal() {
  editingInvID = null;
  editingSystem = currentSystem;
  imageBase64  = null;
  imageFilename = '';
  const isTank = (editingSystem === 'Tank');
  document.getElementById('modalTitle').textContent = isTank ? '➕ เพิ่มใบส่งอัด' : '➕ เพิ่มใบส่งคืน';
  document.getElementById('fldInvLabel').textContent = isTank ? 'เลขที่ใบส่งอัด *' : 'เลขที่ Invoice *';
  document.getElementById('fldInvID').placeholder = isTank ? 'เช่น INV-2024-001' : 'เช่น REC-2024-001';
  document.getElementById('fldInvID').value = '';
  document.getElementById('fldDate').value  = getTodayStr();
  document.getElementById('fldInvID').disabled = false;
  clearQtyFields();
  resetImageUI();
  document.getElementById('existingImgWrap').innerHTML = '';
  openModal();
}

async function openEditModal(invID, sysOverride) {
  if (!allDataset) return;
  editingSystem = sysOverride || currentSystem;
  const isTank = (editingSystem === 'Tank');
  const mainArr = isTank ? allDataset.tankMain : allDataset.recMain;
  const rec = (mainArr || []).find(r => r.invDeliveryID === invID);
  if (!rec) return;

  editingInvID = invID;
  imageBase64  = null;
  imageFilename = '';
  document.getElementById('modalTitle').textContent = isTank ? '✏️ แก้ไขใบส่งอัด' : '✏️ แก้ไขใบส่งคืน';
  document.getElementById('fldInvLabel').textContent = isTank ? 'เลขที่ใบส่งอัด *' : 'เลขที่ Invoice *';
  document.getElementById('fldInvID').value    = rec.invDeliveryID;
  document.getElementById('fldDate').value     = rec.date;
  document.getElementById('fldInvID').disabled = true;
  clearQtyFields();
  resetImageUI();

  const existingWrap = document.getElementById('existingImgWrap');
  if (rec.image) {
    existingWrap.innerHTML = `<p style="font-size:.78rem;color:var(--text-muted);margin-bottom:6px;">รูปภาพปัจจุบัน (อัปโหลดใหม่เพื่อเปลี่ยน)</p>
       <img src="${esc(rec.image)}" style="max-height:120px;border-radius:8px;border:1px solid var(--border);cursor:pointer;" referrerpolicy="no-referrer" onclick="openLightbox(this.src)" />`;
  } else { existingWrap.innerHTML = ''; }

  let details = detailCache[editingSystem + '_' + invID];
  if (!details) {
    showLoading('โหลดรายการสินค้า...');
    try {
      details = await apiGet('getDetailList', { invDeliveryID: invID });
      detailCache[editingSystem + '_' + invID] = details || [];
    } catch (e) { details = []; }
    hideLoading();
  }
  populateQtyFromDetails(details);
  openModal();
}

function openModal()  { document.getElementById('mainModal').classList.add('open'); }
function closeModal() {
  document.getElementById('mainModal').classList.remove('open');
  document.getElementById('saveBtn').disabled = false;
}

function populateQtyFromDetails(details) {
  clearQtyFields();
  for (const d of (details || [])) {
    const k = labelToKey(d.product);
    if (k) document.getElementById('qty-' + k).value = d.qty;
  }
}

function clearQtyFields() {
  ['N2','O2L','O2S'].forEach(k => { document.getElementById('qty-'+k).value = ''; });
}

// Actions
async function saveRecord() {
  const invID = editingInvID || document.getElementById('fldInvID').value.trim();
  const date  = document.getElementById('fldDate').value;

  if (!invID) { showToast(editingSystem === 'Tank' ? 'กรุณากรอกเลขที่ใบส่งอัด' : 'กรุณากรอกเลขที่ Invoice', 'error'); return; }
  if (!date)  { showToast('กรุณาเลือกวันที่', 'error'); return; }

  const details = Object.entries(PRODUCT_LABEL_MAP)
    .map(([k, label]) => ({ product: label, qty: document.getElementById('qty-' + k).value }))
    .filter(d => d.qty !== '' && d.qty !== null);

  if (!details.length) { showToast('กรุณากรอกจำนวนสินค้าอย่างน้อย 1 รายการ', 'error'); return; }

  const isAdd = !editingInvID;
  if (isAdd && !imageBase64) {
    showToast('กรุณาแนบรูปภาพใบส่งอัด/ใบส่งคืน ทุกครั้ง', 'error');
    return;
  }

  // --- OPTIMISTIC UPDATE START ---
  const sys = editingSystem || currentSystem;
  
  // 1. Update Main Dataset
  const mainKey = sys === 'Tank' ? 'tankMain' : 'recMain';
  const mainArr = allDataset[mainKey];
  const newItem = {
    invDeliveryID: invID,
    date: date,
    image: imageBase64 || (isAdd ? '' : (mainArr.find(r => r.invDeliveryID === invID) || {}).image)
  };

  if (isAdd) {
    mainArr.push(newItem);
  } else {
    const idx = mainArr.findIndex(r => r.invDeliveryID === invID);
    if (idx !== -1) mainArr[idx] = newItem;
  }

  // 2. Update Details Dataset
  const detKey = sys === 'Tank' ? 'tankDetail' : 'recDetail';
  const detArr = allDataset[detKey];
  
  // Remove old details for this invID (both Add/Edit to be safe, though mostly for Edit)
  allDataset[detKey] = detArr.filter(d => d.invDeliveryID !== invID);
  
  // Add new details
  const detailObjects = details.map(d => ({
    invDeliveryID: invID,
    date: date,
    product: d.product,
    qty: Number(d.qty)
  }));
  allDataset[detKey].push(...detailObjects);

  // 3. Trigger UI Re-render immediately
  processLocalData();
  closeModal();
  showToast('อัปเดตข้อมูลในตารางแล้ว กำลังบันทึกลงเซิร์ฟเวอร์...', 'info');
  // --- OPTIMISTIC UPDATE END ---

  document.getElementById('saveBtn').disabled = true;

  try {
    const r1 = await apiPost({ action: 'saveTank', invDeliveryID: invID, date: date, imageData: imageBase64 || '', imageFilename: imageFilename || 'invoice.jpg' });
    if (r1 && r1.error) throw new Error(r1.error);
    const r2 = await apiPost({ action: 'saveDetails', invDeliveryID: invID, date: date, details: details });
    if (r2 && r2.error) throw new Error(r2.error);
    
    showToast('บันทึกสำเร็จ ✓', 'success');
    loadData(true); // Final data sync
  } catch (err) { 
    onError(err); 
  } finally { 
    document.getElementById('saveBtn').disabled = false; 
  }
}

function confirmDelete(invID, sysOverride) {
  const sys = sysOverride || currentSystem;
  const isTank = (sys === 'Tank');
  const typeText = isTank ? 'ใบส่งอัด' : 'ใบส่งคืน';
  document.getElementById('confirmText').textContent = `ลบ${typeText} "${invID}" และรายการทั้งหมดที่เกี่ยวข้อง?`;
  document.getElementById('confirmOkBtn').onclick = async () => {
    showLoading('กำลังลบข้อมูล...');
    try {
      const r = await apiPost({ action: 'deleteTank', invDeliveryID: invID }, sys);
      if (r && r.error) throw new Error(r.error);
      showToast('ลบข้อมูลสำเร็จ', 'success');
      closeConfirm();
      loadData(true);
    } catch (err) { onError(err); }
  };
  document.getElementById('confirmOverlay').classList.add('open');
}
function closeConfirm() { document.getElementById('confirmOverlay').classList.remove('open'); }

// Images
function handleImageSelect(evt) {
  const file = evt.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { showToast('ขนาดไฟล์เกิน 5 MB', 'error'); return; }
  imageFilename = file.name;
  const reader = new FileReader();
  reader.onload = e => {
    imageBase64 = e.target.result;
    document.getElementById('imgPreview').src = imageBase64;
    document.getElementById('uploadPlaceholder').style.display  = 'none';
    document.getElementById('imgPreviewWrap').style.display = 'inline-block';
  };
  reader.readAsDataURL(file);
}
function removeImage(evt) { evt.stopPropagation(); imageBase64 = null; imageFilename = ''; resetImageUI(); }
function resetImageUI() {
  document.getElementById('imgFileInput').value = '';
  document.getElementById('imgPreview').src = '';
  document.getElementById('uploadPlaceholder').style.display  = 'block';
  document.getElementById('imgPreviewWrap').style.display = 'none';
}
function setupDragDrop() {
  const zone = document.getElementById('uploadZone');
  if(!zone) return;
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) { handleImageSelect({ target: { files: [file] } }); }
  });
}

// Lightbox
function openLightbox(url) {
  document.getElementById('lightboxImg').src = url;
  document.getElementById('lightbox').classList.add('open');
}
function closeLightbox() { document.getElementById('lightbox').classList.remove('open'); }

// Loading / Toasts / Error
function showLoading(t) {
  document.getElementById('loadingText').textContent = t || 'กำลังโหลด...';
  document.getElementById('loadingOverlay').classList.add('show');
}
function hideLoading() { document.getElementById('loadingOverlay').classList.remove('show'); }
function showToast(msg, type = 'info') {
  hideLoading();
  const wrap = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  t.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${msg}`;
  wrap.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
function onError(err) {
  hideLoading();
  if(document.getElementById('saveBtn')) document.getElementById('saveBtn').disabled = false;
  showToast('เกิดข้อผิดพลาด: ' + (err.message || err), 'error');
  console.error(err);
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  loadData();
  setupDragDrop();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeLightbox(); closeModal(); closeConfirm(); }
});
