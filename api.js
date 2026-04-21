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
      const [tMain, tDet, rMain, rDet] = await Promise.all([
        fetchOpensheet('Tank'),
        fetchOpensheet('Detail_Tank'),
        fetchOpensheet('Recripte_Tank'),
        fetchOpensheet('Recripte_Detail_Tank')
      ]);

      allDataset = { 
        tankMain: (Array.isArray(tMain) ? tMain : []).map(r => ({
          invDeliveryID: String(r.InvDeliveryID || '').trim(),
          date: parseDateStr(r.Date),
          image: fixGDriveUrl(r.image)
        })).filter(x => x.invDeliveryID),
        
        tankDetail: (Array.isArray(tDet) ? tDet : []).map(r => ({
          invDeliveryID: String(r.InvDeliveryID || '').trim(),
          date: parseDateStr(r.Date),
          product: String(r.Product || '').trim(),
          qty: Number(r.Qty) || 0
        })).filter(x => x.invDeliveryID),
        
        recMain: (Array.isArray(rMain) ? rMain : []).map(r => ({
          invDeliveryID: String(r.InvoiceID || '').trim(),
          date: parseDateStr(r.Date),
          image: fixGDriveUrl(r.image)
        })).filter(x => x.invDeliveryID),
        
        recDetail: (Array.isArray(rDet) ? rDet : []).map(r => ({
          invDeliveryID: String(r.InvoiceID || '').trim(),
          date: parseDateStr(r.Date),
          product: String(r.Product || '').trim(),
          qty: Number(r.Qty) || 0
        })).filter(x => x.invDeliveryID)
      };
    } catch (err) {
      onError(err);
      return;
    } finally {
      hideLoading();
    }
  }
  processLocalData();
}
