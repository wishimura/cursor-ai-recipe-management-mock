/* ========================================
   Chat Cost Simulation - Anthropic Claude API
   ======================================== */

(function() {
  // --- Storage Keys ---
  var KEYS = {
    apiKey: 'recipe_chat_api_key',
    proxyUrl: 'recipe_chat_proxy_url',
    demoMode: 'recipe_chat_demo_mode',
    history: 'recipe_chat_history'
  };

  // --- System Prompt ---
  var SYSTEM_PROMPT =
    'あなたは飲食店の原価管理アシスタントです。焼肉店「合同会社CitrusApp」のレシピ原価管理システムのデータを基に、コスト分析と最適化の提案を行います。\n\n' +
    '## 仕入マスタ（主要食材）\n' +
    '- 仙台牛ブリスケ: 4.80円/g (A精肉店)\n' +
    '- 仙台牛シンタマ: 5.60円/g (A精肉店)\n' +
    '- 国産牛ハラミ: 6.80円/g (A精肉店)\n' +
    '- 国産牛ゲンコツカット: 0.23円/g (A精肉店)\n' +
    '- 国産牛バラ骨: 0.20円/g (A精肉店)\n' +
    '- 国産鶏ガラ: 0.30円/g (A精肉店)\n' +
    '- 仙台牛スネ: 1.85円/g (A精肉店)\n' +
    '- AUST産牛タン: 4.20円/g (A精肉店)\n' +
    '- 天然ホタテ: 120円/個 (B水産)\n' +
    '- 活車海老: 250円/尾 (B水産)\n' +
    '- 長ネギ: 0.54円/g (C青果)\n' +
    '- にんにく: 0.80円/g (C青果)\n' +
    '- いりごま（白）: 0.72円/g (E調味料)\n' +
    '- UCC ごま油: 1.00円/ml (E調味料)\n' +
    '- サンメイトソルト: 0.30円/g (E調味料)\n\n' +
    '## 単品レシピ\n' +
    '| メニュー | 原価 | 提供価格 | 粗利益 | 原価率 |\n' +
    '| 中ロース | 492.8円 | 2,150円 | 1,657円 | 22.9% |\n' +
    '| 上ロース | 680.0円 | 2,400円 | 1,720円 | 28.3% |\n' +
    '| 特上タン塩 | 1,050.0円 | 2,800円 | 1,750円 | 37.5% |\n' +
    '| 上タン塩 | 630.0円 | 1,980円 | 1,350円 | 31.8% |\n' +
    '| 煮込みハンバーグ | 385.0円 | 1,680円 | 1,295円 | 22.9% |\n' +
    '| ハラミ | 890.0円 | 1,980円 | 1,090円 | 45.0% |\n' +
    '| ナムル盛り合わせ | 120.0円 | 580円 | 460円 | 20.7% |\n' +
    '| キムチ盛り合わせ | 95.0円 | 480円 | 385円 | 19.8% |\n\n' +
    '## 仕込みレシピ（主要）\n' +
    '- もみだれ: 0.32円/g\n' +
    '- 味付けネギ: 0.58円/g\n' +
    '- つけだれ: 0.45円/g\n' +
    '- 自家製ポン酢: 0.62円/g\n\n' +
    '## 中ロースのレシピ構成\n' +
    '- 仙台牛しんたま 80g: 488.0円\n' +
    '- もみだれ 10g: 3.2円\n' +
    '- 長ネギ 0.5g: 0.3円\n' +
    '- いりごま 0.5g: 0.4円\n' +
    '- にんにく 0.5g: 0.4円\n' +
    '- ごま油 0.5ml: 0.5円\n\n' +
    '## 月次データ\n' +
    '| 年月 | 月商 | 仕入れ高 | 棚卸額 | 売上原価 | 原価率 |\n' +
    '| 2026/02 | 8,500,000 | 2,650,000 | 1,245,800 | 2,524,700 | 29.7% |\n' +
    '| 2026/01 | 7,800,000 | 2,430,000 | 1,120,500 | 2,597,500 | 33.3% |\n' +
    '| 2025/12 | 9,200,000 | 2,880,000 | 1,288,000 | 2,766,500 | 30.1% |\n' +
    '| 2025/11 | 8,100,000 | 2,520,000 | 1,174,500 | 2,524,100 | 31.2% |\n' +
    '| 2025/10 | 8,300,000 | 2,560,000 | 1,178,600 | 2,430,200 | 29.3% |\n' +
    '| 2025/09 | 7,600,000 | 2,350,000 | 1,048,800 | 2,301,200 | 30.3% |\n\n' +
    '質問には日本語で簡潔に回答してください。数値は正確に計算し、必要に応じて改善提案も行ってください。';

  // --- Demo Responses ---
  var DEMO_RESPONSES = [
    {
      keywords: ['ハラミ', '減ら', 'グラム', '80g', '100g'],
      response: 'ハラミの現在の原価構成を分析します。\n\n【現在】\n原価: 890.0円（国産牛ハラミ 6.80円/g x 約131g）\n提供価格: 1,980円\n原価率: 45.0%\n\n【100g→80gに変更した場合】\n原価: 6.80円/g x 80g = 544円\n提供価格: 1,980円（据え置き）\n粗利益: 1,436円\n原価率: 27.5%（現在45.0% → 17.5pt改善）\n\n大幅な改善が見込めます。ただし、お客様の満足度への影響も考慮し、盛り付けの工夫（カットを薄くして枚数を増やすなど）をお勧めします。'
    },
    {
      keywords: ['原価率', '30%', '30', '以下', '低い'],
      response: '原価率30%以下のメニュー一覧です：\n\n1. キムチ盛り合わせ: 19.8% (原価95円)\n2. ナムル盛り合わせ: 20.7% (原価120円)\n3. 中ロース: 22.9% (原価493円)\n4. 煮込みハンバーグ: 22.9% (原価385円)\n5. 上ロース: 28.3% (原価680円)\n\nサイドメニュー（キムチ・ナムル）が最も利益率が高いです。これらの注文率を上げる施策（セットメニュー化、おすすめ表示など）が効果的です。'
    },
    {
      keywords: ['先月', '今月', '比較', '差', 'トレンド', '推移'],
      response: '先月（2026年1月）と今月（2026年2月）の比較：\n\n月商: 7,800,000円 → 8,500,000円（+700,000円 / +9.0%）\n仕入れ高: 2,430,000円 → 2,650,000円（+220,000円 / +9.1%）\n棚卸額: 1,120,500円 → 1,245,800円（+125,300円）\n売上原価: 2,597,500円 → 2,524,700円（-72,800円）\n原価率: 33.3% → 29.7%（-3.6pt 改善）\n\n月商が増加しつつ原価率が大幅改善しており、非常に良い傾向です。棚卸管理の改善が原価率低下に貢献しています。'
    },
    {
      keywords: ['タン', '特上'],
      response: '特上タン塩の分析です：\n\n原価: 1,050円\n提供価格: 2,800円\n粗利益: 1,750円\n原価率: 37.5%\n\n粗利益額は全メニュー中最高（1,750円）ですが、原価率は37.5%と高めです。\n\n【改善案】\n1. 提供価格を3,000円に → 原価率35.0%\n2. 使用量を5%削減 → 原価率35.6%\n3. AUST産牛タン(4.20円/g)とのハーフ&ハーフメニュー新設\n\n高単価メニューは客単価向上に貢献するため、原価率だけでなく粗利益額で判断することをお勧めします。'
    },
    {
      keywords: ['中ロース', 'レシピ', '構成'],
      response: '中ロースのレシピ構成：\n\n仙台牛しんたま 80g: 488.0円（原価の99%）\n もみだれ 10g: 3.2円\n長ネギ 0.5g: 0.3円\nいりごま 0.5g: 0.4円\nにんにく 0.5g: 0.4円\nごま油 0.5ml: 0.5円\n\n合計原価: 492.8円\n提供価格: 2,150円\n原価率: 22.9%\n\n原価のほぼ全てが主材料（仙台牛しんたま）です。原価率22.9%は優秀な水準です。'
    }
  ];

  var DEFAULT_RESPONSE = 'ご質問ありがとうございます。\n\n現在のデータを基に分析いたしますので、具体的なメニュー名や数値を含めてご質問ください。\n\n例えば：\n・「ハラミを80gに減らしたら原価率は？」\n・「原価率30%以下のメニューは？」\n・「先月と今月の比較は？」\n・「特上タン塩の改善案は？」';

  // --- Conversation History ---
  var conversationHistory = [];

  function loadHistory() {
    try {
      var saved = localStorage.getItem(KEYS.history);
      if (saved) conversationHistory = JSON.parse(saved);
    } catch(e) { conversationHistory = []; }
  }

  function saveHistory() {
    try {
      // Keep last 20 messages
      if (conversationHistory.length > 20) {
        conversationHistory = conversationHistory.slice(-20);
      }
      localStorage.setItem(KEYS.history, JSON.stringify(conversationHistory));
    } catch(e) {}
  }

  // --- DOM Injection ---
  function injectChatUI() {
    // Chat FAB
    var fab = document.createElement('button');
    fab.className = 'chat-fab';
    fab.id = 'chatFab';
    fab.innerHTML = '&#x1F4AC;';
    fab.onclick = toggleChatPanel;
    document.body.appendChild(fab);

    // Chat Panel
    var panel = document.createElement('div');
    panel.className = 'chat-panel';
    panel.id = 'chatPanel';
    panel.innerHTML =
      '<div class="chat-panel-header">' +
        '<div class="chat-panel-title"><span>&#x1F916;</span><span>原価アシスタント</span></div>' +
        '<div class="chat-panel-actions">' +
          '<button class="chat-header-btn" onclick="window._chatToggleSettings()" title="設定">&#x2699;&#xFE0F;</button>' +
          '<button class="chat-header-btn" onclick="window._chatTogglePanel()" title="閉じる">&#x2715;</button>' +
        '</div>' +
      '</div>' +
      '<div class="chat-settings" id="chatSettings" style="display:none;">' +
        '<div class="form-group">' +
          '<label>Anthropic API Key</label>' +
          '<input type="password" class="form-control" id="chatApiKeyInput" placeholder="sk-ant-...">' +
          '<p class="text-xs text-muted mt-8">APIキーはブラウザ内のみに保存されます</p>' +
        '</div>' +
        '<div class="form-group">' +
          '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;">' +
            '<input type="checkbox" id="chatDemoMode"> デモモード（API不使用）' +
          '</label>' +
          '<p class="text-xs text-muted mt-8">APIキーなしでサンプル回答を返します</p>' +
        '</div>' +
        '<div class="btn-group">' +
          '<button class="btn btn-primary btn-sm" onclick="window._chatSaveSettings()">保存</button>' +
        '</div>' +
      '</div>' +
      '<div class="chat-messages" id="chatMessages"></div>' +
      '<div class="chat-input-area">' +
        '<div class="chat-input-wrap">' +
          '<input type="text" class="form-control" id="chatInput" placeholder="質問を入力..." onkeydown="if(event.key===\'Enter\')window._chatSend()">' +
          '<button class="chat-send-btn" id="chatSendBtn" onclick="window._chatSend()">&#x27A4;</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(panel);

    // Load settings into form
    var savedKey = localStorage.getItem(KEYS.apiKey) || '';
    var savedDemo = localStorage.getItem(KEYS.demoMode) === 'true';
    document.getElementById('chatApiKeyInput').value = savedKey;
    document.getElementById('chatDemoMode').checked = savedDemo;

    // Load and render history
    loadHistory();
    var messagesEl = document.getElementById('chatMessages');
    if (conversationHistory.length === 0) {
      appendMessage('assistant', 'こんにちは！原価分析アシスタントです。\nレシピの原価やメニューの利益率について質問してください。\n\n例：\n・「ハラミを80gに減らしたら原価率は？」\n・「原価率30%以下のメニューは？」\n・「先月と今月の比較は？」');
    } else {
      for (var i = 0; i < conversationHistory.length; i++) {
        appendMessage(conversationHistory[i].role, conversationHistory[i].content, true);
      }
    }
  }

  // --- Toggle Functions ---
  function toggleChatPanel() {
    var panel = document.getElementById('chatPanel');
    var fab = document.getElementById('chatFab');
    if (panel.classList.contains('show')) {
      panel.classList.remove('show');
      fab.classList.remove('active');
      fab.innerHTML = '&#x1F4AC;';
    } else {
      panel.classList.add('show');
      fab.classList.add('active');
      fab.innerHTML = '&#x2715;';
      // Scroll to bottom
      var messages = document.getElementById('chatMessages');
      messages.scrollTop = messages.scrollHeight;
      // Focus input
      setTimeout(function() { document.getElementById('chatInput').focus(); }, 100);
    }
  }

  function toggleSettings() {
    var settings = document.getElementById('chatSettings');
    settings.style.display = settings.style.display === 'none' ? '' : 'none';
  }

  function saveSettings() {
    var apiKey = document.getElementById('chatApiKeyInput').value.trim();
    var demoMode = document.getElementById('chatDemoMode').checked;
    localStorage.setItem(KEYS.apiKey, apiKey);
    localStorage.setItem(KEYS.demoMode, demoMode.toString());
    document.getElementById('chatSettings').style.display = 'none';
    appendMessage('assistant', demoMode ? 'デモモードに切り替えました。' : 'API設定を保存しました。');
  }

  // --- Message Rendering ---
  function appendMessage(role, content, skipSave) {
    var messagesEl = document.getElementById('chatMessages');
    var msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message ' + role;
    var contentDiv = document.createElement('div');
    contentDiv.className = 'chat-message-content';
    contentDiv.textContent = content;
    msgDiv.appendChild(contentDiv);
    messagesEl.appendChild(msgDiv);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    if (!skipSave && (role === 'user' || role === 'assistant')) {
      conversationHistory.push({ role: role, content: content });
      saveHistory();
    }
  }

  function showTyping() {
    var messagesEl = document.getElementById('chatMessages');
    var typing = document.createElement('div');
    typing.className = 'chat-typing';
    typing.id = 'chatTypingIndicator';
    typing.innerHTML = '<div class="chat-typing-dot"></div><div class="chat-typing-dot"></div><div class="chat-typing-dot"></div>';
    messagesEl.appendChild(typing);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function hideTyping() {
    var el = document.getElementById('chatTypingIndicator');
    if (el) el.remove();
  }

  // --- Send Message ---
  function sendMessage() {
    var input = document.getElementById('chatInput');
    var text = input.value.trim();
    if (!text) return;

    input.value = '';
    appendMessage('user', text);

    var isDemoMode = localStorage.getItem(KEYS.demoMode) === 'true';
    var apiKey = localStorage.getItem(KEYS.apiKey) || '';

    if (isDemoMode || !apiKey) {
      // Demo mode
      showTyping();
      setTimeout(function() {
        hideTyping();
        var response = getDemoResponse(text);
        appendMessage('assistant', response);
      }, 1200 + Math.random() * 800);
    } else {
      // Real API call
      showTyping();
      callClaudeAPI(text).then(function(response) {
        hideTyping();
        appendMessage('assistant', response);
      }).catch(function(error) {
        hideTyping();
        appendMessage('error', 'API Error: ' + error.message + '\n\n設定画面でAPIキーを確認するか、デモモードをお試しください。');
      });
    }
  }

  // --- Demo Response Matching ---
  function getDemoResponse(userText) {
    for (var i = 0; i < DEMO_RESPONSES.length; i++) {
      var entry = DEMO_RESPONSES[i];
      for (var j = 0; j < entry.keywords.length; j++) {
        if (userText.indexOf(entry.keywords[j]) !== -1) {
          return entry.response;
        }
      }
    }
    return DEFAULT_RESPONSE;
  }

  // --- Anthropic API Call ---
  function callClaudeAPI(userText) {
    var apiKey = localStorage.getItem(KEYS.apiKey);

    // Build messages array for API
    var apiMessages = [];
    for (var i = 0; i < conversationHistory.length; i++) {
      var msg = conversationHistory[i];
      if (msg.role === 'user' || msg.role === 'assistant') {
        apiMessages.push({ role: msg.role, content: msg.content });
      }
    }

    var body = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: apiMessages
    });

    var headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    };

    return fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: headers,
      body: body
    })
    .then(function(response) {
      if (!response.ok) {
        return response.json().then(function(err) {
          throw new Error(err.error ? err.error.message : 'HTTP ' + response.status);
        });
      }
      return response.json();
    })
    .then(function(data) {
      if (data.content && data.content[0] && data.content[0].text) {
        return data.content[0].text;
      }
      throw new Error('Unexpected response format');
    });
  }

  // --- Expose to global scope for onclick handlers ---
  window._chatTogglePanel = toggleChatPanel;
  window._chatToggleSettings = toggleSettings;
  window._chatSaveSettings = saveSettings;
  window._chatSend = sendMessage;

  // --- Initialize on DOM ready ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectChatUI);
  } else {
    injectChatUI();
  }
})();
