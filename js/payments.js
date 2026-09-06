/* Deutschraum: existing premium demo/payment UI. */
(function(runtime){runtime.payments=runtime.payments||{};runtime.payments.install=function({esc}){
  window.premium = function () {
    if (db.analytics) { db.analytics.premium = (db.analytics.premium || 0) + 1; save(); }
    const methods = [
      ['💳', 'Kreditkarte', 'Sicherer Stripe Checkout'],
      ['🅿️', 'PayPal', 'Direkt mit PayPal bezahlen'],
      ['', 'Apple Pay / Google Pay', 'Schneller Wallet-Checkout'],
      ['K', 'Klarna', 'Flexibel bezahlen'],
      ['€', 'SEPA-Lastschrift', 'Direkt vom Bankkonto']
    ];
    const buttons = methods.map(method =>
      '<button class="checkout-method" onclick="demoPay(\'' + method[1] + '\',this)">' +
        '<span class="payment-icon">' + method[0] + '</span><span>' + method[1] +
        '<span class="payment-copy">' + method[2] + '</span></span><span class="payment-badge">Sicher</span></button>'
    ).join('');
    window.open('<div class="dialog"><div class="dialog-top"><div><p class="eyebrow">DEUTSCHRAUM PREMIUM · TESTMODUS</p><h2>Demo-Zahlung</h2></div><button class="icon">✕</button></div><p>Wähle eine Zahlungsart. Es wird <strong>kein echtes Geld</strong> übertragen.</p><div class="checkout-methods">' + buttons + '</div><p id="demoPaymentResult" class="notice">Sicherer Testmodus – keine echten Zahlungsdaten erforderlich.</p></div>');
  };

  window.selectPayment = function (method) {
    const message = '„' + method + '“ ist ausgewählt. Der sichere Checkout wird nach Server-Konfiguration gestartet.';
    const dialog = document.querySelector('#modal .dialog');
    if (dialog) dialog.insertAdjacentHTML('beforeend', '<p class="notice">' + esc(message) + '</p>');
  };
  window.demoPay=function(method,button){document.querySelectorAll('.checkout-method').forEach(item=>item.disabled=true);button.classList.add('payment-success');const result=document.getElementById('demoPaymentResult');result.className='notice payment-success-message';result.innerHTML='✓ <strong>Test-Zahlung erfolgreich</strong><br>'+esc(method)+' wurde ausschließlich simuliert. Es fand keine Geldtransaktion statt.';};
};})(window.Deutschraum);
