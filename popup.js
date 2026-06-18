document.addEventListener('DOMContentLoaded', () => {
  const showSystemFoldersCheckbox = document.getElementById('show-system-folders');
  const showNotificationsCheckbox = document.getElementById('show-notifications');
  const versionElement = document.getElementById('version');

  // Load version from manifest
  const manifest = chrome.runtime.getManifest();
  versionElement.textContent = `v${manifest.version}`;

  // Load saved settings
  chrome.storage.local.get({
    showSystemFolders: false,
    showNotifications: true
  }, (items) => {
    showSystemFoldersCheckbox.checked = items.showSystemFolders;
    showNotificationsCheckbox.checked = items.showNotifications;
  });

  // Save settings when toggled
  showSystemFoldersCheckbox.addEventListener('change', () => {
    chrome.storage.local.set({
      showSystemFolders: showSystemFoldersCheckbox.checked
    });
  });

  showNotificationsCheckbox.addEventListener('change', () => {
    chrome.storage.local.set({
      showNotifications: showNotificationsCheckbox.checked
    });
  });
});
