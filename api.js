/**
 * API.JS
 * Backend communication and data loading logic.
 */

async function apiGet(action, params = {}, sysOverride) {
  const url = new URL(API_URL);
  url.searchParams.set('action', action);
  url.searchParams.set('system', sysOverride || editingSystem || currentSystem);
  for (const [k, v] of Object.entries(params)) {
    if (v !== '' && v !== null && v !== undefined) url.searchParams.set(k, v);
  }
  const resp = await fetch(url.toString(), { redirect: 'follow' });
  return await resp.json();
}

async function apiPost(payload, sysOverride) {
  payload.system = sysOverride || editingSystem || currentSystem;
  const resp = await fetch(API_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
  return await resp.json();
}

async function fetchOpensheet(sheetName) {
  try {
    const res = await fetch(`${OPENSHEET_URL}/${sheetName}`);
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error("Opensheet Error:", e);
    return [];
  }
}

async function loadData(forceRefresh = false) {
  if (!allDataset || forceRefresh) {
    showLoading('กำลังโหลดข้อมูล....');
    try {
      const result = await apiGet('getAllData');
      
      allDataset = { 
        tankMain: (result.tankMain || []).map(r => ({
          invDeliveryID: String(r.invDeliveryID || '').trim(),
          date: parseDateStr(r.date),
          image: fixGDriveUrl(r.image)
        })).filter(x => x.invDeliveryID),
        
        tankDetail: (result.tankDetail || []).map(r => ({
          invDeliveryID: String(r.invDeliveryID || '').trim(),
          date: parseDateStr(r.date),
          product: String(r.product || '').trim(),
          qty: Number(r.qty) || 0
        })).filter(x => x.invDeliveryID),
        
        recMain: (result.recMain || []).map(r => ({
          invDeliveryID: String(r.invDeliveryID || '').trim(),
          date: parseDateStr(r.date),
          image: fixGDriveUrl(r.image)
        })).filter(x => x.invDeliveryID),
        
        recDetail: (result.recDetail || []).map(r => ({
          invDeliveryID: String(r.invDeliveryID || '').trim(),
          date: parseDateStr(r.date),
          product: String(r.product || '').trim(),
          qty: Number(r.qty) || 0
        })).filter(x => x.invDeliveryID)
      };

      // Strip out orphaned details (records that have a detail row but no main/header row) 
      // This prevents the stats cards from over-counting deleted invoices
      const validTankIds = new Set(allDataset.tankMain.map(r => r.invDeliveryID));
      allDataset.tankDetail = allDataset.tankDetail.filter(r => validTankIds.has(r.invDeliveryID));

      const validRecIds = new Set(allDataset.recMain.map(r => r.invDeliveryID));
      allDataset.recDetail = allDataset.recDetail.filter(r => validRecIds.has(r.invDeliveryID));
    } catch (err) {
      onError(err);
      return;
    } finally {
      hideLoading();
    }
  }
  processLocalData();
}
