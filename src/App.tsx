import { useState, useRef, useEffect } from "react";

// ── SYSTEM PROMPT ──────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Tu es l'assistant IA d'Ipofise, créé par Dominique, expert en intégration interculturelle et immigration au Canada basé à Québec.

Tu aides les professionnels africains francophones (DRC, Côte d'Ivoire, Tunisie, Sénégal, Maghreb, Île-de-France) qui veulent travailler au Canada.

TON RÔLE :
1. Comprendre leur situation (pays, profession, expérience, objectif)
2. Les préparer aux entretiens d'embauche canadiens
3. Les conseiller sur leur CV canadien
4. Les guider sur le marché du travail canadien et québécois
5. Les informer sur les étapes d'immigration vers le Canada
6. Leur proposer les services Ipofise au bon moment

SERVICES IPOFISE (à proposer naturellement dans la conversation) :
- Package "Travailler au Canada" : 99-150 USD (CV canadien + LinkedIn + préparation entretien + plan d'arrivée)
- CV canadien adapté : 30-50 USD
- Préparation entretien : 30-50 USD  
- Plan d'arrivée personnalisé : 50-99 USD
- Paiement accepté : Mobile Money (Orange Money, MTN Money, Wave, Airtel), virement WhatsApp, Interac, carte bancaire européenne

CONTEXTE CULTUREL IMPORTANT :
- Parle avec chaleur et respect — tu t'adresses à des gens qui ont du courage et de l'ambition
- Comprends leurs réalités : pas toujours de carte de crédit, procédures administratives lourdes, familles à charge
- Valorise leur expérience africaine — elle est un atout au Canada, pas un handicap
- Sois encourageant mais réaliste sur les délais et les défis

MARCHÉ DU TRAVAIL CANADIEN :
- Le CV canadien est différent : 1-2 pages max, pas de photo, pas d'âge, pas d'état civil
- Les entretiens au Canada sont moins formels qu'en Europe ou en Afrique
- Le réseautage LinkedIn est crucial
- Québec : français obligatoire dans la plupart des secteurs
- Secteurs qui recrutent : technologies, santé, construction, agriculture, hôtellerie
- Programmes immigration : PEQ, PRTQ, LMIA, PVT (moins de 35 ans), Express Entry

STYLE DE RÉPONSE :
- Réponds toujours dans la langue de la personne (français prioritaire, arabe si besoin)
- Sois concis et pratique — donne des étapes concrètes
- Pose une question à la fois pour mieux comprendre leur situation
- Après 3-4 échanges, propose naturellement un service payant si c'est pertinent
- Ne sois jamais agressif dans la vente — d'abord aider, ensuite proposer`;

// ── PROFILS SUGGÉRÉS ───────────────────────────────────────────────────────
const PROFILS = [
  { icon: "👨‍💼", label: "Je cherche un emploi au Canada", msg: "Bonjour, je cherche un emploi au Canada. Comment puis-je commencer ?" },
  { icon: "📄", label: "J'ai besoin d'un CV canadien", msg: "Bonjour, je voudrais adapter mon CV pour le marché canadien. Que dois-je changer ?" },
  { icon: "🎯", label: "Préparer un entretien", msg: "Bonjour, j'ai un entretien avec une entreprise canadienne. Comment me préparer ?" },
  { icon: "✈️", label: "Comment immigrer au Canada", msg: "Bonjour, je veux immigrer au Canada pour travailler. Par où commencer ?" },
  { icon: "🇫🇷", label: "Je suis en France, je veux le Canada", msg: "Bonjour, je suis actuellement en France et je souhaite émigrer au Canada. Quelles sont mes options ?" },
  { icon: "💼", label: "Reconnaissance de mes diplômes", msg: "Bonjour, j'ai mes diplômes africains. Est-ce qu'ils seront reconnus au Canada ?" },
];

const PAYS_DRAPEAUX = {
  "DRC/Congo": "🇨🇩", "Côte d'Ivoire": "🇨🇮", "Tunisie": "🇹🇳",
  "Sénégal": "🇸🇳", "Cameroun": "🇨🇲", "France": "🇫🇷",
  "Maroc": "🇲🇦", "Mali": "🇲🇱", "Autre": "🌍"
};

// ── COMPOSANTS ─────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={s.typingWrap}>
      {[0,1,2].map(i => (
        <div key={i} style={{ ...s.dot, animationDelay: `${i * 0.2}s` }} />
      ))}
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 16, alignItems: "flex-end", gap: 8 }}>
      {!isUser && (
        <div style={s.avatar}>🍁</div>
      )}
      <div style={{ maxWidth: "78%", display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start" }}>
        {!isUser && <div style={s.senderName}>Assistant Ipofise</div>}
        <div style={isUser ? s.userBubble : s.aiBubble}>
          {msg.content.split('\n').map((line, i) => (
            <span key={i}>{line}{i < msg.content.split('\n').length - 1 && <br/>}</span>
          ))}
        </div>
        <div style={s.timestamp}>{msg.time}</div>
      </div>
      {isUser && <div style={s.userAvatar}>👤</div>}
    </div>
  );
}

// ── APP PRINCIPALE ─────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("accueil"); // accueil | chat | package
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pays, setPays] = useState(null);
  const [msgCount, setMsgCount] = useState(0);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const getTime = () => new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const startChat = (initialMsg) => {
    const welcome = {
      role: "assistant",
      content: "Bonjour ! Je suis l'assistant IA d'Ipofise. 🍁\n\nJe suis là pour vous aider à réaliser votre projet professionnel au Canada — que vous soyez en Afrique, en France ou déjà au Canada.\n\nPour mieux vous accompagner, pouvez-vous me dire dans quel pays vous êtes actuellement ?",
      time: getTime()
    };
    const userMsg = { role: "user", content: initialMsg, time: getTime() };
    setMessages([welcome, userMsg]);
    setScreen("chat");
    setMsgCount(1);
    sendToAPI([{ role: "user", content: initialMsg }]);
  };

  const sendToAPI = async (msgs) => {
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: msgs,
        }),
      });
      const data = await res.json();
      const reply = data.content?.map(b => b.text || "").join("") || "Désolé, une erreur s'est produite.";
      setMessages(prev => [...prev, { role: "assistant", content: reply, time: getTime() }]);
      setMsgCount(prev => prev + 1);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Une erreur s'est produite. Veuillez réessayer.", time: getTime() }]);
    }
    setLoading(false);
  };

  const send = () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input, time: getTime() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setMsgCount(prev => prev + 1);
    const apiMsgs = newMessages.filter(m => m.role !== "system").map(m => ({ role: m.role, content: m.content }));
    sendToAPI(apiMsgs);
  };

  // ── ÉCRAN ACCUEIL ────────────────────────────────────────────────────────
  if (screen === "accueil") return (
    <div style={s.page}>
      <div style={s.container}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.headerTop}>
            <div style={s.logo}>
              <span style={s.logoLeaf}>🍁</span>
              <div>
                <div style={s.logoName}>Ipofise</div>
                <div style={s.logoSub}>Assistant IA</div>
              </div>
            </div>
            <div style={s.headerBadge}>🟢 En ligne</div>
          </div>
          <h1 style={s.heroTitle}>
            Votre carrière<br />
            <span style={s.heroAccent}>au Canada</span><br />
            commence ici.
          </h1>
          <p style={s.heroDesc}>
            Je suis l'assistant IA d'Ipofise. Je vous guide de l'Afrique jusqu'à votre premier emploi au Canada — CV, entretiens, immigration, installation.
          </p>
          <div style={s.heroBadges}>
            {["🇨🇩 DRC", "🇨🇮 Côte d'Ivoire", "🇹🇳 Tunisie", "🇸🇳 Sénégal", "🇫🇷 France", "🌍 Afrique francophone"].map(b => (
              <span key={b} style={s.heroBadge}>{b}</span>
            ))}
          </div>
        </div>

        {/* Choisir un profil */}
        <div style={s.section}>
          <div style={s.sectionLabel}>Quelle est votre situation ?</div>
          <div style={s.profilGrid}>
            {PROFILS.map((p, i) => (
              <button key={i} style={s.profilBtn} onClick={() => startChat(p.msg)}>
                <span style={s.profilIcon}>{p.icon}</span>
                <span style={s.profilLabel}>{p.label}</span>
                <span style={s.profilArrow}>→</span>
              </button>
            ))}
          </div>
        </div>

        {/* Ou écrire directement */}
        <div style={s.section}>
          <div style={s.sectionLabel}>Ou posez votre question directement</div>
          <div style={s.directInput}>
            <input
              style={s.directInputField}
              placeholder="Bonjour, je cherche un emploi au Canada..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && input.trim() && startChat(input)}
            />
            <button style={s.directInputBtn} onClick={() => input.trim() && startChat(input)}>
              Démarrer →
            </button>
          </div>
          <div style={s.langNote}>
            💬 Vous pouvez écrire en français, arabe, lingala ou anglais
          </div>
        </div>

        {/* Services */}
        <div style={s.section}>
          <div style={s.sectionLabel}>Nos services</div>
          <div style={s.servicesRow}>
            {[
              { icon: "📄", title: "CV Canadien", price: "30–50 USD", desc: "Adapté aux standards canadiens" },
              { icon: "🎯", title: "Préparation Entretien", price: "30–50 USD", desc: "Simulation + coaching" },
              { icon: "💼", title: "Package Complet", price: "99–150 USD", desc: "CV + LinkedIn + Entretien + Plan", star: true },
              { icon: "✈️", title: "Plan d'Arrivée", price: "50–99 USD", desc: "De l'aéroport à l'emploi" },
            ].map((svc, i) => (
              <div key={i} style={{ ...s.svcCard, ...(svc.star ? s.svcCardStar : {}) }}>
                {svc.star && <div style={s.starBadge}>⭐ Recommandé</div>}
                <span style={s.svcIcon}>{svc.icon}</span>
                <div style={s.svcTitle}>{svc.title}</div>
                <div style={s.svcPrice}>{svc.price}</div>
                <div style={s.svcDesc}>{svc.desc}</div>
              </div>
            ))}
          </div>
          <div style={s.payNote}>
            💳 Paiement : Mobile Money · Orange Money · MTN · Wave · Interac · Carte bancaire européenne
          </div>
        </div>

        {/* Footer */}
        <div style={s.footer}>
          <div style={s.footerLogo}>🍁 Ipofise</div>
          <div style={s.footerInfo}>Saint-Gilles, Québec · dominique_mayamba@ipofise.com · 418 569 7151</div>
          <div style={s.footerSub}>Intégration, Rétention et Communication Interculturelle</div>
        </div>
      </div>
    </div>
  );

  // ── ÉCRAN CHAT ───────────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      <div style={s.chatContainer}>
        {/* Chat Header */}
        <div style={s.chatHeader}>
          <button style={s.backBtn} onClick={() => { setScreen("accueil"); setMessages([]); setInput(""); }}>
            ← Retour
          </button>
          <div style={s.chatHeaderCenter}>
            <div style={s.chatAvatar}>🍁</div>
            <div>
              <div style={s.chatName}>Assistant Ipofise</div>
              <div style={s.chatStatus}>🟢 En ligne · Répond en quelques secondes</div>
            </div>
          </div>
          <button style={s.packageBtn} onClick={() => setScreen("package")}>
            Nos offres
          </button>
        </div>

        {/* Barre de progression */}
        {msgCount > 0 && msgCount < 8 && (
          <div style={s.progressWrap}>
            <div style={s.progressBar}>
              <div style={{ ...s.progressFill, width: `${Math.min(msgCount * 12, 100)}%` }} />
            </div>
            <div style={s.progressLabel}>Analyse de votre profil en cours...</div>
          </div>
        )}

        {/* Messages */}
        <div style={s.messages}>
          {messages.map((m, i) => <MessageBubble key={i} msg={m} />)}
          {loading && (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 16 }}>
              <div style={s.avatar}>🍁</div>
              <TypingDots />
            </div>
          )}

          {/* Suggestion de package après 6 messages */}
          {msgCount >= 6 && !loading && (
            <div style={s.packageSuggestion}>
              <div style={s.packageSuggTitle}>🎯 Prêt à passer à l'action ?</div>
              <div style={s.packageSuggDesc}>Notre package complet vous donne tout ce qu'il faut pour décrocher un emploi au Canada.</div>
              <button style={s.packageSuggBtn} onClick={() => setScreen("package")}>
                Voir nos offres →
              </button>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* Input */}
        <div style={s.inputArea}>
          <div style={s.inputWrap}>
            <input
              style={s.input}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder="Écrivez votre message..."
              disabled={loading}
            />
            <button style={{ ...s.sendBtn, opacity: loading || !input.trim() ? 0.5 : 1 }} onClick={send} disabled={loading || !input.trim()}>
              ➤
            </button>
          </div>
          <div style={s.inputNote}>Ipofise · dominique_mayamba@ipofise.com · 418 569 7151</div>
        </div>
      </div>

      {/* ── ÉCRAN PACKAGE (modal) ── */}
      {screen === "package" && (
        <div style={s.modal}>
          <div style={s.modalContent}>
            <div style={s.modalHeader}>
              <div style={s.modalTitle}>🍁 Nos offres Ipofise</div>
              <button style={s.modalClose} onClick={() => setScreen("chat")}>✕</button>
            </div>

            <div style={s.modalBody}>
              <p style={s.modalDesc}>Choisissez le service qui correspond à votre situation. Paiement par Mobile Money, Interac ou carte bancaire.</p>

              {[
                { icon: "⭐", name: "Package Complet", price: "99–150 USD", tag: "Le plus populaire", color: "#dc2626", items: ["CV canadien adapté à votre métier", "Optimisation profil LinkedIn", "Simulation d'entretien + coaching", "Plan personnalisé d'arrivée au Canada", "Support WhatsApp pendant 2 semaines"] },
                { icon: "📄", name: "CV Canadien", price: "30–50 USD", tag: null, color: "#2563eb", items: ["CV reformaté aux standards canadiens", "Sans photo, sans âge, sans état civil", "Adapté à votre secteur", "Livré en 48h"] },
                { icon: "🎯", name: "Préparation Entretien", price: "30–50 USD", tag: null, color: "#16a34a", items: ["Simulation d'entretien en visio", "Feedback détaillé", "Questions typiques par secteur", "Techniques canadiennes de réponse"] },
                { icon: "✈️", name: "Plan d'Arrivée", price: "50–99 USD", tag: null, color: "#d97706", items: ["Checklist personnalisée selon votre profil", "Étapes NAS, banque, logement, transport", "Ressources spécifiques à votre province", "Support pendant votre 1ère semaine"] },
              ].map((pkg, i) => (
                <div key={i} style={{ ...s.pkgCard, borderColor: i === 0 ? pkg.color : "#e5e7eb" }}>
                  {pkg.tag && <div style={{ ...s.pkgTag, background: pkg.color }}>{pkg.tag}</div>}
                  <div style={s.pkgTop}>
                    <div>
                      <div style={s.pkgName}>{pkg.icon} {pkg.name}</div>
                      <div style={{ ...s.pkgPrice, color: pkg.color }}>{pkg.price}</div>
                    </div>
                  </div>
                  <div style={s.pkgItems}>
                    {pkg.items.map((item, j) => (
                      <div key={j} style={s.pkgItem}>
                        <span style={{ color: pkg.color, fontWeight: 700 }}>✓</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                  <a href="mailto:dominique_mayamba@ipofise.com?subject=Demande de service Ipofise" style={{ ...s.pkgBtn, background: pkg.color }}>
                    Demander ce service →
                  </a>
                </div>
              ))}

              <div style={s.payMethods}>
                <div style={s.payTitle}>💳 Modes de paiement acceptés</div>
                <div style={s.payList}>
                  {["📱 Orange Money", "📱 MTN Money", "📱 Wave", "📱 Airtel Money", "🏦 Interac (Canada)", "💳 Carte bancaire européenne", "💬 Virement WhatsApp"].map(p => (
                    <span key={p} style={s.payItem}>{p}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── STYLES ─────────────────────────────────────────────────────────────────
const s = {
  page: { minHeight: "100vh", background: "#0f172a", display: "flex", justifyContent: "center", fontFamily: "'Segoe UI', system-ui, sans-serif" },
  container: { width: "100%", maxWidth: 480, background: "#fff", minHeight: "100vh", display: "flex", flexDirection: "column" },

  // Header
  header: { background: "linear-gradient(160deg, #991b1b 0%, #dc2626 60%, #b91c1c 100%)", padding: "28px 24px 32px", color: "#fff" },
  headerTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  logo: { display: "flex", alignItems: "center", gap: 10 },
  logoLeaf: { fontSize: 28 },
  logoName: { fontSize: 18, fontWeight: 800, color: "#fff", lineHeight: 1 },
  logoSub: { fontSize: 11, color: "#fca5a5", marginTop: 2 },
  headerBadge: { fontSize: 12, background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "4px 12px", color: "#fff" },
  heroTitle: { fontSize: 32, fontWeight: 900, lineHeight: 1.2, margin: "0 0 12px", letterSpacing: "-0.5px" },
  heroAccent: { color: "#fbbf24" },
  heroDesc: { fontSize: 14, color: "#fecaca", lineHeight: 1.6, marginBottom: 16 },
  heroBadges: { display: "flex", flexWrap: "wrap", gap: 6 },
  heroBadge: { fontSize: 11, background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "3px 10px", color: "#fff" },

  // Sections
  section: { padding: "20px 20px 0" },
  sectionLabel: { fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 },

  // Profils
  profilGrid: { display: "flex", flexDirection: "column", gap: 8 },
  profilBtn: { display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, cursor: "pointer", textAlign: "left", transition: "all 0.15s" },
  profilIcon: { fontSize: 22, flexShrink: 0 },
  profilLabel: { flex: 1, fontSize: 14, fontWeight: 500, color: "#1f2937" },
  profilArrow: { fontSize: 16, color: "#dc2626", fontWeight: 700 },

  // Direct input
  directInput: { display: "flex", gap: 8, marginBottom: 8 },
  directInputField: { flex: 1, padding: "12px 14px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 14, outline: "none", color: "#1f2937" },
  directInputBtn: { background: "#dc2626", color: "#fff", border: "none", borderRadius: 10, padding: "12px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },
  langNote: { fontSize: 11, color: "#9ca3af", fontStyle: "italic", marginBottom: 4 },

  // Services
  servicesRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 },
  svcCard: { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: "14px 12px", position: "relative" },
  svcCardStar: { background: "#fef2f2", border: "1.5px solid #dc2626" },
  starBadge: { position: "absolute", top: -8, left: 10, background: "#dc2626", color: "#fff", fontSize: 9, fontWeight: 700, borderRadius: 10, padding: "2px 8px" },
  svcIcon: { fontSize: 22, display: "block", marginBottom: 6 },
  svcTitle: { fontSize: 13, fontWeight: 700, color: "#1f2937", marginBottom: 2 },
  svcPrice: { fontSize: 14, fontWeight: 800, color: "#dc2626", marginBottom: 3 },
  svcDesc: { fontSize: 11, color: "#6b7280" },
  payNote: { fontSize: 11, color: "#6b7280", textAlign: "center", padding: "10px 0 20px", lineHeight: 1.5 },

  // Footer
  footer: { marginTop: "auto", padding: "20px 24px", borderTop: "1px solid #f3f4f6", textAlign: "center" },
  footerLogo: { fontSize: 16, fontWeight: 800, color: "#dc2626", marginBottom: 4 },
  footerInfo: { fontSize: 12, color: "#6b7280", marginBottom: 2 },
  footerSub: { fontSize: 11, color: "#9ca3af" },

  // Chat container
  chatContainer: { width: "100%", maxWidth: 480, background: "#f8fafc", minHeight: "100vh", display: "flex", flexDirection: "column" },
  chatHeader: { background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 10 },
  backBtn: { background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 13, fontWeight: 600, padding: "6px 0", whiteSpace: "nowrap" },
  chatHeaderCenter: { flex: 1, display: "flex", alignItems: "center", gap: 10 },
  chatAvatar: { width: 36, height: 36, background: "#dc2626", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 },
  chatName: { fontSize: 14, fontWeight: 700, color: "#1f2937" },
  chatStatus: { fontSize: 11, color: "#16a34a" },
  packageBtn: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },

  // Progress
  progressWrap: { padding: "8px 16px", background: "#fff", borderBottom: "1px solid #f3f4f6" },
  progressBar: { height: 4, background: "#f3f4f6", borderRadius: 2, overflow: "hidden", marginBottom: 4 },
  progressFill: { height: "100%", background: "linear-gradient(90deg, #dc2626, #f87171)", borderRadius: 2, transition: "width 0.5s ease" },
  progressLabel: { fontSize: 10, color: "#9ca3af" },

  // Messages
  messages: { flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column" },
  avatar: { width: 32, height: 32, background: "#dc2626", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 },
  userAvatar: { width: 32, height: 32, background: "#e5e7eb", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 },
  senderName: { fontSize: 11, color: "#9ca3af", marginBottom: 4, paddingLeft: 2 },
  userBubble: { background: "#dc2626", color: "#fff", borderRadius: "18px 18px 4px 18px", padding: "12px 16px", fontSize: 14, lineHeight: 1.6 },
  aiBubble: { background: "#fff", color: "#1f2937", borderRadius: "4px 18px 18px 18px", padding: "12px 16px", fontSize: 14, lineHeight: 1.6, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: "1px solid #f3f4f6" },
  timestamp: { fontSize: 10, color: "#d1d5db", marginTop: 4, paddingLeft: 2 },

  // Typing
  typingWrap: { background: "#fff", borderRadius: "4px 18px 18px 18px", padding: "14px 18px", display: "flex", gap: 5, alignItems: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
  dot: { width: 8, height: 8, background: "#dc2626", borderRadius: "50%", animation: "bounce 1.2s infinite", opacity: 0.7 },

  // Package suggestion
  packageSuggestion: { background: "linear-gradient(135deg, #fef2f2, #fff)", border: "1.5px solid #fecaca", borderRadius: 16, padding: 16, marginBottom: 16, textAlign: "center" },
  packageSuggTitle: { fontSize: 14, fontWeight: 700, color: "#1f2937", marginBottom: 6 },
  packageSuggDesc: { fontSize: 12, color: "#6b7280", marginBottom: 12, lineHeight: 1.5 },
  packageSuggBtn: { background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" },

  // Input area
  inputArea: { background: "#fff", borderTop: "1px solid #e5e7eb", padding: "12px 16px 16px" },
  inputWrap: { display: "flex", gap: 8, marginBottom: 6 },
  input: { flex: 1, background: "#f9fafb", border: "1.5px solid #e5e7eb", borderRadius: 24, padding: "12px 16px", fontSize: 14, outline: "none", color: "#1f2937" },
  sendBtn: { width: 44, height: 44, background: "#dc2626", color: "#fff", border: "none", borderRadius: "50%", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  inputNote: { fontSize: 10, color: "#d1d5db", textAlign: "center" },

  // Modal
  modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100 },
  modalContent: { background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480, maxHeight: "90vh", display: "flex", flexDirection: "column" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #f3f4f6" },
  modalTitle: { fontSize: 16, fontWeight: 800, color: "#1f2937" },
  modalClose: { background: "#f3f4f6", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" },
  modalBody: { overflowY: "auto", padding: "16px 20px 32px", display: "flex", flexDirection: "column", gap: 12 },
  modalDesc: { fontSize: 13, color: "#6b7280", lineHeight: 1.5 },

  // Package cards
  pkgCard: { border: "1.5px solid #e5e7eb", borderRadius: 14, padding: 16, position: "relative" },
  pkgTag: { position: "absolute", top: -10, left: 16, color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 10, padding: "3px 12px" },
  pkgTop: { marginBottom: 10 },
  pkgName: { fontSize: 15, fontWeight: 700, color: "#1f2937", marginBottom: 2 },
  pkgPrice: { fontSize: 20, fontWeight: 900 },
  pkgItems: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 },
  pkgItem: { display: "flex", gap: 8, fontSize: 13, color: "#374151", alignItems: "flex-start" },
  pkgBtn: { display: "block", textAlign: "center", color: "#fff", textDecoration: "none", borderRadius: 10, padding: "11px", fontSize: 14, fontWeight: 700 },

  // Pay methods
  payMethods: { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: 14 },
  payTitle: { fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 10 },
  payList: { display: "flex", flexWrap: "wrap", gap: 6 },
  payItem: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 20, padding: "4px 10px", fontSize: 11, color: "#374151" },
};

// Animation dots
const styleEl = document.createElement('style');
styleEl.textContent = `@keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }`;
document.head.appendChild(styleEl);