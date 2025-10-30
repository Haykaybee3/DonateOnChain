export const isHashPackInstalled = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return !!(window.ethereum?.isHashPack);
};

export const detectInstalledWallets = () => {
  if (typeof window === 'undefined') return [];
  
  const wallets = [];
  
  if (window.ethereum?.isHashPack) {
    wallets.push('HashPack');
  }
  if (window.ethereum?.isMetaMask && !window.ethereum?.isHashPack) {
    wallets.push('MetaMask');
  }
  if (window.ethereum && !window.ethereum.isMetaMask && !window.ethereum.isHashPack) {
    wallets.push('Browser Wallet');
  }
  
  return wallets;
};

export const getHashPackDownloadUrl = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('chrome') || userAgent.includes('chromium')) {
    return 'https://chrome.google.com/webstore/detail/hashpack/gjagmgiddbbciopjhllkdnddhcglnemk';
  }
  if (userAgent.includes('firefox')) {
    return 'https://addons.mozilla.org/en-US/firefox/addon/hashpack/';
  }
  
  return 'https://www.hashpack.app/download';
};

