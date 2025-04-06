
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Calendar, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { 
  initGoogleOAuthClient, 
  sendCodeToBackend,
  checkLocalAuthState,
  saveLocalAuthState,
  clearLocalAuthState
} from "@/utils/googleAuth";

// Configurações do ambiente
const GOOGLE_CLIENT_ID = "SEU_GOOGLE_CLIENT_ID"; // ⚠️ Substitua pelo seu Client ID real
const SUPABASE_EDGE_FUNCTION_URL = "https://SEU_PROJETO.supabase.co/functions/v1/auth-google-exchange"; // ⚠️ Substitua pela URL real

const Conectar = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  // Google OAuth Configuration
  const googleScopes = [
    "email", 
    "profile", 
    "https://mail.google.com/", 
    "https://www.googleapis.com/auth/calendar.events"
  ];
  
  // Verificar estado de autenticação ao carregar
  useEffect(() => {
    const authState = checkLocalAuthState();
    if (authState?.authenticated) {
      setIsAuthorized(true);
      setUserEmail(authState.email);
    }
  }, []);
  
  // Carregar o script do Google Identity Services
  useEffect(() => {
    const loadGoogleScript = () => {
      if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
        console.log("Script do Google já carregado");
        return;
      }

      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => console.log("Google Identity Services carregado com sucesso");
      script.onerror = (e) => console.error("Erro ao carregar Google Identity Services:", e);
      document.body.appendChild(script);
    };

    loadGoogleScript();
  }, []);

  const handleGoogleAuth = () => {
    setIsLoading(true);
    
    // Verificar se a biblioteca do Google foi carregada
    if (!(window as any).google?.accounts?.oauth2) {
      toast({
        title: "Erro de carregamento",
        description: "Biblioteca do Google não carregada. Recarregue a página e tente novamente.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    
    const handleOAuthResponse = async (response: { code: string }) => {
      try {
        console.log("Código de autorização recebido, enviando para o backend...");
        
        // Enviar o código para o backend (Supabase Edge Function)
        const result = await sendCodeToBackend(response.code, SUPABASE_EDGE_FUNCTION_URL);
        
        setIsAuthorized(true);
        setUserEmail(result.email);
        
        // Salvar estado de autenticação
        saveLocalAuthState(result.email);
        
        toast({
          title: "Autenticação realizada",
          description: `Sua conta Google (${result.email}) foi conectada com sucesso!`,
        });
      } catch (error) {
        console.error("Erro durante autenticação:", error);
        toast({
          title: "Falha na autenticação",
          description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido",
          variant: "destructive",
        });
        clearLocalAuthState();
      } finally {
        setIsLoading(false);
      }
    };
    
    try {
      const client = initGoogleOAuthClient({
        clientId: GOOGLE_CLIENT_ID,
        scopes: googleScopes,
        callbackFunction: handleOAuthResponse,
      });
      
      // Iniciar o fluxo de autenticação
      client.requestCode();
    } catch (error) {
      console.error("Erro ao iniciar autenticação:", error);
      setIsLoading(false);
      
      toast({
        title: "Erro na inicialização",
        description: "Não foi possível iniciar o processo de autenticação Google.",
        variant: "destructive",
      });
    }
  };
  
  const handleLogout = () => {
    setIsAuthorized(false);
    setUserEmail(null);
    clearLocalAuthState();
    toast({
      title: "Desconectado",
      description: "Sua conta Google foi desconectada com sucesso.",
    });
  };
  
  const handleConfigureWebhook = () => {
    if (!n8nWebhookUrl) {
      toast({
        title: "URL necessária",
        description: "Por favor, insira a URL do webhook do n8n",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    // Enviar credenciais para o webhook do n8n
    fetch(n8nWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: userEmail,
        status: "connected",
      }),
    })
      .then(response => {
        if (!response.ok) throw new Error("Falha ao enviar para webhook");
        return response.json();
      })
      .then(() => {
        toast({
          title: "Credenciais enviadas",
          description: "As credenciais foram enviadas com sucesso para o n8n!",
        });
      })
      .catch(error => {
        toast({
          title: "Erro ao enviar credenciais",
          description: error.message,
          variant: "destructive",
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <Layout>
      {/* Header */}
      <section className="bg-gradient-to-b from-white to-gray-50 py-16">
        <div className="container mx-auto px-6 md:px-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Conectar Conta Google</h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Conecte sua conta Google de forma segura para integrar com seu assistente WhatsApp
          </p>
        </div>
      </section>
      
      {/* Connection Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6 md:px-12">
          <div className="max-w-3xl mx-auto">
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-8">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">Conectar com Google</h2>
                  <p className="text-gray-600 mb-6">
                    Ao clicar no botão abaixo, você será redirecionado para a página de autorização 
                    do Google para conceder acesso ao seu Gmail e Google Calendar.
                  </p>
                  
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="text-green-500" />
                      <span className="text-gray-700">Acesso ao Gmail para leitura de emails</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="text-green-500" />
                      <span className="text-gray-700">Acesso ao Google Calendar para gerenciamento de eventos</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="text-green-500" />
                      <span className="text-gray-700">Você pode revogar o acesso a qualquer momento</span>
                    </div>
                  </div>
                </div>
                
                {!isAuthorized ? (
                  <Button 
                    onClick={handleGoogleAuth}
                    disabled={isLoading}
                    className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 w-full justify-center gap-3 mb-6"
                    size="lg"
                  >
                    <div className="flex space-x-1">
                      <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                      <div className="w-4 h-4 rounded-full bg-red-500"></div>
                      <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                      <div className="w-4 h-4 rounded-full bg-green-500"></div>
                    </div>
                    <span>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Autorizando...
                        </>
                      ) : (
                        "Autorizar com Google"
                      )}
                    </span>
                  </Button>
                ) : (
                  <div className="mb-8">
                    <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg mb-8">
                      <CheckCircle2 className="text-green-600" />
                      <div>
                        <p className="font-medium text-green-800">Conta Google conectada</p>
                        <p className="text-green-700 text-sm">
                          {userEmail ? `${userEmail} autenticado com sucesso` : 'Sua autenticação foi concluída com sucesso'}
                        </p>
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold mb-4">Configurar Webhook do n8n</h3>
                    <p className="text-gray-600 mb-4">
                      Agora você precisa inserir a URL do webhook do n8n para enviar as credenciais de acesso:
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="webhook" className="block text-sm font-medium text-gray-700 mb-1">
                          URL do Webhook
                        </label>
                        <input
                          type="text"
                          id="webhook"
                          className="w-full p-2 border border-gray-300 rounded-md"
                          placeholder="https://seu-n8n.exemplo.com/webhook/..."
                          value={n8nWebhookUrl}
                          onChange={(e) => setN8nWebhookUrl(e.target.value)}
                        />
                      </div>
                      
                      <Button 
                        onClick={handleConfigureWebhook}
                        disabled={isLoading || !n8nWebhookUrl}
                        className="w-full"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Enviando credenciais...
                          </>
                        ) : (
                          "Enviar credenciais para n8n"
                        )}
                      </Button>
                      
                      <Button
                        onClick={handleLogout}
                        variant="outline"
                        className="w-full mt-4"
                      >
                        Desconectar conta Google
                      </Button>
                      
                      <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm mt-4">
                        <AlertCircle className="text-yellow-600 w-5 h-5 shrink-0" />
                        <p className="text-yellow-700">
                          Em um ambiente de produção, este passo seria automatizado e seguro, sem expor a URL do webhook.
                          As credenciais reais são armazenadas no Supabase.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium mb-3">O que acontece depois?</h3>
                  <p className="text-gray-600 mb-4">
                    Após a autorização, seu assistente WhatsApp estará habilitado para:
                  </p>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex gap-3">
                      <Mail className="text-blue-500 shrink-0" />
                      <div>
                        <p className="font-medium">Acessar seus emails</p>
                        <p className="text-sm text-gray-500">Ler e notificar sobre emails importantes</p>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex gap-3">
                      <Calendar className="text-green-500 shrink-0" />
                      <div>
                        <p className="font-medium">Gerenciar eventos</p>
                        <p className="text-sm text-gray-500">Criar e lembrá-lo de compromissos</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Conectar;
