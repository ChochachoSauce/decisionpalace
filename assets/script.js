// Enhanced interactivity: particle system, SVG swap, WebAudio skull sounds, toss animation.
// This version doesn't rely on external assets for sounds — uses WebAudio synthesis.

(function(){
  document.getElementById('year')?.textContent = new Date().getFullYear();

  const tossBtn = document.getElementById('toss-btn');
  const previewBtn = document.getElementById('preview-btn');
  const resultCard = document.getElementById('resultCard');
  const handSkull = document.getElementById('skullHand');
  const neonSkull = document.getElementById('skullNeon');
  const particlesCanvas = document.getElementById('particles');

  // Particle engine (simple)
  const pCanvas = particlesCanvas;
  let pCtx, particles = [], pW=0, pH=0, pRunning=false;
  function resetCanvas(){
    pW = pCanvas.width = pCanvas.clientWidth * devicePixelRatio;
    pH = pCanvas.height = pCanvas.clientHeight * devicePixelRatio;
    pCanvas.style.width = pCanvas.clientWidth + 'px';
    pCanvas.style.height = pCanvas.clientHeight + 'px';
    pCtx = pCanvas.getContext('2d');
    pCtx.scale(devicePixelRatio, devicePixelRatio);
  }
  function spawnParticles(n){
    for(let i=0;i<n;i++){
      particles.push({
        x: Math.random()*pCanvas.clientWidth,
        y: pCanvas.clientHeight + Math.random()*40,
        vx: (Math.random()-0.5)*0.7,
        vy: - (1 + Math.random()*2),
        life: 60 + Math.random()*40,
        size: 1 + Math.random()*3,
        hue: 260 + Math.random()*80
      });
    }
    if(!pRunning) runParticles();
  }
  function runParticles(){
    pRunning = true;
    function frame(){
      pCtx.clearRect(0,0,pCanvas.clientWidth,pCanvas.clientHeight);
      for(let i=particles.length-1;i>=0;i--){
        const pt = particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.vy += 0.02; // gravity-ish
        pt.life--;
        if(pt.life<=0 || pt.y>pCanvas.clientHeight+20){ particles.splice(i,1); continue; }
        pCtx.beginPath();
        const a = Math.max(0, pt.life/100);
        pCtx.fillStyle = 'hsla(' + pt.hue + ',80% , 60%,' + (0.6*a) + ')';
        pCtx.arc(pt.x, pt.y, pt.size, 0, Math.PI*2);
        pCtx.fill();
      }
      if(particles.length>0) requestAnimationFrame(frame);
      else pRunning = false;
    }
    requestAnimationFrame(frame);
  }

  // Simple WebAudio helper functions to synthesize two short effects: toss whoosh and bone clack
  const AudioCtx = (window.AudioContext || window.webkitAudioContext) ? new (window.AudioContext || window.webkitAudioContext)() : null;
  function playWhoosh(){
    if(!AudioCtx) return;
    const now = AudioCtx.currentTime;
    const o = AudioCtx.createOscillator();
    const g = AudioCtx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(600, now);
    o.frequency.exponentialRampToValueAtTime(160, now + 0.45);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    o.connect(g); g.connect(AudioCtx.destination);
    o.start(now); o.stop(now + 0.62);
  }
  function playClack(){
    if(!AudioCtx) return;
    const now = AudioCtx.currentTime;
    // two quick noise bursts filtered
    const bufferSize = 2 * AudioCtx.sampleRate;
    const noise = AudioCtx.createBuffer(1, bufferSize, AudioCtx.sampleRate);
    const data = noise.getChannelData(0);
    for(let i=0;i<bufferSize;i++){ data[i] = (Math.random()*2-1) * Math.exp(-i/5000); }
    const src = AudioCtx.createBufferSource(); src.buffer = noise;
    const bp = AudioCtx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2200;
    const g = AudioCtx.createGain(); g.gain.value = 0.35;
    src.connect(bp); bp.connect(g); g.connect(AudioCtx.destination);
    src.start(now);
    src.stop(now + 0.18);
  }

  // Readings
  const READINGS = {
    free: [
      "A crossroads. Choose with care.",
      "A quiet owl watches — wait.",
      "Wind moves the signal; watch the second moon."
    ],
    offer420: [
      "Moonlit path: open the left door then wait three days. 🍂",
      "Silver coin flips — fortune leans toward action next week.",
      "A letter unseen will arrive; be ready to answer."
    ],
    donation: [
      "River and blade: patience now, decisive action when the tide falls.",
      "A hidden map behind the ledger. Trust the old friend.",
      "Burn the contract, not the messenger — symbolic purge required."
    ]
  };

  function pickReading(tier){
    const pool = READINGS[tier] || READINGS.free;
    return pool[Math.floor(Math.random()*pool.length)];
  }

  // Toss animation sequence
  function tossSequence(tier, question){
    // visual: add class to skull-stage for neon + transform, spawn particles, play sounds
    const stage = document.querySelector('.skull-stage');
    stage.classList.add('skull-active');
    spawnParticles(28);
    playWhoosh();

    // small wiggle on hand skull
    handSkull.style.transition = 'transform .9s cubic-bezier(.2,.9,.2,1)';
    handSkull.style.transform = 'translateY(-18px) rotate(-8deg) scale(1.04)';

    // reveal neon after short delay
    setTimeout(()=> {
      neonSkull.style.transition = 'opacity .45s ease, transform .45s ease';
      neonSkull.style.opacity = '1';
      playClack();
    }, 260);

    // settle and show reading
    setTimeout(()=> {
      stage.classList.remove('skull-active');
      neonSkull.style.opacity = '0';
      handSkull.style.transform = '';
      const result = pickReading(tier);
      resultCard.innerHTML = '<strong>Result</strong><div style="margin-top:8px">' + escapeHtml(result) + '</div>';
      // optionally log to console (or send to backend)
      console.log('Delivered result for', tier, ':', result);
    }, 1200);
  }

  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]) }); }

  // Button handlers
  tossBtn?.addEventListener('click', function(){
    const question = document.getElementById('question').value.trim();
    const tier = document.querySelector('input[name="tier"]:checked')?.value || 'free';
    if(!question){ alert('Please type a question before tossing the skull.'); return; }
    // if paid tier selected, simulate payment
    if(tier === 'offer420' || tier === 'donation'){
      simulatePayment(tier).then(()=> tossSequence(tier, question)).catch(()=> alert('Payment failed'));
    } else {
      tossSequence(tier, question);
    }
  });

  previewBtn?.addEventListener('click', function(){
    const tier = document.querySelector('input[name="tier"]:checked')?.value || 'free';
    resultCard.innerHTML = '<em>Preview:</em> ' + escapeHtml(pickReading(tier));
  });

  // simulated payment (placeholder)
  function simulatePayment(tier){ return new Promise(function(resolve){ setTimeout(resolve, 700); }); }

  // particles responsive init
  function init(){ try{ resetCanvas(); }catch(e){} }
  function resetCanvas(){
    if(!pCanvas) return;
    pCanvas.width = pCanvas.clientWidth * devicePixelRatio;
    pCanvas.height = pCanvas.clientHeight * devicePixelRatio;
    pCtx = pCanvas.getContext('2d');
    pCtx.scale(devicePixelRatio, devicePixelRatio);
  }
  window.addEventListener('resize', function(){ setTimeout(resetCanvas, 90); });

  // small gentle ambient particle spawn loop
  setInterval(()=> { if(Math.random()>0.6) spawnParticles(2); }, 900);

  // allow keyboard toss: Ctrl+Enter
  const questionEl = document.getElementById('question');
  questionEl?.addEventListener('keydown', function(e){ if(e.key==='Enter' && (e.ctrlKey||e.metaKey)) tossBtn.click(); });

  // set year
  document.getElementById('year').textContent = new Date().getFullYear();

  // initial canvas reset
  setTimeout(resetCanvas, 120);

})();
