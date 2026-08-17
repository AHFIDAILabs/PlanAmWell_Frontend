// Persists unsent messages to the filesystem so they survive app restarts.
// Uses expo-file-system because it has no size limits and no sensitivity concerns.
import { File, Paths } from 'expo-file-system';

const queueFile = new File(Paths.document, 'message_queue.json');

export interface QueuedMessage {
  tempId: string;
  conversationId: string;
  content: string;
  messageType: 'text' | 'image' | 'audio' | 'document';
  mediaUrl?: string;
  replyTo?: { messageId: string; content: string; senderType: 'User' | 'Doctor' };
  queuedAt: string;
}

async function readQueue(): Promise<QueuedMessage[]> {
  try {
    if (!queueFile.exists) return [];
    const raw = await queueFile.text();
    return JSON.parse(raw) as QueuedMessage[];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedMessage[]): Promise<void> {
  try {
    if (!queueFile.exists) {
      queueFile.create({ intermediates: true, overwrite: true });
    }
    queueFile.write(JSON.stringify(queue));
  } catch {}
}

export const messageQueueService = {
  async enqueue(msg: Omit<QueuedMessage, 'queuedAt'>): Promise<void> {
    const queue = await readQueue();
    queue.push({ ...msg, queuedAt: new Date().toISOString() });
    await writeQueue(queue);
  },

  async getForConversation(conversationId: string): Promise<QueuedMessage[]> {
    const queue = await readQueue();
    return queue.filter(m => m.conversationId === conversationId);
  },

  async remove(tempId: string): Promise<void> {
    const queue = await readQueue();
    await writeQueue(queue.filter(m => m.tempId !== tempId));
  },

  async clear(conversationId: string): Promise<void> {
    const queue = await readQueue();
    await writeQueue(queue.filter(m => m.conversationId !== conversationId));
  },
};
