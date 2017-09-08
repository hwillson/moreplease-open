import mailgun from './mailgun';

export default {
  sendEmail(to, from, subject, message, attachment, bcc) {
    if (to && from && subject && message) {
      const loadedMailgun = mailgun();
      const email = { to, from, subject, html: message };
      if (bcc) {
        email.bcc = bcc;
      }
      if (attachment) {
        email.attachment = new loadedMailgun.Attachment(attachment);
      }
      loadedMailgun.messages().send(email);
    }
  },
};
