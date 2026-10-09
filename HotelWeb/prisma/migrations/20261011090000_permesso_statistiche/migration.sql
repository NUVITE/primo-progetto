-- Nuovo permesso "Vedere le statistiche" ai ruoli della direzione (il titolare unico ha già tutto).
UPDATE `Ruolo` SET `permessi` = JSON_ARRAY_APPEND(`permessi`, '$', 'statistiche.vedi')
  WHERE `nome` IN ('Amministratore', 'Direttore') AND NOT JSON_CONTAINS(`permessi`, '"statistiche.vedi"');
