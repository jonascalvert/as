# DevFacs — devis & factures pour auto-entrepreneur

**DevFacs** est une application web simple pour faire vos **devis** et **factures** en quelques clics.
Aucune installation, aucun compte, aucun serveur : ouvrez `index.html` dans votre navigateur.

## Fonctionnalités

- **Devis** et **factures** avec numérotation automatique et continue (`D-2026-001`, `F-2026-001`).
- **Transformer un devis en facture** en un clic (le devis passe en « Accepté »).
- **Couleur personnalisable** des devis et factures (8 couleurs proposées ou n’importe quelle autre), dans Paramètres.
- Aperçu en direct du document + **Imprimer / PDF** (format A4).
- Mentions obligatoires ajoutées automatiquement :
  - « TVA non applicable, art. 293 B du CGI » (ou calcul de la TVA si vous l’activez),
  - mention « EI » après votre nom, SIRET,
  - échéance, pénalités de retard et indemnité forfaitaire de 40 € (clients professionnels),
  - validité du devis et zone « Bon pour accord ».
- Suivi des statuts : brouillon, envoyé, accepté/refusé, à payer, payée, annulée, **en retard**.
- **Clients** : carnet d’adresses réutilisable.
- **Tableau de bord** : CA encaissé de l’année, progression vers le plafond micro-entreprise,
  estimation des cotisations URSSAF, montants à encaisser, devis en attente.
- **Sauvegarde** : export / import JSON.
- **Exemple intégré** : bouton « Voir un exemple » pour découvrir l’application avec des données fictives, puis « Effacer l’exemple » pour commencer.
- Fonctionne sur ordinateur et téléphone, en thème clair ou sombre.

## Utilisation

1. Ouvrez `index.html` (double-clic) dans Chrome, Firefox, Edge ou Safari.
2. Allez dans **Paramètres** et remplissez vos informations (nom, adresse, SIRET, IBAN…).
3. Ajoutez un client, puis créez un devis ou une facture.
4. Cliquez sur **Imprimer / PDF** puis choisissez « Enregistrer au format PDF ».

> Les données restent **uniquement dans votre navigateur** (localStorage).
> Pensez à faire **Paramètres → Exporter** régulièrement pour garder une copie.

Le plafond de chiffre d’affaires et le taux de cotisations sont réglables dans les paramètres :
vérifiez les valeurs qui correspondent à votre activité sur urssaf.fr.
