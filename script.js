// Função que será chamada pelo Google após o login bem-sucedido
function handleCredentialResponse(response) {
  console.log("Encoded JWT ID token: " + response.credential);
  const statusMessageElement = document.getElementById('status-message');
  statusMessageElement.textContent = 'Processando login...';

  // ---- PASSO CRUCIAL: ENVIAR O TOKEN PARA O SEU BACKEND ----
  // Substitua 'SUA_URL_BACKEND_AQUI/auth/google' pela URL real
  // do seu endpoint no Supabase/Firebase que vai receber e validar o token.
  const backendUrl = 'SUA_URL_BACKEND_AQUI/auth/google';

  fetch(backendUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    // Envia o token recebido do Google no corpo da requisição
    body: JSON.stringify({ token: response.credential }),
  })
  .then(res => {
    if (!res.ok) {
      // Se o backend retornar um erro (status não-2xx)
      return res.json().then(errorData => {
        throw new Error(errorData.message || `Erro do servidor: ${res.status}`);
      });
    }
    return res.json(); // Converte a resposta do backend para JSON
  })
  .then(data => {
    // Sucesso! O backend validou o token e provavelmente salvou o refresh token.
    console.log('Login bem-sucedido no backend:', data);
    // Você pode obter o email do usuário da resposta do backend, se ele enviar
    const userEmail = data.userEmail || 'usuário'; // Ajuste conforme a resposta do seu backend
    statusMessageElement.textContent = `Conectado com sucesso como ${userEmail}! Você pode fechar esta janela.`;
    statusMessageElement.style.color = '#28a745'; // Verde para sucesso

    // Opcional: Esconder o botão de login após sucesso
    const buttonDiv = document.getElementById('google-signin-button');
    if(buttonDiv) buttonDiv.style.display = 'none';

  })
  .catch(error => {
    // Falha ao comunicar com o backend ou backend retornou erro
    console.error('Erro ao processar login no backend:', error);
    statusMessageElement.textContent = `Falha no login: ${error.message}. Tente novamente.`;
    statusMessageElement.style.color = '#dc3545'; // Vermelho para erro
  });
}

// Função que roda quando a página e a biblioteca do Google terminam de carregar
window.onload = function () {
  // ---- PASSO CRUCIAL: CONFIGURAR SEU CLIENT ID ----
  // Substitua 'SEU_CLIENT_ID_DO_GOOGLE_AQUI' pelo Client ID real
  // que você criou no Google Cloud Console para esta aplicação WEB.
  const googleClientId = 'SEU_CLIENT_ID_DO_GOOGLE_AQUI';

  if (!googleClientId || googleClientId === 'SEU_CLIENT_ID_DO_GOOGLE_AQUI') {
      console.error("ERRO: Client ID do Google não configurado em script.js!");
      const statusMessageElement = document.getElementById('status-message');
      if(statusMessageElement) {
          statusMessageElement.textContent = 'Erro de configuração. Contate o administrador.';
          statusMessageElement.style.color = '#dc3545';
      }
      return; // Interrompe se não houver Client ID
  }


  google.accounts.id.initialize({
    client_id: googleClientId,
    callback: handleCredentialResponse // Função a ser chamada no sucesso
  });

  // Renderiza o botão de login do Google dentro do div com id="google-signin-button"
  google.accounts.id.renderButton(
    document.getElementById("google-signin-button"),
    {
        theme: "outline", // 'outline', 'filled_blue', 'filled_black'
        size: "large",      // 'large', 'medium', 'small'
        type: "standard",   // 'standard', 'icon'
        shape: "rectangular",// 'rectangular', 'pill', 'circle', 'square'
        text: "signin_with", // 'signin_with', 'signup_with', 'continue_with', 'signin'
        logo_alignment: "left" // 'left', 'center'
        // Consulte a documentação do Google Identity Services para mais opções
    }
  );

  // Opcional: Mostra o prompt "One Tap" se o usuário já estiver logado no Google
  // google.accounts.id.prompt();
};