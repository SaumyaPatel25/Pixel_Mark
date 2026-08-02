export const syncMonkfeedLogin = (user: any) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('monkfeed:login', { detail: user }));
  }
};

export const syncMonkfeedLogout = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('monkfeed:logout'));
  }
};

export const syncMonkFeedLogin = syncMonkfeedLogin;
export const syncMonkFeedLogout = syncMonkfeedLogout;
