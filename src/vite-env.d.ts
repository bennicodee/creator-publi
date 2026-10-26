/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Client ID OAuth (tipo "Aplicativo da Web") do Google Cloud Console. */
  readonly VITE_GOOGLE_CLIENT_ID?: string
  /** Endereço da API .NET; padrão http://localhost:5080. */
  readonly VITE_API_URL?: string
}
