#!/usr/bin/env python3
# Patch GFC : menu latéral -> historique de connexion en bas, lignes compactes, plus d'entrées visibles.
# Usage (depuis ~/gabon-football-connect) :  python3 patch_historique_menu.py
import re, shutil, sys, os, time

F = "index.html"
NB_LIGNES = 10          # nombre de connexions affichées dans le menu (modifiable)

if not os.path.exists(F):
    sys.exit("ERREUR : index.html introuvable. Lancez ce script depuis ~/gabon-football-connect")
s = open(F, encoding="utf-8").read()

if 'id="gfc-histo-compact"' in s:
    sys.exit("Déjà appliqué : rien à faire.")

# --- 1) sauvegarde
bak = "index.html.bak-histo"
if os.path.exists(bak):
    bak += "-" + time.strftime("%H%M%S")
shutil.copy2(F, bak)
print("Sauvegarde :", bak)

# --- 2) déplacer le bloc HISTORIQUE après INFORMATIONS (fin de la liste, avant </nav>)
a = s.find("<!-- HISTORIQUE -->")
b = s.find("<!-- INFORMATIONS -->")
if a == -1 or b == -1 or b < a:
    sys.exit("ERREUR : repères <!-- HISTORIQUE --> / <!-- INFORMATIONS --> introuvables. Rien modifié.")
bloc = s[a:b].rstrip() + "\n\n"
if 'id="side-menu-login-history"' not in bloc or "login-history-header" not in bloc:
    sys.exit("ERREUR : le bloc historique n'a pas la forme attendue. Rien modifié.")
s = s[:a] + s[b:]
n = s.find("</nav>", s.find("<!-- INFORMATIONS -->"))
if n == -1:
    sys.exit("ERREUR : </nav> introuvable après INFORMATIONS. Rien modifié.")
# on remonte au début de la ligne du </nav> pour garder l'indentation
ls = s.rfind("\n", 0, n) + 1
s = s[:ls] + "      " + bloc.lstrip() + s[ls:]
print("Bloc historique déplacé en fin de menu.")

# --- 3) afficher plus de connexions
old = "const rows = _loginHistoryCache.slice(0,5);"
if s.count(old) != 1:
    sys.exit("ERREUR : ligne slice(0,5) introuvable (ou en double). Rien modifié.")
s = s.replace(old, "const rows = _loginHistoryCache.slice(0,%d);" % NB_LIGNES)

# --- 4) CSS compact (placé en dernier, avec !important pour gagner sur tout autre style)
css = """
<style id="gfc-histo-compact">
/* Historique de connexion — menu latéral compact */
.side-menu-nav .login-history-header{padding:2px 10px 3px !important;}
.side-menu-nav .login-history-header span{font-size:9px !important;letter-spacing:.5px !important;}
.side-menu-nav .login-history-seeall{font-size:10px !important;padding:1px 4px !important;}
#side-menu-login-history{gap:0 !important;padding:0 2px !important;height:auto !important;min-height:0 !important;flex:none !important;}
#side-menu-login-history .login-history-row{padding:3px 6px !important;gap:7px !important;min-height:0 !important;height:auto !important;flex:none !important;}
#side-menu-login-history .login-history-avatar{width:22px !important;height:22px !important;font-size:9px !important;}
#side-menu-login-history .login-history-name{font-size:11px !important;line-height:1.2 !important;}
#side-menu-login-history .login-history-meta{font-size:9.5px !important;line-height:1.2 !important;}
#side-menu-login-history .login-history-time{font-size:9px !important;line-height:1.15 !important;}
#side-menu-login-history .login-history-time .lh-date{font-size:9.5px !important;}
#side-menu-login-history .login-history-empty{font-size:11px !important;padding:6px 10px !important;}
</style>
"""
i = s.find("</head>")
if i == -1:
    sys.exit("ERREUR : </head> introuvable. Rien modifié.")
s = s[:i] + css.lstrip("\n") + s[i:]
print("CSS compact ajouté.")

open(F, "w", encoding="utf-8").write(s)
print("OK : index.html modifié (%d connexions affichées)." % NB_LIGNES)
