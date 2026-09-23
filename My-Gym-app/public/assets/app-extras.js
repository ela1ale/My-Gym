/* ============================================================
   ProFit Extras — MINIMAL SAFE VERSION
   ============================================================ */
(function() {
  'use strict';
  try {
    console.log('✅ app-extras.js loaded (minimal)');

    // Just add toolbar buttons — nothing else
    function addToolbarButtons() {
      try {
        var tb = document.getElementById('toolbar');
        if (!tb) return;

        if (!document.getElementById('helpToolbarBtn')) {
          var b1 = document.createElement('button');
          b1.id = 'helpToolbarBtn';
          b1.className = 'btn';
          b1.innerHTML = '<span>❓</span> راهنما';
          b1.onclick = function() { alert('راهنما — بزودی'); };
          tb.appendChild(b1);
        }

        if (!document.getElementById('expToolbarBtn')) {
          var b2 = document.createElement('button');
          b2.id = 'expToolbarBtn';
          b2.className = 'btn';
          b2.innerHTML = '<span>📤</span> خروجی';
          b2.onclick = function() { alert('خروجی — بزودی'); };
          tb.appendChild(b2);
        }
      } catch(e) { console.error('addToolbarButtons error:', e); }
    }

    // Watch for toolbar changes
    var interval = setInterval(addToolbarButtons, 800);

    console.log('✅ app-extras.js ready');
  } catch(e) {
    console.error('❌ app-extras.js fatal error:', e);
  }
})();
