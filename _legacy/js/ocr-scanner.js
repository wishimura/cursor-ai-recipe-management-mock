/* ========================================
   OCR Invoice Scanner - Mock Demo
   ======================================== */

// Mock invoice data
var MOCK_INVOICE = {
  date: '2026-03-10',
  supplier: 'A精肉店',
  items: [
    { name: '仙台牛ブリスケ', qty: 5000, unit: 'g', unitPrice: 4.80, amount: 24000 },
    { name: '国産牛ハラミ', qty: 3000, unit: 'g', unitPrice: 6.80, amount: 20400 },
    { name: '仙台牛シンタマ', qty: 2000, unit: 'g', unitPrice: 5.60, amount: 11200 },
    { name: '国産牛ゲンコツカット', qty: 5000, unit: 'g', unitPrice: 0.23, amount: 1150 },
    { name: '国産鶏ガラ', qty: 3000, unit: 'g', unitPrice: 0.30, amount: 900 },
    { name: '仙台牛スネ', qty: 2000, unit: 'g', unitPrice: 1.85, amount: 3700 }
  ],
  total: 61350
};

var currentStep = 1;

// Step management
function setStep(step) {
  currentStep = step;
  for (var i = 1; i <= 4; i++) {
    var content = document.getElementById('ocr-step' + i);
    if (content) content.style.display = i === step ? '' : 'none';

    var indicator = document.getElementById('ocrStepIndicator' + i);
    if (indicator) {
      indicator.classList.remove('active', 'done');
      if (i < step) indicator.classList.add('done');
      if (i === step) indicator.classList.add('active');
    }
  }
}

// Trigger file input
function triggerFileInput(mode) {
  var input = document.getElementById('ocrFileInput');
  if (mode === 'camera') {
    input.setAttribute('capture', 'environment');
  } else {
    input.removeAttribute('capture');
  }
  input.click();
}

// File selected handler
function onFileSelected() {
  var input = document.getElementById('ocrFileInput');
  if (input.files && input.files.length > 0) {
    startMockOCR();
  }
}

// Start mock OCR processing
function startMockOCR() {
  setStep(2);

  var progressFill = document.getElementById('ocrProgressFill');
  var progressPercent = document.getElementById('ocrProgressPercent');
  var statusText = document.getElementById('ocrProcessingStatus');

  var progress = 0;
  var statusMessages = [
    { at: 0, text: '画像を解析しています...' },
    { at: 25, text: 'テキストを認識しています...' },
    { at: 55, text: 'データを構造化しています...' },
    { at: 85, text: '検証しています...' },
    { at: 95, text: '完了しました！' }
  ];

  var interval = setInterval(function() {
    progress += 2 + Math.random() * 3;
    if (progress > 100) progress = 100;

    progressFill.style.width = progress + '%';
    progressPercent.textContent = Math.round(progress) + '%';

    // Update status message
    for (var i = statusMessages.length - 1; i >= 0; i--) {
      if (progress >= statusMessages[i].at) {
        statusText.textContent = statusMessages[i].text;
        break;
      }
    }

    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(function() {
        displayResults(MOCK_INVOICE);
      }, 500);
    }
  }, 80);
}

// Display extracted results
function displayResults(data) {
  setStep(3);

  // Set header fields
  document.getElementById('ocrDate').value = data.date;
  document.getElementById('ocrSupplier').value = data.supplier;

  // Render table rows
  var tbody = document.getElementById('ocrItemsBody');
  tbody.innerHTML = '';

  for (var i = 0; i < data.items.length; i++) {
    addItemRow(data.items[i]);
  }

  updateOCRSummary();
}

// Add a row to the results table
function addItemRow(item) {
  var tbody = document.getElementById('ocrItemsBody');
  var tr = document.createElement('tr');

  tr.innerHTML =
    '<td><input type="text" class="ocr-editable-input" value="' + (item ? item.name : '') + '"></td>' +
    '<td class="text-right"><input type="number" class="ocr-editable-input text-right" value="' + (item ? item.qty : '') + '" onchange="recalcRow(this)" style="width:80px;"></td>' +
    '<td><input type="text" class="ocr-editable-input" value="' + (item ? item.unit : 'g') + '" style="width:50px;"></td>' +
    '<td class="text-right"><input type="number" class="ocr-editable-input text-right" value="' + (item ? item.unitPrice : '') + '" step="0.01" onchange="recalcRow(this)" style="width:80px;"></td>' +
    '<td class="text-right font-bold ocr-row-amount">' + (item ? item.amount.toLocaleString() : '0') + ' 円</td>' +
    '<td><button type="button" class="remove-row" onclick="removeOCRRow(this)">&#x2715;</button></td>';

  tbody.appendChild(tr);
  updateOCRSummary();
}

function addOCRRow() {
  addItemRow(null);
}

// Remove row
function removeOCRRow(btn) {
  var tr = btn.closest('tr');
  tr.remove();
  updateOCRSummary();
}

// Recalculate row amount
function recalcRow(input) {
  var tr = input.closest('tr');
  var inputs = tr.querySelectorAll('input');
  var qty = parseFloat(inputs[1].value) || 0;
  var unitPrice = parseFloat(inputs[3].value) || 0;
  var amount = qty * unitPrice;
  tr.querySelector('.ocr-row-amount').textContent = Math.round(amount).toLocaleString() + ' 円';
  updateOCRSummary();
}

// Update summary
function updateOCRSummary() {
  var rows = document.querySelectorAll('#ocrItemsBody tr');
  var total = 0;
  var count = 0;

  for (var i = 0; i < rows.length; i++) {
    var inputs = rows[i].querySelectorAll('input');
    if (inputs[0].value.trim()) {
      var qty = parseFloat(inputs[1].value) || 0;
      var unitPrice = parseFloat(inputs[3].value) || 0;
      total += qty * unitPrice;
      count++;
    }
  }

  var countEl = document.getElementById('ocrItemCount');
  if (countEl) countEl.textContent = count + '件';

  var totalEl = document.getElementById('ocrTotalAmount');
  if (totalEl) totalEl.textContent = Math.round(total).toLocaleString() + ' 円';
}

// Register data
function registerOCRData() {
  var rows = document.querySelectorAll('#ocrItemsBody tr');
  var count = 0;
  var total = 0;

  for (var i = 0; i < rows.length; i++) {
    var inputs = rows[i].querySelectorAll('input');
    if (inputs[0].value.trim()) {
      var qty = parseFloat(inputs[1].value) || 0;
      var unitPrice = parseFloat(inputs[3].value) || 0;
      total += qty * unitPrice;
      count++;
    }
  }

  setStep(4);

  document.getElementById('ocrRegisteredCount').textContent = count;
  document.getElementById('ocrRegisteredTotal').textContent = '\u00A5' + Math.round(total).toLocaleString();
}

// Reset
function resetOCR() {
  setStep(1);
  var progressFill = document.getElementById('ocrProgressFill');
  if (progressFill) progressFill.style.width = '0%';
  var progressPercent = document.getElementById('ocrProgressPercent');
  if (progressPercent) progressPercent.textContent = '0%';
  var fileInput = document.getElementById('ocrFileInput');
  if (fileInput) fileInput.value = '';
}
