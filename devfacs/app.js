/* DevFacs — application simple de devis et factures pour auto-entrepreneur.
 * Tout est stocké dans le navigateur (localStorage). Aucune installation. */
(function () {
  'use strict';

  const STORAGE_KEY = 'devfacs:v1';
  // Version de démonstration en ligne : pas d'impression ni de téléchargement possibles.
  const DEMO = !!window.DEVFACS_DEMO;

  const STATUS = {
    devis: {
      brouillon: 'Brouillon',
      envoye: 'Envoyé',
      accepte: 'Accepté',
      refuse: 'Refusé'
    },
    facture: {
      brouillon: 'Brouillon',
      envoye: 'À payer',
      payee: 'Payée',
      annulee: 'Annulée'
    }
  };

  const DEFAULT_SETTINGS = {
    name: '',
    activity: '',
    address: '',
    email: '',
    phone: '',
    siret: '',
    iban: '',
    bic: '',
    currency: 'EUR',
    tvaEnabled: false,
    tvaRate: 20,
    paymentDays: 30,
    quoteValidityDays: 30,
    paymentMethods: 'Virement bancaire',
    extraMentions: 'Dispensé d’immatriculation au registre du commerce et des sociétés (RCS) et au répertoire des métiers (RM).',
    revenueCap: 77700,
    contributionRate: 21.2,
    docColor: '#2457d6',
    logo: '',
    logoSize: 'moyen',
    quotePrefix: 'D',
    invoicePrefix: 'F'
  };

  // ---------------------------------------------------------------------------
  // Données
  // ---------------------------------------------------------------------------

  let state = load();

  function load() {
    let data = null;
    try {
      data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (e) { /* stockage indisponible ou corrompu */ }
    return normalize(data);
  }

  function normalize(data) {
    data = data && typeof data === 'object' ? data : {};
    return {
      settings: Object.assign({}, DEFAULT_SETTINGS, data.settings || {}),
      clients: Array.isArray(data.clients) ? data.clients : [],
      docs: Array.isArray(data.docs) ? data.docs : [],
      counters: data.counters && typeof data.counters === 'object' ? data.counters : {}
    };
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      toast('Impossible d’enregistrer : stockage du navigateur indisponible ou plein.');
      return false;
    }
  }

  // Données d'exemple pour découvrir l'application (noms et montants fictifs).
  function sampleData() {
    const today = todayISO();
    const ago = n => addDays(today, -n);
    const year = today.slice(0, 4);
    const settings = Object.assign({}, DEFAULT_SETTINGS, {
      name: 'Marie Joseph',
      activity: 'Graphiste et création de sites web',
      address: '12 rue des Flamboyants\n97110 Pointe-à-Pitre',
      email: 'contact@exemple.fr',
      phone: '0690 00 00 00',
      siret: '000 000 000 00000',
      iban: 'FR76 0000 0000 0000 0000 0000 000',
      bic: 'EXEMPLEXXX',
      paymentMethods: 'Virement bancaire, chèque'
    });
    const clients = [
      { id: 'ex-c1', name: 'Boulangerie Ti Pain', contact: 'M. Célestin', address: '5 place de la Victoire\n97110 Pointe-à-Pitre', email: 'tipain@exemple.fr', phone: '0590 00 00 01', siret: '000 000 000 00001', isPro: true },
      { id: 'ex-c2', name: 'Hôtel Bèl Solèy', contact: 'Mme Alexandre', address: 'Route de la Plage\n97118 Saint-François', email: 'direction@exemple.fr', phone: '0590 00 00 02', siret: '000 000 000 00002', isPro: true },
      { id: 'ex-c3', name: 'Jean-Marc Pierre', contact: '', address: '8 allée des Palmiers\n97190 Le Gosier', email: 'jm.pierre@exemple.fr', phone: '0690 00 00 03', siret: '', isPro: false }
    ];
    const issuer = {
      name: settings.name, activity: settings.activity, address: settings.address, email: settings.email,
      phone: settings.phone, siret: settings.siret, iban: settings.iban, bic: settings.bic
    };
    const logo = [{ desc: 'Création du logo (3 propositions)', qty: 1, unit: 'forfait', price: 450 }, { desc: 'Cartes de visite et flyer', qty: 2, unit: 'u', price: 120 }];
    const site = [
      { desc: 'Maquette et design du site (5 pages)', qty: 4, unit: 'j', price: 380 },
      { desc: 'Intégration et mise en ligne', qty: 3, unit: 'j', price: 380 },
      { desc: 'Hébergement et nom de domaine (1 an)', qty: 1, unit: 'an', price: 120 }
    ];
    let order = 0;
    const doc = (type, n, clientId, subject, lines, extra) => Object.assign({
      id: 'ex-' + type + n,
      type,
      number: (type === 'devis' ? 'D-' : 'F-') + year + '-' + String(n).padStart(3, '0'),
      clientId,
      client: Object.assign({}, clients.find(c => c.id === clientId)),
      subject,
      lines: lines.map(l => Object.assign({}, l)),
      tvaEnabled: false, tvaRate: 20, notes: '', paidDate: '', fromDevisId: '',
      dueDate: '', validUntil: '', issuer, createdAt: ++order
    }, extra);
    const docs = [
      doc('devis', 1, 'ex-c1', 'Identité visuelle', logo, { date: ago(60), validUntil: ago(30), status: 'accepte' }),
      doc('facture', 1, 'ex-c1', 'Identité visuelle', logo, { date: ago(50), dueDate: ago(20), status: 'payee', paidDate: ago(35), fromDevisId: 'ex-devis1' }),
      doc('devis', 2, 'ex-c2', 'Site vitrine de l’hôtel', site, { date: ago(45), validUntil: ago(15), status: 'accepte' }),
      doc('facture', 2, 'ex-c2', 'Site vitrine de l’hôtel', site, { date: ago(40), dueDate: ago(10), status: 'envoye', fromDevisId: 'ex-devis2' }),
      doc('facture', 3, 'ex-c3', 'Faire-part de mariage', [{ desc: 'Création graphique du faire-part', qty: 1, unit: 'forfait', price: 180 }, { desc: 'Menu et marque-places', qty: 1, unit: 'forfait', price: 90 }], { date: ago(20), dueDate: addDays(ago(20), 30), status: 'payee', paidDate: ago(5) }),
      doc('devis', 3, 'ex-c1', 'Site de commande en ligne', [{ desc: 'Conception du site de commande', qty: 5, unit: 'j', price: 380 }, { desc: 'Formation à l’utilisation', qty: 2, unit: 'h', price: 55 }], { date: ago(3), validUntil: addDays(ago(3), 30), status: 'envoye', notes: 'Acompte de 30 % à la signature.' }),
      doc('facture', 4, 'ex-c2', 'Maintenance du site', [{ desc: 'Maintenance et mises à jour', qty: 4, unit: 'h', price: 55 }], { date: ago(2), dueDate: addDays(ago(2), 30), status: 'envoye' })
    ];
    const counters = {};
    counters['devis-' + year] = 3;
    counters['facture-' + year] = 4;
    return { settings, clients, docs, counters };
  }

  function isSample() {
    return state.docs.some(d => d.id.indexOf('ex-') === 0) || state.clients.some(c => c.id.indexOf('ex-') === 0);
  }

  function isEmpty() {
    return !state.docs.length && !state.clients.length;
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // ---------------------------------------------------------------------------
  // Utilitaires
  // ---------------------------------------------------------------------------

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function num(value) {
    const n = parseFloat(String(value).replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }

  // Couleurs proposées pour les devis et factures.
  const DOC_COLORS = [
    { name: 'Bleu', value: '#2457d6' },
    { name: 'Turquoise', value: '#0f7c86' },
    { name: 'Vert', value: '#1f7a4d' },
    { name: 'Or', value: '#a87b12' },
    { name: 'Orange', value: '#c2571a' },
    { name: 'Bordeaux', value: '#9b1c31' },
    { name: 'Violet', value: '#6b3fa0' },
    { name: 'Noir', value: '#1d2330' }
  ];

  function validHex(value) {
    return /^#[0-9a-f]{6}$/i.test(value || '') ? value.toLowerCase() : DEFAULT_SETTINGS.docColor;
  }

  // Mélange une couleur #rrggbb avec une autre (amount = part de la seconde, 0 à 1).
  function mixHex(hex, other, amount) {
    const a = hex.slice(1).match(/../g).map(h => parseInt(h, 16));
    const b = other.slice(1).match(/../g).map(h => parseInt(h, 16));
    return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * amount).toString(16).padStart(2, '0')).join('');
  }

  function luminance(hex) {
    const [r, g, b] = hex.slice(1).match(/../g).map(h => {
      const c = parseInt(h, 16) / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  // Variables CSS du document : la couleur choisie, une teinte claire pour les fonds,
  // et une version assombrie si besoin pour que le texte reste lisible sur fond blanc.
  function docColorStyle(color) {
    const accent = validHex(color);
    let text = accent;
    for (let i = 1; i <= 10 && (1.05 / (luminance(text) + 0.05)) < 4.5; i++) {
      text = mixHex(accent, '#000000', i * 0.08);
    }
    return '--doc-accent:' + accent + ';--doc-accent-text:' + text + ';--doc-tint:' + mixHex(accent, '#ffffff', 0.88) + ';--doc-tint-strong:' + mixHex(accent, '#ffffff', 0.7);
  }

  // Réduit une image (logo) pour qu'elle reste légère dans le stockage du navigateur.
  function resizeImage(file, maxSize) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const w = img.naturalWidth || maxSize;
          const h = img.naturalHeight || maxSize;
          const scale = Math.min(1, maxSize / Math.max(w, h));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(w * scale));
          canvas.height = Math.max(1, Math.round(h * scale));
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          const keepAlpha = file.type !== 'image/jpeg';
          resolve(keepAlpha ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.9));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  function money(n) {
    try {
      return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: state.settings.currency || 'EUR' }).format(n || 0);
    } catch (e) {
      return (n || 0).toFixed(2) + ' ' + state.settings.currency;
    }
  }

  function todayISO() {
    const d = new Date();
    return toISO(d);
  }

  function toISO(d) {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function addDays(iso, days) {
    const [y, m, d] = iso.split('-').map(Number);
    return toISO(new Date(y, m - 1, d + Number(days || 0)));
  }

  function fmtDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return d + '/' + m + '/' + y;
  }

  function autoGrow(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 2 + 'px';
  }

  function toast(message) {
    const el = document.getElementById('toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 2500);
  }

  // Fenêtres de dialogue dans la page (remplacent alert / confirm / prompt).
  // Résout avec la valeur renvoyée par onConfirm (true par défaut), ou null si annulé.
  function openModal(opts) {
    return new Promise(resolve => {
      const prevFocus = document.activeElement;
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop no-print';
      backdrop.innerHTML = `
        <form class="modal" role="dialog" aria-modal="true" ${opts.title ? 'aria-labelledby="modal-title"' : ''} novalidate>
          ${opts.title ? `<h2 id="modal-title">${esc(opts.title)}</h2>` : ''}
          ${opts.message ? `<p class="modal-msg">${esc(opts.message)}</p>` : ''}
          ${opts.body || ''}
          <div class="btn-row modal-actions">
            ${opts.cancelText === null ? '' : `<button type="button" class="btn" data-cancel>${esc(opts.cancelText || 'Annuler')}</button>`}
            <button type="submit" class="btn ${opts.danger ? 'danger-fill' : 'primary'}">${esc(opts.confirmText || 'OK')}</button>
          </div>
        </form>`;
      document.body.appendChild(backdrop);
      const form = backdrop.querySelector('form');

      function close(value) {
        backdrop.remove();
        document.removeEventListener('keydown', onKey);
        if (prevFocus && prevFocus.focus) prevFocus.focus();
        resolve(value);
      }
      function onKey(e) {
        if (e.key === 'Escape') close(null);
      }
      document.addEventListener('keydown', onKey);
      backdrop.addEventListener('mousedown', e => { if (e.target === backdrop) close(null); });
      const cancel = form.querySelector('[data-cancel]');
      if (cancel) cancel.onclick = () => close(null);
      form.onsubmit = e => {
        e.preventDefault();
        const value = opts.onConfirm ? opts.onConfirm(form) : true;
        if (value !== false && value != null) close(value);
      };
      (form.querySelector('input, textarea, select') || form.querySelector('[type=submit]')).focus();
    });
  }

  function uiAlert(message, title) {
    return openModal({ title, message, cancelText: null });
  }

  function uiConfirm(message, opts) {
    return openModal(Object.assign({ message }, opts || {})).then(v => v === true);
  }

  // Champs du formulaire client, partagés entre la page Clients et la création rapide.
  function clientFieldsHTML(c, p) {
    return `
      <div class="field"><label for="${p}-name">Nom / Raison sociale *</label><input id="${p}-name" value="${esc(c.name)}"></div>
      <div class="field"><label for="${p}-contact">Contact</label><input id="${p}-contact" value="${esc(c.contact)}"></div>
      <div class="field full"><label for="${p}-address">Adresse</label><textarea id="${p}-address" rows="2">${esc(c.address)}</textarea></div>
      <div class="field"><label for="${p}-email">E-mail</label><input id="${p}-email" type="email" value="${esc(c.email)}"></div>
      <div class="field"><label for="${p}-phone">Téléphone</label><input id="${p}-phone" value="${esc(c.phone)}"></div>
      <div class="field"><label for="${p}-siret">SIRET (si professionnel)</label><input id="${p}-siret" value="${esc(c.siret)}"></div>
      <label class="checkbox field"><input type="checkbox" id="${p}-pro" ${c.isPro !== false ? 'checked' : ''}> Client professionnel</label>`;
  }

  function readClientFields(root, p) {
    const val = id => root.querySelector('#' + p + '-' + id).value.trim();
    return {
      name: val('name'), contact: val('contact'), address: val('address'),
      email: val('email'), phone: val('phone'), siret: val('siret'),
      isPro: root.querySelector('#' + p + '-pro').checked
    };
  }

  function emptyClient() {
    return { id: '', name: '', contact: '', address: '', email: '', phone: '', siret: '', isPro: true };
  }

  function askNewClient() {
    return openModal({
      title: 'Nouveau client',
      body: `<div class="grid cols-2">${clientFieldsHTML(emptyClient(), 'm')}</div>`,
      confirmText: 'Créer le client',
      onConfirm: form => {
        const data = readClientFields(form, 'm');
        if (!data.name) {
          form.querySelector('#m-name').focus();
          toast('Indiquez au moins le nom du client.');
          return false;
        }
        return data;
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Calculs
  // ---------------------------------------------------------------------------

  function lineTotal(line) {
    return round2(num(line.qty) * num(line.price));
  }

  function totals(doc) {
    const ht = round2(doc.lines.reduce((sum, l) => sum + lineTotal(l), 0));
    const rate = doc.tvaEnabled ? num(doc.tvaRate) : 0;
    const tva = round2(ht * rate / 100);
    return { ht, tva, ttc: round2(ht + tva), rate };
  }

  function isLate(doc) {
    return doc.type === 'facture' && doc.status === 'envoye' && doc.dueDate && doc.dueDate < todayISO();
  }

  function statusBadge(doc) {
    if (isLate(doc)) return '<span class="badge retard">En retard</span>';
    return '<span class="badge ' + esc(doc.status) + '">' + esc(STATUS[doc.type][doc.status] || doc.status) + '</span>';
  }

  // ---------------------------------------------------------------------------
  // Documents
  // ---------------------------------------------------------------------------

  function nextNumber(type, dateISO) {
    const year = (dateISO || todayISO()).slice(0, 4);
    const key = type + '-' + year;
    const n = (state.counters[key] || 0) + 1;
    state.counters[key] = n;
    const prefix = type === 'devis' ? state.settings.quotePrefix : state.settings.invoicePrefix;
    return (prefix || (type === 'devis' ? 'D' : 'F')) + '-' + year + '-' + String(n).padStart(3, '0');
  }

  function snapshotIssuer() {
    const s = state.settings;
    return {
      name: s.name, activity: s.activity, address: s.address, email: s.email,
      phone: s.phone, siret: s.siret, iban: s.iban, bic: s.bic
    };
  }

  function snapshotClient(clientId) {
    const c = state.clients.find(x => x.id === clientId);
    return c ? Object.assign({}, c) : null;
  }

  function createDoc(type, base) {
    const s = state.settings;
    const date = todayISO();
    const doc = {
      id: uid(),
      type,
      number: nextNumber(type, date),
      date,
      dueDate: type === 'facture' ? addDays(date, s.paymentDays) : '',
      validUntil: type === 'devis' ? addDays(date, s.quoteValidityDays) : '',
      clientId: '',
      client: null,
      subject: '',
      lines: [{ desc: '', qty: 1, unit: '', price: 0 }],
      tvaEnabled: !!s.tvaEnabled,
      tvaRate: s.tvaRate,
      notes: '',
      status: 'brouillon',
      paidDate: '',
      fromDevisId: '',
      issuer: snapshotIssuer(),
      createdAt: Date.now()
    };
    if (base) {
      doc.clientId = base.clientId;
      doc.client = base.client ? Object.assign({}, base.client) : snapshotClient(base.clientId);
      doc.subject = base.subject;
      doc.lines = base.lines.map(l => Object.assign({}, l));
      doc.tvaEnabled = base.tvaEnabled;
      doc.tvaRate = base.tvaRate;
      doc.notes = base.notes;
    }
    state.docs.push(doc);
    save();
    return doc;
  }

  function findDoc(id) {
    return state.docs.find(d => d.id === id);
  }

  async function deleteDoc(doc) {
    if (doc.type === 'facture') {
      // La numérotation des factures doit être continue : on ne supprime que la dernière.
      const year = doc.number.split('-').slice(-2, -1)[0];
      const key = 'facture-' + year;
      const last = state.docs
        .filter(d => d.type === 'facture' && d.number.split('-').slice(-2, -1)[0] === year)
        .sort((a, b) => b.number.localeCompare(a.number))[0];
      if (!last || last.id !== doc.id) {
        await uiAlert('Pour garder une numérotation continue (obligation légale), seule la dernière facture peut être supprimée.\n\nPour cette facture, utilisez plutôt le statut « Annulée ».', 'Suppression impossible');
        return false;
      }
      if (!await uiConfirm('Supprimer définitivement la facture ' + doc.number + ' ?', { confirmText: 'Supprimer', danger: true })) return false;
      state.counters[key] = Math.max(0, (state.counters[key] || 1) - 1);
    } else if (!await uiConfirm('Supprimer définitivement le devis ' + doc.number + ' ?', { confirmText: 'Supprimer', danger: true })) {
      return false;
    }
    state.docs = state.docs.filter(d => d.id !== doc.id);
    save();
    return true;
  }

  function convertToInvoice(devis) {
    const facture = createDoc('facture', devis);
    facture.fromDevisId = devis.id;
    devis.status = 'accepte';
    save();
    return facture;
  }

  // ---------------------------------------------------------------------------
  // Routage
  // ---------------------------------------------------------------------------

  const app = document.getElementById('app');

  function route() {
    const hash = location.hash.replace(/^#\/?/, '');
    const [page, id] = hash.split('/');
    const active = { '': 'dashboard', devis: 'devis', factures: 'factures', clients: 'clients', parametres: 'parametres', doc: null }[page];
    document.querySelectorAll('#nav a').forEach(a => {
      const doc = page === 'doc' ? findDoc(id) : null;
      const r = active || (doc ? (doc.type === 'devis' ? 'devis' : 'factures') : '');
      a.classList.toggle('active', a.dataset.route === r);
    });
    window.scrollTo(0, 0);

    switch (page) {
      case '': return renderDashboard();
      case 'devis': return renderDocList('devis');
      case 'factures': return renderDocList('facture');
      case 'clients': return renderClients(id);
      case 'parametres': return renderSettings();
      case 'doc': return renderEditor(id);
      default: location.hash = '#/';
    }
  }

  function go(hash) {
    if (location.hash === hash) route();
    else location.hash = hash;
  }

  // ---------------------------------------------------------------------------
  // Tableau de bord
  // ---------------------------------------------------------------------------

  function renderDashboard() {
    const s = state.settings;
    const year = String(new Date().getFullYear());
    const invoices = state.docs.filter(d => d.type === 'facture');
    const quotes = state.docs.filter(d => d.type === 'devis');

    const paidThisYear = invoices
      .filter(d => d.status === 'payee' && (d.paidDate || d.date).slice(0, 4) === year)
      .reduce((sum, d) => sum + totals(d).ttc, 0);
    const unpaid = invoices.filter(d => d.status === 'envoye');
    const unpaidTotal = unpaid.reduce((sum, d) => sum + totals(d).ttc, 0);
    const late = unpaid.filter(isLate);
    const pendingQuotes = quotes.filter(d => d.status === 'envoye');
    const pendingQuotesTotal = pendingQuotes.reduce((sum, d) => sum + totals(d).ht, 0);

    const cap = num(s.revenueCap);
    const pct = cap > 0 ? Math.min(100, paidThisYear / cap * 100) : 0;
    const capClass = pct >= 100 ? 'over' : pct >= 80 ? 'warn' : '';
    const contributions = round2(paidThisYear * num(s.contributionRate) / 100);

    const recent = state.docs.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 8);

    app.innerHTML = `
      <div class="page-head">
        <h1>Tableau de bord</h1>
        <div class="btn-row">
          <button class="btn primary" data-new="devis">+ Nouveau devis</button>
          <button class="btn primary" data-new="facture">+ Nouvelle facture</button>
        </div>
      </div>

      ${!s.name ? `<div class="alert info">Bienvenue ! Commencez par renseigner vos informations (nom, SIRET, adresse…) dans <a href="#/parametres">Paramètres</a> : elles apparaîtront sur vos devis et factures.
        ${isEmpty() ? `<div class="btn-row" style="margin-top:10px"><button class="btn small" id="load-sample">Voir un exemple</button></div>` : ''}</div>` : ''}
      ${isSample() ? `<div class="alert info">Vous regardez des <strong>données d’exemple</strong>. Quand vous êtes prêt, cliquez sur <button class="btn small" id="clear-sample">Effacer l’exemple</button> pour commencer avec vos propres informations.</div>` : ''}
      ${late.length ? `<div class="alert">${late.length} facture(s) en retard de paiement pour ${money(late.reduce((sum, d) => sum + totals(d).ttc, 0))}.</div>` : ''}

      <div class="stats">
        <div class="stat">
          <div class="label">Chiffre d’affaires encaissé ${year}</div>
          <div class="value">${money(paidThisYear)}</div>
          ${cap > 0 ? `<div class="progress ${capClass}"><div style="width:${pct.toFixed(1)}%"></div></div>
          <div class="sub">${pct.toFixed(0)} % du plafond (${money(cap)})</div>` : ''}
        </div>
        <div class="stat">
          <div class="label">Cotisations estimées</div>
          <div class="value">${money(contributions)}</div>
          <div class="sub">${esc(String(s.contributionRate).replace('.', ','))} % du CA encaissé</div>
        </div>
        <div class="stat">
          <div class="label">À encaisser</div>
          <div class="value">${money(unpaidTotal)}</div>
          <div class="sub">${unpaid.length} facture(s) en attente</div>
        </div>
        <div class="stat">
          <div class="label">Devis en attente</div>
          <div class="value">${money(pendingQuotesTotal)}</div>
          <div class="sub">${pendingQuotes.length} devis envoyé(s)</div>
        </div>
      </div>

      <div class="card">
        <h2>Derniers documents</h2>
        ${docTable(recent, true)}
      </div>
    `;
    bindNewButtons();
    bindDocRows();
    const loadBtn = document.getElementById('load-sample');
    if (loadBtn) {
      loadBtn.onclick = () => {
        state = normalize(sampleData());
        save();
        toast('Exemple chargé');
        renderDashboard();
      };
    }
    const clearBtn = document.getElementById('clear-sample');
    if (clearBtn) {
      clearBtn.onclick = async () => {
        if (!await uiConfirm('Effacer toutes les données d’exemple pour commencer avec les vôtres ?', { confirmText: 'Effacer l’exemple', danger: true })) return;
        state = normalize(null);
        save();
        toast('Exemple effacé');
        go('#/parametres');
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Listes devis / factures
  // ---------------------------------------------------------------------------

  function docTable(docs, showType) {
    if (!docs.length) return '<div class="empty">Aucun document pour le moment.</div>';
    return `
      <div class="table-wrap"><table class="list">
        <thead><tr>
          <th>Numéro</th>${showType ? '<th>Type</th>' : ''}<th>Client</th><th>Date</th><th>Statut</th><th class="num">Montant</th>
        </tr></thead>
        <tbody>
          ${docs.map(d => `
            <tr class="clickable" data-open="${esc(d.id)}">
              <td><strong>${esc(d.number)}</strong>${d.subject ? `<div class="hint">${esc(d.subject)}</div>` : ''}</td>
              ${showType ? `<td>${d.type === 'devis' ? 'Devis' : 'Facture'}</td>` : ''}
              <td>${esc(d.client ? d.client.name : '—')}</td>
              <td>${fmtDate(d.date)}</td>
              <td>${statusBadge(d)}</td>
              <td class="num">${money(totals(d).ttc)}</td>
            </tr>`).join('')}
        </tbody>
      </table></div>`;
  }

  function renderDocList(type) {
    const filter = renderDocList.filter[type] || 'tous';
    const search = (renderDocList.search[type] || '').toLowerCase();
    let docs = state.docs.filter(d => d.type === type);
    if (filter === 'retard') docs = docs.filter(isLate);
    else if (filter !== 'tous') docs = docs.filter(d => d.status === filter);
    if (search) {
      docs = docs.filter(d => (d.number + ' ' + (d.client ? d.client.name : '') + ' ' + d.subject).toLowerCase().includes(search));
    }
    docs.sort((a, b) => b.number.localeCompare(a.number));

    const options = Object.assign({ tous: 'Tous' }, STATUS[type], type === 'facture' ? { retard: 'En retard' } : {});

    app.innerHTML = `
      <div class="page-head">
        <h1>${type === 'devis' ? 'Devis' : 'Factures'}</h1>
        <button class="btn primary" data-new="${type}">+ ${type === 'devis' ? 'Nouveau devis' : 'Nouvelle facture'}</button>
      </div>
      <div class="card">
        <div class="grid cols-2" style="margin-bottom:12px">
          <input id="search" type="search" placeholder="Rechercher (numéro, client, objet)…" value="${esc(renderDocList.search[type] || '')}">
          <select id="filter">
            ${Object.keys(options).map(k => `<option value="${k}" ${k === filter ? 'selected' : ''}>${options[k]}</option>`).join('')}
          </select>
        </div>
        ${docTable(docs, false)}
      </div>`;

    bindNewButtons();
    bindDocRows();
    document.getElementById('filter').onchange = e => {
      renderDocList.filter[type] = e.target.value;
      renderDocList(type);
    };
    const searchInput = document.getElementById('search');
    searchInput.oninput = e => {
      renderDocList.search[type] = e.target.value;
      renderDocList(type);
      const again = document.getElementById('search');
      again.focus();
      again.setSelectionRange(again.value.length, again.value.length);
    };
  }
  renderDocList.filter = {};
  renderDocList.search = {};

  function bindNewButtons() {
    app.querySelectorAll('[data-new]').forEach(btn => {
      btn.onclick = () => {
        const doc = createDoc(btn.dataset.new);
        go('#/doc/' + doc.id);
      };
    });
  }

  function bindDocRows() {
    app.querySelectorAll('[data-open]').forEach(row => {
      row.onclick = () => go('#/doc/' + row.dataset.open);
    });
  }

  // ---------------------------------------------------------------------------
  // Éditeur de devis / facture
  // ---------------------------------------------------------------------------

  function renderEditor(id) {
    const doc = findDoc(id);
    if (!doc) { go('#/'); return; }
    const isQuote = doc.type === 'devis';
    const statuses = STATUS[doc.type];

    app.innerHTML = `
      <div class="page-head no-print">
        <h1>${isQuote ? 'Devis' : 'Facture'} ${esc(doc.number)}</h1>
        <div class="btn-row">
          <button class="btn primary" id="print">Imprimer / PDF</button>
          ${isQuote ? '<button class="btn primary" id="convert">Transformer en facture</button>' : ''}
          <button class="btn" id="duplicate">Dupliquer</button>
          <button class="btn danger" id="delete">Supprimer</button>
        </div>
      </div>

      <div class="editor">
        <div class="no-print">
          <div class="card">
            <div class="grid cols-2">
              <div class="field">
                <label for="f-client">Client</label>
                <select id="f-client">
                  <option value="">— Choisir un client —</option>
                  ${state.clients.map(c => `<option value="${esc(c.id)}" ${c.id === doc.clientId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
                  <option value="__new">+ Nouveau client…</option>
                </select>
              </div>
              <div class="field">
                <label for="f-status">Statut</label>
                <select id="f-status">
                  ${Object.keys(statuses).map(k => `<option value="${k}" ${k === doc.status ? 'selected' : ''}>${statuses[k]}</option>`).join('')}
                </select>
              </div>
              <div class="field">
                <label for="f-date">Date</label>
                <input id="f-date" type="date" value="${esc(doc.date)}">
              </div>
              <div class="field">
                ${isQuote
                  ? `<label for="f-valid">Valable jusqu’au</label><input id="f-valid" type="date" value="${esc(doc.validUntil)}">`
                  : `<label for="f-due">Échéance de paiement</label><input id="f-due" type="date" value="${esc(doc.dueDate)}">`}
              </div>
              ${!isQuote ? `
              <div class="field" id="paid-field" style="${doc.status === 'payee' ? '' : 'display:none'}">
                <label for="f-paid">Date de paiement</label>
                <input id="f-paid" type="date" value="${esc(doc.paidDate)}">
              </div>` : ''}
              <div class="field full">
                <label for="f-subject">Objet</label>
                <input id="f-subject" type="text" placeholder="Ex. : Création d’un site vitrine" value="${esc(doc.subject)}">
              </div>
            </div>
          </div>

          <div class="card">
            <h2>Prestations</h2>
            <div id="lines"></div>
            <button class="btn small" id="add-line" style="margin-top:8px">+ Ajouter une ligne</button>
          </div>

          <div class="card">
            <div class="grid cols-2">
              <label class="checkbox field"><input type="checkbox" id="f-tva" ${doc.tvaEnabled ? 'checked' : ''}> Appliquer la TVA</label>
              <div class="field" id="tva-rate-field" style="${doc.tvaEnabled ? '' : 'display:none'}">
                <label for="f-tva-rate">Taux de TVA (%)</label>
                <input id="f-tva-rate" type="number" step="0.1" min="0" value="${esc(doc.tvaRate)}">
              </div>
              <div class="field full">
                <label for="f-notes">Notes (visibles sur le document)</label>
                <textarea id="f-notes" placeholder="Ex. : Acompte de 30 % à la commande.">${esc(doc.notes)}</textarea>
              </div>
            </div>
            ${!doc.tvaEnabled ? '<p class="hint">Sans TVA, la mention « TVA non applicable, art. 293 B du CGI » est ajoutée automatiquement.</p>' : ''}
          </div>
        </div>

        <div class="preview-wrap">
          <div class="paper" id="preview"></div>
        </div>
      </div>`;

    const $ = sel => document.getElementById(sel);

    function touch() {
      // Tant que le document est en brouillon, on garde les infos émetteur à jour.
      if (doc.status === 'brouillon') doc.issuer = snapshotIssuer();
      save();
      $('preview').innerHTML = paperHTML(doc);
    }

    function renderLines() {
      $('lines').innerHTML = `
        <table class="lines-table">
          <thead><tr>
            <th>Description</th><th class="col-qty">Qté</th><th class="col-unit">Unité</th>
            <th class="col-price">Prix unit. HT</th><th class="col-total" style="text-align:right">Total</th><th class="col-del"></th>
          </tr></thead>
          <tbody>
            ${doc.lines.map((l, i) => `
              <tr data-i="${i}">
                <td><textarea rows="1" data-k="desc" placeholder="Description de la prestation">${esc(l.desc)}</textarea></td>
                <td class="col-qty"><input data-k="qty" type="text" inputmode="decimal" value="${esc(l.qty)}" aria-label="Quantité"></td>
                <td class="col-unit"><input data-k="unit" type="text" placeholder="h, j, u…" value="${esc(l.unit)}" aria-label="Unité"></td>
                <td class="col-price"><input data-k="price" type="text" inputmode="decimal" value="${esc(l.price)}" aria-label="Prix unitaire"></td>
                <td class="total col-total">${money(lineTotal(l))}</td>
                <td class="col-del"><button class="icon-btn" data-del="${i}" title="Supprimer la ligne" aria-label="Supprimer la ligne">×</button></td>
              </tr>`).join('')}
          </tbody>
        </table>`;

      $('lines').querySelectorAll('tr[data-i]').forEach(row => {
        const i = Number(row.dataset.i);
        row.querySelectorAll('[data-k]').forEach(input => {
          if (input.tagName === 'TEXTAREA') autoGrow(input);
          input.oninput = () => {
            if (input.tagName === 'TEXTAREA') autoGrow(input);
            doc.lines[i][input.dataset.k] = input.value;
            row.querySelector('.total').textContent = money(lineTotal(doc.lines[i]));
            touch();
          };
        });
      });
      $('lines').querySelectorAll('[data-del]').forEach(btn => {
        btn.onclick = () => {
          doc.lines.splice(Number(btn.dataset.del), 1);
          if (!doc.lines.length) doc.lines.push({ desc: '', qty: 1, unit: '', price: 0 });
          renderLines();
          touch();
        };
      });
    }

    $('add-line').onclick = () => {
      doc.lines.push({ desc: '', qty: 1, unit: '', price: 0 });
      renderLines();
      touch();
      const rows = $('lines').querySelectorAll('textarea[data-k="desc"]');
      rows[rows.length - 1].focus();
    };

    $('f-client').onchange = e => {
      if (e.target.value === '__new') {
        e.target.value = doc.clientId;
        askNewClient().then(data => {
          if (!data) return;
          const client = Object.assign({ id: uid() }, data);
          state.clients.push(client);
          doc.clientId = client.id;
          doc.client = snapshotClient(client.id);
          save();
          toast('Client « ' + client.name + ' » créé');
          renderEditor(doc.id);
        });
        return;
      }
      doc.clientId = e.target.value;
      doc.client = snapshotClient(doc.clientId);
      touch();
    };

    $('f-status').onchange = e => {
      doc.status = e.target.value;
      if (doc.status === 'payee' && !doc.paidDate) {
        doc.paidDate = todayISO();
        $('f-paid').value = doc.paidDate;
      }
      if ($('paid-field')) $('paid-field').style.display = doc.status === 'payee' ? '' : 'none';
      touch();
    };

    $('f-date').onchange = e => {
      doc.date = e.target.value;
      touch();
    };
    if ($('f-valid')) $('f-valid').onchange = e => { doc.validUntil = e.target.value; touch(); };
    if ($('f-due')) $('f-due').onchange = e => { doc.dueDate = e.target.value; touch(); };
    if ($('f-paid')) $('f-paid').onchange = e => { doc.paidDate = e.target.value; touch(); };
    $('f-subject').oninput = e => { doc.subject = e.target.value; touch(); };
    $('f-notes').oninput = e => { doc.notes = e.target.value; touch(); };
    $('f-tva').onchange = e => {
      doc.tvaEnabled = e.target.checked;
      touch();
      renderEditor(doc.id);
    };
    $('f-tva-rate').oninput = e => { doc.tvaRate = e.target.value; touch(); };

    $('print').onclick = () => {
      if (DEMO) {
        uiAlert('Cette version de démonstration ne peut pas ouvrir la fenêtre d’impression.\n\nDans l’application installée sur votre ordinateur, ce bouton imprime le document ou l’enregistre en PDF (choisissez « Enregistrer au format PDF »).', 'Imprimer / PDF');
        return;
      }
      window.print();
    };
    $('duplicate').onclick = () => {
      const copy = createDoc(doc.type, doc);
      toast('Copie créée : ' + copy.number);
      go('#/doc/' + copy.id);
    };
    $('delete').onclick = async () => {
      if (await deleteDoc(doc)) {
        toast('Document supprimé');
        go(doc.type === 'devis' ? '#/devis' : '#/factures');
      }
    };
    if ($('convert')) {
      $('convert').onclick = async () => {
        const existing = state.docs.find(d => d.fromDevisId === doc.id);
        if (existing && !await uiConfirm('Une facture (' + existing.number + ') a déjà été créée depuis ce devis. En créer une autre ?', { confirmText: 'Créer une autre facture' })) return;
        const facture = convertToInvoice(doc);
        toast('Facture ' + facture.number + ' créée');
        go('#/doc/' + facture.id);
      };
    }

    renderLines();
    $('preview').innerHTML = paperHTML(doc);
  }

  // ---------------------------------------------------------------------------
  // Rendu du document (aperçu + impression)
  // ---------------------------------------------------------------------------

  function paperHTML(doc) {
    const s = state.settings;
    const me = doc.issuer || snapshotIssuer();
    const c = doc.client;
    const t = totals(doc);
    const isQuote = doc.type === 'devis';
    const origin = doc.fromDevisId ? findDoc(doc.fromDevisId) : null;

    const mentions = [];
    if (!doc.tvaEnabled) mentions.push('TVA non applicable, art. 293 B du CGI.');
    if (isQuote) {
      if (doc.validUntil) mentions.push('Devis valable jusqu’au ' + fmtDate(doc.validUntil) + '.');
      mentions.push('Devis gratuit.');
    } else {
      if (doc.dueDate) mentions.push('Date d’échéance : ' + fmtDate(doc.dueDate) + '.');
      if (s.paymentMethods) mentions.push('Moyens de paiement acceptés : ' + s.paymentMethods + '.');
      mentions.push('Pas d’escompte pour paiement anticipé.');
      mentions.push('En cas de retard de paiement, des pénalités seront exigibles au taux de 3 fois le taux d’intérêt légal' +
        (c && c.isPro === false ? '.' : ', ainsi qu’une indemnité forfaitaire pour frais de recouvrement de 40 € (art. L441-10 du Code de commerce).'));
    }
    if (s.extraMentions) mentions.push(s.extraMentions);

    return `<div class="doc" style="${docColorStyle(s.docColor)}">
      <div class="doc-head">
        <div class="issuer">
          ${s.logo ? `<img class="logo logo-${esc(s.logoSize || 'moyen')}" src="${esc(s.logo)}" alt="Logo">` : ''}
          <strong>${esc(me.name || 'Votre nom (à renseigner dans Paramètres)')}${me.name && !/\bEI\b/.test(me.name) ? ' EI' : ''}</strong><br>
          ${me.activity ? esc(me.activity) + '<br>' : ''}
          ${esc(me.address).replace(/\n/g, '<br>')}${me.address ? '<br>' : ''}
          ${me.phone ? 'Tél. : ' + esc(me.phone) + '<br>' : ''}
          ${me.email ? esc(me.email) + '<br>' : ''}
          ${me.siret ? 'SIRET : ' + esc(me.siret) : ''}
        </div>
        <div class="doc-title">
          <h2>${isQuote ? 'DEVIS' : 'FACTURE'}</h2>
          <div class="meta">
            N° <strong>${esc(doc.number)}</strong><br>
            Date : ${fmtDate(doc.date)}<br>
            ${origin ? 'Réf. devis : ' + esc(origin.number) + '<br>' : ''}
          </div>
        </div>
      </div>

      <div class="client-box">
        <div class="lbl">${isQuote ? 'Destinataire' : 'Facturé à'}</div>
        ${c ? `
          <strong>${esc(c.name)}</strong><br>
          ${c.contact ? esc(c.contact) + '<br>' : ''}
          ${esc(c.address).replace(/\n/g, '<br>')}${c.address ? '<br>' : ''}
          ${c.email ? esc(c.email) + '<br>' : ''}
          ${c.siret ? 'SIRET : ' + esc(c.siret) : ''}
        ` : '<em>Aucun client sélectionné</em>'}
      </div>

      ${doc.subject ? `<div class="subject"><strong>Objet :</strong> ${esc(doc.subject)}</div>` : ''}

      <table class="items">
        <thead><tr><th>Description</th><th class="r">Qté</th><th class="r">Prix unit. HT</th><th class="r">Total HT</th></tr></thead>
        <tbody>
          ${doc.lines.filter(l => l.desc || num(l.price)).map(l => `
            <tr>
              <td>${esc(l.desc)}</td>
              <td class="r">${esc(String(num(l.qty)).replace('.', ','))}${l.unit ? ' ' + esc(l.unit) : ''}</td>
              <td class="r">${money(num(l.price))}</td>
              <td class="r">${money(lineTotal(l))}</td>
            </tr>`).join('') || '<tr><td colspan="4" style="color:#999">Ajoutez vos prestations…</td></tr>'}
        </tbody>
      </table>

      <div class="totals">
        ${doc.tvaEnabled ? `
          <div><span>Total HT</span><span>${money(t.ht)}</span></div>
          <div><span>TVA ${esc(String(t.rate).replace('.', ','))} %</span><span>${money(t.tva)}</span></div>
          <div class="grand"><span>Total TTC</span><span>${money(t.ttc)}</span></div>
        ` : `
          <div class="grand"><span>${isQuote ? 'Total' : 'Net à payer'}</span><span>${money(t.ttc)}</span></div>
        `}
      </div>

      ${doc.type === 'facture' && doc.status === 'payee' ? `<div class="paid-stamp">PAYÉE${doc.paidDate ? ' le ' + fmtDate(doc.paidDate) : ''}</div>` : ''}

      ${doc.notes ? `<div class="notes">${esc(doc.notes)}</div>` : ''}

      ${!isQuote && me.iban ? `<div class="notes"><strong>Coordonnées bancaires</strong><br>IBAN : ${esc(me.iban)}${me.bic ? '<br>BIC : ' + esc(me.bic) : ''}</div>` : ''}

      ${isQuote ? `<div class="signature"><div>Bon pour accord — date et signature du client :</div></div>` : ''}

      <div class="mentions">${esc(mentions.join('\n'))}</div>
    </div>`;
  }

  // ---------------------------------------------------------------------------
  // Clients
  // ---------------------------------------------------------------------------

  function renderClients(editId) {
    const editing = editId === 'nouveau' ? emptyClient() : state.clients.find(c => c.id === editId);

    const list = state.clients.slice().sort((a, b) => a.name.localeCompare(b.name, 'fr'));

    app.innerHTML = `
      <div class="page-head">
        <h1>Clients</h1>
        <a class="btn primary" href="#/clients/nouveau">+ Nouveau client</a>
      </div>

      ${editing ? `
        <div class="card">
          <h2>${editing.id ? 'Modifier le client' : 'Nouveau client'}</h2>
          <form id="client-form" class="grid cols-2" novalidate>
            ${clientFieldsHTML(editing, 'c')}
            <div class="btn-row field full">
              <button class="btn primary" type="submit">Enregistrer</button>
              <a class="btn" href="#/clients">Annuler</a>
              ${editing.id ? '<button class="btn danger" type="button" id="c-delete">Supprimer</button>' : ''}
            </div>
          </form>
        </div>` : ''}

      <div class="card">
        ${list.length ? `
          <div class="table-wrap"><table class="list">
            <thead><tr><th>Nom</th><th>E-mail</th><th>Téléphone</th><th class="num">Facturé</th></tr></thead>
            <tbody>
              ${list.map(c => {
                const billed = state.docs.filter(d => d.type === 'facture' && d.clientId === c.id && d.status !== 'annulee')
                  .reduce((sum, d) => sum + totals(d).ttc, 0);
                return `<tr class="clickable" data-client="${esc(c.id)}">
                  <td><strong>${esc(c.name)}</strong>${c.contact ? `<div class="hint">${esc(c.contact)}</div>` : ''}</td>
                  <td>${esc(c.email)}</td>
                  <td>${esc(c.phone)}</td>
                  <td class="num">${money(billed)}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table></div>` : '<div class="empty">Aucun client. Ajoutez votre premier client !</div>'}
      </div>`;

    app.querySelectorAll('[data-client]').forEach(row => {
      row.onclick = () => go('#/clients/' + row.dataset.client);
    });

    const form = document.getElementById('client-form');
    if (form) {
      form.onsubmit = e => {
        e.preventDefault();
        const data = readClientFields(form, 'c');
        if (!data.name) {
          toast('Indiquez au moins le nom du client.');
          document.getElementById('c-name').focus();
          return;
        }
        if (editing.id) {
          Object.assign(editing, data);
          // Met à jour les brouillons qui utilisent ce client.
          state.docs.forEach(d => {
            if (d.clientId === editing.id && d.status === 'brouillon') d.client = snapshotClient(editing.id);
          });
        } else {
          state.clients.push(Object.assign({ id: uid() }, data));
        }
        save();
        toast('Client enregistré');
        go('#/clients');
      };
      const del = document.getElementById('c-delete');
      if (del) {
        del.onclick = async () => {
          if (!await uiConfirm('Supprimer le client « ' + editing.name + ' » ? Les documents existants sont conservés.', { confirmText: 'Supprimer', danger: true })) return;
          state.clients = state.clients.filter(c => c.id !== editing.id);
          save();
          toast('Client supprimé');
          go('#/clients');
        };
      }
      document.getElementById('c-name').focus();
    }
  }

  // ---------------------------------------------------------------------------
  // Paramètres
  // ---------------------------------------------------------------------------

  function renderSettings() {
    const s = state.settings;
    const field = (id, label, opts = {}) => `
      <div class="field ${opts.full ? 'full' : ''}">
        <label for="s-${id}">${label}</label>
        ${opts.textarea
          ? `<textarea id="s-${id}" rows="${opts.rows || 2}">${esc(s[id])}</textarea>`
          : `<input id="s-${id}" type="${opts.type || 'text'}" ${opts.step ? `step="${opts.step}"` : ''} value="${esc(s[id])}" ${opts.placeholder ? `placeholder="${esc(opts.placeholder)}"` : ''}>`}
        ${opts.hint ? `<div class="hint">${opts.hint}</div>` : ''}
      </div>`;

    app.innerHTML = `
      <h1>Paramètres</h1>
      <form id="settings-form">
        <div class="card">
          <h2>Mon entreprise</h2>
          <div class="grid cols-2">
            ${field('name', 'Nom et prénom (ou nom commercial)', { placeholder: 'Jean Dupont', hint: 'La mention « EI » est ajoutée automatiquement sur les documents.' })}
            ${field('activity', 'Activité', { placeholder: 'Développeur web' })}
            ${field('address', 'Adresse', { textarea: true, full: true })}
            ${field('email', 'E-mail', { type: 'email' })}
            ${field('phone', 'Téléphone')}
            ${field('siret', 'SIRET', { placeholder: '123 456 789 00012' })}
          </div>
        </div>

        <div class="card">
          <h2>Paiement</h2>
          <div class="grid cols-2">
            ${field('iban', 'IBAN')}
            ${field('bic', 'BIC')}
            ${field('paymentMethods', 'Moyens de paiement acceptés', { full: true })}
            ${field('paymentDays', 'Délai de paiement (jours)', { type: 'number' })}
            ${field('quoteValidityDays', 'Validité des devis (jours)', { type: 'number' })}
          </div>
        </div>

        <div class="card">
          <h2>TVA et mentions</h2>
          <div class="grid cols-2">
            <label class="checkbox field"><input type="checkbox" id="s-tvaEnabled" ${s.tvaEnabled ? 'checked' : ''}> Je facture la TVA (par défaut)</label>
            ${field('tvaRate', 'Taux de TVA par défaut (%)', { type: 'number', step: '0.1' })}
            ${field('extraMentions', 'Mentions complémentaires (bas de page)', { textarea: true, full: true, rows: 3 })}
            ${field('quotePrefix', 'Préfixe des devis', { hint: 'Ex. : D → D-2026-001' })}
            ${field('invoicePrefix', 'Préfixe des factures', { hint: 'Ex. : F → F-2026-001' })}
            ${field('currency', 'Devise (code ISO)', { placeholder: 'EUR' })}
          </div>
        </div>

        <div class="card">
          <h2>Suivi micro-entreprise</h2>
          <div class="grid cols-2">
            ${field('revenueCap', 'Plafond de chiffre d’affaires annuel', { type: 'number', hint: 'À vérifier sur urssaf.fr / autoentrepreneur.urssaf.fr selon votre activité (services ou vente).' })}
            ${field('contributionRate', 'Taux de cotisations sociales (%)', { type: 'number', step: '0.1', hint: 'Dépend de votre activité (vente, services BIC, libéral BNC…). Vérifiez votre taux sur votre espace URSSAF.' })}
          </div>
        </div>

        <div class="btn-row">
          <button class="btn primary" type="submit">Enregistrer</button>
        </div>
      </form>

      <div class="card" style="margin-top:24px">
        <h2>Logo et couleur des devis et factures</h2>
        <p class="hint" style="margin-top:0">Vos choix s’appliquent à tous vos devis et factures et s’enregistrent tout de suite.</p>
        <label>Logo</label>
        <div class="logo-picker">
          <div class="logo-box" id="logo-box"></div>
          <div class="btn-row">
            <label class="btn small" for="logo-file" style="margin:0;color:var(--text);font-size:13px">Choisir une image…</label>
            <input id="logo-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" hidden>
            <button type="button" class="btn small danger" id="logo-remove">Retirer le logo</button>
            <select id="logo-size" aria-label="Taille du logo" style="width:auto">
              <option value="petit" ${s.logoSize === 'petit' ? 'selected' : ''}>Petit</option>
              <option value="moyen" ${!s.logoSize || s.logoSize === 'moyen' ? 'selected' : ''}>Moyen</option>
              <option value="grand" ${s.logoSize === 'grand' ? 'selected' : ''}>Grand</option>
            </select>
          </div>
        </div>
        <p class="hint">PNG, JPG ou SVG. Un logo sur fond transparent (PNG) rend mieux.</p>
        <label style="margin-top:16px">Couleur</label>
        <div class="color-picker">
          <div class="swatches" role="radiogroup" aria-label="Couleurs proposées">
            ${DOC_COLORS.map(c => `<button type="button" class="swatch" role="radio" data-color="${c.value}" style="--sw:${c.value}" aria-checked="${validHex(s.docColor) === c.value}" title="${c.name}"><span class="sr-only">${c.name}</span></button>`).join('')}
          </div>
          <label class="custom-color" for="doc-color">
            <input id="doc-color" type="color" value="${esc(validHex(s.docColor))}">
            Autre couleur
          </label>
        </div>
        <div class="color-preview"><div class="paper" id="color-preview"></div></div>
      </div>

      <div class="card" style="margin-top:24px">
        <h2>Sauvegarde</h2>
        <p class="hint" style="margin-top:0">Vos données sont enregistrées uniquement dans ce navigateur. Exportez-les régulièrement pour ne rien perdre, ou pour les transférer sur un autre appareil.</p>
        <div class="btn-row">
          <button class="btn" id="export">Exporter (JSON)</button>
          <label class="btn" for="import" style="margin:0;color:var(--text);font-size:15px">Importer…</label>
          <input id="import" type="file" accept="application/json,.json" style="display:none">
          <button class="btn danger" id="reset">Tout effacer</button>
        </div>
      </div>`;

    const colorPreview = document.getElementById('color-preview');
    const previewDoc = state.docs.slice().sort((a, b) => b.createdAt - a.createdAt)[0] || sampleData().docs[5];
    function setDocColor(value, persist) {
      s.docColor = validHex(value);
      document.getElementById('doc-color').value = s.docColor;
      app.querySelectorAll('.swatch').forEach(b => b.setAttribute('aria-checked', String(b.dataset.color === s.docColor)));
      colorPreview.innerHTML = paperHTML(previewDoc);
      if (persist) {
        save();
        toast('Couleur enregistrée');
      }
    }
    app.querySelectorAll('.swatch').forEach(b => { b.onclick = () => setDocColor(b.dataset.color, true); });
    const colorInput = document.getElementById('doc-color');
    colorInput.oninput = () => setDocColor(colorInput.value, false);
    colorInput.onchange = () => setDocColor(colorInput.value, true);
    setDocColor(s.docColor, false);

    function refreshLogo() {
      document.getElementById('logo-box').innerHTML = s.logo
        ? `<img src="${esc(s.logo)}" alt="Votre logo">`
        : '<span class="hint">Aucun logo</span>';
      document.getElementById('logo-remove').hidden = !s.logo;
      document.getElementById('logo-size').hidden = !s.logo;
      colorPreview.innerHTML = paperHTML(previewDoc);
    }
    refreshLogo();

    document.getElementById('logo-file').onchange = async e => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      if (!/^image\//.test(file.type)) {
        uiAlert('Ce fichier n’est pas une image. Choisissez un fichier PNG, JPG ou SVG.', 'Logo');
        return;
      }
      const previous = s.logo;
      try {
        s.logo = await resizeImage(file, 500);
      } catch (err) {
        uiAlert('Impossible de lire cette image. Essayez avec un autre fichier PNG ou JPG.', 'Logo');
        return;
      }
      if (!save()) {
        s.logo = previous;
        uiAlert('Cette image est trop lourde pour être enregistrée. Essayez une image plus simple ou au format JPG.', 'Logo');
        return;
      }
      refreshLogo();
      toast('Logo enregistré');
    };
    document.getElementById('logo-remove').onclick = async () => {
      if (!await uiConfirm('Retirer le logo de vos devis et factures ?', { confirmText: 'Retirer', danger: true })) return;
      s.logo = '';
      save();
      refreshLogo();
      toast('Logo retiré');
    };
    document.getElementById('logo-size').onchange = e => {
      s.logoSize = e.target.value;
      save();
      refreshLogo();
    };

    document.getElementById('settings-form').onsubmit = e => {
      e.preventDefault();
      Object.keys(DEFAULT_SETTINGS).forEach(key => {
        const el = document.getElementById('s-' + key);
        if (!el) return;
        if (el.type === 'checkbox') s[key] = el.checked;
        else if (el.type === 'number') s[key] = num(el.value);
        else s[key] = el.value.trim();
      });
      s.currency = (s.currency || 'EUR').toUpperCase();
      save();
      toast('Paramètres enregistrés');
    };

    document.getElementById('export').onclick = () => {
      if (DEMO) {
        uiAlert('Cette version de démonstration ne peut pas télécharger de fichier.\n\nDans l’application installée sur votre ordinateur, ce bouton enregistre une copie de toutes vos données.', 'Exporter');
        return;
      }
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'devfacs-sauvegarde-' + todayISO() + '.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };

    document.getElementById('import').onchange = e => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        let data;
        try {
          data = JSON.parse(reader.result);
        } catch (err) { /* traité ci-dessous */ }
        if (!data || !Array.isArray(data.docs)) {
          uiAlert('Ce fichier n’est pas une sauvegarde DevFacs. Choisissez un fichier créé avec le bouton « Exporter ».', 'Fichier invalide');
          return;
        }
        if (!await uiConfirm('Remplacer toutes les données actuelles par celles du fichier ?', { confirmText: 'Remplacer', danger: true })) return;
        state = normalize(data);
        save();
        toast('Données importées');
        go('#/');
      };
      reader.readAsText(file);
    };

    document.getElementById('reset').onclick = async () => {
      if (!await uiConfirm('Effacer TOUTES les données (clients, devis, factures, paramètres) ? Cette action est irréversible.', { title: 'Tout effacer', confirmText: 'Tout effacer', danger: true })) return;
      state = normalize(null);
      save();
      toast('Données effacées');
      go('#/');
    };
  }

  // ---------------------------------------------------------------------------

  // En démonstration, on ouvre directement sur l'exemple pour montrer l'application en action.
  if (DEMO && isEmpty() && !state.settings.name) {
    state = normalize(sampleData());
    save();
  }

  window.addEventListener('hashchange', route);
  route();

  // Application installable et utilisable hors connexion (uniquement en ligne, en HTTPS).
  if (!DEMO && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* pas de mode hors connexion */ });
    }
    // Demande au navigateur de ne pas effacer les données automatiquement.
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(() => {});
    }
  }

  let installPrompt = null;
  const installBtn = document.getElementById('install');
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    installPrompt = e;
    if (installBtn) installBtn.hidden = false;
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    if (installBtn) installBtn.hidden = true;
    toast('DevFacs est installé');
  });
  if (installBtn) {
    installBtn.onclick = async () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      await installPrompt.userChoice.catch(() => null);
      installPrompt = null;
      installBtn.hidden = true;
    };
  }
})();
