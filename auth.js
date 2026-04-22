/**
 * AUTH.JS
 * Authentication and session management logic.
 */

let currentUser = null;

function initAuth() {
  const saved = localStorage.getItem('tankRechargeUser');
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse user', e);
      currentUser = null;
    }
  } else {
    currentUser = null;
  }
  updateAuthUI();
}

function updateAuthUI() {
  const infoSpan = document.getElementById('headerUserInfo');
  const appWrap = document.getElementById('appWrapper');
  const loginOverlay = document.getElementById('loginOverlay');
  
  if (currentUser) {
    infoSpan.style.display = 'none';
    appWrap.style.display = 'block';
    loginOverlay.classList.remove('open');
  } else {
    infoSpan.style.display = 'none';
    appWrap.style.display = 'none';
    loginOverlay.classList.add('open');
  }
}

async function submitLogin() {
  const user = document.getElementById('loginUsername').value.trim();
  const pass = document.getElementById('loginPassword').value.trim();
  if (!user || !pass) {
    showToast('กรุณากรอกผู้ใช้และรหัสผ่าน', 'error');
    return;
  }
  
  showLoading('กำลังเข้าสู่ระบบ...');
  try {
    const res = await fetch('https://opensheet.elk.sh/1eqVoLsZxGguEbRCC5rdI4iMVtQ7CK4T3uXRdx8zE3uw/UserOxigen');
    if (!res.ok) throw new Error('ไม่สามารถเชื่อมต่อฐานข้อมูลผู้ใช้ได้');
    const usersData = await res.json();
    
    let foundUser = null;
    for (const row of usersData) {
      if (String(row.IDUser || '').trim() === user) {
        foundUser = row;
        break;
      }
    }
    
    if (foundUser) {
      const expectedPass = String(foundUser.IDUser).trim().slice(-4);
      if (pass === expectedPass) {
        currentUser = {
          IDUser: String(foundUser.IDUser || ''),
          Name: String(foundUser.Name || ''),
          Plant: String(foundUser.Plant || ''),
          PlantCode: String(foundUser.PlantCode || ''),
          Auth: String(foundUser.Auth || '')
        };
        localStorage.setItem('tankRechargeUser', JSON.stringify(currentUser));
        updateAuthUI();
        closeLoginModal();
        showToast('เข้าสู่ระบบสำเร็จ', 'success');
      } else {
        showToast('รหัสผ่านไม่ถูกต้อง', 'error');
      }
    } else {
      showToast('ไม่พบรหัสผู้ใช้งานนี้ในระบบ', 'error');
    }
  } catch (err) {
    onError(err);
  } finally {
    hideLoading();
  }
}

function logout() {
  currentUser = null;
  localStorage.removeItem('tankRechargeUser');
  updateAuthUI();
  closeSettingModal();
  showToast('ออกจากระบบแล้ว', 'info');
}

function openLoginSetting() {
  if (currentUser) {
    document.getElementById('infoIDUser').textContent = currentUser.IDUser || '—';
    document.getElementById('infoName').textContent = currentUser.Name || '—';
    document.getElementById('infoPlant').textContent = currentUser.Plant || '—';
    document.getElementById('infoPlantCode').textContent = currentUser.PlantCode || '—';
    document.getElementById('infoAuth').textContent = currentUser.Auth || '—';

    // Profile header
    const name = currentUser.Name || '?';
    const initials = name.split(' ').map(w => w.charAt(0)).join('').slice(0, 2);
    document.getElementById('profileAvatar').textContent = initials;
    document.getElementById('profileName').textContent = name;

    const roleEl = document.getElementById('profileRole');
    const isAdmin = String(currentUser.Auth || '').trim().toLowerCase() === 'admin';
    roleEl.textContent = isAdmin ? '🛡️ Admin' : '👤 User';
    roleEl.style.background = isAdmin 
      ? 'rgba(99,179,237,0.2)' 
      : 'rgba(104,211,145,0.15)';
    roleEl.style.color = isAdmin ? 'var(--accent1)' : 'var(--success)';
    roleEl.style.border = isAdmin 
      ? '1px solid rgba(99,179,237,0.3)' 
      : '1px solid rgba(104,211,145,0.3)';

    document.getElementById('settingOverlay').classList.add('open');
  } else {
    document.getElementById('loginOverlay').classList.add('open');
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
  }
}

function closeLoginModal() {
  document.getElementById('loginOverlay').classList.remove('open');
}

function closeSettingModal() {
  document.getElementById('settingOverlay').classList.remove('open');
}
