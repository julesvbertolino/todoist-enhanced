# Journal des modifications

La traduction française de [CHANGELOG.md](CHANGELOG.md), lue par la fenêtre
« Nouveautés » de l'app quand elle est en français. Seules les versions
traduites ici y apparaissent en français ; les autres s'affichent en anglais.
Chaque ligne est marquée :
- 🆕 ce que l'app ne faisait pas avant,
- 🎨 ce qui existait et a été redessiné ou reformulé,
- 🐛 un bug ou une régression corrigés.

## 2.0.0

Un nouveau look, une configuration qui façonne la barre latérale et ce qu’affiche une tâche, un Tableau de bord et un Journal à part entière, et les premiers pas vers le travail à plusieurs.

🆕 **Choisissez comment l’app se pose dans la fenêtre, et ce qu’il y a derrière.** Réglages, Apparence, propose deux dispositions (une barre latérale flottante sur une page pleine, ou une page flottante sur le fond) et deux fonds (neutre, ou un dégradé tiré de votre couleur). Le texte de la barre latérale reste lisible sur n’importe quelle couleur. Le rouge de Todoist s’appelle désormais Todoist, et Cacao et Graphite rejoignent les couleurs.

🆕 **Composez la barre latérale.** Réglages, Barre latérale, permet de cocher ce qui s’affiche (Tableau de bord et Journal sont maintenant des entrées à part), de glisser les entrées dans l’ordre voulu, de masquer le champ de recherche et les compteurs, et de ranger « Mes projets » et vos espaces de travail dans l’ordre que vous aimez. Ce que vous masquez reste trouvable avec ⌘K.

🆕 **Choisissez ce qu’affiche une tâche, et dans quel ordre.** Dans Affichage, « Afficher sur chaque tâche » liste les détails sous un titre (date, échéance, projet, tags, estimation). Cliquez-en un pour l’afficher ou le masquer, glissez-le, ou appuyez sur Alt et une flèche, pour fixer l’ordre dans toutes les listes.

🆕 **Une configuration pour tout le monde, et une visite à la suite.** Après la mise à jour, et pour chaque nouveau compte, cinq courts écrans règlent le look, la barre latérale et les détails d’une tâche. Le dernier propose la visite, qui montre aussi le Tableau de bord, la matrice et les notifications.

🆕 **Les notifications de Todoist.** La cloche ouvre une fenêtre avec ce que Todoist vous dit et, à côté, les conflits de votre planning. Marquez une notification ou toutes comme lues, acceptez ou refusez une invitation à un projet partagé. Pas encore essayé avec un second compte Todoist.

🆕 **Partager un projet et assigner des tâches.** Le menu d’un projet propose Partager…, pour inviter par e-mail, voir qui a accès et retirer quelqu’un. Dans un projet partagé, une tâche a un champ « Assignée à ». Pas encore essayé avec un second compte Todoist.

🆕 **Une vue par défaut pour chaque projet.** La fiche projet demande s’il s’ouvre en liste ou en tableau, et le dit aussi à Todoist. Il peut aussi être rangé sous un projet parent, avec les vingt couleurs de Todoist.

🆕 **Créer un projet sans quitter la nouvelle tâche.** La liste des projets du composeur se termine par Nouveau projet…, et vous revenez avec lui choisi.

🎨 **Un look plus calme partout.** Des angles plus arrondis, des boutons secondaires gris doux, des cases à cocher carrées, des barres de défilement fines qui n’apparaissent que sous le pointeur, une barre latérale qui glisse, et des panneaux qui flottent dans la marge de la page.

🎨 **Ouvrir une tâche en fenêtre ou en panneau latéral.** Réglages, Listes, au choix. La priorité devient quatre pastilles douces, et la croix d’un tag est centrée.

🎨 **Des listes dans l’ordre de Todoist.** Les groupes se replient depuis une flèche à leur gauche avec leur nombre après le titre, les sous-tâches se placent juste sous leur tâche et se replient avec leur pastille d’avancement, et les tableaux gardent des colonnes entières sur la page.

🎨 **« J’ai du temps » est une seule liste.** Elle suit l’ordre choisi (la plus courte d’abord, ou la priorité d’abord) et dit l’échéance de chaque tâche, au lieu de regrouper par jour.

🎨 **L’en-tête de page le dit en une ligne.** Le temps estimé passe en orange à partir de 95 % de votre capacité et en rouge au-delà, et un clic dessus ouvre les tâches sans estimation.

🎨 **Tableau de bord et Journal sont deux pages.** Une ligne de contrôles choisit la période (Jour, Semaine, Mois, Trimestre, Année ou Personnalisée, où les dates apparaissent). Le Journal groupe par jour, mois, projet ou priorité, trie par date de fin ou priorité, et additionne le temps de chaque groupe. L’agencement des cartes du Tableau de bord ne se modifie plus.

🎨 **Les Réglages dans un nouvel ordre.** Compte, Général, Apparence, Barre latérale, Listes, Fonctionnalités et organisation, Détection des conflits, À propos. La carte de soutien reste visible, et le début de semaine est lu dans Todoist avec un lien pour le changer là-bas.

🎨 **Un nouvel écran de connexion et un journal des modifications plus large.** La connexion montre à quoi sert l’app à côté du formulaire. Le journal a un sélecteur de version, marque chaque ligne Nouveauté, Design ou Correction, et lance la visite depuis son pied.

🎨 **Les revues.** Les choix d’une ligne forment un seul contrôle segmenté rempli de votre couleur, et les étapes sont reliées par une ligne qui se remplit jusqu’à celle où vous êtes.

## 1.22.0

Un menu sur chaque section, des durées qui suivent les sous-tâches et Cette semaine dans le même ordre que l'Aujourd'hui de Todoist.

🆕 **Un menu sur chaque section d’un projet.** Les trois points à droite du titre d’une section remplacent la corbeille et ouvrent Modifier (le nom est sélectionné, prêt à être remplacé), Déplacer vers… (choisissez un autre projet), Dupliquer (une copie juste en dessous, avec ses tâches ouvertes et leurs sous-tâches), Copier le lien de la section, Archiver et, à part en bas et en rouge, Supprimer, qui demande toujours confirmation. Archiver masque la section et ses tâches, avec Annuler dans le message. Le menu se commande au clavier : Entrée ou Espace l’ouvre, les flèches se déplacent, Échap le ferme et vous ramène sur le bouton. Les sections En retard, Tâches rapides et les autres construites par l’app gardent leur en-tête.

🆕 **La durée d’un parent suit ses sous-tâches.** Quand chaque sous-tâche ouverte d’une tâche a une durée, leur somme remplace celle du parent, dans l’app comme dans Todoist : l’app l’écrit pour vous, et la met à jour quand la durée d’une sous-tâche change ou qu’une sous-tâche est ajoutée, cochée, supprimée ou déplacée. Si une sous-tâche ouverte n’a pas de durée, rien ne change et le parent garde la sienne. Les totaux, J’ai du temps, la charge et les analyses comptent chaque tâche une seule fois, et l’élément « le parent et ses sous-tâches ont chacun une durée » n’apparaît plus dans Éléments à régler quand la somme s’applique.

🎨 **Le nombre de tâches suit directement le titre de section, avec la flèche de repli à gauche.** La pastille ronde est passée de l’extrémité droite à juste après le titre, la flèche qui replie une section est dans la marge à gauche du titre (les titres restent alignés sur les tâches), et la poignée pour déplacer une section a reculé d’un cran. Une section repliée le reste après un rechargement sur cet appareil.

🎨 **Glisser une tâche au-dessus d’une autre section ne dessine plus que la ligne d’arrivée.** Le cadre autour de la section entière a disparu : une ligne rouge montre où la tâche ira, et sur une section vide ou sous la dernière tâche elle se place à la fin de la section.

🐛 **Cette semaine suit l’ordre de l’Aujourd’hui de Todoist.** À priorité et date égales, les tâches sont maintenant classées dans l’ordre des projets de la barre latérale (la Boîte de réception d’abord, un sous-projet juste après son parent) au lieu de l’ordre où elles ont été ajoutées. Une tâche que vous avez placée à la main reste où vous l’avez mise, et les autres tris ne changent pas.

🐛 **Ajouter une section place le curseur dans son nom.** Un clic sur Ajouter une section sélectionne « Section sans titre » pour taper tout de suite, même si Todoist met un moment à répondre, et ce que vous avez tapé n’est pas perdu quand il répond. Deux clics de suite ne créent plus deux sections.

🐛 **Une tâche ou un bouton Ajouter une tâche ne reste plus entouré après la fermeture de sa fenêtre à la souris.** Au clavier, on voit toujours où le focus est revenu.

## 1.21.0

Des listes de contrôle dans la description des tâches, un rendu plus calme et plus abouti dans les Réglages, la configuration, le tableau de bord et les listes.

🆕 **Écrivez des listes de contrôle dans la description d’une tâche et cochez-les sur place.** Les lignes « - [ ] élément » et « - [x] élément » s’affichent en petites cases dans le panneau de la tâche, avec « 3 sur 7 » à côté de la description. Cochez et seule cette ligne change ; le reste de la description reste exactement tel quel, donc le même texte se lit toujours dans Todoist. La modification se fait comme dans une note : Entrée ajoute l’élément suivant, Entrée sur un élément vide quitte la liste, Retour arrière en début d’élément en fait du texte, une × le retire et plusieurs lignes collées deviennent plusieurs éléments. Taper [] ou - [] puis une espace commence une liste, dans la description d’une tâche et dans la fenêtre de création. Les lignes des listes n’affichent jamais les lignes de la liste de contrôle. Sélectionnez des mots dans une description pour afficher sa barre de mise en forme ; Lien ouvre les champs de texte et d’adresse. Coller une adresse sur une sélection crée un lien, puis la frappe reprend en texte normal. Le composeur garde un champ discret, avec Markdown et raccourcis clavier.

🆕 **Réorganisez les cartes du tableau de bord.** Modifier la disposition donne à chaque carte deux flèches pour la déplacer, à la souris ou au clavier, chaque déplacement étant annoncé aux lecteurs d’écran. Les cartes restent dans leur section, rien n’est retiré, et Rétablir par défaut les remet. Votre ordre est conservé avec vos réglages et survit au changement de période.

🆕 **Choisissez comment les pastilles d’une tâche sont colorées.** Un nouveau choix, Métadonnées des tâches, dans les Réglages et la configuration : Inspiré de Todoist (textes sans pastilles), Couleurs héritées dessine la date, le projet et chaque étiquette dans la couleur qu’ils ont dans Todoist, sur un fond très léger ; Neutre les garde gris. La durée est toujours grise, et une date en retard reste rouge. Minimaliste garde le titre et la description, avec la durée et la date tout à droite et la récurrence à côté du titre.

🆕 **Glissez une sous-tâche au-dessus ou au-dessous de ses sœurs dans n’importe quelle liste.** Ma semaine, une étiquette ou Un jour réordonnent maintenant les sous-tâches comme le faisait déjà un projet : avec la ligne qui montre où elle atterrira, et rien d’écrit si elle est reposée à sa place. La ligne suit la moitié supérieure ou inférieure de la tâche survolée, et la sous-tâche atterrit à cet endroit. Déposée sous son propre parent, elle passe avant la première sous-tâche. Déposée entre les tâches d’un autre niveau, elle rejoint ce niveau. Un déplacement vers la droite la place sous la tâche visée ; plusieurs sous-tâches sélectionnées suivent ensemble. Un déplacement vers la gauche remonte d’un niveau. Chaque changement de parent propose Annuler.

🎨 **Les métadonnées proposent quatre styles.** Inspiré de Todoist conserve les textes sans pastilles ; Neutre et Couleurs héritées utilisent des pastilles légères ; Minimaliste place la durée et la date tout à droite. Le badge de récurrence est gris en mode Neutre et se place à côté du titre en mode Minimaliste. La barre complète d’actions apparaît au survol avant la date. Une tâche de la Boîte de réception la nomme désormais, et le nombre de jours de retard passe dans le texte pour lecteur d’écran.

🎨 **La ligne sous le titre d’une page tient en une phrase.** Sous le titre de Ma semaine, d’un projet ou d’une étiquette : le nombre de tâches, leur durée et J’ai du temps, le tout à gauche. La durée est du texte simple jusqu’à 90 % de votre capacité, orange à partir de 90 %, rouge à partir de 100 %, et un clic dessus ouvre les tâches sans estimation. Le pourcentage et le nombre de tâches sans estimation sont passés dans son infobulle.

🎨 **Le tableau de bord est plus calme et plus clair.** Des cartes grises séparées, le chiffre et son évolution sur une ligne avec le libellé dessous (vert pour plus, rouge pour moins), les dates de la période à côté du titre, un trimestre dessiné mois par mois et la carte d’activité du trimestre en demi-largeur. Les commandes de disposition sont en haut sans augmenter la hauteur des cartes ; les cercles et leurs légendes sont centrés dans l’espace sous le titre.

🎨 **Le panneau Analyses compte les sept derniers jours.** Aujourd’hui et les six jours d’avant, chaque jour dessiné même s’il n’y a rien eu, une note qui dit quels chiffres sont ceux de la page et quels chiffres sont ceux de tous les projets, et la carte Couverture des estimations a disparu.

🎨 **Les Réglages s’expliquent.** Les réglages de planification sont regroupés par usage, la capacité vient après et dit qu’il s’agit du temps pour les tâches après réunions et pauses, avec le total de vos jours et votre valeur hebdomadaire à part. De petites images montrent l’effet des choix de thème, de couleur et d’organisation, et un jour qui n’est pas une durée est refusé à voix haute.

🎨 **La configuration tient en cinq écrans courts.** Apparence, couleur, densité et couleurs des pastilles, organisation, et où stocker les estimations, chacun avec une image de l’espace de travail au-dessus de ses choix. La couleur personnalisée est une carte comme les autres, avec le sélecteur et le code hexadécimal dessous, et un code qui n’est pas une couleur est refusé sans perdre la dernière bonne.

🎨 **Les revues quotidienne et hebdomadaire montrent leurs étapes reliées.** Les étapes sont côte à côte dans une bande douce avec un fin trait entre elles, l’étape courante en gras, et sur un écran étroit la bande défile pour la garder visible.

🎨 **Le groupe Rapide s’appelle Tâches rapides.**

🐛 **Passer le tableau de bord à un mois, un trimestre ou une année ne le fige plus.** La page tournait sans fin sur la journée de 25 heures du retour à l’heure d’hiver (le 25 octobre en Europe). Les jours sont maintenant comptés sur le calendrier partout, la série et la revue hebdomadaire comprises, ce qui corrige aussi un jour sauté ou compté deux fois autour d’un changement d’heure. Une réponse lente pour une période que vous avez quittée ne peut plus remplacer celle que vous avez choisie, et une lecture échouée ou hors ligne le dit et propose Réessayer.

🐛 **Glisser plusieurs tâches sélectionnées dans une autre tâche les déplace toutes.** Elles deviennent des sous-tâches dans l’ordre où elles ont été choisies, un parent choisi garde ses enfants choisis, et un dépôt qui ferait une boucle ou irait trop profond est refusé avant toute écriture. Si Todoist refuse un déplacement, aucune tâche ne reste à moitié déplacée.

🐛 **Une tâche récurrente que vous cochez ne reste plus pâle et impossible à cliquer.** Dans une liste qui la garde, comme un projet, elle revenait cochée en apparence et ne répondait plus au clic.

🐛 **La mise en forme reste invisible au retour à la ligne.** Le gras continue sur la ligne suivante ; les liens se terminent avant le nouveau paragraphe. Les liens acceptent aussi les adresses sans protocole. La barre de sélection propose une liste de contrôle.

## 1.20.0

Choisissez où stocker les estimations et prévisualisez leur conversion entre étiquettes et durées Todoist.

🆕 **Choisissez les étiquettes ou les durées Todoist dans les Réglages.** Les étiquettes restent le choix par défaut et préservent l’indépendance des blocs du calendrier. Le mode durée utilise le champ Todoist, retire les étiquettes d’estimation et modifie le bloc des tâches avec une heure. Les comptes gratuits utilisent les étiquettes, car Todoist ne conserve pas leurs durées. Chaque écriture de durée est contrôlée auprès de Todoist ; si elle est refusée ou perdue, l’estimation est récupérée en étiquette et un message explique le changement. Les abonnements inconnus sont autorisés avec le même contrôle.

🆕 **Convertissez les estimations existantes avec une prévisualisation dans les Réglages.** L’aperçu compte les tâches ouvertes et les sous-tâches, identifie celles avec une heure et liste les exclusions : étiquettes invalides, estimations différentes et durées en jours. La conversion vers les étiquettes conserve les blocs horaires et efface les durées sans heure. Les tâches terminées et les étiquettes du compte sont préservées. Le bilan liste les tâches en échec ou indique les changements en attente de connexion.

🆕 **Réglez les estimations différentes dans les Conflits en mode durée.** Conservez la durée et retirez son étiquette d’estimation, ou utilisez l’étiquette comme durée. Ce second choix avertit lorsqu’un bloc du calendrier va changer. Les totaux et les Analyses privilégient la source choisie et utilisent l’autre en secours. Les comptes existants choisissent après les fenêtres de démarrage ; les nouveaux comptes choisissent pendant la configuration.

🆕 **Estimez plusieurs tâches sélectionnées ensemble.** Sélectionnez les tâches, ouvrez Estimation dans la barre du bas et saisissez des minutes ou des heures comme 25, 1h15 ou 90 min pour appliquer une valeur commune, ou retirez leurs estimations. Le mode de stockage choisi s’applique à toute la sélection.

🐛 **Créez une étiquette manquante partout où vous choisissez les étiquettes.** Recherchez son nom et choisissez Créer dans une tâche, le formulaire de création ou la sélection groupée pour la créer et l’attacher. Les filtres d’affichage proposent aussi la création.

🐛 **Un clic sur le fond de la page efface la sélection de tâches.** Les lignes, les commandes groupées et les fenêtres ouvertes conservent leurs interactions.

## 1.19.0

Un filtre de temps pour les minutes dont vous disposez, un groupe Elles prennent la poussière dans Un jour, le groupe Rapide sur toutes les listes, et une visite de ce que chaque mise à jour apporte.

🆕 **Faire ce qui tient dans le temps dont vous disposez avec le nouveau bouton « J'ai du temps ».** Une pastille après la charge dans Cette semaine, les projets, les étiquettes, la boîte de réception et Un jour ouvre un panneau à droite. Choisissez 5, 10, 15 ou 30 minutes ou une heure, ou tapez une durée, et il liste les tâches qui tiennent, groupées en retard, aujourd'hui, demain, cette semaine et sans date, chacune avec son sous-total. Cherchez dans la page où vous êtes ou partout. Une tâche sans estimation n'est jamais devinée : le panneau les compte et propose de les estimer. La page derrière reste telle quelle, rien n'est modifié et rien n'est retenu après un rechargement. Ouvrir les Analyses le ferme.

🆕 **Un jour a un nouveau groupe « Elles prennent la poussière » pour les tâches en attente depuis des mois.** Les tâches qui y sont depuis 3 mois ou plus sont réunies en haut, sous Rapide, avec leur ancienneté. Chacune a trois boutons : Cette semaine, Garder et Supprimer. Garder laisse la tâche dans Un jour et ne la fait revenir qu'après un nouveau délai complet ; c'est retenu sur cet appareil seulement, et rien n'est écrit dans Todoist. Les Réglages ont un interrupteur pour le groupe et le délai (1, 2, 3, 6 ou 12 mois), compté depuis la création de la tâche car Todoist ne dit pas quand elle est arrivée dans Un jour. ⇧K garde la tâche sous le curseur.

🆕 **Les tâches rapides ouvrent maintenant chaque projet, étiquette, la boîte de réception et Un jour.** Les projets, les étiquettes, la boîte de réception et Un jour commencent maintenant par les tâches rapides en retard, dues aujourd'hui ou sans date, et chaque ligne dit de quelle section ou de quel projet elle vient. Une tâche rapide due demain ou plus tard reste à sa place, aucune tâche n'est listée deux fois, et un tableau commence par une colonne Rapide bleue, à regarder et non pour y déposer des tâches (aussi dans Cette semaine, où déposer une tâche la rendait rapide). L'interrupteur Rapide des Réglages le coupe partout.

🆕 **Un bouton « Me montrer » dans les Nouveautés fait visiter ce qu'une mise à jour apporte.** Les Nouveautés ont un bouton Me montrer qui lance la visite uniquement sur ce que la mise à jour apporte, et la visite a une nouvelle étape pour J'ai du temps.

🆕 **Une durée définie dans Todoist compte maintenant comme estimation de la tâche.** Une tâche qui a une durée dans le champ propre à Todoist est maintenant comptée dans les totaux, la charge, la liste des tâches sans estimation et les Analyses, même sans étiquette d'estimation. Quand une tâche a les deux, la durée l'emporte ; une durée en jours est ignorée. L'app écrit toujours les estimations en étiquettes.

## 1.18.0

Coller une liste pour créer plusieurs tâches, un menu de date qui commence par les raccourcis, des sous-tâches qui montrent leur avancement, et tout passer à aujourd'hui qui est instantané.

🆕 **Coller une liste pour créer plusieurs tâches.** Collez des lignes de texte, avec ou sans puces, dans le champ nom de la fenêtre de nouvelle tâche : l'app demande « Est-ce que vous voulez créer les 3 tâches ? » avant de créer une tâche séparée par ligne. Chaque ligne est lue comme un titre à part, donc `(25)`, une date ou `#Projet` dans une ligne s'applique à cette tâche. Annuler garde ce que vous avez collé.

🆕 **Donnez une estimation à une nouvelle sous-tâche en la terminant par (5) ou (1h15).** Terminez une sous-tâche par son estimation entre parenthèses, comme `Faire le plan (5)` ou `Recherches (1h15)`, dans la fenêtre de nouvelle tâche ou en ajoutant une sous-tâche à une tâche ouverte, et elle est créée avec cette estimation. L'estimation est surlignée pendant la saisie, comme dans le nom d'une tâche. Des parenthèses qui ne sont pas une durée, comme `(peut-être)`, restent dans le titre.

🎨 **Le menu de date commence par les raccourcis.** Aujourd'hui, Demain, La semaine prochaine, Cette semaine et Un jour d'abord, puis Passer à la prochaine occurrence (avec la date où elle va, quand elle est sûre) et Retirer la date ; le calendrier ne s'ouvre que si vous choisissez Choisir une date. Échap ou le lien de retour ramène aux raccourcis sans rien changer. Le même menu sert sur une ligne, dans la fenêtre de nouvelle tâche, le panneau de tâche et la barre pour plusieurs tâches.

🎨 **La case d'une tâche terminée est remplie de la couleur de sa priorité.** Une tâche ou sous-tâche terminée est remplie de la couleur de sa priorité (gris pour P4) au lieu du vert.

🎨 **Un anneau à côté de « 1/3 » montre où en sont les sous-tâches d'une tâche.** À côté de « 1/3 », un petit anneau se remplit à mesure que les sous-tâches sont faites, dans les listes et dans le panneau de tâche, et passe au vert quand elles le sont toutes.

🎨 **« Tout passer à aujourd'hui » vide En retard instantanément.** Dans Cette semaine, le bloc En retard se vide dès que vous confirmez, tout part en une fois, et le message dit combien de tâches ont été déplacées, avec Annuler.

🐛 **Une sous-tâche terminée apparaît maintenant cochée dans le panneau de tâche.** Sa case restait vide alors que son titre était barré. Les deux montrent maintenant qu'elle est faite.

## 1.17.1

Insights compte de nouveau les bons jours, et la fenêtre Nouveautés s'ouvre maintenant après chaque mise à jour, avec les changements les plus visibles en premier.

🎨 **Les Nouveautés s'ouvrent maintenant une fois après chaque mise à jour, les plus gros changements d'abord.** Elles ne s'ouvraient que lorsqu'une version apportait du nouveau. Maintenant chaque version les ouvre une fois, et ses lignes sont classées du plus visible au moins visible : les nouveautés, puis les changements d'apparence, puis les corrections.

🐛 **Insights compte maintenant chaque jour de la période choisie.** La vue Jour n'affichait rien, le dernier jour de chaque période était oublié, et un jour manquait entre les parties d'un trimestre ou d'une année. Une tâche terminée dans les premières heures d'une période, en France avant 2 h du matin, était aussi manquée. Chaque jour de la période choisie est maintenant compté.

## 1.17.0

Une série de corrections : l'heure tapée avec une date est conservée, plus rien n'est créé en double, les liens restent des liens, et l'app supporte mieux les mauvaises connexions et les navigateurs qui bloquent le stockage.

🐛 **Taper une heure avec une date, comme « demain à 14:30 », garde maintenant l'heure.** Taper « demain à 14h30 » dans la date d'une tâche enregistre maintenant 14:30, dans la fenêtre de nouvelle tâche, le panneau de tâche, le menu date d'une ligne et la barre pour plusieurs tâches. Une échéance reste un jour, et le dit quand vous y tapez une heure.

🐛 **Double-cliquer sur Ajouter une tâche ne crée plus la tâche deux fois.** La fenêtre de nouvelle tâche n'accepte plus qu'un enregistrement à la fois, au bouton comme au clavier. Deux tâches au même nom créées volontairement restent deux tâches.

🐛 **Un lien dans le nom d'une tâche ne change plus sa priorité ni sa répétition.** `https://example.com/p1` rendait la tâche P1, et un lien finissant par `/daily` la rendait récurrente. Les liens sont lus comme des liens, et ce que vous tapez à côté fonctionne toujours.

🐛 **Les dates avec un nom de mois, comme « 14 juillet », sont maintenant bien lues.** « 14 juillet » est en juillet (c'était juin), « 1er juillet » et « July 1st » sont compris, et des mots comme « 2 maisons » ou « 2 decks » ne sont plus pris pour des dates. Une date comme 12/03 suit Réglages, Format de date.

🐛 **Enregistrer et Annuler sous le titre d'une tâche répondent maintenant à Entrée et Espace.** Entrée et Espace font ce que fait un clic.

🐛 **À venir ajoute le nouveau jour tout seul quand minuit passe.** Laissée ouverte la nuit, la page gagne seule le nouveau dernier jour, et une tâche qui vient d'entrer dans la période ne reste plus cachée jusqu'à ce que vous quittiez la page.

🐛 **Échap et Tab agissent maintenant sur la fenêtre de devant quand il y en a deux.** Échap ne ferme plus que celle de devant, Tab fait le tour des deux boutons d'une confirmation, et le panneau de tâche derrière ne répond plus aux touches.

🐛 **Supprimer une tâche parente avec ses sous-tâches fonctionne maintenant proprement, annulation comprise.** Sélectionner un parent et ses sous-tâches supprime la branche une seule fois, sans faux « Todoist a refusé ceci », et une annulation tardive rend chaque tâche une seule fois.

🐛 **Une couleur d'accent personnalisée suit maintenant votre appareil en mode sombre sans rechargement.** Quand votre appareil passe en sombre app ouverte, les couleurs de l'accent suivent au lieu d'attendre un rechargement.

🐛 **Un nom de tâche contenant « @@link0@@ », ou une adresse e-mail, s'affiche maintenant tel quel.** Il ne devient plus « undefined » dans un titre ou une description, et un @ collé à un mot, comme dans une adresse e-mail, n'est plus pris pour un tag.

🐛 **L'app s'ouvre maintenant même quand votre navigateur bloque le stockage du site.** Elle restait sur « Chargement… ». Si quelque chose plante, un court message et un bouton Recharger remplacent la page blanche.

🐛 **Les modifications faites hors ligne ne sont plus envoyées à un autre compte qui se connecte ensuite.** Les modifications faites hors ligne avec un compte Todoist ne sont plus envoyées à un autre compte qui se connecte ensuite. On vous dit combien ont été laissées de côté.

🐛 **Une modification faite juste avant de fermer l'onglet ou de changer d'app n'est plus perdue.** Changer d'app ou fermer l'onglet juste après une modification ne la perd plus de la copie gardée sur votre appareil.

🐛 **Une connexion lente ou bloquée ne gèle plus la synchronisation.** Un téléchargement qui s'arrête à moitié compte comme un délai dépassé, et un long « réessayer après » de Todoist ne fige plus la synchronisation.

🐛 **Dans la démo, terminer une tâche répétée la fait maintenant passer correctement à sa prochaine date.** Cocher une tâche quotidienne la décale d'un jour en gardant son heure, et « tous les lundis » passe au lundi suivant. Une tâche tapée avec « tous les jours à 15h » affiche Aujourd'hui 15:00.

🆕 **Les messages en bas de l'écran ont un bouton de fermeture et disparaissent plus vite.** Les confirmations restent 3 secondes, les erreurs 6, et la durée d'annulation reste 8. Fermer une notification garde l'annulation disponible avec le raccourci d'annulation.

🆕 **Les lecteurs d'écran lisent maintenant les messages en bas de l'écran.** Les confirmations sont lues poliment, les refus de Todoist tout de suite, et le bouton Annuler dit ce qu'il annule.

🎨 **Les petits textes des listes de tâches, des groupes et du panneau de tâche sont un peu plus grands.** Les tags, les compteurs de groupe, ceux des colonnes de tableau et les petites étiquettes du panneau de tâche passent de 11 à 12 pixels.

## 1.16.0

Après chaque mise à jour, une courte fenêtre vous dit ce qui a changé, la fenêtre de nouvelle tâche se lit plus facilement, et choisir une date se fait de la même façon partout.

🆕 **Une fenêtre vous dit maintenant ce qui a changé après chaque mise à jour.** Quand une nouvelle version apporte du nouveau, une courte fenêtre liste les changements, une seule fois. Vous pouvez la désactiver, et relire toutes les versions, dans Réglages, rubrique À propos.

🆕 **Ajoutez une section directement depuis un tableau avec sa colonne « Ajouter une section ».** En vue Tableau d'un projet, la colonne en pointillés « Ajouter une section », à la fin, crée une nouvelle section, la même que depuis la liste.

🆕 **Choisissez dans Affichage entre un tableau de la largeur de la page ou pleine largeur.** Un tableau garde maintenant la largeur de l'en-tête de la page, comme une liste. Activez Pleine largeur dans Affichage pour utiliser tout l'écran.

🎨 **La fenêtre de nouvelle tâche est mieux disposée : titre, description, puis une ligne de boutons.** Le titre vient d'abord, avec la description juste en dessous. Ensuite la date, l'échéance, le projet, la priorité, l'estimation et les tags tiennent sur une ligne de petits boutons, et ceux qui sont vides s'affichent en « + Échéance ». Les sous-tâches ont leur propre titre avec leur nombre, et les boutons restent en bas.

🎨 **Le même sélecteur de date apparaît maintenant partout où l'on choisit une date.** Le menu date d'une tâche, la barre pour plusieurs tâches sélectionnées, la fenêtre de nouvelle tâche et le panneau de tâche montrent le même sélecteur : tapez une date, choisissez Aujourd'hui, Demain, La semaine prochaine, Cette semaine ou Un jour, ou cliquez sur un jour du mois.

🎨 **Les dates, projets et étiquettes tapés dans un titre se distinguent mieux.** Les surlignages derrière une date, un projet ou un tag que vous tapez gardent l'espace normal entre les mots : plusieurs à la suite ne se confondent plus.

🎨 **Survoler une carte de tableau affiche maintenant ses boutons à l'intérieur de la carte.** Au survol, les boutons d'une carte apparaissent dans son coin supérieur, sur la carte même, alignés avec le titre.

🎨 **Tous les menus avec un champ de recherche ont maintenant le même.** Déplacer une tâche, choisir des tags, un projet ou une date : le champ en haut a le même aspect et marche pareil.

🎨 **Le nombre sur Affichage ne compte plus que les filtres, groupements et tris que vous avez changés.** Son chiffre augmente quand vous filtrez, groupez ou triez une page autrement que par défaut, plus quand vous passez de liste à tableau (ou de matrice à liste).

🐛 **Ouvrir une tâche ne transforme plus des mots de son titre enregistré en date, étiquette ou priorité.** Un titre enregistré comme « Daily review » reste du texte simple. Seul ce que vous tapez ensuite devient une date, un tag ou une priorité.

🐛 **Taper @semaine dans la fenêtre de nouvelle tâche ne crée plus une étiquette par lettre.** Taper « @week » dans la fenêtre de nouvelle tâche enregistrait « w », « we », « wee » et « week ». Maintenant, seul le tag final est enregistré.

🐛 **La revue suit maintenant les changements faits dans le panneau de tâche.** Une tâche terminée ou supprimée depuis le panneau quitte tout de suite l'étape de la revue. L'étape « Sans estimation » dit quelles tâches elle liste, et reprend une tâche créée entre-temps.

🐛 **Les menus date, déplacer et plus d'une tâche sur un tableau ou une liste courte ne sont plus coupés.** Les menus date, déplacer et plus d'une tâche s'ouvrent toujours en entier, sur toute la page.

## 1.15.0

Les dates et les tableaux se pilotent au clavier, les liens s'ouvrent, et vous passez d'une tâche à la suivante sans la fermer.

🆕 **Choisissez une date avec les flèches du clavier partout où l'on en choisit une.** Partout où vous choisissez une date (le bouton date d'une tâche, la barre qui apparaît quand plusieurs tâches sont sélectionnées, la fenêtre de nouvelle tâche, le panneau de tâche), les flèches parcourent les jours du mois. Page préc. et Page suiv. changent de mois, et Entrée choisit le jour.

🆕 **Les tableaux défilent d'une page de colonnes à la fois, sans colonne coupée en deux.** En vue Tableau, les colonnes tiennent toujours dans l'écran : plus de colonne coupée en deux. Les flèches au-dessus du tableau avancent d'une page entière. Glissez une carte au bord du tableau et la page tourne toute seule.

🆕 **Groupez Prochainement par jour, semaine ou mois.** Ouvrez Affichage sur la page Prochainement et choisissez le regroupement, en liste comme en tableau.

🆕 **Les liens dans le titre ou la description d'une tâche s'ouvrent maintenant d'un clic.** Un lien dans le titre ou la description d'une tâche s'ouvre d'un clic, qu'il soit écrit `[texte](adresse)`, en adresse complète `https://`, ou simplement `site.fr`. Il garde la couleur du texte, souligné.

🆕 **Ouvrez une tâche terminée depuis le Journal des Analyses.** Dans Analyses, cliquez sur une tâche terminée du Journal (ou appuyez sur Entrée) pour l'ouvrir dans le panneau de tâche. Les flèches haut et bas parcourent aussi le Journal.

🆕 **Passez à la tâche précédente ou suivante sans fermer le panneau de tâche.** Deux petites flèches en haut du panneau de tâche (ou J / K, ↑ / ↓) ouvrent la tâche précédente ou suivante de la liste d'où vous venez, même après en avoir cochée ou déplacée.

🆕 **Glissez plusieurs tâches sélectionnées d'un coup.** Sélectionnez des tâches avec ⌘-clic, puis glissez-en une : elles partent ensemble en pile avec leur nombre, et arrivent dans l'ordre de votre sélection.

🎨 **Les projets avec un point, une esperluette ou un emoji dans leur nom se choisissent maintenant dans la fenêtre de nouvelle tâche.** Choisir un `#projet` dans la liste marche toujours, même avec un point, une esperluette ou un emoji dans son nom. Un long « projet / section » est raccourci au lieu d'élargir la fenêtre.

🎨 **Des tâches sélectionnées côte à côte forment maintenant un seul bloc.** Comme dans Things, plutôt qu'une pile de pastilles séparées.

🐛 **Le repère du clavier et une tâche sélectionnée sont maintenant différents.** La tâche où se trouve le clavier a un contour, une tâche sélectionnée un fond coloré : vous voyez tout de suite quand vous en désélectionnez une.
