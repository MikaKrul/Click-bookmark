// background.js - Click & Bookmark

let isRebuilding = false;
let rebuildTimeout = null;

// 1. Klikken op het extensie-icoon opent de ingebouwde Chrome/Helium bladwijzer-sidebar
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error("SidePanel behavior error:", error));

// Bouw het menu op bij installatie of opstarten
chrome.runtime.onInstalled.addListener(() => {
  debouncedRebuild();
});

chrome.runtime.onStartup.addListener(() => {
  debouncedRebuild();
});

// Luister naar wijzigingen in de Chrome Bladwijzers om het menu synchroon te houden
chrome.bookmarks.onCreated.addListener(() => debouncedRebuild());
chrome.bookmarks.onRemoved.addListener(() => debouncedRebuild());
chrome.bookmarks.onChanged.addListener(() => debouncedRebuild());
chrome.bookmarks.onMoved.addListener(() => debouncedRebuild());

function debouncedRebuild() {
  if (rebuildTimeout) clearTimeout(rebuildTimeout);
  rebuildTimeout = setTimeout(() => {
    rebuildContextMenus();
  }, 150);
}

function rebuildContextMenus() {
  if (isRebuilding) return;
  isRebuilding = true;

  chrome.contextMenus.removeAll(() => {
    // Aanmaken hoofdmenu-item
    chrome.contextMenus.create({
      id: "pagesaver-root",
      title: "★ Bladwijzer opslaan in...",
      contexts: ["page"]
    }, () => {
      if (chrome.runtime.lastError) {
        console.warn("Context menu error:", chrome.runtime.lastError.message);
      }
    });

    // Haal de complete Chrome bladwijzerboom op
    chrome.bookmarks.getTree((treeNodes) => {
      const folderList = [];
      
      // We doorlopen de boom om alleen mappen te filteren
      function extractFolders(nodes, depth = 0) {
        nodes.forEach(node => {
          // Als het node geen URL heeft, is het een map
          if (!node.url && node.id !== "0") { 
            folderList.push({
              id: node.id,
              title: node.title || "Naamloze map",
              depth: depth
            });
          }
          if (node.children) {
            extractFolders(node.children, node.id === "0" ? depth : depth + 1);
          }
        });
      }

      extractFolders(treeNodes);

      // Filter eventuele mappen zonder naam of system folders eruit als ze leeg zijn
      const validFolders = folderList.filter(f => f.title.trim() !== "");

      if (validFolders.length === 0) {
        // SITUATIE: Er zijn nog geen mappen aangemaakt door de gebruiker
        
        // Optie 1: Direct opslaan in de hoofdmap (Root / Bladwijzerbalk id '1')
        chrome.contextMenus.create({
          id: "save-to-bm-1", 
          parentId: "pagesaver-root",
          title: "Hoofdmap (Bladwijzerbalk)",
          contexts: ["page"]
        });

        // Separator (lijn) tussen opslaan en actie
        chrome.contextMenus.create({
          id: "separator-1",
          parentId: "pagesaver-root",
          type: "separator",
          contexts: ["page"]
        });

        // Optie 2: Knop om de sidebar te openen zodat ze mappen kunnen maken
        chrome.contextMenus.create({
          id: "open-sidebar-action",
          parentId: "pagesaver-root",
          title: "Sidebar openen om mappen te maken",
          contexts: ["page"]
        }, () => {
          isRebuilding = false;
        });

      } else {
        // SITUATIE: Er zijn wel mappen aanwezig
        let created = 0;
        
        validFolders.forEach(folder => {
          const prefix = "— ".repeat(Math.max(0, folder.depth - 1));
          
          chrome.contextMenus.create({
            id: `save-to-bm-${folder.id}`,
            parentId: "pagesaver-root",
            title: prefix + folder.title,
            contexts: ["page"]
          }, () => {
            created++;
            if (created >= validFolders.length) {
              isRebuilding = false;
            }
          });
        });
      }
    });
  });
}

// Luisteraar voor het klikken op menu-items
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab) return;

  // Actie 1: De sidebar openen vanuit het context-menu
  if (info.menuItemId === "open-sidebar-action") {
    chrome.sidePanel.open({ tabId: tab.id }).catch((err) => console.error(err));
    return;
  }

  // Actie 2: Bladwijzer opslaan in geselecteerde map
  if (tab.url && info.menuItemId.startsWith("save-to-bm-")) {
    const targetFolderId = info.menuItemId.replace("save-to-bm-", "");

    chrome.bookmarks.create({
      parentId: targetFolderId,
      title: tab.title || "Naamloze pagina",
      url: tab.url
    }, (newBookmark) => {
      if (chrome.runtime.lastError) {
        console.error("Fout bij opslaan bladwijzer:", chrome.runtime.lastError.message);
      }
    });
  }
});