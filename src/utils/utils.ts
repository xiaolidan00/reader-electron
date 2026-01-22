export const isMobile = () => {
  return /Mobi|Android|iPhone/i.test(navigator.userAgent);
};

export const isElectron = () => {
  return navigator.userAgent.includes("Electron");
};

export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
