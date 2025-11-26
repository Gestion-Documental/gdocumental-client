interface SendEmailInput {
  to: string;
  cc?: string;
  subject: string;
  body: string;
  attachments: { name: string; size?: string }[];
}

export interface EmailDispatchResult {
  messageId: string;
  status: 'SENT';
  trackingStatus: 'SENT';
  dispatchDate: string;
}

export const emailService = {
  send: async (payload: SendEmailInput): Promise<EmailDispatchResult> => {
    console.log('[NexusMail] Enviando correo...', payload);
    await new Promise(resolve => setTimeout(resolve, 1200));
    const dispatchDate = new Date().toISOString();
    return {
      messageId: `MSG-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      status: 'SENT',
      trackingStatus: 'SENT',
      dispatchDate
    };
  }
};
