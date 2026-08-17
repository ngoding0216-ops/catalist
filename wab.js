(function(){
  // ---------- 3D CUBE MOUSE ROTATION ----------
  const scene = document.getElementById('scene3d');
  const cube = document.getElementById('cubeStage');
  let rafId = null;
  let targetX = -18, targetY = 28;
  let curX = -18, curY = 28;
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function loop(){
    curX += (targetX - curX) * 0.08;
    curY += (targetY - curY) * 0.08;
    cube.style.transform = `rotateX(${curX}deg) rotateY(${curY}deg)`;
    rafId = requestAnimationFrame(loop);
  }

  if(!reduceMotion && scene){
    scene.addEventListener('mousemove', (e)=>{
      const rect = scene.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      targetY = 28 + (px - 0.5) * 70;
      targetX = -18 - (py - 0.5) * 50;
      cube.classList.remove('idle');
      if(!rafId) loop();
    });
    scene.addEventListener('mouseleave', ()=>{
      if(rafId){ cancelAnimationFrame(rafId); rafId = null; }
      cube.style.transform = '';
      cube.classList.add('idle');
    });
  }

  // ---------- PROTOTYPE STORAGE (localStorage, dibagikan dengan halaman Admin) ----------
  const LSK_ORDERS = 'luxuryDev_orders';
  const LSK_PAYMENT = 'luxuryDev_payment';
  const LSK_CMS = 'luxuryDev_cms';

  const LS = {
    get(k, fb){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch(e){ return fb; } },
    set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); return true; } catch(e){ return false; } }
  };

  function esc(s){
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  // ---------- CALCULATOR LOGIC ----------
  const opts = Array.from(document.querySelectorAll('.opt'));
  const totalPriceEl = document.getElementById('totalPrice');
  const totalDaysEl = document.getElementById('totalDays');
  const selectedListEl = document.getElementById('selectedList');
  const orderBtn = document.getElementById('orderBtn');

  let selected = [];

  function formatRp(n){ return 'Rp ' + n.toLocaleString('id-ID'); }

  function render(){
    let total = 0, days = 0;
    selected.forEach(i=>{ total += i.price; days += i.days; });

    totalPriceEl.textContent = formatRp(total);
    totalDaysEl.textContent = days + ' Hari';

    if(selected.length === 0){
      selectedListEl.innerHTML = '<div class="empty">Belum ada item dipilih.</div>';
      orderBtn.disabled = true;
    } else {
      selectedListEl.innerHTML = selected.map(i =>
        `<div class="line"><span>${esc(i.name)}</span><span class="mono">${formatRp(i.price)}</span></div>`
      ).join('');
      orderBtn.disabled = false;
    }
  }

  opts.forEach(opt=>{
    const price = parseInt(opt.dataset.price, 10);
    const days = parseInt(opt.dataset.days, 10);
    const name = opt.dataset.name;
    const box = opt.querySelector('.checkbox');

    opt.addEventListener('click', ()=>{
      const idx = selected.findIndex(a => a.name === name);
      if(idx > -1){
        selected.splice(idx,1);
        box.classList.remove('on');
      } else {
        selected.push({name, price, days});
        box.classList.add('on');
      }
      render();
    });
  });

  render();

  // ---------- CHECKOUT FLOW ----------
  const overlay = document.getElementById('overlay');
  const modalContent = document.getElementById('modalContent');
  let orderData = { name:'', email:'', phone:'', note:'', proofFile:'', proofData:null };
  let invoiceCode = '';

  function getPaymentSettings(){
    const p = LS.get(LSK_PAYMENT, null);
    if(p) return p;
    return {
      bank:{ name:'BCA', number:'1234567890', holder:'Luxury Dev', show:true },
      qris:{ name:'Luxury Dev Studio', img:'', show:true }
    };
  }

  function genInvoice(){
    const orders = LS.get(LSK_ORDERS, []);
    let code = '';
    do {
      const now = new Date();
      const ym = now.getFullYear().toString().slice(2) + String(now.getMonth()+1).padStart(2,'0');
      const rand = Math.floor(1000 + Math.random()*9000);
      code = 'LD-' + ym + '-' + rand;
    } while(orders.some(o => o.id === code));
    return code;
  }

  function getTotal(){ return selected.reduce((s,i)=>s+i.price,0); }
  function getDays(){ return selected.reduce((s,i)=>s+i.days,0); }

  function progressBar(step){
    let html = '<div class="progress-steps">';
    for(let i=1;i<=2;i++){ html += '<div class="' + (i<=step ? 'done' : '') + '"></div>'; }
    html += '</div>';
    return html;
  }

  function fileToDataURL(file, maxW, quality, cb){
    if(!/^image\//.test(file.type)){
      cb({ data:null, name:file.name });
      return;
    }
    const reader = new FileReader();
    reader.onload = ()=>{
      const img = new Image();
      img.onload = ()=>{
        let w = img.width, h = img.height;
        if(w > maxW){ h = Math.round(h * maxW / w); w = maxW; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        cb({ data: canvas.toDataURL('image/jpeg', quality), name: file.name });
      };
      img.onerror = ()=> cb({ data:null, name:file.name });
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function renderFormStep(){
    const pay = getPaymentSettings();
    let payMethods = '';

    if(pay.bank && pay.bank.show){
      payMethods += `
        <div class="method">
          <div>
            <div class="k">TRANSFER BANK — ${esc(pay.bank.name || 'BCA')}</div>
            <div class="v">${esc(pay.bank.number || '')} a.n. ${esc(pay.bank.holder || '')}</div>
          </div>
          <button class="copy-btn" id="copyRek" type="button">Salin</button>
        </div>`;
    }
    if(pay.qris && pay.qris.show){
      payMethods += `
        <div class="method qris-inline">
          ${pay.qris.img ? '<div class="qris-mini"><img src="' + pay.qris.img + '" alt="QRIS" style="width:64px;height:64px;object-fit:contain;"></div>' : ''}
          <div>
            <div class="k">QRIS — ${esc(pay.qris.name || 'QRIS')}</div>
            <div class="v">Scan untuk bayar instan</div>
          </div>
        </div>`;
    }
    if(!payMethods){
      payMethods = '<div class="k" style="color:rgba(232,220,196,0.5);">Belum ada metode pembayaran aktif.</div>';
    }

    modalContent.innerHTML = `
      <button class="modal-close" id="closeModal">✕</button>
      ${progressBar(1)}
      <div class="eyebrow step-tag">Formulir Pesanan</div>
      <h3>Data &amp; Pembayaran</h3>

      <div class="field">
        <label>Nama Lengkap</label>
        <input type="text" id="fName" placeholder="cth. Boss Syafiq" value="${esc(orderData.name)}">
      </div>
      <div class="field">
        <label>Email Aktif</label>
        <input type="email" id="fEmail" placeholder="cth. nama@domain.com" value="${esc(orderData.email)}">
      </div>
      <div class="field">
        <label>Nomor WhatsApp</label>
        <input type="text" id="fPhone" placeholder="cth. 08123456789" value="${esc(orderData.phone)}">
      </div>
      <div class="field">
        <label>Catatan / Brief Singkat (opsional)</label>
        <textarea id="fNote" placeholder="Ceritakan gambaran proyek yang kamu inginkan...">${esc(orderData.note)}</textarea>
      </div>

      <div class="field" style="margin-top:30px;">
        <label>Metode Pembayaran Aktif</label>
        <div class="pay-box">${payMethods}</div>
      </div>

      <div class="field">
        <label>Unggah Bukti Transfer (dari Local Explorer)</label>
        <div class="file-drop" id="proofDrop">
          <span id="proofDropText">${orderData.proofFile ? '📎 ' + esc(orderData.proofFile) : 'Klik untuk memilih berkas bukti transfer'}</span>
          <input type="file" id="proofFileInput" accept="image/*,.pdf">
        </div>
      </div>

      <div class="modal-summary">
        ${selected.map(i=>`<div class="row"><span>${esc(i.name)}</span><span class="mono">${formatRp(i.price)}</span></div>`).join('')}
        <div class="row total"><span>Total</span><span>${formatRp(getTotal())}</span></div>
      </div>

      <div class="modal-actions">
        <button class="btn-secondary" id="cancelForm">Batal</button>
        <button class="btn-modal-primary" id="submitForm">Kirim Pesanan Sekarang</button>
      </div>
    `;

    document.getElementById('closeModal').onclick = closeModal;
    document.getElementById('cancelForm').onclick = closeModal;

    const copyBtn = document.getElementById('copyRek');
    if(copyBtn){
      copyBtn.onclick = ()=>{
        const txt = `${pay.bank.number} a.n. ${pay.bank.holder}`;
        const flash = ()=>{
          copyBtn.textContent = 'Tersalin ✓';
          setTimeout(()=> copyBtn.textContent = 'Salin', 1500);
        };
        if(navigator.clipboard && navigator.clipboard.writeText){
          navigator.clipboard.writeText(txt).then(flash).catch(()=>{ window.prompt('Salin manual:', txt); flash(); });
        } else {
          window.prompt('Salin manual:', txt);
          flash();
        }
      };
    }

    const proofDrop = document.getElementById('proofDrop');
    const proofInput = document.getElementById('proofFileInput');
    proofDrop.onclick = ()=> proofInput.click();
    proofInput.onchange = (e)=>{
      const f = e.target.files[0];
      if(!f) return;
      if(f.size > 4 * 1024 * 1024){
        alert('Ukuran file maksimal 4MB.');
        proofInput.value = '';
        return;
      }
      if(!/^image\/(png|jpe?g|webp)$/.test(f.type) && f.type !== 'application/pdf'){
        alert('Format file harus gambar (JPG/PNG/WebP) atau PDF.');
        proofInput.value = '';
        return;
      }
      orderData.proofFile = f.name;
      fileToDataURL(f, 1000, 0.72, (res)=>{
        orderData.proofData = res.data;
        document.getElementById('proofDropText').textContent = '📎 ' + orderData.proofFile;
        proofDrop.classList.add('has-file');
      });
    };

    document.getElementById('submitForm').onclick = ()=>{
      orderData.name = document.getElementById('fName').value.trim();
      orderData.email = document.getElementById('fEmail').value.trim();
      orderData.phone = document.getElementById('fPhone').value.trim();
      orderData.note = document.getElementById('fNote').value.trim();

      if(!orderData.name || !orderData.email || !orderData.phone){
        alert('Mohon lengkapi Nama, Email, dan Nomor WhatsApp terlebih dahulu.');
        return;
      }
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(orderData.email)){
        alert('Format email tidak valid.');
        return;
      }
      if(!/^[0-9+\-\s]{8,}$/.test(orderData.phone)){
        alert('Nomor WhatsApp tidak valid (minimal 8 digit angka).');
        return;
      }
      if(!orderData.proofFile){
        alert('Mohon unggah bukti transfer sebelum mengirim pesanan.');
        return;
      }

      invoiceCode = genInvoice();
      const orders = LS.get(LSK_ORDERS, []);
      orders.unshift({
        id: invoiceCode,
        client: orderData.name,
        email: orderData.email,
        phone: orderData.phone,
        service: selected.map(i=>i.name).join(', '),
        total: getTotal(),
        days: getDays(),
        status: 'pending',
        brief: orderData.note || '-',
        proof: orderData.proofData,
        proofName: orderData.proofFile,
        ts: Date.now()
      });
      if(LS.set(LSK_ORDERS, orders)){
        renderConfirmStep();
      } else {
        alert('Penyimpanan browser penuh. Gunakan gambar yang lebih kecil sebagai bukti transfer.');
      }
    };
  }

  function renderConfirmStep(){
    modalContent.innerHTML = `
      <button class="modal-close" id="closeModal">✕</button>
      ${progressBar(2)}
      <div class="eyebrow step-tag">Selesai</div>
      <h3>Pesanan Diterima</h3>
      <p style="margin-top:14px; font-size:14px; color:rgba(232,220,196,0.65); line-height:1.7;">
        Terima kasih, ${esc(orderData.name.split(' ')[0] || 'Kak')}. Bukti pembayaranmu sudah kami terima dan sedang diverifikasi oleh Super Admin. Kami akan menghubungimu via WhatsApp dalam 1x24 jam.
      </p>

      <div class="invoice-code">
        <div class="lbl">KODE INVOICE</div>
        <div class="code">${esc(invoiceCode)}</div>
        <div class="status-badge"><span class="status-dot"></span> Menunggu Verifikasi Super Admin</div>
      </div>

      <div class="modal-summary">
        <div class="row"><span>Email</span><span>${esc(orderData.email)}</span></div>
        <div class="row"><span>WhatsApp</span><span>${esc(orderData.phone)}</span></div>
        <div class="row total"><span>Total Dibayar</span><span>${formatRp(getTotal())}</span></div>
      </div>

      <div class="modal-actions">
        <button class="btn-modal-primary" id="finishBtn" style="flex:1;">Selesai</button>
      </div>
    `;
    document.getElementById('closeModal').onclick = closeModal;
    document.getElementById('finishBtn').onclick = closeModal;
  }

  function openModal(){
    renderFormStep();
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  function closeModal(){
    overlay.classList.remove('show');
    document.body.style.overflow = '';
  }

  orderBtn.addEventListener('click', ()=>{
    if(orderBtn.disabled) return;
    openModal();
  });

  overlay.addEventListener('click', (e)=>{ if(e.target === overlay) closeModal(); });
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape' && overlay.classList.contains('show')) closeModal();
  });

  // ---------- TERAPKAN CMS DARI ADMIN (hero + portofolio) ----------
  const cms = LS.get(LSK_CMS, null);
  if(cms){
    if(cms.headline){
      const h1 = document.querySelector('.hero-copy h1');
      const parts = String(cms.headline).trim().split(/\s+/);
      if(h1 && parts.length){
        let spanWords = parts.slice(-2);
        let textWords = parts.slice(0, -2);
        if(parts.length < 3){ spanWords = parts.slice(-1); textWords = parts.slice(0, -1); }
        const span = document.createElement('span');
        span.textContent = spanWords.join(' ');
        h1.textContent = '';
        h1.appendChild(document.createTextNode(textWords.length ? textWords.join(' ') + ' ' : ''));
        h1.appendChild(span);
      }
    }
    if(cms.subtext){
      const p = document.querySelector('.hero-copy p');
      if(p) p.textContent = cms.subtext;
    }
    if(Array.isArray(cms.portItems) && cms.portItems.length){
      const grid = document.querySelector('.port-grid');
      if(grid){
        grid.innerHTML = cms.portItems.map((p,i)=>`
          <div class="port-card">
            <div>
              <div class="idx">ARSIP / ${String(i+1).padStart(3,'0')}</div>
              <h4>${esc(p.name)}</h4>
              <p>${esc(p.tag)}</p>
            </div>
            <div class="tags"><span>${esc(p.tag)}</span></div>
          </div>
        `).join('');
      }
    }
  }

})();