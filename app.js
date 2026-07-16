/* =======================================================
   ZIPLOOT - WHATSAPP ALERT GATEWAY CONTROLLER
   ======================================================= */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  lucide.createIcons();

  // DOM Elements
  const tokenInput = document.getElementById('token');
  const phoneIdInput = document.getElementById('phone-id');
  const recipientInput = document.getElementById('recipient');
  const msgTypeInput = document.getElementById('msg-type');
  const customMessageInput = document.getElementById('custom-message');
  const customTextGroup = document.getElementById('custom-text-group');
  const sendBtn = document.getElementById('send-btn');

  // Tab Elements
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  // Copy Buttons
  const copyBtns = document.querySelectorAll('.copy-btn');

  // Log Elements
  const logPlaceholder = document.getElementById('log-placeholder');
  const logOutput = document.getElementById('log-output');

  // Load Saved Values from LocalStorage
  tokenInput.value = localStorage.getItem('ziploot_wa_token') || '';
  phoneIdInput.value = localStorage.getItem('ziploot_wa_phone_id') || '';
  recipientInput.value = localStorage.getItem('ziploot_wa_recipient') || '';

  // Initialize Custom Select Component
  setupCustomSelect('msg-type-select', 'msg-type');

  function setupCustomSelect(containerId, hiddenInputId) {
    const container = document.getElementById(containerId);
    const trigger = container.querySelector('.select-trigger');
    const optionsWrapper = container.querySelector('.select-options');
    const options = container.querySelectorAll('.select-option');
    const selectedValue = container.querySelector('.selected-value');
    const hiddenInput = document.getElementById(hiddenInputId);

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      container.classList.toggle('active');
      optionsWrapper.classList.toggle('hidden');
    });

    options.forEach(option => {
      option.addEventListener('click', () => {
        const val = option.getAttribute('data-value');
        const text = option.textContent;

        options.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');

        selectedValue.textContent = text;
        hiddenInput.value = val;

        container.classList.remove('active');
        optionsWrapper.classList.add('hidden');

        // Trigger change event manually
        hiddenInput.dispatchEvent(new Event('change'));
      });
    });
  }

  // Close custom select dropdowns when clicking outside
  document.addEventListener('click', () => {
    document.querySelectorAll('.custom-select').forEach(sel => {
      sel.classList.remove('active');
      sel.querySelector('.select-options').classList.add('hidden');
    });
  });

  // Handle Message Type Change (Template vs Custom Text)
  msgTypeInput.addEventListener('change', () => {
    if (msgTypeInput.value === 'text') {
      customTextGroup.classList.remove('hidden');
    } else {
      customTextGroup.classList.add('hidden');
    }
    updateCodeSnippets();
  });

  // Listeners to update code blocks & save state in real-time
  [tokenInput, phoneIdInput, recipientInput, customMessageInput].forEach(elem => {
    elem.addEventListener('input', () => {
      updateCodeSnippets();
      saveToLocalStorage();
    });
  });

  // Tab Switcher Logic
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');

      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      tabContents.forEach(content => {
        if (content.id === `${targetTab}-tab`) {
          content.classList.remove('hidden');
        } else {
          content.classList.add('hidden');
        }
      });
    });
  });

  // Copy Buttons Logic
  copyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const targetCode = document.getElementById(targetId);
      
      navigator.clipboard.writeText(targetCode.textContent).then(() => {
        const originalText = btn.innerHTML;
        btn.innerHTML = `<i data-lucide="check"></i> Copied!`;
        lucide.createIcons();
        setTimeout(() => {
          btn.innerHTML = originalText;
          lucide.createIcons();
        }, 1500);
      });
    });
  });

  // Save to LocalStorage
  function saveToLocalStorage() {
    localStorage.setItem('ziploot_wa_token', tokenInput.value.trim());
    localStorage.setItem('ziploot_wa_phone_id', phoneIdInput.value.trim());
    localStorage.setItem('ziploot_wa_recipient', recipientInput.value.trim());
  }

  // Construct JSON payload
  function getPayload() {
    const recipient = recipientInput.value.trim() || '<RECIPIENT_NUMBER>';
    if (msgTypeInput.value === 'template') {
      return {
        messaging_product: "whatsapp",
        to: recipient,
        type: "template",
        template: {
          name: "hello_world",
          language: {
            code: "en_US"
          }
        }
      };
    } else {
      const bodyText = customMessageInput.value.trim() || 'Your custom alert message here...';
      return {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "text",
        text: {
          preview_url: false,
          body: bodyText
        }
      };
    }
  }

  // Dynamically Update Code Snippets
  function updateCodeSnippets() {
    const token = tokenInput.value.trim() || '<META_ACCESS_TOKEN>';
    const phoneId = phoneIdInput.value.trim() || '<PHONE_NUMBER_ID>';
    const payload = JSON.stringify(getPayload(), null, 2);

    // 1. cURL Snippet
    document.getElementById('code-curl').textContent = `curl -X POST "https://graph.facebook.com/v21.0/${phoneId}/messages" \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json" \\
  -d '${payload}'`;

    // 2. Node.js Fetch Snippet
    document.getElementById('code-node').textContent = `fetch("https://graph.facebook.com/v21.0/${phoneId}/messages", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${token}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify(${payload.replace(/\n/g, '\n  ')})
})
.then(res => res.json())
.then(data => console.log(data));`;

    // 3. Python Snippet
    document.getElementById('code-python').textContent = `import requests

url = "https://graph.facebook.com/v21.0/${phoneId}/messages"
headers = {
    "Authorization": "Bearer ${token}",
    "Content-Type": "application/json"
}
payload = ${payload}

response = requests.post(url, headers=headers, json=payload)
print(response.json())`;
  }

  // Perform API Post to Meta
  async function sendWhatsAppAlert() {
    const token = tokenInput.value.trim();
    const phoneId = phoneIdInput.value.trim();
    const recipient = recipientInput.value.trim();

    if (!token || !phoneId || !recipient) {
      alert('Please fill out all credentials (Token, Phone ID, and Recipient number)!');
      return;
    }

    // Set Button Loading State
    sendBtn.disabled = true;
    const originalBtnText = sendBtn.innerHTML;
    sendBtn.innerHTML = `<span class="spinner" style="margin-right: 5px;"></span> Sending Alert...`;

    // Clear logs
    logPlaceholder.classList.add('hidden');
    logOutput.classList.remove('hidden');
    logOutput.textContent = `[INFO] Initializing HTTP POST request...
[INFO] Destination URI: https://graph.facebook.com/v21.0/${phoneId}/messages
[INFO] Headers: Authorization Bearer (Pre-signed), Content-Type (JSON)\n\n`;

    const payload = getPayload();
    logOutput.textContent += `[PAYLOAD]\n${JSON.stringify(payload, null, 2)}\n\n`;

    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const responseData = await res.json();
      logOutput.textContent += `[HTTP STATUS] ${res.status} ${res.statusText}\n`;
      logOutput.textContent += `[RESPONSE BODY]\n${JSON.stringify(responseData, null, 2)}`;
      
      if (res.ok) {
        logOutput.style.color = '#10b981'; // Green on success
      } else {
        logOutput.style.color = '#ef4444'; // Red on error
      }
    } catch (err) {
      logOutput.textContent += `[CONNECTION ERROR]\n${err.message}`;
      logOutput.style.color = '#ef4444';
    } finally {
      // Restore Button State
      sendBtn.disabled = false;
      sendBtn.innerHTML = originalBtnText;
    }
  }

  // Bind send event
  sendBtn.addEventListener('click', sendWhatsAppAlert);

  // Initialize view
  updateCodeSnippets();
});
