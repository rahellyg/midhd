const CONTACT_RECEIVER_EMAIL = 'rahelly23@gmail.com';

const EMAILJS_ENDPOINT = 'https://api.emailjs.com/api/v1.0/email/send';
const EMAILJS_FORM_ENDPOINT = 'https://api.emailjs.com/api/v1.0/email/send-form';

const requiredConfig = {
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
  templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
};

const hasValidConfig = () => {
  return Boolean(requiredConfig.serviceId && requiredConfig.templateId && requiredConfig.publicKey);
};

export const sendContactEmail = async ({ fullName, email, message, attachment }) => {
  if (!hasValidConfig()) {
    throw new Error('missing_email_config');
  }

  if (attachment) {
    const formData = new FormData();
    formData.append('service_id', requiredConfig.serviceId);
    formData.append('template_id', requiredConfig.templateId);
    formData.append('user_id', requiredConfig.publicKey);
    formData.append('to_email', CONTACT_RECEIVER_EMAIL);
    formData.append('from_name', fullName);
    formData.append('from_email', email);
    formData.append('message', message);
    formData.append('app_name', 'midhd');
    formData.append('attachment', attachment);

    const uploadResponse = await fetch(EMAILJS_FORM_ENDPOINT, {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      const uploadDetails = await uploadResponse.text();
      throw new Error(uploadDetails || 'email_send_failed');
    }

    return { ok: true };
  }

  const payload = {
    service_id: requiredConfig.serviceId,
    template_id: requiredConfig.templateId,
    user_id: requiredConfig.publicKey,
    template_params: {
      to_email: CONTACT_RECEIVER_EMAIL,
      from_name: fullName,
      from_email: email,
      message,
      app_name: 'midhd',
    },
  };

  const response = await fetch(EMAILJS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || 'email_send_failed');
  }

  return { ok: true };
};

export const sendRegistrationAlertEmail = async ({ userEmail, userName, provider }) => {
  if (!hasValidConfig()) {
    throw new Error('missing_email_config');
  }

  const payload = {
    service_id: requiredConfig.serviceId,
    template_id: requiredConfig.templateId,
    user_id: requiredConfig.publicKey,
    template_params: {
      to_email: CONTACT_RECEIVER_EMAIL,
      from_name: 'midhd registrations',
      from_email: 'noreply@midhd.app',
      message: [
        'New user registration detected.',
        `Email: ${userEmail || 'unknown'}`,
        `Name: ${userName || 'unknown'}`,
        `Provider: ${provider || 'unknown'}`,
      ].join('\n'),
      app_name: 'midhd',
    },
  };

  const response = await fetch(EMAILJS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || 'email_send_failed');
  }

  return { ok: true };
};

export const getContactReceiverEmail = () => CONTACT_RECEIVER_EMAIL;
