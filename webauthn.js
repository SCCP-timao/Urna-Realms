// Ajudante do navegador para passkey (WebAuthn). Sem bibliotecas externas.
// Usado por registrar.html (criar) e urna.html (obter).
(function(){
  function b64uParaBuf(s){
    s = String(s).replace(/-/g, "+").replace(/_/g, "/");
    while(s.length % 4) s += "=";
    const b = atob(s), u = new Uint8Array(b.length);
    for(let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
    return u.buffer;
  }
  function bufParaB64u(buf){
    const u = new Uint8Array(buf); let s = "";
    for(let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  // Navegadores embutidos (WhatsApp, Instagram etc.) não deixam usar passkey.
  const EMBUTIDO = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|WhatsApp|\bLine\/|Messenger|Snapchat|TikTok|musical_ly|MicroMessenger|Telegram|LinkedInApp|Twitter|; wv\)/i;

  // { ok:true } ou { ok:false, motivo:"embutido" | "semsuporte" }
  function suporte(){
    const ua = navigator.userAgent || "";
    if(EMBUTIDO.test(ua)) return {ok:false, motivo:"embutido"};
    if(!window.isSecureContext || !window.PublicKeyCredential || !navigator.credentials) return {ok:false, motivo:"semsuporte"};
    return {ok:true};
  }

  // false = o aparelho diz que não tem digital/rosto/senha de tela configurados.
  async function temDesbloqueio(){
    try{
      if(window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable)
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }catch(e){}
    return true;
  }

  function lista(a){
    return (a || []).map(c => ({id: b64uParaBuf(c.id), type: c.type || "public-key", transports: c.transports}));
  }

  // Cria a passkey. "opt" são as opções que vieram do servidor.
  async function criar(opt){
    const pk = {
      challenge: b64uParaBuf(opt.challenge),
      rp: opt.rp,
      user: {id: b64uParaBuf(opt.user.id), name: opt.user.name, displayName: opt.user.displayName},
      pubKeyCredParams: opt.pubKeyCredParams,
      timeout: opt.timeout,
      attestation: opt.attestation,
      authenticatorSelection: opt.authenticatorSelection,
      excludeCredentials: lista(opt.excludeCredentials),
      extensions: opt.extensions
    };
    const cred = await navigator.credentials.create({publicKey: pk});
    const r = cred.response;
    return {
      id: cred.id, rawId: bufParaB64u(cred.rawId), type: cred.type,
      authenticatorAttachment: cred.authenticatorAttachment || undefined,
      clientExtensionResults: cred.getClientExtensionResults ? cred.getClientExtensionResults() : {},
      response: {
        clientDataJSON: bufParaB64u(r.clientDataJSON),
        attestationObject: bufParaB64u(r.attestationObject),
        transports: r.getTransports ? r.getTransports() : []
      }
    };
  }

  // Prova a digital com a passkey já registrada. Usado na urna.
  async function obter(opt){
    const pk = {
      challenge: b64uParaBuf(opt.challenge),
      rpId: opt.rpId,
      timeout: opt.timeout,
      userVerification: opt.userVerification,
      allowCredentials: lista(opt.allowCredentials)
    };
    const cred = await navigator.credentials.get({publicKey: pk});
    const r = cred.response;
    return {
      id: cred.id, rawId: bufParaB64u(cred.rawId), type: cred.type,
      authenticatorAttachment: cred.authenticatorAttachment || undefined,
      clientExtensionResults: cred.getClientExtensionResults ? cred.getClientExtensionResults() : {},
      response: {
        clientDataJSON: bufParaB64u(r.clientDataJSON),
        authenticatorData: bufParaB64u(r.authenticatorData),
        signature: bufParaB64u(r.signature),
        userHandle: r.userHandle ? bufParaB64u(r.userHandle) : undefined
      }
    };
  }

  // Mensagem em português para o erro do navegador.
  function erro(e){
    const n = e && e.name;
    if(n === "NotAllowedError" || n === "AbortError") return "Não foi confirmado. Toque no botão e tente de novo.";
    if(n === "InvalidStateError") return "Este aparelho já tem uma passkey deste site. Fale com o mesário.";
    if(n === "NotSupportedError") return "Este aparelho ou navegador não suporta biometria. Fale com o mesário.";
    if(n === "SecurityError") return "O endereço do site não confere. Abra pelo endereço oficial da votação.";
    return "Não foi possível usar a biometria. Tente de novo ou fale com o mesário.";
  }

  window.Passkey = {suporte, temDesbloqueio, criar, obter, erro, b64uParaBuf, bufParaB64u};
})();
