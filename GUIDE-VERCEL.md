# Guide : Variables d'environnement Vercel — GitTrack

## C'est quoi une variable d'environnement ?

C'est une valeur secrete que ton application utilise mais qu'on ne met jamais dans le code.
Sur Vercel, tu les ajoutes dans le dashboard et Vercel les injecte automatiquement.

---

## Ou les mettre sur Vercel ?

1. Va sur [vercel.com](https://vercel.com) et connecte-toi
2. Clique sur ton projet **GitTrack**
3. Clique sur **Settings** (en haut)
4. Clique sur **Environment Variables** (dans le menu a gauche)
5. Pour chaque variable ci-dessous, remplis le champ **Key** (le nom) et **Value** (la valeur)
6. Clique **Save** apres chaque ajout

---

## Les variables une par une

---

### `FRONTEND_URL`

**C'est quoi ?** L'adresse de ton site web une fois en ligne.

**Ou la trouver ?**
- Quand tu deploies ton projet sur Vercel pour la premiere fois, Vercel te donne une URL automatique.
- Elle ressemble a ca : `https://gittrack-abc123.vercel.app`
- Tu la trouves sur la page principale de ton projet sur Vercel, en haut.

**Quoi mettre ?**
```
https://gittrack-abc123.vercel.app
```
(Remplace `gittrack-abc123` par ce que Vercel t'a donne.)

**Astuce** : Si tu as configure un domaine personnalise (genre `gittrack.monsite.com`), mets cette adresse a la place.

**IMPORTANT** : Pas de `/` a la fin. C'est `https://monsite.vercel.app` et PAS `https://monsite.vercel.app/`

---

### `API_PUBLIC_URL`

**C'est quoi ?** L'adresse du backend (l'API). Chez nous, le frontend et le backend sont sur le meme domaine Vercel.

**Quoi mettre ?** La meme chose que `FRONTEND_URL` :
```
https://gittrack-abc123.vercel.app
```

---

### `SESSION_SECRET`

**C'est quoi ?** Un mot de passe secret que le serveur utilise pour signer les cookies de session. Si quelqu'un le connait, il peut se faire passer pour n'importe quel utilisateur.

**Ou la trouver ?** Tu la generes toi-meme. C'est une chaine aleatoire.

**Comment la generer ?**

Option 1 — Dans ton terminal, tape :
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Ca va afficher un truc comme : `a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1`

Option 2 — Va sur [generate-secret.vercel.app](https://generate-secret.vercel.app/32) et copie le resultat.

**Quoi mettre ?** Le texte aleatoire que tu viens de generer. Exemple :
```
a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1
```

---

### `GITHUB_OAUTH_CLIENT_ID`

**C'est quoi ?** L'identifiant de ton application OAuth GitHub. C'est ce qui permet aux utilisateurs de se connecter avec leur compte GitHub.

**Ou la trouver ?**

1. Va sur [github.com/settings/developers](https://github.com/settings/developers)
2. Clique sur **OAuth Apps**
3. Si tu as deja une app (celle que tu utilises en local), clique dessus
4. Si tu n'en as pas, clique **New OAuth App** et remplis :
   - **Application name** : `GitTrack`
   - **Homepage URL** : `https://gittrack-abc123.vercel.app`
   - **Authorization callback URL** : `https://gittrack-abc123.vercel.app/auth/github/callback`
5. Le **Client ID** est affiche en haut de la page de l'app

**Quoi mettre ?** Le Client ID, ca ressemble a :
```
Ov23lijJza4Voq5Woyj7
```

---

### `GITHUB_OAUTH_CLIENT_SECRET`

**C'est quoi ?** Le mot de passe secret de ton application OAuth GitHub.

**Ou la trouver ?**

1. Sur la meme page que ci-dessus ([github.com/settings/developers](https://github.com/settings/developers) > ton app)
2. Clique sur **Generate a new client secret**
3. Copie le secret IMMEDIATEMENT (il ne sera plus visible apres)

**Quoi mettre ?** Le secret genere, ca ressemble a :
```
abc123def456ghi789jkl012mno345pqr678stu
```

---

### `GITHUB_OAUTH_REDIRECT_URI`

**C'est quoi ?** L'URL ou GitHub renvoie l'utilisateur apres qu'il s'est connecte.

**Quoi mettre ?** Ton URL Vercel + `/auth/github/callback` :
```
https://gittrack-abc123.vercel.app/auth/github/callback
```

**IMPORTANT** : Cette URL doit etre EXACTEMENT la meme que celle dans les settings de ton OAuth App GitHub (etape 4 ci-dessus, champ "Authorization callback URL"). Si c'est different d'un seul caractere, ca marchera pas.

---

### `GOOGLE_OAUTH_CLIENT_ID`

**C'est quoi ?** L'identifiant de ton application OAuth Google. Permet aux utilisateurs de se connecter avec leur compte Google.

**Ou la trouver ?**

1. Va sur [console.cloud.google.com](https://console.cloud.google.com)
2. Selectionne ton projet (ou crees-en un)
3. Dans le menu a gauche : **APIs & Services** > **Credentials**
4. Si tu as deja un "OAuth 2.0 Client ID", clique dessus
5. Si tu n'en as pas :
   - Clique **Create Credentials** > **OAuth client ID**
   - Type : **Web application**
   - Name : `GitTrack`
   - **Authorized JavaScript origins** : ajoute `https://gittrack-abc123.vercel.app`
   - **Authorized redirect URIs** : ajoute `https://gittrack-abc123.vercel.app/auth/google/callback`
   - Clique **Create**
6. Le **Client ID** est affiche (il finit par `.apps.googleusercontent.com`)

**Quoi mettre ?**
```
325851685433-xxxxxxxxxxxxxxxx.apps.googleusercontent.com
```

---

### `GOOGLE_OAUTH_CLIENT_SECRET`

**C'est quoi ?** Le mot de passe secret de ton application OAuth Google.

**Ou la trouver ?**

1. Sur la meme page que ci-dessus (Google Console > Credentials > ton client OAuth)
2. Le **Client secret** est affiche a cote du Client ID

**Quoi mettre ?**
```
GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx
```

---

### `GOOGLE_OAUTH_REDIRECT_URI`

**C'est quoi ?** L'URL ou Google renvoie l'utilisateur apres connexion.

**Quoi mettre ?** Ton URL Vercel + `/auth/google/callback` :
```
https://gittrack-abc123.vercel.app/auth/google/callback
```

**IMPORTANT** : Cette URL doit aussi etre ajoutee dans la Google Console (champ "Authorized redirect URIs" de ton OAuth client). Si c'est pas identique, Google refusera la connexion.

---

### `GITHUB_TOKEN` (optionnel)

**C'est quoi ?** Un Personal Access Token GitHub qui permet au serveur de lire les repos publics meme sans utilisateur connecte.

**Ou le trouver ?**

1. Va sur [github.com/settings/tokens](https://github.com/settings/tokens)
2. Clique **Generate new token** > **Fine-grained token**
3. Name : `GitTrack Server`
4. Expiration : 90 jours (ou plus)
5. Permissions : **Public repositories (read-only)** suffit
6. Clique **Generate token** et copie le resultat

**Quoi mettre ?**
```
github_pat_11BPNVLNY0xxxxxxxxxxxxxxxxxxxxxxxx
```

**Si tu ne mets rien** : les donnees GitHub (commits, contributeurs) ne marcheront que quand un utilisateur est connecte avec GitHub.

---

### `GITHUB_WEBHOOK_SECRET` (optionnel)

**C'est quoi ?** Un secret partage entre GitHub et ton serveur pour verifier que les notifications de push viennent bien de GitHub.

**Ou le trouver ?** Tu le choisis toi-meme (un texte aleatoire).

**Comment le configurer ?**

1. Genere un secret : `node -e "console.log(require('crypto').randomBytes(20).toString('hex'))"`
2. Mets cette valeur dans Vercel
3. Va sur ton repo GitHub > **Settings** > **Webhooks** > **Add webhook**
   - **Payload URL** : `https://gittrack-abc123.vercel.app/api/github/webhook`
   - **Content type** : `application/json`
   - **Secret** : colle le meme secret
   - **Events** : selectionne "Just the push event"

**Si tu ne mets rien** : les webhooks ne marcheront pas, mais les commits se mettront a jour par polling (toutes les 45 secondes).

---

## Resume visuel

```
Sur Vercel > Settings > Environment Variables :

FRONTEND_URL              = https://ton-app.vercel.app
API_PUBLIC_URL            = https://ton-app.vercel.app
SESSION_SECRET            = (genere aleatoirement)
GITHUB_OAUTH_CLIENT_ID    = (depuis github.com/settings/developers)
GITHUB_OAUTH_CLIENT_SECRET= (depuis github.com/settings/developers)
GITHUB_OAUTH_REDIRECT_URI = https://ton-app.vercel.app/auth/github/callback
GOOGLE_OAUTH_CLIENT_ID    = (depuis console.cloud.google.com)
GOOGLE_OAUTH_CLIENT_SECRET= (depuis console.cloud.google.com)
GOOGLE_OAUTH_REDIRECT_URI = https://ton-app.vercel.app/auth/google/callback
GITHUB_TOKEN              = (optionnel, depuis github.com/settings/tokens)
GITHUB_WEBHOOK_SECRET     = (optionnel, tu le choisis)
```

---

## Etapes de deploiement

1. Push ton code sur GitHub
2. Va sur [vercel.com](https://vercel.com) > **Add New Project** > importe ton repo
3. Vercel va te donner une URL (genre `gittrack-xxxxx.vercel.app`)
4. Ajoute TOUTES les variables ci-dessus dans **Settings > Environment Variables**
5. Remplace `gittrack-abc123` par ta vraie URL Vercel partout
6. Va sur GitHub OAuth App et mets a jour le callback URL
7. Va sur Google Console et mets a jour le redirect URI
8. Redeploy sur Vercel (Settings > Deployments > Redeploy)
9. Teste : ouvre ton URL, connecte-toi avec GitHub ou Google
