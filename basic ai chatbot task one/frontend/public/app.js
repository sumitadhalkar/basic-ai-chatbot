const chatWindow = document.querySelector('.chat-window');
const chatForm = document.querySelector('.chat-form');
const chatInput = document.querySelector('#chat-input');
const errorBanner = document.querySelector('.error-banner');

function addMessage(sender, text) {
  const message = document.createElement('div');
  message.className = `chat-message ${sender}`;
  message.innerHTML = `
    <span class="chat-sender">${sender === 'user' ? 'You' : 'Bot'}</span>
    <p>${text}</p>
  `;
  chatWindow.appendChild(message);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function showTypingIndicator() {
  const message = document.createElement('div');
  message.className = 'chat-message bot';
  message.id = 'typing-indicator';
  message.innerHTML = `
    <span class="chat-sender">Bot</span>
    <div class="typing-indicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  chatWindow.appendChild(message);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function removeTypingIndicator() {
  const indicator = document.getElementById('typing-indicator');
  if (indicator) {
    indicator.remove();
  }
}

function showError(message) {
  errorBanner.textContent = message;
  errorBanner.classList.add('show');
  setTimeout(() => {
    errorBanner.classList.remove('show');
  }, 5000);
}

async function sendMessage(text) {
  addMessage('user', text);
  setLoading(true);
  showTypingIndicator();

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
    });
    const data = await response.json();
    removeTypingIndicator();
    if (!response.ok) throw new Error(data.error || 'Request failed.');
    addMessage('bot', data.reply);
  } catch (err) {
    removeTypingIndicator();
    showError(err.message);
  } finally {
    setLoading(false);
  }
}

function setLoading(isLoading) {
  if (isLoading) {
    chatInput.disabled = true;
  } else {
    chatInput.disabled = false;
    chatInput.focus();
  }
}

chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  chatInput.value = '';
  sendMessage(text);
});

window.addEventListener('load', () => {
  addMessage('bot', 'Hello! I am your AI chatbot. Ask me anything.');
  chatInput.focus();
});

