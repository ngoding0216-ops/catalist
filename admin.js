(function(){
  // ---------- PROTOTYPE STORAGE (localStorage dibagikan dengan halaman WAB) ----------
  const LSK_ORDERS = 'luxuryDev_orders';
  const LSK_PAYMENT = 'luxuryDev_payment';
  const LSK_CMS = 'luxuryDev_cms';

  const LS = {
    get(k, fb){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch(e){ return fb; } },
    set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); return true; } catch(e){ showToast('Penyimpanan penuh — data gagal disimpan.'); return false; } }
  };

  const DEFAULT_ORDERS = [
    { id:'INV/001', client:'PT. Maju Jaya', email:'-', phone:'08123456789', service:'Web Aplikasi', total:5000000, days:0, status:'pending', brief:'Butuh sistem kasir dan manajemen stok untuk toko retail yang berkembang pesat.', proof:null, proofName:null, ts:Date.now() },
    { id:'INV/002', client:'Toko Berkah', email:'-', phone:'081298765432', service:'Landing Page', total:1500000, days:0, status:'in_progress', brief:'Ingin landing page promosi produk kue kering dengan tema islami-modern.', proof:null, proofName:null, ts:Date.now() },
    { id:'INV/003', client:'CV Sinar Abadi', email:'-', phone:'081345678901', service:'Dashboard Admin & Database', total:3500000, days:0, status:'pending', brief:'Butuh dashboard untuk memantau data karyawan dan laporan bulanan.', proof:null, proofName:null, ts:Date.now() },
    { id:'INV/004', client:'Bubur Ayam Ma Iya', email:'-', phone:'081234509876', service:'Sistem Pembayaran / QRIS', total:2000000, days:0, status:'pending', brief:'Ingin menambahkan pembayaran QRIS ke sistem kasir stan bubur ayam kami.', proof:null, proofName:null, ts:Date.now() },
    { id:'INV/005', client:'Butik Ratu Ayu', email:'-', phone:'081276543210', service:'Aplikasi Mobile', total:6000000, days:0, status:'in_progress', brief:'Aplikasi belanja online untuk butik fashion muslimah, lengkap dengan katalog dan checkout.', proof:null, proofName:null, ts:Date.now() },
    { id:'INV/006', client:'Warung Pak Slamet', email:'-', phone:'081211223344', service:'Landing Page', total:1500000, days:0, status:'ditolak', brief:'Bukti transfer yang diunggah tidak sesuai dengan total tagihan.', proof:null, proofName:null, ts:Date.now() },
    { id:'INV/007', client:'Klinik Sehat Bersama', email:'-', phone:'081255667788', service:'Web Aplikasi + Dashboard + Auth', total:8000000, days:0, status:'selesai', brief:'Sistem pendaftaran pasien dan rekam medis sederhana untuk klinik.', proof:null, proofName:null, ts:Date.now() }
  ];

  let orders = LS.get(LSK_ORDERS, null);
  if(!Array.isArray(orders)){ orders = DEFAULT_ORDERS.slice(); LS.set(LSK_ORDERS, orders); }

  const DEFAULT_PAYMENT = {
    bank:{ name:'BCA', number:'1234567890', holder:'Luxury Dev', show:true },
    qris:{ name:'Luxury Dev Studio', img:'', show:true }
  };
  const storedPay = LS.get(LSK_PAYMENT, null);
  let payment = storedPay
    ? { bank: Object.assign({}, DEFAULT_PAYMENT.bank, storedPay.bank || {}),
        qris: Object.assign({}, DEFAULT_PAYMENT.qris, storedPay.qris || {}) }
    : DEFAULT_PAYMENT;

  const DEFAULT_CMS = {
    headline:'Arsitektur Digital Kelas Elit',
    subtext:'Solusi pembuatan web & aplikasi profesional berstandar industri, dengan visual 3D interaktif yang memukau.',
    portItems:[
      { name:'Sistem Kasir Kuliner', tag:'Point of Sale · Inventori' },
      { name:'Platform Booking Butik', tag:'Booking · Payment Gateway' },
      { name:'Dashboard Manajemen Tim', tag:'Auth System · Analytics' }
    ]
  };
  const storedCms = LS.get(LSK_CMS, null);
  let cms = storedCms
    ? Object.assign({}, DEFAULT_CMS, storedCms, { portItems: Array.isArray(storedCms.portItems) ? storedCms.portItems : DEFAULT_CMS.portItems.slice() })
    : DEFAULT_CMS;

  function esc(s){
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function formatRp(n){ return 'Rp ' + Number(n||0).toLocaleString('id-ID'); }
  function statusLabel(s){
    return { pending:'Pending', in_progress:'In Progress', selesai:'Selesai', ditolak:'Ditolak' }[s] || s;
  }

  let toastTimer = null;
  function showToast(msg){
    const t = document.getElementById('toast');
    if(!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=> t.classList.remove('show'), 2600);
  }

  // ---------- TABS ----------
  const tabBtns = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.panel');
  tabBtns.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      tabBtns.forEach(b=>b.classList.remove('active'));
      panels.forEach(p=>p.classList.remove('active'));
      btn.classList.add('active');
      const panel = document.getElementById('panel-' + btn.dataset.tab);
      if(panel) panel.classList.add('active');
    });
  });

  // ---------- DATE ----------
  const todayEl = document.getElementById('todayDate');
  if(todayEl){
    todayEl.textContent = new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  }

  // ---------- RENDER STATS + TABLES ----------
  function saveOrders(){ LS.set(LSK_ORDERS, orders); }

  function renderAll(){
    const pending = orders.filter(o=>o.status==='pending');
    const inProgress = orders.filter(o=>o.status==='in_progress');
    const revenue = orders.filter(o=>o.status==='in_progress'||o.status==='selesai').reduce((s,o)=>s+o.total,0);

    document.getElementById('statRevenue').textContent = formatRp(revenue);
    document.getElementById('statPending').textContent = pending.length + ' Pending';
    document.getElementById('statActive').textContent = inProgress.length + ' Aktif';
    document.getElementById('pendingBadge').textContent = pending.length;

    renderTable(document.getElementById('liveFeedBody'), orders.slice(0,5));
    renderTable(document.getElementById('ordersBody'), getFilteredOrders());
  }

  function rowHtml(o){
    return `
      <tr>
        <td class="cell-invoice">${esc(o.id)}</td>
        <td>${esc(o.client)}</td>
        <td>${esc(o.service)}</td>
        <td class="cell-total">${formatRp(o.total)}</td>
        <td><span class="badge-status ${esc(o.status)}"><i></i>${statusLabel(o.status)}</span></td>
        <td><button class="action-btn" data-open="${esc(o.id)}">${o.status==='pending' ? 'Cek' : 'Detail'}</button></td>
      </tr>
    `;
  }

  function renderTable(tbody, list){
    if(!tbody) return;
    if(list.length === 0){
      tbody.innerHTML = '<tr><td colspan="6" class="cell-empty">Tidak ada pesanan pada kategori ini.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(rowHtml).join('');
    tbody.querySelectorAll('[data-open]').forEach(btn=>{
      btn.addEventListener('click', ()=> openDetail(btn.dataset.open));
    });
  }

  // ---------- FILTER (Pesanan tab) ----------
  let currentFilter = 'all';
  function getFilteredOrders(){
    if(currentFilter === 'all') return orders;
    return orders.filter(o=>o.status===currentFilter);
  }
  document.querySelectorAll('.filter-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderTable(document.getElementById('ordersBody'), getFilteredOrders());
    });
  });

  // ---------- DETAIL / VERIFICATION MODAL ----------
  const overlay = document.getElementById('overlay');
  const modalContent = document.getElementById('modalContent');

  function openDetail(id){
    const o = orders.find(x=>x.id===id);
    if(!o) return;

    let actionsHtml = '';
    if(o.status === 'pending'){
      actionsHtml = `
        <div class="modal-actions">
          <button class="btn-reject" id="btnReject">Tolak Pesanan</button>
          <button class="btn-validate" id="btnValidate">Validasi &amp; Mulai Proyek</button>
        </div>
        <div class="modal-note">Validasi akan mengubah status menjadi "In Progress".</div>
      `;
    } else if(o.status === 'in_progress'){
      actionsHtml = `
        <div class="modal-actions">
          <button class="btn-complete" id="btnComplete" style="flex:1;">Tandai Proyek Selesai</button>
        </div>
      `;
    } else {
      actionsHtml = `<div class="modal-note">Pesanan ini sudah berstatus "${statusLabel(o.status)}" dan tidak memerlukan tindakan lebih lanjut.</div>`;
    }

    let proofHtml = '';
    if(o.proof){
      proofHtml = `
        <div class="receipt-frame">
          <span class="lbl">Bukti Transfer Klien</span>
          <div style="text-align:center; background:var(--obsidian); padding:14px;">
            <img src="${o.proof}" alt="Bukti transfer" style="max-width:100%; max-height:420px; border:1px solid var(--line);">
            ${o.proofName ? '<div style="margin-top:10px; font-size:11.5px; color:rgba(232,220,196,0.5);" class="mono">' + esc(o.proofName) + '</div>' : ''}
          </div>
        </div>`;
    } else if(o.proofName){
      proofHtml = `
        <div class="receipt-frame">
          <span class="lbl">Bukti Transfer Klien</span>
          <div class="brief-box" style="margin-top:10px;">File: ${esc(o.proofName)}<br><span style="opacity:.5;">Pratinjau file non-gambar belum tersedia di prototype.</span></div>
        </div>`;
    } else {
      proofHtml = `
        <div class="receipt-frame">
          <span class="lbl">Bukti Transfer Klien (Contoh Demo)</span>
          <div class="receipt-mock">
            <div class="rh"><span>🏦 m-Banking</span><span>•••• Aktif</span></div>
            <div class="rb">
              <div class="check">✓</div>
              <div class="status">Transfer Berhasil</div>
              <div class="amount">${formatRp(o.total)}</div>
              <div class="meta">
                <div><span>Ke</span><span>Luxury Dev — BCA</span></div>
                <div><span>Dari</span><span>${esc(o.client)}</span></div>
                <div><span>Ref</span><span>${esc(o.id.replace('/',''))}-${Math.floor(1000+Math.random()*9000)}</span></div>
              </div>
            </div>
          </div>
        </div>`;
    }

    modalContent.innerHTML = `
      <button class="modal-close" id="closeModal">✕</button>
      <div class="eyebrow" style="margin-bottom:14px;">Verifikasi Pembayaran</div>
      <h3>Detail Pesanan</h3>

      <div style="margin-top:20px;">
        <div class="detail-row"><span class="k">Invoice ID</span><span class="v mono">${esc(o.id)}</span></div>
        <div class="detail-row"><span class="k">Nama Klien</span><span class="v">${esc(o.client)} (${esc(o.phone)})</span></div>
        <div class="detail-row"><span class="k">Email</span><span class="v">${esc(o.email || '-')}</span></div>
        <div class="detail-row"><span class="k">Layanan</span><span class="v">${esc(o.service)}</span></div>
        <div class="detail-row"><span class="k">Total Tagihan</span><span class="v mono">${formatRp(o.total)}</span></div>
        <div class="detail-row"><span class="k">Status</span><span class="v"><span class="badge-status ${esc(o.status)}"><i></i>${statusLabel(o.status)}</span></span></div>
      </div>

      <div class="brief-box"><span class="lbl">Brief Proyek</span>${esc(o.brief)}</div>

      ${proofHtml}

      ${actionsHtml}
    `;

    document.getElementById('closeModal').onclick = closeModal;

    const rejectBtn = document.getElementById('btnReject');
    const validateBtn = document.getElementById('btnValidate');
    const completeBtn = document.getElementById('btnComplete');

    if(rejectBtn) rejectBtn.onclick = ()=>{
      o.status = 'ditolak';
      closeModal();
      saveOrders();
      renderAll();
      showToast(o.id + ' ditolak.');
    };
    if(validateBtn) validateBtn.onclick = ()=>{
      o.status = 'in_progress';
      closeModal();
      saveOrders();
      renderAll();
      showToast(o.id + ' divalidasi — proyek dimulai.');
    };
    if(completeBtn) completeBtn.onclick = ()=>{
      o.status = 'selesai';
      closeModal();
      saveOrders();
      renderAll();
      showToast(o.id + ' ditandai selesai.');
    };

    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(){
    overlay.classList.remove('show');
    document.body.style.overflow = '';
  }
  overlay.addEventListener('click', (e)=>{ if(e.target === overlay) closeModal(); });
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape' && overlay.classList.contains('show')) closeModal();
  });

  // ---------- REKENING & QRIS ----------
  function showQrisPreview(src){
    const wrap = document.getElementById('qrisPreviewWrap');
    const img = document.getElementById('qrisPreview');
    if(wrap && img){ img.src = src; wrap.style.display = 'block'; }
  }

  function fileToDataURL(file, maxW, quality, cb){
    const reader = new FileReader();
    reader.onload = ()=>{
      const img = new Image();
      img.onload = ()=>{
        let w = img.width, h = img.height;
        if(w > maxW){ h = Math.round(h * maxW / w); w = maxW; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        cb(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = ()=> cb(null);
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function populateSettings(){
    document.getElementById('bankName').value = payment.bank.name;
    document.getElementById('bankNumber').value = payment.bank.number;
    document.getElementById('bankHolder').value = payment.bank.holder;
    document.getElementById('bankToggle').classList.toggle('on', !!payment.bank.show);
    document.getElementById('qrisName').value = payment.qris.name;
    document.getElementById('qrisToggle').classList.toggle('on', !!payment.qris.show);
    if(payment.qris.img) showQrisPreview(payment.qris.img);
  }

  document.getElementById('bankToggle').addEventListener('click', function(){ this.classList.toggle('on'); });
  document.getElementById('qrisToggle').addEventListener('click', function(){ this.classList.toggle('on'); });

  document.getElementById('saveBank').addEventListener('click', ()=>{
    payment.bank.name = document.getElementById('bankName').value.trim() || 'BCA';
    payment.bank.number = document.getElementById('bankNumber').value.trim() || '-';
    payment.bank.holder = document.getElementById('bankHolder').value.trim() || '-';
    payment.bank.show = document.getElementById('bankToggle').classList.contains('on');
    LS.set(LSK_PAYMENT, payment);
    showToast('Data rekening disimpan — langsung tampil di halaman klien.');
  });

  document.getElementById('saveQris').addEventListener('click', ()=>{
    payment.qris.name = document.getElementById('qrisName').value.trim() || 'QRIS';
    payment.qris.show = document.getElementById('qrisToggle').classList.contains('on');
    LS.set(LSK_PAYMENT, payment);
    showToast('Pengaturan QRIS disimpan — langsung tampil di halaman klien.');
  });

  document.getElementById('qrisUpload').addEventListener('click', ()=> document.getElementById('qrisFileInput').click());
  document.getElementById('qrisFileInput').addEventListener('change', (e)=>{
    const f = e.target.files[0];
    if(!f) return;
    if(!/^image\/(png|jpe?g|webp)$/.test(f.type)){
      alert('Format QRIS harus gambar (JPG/PNG/WebP).');
      e.target.value = '';
      return;
    }
    if(f.size > 4 * 1024 * 1024){
      alert('Ukuran gambar maksimal 4MB.');
      e.target.value = '';
      return;
    }
    document.getElementById('qrisUploadText').textContent = '📎 ' + f.name;
    fileToDataURL(f, 600, 0.85, (src)=>{
      if(src){ payment.qris.img = src; showQrisPreview(src); }
    });
  });

  // ---------- CMS ----------
  function populateCms(){
    document.getElementById('cmsHeadline').value = cms.headline || '';
    document.getElementById('cmsSubtext').value = cms.subtext || '';
  }

  document.getElementById('saveCms').addEventListener('click', ()=>{
    cms.headline = document.getElementById('cmsHeadline').value.trim();
    cms.subtext = document.getElementById('cmsSubtext').value.trim();
    LS.set(LSK_CMS, cms);
    showToast('Konten hero disimpan — langsung tampil di halaman klien.');
  });

  function renderPortList(){
    const list = document.getElementById('portList');
    if(!cms.portItems.length){
      list.innerHTML = '<div class="cms-item"><span class="name" style="opacity:0.5;">Belum ada karya ditambahkan.</span></div>';
      return;
    }
    list.innerHTML = cms.portItems.map((p,i)=>`
      <div class="cms-item">
        <div><div class="name">${esc(p.name)}</div><div class="tag mono">${esc(p.tag)}</div></div>
        <button class="del" data-idx="${i}">Hapus</button>
      </div>
    `).join('');
    list.querySelectorAll('.del').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        cms.portItems.splice(parseInt(btn.dataset.idx,10),1);
        LS.set(LSK_CMS, cms);
        renderPortList();
        showToast('Karya dihapus dari daftar.');
      });
    });
  }

  document.getElementById('addPortItem').addEventListener('click', ()=>{
    const input = document.getElementById('newPortName');
    const val = input.value.trim();
    if(!val){ showToast('Tulis nama karya terlebih dahulu.'); return; }
    cms.portItems.push({ name:val, tag:'Baru Ditambahkan' });
    LS.set(LSK_CMS, cms);
    input.value = '';
    renderPortList();
    showToast('Karya baru ditambahkan ke Portofolio.');
  });

  // ---------- LOGOUT ----------
  document.getElementById('logoutBtn').addEventListener('click', ()=>{
    if(confirm('Akhiri sesi admin ini?')){
      showToast('Sesi admin diakhiri.');
    }
  });

  // ---------- INIT ----------
  populateSettings();
  populateCms();
  renderAll();
  renderPortList();
})();