# Plan de l'oral — 10 min de présentation + 5 min de questions

| Temps | Contenu | Support |
|---|---|---|
| 0:00 – 1:00 | **Problème et question** : la liberté de voyager est-elle la même pour tous ? Qu'est-ce que les visas, les liaisons aériennes et l'actualité géopolitique racontent ensemble ? | Vue générale (`img/00_vue_generale.png`) |
| 1:00 – 2:30 | **Utilisateurs et tâches** : voyageur, journaliste/analyste, étudiant en géopolitique ; chercher, comparer, repérer des écarts, contextualiser | Tableau de la doc, section 2 |
| 2:30 – 4:00 | **Données et pipeline** : 3 sources (Passport Index 2026, OpenFlights 2014, événements sourcés) → 3 scripts → 3 CSV traités → D3 | `pipeline.svg` |
| 4:00 – 8:30 | **Démo des visualisations** (≈ 45 s chacune) : carte (choroplèthe + arcs) → nuage de points + r de Pearson → top destinations → matrice (légende) → frise. Pour chacune : variables visuelles, technique, à quoi ça sert | Application en direct, plan B : captures `docs/img/` |
| 8:30 – 9:30 | **Limites assumées** : sources non contemporaines, corrélation non causale, score ≠ Henley, règles réelles variables | Section « limites » des fiches |
| 9:30 – 10:00 | **Conclusion et suites** : Henley annuel, fréquences de vols datées, cas géopolitiques précis | README, « Sprint 2 » |

## Scénario de démo conseillé
1. Passeport **France**, comparaison **Algérie** : la carte et la matrice montrent immédiatement l'asymétrie.
2. Filtre « Visa préalable » : les pays atténués disparaissent, on voit où le visa est nécessaire.
3. Clic sur un point du nuage de points : on change de passeport, tout se met à jour.
4. Frise : sélectionner un événement (ex. Covid-19) et montrer les pays surlignés.
5. Export CSV du passeport choisi.

## Questions probables (5 min)
- **Pourquoi pas de source Kaggle / de score Henley ?** Matrice bilatérale ouverte et reproductible ; Henley prévu en sprint 2.
- **Pourquoi comparer 2026 et 2014 ?** Seule source ouverte de routes avec ce format ; on assume une association descriptive, pas une évolution.
- **Pourquoi une carte choroplèthe catégorielle ?** Huit classes sans ordre numérique : des teintes distinctes évitent de suggérer une gradation.
- **Comment éviter la surcharge visuelle des arcs ?** Limités à 85, blancs semi-transparents, désactivables.
- **Comment le score est-il calculé ?** Sans visa + visa à l'arrivée + ETA (à lire comme « sans visa préalable »).
- **Quelles sont les limites éthiques ?** Les règles d'entrée dépendent du motif du séjour ; l'outil ne remplace pas les sources consulaires.
