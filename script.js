// ----- Configuração do Cliente para obter o CÓDIGO de Autorização -----
let codeClient; // Variável para guardar nosso cliente de código

/**
 * Inicializa o cliente Google OAuth2 para solicitar um código de autorização.
 * Define os escopos necessários e as funções de callback.
 * Retorna true se a inicialização for bem-sucedida, false caso contrário.
 */
function initializeGoogleCodeClient() {
    // ========================================================================
    // ATENÇÃO: PASSO 1 - SUBSTITUA PELO SEU CLIENT ID REAL OBTIDO DO GOOGLE CLOUD CONSOLE
    // ========================================================================
    const googleClientId = '414232145280-as5a3ntt18cj35c97gadceaaadstrsja.apps.googleusercontent.com';
    // ========================================================================

    // Validação básica do Client ID
    if (!googleClientId || googleClientId.includes('SEU_CLIENT_ID_DO_GOOGLE_AQUI') || !googleClientId.endsWith('.apps.googleusercontent.com')) {
        showError('Erro de configuração: Google Client ID inválido ou não definido em script.js.');
        const button = document.querySelector('.google-login-button');
        if (button) button.disabled = true; // Desabilita botão se erro
        return false; // Interrompe
    }

    try {
        console.log("Inicializando Google Code Client...");
        codeClient = google.accounts.oauth2.initCodeClient({
            client_id: googleClientId,
            // ---- Escopos Necessários para os Agentes N8N (Email e Agenda Completo) ----
            scope: [
                'https://www.googleapis.com/auth/userinfo.email',    // Ver email do usuário
                'https://www.googleapis.com/auth/userinfo.profile',  // Ver perfil básico (inclui ID Google)
                'https://mail.google.com/',                          // Acesso COMPLETO ao Gmail
                'https://www.googleapis.com/auth/calendar.events'    // Acesso para Ler e Escrever eventos
            ].join(' '), // Junta os escopos com espaço

            // ----- Função chamada quando o Google retorna o CÓDIGO -----
            callback: (response) => {
                // Verifica se o 'code' está presente na resposta
                if (response.code) {
                    console.log("Código de Autorização recebido do Google.");
                    // Por segurança, não logue o código em produção final
                    // console.log("Código:", response.code);
                    sendCodeToBackend(response.code); // Envia o código para nosso backend
                } else {
                    console.error("Resposta do Google não contém código de autorização:", response);
                    showError('Não foi possível obter o código de autorização do Google. Verifique o console.');
                }
            },
            // ----- Função chamada em caso de erro no fluxo do popup -----
            error_callback: (error) => {
                console.error('Erro no fluxo de autenticação Google (error_callback):', error);
                handleAuthError(error); // Usa função separada para tratar erros
            }
        });
        console.log("Cliente Google OAuth2 (Code Flow) inicializado com sucesso.");
        return true; // Inicialização bem-sucedida

    } catch (error) {
        console.error("Falha crítica ao inicializar o cliente Google OAuth2 (initCodeClient):", error);
        showError("Erro crítico ao inicializar a autenticação Google. Verifique o console.");
        const button = document.querySelector('.google-login-button');
        if (button) button.disabled = true; // Desabilita botão se erro grave
        return false; // Falha na inicialização
    }
}

/**
 * Envia o código de autorização recebido do Google para o endpoint do backend.
 * @param {string} code O código de autorização.
 */
function sendCodeToBackend(code) {
    const statusMessageElement = document.getElementById('status-message');
    if (!statusMessageElement) {
        console.error("Elemento 'status-message' não encontrado no HTML.");
        return; // Interrompe se não encontrar onde mostrar mensagem
    }
    statusMessageElement.textContent = 'Processando conexão segura...';
    statusMessageElement.style.color = '#007bff'; // Azul para processando

    // ========================================================================
    // ATENÇÃO: PASSO 2 - SUBSTITUA PELA URL REAL DA SUA EDGE FUNCTION NO SUPABASE
    // (Ex: https://<id>.supabase.co/functions/v1/auth-google-exchange)
    // ========================================================================
    const backendUrl = 'https://uoeshejtkzngnqxtqtbl.supabase.co/functions/v1/auth-google-exchange';
    // ========================================================================

    // Validação básica da URL do backend
     if (!backendUrl || backendUrl.includes('SUA_URL_BACKEND_AQUI')) {
          showError('Erro de configuração: URL do Backend não definida corretamente em script.js.');
          return; // Interrompe se URL não configurada
     }

    console.log(`Enviando código para o backend: ${backendUrl}`);

    // Envia a requisição para o backend
    fetch(backendUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // 'Accept': 'application/json' // Boa prática
        },
        // Envia o CÓDIGO dentro de um objeto JSON
        body: JSON.stringify({ code: code }), // <-- Envia { "code": "..." }
    })
    .then(res => {
        console.log(`Resposta recebida do backend com status: ${res.status}`);
        // Verifica se a resposta foi bem sucedida (status 2xx)
        if (!res.ok) {
            // Tenta ler o corpo do erro como JSON para obter mais detalhes
            return res.json().then(errorData => {
                // Lança um erro com a mensagem do backend ou status HTTP
                 console.error("Erro retornado pelo backend (JSON):", errorData);
                 throw new Error(errorData?.message || errorData?.error || `Erro do servidor: ${res.status} ${res.statusText}`);
            }).catch((jsonError) => {
                // Se não conseguir ler como JSON, lança erro com o status
                console.error(`Erro do backend (status ${res.status}), não foi possível parsear resposta JSON:`, jsonError);
                throw new Error(`Erro do servidor: ${res.status} ${res.statusText}.`);
            });
        }
        // Se a resposta for OK, processa como JSON
        return res.json();
    })
    .then(data => {
        // Sucesso na comunicação e processamento no backend
        console.log('Conexão bem-sucedida no backend. Resposta:', data);
        // Tenta pegar o email da resposta, senão usa um padrão
        const userEmail = data?.userEmail || 'usuário conectado'; // Ajuste 'userEmail' conforme o que seu backend retorna
        statusMessageElement.textContent = `Conectado com sucesso como ${userEmail}! Você pode fechar esta página.`;
        statusMessageElement.style.color = '#28a745'; // Verde para sucesso

        // Esconde o botão de login após sucesso
        const buttonContainer = document.getElementById('google-signin-button');
        if (buttonContainer) {
            buttonContainer.innerHTML = ''; // Limpa o botão
            buttonContainer.style.display = 'none'; // Esconde o container
        }
    })
    .catch(error => {
        // Captura erros da chamada fetch ou erros lançados do .then anterior
        console.error('Falha ao processar conexão no backend (catch):', error);
        // Mostra a mensagem de erro específica capturada
        showError(`Falha na conexão: ${error.message}. Tente novamente ou verifique o console.`);
    });
}

/**
 * Inicia o fluxo de solicitação do código de autorização ao Google,
 * geralmente abrindo um popup.
 */
function requestAuthCode() {
     // Garante que o cliente Google foi inicializado corretamente
     if (!codeClient) {
         console.error("Tentativa de solicitar código sem cliente inicializado.");
         showError("Erro: Cliente Google não inicializado. Recarregue a página.");
         // Tenta reinicializar, como uma última tentativa
         if (!initializeGoogleCodeClient()) return; // Se falhar de novo, desiste
     }

     console.log("Iniciando solicitação de código de autorização do Google...");
     // Limpa mensagens de status antigas antes de iniciar o popup
     const statusMessageElement = document.getElementById('status-message');
     if (statusMessageElement) statusMessageElement.textContent = '';

     // Inicia o fluxo de código. Isso geralmente abre um Popup do Google.
     codeClient.requestCode();
}

/**
 * Exibe mensagens de status ou erro para o usuário e no console.
 * @param {string} message A mensagem a ser exibida.
 */
function showError(message) {
     const statusMessageElement = document.getElementById('status-message');
     if (statusMessageElement) {
          statusMessageElement.textContent = message;
          statusMessageElement.style.color = '#dc3545'; // Vermelho para erro
     }
     console.error("Mensagem de erro exibida ao usuário:", message);
}

/**
 * Trata erros específicos que podem ocorrer durante o fluxo de
 * autenticação do Google (vindos do error_callback).
 * @param {object} error O objeto de erro retornado pelo Google.
 */
function handleAuthError(error) {
    let message = 'Erro durante a autenticação com Google. Tente novamente.'; // Mensagem padrão
    if (error?.type) { // Verifica se o objeto de erro tem a propriedade 'type'
        switch (error.type) {
            case 'popup_closed':
                message = 'O popup de login do Google foi fechado antes da conclusão.';
                break;
            case 'popup_failed_to_open':
                message = 'Falha ao abrir o popup de login do Google. Verifique se há bloqueadores de popup ativos.';
                break;
            // Adicione outros tipos de erro conforme documentação do Google, se necessário
            default:
                 message = `Erro de autenticação (${error.type}). Tente novamente.`;
                 break;
        }
    } else if (error?.message) { // Se não tiver 'type', tenta usar 'message'
        message = `Erro de autenticação: ${error.message}`;
    }
    showError(message);
}


// ----- Função Principal que roda quando a página HTML é totalmente carregada -----
window.onload = function () {
    console.log("Página carregada. Iniciando script de autenticação...");

    // Garante que a biblioteca do Google (gsi) está carregada
    if (typeof google === 'undefined' || typeof google.accounts === 'undefined' || typeof google.accounts.oauth2 === 'undefined') {
        console.error("Biblioteca Google Identity Services (GSI) não carregada.");
        showError("Erro crítico: Falha ao carregar componentes Google. Verifique a conexão e o script HTML.");
        return; // Interrompe a execução
    }

    // Tenta inicializar o cliente de código do Google
    const initSuccess = initializeGoogleCodeClient();

    // Encontra o container onde o botão será colocado no HTML
    const buttonContainer = document.getElementById("google-signin-button");

    if (buttonContainer) {
        // Limpa qualquer conteúdo prévio no container (como o botão antigo, se houver)
        buttonContainer.innerHTML = '';

        // Cria um botão HTML padrão para iniciar o login
        const customButton = document.createElement('button');
        // Pode usar um ícone do Google aqui se quiser
        customButton.innerHTML = `<svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#4285F4" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path><path fill="#34A853" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"></path><path fill="#FBBC05" d="M24 44c5.166 0 9.86-1.977 13.412-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"></path><path fill="#EA4335" d="M43.611 20.083H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l.003-.002 6.19 5.238C39.712 35.51 44 29.886 44 24c0-1.341-.138-2.65-.389-3.917z"></path></svg> Conectar com Google`; // Adiciona texto e SVG
        customButton.className = 'google-login-button'; // Classe para estilização no CSS
        customButton.title = 'Clique para conectar sua conta Google e autorizar o acesso.';

        // Adiciona o listener de clique que chama a função para pedir o código
        customButton.addEventListener('click', requestAuthCode);

        // Adiciona o botão ao container na página
        buttonContainer.appendChild(customButton);

        // Desabilita o botão se a inicialização do Google Client falhou
         if (!initSuccess) {
             customButton.disabled = true;
             customButton.title = 'Erro na configuração. Botão desabilitado.';
             console.warn("Botão de login desabilitado devido a erro na inicialização.");
         }

    } else {
        // Isso não deveria acontecer se seu HTML estiver correto
        console.error("Elemento container com id 'google-signin-button' não foi encontrado no HTML.");
        showError("Erro na página: Elemento essencial do botão não encontrado.");
    }

    console.log("Setup do botão de login concluído.");
};
