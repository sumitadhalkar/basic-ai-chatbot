import { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setMessages([
      { id: 1, sender: 'bot', text: 'Hello! I am your AI chatbot. Ask me anything.' },
    ]);
  }, []);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMessage = { id: Date.now(), sender: 'user', text: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Chat request failed.');
      setMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'bot', text: data.reply }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage();
  };

  return (
    <div className="app-shell">
      <main className="chat-panel">
        <header className="chat-header">
          <div>
            <h1>AI Chatbot</h1>
            <p>Powered by Gemini via the Python backend.</p>
          </div>
        </header>

        <section className="chat-window">
          {messages.map((message) => (
            <div key={message.id} className={`chat-message ${message.sender}`}>
              <span className="chat-sender">{message.sender === 'user' ? 'You' : 'Bot'}</span>
              <p>{message.text}</p>
            </div>
          ))}
          {loading && <div className="chat-message bot"><span className="chat-sender">Bot</span><p>Typing...</p></div>}
        </section>

        {error && <div className="error-banner">{error}</div>}

        <form className="chat-form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={loading}
          />
          <button type="submit" disabled={loading || !input.trim()}>
            Send
          </button>
        </form>
      </main>
    </div>
  );
}

export default App;
