const io = require('socket.io-client');
// chai removed
const assert = require('assert');

const SOCKET_URL = 'http://localhost:5000';

async function testChatFlow() {
    console.log('Starting Chat Flow Verification...');

    // 1. Simulate Visitor Connection
    const visitorSocket = io(SOCKET_URL, {
        reconnectionDelayMax: 10000,
    });

    const agentSocket = io(SOCKET_URL, {
        reconnectionDelayMax: 10000,
    });

    try {
        await new Promise((resolve, reject) => {
            visitorSocket.on('connect', () => {
                console.log('Visitor connected:', visitorSocket.id);
                resolve();
            });
            visitorSocket.on('connect_error', (err) => reject(err));
            setTimeout(() => reject(new Error('Visitor connection timeout')), 5000);
        });

        await new Promise((resolve, reject) => {
            agentSocket.on('connect', () => {
                console.log('Agent connected:', agentSocket.id);
                resolve();
            });
             agentSocket.on('connect_error', (err) => reject(err));
             setTimeout(() => reject(new Error('Agent connection timeout')), 5000);
        });

        console.log('✓ Socket connections established');

        // 2. Simulate Visitor Joining
        const visitorData = { visitorId: 'test-visitor-1', sessionId: 'session-123' };
        visitorSocket.emit('visitor:connect', visitorData);
        
        // Wait for acknowledgment/status
        // Note: The current implementation might not emit an ack back to the sender immediately for this event, 
        // but it broadcasts 'visitor:online'.

        // 3. Simulate Agent Joining
        const agentData = { agentId: 'test-agent-1' };
        agentSocket.emit('agent:connect', agentData);

        // 4. Create a Chat Room (Visitor initiates)
        const chatId = 'test-chat-' + Date.now();
        visitorSocket.emit('chat:join', { chatId });
        agentSocket.emit('chat:join', { chatId });

        // 5. Visitor sends a message
        const messageData = {
            chatId,
            senderId: visitorData.visitorId,
            senderType: 'visitor',
            content: 'Hello from verification script!',
            type: 'text'
        };

        const messageReceivedPromise = new Promise((resolve) => {
            agentSocket.on('message:new', (msg) => {
                if (msg.chatId === chatId && msg.content === messageData.content) {
                    console.log('✓ Agent received message:', msg.content);
                    resolve();
                }
            });
        });

        visitorSocket.emit('message:send', messageData);
        await messageReceivedPromise;

        console.log('Verification Successful!');

    } catch (error) {
        console.error('Verification Failed:', error.message);
        process.exit(1);
    } finally {
        visitorSocket.disconnect();
        agentSocket.disconnect();
    }
}

testChatFlow();
