
// This file contains the Google OAuth configuration and helper functions

// Google OAuth client configuration
interface GoogleOAuthConfig {
  clientId: string;
  scopes: string[];
  callbackFunction: (response: { code: string }) => void;
}

// Initialize the Google OAuth client
export const initGoogleOAuthClient = ({
  clientId,
  scopes,
  callbackFunction,
}: GoogleOAuthConfig) => {
  return (window as any).google.accounts.oauth2.initCodeClient({
    client_id: clientId,
    scope: scopes.join(' '),
    callback: callbackFunction,
    ux_mode: 'popup',
  });
};

// Send authorization code to backend (Supabase Edge Function)
export const sendCodeToBackend = async (code: string, edgeFunctionUrl: string) => {
  try {
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Falha na autenticação');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao enviar código para o backend:', error);
    throw error;
  }
};

// Esta função verifica se o token está armazenado localmente (útil para persistir o estado de login)
export const checkLocalAuthState = () => {
  const authState = localStorage.getItem('googleAuthState');
  if (authState) {
    try {
      return JSON.parse(authState);
    } catch (e) {
      console.error('Erro ao parsear estado de autenticação:', e);
      localStorage.removeItem('googleAuthState');
    }
  }
  return null;
};

// Esta função salva o estado de autenticação localmente
export const saveLocalAuthState = (email: string) => {
  localStorage.setItem('googleAuthState', JSON.stringify({
    email,
    authenticated: true,
    timestamp: new Date().toISOString()
  }));
};

// Esta função limpa o estado de autenticação local
export const clearLocalAuthState = () => {
  localStorage.removeItem('googleAuthState');
};
