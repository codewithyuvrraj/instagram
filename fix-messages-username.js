// Fixed loadMessages function with usernames
window.loadMessages = async function(partnerId) {
  const currentUser = window.currentUser;
  try {
    // Get messages with sender profile information
    const { data: messages, error } = await window.sb
      .from('messages')
      .select(`
        *,
        sender_profile:sender_id (username, avatar_url),
        receiver_profile:receiver_id (username, avatar_url)
      `)
      .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${currentUser.id})`)
      .eq('unsent', false)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const messagesContainer = document.getElementById('messages');
    if (!messagesContainer) return;

    let html = '';
    let lastDate = '';
    
    messages?.forEach((message, index) => {
      const isMe = message.sender_id === currentUser.id;
      const messageDate = new Date(message.created_at).toDateString();
      const editedText = message.edited ? ' (edited)' : '';
      
      // Get sender info
      const senderProfile = message.sender_profile;
      const senderName = senderProfile?.username || 'User';
      
      // Add date separator
      if (messageDate !== lastDate) {
        html += `<div class="date-separator">${formatDate(message.created_at)}</div>`;
        lastDate = messageDate;
      }
      
      // Group consecutive messages from same sender
      const prevMessage = messages[index - 1];
      const nextMessage = messages[index + 1];
      const isFirstInGroup = !prevMessage || prevMessage.sender_id !== message.sender_id;
      const isLastInGroup = !nextMessage || nextMessage.sender_id !== message.sender_id;
      
      html += `
        <div class="message-wrapper ${isMe ? 'me' : 'them'}">
          ${!isMe && isFirstInGroup ? `<div class="message-sender">${senderName}</div>` : ''}
          <div class="message ${isFirstInGroup ? 'first' : ''} ${isLastInGroup ? 'last' : ''}" data-message-id="${message.id}">
            <div class="message-content">
              <div class="message-text">${message.content || 'Media'}${editedText}</div>
              ${isLastInGroup ? `<div class="message-time">${formatTime(message.created_at)}</div>` : ''}
            </div>
            ${isMe ? `
              <div class="message-actions">
                <button onclick="editMessage('${message.id}', '${message.content}')" class="message-action-btn" title="Edit">✏️</button>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    });
    
    if (!messages?.length) {
      html = `
        <div class="empty-messages">
          <div class="empty-icon">👋</div>
          <p>Start your conversation</p>
        </div>
      `;
    }

    messagesContainer.innerHTML = html;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

  } catch (error) {
    console.error('❌ Error loading messages:', error);
    const messagesContainer = document.getElementById('messages');
    if (messagesContainer) {
      messagesContainer.innerHTML = `
        <div class="empty-messages">
          <div class="empty-icon">⚠️</div>
          <p>Error loading messages</p>
        </div>
      `;
    }
  }
}