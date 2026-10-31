# Journal des modifications

La traduction française de [CHANGELOG.md](CHANGELOG.md), lue par la fenêtre
« Nouveautés » de l'app quand elle est en français. Seules les versions
traduites ici y apparaissent en français ; les autres s'affichent en anglais.
Chaque ligne est marquée :
- 🆕 Nouveau : ce que l'app ne faisait pas avant,
- 🎨 Amélioré : ce qui existait et fonctionne ou se présente mieux,
- 🐛 Corrigé : un bug ou une régression corrigés.

## 2.26.0

🎨 **Les longues listes s’ouvrent plus vite.** Les projets, Ma semaine et À venir qui comptent des centaines de tâches ne dessinent plus que les lignes proches de l’écran : ils s’ouvrent et défilent plus souplement. L’app charge aussi moins de code au démarrage et écrit les dates plus vite.

## 2.25.0

🆕 **Organisez votre table à votre façon.** Tirez le bord d’un en-tête pour redimensionner une colonne, et déplacez n’importe laquelle, le titre compris, où vous voulez. Chaque en-tête a son icône, et un réglage d’Affichage passe à la ligne les titres et descriptions longs au lieu de les couper.

🆕 **Sachez de qui dépend une sous-tâche.** Dans une table, une sous-tâche affiche maintenant le nom de sa tâche parente à côté de son titre.

🆕 **Chaque icône a un nom.** Posez le pointeur sur un bouton qui n’a qu’une icône, comme les actions qui apparaissent sur une tâche : son nom s’affiche tout de suite. Le clavier y a droit aussi.

🎨 **La durée comme le reste.** Dans une tâche, la durée ressemble à la date et au projet à côté d’elle. Choisissez 30 minutes ou tapez 1h30, puis appuyez sur E pour l’ouvrir au clavier.

🎨 **Les tags ressemblent à des tags.** Ouvrez une tâche : chaque tag est une pastille de sa couleur, avec son icône et une croix pour le retirer. En créer ou en choisir un ajoute sa pastille tout de suite.

🎨 **Créez une vue avec toutes les options.** La fenêtre qui ajoute une vue à un projet propose aussi Inclure les tâches planifiées, comme Affichage.

🎨 **À venir indique la date de chaque jour.** Les titres affichent Demain · jeu. 29 oct., puis ven. 30 oct., au lieu d’un jour de semaine seul qu’il fallait compter.

🎨 **Une liste de contrôle reste en vue.** Sous une tâche, la ligne après « Avant l’appel : » montre maintenant les éléments restant à cocher, au lieu de finir sur deux-points.

🎨 **Plus lisible.** Les noms de projet gardent leur couleur et restent nets : un peu plus profonds sur une page claire, un peu plus clairs sur une page sombre. Le gris des textes secondaires est aussi un peu plus marqué.

🎨 **Des lignes et une barre latérale plus nettes.** La case est à hauteur du titre, les actions s’alignent sur sa première ligne et la poignée de glisser reste dans les groupes teintés. Les titres de section de la barre latérale se cliquent plus facilement.

🎨 **Date de début partout.** La date à laquelle vous prévoyez une tâche s’appelle Date de début dans la saisie, les sélections et Affichage, comme dans la fenêtre de la tâche. L’échéance garde son nom.

🎨 **La Revue sur téléphone.** Les quatre déplacements forment une grille de grands boutons, sans aucun seul sur une deuxième ligne. La ligne de sous-tâche de la saisie est entièrement visible.

🐛 **Des compteurs fidèles à la page.** Les nombres à côté de Cette semaine, Aujourd’hui et À venir suivent ce que la page liste, avec son regroupement et son réglage Afficher les sous-tâches.

🐛 **Un curseur là où vous tapez.** La description d’une nouvelle tâche affiche toujours son curseur, et dans la liste de contrôle d’une tâche, un nouvel élément vide ne l’affiche plus tout à droite.

🐛 **Un champ de recherche net en noir pur.** La zone de recherche des menus d’Affichage n’a plus de tache grise dans le thème sombre AMOLED.

## 2.24.0

🎨 **Choisissez la pleine largeur une fois.** Dans Affichage, activez Pleine largeur et toutes vos listes suivent, sans le régler page par page.

🎨 **Une liste de colonnes plus claire.** Dans Affichage, Colonnes d’un tableau, chaque colonne a désormais son icône, le nombre de colonnes affichées disparaît et les poignées pour les déplacer sont plus discrètes.

🐛 **Retrouvez les sous-tâches là où elles vont.** Quand une page est groupée par priorité, tag, projet ou jour, une sous-tâche apparaît aussi dans son propre groupe, comme dans Todoist, et reste sous sa tâche parente.

🐛 **Les tags retrouvent leurs sous-tâches.** La page d’un tag et la page Tags comptent désormais toutes les tâches qui le portent, sous-tâches comprises. Un tag créé depuis la fenêtre d’une tâche est aussitôt sélectionné sur elle.

🐛 **Les tâches du même jour et de même priorité suivent votre barre latérale.** Leur ordre respecte désormais celui de vos espaces de travail et de vos projets.

## 2.23.0

🎨 **Des détails plus clairs.** Les textes secondaires sont plus lisibles, l’aide à la recherche de projet est plus courte et les colonnes des graphiques sont plus faciles à sélectionner.

🐛 **Améliorations des performances.** L’application charge moins de code au démarrage et reste plus réactive quand vous ouvrez une tâche, écrivez ou faites défiler une liste. La synchronisation travaille moins quand rien n’a changé, et la Revue ne sollicite plus le processeur au repos.

## 2.22.0

🆕 **Voyez la progression d’un projet.** Un cercle à côté des projets sans icône personnalisée se remplit à mesure que vous terminez des tâches.

🆕 **Filtrez votre tableau de bord.** Dans Affichage, choisissez les priorités et les tags pour vous concentrer sur le travail à examiner. Les filtres s’appliquent aussi aux tâches terminées et à la période précédente.

🎨 **Choisissez une icône de projet ou de filtre.** Retrouvez une sélection resserrée d’icônes familières par leur nom ou des mots associés. Les icônes déjà choisies restent en place.

🎨 **Matrice d’Eisenhower affinée.** Choisissez jusqu’à quelle date afficher les tâches et définissez séparément l’urgence et l’importance. La barre latérale indique leur nombre dans la matrice ; Prochainement n’a plus de compteur.

🐛 **Alignez le texte des sous-tâches.** Le champ de sous-tâche dans la fenêtre d’ajout est aligné avec sa case.

## 2.21.0

🆕 **Choisissez le noir pur en mode sombre.** Dans Réglages, Apparence, réglez Style sombre sur AMOLED. Les pages et la barre latérale deviennent noires, avec n'importe quelle couleur d'accent, tandis que menus et fenêtres restent un ton plus clairs pour rester lisibles.

🆕 **Joignez plusieurs fichiers à un commentaire.** Choisissez-en autant que vous voulez avec le trombone, ou collez une capture ou un GIF n'importe où dans la tâche. Les fichiers attendent sous forme de pastilles, puis chacun devient son propre commentaire, votre texte sur le premier. Cliquez sur un fichier pour l'ouvrir dans Todoist.

🆕 **Retournez une longue discussion.** À partir de quatre commentaires, un bouton Plus récents d'abord affiche le dernier en haut. C'est seulement pour le moment : la tâche suivante s'ouvre comme écrite, du plus ancien au plus récent.

🎨 **Tables affinées.** Cliquez sur un titre pour trier, cliquez encore pour inverser. Son chevron filtre, déplace ou masque la colonne, et vous pouvez glisser les titres pour les réordonner. Une nouvelle colonne Assignée à, dans Affichage, Colonnes, montre qui s'occupe de chaque tâche.

🎨 **Écrivez les dates comme dans Todoist.** Dans le champ d'ajout, tmr, tmrw et tmw signifient demain, et tod et tom en minuscules signifient aujourd'hui et demain. Un prénom comme Tom avec une majuscule reste dans votre tâche.

🎨 **Rattrapez plusieurs versions d'un coup.** Après quelques versions d'absence, Nouveautés devient une seule liste au lieu d'une page par version, les images d'abord, puis le nouveau, l'amélioré et le corrigé, chacun avec sa version. Réglages, Journal des modifications garde chaque version à part.

## 2.20.0

🆕 **Repérez les tâches avec des commentaires.** Une icône et leur nombre apparaissent dans les listes, tableaux et tables. Cliquez dessus pour ouvrir la discussion. Vous pouvez masquer ce détail depuis Affichage.

🎨 **Changez les dates et priorités plus vite.** Le menu clic droit propose les priorités et les raccourcis de date en accès direct. Le calendrier reste accessible en un clic pour choisir une date précise.

🎨 **Voyez où ira une carte.** Quand le tableau utilise un tri automatique, la colonne de destination se teinte pendant le déplacement. Le tri manuel conserve un indicateur de position précis.

🎨 **Écrivez sans envoyer trop tôt.** Entrée passe à la ligne. Cmd+Entrée ou Ctrl+Entrée envoie le commentaire ou enregistre sa modification. Le bouton d’envoi reste disponible. Le cadre du commentaire devient plus gris pendant la saisie : vous voyez que Échap l’a quitté.

🎨 **Voyez le retard d’un coup d’œil.** À partir de deux jours, une tâche en retard l’affiche (« 3 j de retard », « 45 j de retard ») au lieu de sa date. Survolez-la pour voir la date.

🎨 **Repérez une sous-tâche.** Une sous-tâche ouverte affiche « Sous-tâche de » au-dessus de son titre, avec un lien vers sa tâche parente.

🐛 **Sélectionnez les cartes à la souris.** Partez de n’importe quel espace vide de la page pour sélectionner plusieurs cartes sans surligner de texte. Un geste commencé sur une carte continue de la déplacer.

🐛 **Refermez les menus de tâche facilement.** Un clic à côté ou Échap ferme le menu ouvert. Le clic de fermeture ne déclenche plus une action dessous et ouvrir un autre menu ferme le précédent.

🐛 **Gardez la maîtrise des répétitions.** Déplacer une tâche récurrente vers À faire cette semaine ou Un jour demande désormais confirmation avant d’arrêter sa répétition. Annulez pour la conserver, ou annulez le déplacement ensuite.

🐛 **Restez connecté malgré les erreurs temporaires.** Un échec temporaire de renouvellement ou un refus de permission n’efface plus votre connexion. Les requêtes d’un ancien onglet utilisent les identifiants renouvelés lorsqu’ils sont disponibles.

🐛 **Mettez à jour quand vous voulez.** Quand une nouvelle version sort, une carte l’annonce en bas de la barre latérale, ou au-dessus des onglets sur téléphone. Rien ne se recharge avant « Mettre à jour » ; « Plus tard » laisse un rappel dans la barre. Sinon, elle arrive à la prochaine ouverture de l’app.

## 2.19.0

🆕 **Créez des vues pour vos projets.** Appuyez sur + sous le titre d'un projet pour ajouter une vue : son nom, sa disposition, son regroupement et ses filtres. Passez d'une vue à l'autre en un clic, sans rien reconfigurer. Appuyez sur la vue ouverte pour la modifier. Vos vues suivent votre compte.

🎨 **Affichage affiné.** Affichage et chaque vue se présentent en trois parties : type de vue, regrouper et trier, filtres. Priorité, estimation, tags et assignation sont des menus à cases à cocher. Dans une table, Colonnes ouvre une liste sur le côté : activez ou désactivez les colonnes et glissez-les pour les réordonner.

## 2.18.0

🆕 **Mentionnez quelqu'un dans un commentaire.** Dans un projet partagé, tapez @ dans le commentaire d'une tâche pour choisir une personne dans la liste. Notifier, au-dessus du champ, choisit qui est prévenu : tout le monde ou une seule personne. Une personne mentionnée est toujours prévenue.

🎨 **Repliez les sous-tâches depuis le titre.** La flèche après le titre d'une tâche parente masque ou affiche ses sous-tâches. Todoist garde votre choix : la tâche reste repliée après un rechargement et dans les apps Todoist.

🐛 **Les analyses correspondent à Todoist.** Analyses compte désormais les sous-tâches sur toutes les pages. Sur un projet ou la boîte de réception, le total terminé et le pourcentage sont ceux de Todoist. Les autres pages précisent que leur chiffre terminé couvre tous les projets, sur 7 jours.

🐛 **Les compteurs des projets correspondent à Todoist.** Le nombre à côté de chaque projet et de la boîte de réception, dans la barre latérale, compte désormais les sous-tâches, comme dans Todoist.

🐛 **Les mises à jour arrivent toutes seules.** Quand une nouvelle version sort, l'app bascule dessus quelques secondes après l'ouverture, sans recharger plusieurs fois. Si vous êtes en train d'écrire, un bouton Recharger vous attend à la place.

## 2.17.0

🆕 **La confidentialité expliquée.** Une section dédiée dans les réglages explique le stockage local, la synchronisation Todoist et l’absence de suivi d’usage.

🎨 **Des espaces mieux ordonnés.** Les projets suivent l’ordre de la barre latérale, avec des dossiers repliables. Les icônes sont alignées à gauche et la progression apparaît à côté de chaque projet.

🎨 **Des sous-tâches plus lisibles.** Une sous-tâche ne répète plus le projet de son parent affiché au-dessus. Lorsqu’elle apparaît seule, son projet reste visible.

🎨 **Replanifier les retards en un geste.** Le titre du bloc En retard accueille un bouton calendrier rouge pour tout passer à aujourd’hui. La confirmation et l’annulation fonctionnent comme avant.

🐛 **Ajouter une section sans saut.** Le tableau conserve en place un champ de nom déjà visible. Une nouvelle colonne ne provoque un défilement que si nécessaire.

🐛 **Des sélecteurs qui gardent leur contour.** Regroupement et Tri conservent leur contour après un choix à la souris. Le clavier affiche toujours l’anneau de focus.

## 2.16.0

🆕 **Regroupez vos tâches par statut.** Dans Affichage, choisissez Grouper par, puis Statut : À faire, En cours et Terminé. Cela fonctionne avec ou sans sections, en Liste et en Board. Passer une tâche en Terminé la garde ouverte jusqu'à ce que vous la complétiez.

🆕 **Voyez un workspace d'un coup d'œil.** Ouvrez un workspace depuis la barre latérale pour voir ses projets, le nombre de tâches ouvertes ou terminées et leur progression. Les projets archivés et les membres de l'équipe sont listés en dessous.

🎨 **Voyez la section d'une tâche dans vos listes.** Une tâche affiche maintenant son projet et sa section, par exemple « Site web / Design », avec le nom complet au survol.

🎨 **Des cases de priorité plus lisibles.** La bordure est un peu plus marquée, pour distinguer une priorité 1 d'une priorité 3 d'un coup d'œil.

🎨 **Un formulaire de retour qui s'ouvre dans son propre onglet.** Envoyez un bug ou une idée depuis le nouveau formulaire, sans fenêtre dans la fenêtre.

🐛 **Les cartes sélectionnées gardent leur couleur dans le Board.** Après une sélection avec Cmd+clic et un déplacement du pointeur, chaque carte garde une couleur uniforme.

🐛 **Plus de contour parasite après un usage à la souris.** Cliquer, ou fermer un menu avec Échap, ne laisse plus de contour. Tab et les flèches montrent toujours où vous êtes.

## 2.15.0

🎨 **Des finitions pour la version mobile.** Navigation, menus, détail d’une tâche, nouvelle tâche et connexion sont repensés pour le téléphone : zones plus faciles à toucher, feuilles qui montent du bas, vues adaptées aux petits écrans. Une invitation explique comment ajouter l’app à l’écran d’accueil.

## 2.14.0

🆕 **Un son quand vous terminez une tâche.** Une petite tape sur l’épaule, juste au moment où vous cochez. Pas pour vous ? Désactivez-le dans Réglages, Général.

🎨 **Un journal des modifications plus agréable à lire.** Chaque changement a son badge, un titre clair et, quand c’est utile, une image. Les anciennes versions ont été réécrites de la même façon.

## 2.13.0

🎨 **Des finitions pour la vue Table.** Les en-têtes restent visibles quand vous défilez, vous pouvez réordonner les colonnes dans Affichage, les tags tiennent sur une ligne et les sections s’affichent aussi dans Cette semaine.

🎨 **Choisissez la largeur de vos listes.** Les listes reviennent dans une colonne centrée. Plus de place ? Activez « Pleine largeur » dans Affichage.

🎨 **Plus de colonnes dans vos tableaux.** Les colonnes sont un peu plus étroites : certains écrans en montrent une de plus.

🎨 **Plus de bandeau dans la démo.** La bande du haut a disparu. « Quitter la démo » est dans le menu du compte.

## 2.12.0

🎨 **Des finitions pour la version mobile.** Les pages utilisent toute la largeur, les champs ne zooment plus quand on les touche, les écrans tiennent au-dessus de la barre du navigateur et tout se manie plus facilement au pouce.

🐛 **Descriptions longues dans la fenêtre de nouvelle tâche.** Une longue description débordait et repoussait les boutons hors d’atteinte. Elle défile maintenant dans son champ : vous pouvez toujours ajouter la tâche.

## 2.11.0

🆕 **La vue Table pour vos listes.** Voyez vos tâches en colonnes pour les dates, échéances, priorités, durées et tags, et choisissez celles à afficher. Triez depuis les en-têtes et modifiez les valeurs directement dans les cellules.

🆕 **Redimensionnez votre barre latérale.** Des noms de projets longs ? Faites glisser le bord droit de la barre pour leur laisser de la place. Un double-clic sur le bord rétablit la largeur par défaut.

🆕 **Collez des images depuis le composeur.** Certaines tâches demandent plus de contexte. Collez une image dans la fenêtre de nouvelle tâche pour la prévisualiser ; elle est jointe en commentaire quand vous ajoutez la tâche.

🎨 **Un choix de vue plus lisible.** Avec la vue Table, l’ancien bouton était trop chargé. Dans Affichage, chaque vue a maintenant son icône au-dessus de son nom.

🐛 **Les filtres gardent les tâches au bon endroit.** Une sous-tâche ne disparaît plus d’une liste parce que son parent correspond à une autre. Regroupées par date, les tâches en retard forment un seul groupe et les titres des jours affichent la bonne date.

## 2.10.0

🆕 **La vue Calendrier pour vos listes.** Planifiez vos tâches sur 3 jours, une semaine ou un mois. Glissez les tâches sans date sur un créneau, déplacez ou redimensionnez les blocs, et créez une tâche directement dans le calendrier. Couleurs, prévisions de répétition et tâches terminées se règlent dans Affichage.

## 2.9.0

🆕 **Assignez une tâche depuis le composeur.** Dans un projet partagé, tapez `+` dans la fenêtre de nouvelle tâche pour choisir une personne du projet. `+Anne` donne la tâche à Anne et remplit la puce d’assignation.

🆕 **Écrivez vos sous-tâches comme vos tâches.** Dans le panneau d’une tâche et dans le composeur, une ligne de sous-tâche comprend les dates, les répétitions, `p1`, les `@tags` et les durées comme `pendant 1h`. Un `#projet` reste du texte : une sous-tâche vit dans le projet de son parent.

🎨 **Des finitions pour la fenêtre de partage.** Voyez qui est dans un projet et son rôle, et invitez de nouvelles personnes. Dans un projet d’espace de travail, les administrateurs changent le rôle de chaque membre. L’accès (restreint, équipe ou public) s’ouvre en menu, et « Copier le lien » copie l’adresse du projet.

🎨 **Les estimations manquantes ressemblent aux autres notifications.** Dans Notifications, Conflits, une tâche sans estimation est une carte comme les autres, avec le champ Estimation à la place des boutons. Elle s’enregistre dès que vous la saisissez.

🎨 **Des titres plus longs sur les cartes du tableau.** Une carte affiche jusqu’à trois lignes de titre et deux de description, comme la liste.

🎨 **Les icônes d’espaces de travail s’alignent dans la barre latérale.** L’image d’un espace est dans la même colonne que les icônes de ses projets, et un espace sans image affiche son initiale.

🐛 **Les tâches terminées s’affichent de nouveau dans un projet.** Avec « Afficher les tâches terminées », un projet liste ce que vous avez terminé depuis un an, et pas seulement pendant la session.

🐛 **Les tags qui commencent par un emoji fonctionnent.** `@🏡maison` dans un titre est maintenant appliqué et retiré du titre, comme n’importe quel autre tag.

## 2.8.0

🆕 **Voyez les prochaines répétitions dans Prochainement.** Les tâches répétées montrent les jours où elles reviennent, et le temps qu’elles prendront. Des cases pointillées les repèrent ; cliquez sur l’une pour ouvrir la tâche.

🆕 **Voyez tous les résultats de recherche.** Appuyez sur Entrée pour ouvrir la page complète, sans limite de 30 tâches. Les flèches choisissent un résultat, et les pastilles colorées mènent à un projet, une section ou un tag.

🆕 **Renommez un tag depuis sa page.** Modifiez son titre et appuyez sur Entrée. Vos tâches, favoris et la recherche suivent le nouveau nom.

🆕 **Tapez une heure en ajoutant une tâche.** `20h30` ou `dans deux heures` est lu comme une heure et la tâche est planifiée pour vous. Un simple `2h` reste une durée.

🆕 **Écrivez les durées en toutes lettres.** `(une heure trente)`, `pendant une heure` ou `for one hour` fixent l’estimation, et les mots quittent le titre.

🎨 **Une coche quand une durée est acceptée.** Appuyez sur Entrée : la valeur est mise au propre et une brève coche confirme qu’elle est prise en compte.

🎨 **Analyses suit votre couleur d’accent.** Son bouton prend une version douce de votre couleur, en clair comme en sombre.

🎨 **Choisissez si Cette semaine inclut aujourd’hui.** « Afficher les tâches du jour » fonctionne désormais seul, sans lien avec l’entrée Aujourd’hui de la barre latérale. Masquez-les : les tâches en retard restent, et le compteur suit.

🐛 **Les commandes du composeur fonctionnent dans Q et l’ajout rapide.** Plus de commande « Personne » parasite sur les tâches de la boîte de réception, les menus de projet gardent une largeur raisonnable et les résultats de tags répondent aux flèches et à Entrée.

🐛 **Les dossiers d’équipe reviennent dans la barre latérale.** Les projets d’espace de travail retrouvent leurs dossiers Todoist, qu’ils avaient quittés par erreur.

🐛 **Les listes et les tableaux ont la même largeur de page.** Une liste était devenue plus étroite que son tableau. Les deux s’alignent, et changer de vue ne décale plus la page.

## 2.7.0

🆕 **Les tâches assignées aux autres sont masquées par défaut.** Aujourd’hui, Cette semaine, Prochainement, Un jour, la Revue, la matrice, les tags et le Tableau de bord montrent vos tâches et celles sans personne assignée. Affichage permet d’inclure vos collègues ou de choisir Tout le monde. Les projets montrent toujours tout le monde.

🆕 **Assignez une tâche à quelqu’un.** Dans un projet partagé, choisissez une personne depuis la ligne de la tâche, la tâche ouverte ou le composeur. Groupez et triez un projet par personne ; ajouter depuis le groupe d’une personne la présélectionne.

🎨 **Filtrez vos espaces de travail.** Le menu Espace de travail peut mélanger projets personnels et espaces d’équipe, avec un « Tous » pour réinitialiser.

🎨 **Voyez à qui une tâche est assignée.** Les tâches montrent une photo ou des initiales, avec le menu d’assignation avant le menu à trois points. Les menus restent dans l’écran.

🎨 **Revue, Tableau de bord et commandes de tâche plus nets.** La Revue garde son filtre de personne à côté de Quotidienne et Hebdomadaire, le Tableau de bord regroupe Modifier la disposition, Affichage et Journal, et les tâches ouvertes ont des champs plus ronds et plus discrets.

🐛 **Prochainement propose plus de jours seulement s’il y a plus de travail.** Le bouton « plus de jours » disparaît quand aucune tâche ne se trouve au-delà des jours déjà affichés, au lieu de mener à un vide.

🐛 **Meilleure lecture des dates dans les composeurs.** « Dans un mois », « in a month » et « dans 2 mois » sont compris, même depuis une section datée.

## 2.6.0

🎨 **Les dates prennent les couleurs de Todoist.** Rouge en retard, vert aujourd’hui, orange demain, violet dans la semaine, aucune couleur ensuite.

🎨 **Les titres de section longs passent à la ligne.** Un long nom de section s’affiche maintenant sur plusieurs lignes au lieu de déborder de la page.

🎨 **Les titres de tâche longs passent à la ligne dans le composeur.** Le champ grandit avec le titre, et les dates, #projets et @tags restent surlignés.

🎨 **Q ajoute la tâche là où vous êtes.** Depuis Aujourd’hui, elle est due aujourd’hui ; depuis Cette semaine, elle reçoit l’étiquette de la semaine ; depuis un projet, elle y atterrit ; depuis une page de tag, elle reçoit ce tag.

🎨 **Des pastilles colorées dans le composeur.** Date, échéance, priorité, projet et tags montrent chacun leur couleur.

🎨 **Des lignes de tâche plus nettes.** La case est alignée avec le titre, et le titre est un peu plus gras pour mieux se lire.

🎨 **Retrouvez-nous sur LinkedIn, X et GitHub.** Les liens vers les profils de l’auteur et vers le code sont dans Réglages, À propos.

🐛 **Les pastilles colorées sont de nouveau colorées.** Avec les pastilles « Héritées » dans Réglages, dates, projets et tags retrouvent leur couleur.

🐛 **Passer la visite n’ouvre plus la configuration.** Choisir Passer ferme simplement la visite.

🐛 **« Ajouter la tâche » s’explique.** Quand tout ce que vous avez tapé est lu comme une date, un projet ou un tag, le bouton est grisé et dit pourquoi.

## 2.5.0

🆕 **Choisissez qui peut accéder à un projet.** Dans Nouveau projet et Modifier le projet, choisissez Restreint, Équipe ou Public quand Todoist le permet. Si Todoist refuse, vous êtes prévenu et rien ne change.

🆕 **L’app Mac, à un clic.** Réglages, À propos mène à l’app Mac et à son installation, avec le bon téléchargement pour Apple silicon ou Intel. Elle apporte sa propre fenêtre et l’ajout rapide avec Option + Espace.

🎨 **Une visite seulement quand il y a quelque chose à montrer.** Après une mise à jour, « Me montrer » n’apparaît que si la version ajoute quelque chose que la visite peut désigner. La visite complète reste dans Réglages, À propos.

🐛 **Tous les projets sont accessibles dans la barre latérale.** Les derniers projets d’une longue liste étaient cachés derrière la zone « Ajouter une tâche ». La liste défile maintenant jusqu’au bout.

## 2.4.0

🆕 **Mettez un filtre ou un tag en favori depuis sa carte.** Un clic sur l’étoile l’ajoute à vos favoris, dans l’app et dans Todoist. C’était réservé au menu à trois points.

🎨 **« Nouveautés depuis votre dernière visite ».** Le titre de la fenêtre ne porte plus le numéro de la dernière version, ce qui trompait quand plusieurs versions étaient listées.

🐛 **Tapez juste après avoir ouvert le sélecteur d’icônes.** Les icônes se filtrent pendant la frappe, au lieu d’ouvrir la recherche de l’app.

## 2.3.0

🆕 **Réglez une heure, une durée et une répétition depuis le sélecteur de date.** Heure, Durée et Répétition sont dans le composeur, le menu Planifier et la tâche ouverte. Choisissez une répétition courante ou personnalisez l’intervalle, les jours, la date de fin et si elle suit la complétion.

🎨 **Une tâche répétée montre son jour avec une marque de répétition.** « ↻ Demain 09:30 » au lieu de la règle en toutes lettres, lisible au survol. La tâche ouverte n’a plus de champ de règle séparé.

🐛 **Changer le jour garde l’heure.** Une tâche réglée sur « aujourd’hui 12:00 » et déplacée à demain reste à 12:00.

🐛 **Une nouvelle répétition ne saute plus aujourd’hui.** « Tous les jours » sur une tâche due aujourd’hui commence aujourd’hui, et changer l’heure d’une tâche répétée garde son jour.

🐛 **Une répétition avec une fin la garde.** « Tous les lundis à 9h jusqu’au 31/12 » ne perd plus son « jusqu’au 31/12 ».

## 2.2.0

🆕 **Vos filtres Todoist sont dans l’app.** Filtres, dans la barre latérale, liste vos filtres enregistrés avec leur nombre de tâches, même ceux en plusieurs parties. Les filtres favoris apparaissent dans Favoris. Masquez l’entrée dans Réglages si vous préférez.

🆕 **Créez, modifiez et organisez vos filtres.** Créez un filtre avec sa requête, sa couleur, son icône et son statut de favori, puis modifiez-le sur sa page. Glissez pour réordonner, ou utilisez son menu pour le mettre en favori, copier son lien ou le supprimer. Tout est enregistré dans Todoist.

🆕 **Changez la couleur d’un tag.** Sur la page Tags, « Nouveau tag » règle une couleur et un favori, et le menu « ⋯ » de chaque tag change sa couleur, le met en favori, copie son lien ou le supprime.

🎨 **Une fenêtre Nouveautés plus étroite.** Elle a maintenant la même largeur que la recherche, ce qui se lit mieux.

## 2.1.1

🐛 **Le menu « Déplacer vers un projet » reste étroit.** Un nom de projet ou de section très long est coupé avec « … » et s’affiche en entier au survol.

## 2.1.0

🎨 **Plus facile de voir ce que l’app a compris.** Dans la fenêtre de nouvelle tâche, la date, le projet, le tag, la priorité et la durée reconnus sont clairement surlignés, en clair comme en sombre.

🎨 **Les réglages disent si Cette semaine inclut aujourd’hui.** La ligne indique « Inclut les tâches d’aujourd’hui » ou « N’inclut pas les tâches d’aujourd’hui », pour savoir ce que change la case Aujourd’hui.

🎨 **Affichage ne propose que les tags de la page où vous êtes.** Fini la longue liste de tous vos tags qui finissait coupée : seuls ceux des tâches de la page apparaissent.

🐛 **La boîte de réception montre ses sections.** Les sections créées dans la boîte de réception dans Todoist apparaissent dans l’app, et vous pouvez les ajouter, renommer et replier.

🐛 **« Déplacer vers un projet » fonctionne sur les tâches sans section.** Les tâches rapides et celles de la boîte de réception se déplacent, avec le message et Annuler.

🐛 **Les tags avec un emoji ou un accent ouvrent leurs tâches.** Un tag comme 🏠Maison affichait 0 tâche. Il retrouve maintenant ses tâches, même après un rechargement.

## 2.0.0

🆕 **Choisissez comment l’app se place dans la fenêtre.** Dans Réglages, Apparence : une barre latérale flottante sur une page pleine, ou une page flottante sur le fond, avec un fond neutre ou un dégradé tiré de votre couleur. Cacao et Graphite rejoignent les couleurs.

🆕 **Organisez la barre latérale.** Dans Réglages, Barre latérale, cochez ce qui s’affiche, glissez les entrées dans votre ordre, masquez la recherche et les compteurs, et ordonnez Mes projets et vos espaces de travail. Ce que vous masquez reste à un ⌘K.

🆕 **Choisissez ce qu’une tâche montre, et dans quel ordre.** Dans Affichage, « Afficher sur chaque tâche » liste les détails sous un titre. Cliquez pour en montrer ou masquer un, glissez-le ou appuyez sur Alt et une flèche pour réordonner, dans toutes les listes.

🆕 **Une configuration pour tout le monde, et une visite pour la suivre.** Après la mise à jour, et pour chaque nouveau compte, cinq courts écrans règlent l’apparence, la barre latérale et les détails des tâches. Le dernier propose une visite.

🆕 **Les notifications de Todoist.** La cloche montre ce que Todoist vous dit et, à côté, les conflits de votre plan. Marquez comme lu, acceptez ou refusez les invitations à des projets partagés.

🆕 **Partagez un projet et assignez des tâches.** Le menu du projet propose Partager… pour inviter par e-mail, voir qui a accès et retirer quelqu’un. Dans un projet partagé, les tâches ont un champ « Assignée à ».

🆕 **Une vue par défaut pour chaque projet.** Choisissez si un projet s’ouvre en liste ou en tableau, et Todoist suit. Rangez-le sous un projet parent et choisissez parmi les vingt couleurs de Todoist.

🆕 **Créez un projet sans quitter la nouvelle tâche.** La liste des projets finit par Nouveau projet… et vous revenez avec lui choisi.

🎨 **Un aspect plus calme partout.** Des coins plus ronds, des boutons gris doux, des cases carrées, de fines barres de défilement qui apparaissent au survol, une barre latérale qui glisse et des panneaux qui flottent dans la marge.

🎨 **Ouvrez une tâche en fenêtre ou en panneau latéral.** Choisissez comment une tâche s’ouvre dans Réglages, Listes. Sa priorité devient quatre pastilles douces.

🎨 **Des listes dans l’ordre de Todoist.** Les groupes se replient depuis un chevron, avec leur compteur après le titre ; les sous-tâches sont juste sous leur tâche, et les tableaux gardent des colonnes entières sur la page.

🎨 **« J’ai du temps » est une seule liste.** Elle suit l’ordre choisi, la plus courte d’abord ou la plus prioritaire, et montre chaque échéance.

🎨 **L’en-tête de page le dit en une ligne.** Le temps estimé passe à l’orange dès 95 % de votre capacité et au rouge au-delà. Cliquez dessus pour voir les tâches sans estimation.

🎨 **Tableau de bord et Journal sont deux pages.** Choisissez Jour, Semaine, Mois, Trimestre, Année ou Personnalisé. Le Journal groupe par jour, mois, projet ou priorité et additionne le temps de chaque groupe.

🎨 **Réglages dans un nouvel ordre.** Compte, Général, Apparence, Barre latérale, Listes, Fonctions et planification, Détection de conflits, À propos.

🎨 **Un nouvel écran de connexion et un journal plus large.** La connexion montre à quoi sert l’app. Le journal a un sélecteur de version et lance la visite depuis son pied.

🎨 **Les revues sont plus faciles à suivre.** Un seul contrôle segmenté à votre couleur, et des étapes reliées par un trait qui se remplit jusqu’à l’endroit où vous en êtes.

## 1.22.0

🆕 **Un menu sur chaque section.** Le menu à trois points d’une section permet de la renommer, déplacer, dupliquer, copier son lien, l’archiver ou la supprimer. L’archivage propose Annuler et la suppression demande confirmation.

🆕 **La durée d’un parent additionne ses sous-tâches.** Quand chaque sous-tâche ouverte a une durée, leur somme devient celle du parent, dans l’app et dans Todoist, et reste à jour quand les sous-tâches changent. Si l’une n’en a pas, le parent garde la sienne.

🎨 **Le compteur d’une section est à côté du titre.** La flèche de repli est dans la marge à gauche, pour que les titres restent alignés avec les tâches. Une section repliée le reste après un rechargement sur cet appareil.

🎨 **Glisser au-dessus d’une section trace un seul trait.** Un trait rouge montre où la tâche atterrira, même dans une section vide.

🐛 **Cette semaine suit l’ordre d’Aujourd’hui dans Todoist.** À priorité et date égales, les tâches suivent l’ordre des projets de votre barre latérale. Les tâches que vous avez placées à la main restent en place.

🐛 **« Ajouter une section » place le curseur dans son nom.** Tapez tout de suite, même si Todoist met un instant à répondre. Cliquer deux fois ne crée plus deux sections.

🐛 **Plus de contour qui traîne après avoir fermé une tâche à la souris.** Une tâche ou un bouton « Ajouter une tâche » restait entouré. Au clavier, vous voyez toujours où le focus est revenu.

## 1.21.0

🆕 **Des listes à cocher dans la description d’une tâche.** Tapez `[]` ou `- [ ]` pour en commencer une. Entrée ajoute un élément, un élément vide termine la liste, les lignes collées deviennent des éléments. Cochez les cases dans la tâche et le texte de Todoist suit, avec le nombre d’éléments faits.

🆕 **Réorganisez les cartes du tableau de bord.** Modifier la disposition donne deux flèches à chaque carte, à la souris ou au clavier. Les cartes restent dans leur section, rien n’est retiré, et Réinitialiser les remet en place.

🆕 **Choisissez la couleur des pastilles d’une tâche.** Inspiré de Todoist (par défaut), Couleurs héritées (date, projet et tags dans leurs couleurs Todoist), Neutre (gris) ou Minimaliste (titre et description, durée et date à droite). Aussi dans la configuration.

🆕 **Glissez une sous-tâche au-dessus ou en dessous de ses voisines.** Dans toutes les listes. Glissez à droite pour l’imbriquer sous une autre tâche, à gauche pour la remonter d’un niveau. Les sous-tâches sélectionnées bougent ensemble, avec Annuler.

🎨 **Une ligne plus calme sous le titre des pages.** Nombre de tâches, temps et « J’ai du temps » en une phrase. La durée passe à l’ambre dès 90 % de votre capacité et au rouge dès 100 %. Cliquez dessus pour voir les tâches sans estimation.

🎨 **Un tableau de bord plus calme et plus clair.** Des cartes grises séparées, chaque chiffre avec son évolution (vert si plus, rouge si moins), les dates de la période près du titre et un trimestre dessiné mois par mois.

🎨 **Analyses compte les sept derniers jours.** Aujourd’hui et les six jours d’avant, chaque jour dessiné même sans tâche terminée.

🎨 **Les réglages s’expliquent.** Les réglages de planification sont groupés par usage, la capacité précise qu’il s’agit du temps restant après réunions et pauses, et de petites images montrent l’effet du thème, de la couleur et de l’organisation.

🎨 **La configuration tient en cinq courts écrans.** Apparence, couleur, densité et pastilles, organisation, et où stocker les estimations, chacun avec un aperçu. Un code de couleur invalide est refusé sans perdre le dernier bon.

🎨 **Les revues montrent leurs étapes reliées.** Une bande douce, l’étape en cours en gras, qui passe à la ligne sur les écrans étroits.

🎨 **Le groupe rapide s’appelle « Tâches rapides ».** Le groupe de tâches courtes en haut de vos listes a un nom plus clair.

🐛 **Le tableau de bord ne se fige plus sur un mois, un trimestre ou une année.** Il tournait en boucle quand les horloges reculent à l’automne. Les jours sont maintenant comptés correctement partout, et une lecture qui échoue le dit et propose Réessayer.

🐛 **Glisser plusieurs tâches sélectionnées dans une autre tâche les déplace toutes.** Elles deviennent des sous-tâches dans l’ordre où vous les avez choisies. Un dépôt impossible est refusé avant tout changement.

🐛 **Une tâche répétée que vous cochez ne reste plus estompée.** Dans une liste qui la garde, elle revenait cochée et ne pouvait plus être cliquée.

🐛 **La mise en forme survit aux retours à la ligne.** Le gras continue à la ligne suivante, les liens s’arrêtent avant le nouveau paragraphe et les adresses web fonctionnent sans « https:// ».

## 1.20.0

🆕 **Choisissez où vivent les estimations.** Dans des tags d’estimation, ou dans les durées Todoist, qui mettent aussi à jour le bloc de calendrier d’une tâche horaire. Les comptes gratuits utilisent les tags. Si Todoist refuse une durée, l’estimation est gardée en tag et vous êtes prévenu.

🆕 **Convertissez vos estimations avec un aperçu.** Voyez ce qui va changer avant de convertir les tâches et sous-tâches ouvertes. Le résultat signale ce qui a échoué ou attend une connexion.

🆕 **Réglez les estimations différentes dans Conflits.** Choisissez la durée ou le tag, avec un avertissement avant de modifier un bloc de calendrier.

🆕 **Estimez plusieurs tâches ensemble.** Sélectionnez des tâches, ouvrez Estimation dans la barre du bas et tapez 25, 1h15 ou 90 min pour leur donner la même valeur, ou les effacer.

🐛 **Créez un tag manquant partout où vous choisissez des tags.** Cherchez son nom et choisissez Créer, dans une tâche, le composeur ou une sélection.

🐛 **Cliquez sur le fond de la page pour effacer la sélection.** Inutile de chercher Échap. Les lignes, la barre de sélection et les fenêtres ouvertes gardent leurs propres clics.

## 1.19.0

🆕 **« J’ai du temps » trouve ce qui tient.** À côté du total de charge, choisissez une durée pour voir les tâches qui tiennent, sur cette page ou dans tous les projets, groupées par date. Rien n’est modifié.

🆕 **Un groupe « Prend la poussière » dans Un jour.** Passez en revue les tâches parquées depuis des mois avec Cette semaine, Garder et Supprimer (Maj + K garde celle en surbrillance). Choisissez le délai, de 1 à 12 mois, dans Réglages.

🆕 **Les tâches rapides ouvrent chaque liste.** Les projets, tags, la boîte de réception et Un jour commencent par les tâches rapides en retard, dues aujourd’hui ou sans date, chacune disant d’où elle vient. Un tableau commence par une colonne Rapide bleue. Réglages permet de la désactiver.

🆕 **Un bouton « Me montrer » dans Nouveautés.** Après une mise à jour, il ne fait visiter que ce que la mise à jour a apporté, avec une nouvelle étape pour « J’ai du temps ».

🆕 **Une durée réglée dans Todoist compte comme estimation.** Les totaux, la pastille de charge, les tâches sans estimation et Analyses l’utilisent, même sans tag d’estimation.

## 1.18.0

🆕 **Collez une liste pour créer plusieurs tâches.** Collez des lignes dans le champ du nom de la nouvelle tâche et confirmez « Créer les 3 tâches ? ». Chaque ligne est lue seule : `(25)`, une date ou `#Projet` s’applique à cette tâche.

🆕 **Donnez une estimation à une nouvelle sous-tâche.** Terminez-la par `(5)` ou `(1h15)`, dans le composeur ou en ajoutant une sous-tâche.

🎨 **Le menu de date commence par des raccourcis.** Aujourd’hui, Demain, Semaine prochaine, Cette semaine et Un jour d’abord, puis passer à la prochaine occurrence et retirer la date. Le calendrier s’ouvre seulement quand vous choisissez Choisir une date.

🎨 **La case d’une tâche terminée prend la couleur de sa priorité.** Au lieu du vert : rouge pour P1, orange pour P2, bleu pour P3 et gris pour P4.

🎨 **Un anneau montre l’avancement des sous-tâches.** À côté de « 1/3 », il se remplit au fil de l’eau et devient vert à la fin.

🎨 **« Tout passer à aujourd’hui » est instantané.** En retard se vide aussitôt, et le message dit combien de tâches ont bougé, avec Annuler.

🐛 **Une sous-tâche terminée apparaît cochée dans le panneau de la tâche.** Sa case restait vide alors que son titre était barré. Les deux disent maintenant qu’elle est faite.

## 1.17.1

🎨 **Nouveautés s’ouvre après chaque mise à jour.** Les plus grands changements d’abord : nouveautés, puis améliorations, puis corrections.

🐛 **Analyses compte chaque jour de la période.** La vue d’un jour n’affichait rien, le dernier jour de chaque période était oublié, et un jour manquait entre les parties d’un trimestre.

## 1.17.0

🆕 **Les messages ont un bouton de fermeture et partent plus vite.** Les confirmations restent 3 secondes, les erreurs 6 et Annuler 8. En fermer un garde Annuler disponible au raccourci.

🆕 **Les lecteurs d’écran lisent les messages.** Les confirmations sont annoncées poliment, les refus de Todoist aussitôt, et le bouton Annuler dit ce qu’il annule.

🎨 **Le petit texte est un peu plus grand.** Les pastilles de tags, compteurs et petites étiquettes passent de 11 à 12 pixels.

🐛 **« Demain à 14:30 » garde son heure.** Dans le composeur, le panneau de la tâche, le menu de date d’une ligne et la barre de plusieurs tâches.

🐛 **Double-cliquer sur « Ajouter la tâche » crée une seule tâche.** La fenêtre accepte un seul enregistrement à la fois, au bouton comme au clavier. Deux tâches au même nom, tapées exprès, restent deux tâches.

🐛 **Un lien dans un titre ne règle plus une priorité ou une répétition.** Un lien comme `exemple.com/p1` rendait la tâche P1, et un lien finissant par `/daily` la répétait. Les liens sont maintenant lus comme des liens.

🐛 **« 14 juillet » est lu comme juillet.** « 1er juillet » et « July 1st » fonctionnent aussi, et « 2 maisons » n’est plus une date. 12/03 suit votre format de date.

🐛 **Enregistrer et Annuler sous un titre fonctionnent au clavier.** Entrée et Espace font ce que fait un clic : vous pouvez modifier un titre sans la souris.

🐛 **Prochainement ajoute seul le nouveau jour à minuit.** Si vous le laissez ouvert la nuit, une tâche qui vient d’entrer dans la période ne reste plus cachée jusqu’à ce que vous quittiez la page.

🐛 **Échap et Tab agissent sur la fenêtre au premier plan.** Avec deux fenêtres ouvertes, Échap ferme seulement celle du dessus et Tab y reste, au lieu de répondre dans le panneau de tâche derrière.

🐛 **Supprimer un parent avec ses sous-tâches fonctionne proprement.** Sélectionner un parent et ses sous-tâches supprime toute la branche une fois, sans faux « Todoist a refusé », et Annuler ramène chaque tâche une fois.

🐛 **Une couleur d’accent personnalisée suit votre appareil en mode sombre.** Quand votre appareil passe en sombre, app ouverte, votre accent s’adapte aussitôt au lieu d’attendre un rechargement.

🐛 **Les noms avec un « @ » et les adresses e-mail s’affichent tels quels.** Une adresse e-mail dans un titre ou une description ne devient plus « undefined » ni un tag.

🐛 **L’app s’ouvre même si votre navigateur bloque le stockage.** Si quelque chose plante, un court message et un bouton Recharger remplacent une page blanche.

🐛 **Les changements hors connexion ne vont jamais vers un autre compte.** Les changements faits hors connexion avec un compte Todoist ne sont plus envoyés à un autre compte qui se connecte ensuite. Vous êtes prévenu du nombre de changements écartés.

🐛 **Un changement fait juste avant de fermer l’onglet n’est plus perdu.** Changer d’app ou fermer l’onglet juste après un changement le garde maintenant dans la copie stockée sur votre appareil.

🐛 **Une connexion qui cale ne fige plus la synchronisation.** Un téléchargement qui s’arrête à mi-chemin compte maintenant comme un délai dépassé : l’app réessaie au lieu d’attendre sans fin.

🐛 **La démo déplace une tâche répétée à sa prochaine date.** Cocher une tâche quotidienne la déplace d’un jour en gardant son heure, et « tous les lundis » passe au lundi suivant.

## 1.16.0

🆕 **Une fenêtre vous dit ce qui a changé après chaque mise à jour.** Affichée une seule fois. Désactivez-la, ou relisez chaque version, dans Réglages, À propos.

🆕 **Ajoutez une section depuis un tableau.** La colonne en pointillés « Ajouter une section » à la fin en crée une.

🆕 **Un tableau aussi large que la page, ou en pleine largeur.** Un tableau reste aussi large que l’en-tête de la page, comme une liste. Activez Pleine largeur dans Affichage pour utiliser tout l’écran.

🎨 **Une fenêtre de nouvelle tâche plus claire.** Titre, description, puis une ligne de petits boutons pour la date, l’échéance, le projet, la priorité, l’estimation et les tags. Les vides affichent « + Échéance ». Les sous-tâches ont leur propre titre avec un compteur.

🎨 **Le même sélecteur de date partout.** Tapez une date, choisissez un raccourci ou cliquez sur un jour, dans le menu de la tâche, la barre de sélection, le composeur et le panneau.

🎨 **Dates, projets et tags dans un titre se distinguent mieux.** Les surlignages gardent l’espace normal entre les mots : plusieurs à la suite ne se fondent plus les uns dans les autres.

🎨 **Les boutons d’une carte de tableau apparaissent dans la carte.** Au survol d’une carte, ses boutons s’affichent dans son coin supérieur, alignés sur le titre, au lieu de dépasser.

🎨 **Chaque menu avec un champ de recherche a le même champ.** Déplacer une tâche, choisir des tags, un projet ou une date : le champ du haut se présente et se comporte pareil partout.

🎨 **Le nombre sur Affichage compte seulement ce que vous avez changé.** Il monte quand vous filtrez, groupez ou triez autrement que par défaut, pas quand vous passez de liste à tableau.

🐛 **Ouvrir une tâche ne transforme plus des mots de son titre en date, tag ou priorité.** Un titre enregistré comme « Revue du jour » reste du texte. Seul ce que vous tapez ensuite est lu.

🐛 **Taper @semaine crée un tag, pas quatre.** La fenêtre de nouvelle tâche enregistrait « s », « se », « sem »… Maintenant seul le tag final est enregistré.

🐛 **La revue suit le panneau de la tâche.** Une tâche terminée ou supprimée dans le panneau quitte l’étape de la revue aussitôt. L’étape « Sans estimation » dit quelles tâches elle liste.

🐛 **Les menus d’une tâche ne sont plus coupés sur un tableau ou une liste courts.** Les menus de date, de déplacement et plus s’ouvrent toujours en entier, sur toute la page.

## 1.15.0

🆕 **Choisissez une date avec les flèches du clavier.** Les flèches parcourent les jours, Page précédente et Page suivante changent de mois, Entrée valide.

🆕 **Les tableaux défilent d’une page de colonnes à la fois.** Plus de colonnes coupées en deux. Les flèches au-dessus du tableau avancent d’une page, et glisser une carte vers le bord tourne la page pour vous.

🆕 **Groupez Prochainement par jour, semaine ou mois.** Ouvrez Affichage sur la page Prochainement et choisissez le groupement, en liste comme en tableau.

🆕 **Les liens s’ouvrent d’un clic.** Dans les titres et descriptions : `[libellé](adresse)`, une adresse `https://` complète ou `site.fr`.

🆕 **Ouvrez une tâche terminée depuis le Journal.** Cliquez dessus ou appuyez sur Entrée. Les flèches parcourent le Journal.

🆕 **Passez à la tâche précédente ou suivante sans fermer le panneau.** Utilisez les deux petites flèches en haut du panneau, ou J et K, pour parcourir la liste d’où vous venez.

🆕 **Glissez plusieurs tâches sélectionnées à la fois.** ⌘-clic pour sélectionner, puis glissez : elles bougent en pile avec un compteur, dans l’ordre choisi.

🎨 **Choisissez des projets avec un point, une esperluette ou un emoji dans leur nom.** Les longs « projet / section » sont raccourcis au lieu d’élargir la fenêtre.

🎨 **Des tâches sélectionnées côte à côte forment un seul bloc.** Au lieu d’une pile de pastilles séparées, comme dans Things : une sélection se lit mieux.

🐛 **Le surlignage du clavier et la sélection se distinguent.** Un contour pour le curseur, un fond coloré pour les tâches sélectionnées.

## 1.14.0

🆕 **Les raccourcis agissent sur toute une sélection.** Avec plusieurs tâches sélectionnées, 1 à 4 règlent toutes leurs priorités, ⇧T efface leurs dates, et T et V ouvrent Date et Déplacer dans la barre de sélection. Les flèches choisissent, Entrée valide.

🆕 **Déplacez la tâche sous le curseur avec ⌘↑ et ⌘↓.** Elle échange sa place avec sa voisine, même d’une section à l’autre, comme si vous l’y aviez déposée. ⌥⌘↑ et ⌥⌘↓ l’envoient tout en haut ou tout en bas.

🆕 **Encore des raccourcis à la Things.** ⌘S ouvre le menu de date, ⇧⌘M celui de déplacement, ^] et ^[ repoussent une date d’un jour ou l’avancent (d’une semaine avec ⇧), et ⌘/ affiche ou masque la barre latérale.

🆕 **Étendez une sélection avec Maj + ↑ et ↓.** Sélectionnez de la tâche de départ jusqu’au curseur, et agrandissez ou réduisez la plage pas à pas, en plus de ce que vous avez choisi avec ⌘-clic.

🆕 **⌘A sélectionne toutes les tâches de la page.** Hors d’un champ de texte, il choisit toutes les tâches ouvertes et ouvre la barre de sélection. Dans un champ, il sélectionne toujours le texte.

🆕 **Copiez le lien Todoist d’une tâche depuis son menu.** Il est à côté d’« Ouvrir dans Todoist » et place l’adresse de la tâche dans votre presse-papiers, prête à partager.

🆕 **Copiez l’adresse e-mail d’un projet.** Depuis le menu du projet. Tout ce que vous envoyez à cette adresse devient une tâche du projet.

🆕 **Connectez-vous depuis votre propre copie de l’app.** Si vous hébergez l’app vous-même, elle peut maintenant se connecter avec Todoist, et le dit clairement si une copie a été construite pour une autre adresse. Voir « Self-hosting » dans le README.

🎨 **Les raccourcis agissent seulement sur la tâche choisie au clavier.** La feuille des raccourcis disait « la tâche sous le curseur », ce qui évoquait le pointeur de la souris. Survoler une tâche n’agit jamais dessus : taper une recherche reste sans risque.

🎨 **Changer la priorité d’une sélection la garde sélectionnée.** Aux touches comme à la barre, pour enchaîner un autre changement sur les mêmes tâches.

🐛 **Se connecter sur un deuxième navigateur ne rejoue plus la visite de départ.** Le fait de l’avoir faite est maintenant enregistré avec votre compte.

🐛 **Grouper par projet et trier par priorité garde l’ordre de la barre latérale.** Le projet contenant une P1 passait tout en haut. Les projets suivent maintenant la barre latérale, et le tri s’applique dans chaque groupe.

🐛 **Le curseur du clavier n’est plus perdu quand un changement de priorité retrie la liste.** La touche suivante ouvrait la recherche au lieu d’agir sur votre tâche.

🐛 **Les menus d’une tâche ne s’ouvrent plus au-delà du bord d’un tableau court.** Planifier et Déplacer sur les dernières cartes d’un tableau tiennent maintenant dedans.

🐛 **Les messages ne couvrent plus la barre de sélection.** Une confirmation se place au-dessus de la barre et des panneaux ouverts dessus.

## 1.13.0

🆕 **Connectez-vous avec un seul bouton « Continuer avec Todoist ».** Autorisez l’app sur la page de Todoist au lieu de coller un jeton, et gérez-la depuis les intégrations de Todoist. L’accès se renouvelle seul, et l’option du jeton d’API reste disponible.

🆕 **Annuler une suppression ramène la même tâche.** Pendant 8 secondes après une suppression, Annuler la rétablit avec son lien, ses commentaires, ses rappels et son assignation. Plus tard, ⌘Z ramène une copie et le dit.

🆕 **Glissez, terminez ou annulez toute une sélection d’un coup.** Glisser l’une des tâches sélectionnées sur un projet, une section, un jour ou un tag les emporte toutes. `E` termine la sélection en une fois, et un seul ⌘Z la rouvre.

🎨 **Vos réglages voyagent dans un commentaire de votre boîte de réception.** Ils suivent votre compte sur chaque navigateur, y compris maintenant l’accent, le thème, la densité et la vue de chaque projet, sans jamais compter comme une tâche ni apparaître dans la recherche.

🎨 **L’ordre défini dans les apps de Todoist s’affiche ici.** Tâches, sections, projets et tags suivent maintenant l’ordre qu’utilise Todoist lui-même : un classement fait ailleurs est identique dans cette app.

🎨 **Des graphiques d’Analyses plus calmes.** Les graphiques utilisent une couleur neutre, et seuls votre meilleur jour et votre meilleure heure prennent votre accent : une bonne semaine ne ressemble plus à une alerte.

🎨 **Analyses charge un an d’historique plus vite.** Les tâches terminées sont récupérées trois mois à la fois : un an demande cinq requêtes au lieu de neuf.

🎨 **L’écran de connexion dit « jeton d’API ».** Il reprend les mots de Todoist, et En retard n’a plus de ligne « Ajouter une tâche », puisqu’une nouvelle tâche ne pouvait pas y rester.

🐛 **Le bas des longues pages et de la barre latérale n’est plus coupé.** Les dernières tâches et les derniers projets étaient cachés et ne se voyaient qu’au rebond du pavé tactile.

🐛 **Les changements faits hors connexion ne sont plus perdus ni dupliqués.** Tout est envoyé dans l’ordre à la reconnexion, les tâches, projets et sections créés hors connexion n’apparaissent plus en double, et les sous-tâches suivent leur nouveau parent.

🐛 **Ajouter une section fonctionne de nouveau.** Todoist refusant les noms vides, une nouvelle section s’appelle « Section sans titre », nom sélectionné pour taper par-dessus.

🐛 **Annuler remet les tâches dans leur section et sous leur parent.** Un ⌘Z rapide après avoir coché une tâche annule cette tâche, pas ce qui précédait.

🐛 **Terminer une tâche répétée ne recharge plus tout votre compte.** Cocher ou passer une tâche répétée retéléchargeait tout. La prochaine date arrive maintenant avec la réponse.

🐛 **La synchronisation ne peut plus rester bloquée sur « synchronisation ».** Une requête qui ne répond jamais est abandonnée après 20 secondes et traitée comme une absence de connexion, au lieu d’attendre que vous rechargiez.

🐛 **Les boutons de glissement ne dépassent plus sur un téléphone.** Ils apparaissaient le long du bord droit de chaque ligne des groupes colorés.

## 1.12.1

🎨 **Les réglages sont stockés dans votre boîte de réception.** L’app ne crée plus de projet séparé pour eux. Si un projet existe déjà, la prochaine synchronisation le déplace dans la boîte de réception.

## 1.12.0

🆕 **Vos réglages vous suivent sur chaque appareil.** Changez un choix sur un appareil et les autres le reprennent, via votre compte Todoist.

🆕 **Modifiez plusieurs tâches à la fois, répétées comprises.** Chaque tâche répétée passe à sa propre prochaine occurrence, et les tâches uniques sont laissées telles quelles. Les raccourcis de date restent visibles avant le sélecteur complet.

🆕 **La visite de départ montre toutes les fonctions, même sur un compte vide.** Elle utilise maintenant des données d’exemple : dossiers, icônes de projet, tâches rapides, sous-tâches, estimations et revue sont tous montrés.

🎨 **Choisissez une seule page Cette semaine, ou Aujourd’hui et Cette semaine séparés.** Au choix, dans Réglages : une page unique qui contient le jour et la semaine, ou deux pages.

🎨 **Une page Réglages et un écran de départ plus nets.** La longue page défile jusqu’au bout, le karma se lit comme une progression, et l’invitation à offrir un café vit dans Réglages avec un bouton de fermeture visible.

🎨 **Les listes ont la même largeur partout.** Projets, tags, vues et Matrice partagent la même largeur d’en-tête. Seuls les tableaux et matrices peuvent prendre plus de place.

🐛 **Terminer ou passer une tâche répétée la déplace à sa prochaine date.** Plus de tâches qui rebondissent de demain à aujourd’hui, se dupliquent ou restent cochées et non cliquables.

🐛 **⌘Retour arrière supprime les tâches sélectionnées au ⌘-clic.** Il ne fonctionnait plus car le ⌘-clic gardait le focus au mauvais endroit.

🐛 **E termine toutes les tâches sélectionnées.** Il ne terminait que celle du curseur clavier.

## 1.11.0

🆕 **Un nouvel ensemble d’icônes cohérent.** Toutes les icônes de l’app viennent maintenant d’une même famille : boutons et menus se ressemblent.

🆕 **Donnez à chaque projet son icône, parmi près de 300.** Cherchez-les depuis la feuille de création ou de modification, au clavier ou à la souris. Votre choix est enregistré dans Todoist : c’est une vraie donnée synchronisée, pas un souvenir de ce navigateur.

🆕 **Restreignez une page à « Mes projets » ou à un espace de travail.** Aujourd’hui, Prochainement, Un jour, la boîte de réception, Tags, Cette semaine et la Matrice peuvent chacun se limiter à vos projets personnels ou à un seul espace.

🆕 **Affichez les tâches terminées d’un projet depuis Affichage.** Elles descendent en bas du groupe actif, comme une section ou une colonne de priorité, au lieu de vivre dans une liste à part.

🆕 **Passez une répétition depuis le panneau de la tâche.** C’était seulement dans le menu de la ligne. Le champ de date d’une tâche ouverte le propose aussi.

🎨 **Corrigez le texte d’une sous-tâche en cliquant dessus.** Dans la fenêtre de nouvelle tâche, cliquez sur une sous-tâche pour corriger une faute au lieu de la supprimer et de tout retaper.

🎨 **Terminer une tâche dans son panneau ouvert la coche aussitôt.** La case se remplit et le titre se barre tout de suite, comme dans les listes.

🎨 **Triez par date de création, la plus récente ou la plus ancienne d’abord.** Ce sont maintenant deux choix séparés, comme le tri par estimation, plus court ou plus long d’abord.

🐛 **Le champ de date ne répète plus « Aujourd’hui » à côté du raccourci Aujourd’hui.** Il affiche « Choisir une date » au lieu de dire deux fois le même mot.

## 1.10.0

🆕 **Renommez ou supprimez une sous-tâche depuis le panneau de son parent.** Modifiez son nom sur place, annulez avec Échap, ou supprimez-la après confirmation, sans quitter la tâche parente.

🎨 **Analyses commence par un résumé comparé à la période précédente.** Quatre cartes montrent les tâches terminées, les tâches par jour, le temps estimé et le score de concentration, avec leur évolution. Les graphiques ne montrent que la période choisie et repèrent le jour et l’heure les plus chargés.

🎨 **Un projet qui ne contient que d’autres projets ressemble à un dossier.** Avec des sous-projets et sans tâche propre, il prend l’icône et la flèche d’un dossier Todoist, et sa propre page reste à un clic.

🐛 **Un projet imbriqué peut être glissé à la première place sous son parent.** Le déposer sur la ligne au-dessus du premier frère le réordonne maintenant là, même quand le pointeur tombe sur la ligne du parent.

## 1.9.0

🆕 **Une vue Matrice d’Eisenhower.** Activez-la dans Réglages, puis choisissez Liste ou Matrice dans Affichage. Décidez quelles dates comptent comme urgentes et quelles priorités comme importantes. Par défaut, en retard et aujourd’hui, P1 et P2 passent en tête. Vos tâches ne sont jamais modifiées.

🆕 **La recherche peut trouver des sections.** Activez-le dans Réglages. Une section s’affiche avec son projet, et la choisir ouvre le projet et la met en évidence, même après un rechargement.

🎨 **Des Analyses plus claires.** Le tableau de bord montre les tâches terminées, la moyenne par jour et le temps estimé sans se répéter, avec une tendance par jour ou par mois, l’heure de la journée, le projet, la priorité, les tags principaux et une carte de chaleur sur toute l’année.

🐛 **Maj-clic sélectionne une plage de tâches.** ⌘-clic bascule toujours une tâche, et ⌘-Maj-clic ajoute une plage à ce que vous aviez déjà sélectionné.

🐛 **Réordonner et imbriquer les projets dans la barre latérale est plus précis.** Un trait visible montre où un projet atterrira, et vous l’imbriquez en glissant à droite ou le remontez en glissant à gauche.

## 1.8.1

🆕 **Déplacez plusieurs tâches vers une section.** Le panneau de déplacement d’une sélection liste maintenant projets et sections comme celui d’une seule tâche, avec recherche par l’un ou l’autre nom, et un seul Annuler pour tout le déplacement.

🎨 **La liste des destinations reste compacte.** Six lignes s’affichent à la fois, taper filtre la liste, et les longs noms sont coupés au lieu de défiler sur le côté.

🎨 **Un seul contrôle « Ajouter un tag » sur la page Tags.** Le bouton en double de l’en-tête a disparu, et le champ de nom apparaît là où le tag atterrira.

🐛 **Le sélecteur de projet d’une tâche reste ouvert.** Il se fermait tout seul dès son ouverture, vous empêchant de choisir.

🐛 **Les dates de plusieurs tâches acceptent la frappe tout de suite.** Ouvrir Date place maintenant le curseur dans le champ de date : ce que vous tapez n’atterrit plus dans la recherche de l’app.

🐛 **Glissez un tag tout en haut de la liste des Tags.** Il n’y avait aucun endroit pour le déposer au-dessus du premier tag. C’est corrigé, et chaque dépôt montre le même trait d’accent.

## 1.8.0

🆕 **Tapez « demain » ou « 12 avril » dans n’importe quel calendrier.** Chaque calendrier commence par le même champ qu’une ligne de tâche : `dimanche prochain` fonctionne dans la fenêtre de nouvelle tâche, le panneau, la barre de sélection et Analyses. Les longues listes de projets et de tags se filtrent à la frappe.

🆕 **Triez les tâches selon l’ordre de vos Tags.** Une tâche avec plusieurs tags utilise le plus haut dans votre liste de Tags, et celles sans tag viennent en dernier. Le groupement est différent : une tâche à deux tags apparaît sous les deux.

🎨 **Un tableau de projet suit le groupement choisi.** Choisissez planifié, priorité, tag, estimation ou jour : ces valeurs deviennent les colonnes. Ajouter dans une colonne préremplit sa date, sa priorité ou son tag.

🐛 **Les tâches de même priorité gardent un ordre stable.** Dans un projet, elles gardent votre ordre manuel, et entre projets elles suivent l’ordre des jours de la page : la liste ne se remélange plus.

## 1.7.1

🆕 **Glissez un projet ou un tag dans Favoris.** Déposez-le sur la section et il devient un favori. C’était la première chose à essayer dans une barre latérale où le glisser-déposer fait tout le reste.

🆕 **Ajoutez une tâche directement depuis une colonne.** Une colonne comme une colonne de priorité propose une ligne « Ajouter une tâche » qui remplit ce que la colonne fixe : projet, priorité, date ou tag.

🎨 **Un seul aspect pour le curseur clavier et une ligne choisie.** C’étaient deux teintes différentes. Il y a maintenant une seule marque pour « cette ligne », mélangée à partir de votre accent.

🎨 **Sur téléphone, Affichage et Analyses restent au même endroit sur chaque page.** Ils bougeaient selon la longueur du titre.

🐛 **Le surlignage du clavier ne disparaît plus sous la souris.** Celui que vous voyiez dépendait de l’ordre de chargement des styles.

🐛 **Confirmez une suppression avec Entrée ou ⌘Entrée.** Entrée appuyait sur Annuler : une suppression ne pouvait pas être confirmée au clavier. ⌘Retour arrière sur une sélection supprime maintenant la sélection.

🐛 **« Ajouter une tâche » sous Cette semaine, à tout moment crée une tâche pour la semaine.** Il ouvrait un composeur vide, et la tâche partait dans Un jour.

🐛 **Le menu Affichage tient sur un écran de téléphone.** La moitié dépassait de l’écran.

🐛 **Glisser un tag sur un projet ne fait plus semblant de fonctionner.** Le projet s’allumait comme si le tag y serait rangé, mais un projet ne peut pas porter de tag.

## 1.7.0

🆕 **Faites tout au clavier.** Les flèches ou J et K parcourent les tâches, Entrée en ouvre une, E la termine, T la planifie, V la déplace, X la sélectionne, 1 à 4 règlent la priorité, `.` ouvre le reste, et ⌘Retour arrière la supprime, après confirmation.

🆕 **Commencez à taper et la recherche s’ouvre avec votre lettre.** Sur une page sans tâche sous le curseur, la première lettre tapée ouvre la recherche avec cette lettre déjà dans le champ.

🆕 **Allez à une page avec G puis une lettre.** G puis W pour Cette semaine, T pour Aujourd’hui, U pour Prochainement, etc. Appuyez sur ? pour voir toute la liste.

🆕 **Modifiez une tâche ouverte avec des touches simples.** P ouvre le projet, T la date de début, D l’échéance, E l’estimation, Y la priorité et L les tags. Chaque lettre s’affiche discrètement à côté de sa propriété.

🆕 **Glissez une tâche sur le côté sur téléphone.** La ligne glisse pour révéler ses actions : estimation, planification, déplacement et le reste. Maintenir une ligne ouvre les mêmes actions dans une feuille avec leur nom.

🆕 **Choisissez une estimation dans une rangée de durées sur téléphone.** De cinq minutes à deux heures en un geste, avec un champ dessous pour tout autre cas : le clavier devient rarement nécessaire.

🎨 **Les pages s’ouvrent triées par priorité.** Une P1 n’est plus sous trois P4. Les projets s’ouvrent groupés par section, et un backlog ou une page de tag par projet. Déposer une tâche quelque part rend l’ordre manuel.

🎨 **Le message d’annulation dit exactement ce qu’a fait un dépôt.** « Déplacée à jeudi », « Déplacée vers #Site », « Devenue sous-tâche de Préparer le lancement ». Chaque dépôt disait la même chose.

🎨 **Analyses utilise le calendrier de l’app pour choisir une période.** Les jours hors période sont grisés au lieu d’être masqués.

🎨 **Un jour est dans la barre de navigation du téléphone.** Il était à deux appuis, derrière Parcourir.

🎨 **Sur téléphone, l’écran de départ demande seulement clair ou sombre.** Les autres choix représentaient une page et demie à faire défiler avant d’avoir vu une tâche. Ils sont dans Réglages.

🐛 **Les menus d’une tâche s’ouvrent vers le haut quand il n’y a pas de place dessous.** Le bas d’une liste est là où se trouvent les tâches à replanifier.

🐛 **Une tâche terminée dans la revue quotidienne quitte la liste.** Elle restait, marquée, ce qui faisait de la revue le seul endroit où terminer une tâche avait un autre aspect.

🐛 **Faire défiler la barre latérale au doigt ne fait plus glisser un projet.** Un glissement demande maintenant un appui maintenu au doigt : un mouvement rapide n’est qu’un défilement.

🐛 **Se connecter ne laisse plus l’app zoomée sur iPhone.** Safari zoome sur les petits champs et ne revient pas en arrière.

🐛 **⌘Entrée dans la fenêtre de nouvelle tâche crée la tâche une seule fois.** Le champ du nom et la feuille répondaient tous deux à la frappe.

🐛 **Échap dans une description ou une estimation enregistre la modification.** Il la jetait et fermait la tâche derrière.

## 1.6.0

🆕 **Glissez une tâche un peu à droite sur une autre pour en faire une sous-tâche.** Un trait en retrait montre où elle atterrira. Todoist autorise quatre niveaux : un dépôt qui irait plus profond est refusé.

🆕 **Glissez une sous-tâche vers la gauche pour en refaire une tâche.** Le menu de la ligne propose la même chose en mots, pour ceux qui n’ont pas trouvé le geste.

🆕 **Déposez une tâche sur une ligne pour la placer exactement là.** La position est enregistrée dans Todoist avec la nouvelle date ou le nouveau tag, même entre groupes.

🆕 **« Ajouter une tâche » est là où la nouvelle tâche apparaîtra.** À la fin d’une section, en haut d’un projet, dans une colonne de tableau, la boîte de réception, Un jour ou une page de tag, et la ligne reste visible au lieu de n’apparaître qu’au survol.

🆕 **Choisissez un projet et sa section dans une seule liste.** Les sections sont en retrait sous leur projet. Le panneau de la tâche a le même champ, où l’on ne pouvait pas du tout régler une section.

🎨 **Un tableau utilise toute la largeur de la page.** Les colonnes font entre 272 et 420 pixels : trois sections remplissent un écran d’ordinateur portable au lieu de se serrer à gauche.

🎨 **L’aperçu du glissement est une carte.** Ce qui suit le pointeur pendant que vous glissez ressemble maintenant à la tâche, pas à une longue ligne de texte brut.

🎨 **La poignée de glissement s’aligne sur la case.** Une tâche avec une description ne garde plus sa poignée sous son propre titre.

🐛 **Changer le projet d’une tâche dans le panneau la déplace vraiment.** Elle bougeait à l’écran puis retournait à son ancien projet à la synchronisation suivante.

🐛 **Le tri fonctionne sur la boîte de réception, Un jour et les pages de tag.** Le contrôle de tri de ces pages ne faisait rien jusqu’ici.

🐛 **Le compteur d’Affichage et le bouton Annuler sont lisibles en mode sombre.** Ils étaient blancs sur presque blanc.

## 1.5.0

🆕 **Refusez d’un clic une répétition devinée.** Si l’app lit un mot comme une règle de répétition et se trompe, cliquez sur la marque ou appuyez sur Retour arrière contre elle : les mots redeviennent du texte.

🆕 **Tapez #Projet/Section pour régler les deux.** Après le `/`, la liste montre toutes les sections de ce projet : vous dites où dans le projet va la tâche.

🆕 **Tapez « demain 12:14 », « demain matin » ou « ce soir ».** Le matin vaut neuf heures et le soir sept heures, comme dans Todoist : les mêmes mots tombent à la même minute dans les deux.

🆕 **Modifiez un titre et l’app le lit pendant la frappe.** Dates, répétitions, projets, sections, tags, priorités et estimations sont marqués au fil de l’écriture et placés dans leurs champs à l’enregistrement. Échap rétablit le titre.

🆕 **Réordonnez les sous-tâches en les faisant glisser les unes devant les autres.** Dans le panneau de la tâche, glissez une sous-tâche vers le haut ou le bas pour les mettre dans l’ordre voulu.

🎨 **Les mots reconnus prennent la couleur de ce qu’ils nomment.** Un projet prend sa couleur, un tag la sienne, et une priorité va du rouge P1 au gris P4. Dates et répétitions portent votre accent.

🎨 **Remontez la chaîne des parents d’un clic.** La ligne au-dessus d’une sous-tâche est maintenant une suite de liens, un par parent et le projet, au lieu d’une impasse.

🎨 **Un deuxième projet, priorité ou date dans un nom remplace le premier.** Un nom porte un de chaque : le dernier tapé compte. Les tags font exception : on peut en ajouter plusieurs.

🐛 **Une nouvelle sous-tâche ne saute plus en bas.** Elle était créée en haut de la liste de son parent, puis déplacée quand la synchronisation répondait.

🐛 **Une tâche déposée atterrit là où vous visiez.** Une zone cachée derrière le panneau de la tâche pouvait gagner un dépôt destiné à une ligne à l’intérieur.

🐛 **Une longue description ne décale plus le panneau quand vous cliquez ailleurs.** Le panneau sautait sous votre pointeur.

## 1.4.0

🆕 **Déplacez une tâche vers une section en tapant son nom.** Le menu de déplacement s’ouvre avec le curseur dans un champ. Tapez une partie du nom de la section ou de son projet, appuyez sur Entrée, et la première correspondance prend la tâche.

🎨 **Les tâches propres d’un projet passent en premier, sans titre « Sans section ».** Les tâches hors section étaient au bas de la page sous un titre que personne n’avait créé. Elles ouvrent maintenant la page, comme dans un tableau.

🐛 **Une tâche déposée sur un projet de la barre latérale atterrit dans ce projet.** Les deux lectures d’une ligne de la barre latérale restaient ouvertes pendant le glissement, et le dépôt ne menait nulle part.

🐛 **Annuler un déplacement depuis le menu d’une tâche la remet en place.** L’annulation ne changeait que l’écran et laissait la tâche là où elle avait été envoyée dans Todoist.

## 1.3.0

🆕 **Changez plus que la date de plusieurs tâches à la fois.** La barre en bas de la fenêtre a maintenant un bouton pour Date, Déplacer, Tags et Priorité, chacun ouvrant un panneau au-dessus de la barre.

🆕 **Ajoutez ou retirez un tag sur plusieurs tâches.** Un tag porté par une partie seulement de la sélection apparaît à moitié coché. Le cocher l’ajoute aux autres, le décocher le retire de toutes.

🆕 **Échap efface la sélection.** Une fenêtre ou un menu ouvert reçoit Échap en premier : il n’efface la sélection que si rien d’autre n’est ouvert.

🆕 **Une discrète invitation à offrir un café.** Une phrase tranquille au bas d’une revue terminée et d’Analyses. Elle ne compte rien et n’apparaît pas plus souvent à mesure que vous utilisez l’app.

🐛 **Une fenêtre ne ramène plus le curseur sur son premier champ.** Tout rafraîchissement de la page derrière déplaçait votre curseur en haut pendant que vous tapiez.

🐛 **Une synchronisation n’écrase plus ce que vous tapez.** Les champs du titre, de la description et de l’estimation gardent votre brouillon tant que le curseur y est.

## 1.2.1

🐛 **L’icône de l’app s’affiche correctement.** L’icône d’installation manquait quand un envoi omettait le dossier des icônes. Les icônes sont maintenant à côté du favicon, pour que les navigateurs proposent l’installation.

## 1.2.0

🆕 **Un thème sombre.** Choisissez Automatique, Clair ou Sombre dans Réglages. Automatique suit votre appareil et bascule avec lui. Les couleurs de projets et de tags de Todoist sont éclaircies sur une page sombre pour rester lisibles.

🆕 **Choisissez la couleur d’accent parmi neuf, ou la vôtre.** Une couleur personnalisée reçoit un texte, des fonds et des badges assortis en clair et en sombre. En retard et P1 gardent leur rouge.

🆕 **Tapez une répétition comme « tous les lundis » dans un nom ou dans le panneau de la tâche.** La fenêtre de nouvelle tâche la marque, la ligne de répétition du panneau est maintenant un champ modifiable, et le menu de planification en lit une aussi.

🆕 **Un écran de départ interroge thème, couleur et densité.** Les changements s’aperçoivent au fur et à mesure, puis une courte visite montre quatre contrôles. Il est enregistré par compte et se rouvre depuis Réglages.

🆕 **La revue hebdomadaire peut envoyer une tâche dans Un jour.** Elle ne proposait qu’Aujourd’hui et Cette semaine : « ça n’arrive pas cette semaine » n’avait aucune destination.

🎨 **Apparence et disposition de la semaine se choisissent sur images.** Comme la densité l’était déjà, au lieu de lire des noms d’options.

🐛 **Donner une date simple à une tâche répétée ne met plus fin à sa série.** Le glisser-déposer et « Tout passer à aujourd’hui » ne déplacent plus que la date et gardent la règle de répétition.

🐛 **L’icône de l’app n’est plus rognée.** L’arrondi du système s’ajoutait au nôtre et laissait un anneau visible.

🐛 **L’installation de l’app trouve son manifeste.** Il est maintenant servi avec le bon type : les navigateurs proposent de l’installer.

## 1.1.1

🆕 **Aujourd’hui, en page à part à côté de Cette semaine.** Cette semaine contient toujours toute la semaine par défaut. Un réglage sépare les deux, avec le jour dans la semaine ou en dehors.

🆕 **Renommez le tag qui signifie « à tout moment cette semaine ».** Les tableaux qui utilisent déjà `this_week` n’ont plus à être renommés pour être lus ici.

🆕 **Annulez avec ⌘Z, longtemps après la disparition du message.** Il inverse votre dernier changement : un déplacement, une complétion, une suppression ou un dépôt. Les tâches supprimées reviennent sous de nouveaux identifiants.

🆕 **Sélectionnez plusieurs tâches avec ⌘-clic et agissez sur toutes.** Une barre en bas de la fenêtre envoie la sélection à aujourd’hui, cette semaine, Un jour ou une date, ou la supprime, en une requête avec un seul Annuler.

🆕 **Glissez un projet dans un autre dans la barre latérale pour l’imbriquer.** Glissez à droite pour le mettre dans la ligne sous le pointeur. Le menu du projet le ressort.

🆕 **Tapez la date d’une tâche dans son menu de planification.** Le menu s’ouvre avec le curseur dans un champ, et ce que vous tapez réduit une courte liste : « dem » propose demain, « 15 » propose les trois prochains quinze.

🆕 **Tapez une estimation entre parenthèses dans le nom d’une tâche.** « Appeler Anne (25) » crée la tâche avec une estimation de 25 minutes, sans rien d’autre à remplir.

🆕 **Choisissez comment les dates s’écrivent dans Réglages.** Par exemple 12 sept. 2026, sept. 12, 2026 ou tout en chiffres. Aujourd’hui et demain sont toujours nommés.

🆕 **Choisissez quelle semaine la revue hebdomadaire examine.** Elle s’ouvre sur la semaine qui vient de finir tant que la nouvelle est jeune, et des flèches mènent à n’importe quelle autre.

🆕 **La revue hebdomadaire clôt la semaine, puis ouvre la suivante.** Ce que vous avez terminé, ce que cela représente, ce qui est en retard et quels projets se sont tus, puis le courrier, la boîte de réception, Un jour, les engagements de la semaine suivante et les estimations.

🆕 **Les deux revues finissent sur votre charge.** Les heures du jour ou de la semaine face aux heures que vous avez dites avoir, avec une issue pour chaque tâche sur place.

🆕 **Les deux revues ont une étape courrier avant la boîte de réception.** Une bonne partie de la boîte de réception arrive par e-mail. L’étape porte des liens vers votre courrier, que l’app ne peut pas voir.

🆕 **La dernière étape de la revue quotidienne peut déplacer des tâches.** Elle n’offrait aucune action : une journée pleine finissait la revue sur un problème sans destination.

🆕 **Choisissez combien de temps un projet peut se taire avant que la revue le mentionne.** Quatorze jours par défaut, à adapter à un projet rapide ou lent.

🎨 **« À régler » se remarque quand il contient quelque chose.** Il avait le même aspect vide ou avec quatorze contradictions. Il prend maintenant une ligne et un léger fond.

🎨 **Une tâche terminée s’estompe au lieu de disparaître.** Coche, texte grisé, puis la ligne part un instant après : un clic par erreur se repère facilement.

🎨 **Les mots reconnus dans un nom ont de l’air autour.** Les surlignages s’alignent sur le texte et les espaces entre les mots gardent leur largeur normale.

🎨 **Les boutons d’une carte de tableau ont un bord.** C’était un panneau blanc sur une carte blanche, soit rien du tout.

🎨 **Une ligne sélectionnée est un panneau gris plus large que la ligne.** La case est à l’intérieur, et rien ne bouge quand vous choisissez une tâche.

🎨 **Le trait qui montre l’imbrication d’un projet correspond à la ligne.** Il a la même largeur et le même retrait que la ligne aura.

🎨 **Le rail de progression de la revue montre seulement où vous en êtes.** Il changeait de sens au fil de vos réponses.

🎨 **Le bascule quotidien/hebdomadaire de la revue reste en place.** Basculer déplaçait le bouton que vous veniez d’appuyer.

🐛 **Dates, projets et priorités tapés dans un nom atteignent les champs dessous.** La fenêtre pouvait montrer une tâche avec une date et en créer une autre.

🐛 **La recherche trouve des pages comme Réglages dès la frappe.** La liste des lieux était jetée à la première touche.

🐛 **Le commutateur « Afficher les sous-tâches » fonctionne.** Il était dessiné, mais rien ne le lisait.

🐛 **Ajouter l’app à l’écran d’accueil d’un iPhone montre son icône.** iOS ne lit pas le manifeste web : l’app a maintenant sa propre icône.

🐛 **« À régler » peut renseigner les estimations manquantes.** Il contient maintenant le même éditeur par lot que l’en-tête de page.

🐛 **Renseigner les estimations dans la revue ne déplace plus les lignes sous votre curseur.** La liste reste immobile pendant que vous tapez, et un bouton enregistre tout.

🐛 **La revue ne pose plus séparément « Glissé » et « En retard ».** C’était la même question sous deux noms.

🐛 **Donner une date à une tâche depuis une ligne ou une colonne retire son tag de semaine.** Les deux ensemble sont une contradiction que l’app signale au lieu de la garder.

## 1.1.0

🆕 **Une revue quotidienne et hebdomadaire, une question à la fois.** La quotidienne couvre le retard, la boîte de réception, les engagements de la semaine, les estimations et le plan du jour. L’hebdomadaire ajoute le travail terminé, les totaux, les tâches glissées, les projets silencieux et Un jour. Chaque réponse met Todoist à jour.

🆕 **Les actions de projet dans la barre latérale et sur la page du projet.** Ajouter au-dessus ou en dessous, modifier, mettre en favori, dupliquer, archiver et supprimer, comme dans Todoist. Un projet se renomme aussi depuis son titre.

🆕 **Glissez les projets pour les réordonner.** Un projet se déplace dans sa propre liste de voisins.

🆕 **Créez des tags depuis la page Tags, ou en tapant un nouveau nom après `@`.** Un tag qui n’existe pas encore est créé sur place : plus besoin de passer d’abord par Todoist.

🆕 **Choisissez l’aération des listes.** Compacte ou confortable, choisie en regardant deux images. La compacte resserre l’espace autour d’une ligne sans rien retirer.

🆕 **Parcourir, cinquième destination sur téléphone.** Elle contient ce qui n’a pas de place sur un téléphone : profil, recherche, tags, favoris et projets.

🆕 **Le sélecteur de date et la liste de l’app elles-mêmes.** Plus de liste système qui s’ouvre dans une feuille dessinée par l’app.

🆕 **Renseignez les estimations manquantes d’une page en une passe.** Tab parcourt la colonne, le bas compte ce qui est rempli et ce que cela représente, et un bouton enregistre tout.

🆕 **Retours et café dans le menu utilisateur.** Le menu contient le formulaire de retours et le lien café, et se ferme quand vous cliquez ailleurs.

🎨 **Les tags portent leur couleur sur la ligne de tâche.** La couleur d’un tag s’affiche sur les tâches qui le portent : on les distingue d’un coup d’œil.

🎨 **Analyses charge un an d’historique plus vite.** Elle lit quatre fenêtres à la fois au lieu d’une après l’autre.

🐛 **Les messages et les boutons Annuler apparaissent à l’écran.** Une règle oubliée les gardait invisibles : aucune erreur ni aucun Annuler n’avait jamais atteint personne.

🐛 **Ajouter une tâche depuis la fenêtre de nouvelle tâche n’échoue plus en silence.** Laisser le sélecteur de projet tel quel envoyait un projet vide, que Todoist refuse.

🐛 **Un changement que Todoist refuse vous est signalé.** Le changement refusé est abandonné au lieu d’être renvoyé à chaque synchronisation et de bloquer tout ce qui suit.

🐛 **Un refus lié aux limites du forfait ne vous déconnecte plus.** Todoist répond par la même erreur quand les limites d’un forfait sont atteintes, et l’app la prenait pour une connexion expirée.

🐛 **Les projets imbriqués sous un projet apparaissent dans la barre latérale.** Seuls les dossiers montraient leurs enfants.

🐛 **Une description avec deux liens n’affiche plus de HTML brut.** Le tiret bas d’un lien déchirait les deux.

🐛 **La barre de navigation du téléphone revient à l’écran.** Elle était sous la ligne de flottaison, derrière les barres du navigateur.

🐛 **Les boutons de navigation du téléphone fonctionnent.** « Ouvrir la navigation » ouvrait Cette semaine, et « masquer la barre latérale » ne faisait rien.

🐛 **Une nouvelle section ou un nouveau tag n’apparaît plus en double.** Seuls les tâches et les projets voyaient leur espace réservé effacé.

## 1.0.0

🆕 **Parcourez les périodes d’Analyses avec des flèches.** Cette semaine, puis la semaine d’avant. Les semaines commencent au premier jour de votre Todoist et les trimestres sont des trimestres civils. Modifiez l’une ou l’autre date pour une plage à vous.

🆕 **Glissez les tags dans un nouvel ordre.** C’est l’ordre propre de Todoist : vos favoris de la barre latérale le suivent.

🆕 **Un tableau avec beaucoup de colonnes défile sur le côté, avec des flèches.** Quand il y a plus de colonnes que l’écran n’en tient, le tableau défile et des flèches au-dessus vous font avancer.

🆕 **Les liens vers l’app montrent un titre, une description et une image.** Partagez-la dans un message et elle s’affiche avec un aperçu de Cette semaine.

🆕 **Une section À propos dans Réglages.** La version, une note précisant que ce n’est pas un produit officiel de Todoist, et des liens vers le site, le code, ce journal et le café.

🎨 **L’app s’appelle « Enhanced for Todoist » partout.** C’est la forme que demandent les règles de marque de Todoist aux apps tierces, avec une mention claire qu’elle n’est pas affiliée à Todoist.

🎨 **L’app a sa propre icône.** Trois capsules de hauteurs différentes sur une même ligne : une semaine lue comme la charge qu’elle porte. Elle remplace la marque de Todoist et son rouge dans le navigateur.

🎨 **Rapide veut dire rapide.** Une tâche taguée rapide mais estimée à plus de cinq minutes est exclue du groupe Rapide. Le tag est une affirmation, l’estimation est le fait.

🎨 **La ligne d’ajout en fin de section apparaît au survol.** Elle ne prend pas de place avant, et En retard et Rapide ne finissent plus par une bande vide.

🎨 **Sur un tableau, les tâches hors section forment la première colonne.** Les tâches sans section ne sont plus cachées à la fin : elles ouvrent le tableau.

🎨 **Les tags sont listés un par ligne.** La page Tags liste chaque tag sur sa ligne, ce qui se lit mieux qu’une grille.

🎨 **Le Journal groupé par priorité commence par P1.** Le groupe le plus urgent vient en premier, au lieu d’un ordre arbitraire.

🎨 **Le tableau de Prochainement utilise les mêmes flèches que les autres tableaux.** Les mêmes flèches parcourent les jours : tous les tableaux se comportent pareil.

🐛 **Cette semaine en tableau montre les mêmes cinq groupes que la liste.** Il montrait une seule colonne contenant toute la semaine.

🐛 **Les photos de profil sont rondes dans la barre latérale.** Une photo gardait des coins carrés sous le cadre rond, et un portrait était écrasé.

🐛 **L’icône de l’app installée garde ses coins arrondis sur un téléphone.** Elle a maintenant sa propre version pleine page.

🐛 **En retard n’accepte plus de dépôts.** Y déposer datait la tâche d’aujourd’hui, ce que le titre ne dit pas.

## 0.9.0

🆕 **Déposez une tâche sur Rapide pour la dater d’aujourd’hui et la taguer rapide.** Glisser une tâche sur le groupe Rapide fait les deux en un geste.

🆕 **Les colonnes d’un tableau montrent leur temps estimé.** Avec le nombre de tâches sans estimation et, pour une colonne de jour, son remplissage par rapport à la capacité du jour.

🎨 **Le Tableau de bord est un onglet d’Analyses.** La page séparée a disparu, et un ancien lien mène à l’onglet.

🎨 **Les colonnes d’un tableau ont la même largeur que la liste.** Elles ne s’étirent plus plus large que le reste de la page.

🎨 **Les tâches d’un tableau sont des cartes.** Elles sont présentées en cartes plutôt qu’en lignes de liste.

🐛 **Finir un glissement n’ouvre plus la tâche déposée.** Le clic que le navigateur envoie à la fin d’un glissement l’ouvrait.

## 0.8.1

🎨 **La description d’un projet tient toujours sur une ligne.** Survolez-la pour ouvrir le texte complet, où les liens sont cliquables.

🐛 **La grille de capacité dans Réglages tient dans la page.** Les champs où vous saisissez vos heures par jour débordaient.

🐛 **Les contrôles de page passent sous le titre dans une colonne étroite.** Les boutons passent sur leur propre ligne au lieu de déborder.

🐛 **Un graphique de deux douzaines de marques défile dans sa carte.** Un long graphique ne déborde plus de la page.

## 0.8.0

🆕 **Glissez les sections pour les réordonner, avec leurs tâches.** Les espaces entre sections s’ouvrent pendant le glissement pour que vous puissiez les viser.

🆕 **Supprimez une section.** La confirmation dit combien de tâches partent avec elle.

🎨 **Un projet sans description ne prend pas de place.** Il laissait un vide de 52 pixels sous le titre.

🐛 **Une nouvelle version prend effet au prochain rechargement.** Les correctifs semblaient non appliqués tant que tous les onglets n’étaient pas fermés.

🐛 **Une nouvelle section est créée là où vous avez cliqué.** À l’endroit choisi, pas au bas de la page.

🐛 **Glisser une tâche sur Aujourd’hui n’allume plus d’autres sections.** En retard et Rapide s’allumaient aussi, ce qui rendait la destination peu claire.

## 0.7.0

🐛 **Les cibles de dépôt de la barre latérale fonctionnent.** Deux cibles pour le même endroit s’annulaient.

🐛 **Les colonnes de tableau sont lisibles.** Elles avaient été écrasées à 157 pixels, ce qui rendait les titres illisibles.

🐛 **Une section se replie depuis toute sa ligne de titre.** Un clic n’importe où sur le titre la replie, pas seulement sur les mots.

## 0.6.0

🆕 **Les dates sont lues dans le nom de la tâche pendant la frappe.** `demain`, `lundi`, `dans 3 jours` et `demain à 9h` sont surlignés avant l’enregistrement. Désactivez-le dans Réglages. `#projet`, `p1` et `@tag` s’appliquent toujours.

🆕 **Tapez des sous-tâches dans la fenêtre de nouvelle tâche.** Ajoutez des sous-tâches en écrivant la tâche : elles sont créées avec leur parent.

🆕 **Utilisez le clavier dans la recherche.** Les flèches parcourent les résultats et Entrée en ouvre un.

🆕 **Des filtres multiples dans le Journal.** Choisissez plusieurs projets, tags ou priorités à la fois.

🆕 **Prochainement montre quatre colonnes de jours à la fois.** Des flèches mènent aux jours d’avant et d’après : la page n’est jamais à l’étroit.

🎨 **Le tableau de bord d’Analyses suit la période.** Un jour montre les heures de travail, une semaine ou un mois ajoute le profil de la semaine et une comparaison jour par jour, un trimestre se lit par semaine et une année par mois.

🎨 **Les tags utilisent une icône de tag.** Un drapeau ressemblait à une priorité : les tags ont leur icône.

🎨 **L’aperçu du glissement se place à côté du pointeur.** Ce que vous faites glisser ne cache plus le curseur dessous.

🐛 **Les colonnes d’un tableau passent sur une deuxième ligne.** Groupé par projet ou tag, la majeure partie du tableau était hors écran.

🐛 **Le sélecteur de tags n’agrandit plus la fenêtre.** Il repoussait les autres champs hors de vue. Il s’ouvre maintenant dans la fenêtre.

## 0.5.0

🆕 **Graphiques d’Analyses.** Anneaux par projet et par priorité, tâches par jour, heure de la journée, classement des tags et comparaison avec la période précédente.

🆕 **Un réglage de page d’accueil.** Choisissez la page sur laquelle l’app s’ouvre, par exemple Cette semaine ou Aujourd’hui.

🎨 **Un nouvel aspect.** Une palette de rouges chauds, une barre latérale teintée de rose et des contrôles plus arrondis.

🎨 **Un écran de connexion plus net.** Avec la note de confidentialité entre le champ et le bouton.

🎨 **Réglages est une page qui défile.** Un menu à côté suit votre position : vous sautez à n’importe quel groupe.

🎨 **Chaque liste de choix est dessinée par l’app.** Les menus ont le même aspect sur chaque appareil au lieu de reprendre la liste de chaque système.

🐛 **Les contrôles de survol ne sont plus au milieu d’une ligne de tâche.** Les boutons qui apparaissent au survol sont maintenant en fin de ligne, là où on les attend.

🐛 **Déposer une tâche sur la boîte de réception, Prochainement ou Un jour fonctionne.** La tâche s’y déplace au lieu de revenir en arrière.

🐛 **Le champ d’estimation a une unité.** Il dit maintenant qu’il compte des minutes : « 25 » est clairement 25 minutes.

## 0.1.0

🆕 **Cette semaine comme accueil.** La semaine est découpée en en retard, rapide, aujourd’hui, planifié aujourd’hui et à tout moment cette semaine.

🆕 **Des estimations en durées.** Stockées sous forme d’étiquette comme `est-25` et affichées en temps, avec votre charge et votre capacité calculées à partir d’elles.

🆕 **Prochainement, Un jour, la boîte de réception, les pages de projet et de tag.** Les lieux où vivent vos tâches, chacun avec sa page : ce qui arrive, ce qui est mis de côté, ce qui vient d’arriver, et une page par projet et par tag.

🆕 **Les modes liste, tableau et focus.** Regardez les mêmes tâches en liste, en colonnes sur un tableau, ou une à la fois en mode focus.

🆕 **Du glisser-déposer avec un sens par destination.** Déposer une tâche sur un jour, un projet, un tag ou une place dans une liste signifie une chose claire à chaque fois, et chaque dépôt peut être annulé.

🆕 **Analyses, avec un score de concentration.** Voyez combien de tâches vous avez terminées et quand, avec un score qui dit à quel point vos journées étaient concentrées.

🆕 **À régler.** Les estimations manquantes et les contradictions à l’intérieur d’une tâche.

🆕 **Fonctionne hors connexion.** À partir d’une copie conservée sur votre appareil, avec les changements envoyés au retour de la connexion.

🆕 **Anglais et français.** Toute l’app est disponible dans les deux langues et suit votre appareil par défaut.
