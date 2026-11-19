export interface PartnerSupportProfile {
  readonly slug: string;
  readonly name: string;
  readonly liveChat: string;
  readonly supportEmail: string;
  readonly securityEmail: string | null;
  readonly specializedEmail: {
    readonly labelFr: string;
    readonly labelEn: string;
    readonly email: string;
  } | null;
  readonly phone: string | null;
  readonly officialUrl: string;
  readonly languagesFr: string;
  readonly languagesEn: string;
  readonly escalationNoteFr: string;
  readonly escalationNoteEn: string;
}

export interface SupportScenarioGuide {
  readonly id: string;
  readonly titleFr: string;
  readonly titleEn: string;
  readonly recommendedChannelFr: string;
  readonly recommendedChannelEn: string;
  readonly stepsFr: readonly string[];
  readonly stepsEn: readonly string[];
}

export const PARTNER_SUPPORT_PROFILES: readonly PartnerSupportProfile[] = [
  {
    slug: "1xbet",
    name: "1xBet",
    liveChat: "24/7 (site & app)",
    supportEmail: "info-en@1xbet-team.com",
    securityEmail: "security-en@1xbet-team.com",
    specializedEmail: null,
    phone: "+44 1273 256987 / +44 204 5772777",
    officialUrl: "https://1xbet.com",
    languagesFr: "Français, Anglais et support multilingue 24/7",
    languagesEn: "French, English & 24/7 multilingual support",
    escalationNoteFr:
      "Réclamations formelles à transmettre par e-mail avec ID joueur et justificatifs (délai maximal jusqu'à 6 mois selon les CGU).",
    escalationNoteEn:
      "Formal disputes can be submitted via support email with player ID and evidence (up to 6 months per T&Cs).",
  },
  {
    slug: "melbet",
    name: "Melbet",
    liveChat: "24/7 (site & app)",
    supportEmail: "support@melbet.com",
    securityEmail: "security@melbet.com",
    specializedEmail: {
      labelFr: "Comptes bloqués / licence",
      labelEn: "Blocked accounts / licensing",
      email: "license@melbet.com",
    },
    phone: "+44 20 3807 7601",
    officialUrl: "https://melbet.com",
    languagesFr: "Français, Anglais et support multilingue 24/7",
    languagesEn: "French, English & 24/7 multilingual support",
    escalationNoteFr:
      "Vérification KYC traitée sous 24 à 48 h ; comptes suspendus traités via license@melbet.com.",
    escalationNoteEn:
      "KYC reviews typically take 24–48 hours; suspended accounts are handled via license@melbet.com.",
  },
  {
    slug: "betwinner",
    name: "Betwinner",
    liveChat: "24/7 (site & app)",
    supportEmail: "info-en@betwinner.com",
    securityEmail: "security@betwinner.com",
    specializedEmail: {
      labelFr: "Réclamations & Finance",
      labelEn: "Complaints & Accounting",
      email: "complaints@betwinner.com · accounting@betwinner.com",
    },
    phone: "+44 204 5772772",
    officialUrl: "https://betwinner.com",
    languagesFr: "Français, Anglais et support multilingue 24/7",
    languagesEn: "French, English & 24/7 multilingual support",
    escalationNoteFr:
      "Canal dédié aux litiges via complaints@betwinner.com ; questions de paiement via accounting@betwinner.com.",
    escalationNoteEn:
      "Dedicated disputes via complaints@betwinner.com; payment/finance queries via accounting@betwinner.com.",
  },
  {
    slug: "megapari",
    name: "Megapari",
    liveChat: "24/7 (site & app)",
    supportEmail: "support-en@megapari.com",
    securityEmail: "security@megapari.com",
    specializedEmail: null,
    phone: null,
    officialUrl: "https://megapari.com",
    languagesFr: "Français, Anglais et support multilingue 24/7",
    languagesEn: "French, English & 24/7 multilingual support",
    escalationNoteFr:
      "Aucun numéro de téléphone public vérifié ; privilégier le chat 24/7 ou security@megapari.com pour le KYC et les litiges.",
    escalationNoteEn:
      "No verified public phone line; use 24/7 live chat or security@megapari.com for KYC and dispute resolution.",
  },
  {
    slug: "linebet",
    name: "Linebet",
    liveChat: "24/7 (site & app)",
    supportEmail: "support-en@linebet.com",
    securityEmail: "security@linebet.com",
    specializedEmail: {
      labelFr: "Comptes bloqués / restreints",
      labelEn: "Blocked / restricted accounts",
      email: "block@linebet.com",
    },
    phone: null,
    officialUrl: "https://linebet.com",
    languagesFr: "Français, Anglais et support multilingue 24/7",
    languagesEn: "French, English & 24/7 multilingual support",
    escalationNoteFr:
      "Aucun téléphone public vérifié ; les blocages de compte et contestations passent par block@linebet.com.",
    escalationNoteEn:
      "No verified public phone line; account blocks and restrictions are escalated to block@linebet.com.",
  },
  {
    slug: "paripesa",
    name: "Paripesa",
    liveChat: "24/7 (site & app)",
    supportEmail: "support-en@paripesa.com",
    securityEmail: "security@paripesa.com",
    specializedEmail: {
      labelFr: "Paiements / Comptes bloqués",
      labelEn: "Payments / Blocked accounts",
      email: "payments-support@paripesa.com · block@paripesa.com",
    },
    phone: null,
    officialUrl: "https://paripesa.com",
    languagesFr: "Français, Anglais et support multilingue 24/7",
    languagesEn: "French, English & 24/7 multilingual support",
    escalationNoteFr:
      "Aucun téléphone public vérifié ; service dédié paiements (payments-support@paripesa.com) et blocages (block@paripesa.com).",
    escalationNoteEn:
      "No verified public phone line; dedicated payments (payments-support@paripesa.com) and blocks (block@paripesa.com).",
  },
  {
    slug: "1win",
    name: "1win",
    liveChat: "24/7 (site & app)",
    supportEmail: "support@1win.social",
    securityEmail: "security@1win.social",
    specializedEmail: null,
    phone: null,
    officialUrl: "https://1win.run",
    languagesFr: "Français, Anglais et support multilingue 24/7",
    languagesEn: "French, English & 24/7 multilingual support",
    escalationNoteFr:
      "1win n'a pas de ligne téléphonique client : méfiez-vous des faux numéros. Réclamations recommandées sous 10 jours par chat ou e-mail.",
    escalationNoteEn:
      "1win has no public phone support: beware of fake numbers. Submit formal complaints within 10 days via chat or email.",
  },
  {
    slug: "winwinbet",
    name: "Winwinbet",
    liveChat: "24/7 (site & app)",
    supportEmail: "support@winwinbet.net",
    securityEmail: null,
    specializedEmail: {
      labelFr: "Réclamations & Technique",
      labelEn: "Feedback & Technical",
      email: "feedback@winwinbet.net · tech@winwinbet.net",
    },
    phone: null,
    officialUrl: "https://winwinbet.net",
    languagesFr: "Français, Anglais et support multilingue 24/7",
    languagesEn: "French, English & 24/7 multilingual support",
    escalationNoteFr:
      "Escalader les tickets non résolus vers feedback@winwinbet.net avec votre ID joueur (réponse habituelle sous 24 à 48 h).",
    escalationNoteEn:
      "Escalate unresolved tickets to feedback@winwinbet.net with your player ID (typical response in 24–48 hours).",
  },
];

export const SUPPORT_SCENARIO_GUIDES: readonly SupportScenarioGuide[] = [
  {
    id: "deposit",
    titleFr: "Dépôt non crédité",
    titleEn: "Deposit not credited",
    recommendedChannelFr: "Chat en direct 24/7 + service paiements (Paripesa / Betwinner)",
    recommendedChannelEn: "24/7 Live Chat + payments email (Paripesa / Betwinner)",
    stepsFr: [
      "Patientez 15 à 30 minutes (délai réseau Mobile Money ou banque).",
      "Préparez votre ID joueur, la date/heure exacte, le montant et la capture du reçu de transaction.",
      "Contactez le chat en direct 24/7 sur le site officiel (ou payments-support@paripesa.com / accounting@betwinner.com).",
    ],
    stepsEn: [
      "Wait 15–30 minutes for Mobile Money or bank network confirmation.",
      "Prepare your player ID, exact timestamp, amount, and transaction receipt screenshot.",
      "Reach out via 24/7 live chat on the official site (or payments-support@paripesa.com / accounting@betwinner.com).",
    ],
  },
  {
    id: "withdrawal",
    titleFr: "Retrait en attente",
    titleEn: "Pending withdrawal",
    recommendedChannelFr: "Chat en direct 24/7 · Vérifier d'abord le KYC et le rollover",
    recommendedChannelEn: "24/7 Live Chat · Check KYC and bonus rollover first",
    stepsFr: [
      "Vérifiez que votre profil est complet, votre numéro activé et les conditions d'un éventuel bonus (rollover) terminées.",
      "Assurez-vous de retirer via la même méthode que celle utilisée pour le dépôt.",
      "Si le statut reste bloqué au-delà de 24 h, transmettez le numéro de demande au chat 24/7 ou par e-mail.",
    ],
    stepsEn: [
      "Verify that your profile is complete, phone verified, and any active bonus rollover is fully settled.",
      "Ensure you withdraw using the same payment method used for your deposit.",
      "If pending beyond 24h, send your withdrawal request ID to 24/7 live chat or support email.",
    ],
  },
  {
    id: "account-access",
    titleFr: "Compte inaccessible ou bloqué",
    titleEn: "Locked or inaccessible account",
    recommendedChannelFr: "Service Sécurité / Blocages (security@ ou block@ / license@)",
    recommendedChannelEn: "Security / Blocks desk (security@ or block@ / license@)",
    stepsFr: [
      "Utilisez d'abord la récupération par e-mail ou SMS officiel sur la page de connexion.",
      "En cas de blocage ou de soupçon d'accès tiers, écrivez au service sécurité (ex. block@linebet.com, block@paripesa.com, license@melbet.com, security@...).",
      "Indiquez votre ID compte et tenez une pièce d'identité officielle prête (ne communiquez jamais votre mot de passe).",
    ],
    stepsEn: [
      "First try official email/SMS password recovery on the sign-in page.",
      "For restricted accounts, email the security/blocks address (e.g., block@linebet.com, block@paripesa.com, license@melbet.com, security@...).",
      "Provide your account ID and keep a valid ID document ready (never share your password).",
    ],
  },
  {
    id: "kyc",
    titleFr: "Vérification d'identité (KYC)",
    titleEn: "Identity verification (KYC)",
    recommendedChannelFr: "Département Sécurité (security@...) · Délai 24–48 h",
    recommendedChannelEn: "Security Department (security@...) · 24–48h review",
    stepsFr: [
      "Envoyez des photos nettes, sans reflet ni bords coupés (CNI, passeport ou permis + justificatif de domicile si demandé).",
      "Vérifiez que le nom du compte correspond exactement à celui du document et du moyen de paiement.",
      "En l'absence de retour après 48 h, relancez par e-mail sécurité avec la référence de votre dossier.",
    ],
    stepsEn: [
      "Submit clear, uncropped photos (ID card, passport, or driver's license + proof of address if requested).",
      "Confirm the account name matches both your ID document and your payment account.",
      "If unreviewed after 48h, follow up with the security email citing your ticket reference.",
    ],
  },
  {
    id: "bonus",
    titleFr: "Bonus non reçu",
    titleEn: "Bonus not received",
    recommendedChannelFr: "Chat en direct 24/7 avant de commencer à parier",
    recommendedChannelEn: "24/7 Live Chat before placing bets",
    stepsFr: [
      "Vérifiez que l'option « Participer aux offres de bonus » était activée, le profil 100 % rempli et le dépôt >= au minimum requis.",
      "Notez que les dépôts en cryptomonnaie sont généralement exclus des bonus de bienvenue.",
      "Contactez le chat 24/7 immédiatement avant de miser le dépôt afin qu'un agent vérifie l'attribution.",
    ],
    stepsEn: [
      "Confirm bonus opt-in was enabled, profile 100% filled, and deposit met the minimum threshold.",
      "Note that cryptocurrency deposits are usually excluded from welcome bonuses.",
      "Contact 24/7 live chat immediately before wagering your deposit so an agent can review eligibility.",
    ],
  },
  {
    id: "bet-settlement",
    titleFr: "Pari ou ticket gagnant non réglé",
    titleEn: "Unsettled bet or winning slip",
    recommendedChannelFr: "Chat en direct 24/7 avec le numéro du coupon",
    recommendedChannelEn: "24/7 Live Chat with bet slip ID",
    stepsFr: [
      "Attendez la publication du résultat officiel de la compétition (prolongations / VAR / statistiques officielles).",
      "Notez l'identifiant exact du ticket et l'intitulé du match.",
      "Ouvrez le chat 24/7 ou écrivez à l'adresse support avec une capture du coupon.",
    ],
    stepsEn: [
      "Allow time for official competition result confirmation (extra time, VAR, or official stats).",
      "Copy the exact bet slip ID and match name.",
      "Open 24/7 live chat or email support with a screenshot of your ticket.",
    ],
  },
  {
    id: "complaint",
    titleFr: "Réclamation officielle & suivi",
    titleEn: "Formal complaint & tracking",
    recommendedChannelFr: "E-mail écrit officiel (complaints@ / feedback@ / support@)",
    recommendedChannelEn: "Written official email (complaints@ / feedback@ / support@)",
    stepsFr: [
      "Rassemblez chronologiquement : ID joueur, captures d'écran, numéros de transaction/coupon et échanges de chat précédents.",
      "Envoyez un message écrit clair à l'adresse dédiée (complaints@betwinner.com, feedback@winwinbet.net ou support/sécurité de l'opérateur).",
      "Conservez l'accusé de réception / numéro de ticket pour assurer le suivi (réponse typique sous 24 à 72 h).",
    ],
    stepsEn: [
      "Gather a clear timeline: player ID, screenshots, transaction/slip IDs, and prior chat transcripts.",
      "Send a written email to the operator's dedicated address (complaints@betwinner.com, feedback@winwinbet.net, or official support/security).",
      "Keep your ticket reference number for follow-up (typical reply within 24–72 hours).",
    ],
  },
];
