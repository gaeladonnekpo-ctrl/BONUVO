-- BONUVO Phase 8 : Ajout de la plateforme officielle Facebook et enregistrement des 3 canaux officiels BONUVO

ALTER TABLE public.community_channels
  DROP CONSTRAINT IF EXISTS community_channels_platform_check;
--> statement-breakpoint

ALTER TABLE public.community_channels
  ADD CONSTRAINT community_channels_platform_check
  CHECK (platform IN ('telegram', 'whatsapp_channel', 'whatsapp_group', 'facebook'));
--> statement-breakpoint

-- Remplace les anciens liens d'exemple éventuels et insère les 3 canaux officiels BONUVO
DELETE FROM public.community_channels
WHERE invite_url IN (
  'https://t.me/bonuvo_official',
  'https://whatsapp.com/channel/0029VaBonuvoOfficial',
  'https://t.me/+OXjlhqM1ShVmZWM0',
  'https://whatsapp.com/channel/0029VbACyWA4dTnIfN5BA01S',
  'https://www.facebook.com/profile.php?id=100066896162096'
);
--> statement-breakpoint

INSERT INTO public.community_channels (
  platform,
  country_code,
  title_fr,
  title_en,
  description_fr,
  description_en,
  invite_url,
  subscriber_count_label,
  priority_order,
  active
) VALUES
  (
    'telegram',
    'GLOBAL',
    'Canal Telegram Officiel BONUVO',
    'BONUVO Official Telegram Channel',
    'Canal Telegram principal : pronostics BONUVO AI en direct, coupons combinés validés et alertes bonus bookmakers.',
    'Main Telegram channel: live BONUVO AI predictions, validated combined coupons and bookmaker bonus alerts.',
    'https://t.me/+OXjlhqM1ShVmZWM0',
    'Canal officiel vérifié',
    10,
    true
  ),
  (
    'whatsapp_channel',
    'GLOBAL',
    'Chaîne WhatsApp Officielle BONUVO',
    'BONUVO Official WhatsApp Channel',
    'Diffusion quotidienne des meilleurs codes promos vérifiés (1xBet, Melbet, Betwinner) et sélections du jour.',
    'Daily broadcast of top verified promo codes (1xBet, Melbet, Betwinner) and daily picks.',
    'https://whatsapp.com/channel/0029VbACyWA4dTnIfN5BA01S',
    'Chaîne officielle vérifiée',
    20,
    true
  ),
  (
    'facebook',
    'GLOBAL',
    'Page Facebook Officielle BONUVO',
    'BONUVO Official Facebook Page',
    'Retrouvez toutes nos actualités sportives, nos comparatifs d''offres bookmakers et nos annonces officielles sur Facebook.',
    'Follow all our sports news, bookmaker offer comparisons and official announcements on Facebook.',
    'https://www.facebook.com/profile.php?id=100066896162096',
    'Page officielle vérifiée',
    30,
    true
  );
