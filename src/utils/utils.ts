export const isMobile = () => {
  return /Mobi|Android|iPhone/i.test(navigator.userAgent);
};

export const isElectron = () => {
  return navigator.userAgent.includes("Electron");
};
